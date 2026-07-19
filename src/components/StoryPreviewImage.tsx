import { useEffect, useState } from "react";
import type { Place } from "../types";

type StoryPreviewImageProps = {
  place: Place;
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
};

/**
 * Corrects the previously-uploaded Chengdu cover in preview contexts. New uploads
 * are stored with their orientation baked into the file, so they pass through.
 */
export function StoryPreviewImage({ place, src, alt, className, loading, decoding }: StoryPreviewImageProps) {
  const [displaySrc, setDisplaySrc] = useState(src);
  const [rotationApplied, setRotationApplied] = useState(false);

  useEffect(() => {
    setDisplaySrc(src);
    setRotationApplied(false);
  }, [src]);

  const correctLegacyOrientation = (image: HTMLImageElement) => {
    const needsLegacyChengduCorrection = place.id === "chengdu-2026" && image.naturalWidth > image.naturalHeight;
    if (!needsLegacyChengduCorrection || rotationApplied || displaySrc !== src) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalHeight;
      canvas.height = image.naturalWidth;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.translate(canvas.width, 0);
      context.rotate(Math.PI / 2);
      context.drawImage(image, 0, 0);
      setRotationApplied(true);
      setDisplaySrc(canvas.toDataURL("image/webp", 0.96));
    } catch {
      // Keep the source image visible if a cross-origin canvas cannot be read.
    }
  };

  return (
    <img
      className={className}
      src={displaySrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      crossOrigin="anonymous"
      onLoad={(event: { currentTarget: HTMLImageElement }) => correctLegacyOrientation(event.currentTarget)}
    />
  );
}
