import type { Place, Story, StoryBlock, StoryStatus } from "../types";
import { supabase } from "./supabase";

export type CloudStoryRow = {
  id?: string;
  slug: string;
  place_id: string;
  title: string;
  preview_summary: string | null;
  body: string | null;
  status: StoryStatus;
  featured: boolean;
  cover_url: string | null;
  gallery_urls: string[] | null;
  user_id?: string | null;
};

export type StoryDraftInput = {
  slug: string;
  placeId: string;
  title: string;
  previewSummary: string;
  body: string;
  status: StoryStatus;
  featured: boolean;
  coverUrl: string;
  galleryUrls: string[];
  userId: string;
};

export type CloudStoryLoadResult = {
  stories: Story[];
  hiddenPlaceIds: Set<string>;
  hiddenSlugs: Set<string>;
  available: boolean;
};

function getGalleryUrls(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function getCanonicalStorySlug(place: Place) {
  return place.story?.slug ?? place.id;
}

export function cloudRowToStory(row: CloudStoryRow): Story {
  const blocks: StoryBlock[] = [];
  const body = row.body?.trim() ?? "";
  const galleryUrls = getGalleryUrls(row.gallery_urls);

  if (body) {
    blocks.push({ id: `${row.slug}-text`, type: "text", body });
  }

  if (galleryUrls.length > 0) {
    blocks.push({
      id: `${row.slug}-gallery`,
      type: "gallery",
      layout: "grid",
      images: galleryUrls.map((src) => ({ src, alt: `${row.title} photo` })),
    });
  }

  return {
    slug: row.slug,
    placeId: row.place_id,
    title: row.title,
    status: row.status,
    featured: row.featured,
    previewSummary: row.preview_summary ?? undefined,
    coverImage: row.cover_url ?? undefined,
    previewImage: row.cover_url ?? undefined,
    imageSource: row.cover_url ? { type: "user" } : undefined,
    blocks,
  };
}

export function getFirstStoryText(story: Story) {
  return story.blocks.find((block) => block.type === "text")?.body ?? "";
}

export function getStoryGalleryUrls(story: Story) {
  return story.blocks.flatMap((block) => block.type === "gallery" ? block.images.map((image) => image.src) : []);
}

export function mergeCloudStories(
  places: Place[],
  cloudStories: Story[],
  hiddenPlaceIds: Set<string> = new Set(),
  hiddenSlugs: Set<string> = new Set(),
): Place[] {
  const cloudByKey = new Map<string, Story>();
  cloudStories.forEach((story) => {
    cloudByKey.set(story.placeId, story);
    cloudByKey.set(story.slug, story);
  });

  return places.map((place) => {
    const canonicalSlug = getCanonicalStorySlug(place);

    if (hiddenPlaceIds.has(place.id) || hiddenSlugs.has(canonicalSlug)) {
      return {
        ...place,
        story: undefined,
        hasStory: false,
        featured: false,
      };
    }

    const cloudStory = cloudByKey.get(place.id) ?? cloudByKey.get(canonicalSlug);
    if (!cloudStory) return place;
    const mergedStory: Story = {
      ...cloudStory,
      slug: canonicalSlug,
      placeId: place.id,
    };

    return {
      ...place,
      story: mergedStory,
      hasStory: true,
      featured: Boolean(mergedStory.featured),
      photo: mergedStory.previewImage ?? mergedStory.coverImage ?? place.photo,
      imageSource: mergedStory.imageSource ?? place.imageSource,
    };
  });
}

export async function loadPublishedCloudStories(): Promise<CloudStoryLoadResult> {
  if (!supabase) return { stories: [], hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: false };

  const { data, error } = await supabase
    .from("stories")
    .select("slug, place_id, title, preview_summary, body, status, featured, cover_url, gallery_urls")
    .eq("status", "published");

  const { data: indexData, error: indexError } = await supabase
    .rpc("story_visibility_index");

  if (error) {
    if (import.meta.env.DEV) console.warn("Could not load cloud stories", error.message);
    return { stories: [], hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: false };
  }

  if (indexError) {
    if (import.meta.env.DEV) console.warn("Could not load cloud story visibility index", indexError.message);
    return { stories: (data as CloudStoryRow[]).map(cloudRowToStory), hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: true };
  }

  const hiddenPlaceIds = new Set(
    ((indexData ?? []) as { place_id: string; status: StoryStatus }[])
      .filter((row) => row.status === "draft")
      .map((row) => row.place_id)
  );
  const hiddenSlugs = new Set(
    ((indexData ?? []) as { slug: string; status: StoryStatus }[])
      .filter((row) => row.status === "draft")
      .map((row) => row.slug)
  );

  return { stories: (data as CloudStoryRow[]).map(cloudRowToStory), hiddenPlaceIds, hiddenSlugs, available: true };
}

export async function loadOwnerCloudStories(): Promise<CloudStoryLoadResult> {
  if (!supabase) return { stories: [], hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: false };

  const { data, error } = await supabase
    .from("stories")
    .select("slug, place_id, title, preview_summary, body, status, featured, cover_url, gallery_urls");

  if (error) {
    if (import.meta.env.DEV) console.warn("Could not load owner cloud stories", error.message);
    return { stories: [], hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: false };
  }

  return { stories: (data as CloudStoryRow[]).map(cloudRowToStory), hiddenPlaceIds: new Set(), hiddenSlugs: new Set(), available: true };
}

export async function loadOwnerCloudStory(slug: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stories")
    .select("slug, place_id, title, preview_summary, body, status, featured, cover_url, gallery_urls, user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? cloudRowToStory(data as CloudStoryRow) : null;
}

export async function saveCloudStory(input: StoryDraftInput) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("stories")
    .upsert({
      slug: input.slug,
      place_id: input.placeId,
      title: input.title,
      preview_summary: input.previewSummary || null,
      body: input.body || null,
      status: input.status,
      featured: input.featured,
      cover_url: input.coverUrl || null,
      gallery_urls: input.galleryUrls,
      user_id: input.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slug" })
    .select("slug, place_id, title, preview_summary, body, status, featured, cover_url, gallery_urls")
    .single();

  if (error) throw new Error(error.message);
  return cloudRowToStory(data as CloudStoryRow);
}

export function isHeicNameOrType(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

export type CompressedStoryImage = {
  file: File;
  originalName: string;
  originalBytes: number;
  compressedBytes: number;
  maxDimension: number;
  quality: number;
  targetBytes: number;
};

export function getAllowedImageExtension(file: File) {
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (extension === "heic" || extension === "heif" || file.type === "image/heic" || file.type === "image/heif") {
    throw new Error("HEIC upload is not supported yet. Please choose JPEG, PNG, or WebP.");
  }
  if (!["jpg", "jpeg", "png", "webp"].includes(extension) || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP uploads are supported.");
  }
  return extension;
}

export function sanitizeStorageFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\.\.+/g, ".") || "photo";
}

function getInputImageExtension(file: File) {
  return file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

function isSupportedComposerImage(file: File) {
  const extension = getInputImageExtension(file);
  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension) ||
    ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type);
}

function getCompressedFilename(file: File) {
  const safeFilename = sanitizeStorageFilename(file.name);
  const base = safeFilename.replace(/\.[a-z0-9]+$/i, "") || "photo";
  return `${base}.webp`;
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not compress image to WebP."));
      }
    }, "image/webp", quality);
  });
}

