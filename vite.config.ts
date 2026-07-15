import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, relative, resolve, sep } from "node:path";
import { stories } from "./src/data/stories";
import type { Story, StoryBlock } from "./src/types";

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};

// For Vercel/Netlify, base can stay as "/".
// For GitHub Pages, this automatically becomes "/repo-name/" inside GitHub Actions.
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.GITHUB_ACTIONS && repoName ? `/${repoName}/` : "/";
const projectRoot = resolve(process.cwd());
const storyImagesRoot = resolve(projectRoot, "public/images/stories");
const storiesSourcePath = resolve(projectRoot, "src/data/stories.ts");
const maxUploadBytes = 60 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const storySlugs = new Set(stories.map((story) => story.slug));

type UploadPart = {
  name: string;
  filename?: string;
  contentType?: string;
  data: Buffer;
};

type LocalRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: "data", callback: (chunk: Buffer) => void): void;
  on(event: "end", callback: () => void): void;
  on(event: "error", callback: (error: Error) => void): void;
  destroy(): void;
};

type LocalResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(value?: string): void;
};

type ComposerPayload = {
  slug?: string;
  title?: string;
  previewSummary?: string;
  body?: string;
  status?: string;
  featured?: boolean;
  coverImage?: string;
  previewImage?: string;
  galleryImages?: string[];
};

function sendJson(response: LocalResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function escapeStoryString(value: string) {
  return JSON.stringify(value);
}

function serializeStoryValue(value: unknown, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (typeof value === "string") return escapeStoryString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const serializedItems = value.map((item) => `${nextIndent}${serializeStoryValue(item, indentLevel + 1)}`);
    return `[\n${serializedItems.join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, entryValue]) => entryValue !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries.map(([key, entryValue]) => `${nextIndent}${key}: ${serializeStoryValue(entryValue, indentLevel + 1)}`).join(",\n")}\n${indent}}`;
  }
  return "undefined";
}

function serializeStory(story: Story) {
  return `  ${serializeStoryValue(story, 1)}`;
}

function serializeStoriesSource(nextStories: Story[]) {
  return `import type { Story } from "../types";

export const stories: Story[] = [
${nextStories.map(serializeStory).join(",\n")},
];

export const storiesByPlaceId = new Map(stories.map((story) => [story.placeId, story]));
export const storiesBySlug = new Map(stories.map((story) => [story.slug, story]));
`;
}

function getTextBlockId(story: Story) {
  return story.blocks.find((block) => block.type === "text")?.id ?? `${story.slug}-text`;
}

function updateFirstTextBlock(story: Story, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return story.blocks;

  let updatedTextBlock = false;
  const blocks = story.blocks.map((block) => {
    if (block.type !== "text" || updatedTextBlock) return block;
    updatedTextBlock = true;
    return { ...block, body: trimmedBody };
  });

  if (updatedTextBlock) return blocks;
  return [{ id: getTextBlockId(story), type: "text", body: trimmedBody } satisfies StoryBlock, ...blocks];
}

function upsertGalleryBlock(story: Story, galleryImages: string[]) {
  if (galleryImages.length === 0) return story.blocks;
  const newImages = galleryImages.map((src) => ({ src, alt: `${story.title} photo` }));
  let galleryUpdated = false;

  const blocks = story.blocks.map((block) => {
    if (block.type !== "gallery" || galleryUpdated) return block;
    galleryUpdated = true;
    return { ...block, images: [...block.images, ...newImages] };
  });

  if (galleryUpdated) return blocks;
  return [...blocks, { id: `${story.slug}-gallery`, type: "gallery", images: newImages, layout: "grid" } satisfies StoryBlock];
}

function normalizeStoryImagePath(value: string, slug: string) {
  if (!value) return "";
  const prefix = `/images/stories/${slug}/`;
  if (!value.startsWith(prefix)) return "";
  if (value.includes("\0") || value.includes("..")) return "";
  return value;
}

