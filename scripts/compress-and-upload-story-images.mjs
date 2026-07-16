import { createClient } from "@supabase/supabase-js";
import { createReadStream } from "node:fs";
import { access, mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(nodeExecFile);

const bucket = "story-images";
const imageRoot = "public/images/stories";
const allowedSourceExtensions = new Set([".jpg", ".jpeg", ".png"]);
const coverMaxDimension = 1600;
const galleryMaxDimension = 2000;
const coverQuality = 80;
const galleryQuality = 82;
const coverTargetBytes = 800 * 1024;
const galleryTargetBytes = 1200 * 1024;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ownerUserId = process.env.SUPABASE_OWNER_USER_ID ?? "";
const storageRoot = process.env.SUPABASE_STORAGE_ROOT ?? ownerUserId;
const dryRun = process.argv.includes("--dry-run");
const localOnly = process.argv.includes("--local-only");

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function cleanStorageRoot(value) {
  return value.replace(/^\/+|\/+$/g, "");
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

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
    if (allowedSourceExtensions.has(extension)) files.push(path);
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
    if (/^cover\.(?:jpe?g|png)$/i.test(filename)) {
      entry.cover = { kind: "cover", filePath, localPath, filename };
    } else if (/^\d{2}\.(?:jpe?g|png)$/i.test(filename)) {
      entry.gallery.push({ kind: "gallery", filePath, localPath, filename });
    }
    bySlug.set(slug, entry);
  }

  return [...bySlug.values()]
    .map((entry) => ({
      ...entry,
      gallery: entry.gallery.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true })),
    }))
    .filter((entry) => entry.cover || entry.gallery.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

async function getDimensions(filePath) {
  const { stdout } = await execFile("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath]);
  const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) throw new Error(`Could not read dimensions for ${filePath}`);
  return { width, height };
}

function getResizeArgs({ width, height }, maxDimension) {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) return [];
  const scale = maxDimension / largest;
  return ["-resize", String(Math.round(width * scale)), String(Math.round(height * scale))];
}

function webpPathFor(filePath) {
  return join(filePath, "..", `${basename(filePath, extname(filePath))}.webp`);
}

function webpFilenameFor(filename) {
  return `${basename(filename, extname(filename))}.webp`;
}

async function compressImage(image) {
  const sourceStat = await stat(image.filePath);
  const maxDimension = image.kind === "cover" ? coverMaxDimension : galleryMaxDimension;
  const quality = image.kind === "cover" ? coverQuality : galleryQuality;
  const targetBytes = image.kind === "cover" ? coverTargetBytes : galleryTargetBytes;
  const dimensions = await getDimensions(image.filePath);
  const resizeArgs = getResizeArgs(dimensions, maxDimension);
  const outputPath = webpPathFor(image.filePath);
  const tempPath = `${outputPath}.tmp`;

  await mkdir(dirname(outputPath), { recursive: true });
  await execFile("cwebp", [
    "-quiet",
    "-q", String(quality),
    ...resizeArgs,
    image.filePath,
    "-o", tempPath,
  ]);
  await rename(tempPath, outputPath);

  const outputStat = await stat(outputPath);
  return {
    ...image,
    outputPath,
    outputFilename: webpFilenameFor(image.filename),
    beforeBytes: sourceStat.size,
    afterBytes: outputStat.size,
    quality,
    maxDimension,
    targetBytes,
    withinTarget: outputStat.size <= targetBytes,
  };
}

function storagePath(slug, filename) {
  const root = cleanStorageRoot(storageRoot);
  return root ? `${root}/${slug}/${filename}` : `${slug}/${filename}`;
}

async function uploadCompressedImage(image, slug) {
  const path = storagePath(slug, image.outputFilename);

  if (!dryRun) {
    const { error } = await supabase.storage.from(bucket).upload(path, createReadStream(image.outputPath), {
      cacheControl: "31536000",
      contentType: "image/webp",
      duplex: "half",
      upsert: true,
    });
    if (error) throw new Error(`Upload failed for ${image.outputPath}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    ...image,
    storagePath: path,
    publicUrl: data.publicUrl,
  };
}

async function verifyUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return `${response.status} ${response.statusText}`;
  return "";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  if (!await pathExists(imageRoot)) throw new Error(`Missing image root: ${imageRoot}`);

  const files = await walkImages(imageRoot);
  const imagePlan = getImagePlan(files);
  const totalPlannedImages = imagePlan.reduce((count, entry) => count + (entry.cover ? 1 : 0) + entry.gallery.length, 0);

  if (!localOnly && !supabase) {
    console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_PUBLISHABLE_KEY.");
    process.exit(1);
  }

  if (!localOnly && !storageRoot) {
    console.error("Missing SUPABASE_OWNER_USER_ID or SUPABASE_STORAGE_ROOT. Use the owner UUID to keep paths <user-id>/<slug>/...");
    process.exit(1);
  }

  const uploadedBySlug = new Map();
  const missingRows = [];
  const compressedImages = [];

  for (const entry of imagePlan) {
    const compressedCover = entry.cover ? await compressImage(entry.cover) : null;
    const compressedGallery = [];
    for (const image of entry.gallery) {
      compressedGallery.push(await compressImage(image));
    }
    compressedImages.push(...[compressedCover, ...compressedGallery].filter(Boolean));

    if (localOnly) {
      uploadedBySlug.set(entry.slug, { cover: compressedCover, gallery: compressedGallery });
      continue;
    }

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

    const uploadedCover = compressedCover ? await uploadCompressedImage(compressedCover, entry.slug) : null;
    const uploadedGallery = [];
    for (const image of compressedGallery) {
      uploadedGallery.push(await uploadCompressedImage(image, entry.slug));
    }

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
  if (!localOnly) {
    for (const [slug, uploaded] of uploadedBySlug) {
      for (const image of [uploaded.cover, ...uploaded.gallery].filter(Boolean)) {
        const error = await verifyUrl(image.publicUrl);
        if (error) brokenLinks.push({ slug, url: image.publicUrl, error });
      }
    }
  }

  for (const temp of compressedImages.map((image) => `${image.outputPath}.tmp`)) {
    if (await pathExists(temp)) await unlink(temp);
  }

  const report = {
    dryRun,
    localOnly,
    totalImagesCompressed: compressedImages.length,
    totalImagesPlanned: totalPlannedImages,
    storiesUpdated: localOnly || dryRun ? 0 : uploadedBySlug.size,
    missingStoryRows: missingRows,
    brokenLinks,
    files: compressedImages.map((image) => ({
      slug: image.localPath.split("/")[3],
      kind: image.kind,
      source: image.localPath,
      output: `/${relative("public", image.outputPath).replaceAll("\\", "/")}`,
      before: formatBytes(image.beforeBytes),
      after: formatBytes(image.afterBytes),
      quality: image.quality,
      maxDimension: image.maxDimension,
      target: formatBytes(image.targetBytes),
      withinTarget: image.withinTarget,
    })),
    uploaded: localOnly ? {} : Object.fromEntries([...uploadedBySlug].map(([slug, uploaded]) => [
      slug,
      {
        cover_url: uploaded.cover?.publicUrl ?? null,
        gallery_urls: uploaded.gallery.map((image) => image.publicUrl),
      },
    ])),
  };

  console.log(JSON.stringify(report, null, 2));

  if (compressedImages.length !== totalPlannedImages || missingRows.length > 0 || brokenLinks.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
