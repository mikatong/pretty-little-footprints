import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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
const maxUploadBytes = 60 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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

function sendJson(response: LocalResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function sanitizeSlug(value: string) {
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(slug) ? slug : "";
}

function isInside(parent: string, child: string) {
  const relative = child.slice(parent.length);
  return child === parent || (relative.startsWith("/") && !relative.includes(".."));
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

async function getNextGalleryNames(folder: string, count: number) {
  const entries = await readdir(folder).catch(() => []);
  const used = new Set(entries);
  const names: string[] = [];
  let index = 1;
  while (names.length < count) {
    const candidate = `${String(index).padStart(2, "0")}.jpg`;
    if (!used.has(candidate)) {
      used.add(candidate);
      names.push(candidate);
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

    const unsupported = files.find((part) => !part.contentType || !allowedImageTypes.has(part.contentType));
    if (unsupported) {
      sendJson(response, 400, { error: "Only JPEG, PNG, and WebP uploads are supported." });
      return;
    }

    await mkdir(folder, { recursive: true });
    const saved: string[] = [];

    if (cover) {
      const coverPath = resolve(folder, "cover.jpg");
      if (!isInside(folder, coverPath) || await exists(coverPath)) {
        sendJson(response, 409, { error: "cover.jpg already exists. Remove it first before uploading a new cover." });
        return;
      }
      await writeFile(coverPath, cover.data, { flag: "wx" });
      saved.push(`${slug}/cover.jpg`);
    }

    const galleryNames = await getNextGalleryNames(folder, photos.length);
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

export default defineConfig({
  plugins: [
    react(),
    {
      name: "pretty-little-maps-local-upload",
      configureServer(server) {
        server.middlewares.use("/api/local-upload", (request, response) => {
          void handleUpload(request as unknown as LocalRequest, response as unknown as LocalResponse);
        });
      },
    },
  ],
  base,
});