function updateStory(story: Story, payload: ComposerPayload) {
  const title = (payload.title ?? story.title).trim();
  if (!title) return { error: "Title is required." };
  const status = payload.status === "draft" || payload.status === "published" ? payload.status : "";
  if (!status) return { error: "Choose draft or published." };

  const coverImage = normalizeStoryImagePath(payload.coverImage ?? "", story.slug);
  const galleryImages = (payload.galleryImages ?? []).map((imagePath) => normalizeStoryImagePath(imagePath, story.slug));
  if (galleryImages.some((imagePath) => !imagePath) || ((payload.coverImage ?? "") && !coverImage)) {
    return { error: "Invalid saved image path." };
  }

  const nextStory: Story = {
    ...story,
    title,
    status,
    featured: Boolean(payload.featured) || undefined,
    previewSummary: (payload.previewSummary ?? "").trim() || undefined,
    coverImage: coverImage || story.coverImage,
    previewImage: coverImage || story.previewImage,
    imageSource: coverImage ? { type: "user" } : story.imageSource,
    blocks: updateFirstTextBlock(story, payload.body ?? ""),
  };

  nextStory.blocks = upsertGalleryBlock(nextStory, galleryImages);
  return { story: nextStory };
}

function sanitizeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(slug) ? slug : "";
}

function isInside(parent: string, child: string) {
  const pathFromParent = relative(parent, child);
  return (
    pathFromParent !== "" &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(`..${sep}`)
  );
}

function splitBuffer(buffer: Buffer, separator: Buffer) {
  const parts: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

function parseMultipart(body: Buffer, boundary: string): UploadPart[] {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  return splitBuffer(body, boundaryBuffer).flatMap((rawPart) => {
    let part = rawPart;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(0, 2).toString() === "--") return [];
    if (part.subarray(-2).toString() === "\r\n") part = part.subarray(0, -2);

    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) return [];

    const headers = part.subarray(0, headerEnd).toString("utf8");
    const data = part.subarray(headerEnd + 4);
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] ?? "";
    const name = disposition.match(/name="([^"]+)"/)?.[1] ?? "";
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    const contentType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.toLowerCase();
    if (!name) return [];
    return [{ name, filename, contentType, data }];
  });
}