async function decodeImageForCanvas(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.src = url;

    try {
      await image.decode();
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("decode-failed");
    }
  }
}

export function formatImageBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function compressStoryImage(file: File, kind: "cover" | "gallery"): Promise<CompressedStoryImage> {
  if (!isSupportedComposerImage(file)) {
    throw new Error("Only JPEG, PNG, WebP, HEIC, and HEIF uploads are supported.");
  }

  let decodedImage: Awaited<ReturnType<typeof decodeImageForCanvas>>;
  try {
    decodedImage = await decodeImageForCanvas(file);
  } catch {
    if (isHeicNameOrType(file)) {
      throw new Error("This browser could not decode HEIC/HEIF. Please choose a JPEG, PNG, or WebP copy.");
    }
    throw new Error(`Could not decode ${file.name}. Please choose a different image.`);
  }

  const maxDimension = kind === "cover" ? 1600 : 2000;
  const targetBytes = kind === "cover" ? 800 * 1024 : 1200 * 1024;
  const startingQuality = kind === "cover" ? 0.8 : 0.82;
  const largestEdge = Math.max(decodedImage.width, decodedImage.height);
  const scale = largestEdge > maxDimension ? maxDimension / largestEdge : 1;
  const width = Math.max(1, Math.round(decodedImage.width * scale));
  const height = Math.max(1, Math.round(decodedImage.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    decodedImage.close();
    throw new Error("Could not prepare image compression.");
  }

  context.drawImage(decodedImage.source, 0, 0, width, height);
  decodedImage.close();

  let quality = startingQuality;
  let blob = await canvasToWebpBlob(canvas, quality);
  while (blob.size > targetBytes && quality > 0.68) {
    quality = Math.max(0.68, Number((quality - 0.06).toFixed(2)));
    blob = await canvasToWebpBlob(canvas, quality);
  }

  const compressedFile = new File([blob], getCompressedFilename(file), {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalName: file.name,
    originalBytes: file.size,
    compressedBytes: compressedFile.size,
    maxDimension,
    quality,
    targetBytes,
  };
}

export async function uploadStoryImage(file: File, userId: string, slug: string, kind: "cover" | "gallery") {
  if (!supabase) throw new Error("Supabase is not configured.");
  const extension = getAllowedImageExtension(file);
  const timestamp = Date.now();
  const version = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const safeFilename = sanitizeStorageFilename(file.name);
  const path = kind === "cover"
    ? `${userId}/${slug}/cover-${timestamp}-${version}.${extension}`
    : `${userId}/${slug}/${timestamp}-${version}-${safeFilename}`;

  const { error } = await supabase.storage.from("story-images").upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) throw new Error(error.message);
  return supabase.storage.from("story-images").getPublicUrl(path).data.publicUrl;
}
