import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const bucket = "story-images";
const imageRoot = "public/images/stories";
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const contentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ownerUserId = process.env.SUPABASE_OWNER_USER_ID ?? "";
const storageRoot = process.env.SUPABASE_STORAGE_ROOT ?? ownerUserId;
const dryRun = process.argv.includes("--dry-run");
const localPlan = process.argv.includes("--local-plan");

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function walkImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkImages(path));
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (allowedExtensions.has(extension)) files.push(path);
  }

  return files;
}

function getImagePlan(files) {
  const bySlug = new Map();

  for (const filePath of files) {
    const localPath = `/${relative("public", filePath).replaceAll("\\", "/")}`;
    const [, , , slug, filename] = localPath.split("/");
    if (!slug || !filename) continue;
    const entry = bySlug.get(slug) ?? { slug, cover: null, gallery: [] };
    if (/^cover\.(?:jpe?g|png|webp)$/i.test(filename)) {
      entry.cover = { filePath, localPath, filename };
    } else {
      entry.gallery.push({ filePath, localPath, filename });
    }
    bySlug.set(slug, entry);
  }

  return [...bySlug.values()].map((entry) => ({
    ...entry,
    gallery: entry.gallery.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true })),
  }));
}

function storagePath(slug, filename) {
  return `${storageRoot.replace(/^\/+|\/+$/g, "")}/${slug}/${filename}`;
}

async function uploadImage(image, slug) {
  const extension = extname(image.filename).toLowerCase();
  const path = storagePath(slug, image.filename);
  const fileStat = await stat(image.filePath);

  if (!dryRun) {
    const { error } = await supabase.storage.from(bucket).upload(path, createReadStream(image.filePath), {
      cacheControl: "31536000",
      contentType: contentTypes.get(extension),
      duplex: "half",
      upsert: true,
    });
    if (error) throw new Error(`Upload failed for ${image.localPath}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    ...image,
    bytes: fileStat.size,
    storagePath: path,
    publicUrl: data.publicUrl,
  };
}

async function verifyUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return `${response.status} ${response.statusText}`;
  return "";
}

function hasLocalReference(value) {
  return typeof value === "string" && value.startsWith("/images/stories/");
}

async function main() {
  const files = await walkImages(imageRoot);
  const imagePlan = getImagePlan(files);

  if (localPlan) {
    console.log(JSON.stringify({
      totalLocalImages: imagePlan.reduce((count, entry) => count + (entry.cover ? 1 : 0) + entry.gallery.length, 0),
      storiesWithLocalImages: imagePlan.map((entry) => ({
        slug: entry.slug,
        cover: entry.cover?.localPath ?? null,
        gallery: entry.gallery.map((image) => image.localPath),
      })),
    }, null, 2));
    return;
  }

  if (!supabase) {
    console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_PUBLISHABLE_KEY.");
    process.exit(1);
  }

  if (!storageRoot) {
    console.error("Missing SUPABASE_OWNER_USER_ID or SUPABASE_STORAGE_ROOT. Use the owner UUID to keep paths <user-id>/<slug>/...");
    process.exit(1);
  }

  const uploadedBySlug = new Map();
  let totalImages = 0;
  let totalBytes = 0;
  const missingRows = [];

  for (const entry of imagePlan) {
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("slug, cover_url, gallery_urls")
      .eq("slug", entry.slug)
      .maybeSingle();

    if (storyError) throw new Error(`Could not read story ${entry.slug}: ${storyError.message}`);
    if (!story) {
      missingRows.push(entry.slug);
      continue;
    }

    const uploadedCover = entry.cover ? await uploadImage(entry.cover, entry.slug) : null;
    const uploadedGallery = [];
    for (const image of entry.gallery) {
      uploadedGallery.push(await uploadImage(image, entry.slug));
    }

    totalImages += (uploadedCover ? 1 : 0) + uploadedGallery.length;
    totalBytes += (uploadedCover?.bytes ?? 0) + uploadedGallery.reduce((sum, image) => sum + image.bytes, 0);
    uploadedBySlug.set(entry.slug, { cover: uploadedCover, gallery: uploadedGallery });

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from("stories")
        .update({
          cover_url: uploadedCover?.publicUrl ?? story.cover_url ?? null,
          gallery_urls: uploadedGallery.length > 0 ? uploadedGallery.map((image) => image.publicUrl) : story.gallery_urls ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq("slug", entry.slug);

      if (updateError) throw new Error(`Could not update story ${entry.slug}: ${updateError.message}`);
    }
  }

  const brokenLinks = [];
  for (const [slug, uploaded] of uploadedBySlug) {
    for (const image of [uploaded.cover, ...uploaded.gallery].filter(Boolean)) {
      const error = await verifyUrl(image.publicUrl);
      if (error) brokenLinks.push({ slug, url: image.publicUrl, error });
    }
  }

  const { data: rows, error: rowsError } = await supabase
    .from("stories")
    .select("slug, cover_url, gallery_urls")
    .order("slug");

  if (rowsError) throw new Error(`Could not verify story rows: ${rowsError.message}`);

  const remainingLocalReferences = [];
  for (const row of rows ?? []) {
    if (hasLocalReference(row.cover_url)) remainingLocalReferences.push({ slug: row.slug, field: "cover_url", value: row.cover_url });
    for (const url of Array.isArray(row.gallery_urls) ? row.gallery_urls : []) {
      if (hasLocalReference(url)) remainingLocalReferences.push({ slug: row.slug, field: "gallery_urls", value: url });
    }
  }

  const report = {
    dryRun,
    totalImagesMigrated: totalImages,
    totalBytes,
    storiesUpdated: uploadedBySlug.size,
    missingStoryRows: missingRows,
    brokenLinks,
    remainingLocalReferences,
    uploaded: Object.fromEntries([...uploadedBySlug].map(([slug, uploaded]) => [
      slug,
      {
        cover_url: uploaded.cover?.publicUrl ?? null,
        gallery_urls: uploaded.gallery.map((image) => image.publicUrl),
      },
    ])),
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingRows.length > 0 || brokenLinks.length > 0 || remainingLocalReferences.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