function readRequestBody(request: LocalRequest) {
  return new Promise<Buffer>((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    request.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxUploadBytes) {
        reject(new Error("Upload is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function getExtension(part: UploadPart) {
  const originalFilename = part.filename ?? "";
  if (!originalFilename || originalFilename !== basename(originalFilename) || originalFilename.includes("\0") || originalFilename.includes("..")) {
    return { error: "Invalid image filename." };
  }
  const filename = originalFilename.toLowerCase();
  const extension = filename.match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (extension === "heic" || extension === "heif" || part.contentType === "image/heic" || part.contentType === "image/heif") {
    return { error: "HEIC upload is not supported yet. Please choose JPEG, PNG, or WebP." };
  }
  if (!part.contentType || !allowedImageTypes.has(part.contentType) || !allowedExtensions.has(extension)) {
    return { error: "Only JPEG, PNG, and WebP uploads are supported." };
  }
  return { extension };
}

async function getNextGalleryNames(folder: string, extensions: string[]) {
  const entries = await readdir(folder).catch(() => []);
  const usedIndexes = new Set(
    entries
      .map((entry) => entry.match(/^(\d{2})\.(?:jpe?g|png|webp)$/i)?.[1])
      .filter((entry): entry is string => Boolean(entry))
  );
  const names: string[] = [];
  let index = 1;
  while (names.length < extensions.length) {
    const numericName = String(index).padStart(2, "0");
    if (!usedIndexes.has(numericName)) {
      usedIndexes.add(numericName);
      names.push(`${numericName}.${extensions[names.length]}`);
    }
    index += 1;
  }
  return names;
}

async function handleUpload(request: LocalRequest, response: LocalResponse) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Only POST is supported." });
    return;
  }

  const contentType = request.headers["content-type"];
  const boundary = (Array.isArray(contentType) ? contentType[0] : contentType)?.match(/boundary=(.+)$/)?.[1];
  if (!boundary) {
    sendJson(response, 400, { error: "Missing multipart boundary." });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const parts = parseMultipart(body, boundary);
    const slug = sanitizeSlug(parts.find((part) => part.name === "slug")?.data.toString("utf8") ?? "");
    if (!slug) {
      sendJson(response, 400, { error: "Invalid Story slug." });
      return;
    }
    if (!storySlugs.has(slug)) {
      sendJson(response, 400, { error: "Choose an existing Story." });
      return;
    }

    const folder = resolve(storyImagesRoot, slug);
    if (!isInside(storyImagesRoot, folder)) {
      sendJson(response, 400, { error: "Invalid Story folder." });
      return;
    }

    const cover = parts.find((part) => part.name === "cover" && part.filename && part.data.length > 0);
    const photos = parts.filter((part) => part.name === "photos" && part.filename && part.data.length > 0);
    const files = [...(cover ? [cover] : []), ...photos];
    if (files.length === 0) {
      sendJson(response, 400, { error: "Choose at least one image." });
      return;
    }

    const extensions = files.map(getExtension);
    const invalid = extensions.find((result) => result.error);
    if (invalid?.error) {
      sendJson(response, 400, { error: invalid.error });
      return;
    }

    await mkdir(folder, { recursive: true });
    const saved: string[] = [];

    if (cover) {
      const coverExtension = getExtension(cover).extension;
      if (!coverExtension) {
        sendJson(response, 400, { error: "Only JPEG, PNG, and WebP uploads are supported." });
        return;
      }
      const coverName = `cover.${coverExtension}`;
      const coverPath = resolve(folder, coverName);
      if (!isInside(folder, coverPath) || await exists(coverPath)) {
        sendJson(response, 409, { error: `${coverName} already exists. Remove it first before uploading a new cover.` });
        return;
      }
      await writeFile(coverPath, cover.data, { flag: "wx" });
      saved.push(`${slug}/${coverName}`);
    }

    const photoExtensions = photos.map((photo) => getExtension(photo).extension).filter((extension): extension is string => Boolean(extension));
    const galleryNames = await getNextGalleryNames(folder, photoExtensions);
    for (let index = 0; index < photos.length; index += 1) {
      const filename = galleryNames[index];
      const destination = resolve(folder, filename);
      if (!isInside(folder, destination)) {
        sendJson(response, 400, { error: "Invalid destination filename." });
        return;
      }
      await writeFile(destination, photos[index].data, { flag: "wx" });
      saved.push(`${slug}/${filename}`);
    }

    sendJson(response, 200, { saved });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Upload failed." });
  }
}

async function handleStorySave(request: LocalRequest, response: LocalResponse) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Only POST is supported." });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body.toString("utf8")) as ComposerPayload;
    const slug = sanitizeSlug(payload.slug ?? "");
    if (!slug || !storySlugs.has(slug)) {
      sendJson(response, 400, { error: "Choose an existing Story." });
      return;
    }

    const storyIndex = stories.findIndex((story) => story.slug === slug);
    if (storyIndex === -1) {
      sendJson(response, 404, { error: "Story not found." });
      return;
    }

    const updated = updateStory(stories[storyIndex], payload);
    if (updated.error || !updated.story) {
      sendJson(response, 400, { error: updated.error ?? "Could not update Story." });
      return;
    }

    const nextStories = stories.map((story, index) => index === storyIndex ? updated.story : story);
    const tempPath = `${storiesSourcePath}.${Date.now()}.tmp`;
    await readFile(storiesSourcePath, "utf8");
    await writeFile(tempPath, serializeStoriesSource(nextStories));
    await rename(tempPath, storiesSourcePath);
    stories[storyIndex] = updated.story;

    sendJson(response, 200, { story: updated.story, url: `/stories/${slug}` });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Story save failed." });
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "pretty-little-maps-local-upload",
      configureServer(server) {
        server.middlewares.use("/api/local-upload", (request, response) => {
          void handleUpload(request as unknown as LocalRequest, response as unknown as LocalResponse);
        });
        server.middlewares.use("/api/local-story", (request, response) => {
          void handleStorySave(request as unknown as LocalRequest, response as unknown as LocalResponse);
        });
      },
    },
  ],
  base,
});
