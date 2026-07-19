import { useEffect, useRef, useState } from "react";
import type { Place, StoryBlock, StoryImageOrientation } from "../types";

type StoryPageProps = {
  place: Place;
  relatedPlaces: Place[];
  meaningfulStories: Place[];
  onSelectPlace: (place: Place) => void;
};

function StoryImage({
  src,
  alt,
  caption,
  orientation = "landscape",
  rotateClockwiseIfLandscape = false,
}: {
  src: string;
  alt?: string;
  caption?: string;
  orientation?: StoryImageOrientation;
  rotateClockwiseIfLandscape?: boolean;
}) {
  const [detectedOrientation, setDetectedOrientation] = useState<StoryImageOrientation | null>(null);
  const [displaySrc, setDisplaySrc] = useState(src);
  const [legacyRotationApplied, setLegacyRotationApplied] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const actualOrientation = detectedOrientation ?? orientation;
  const detectOrientation = (image: HTMLImageElement) => {
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height) return;
    if (rotateClockwiseIfLandscape && !legacyRotationApplied && displaySrc === src && width > height) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = height;
        canvas.height = width;
        const context = canvas.getContext("2d");
        if (context) {
          context.translate(canvas.width, 0);
          context.rotate(Math.PI / 2);
          context.drawImage(image, 0, 0);
          setLegacyRotationApplied(true);
          setDisplaySrc(canvas.toDataURL("image/webp", 0.96));
          return;
        }
      } catch {
        // The permanent upload fix below handles all newly uploaded images.
      }
    }
    setDetectedOrientation(width === height ? "square" : width > height ? "landscape" : "portrait");
  };

  useEffect(() => {
    setDetectedOrientation(null);
    setDisplaySrc(src);
    setLegacyRotationApplied(false);
    const image = imageRef.current;
    if (image?.complete) detectOrientation(image);
  }, [src]);

  return (
    <figure className={`story-image ${actualOrientation}`}>
      <img
        src={displaySrc}
        alt={alt ?? ""}
        crossOrigin="anonymous"
        ref={imageRef}
        onLoad={(event: { currentTarget: HTMLImageElement }) => {
          detectOrientation(event.currentTarget);
        }}
        onError={(event: { currentTarget: HTMLImageElement }) => {
          if (import.meta.env.DEV) {
            console.warn(`Missing story image: ${src}`);
          }
          event.currentTarget.hidden = true;
          event.currentTarget.parentElement?.classList.add("missing");
        }}
      />
      <span className="story-image-placeholder">Photograph coming soon.</span>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function StoryBlockView({ block }: { block: StoryBlock }) {
  if (block.type === "text") {
    return (
      <div className="story-text">
        {block.body
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    );
  }

  if (block.type === "image") {
    return <StoryImage src={block.src} alt={block.alt} caption={block.caption} orientation={block.orientation} />;
  }

  if (block.type === "gallery") {
    return (
      <div className={`story-gallery ${block.layout ?? "grid"}`}>
        {block.images.map((image) => (
          <StoryImage key={image.src} src={image.src} alt={image.alt} caption={image.caption} orientation={image.orientation} />
        ))}
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className="story-quote">
        <p>{block.body}</p>
        {block.attribution ? <cite>{block.attribution}</cite> : null}
      </blockquote>
    );
  }

  if (block.type === "map") {
    return (
      <aside className="story-map-block">
        <p>Map notes</p>
        {block.caption ? <span>{block.caption}</span> : <span>A related route map can be added here.</span>}
      </aside>
    );
  }

  return <hr className="story-divider" />;
}

export function StoryPage({ place, relatedPlaces, meaningfulStories, onSelectPlace }: StoryPageProps) {
  const story = place.story;
  const blocks = story?.blocks ?? [];
  const storyIndex = meaningfulStories.findIndex((storyPlace) => storyPlace.id === place.id);
  const previousStory = storyIndex > 0 ? meaningfulStories[storyIndex - 1] : undefined;
  const nextStory = storyIndex >= 0 && storyIndex < meaningfulStories.length - 1 ? meaningfulStories[storyIndex + 1] : undefined;
  const renderedCoverInBlocks = Boolean(story?.coverImage && blocks.some((block) => block.type === "image" && block.src === story.coverImage));
  const showRelatedStories = relatedPlaces.length >= 2;

  return (
    <main className="story-page">
      <header className="story-header">
        <a className="story-wordmark" href="/">
          Pretty Little Maps
        </a>
        <a className="story-back" href="/" onClick={() => onSelectPlace(place)}>
          ← Back to atlas
        </a>
      </header>

      <article className="story-article">
        <p className="story-kicker">{story?.dateLabel ?? place.dateLabel} · {story?.locationLabel ?? place.country}</p>
        <h1>{story?.title ?? place.name}</h1>
        <p className="story-meta">{story?.status === "draft" ? "Draft" : "Story"}</p>
        {story?.dek ? <p className="story-summary">{story.dek}</p> : null}
        {story?.coverImage && !renderedCoverInBlocks ? (
          <StoryImage
            src={story.coverImage}
            alt={story.coverAlt ?? `${story.title} story cover`}
            rotateClockwiseIfLandscape={place.id === "chengdu-2026"}
          />
        ) : null}

        <div className="story-blocks">
          {blocks.length > 0 ? (
            blocks.map((block) => <StoryBlockView key={block.id} block={block} />)
          ) : (
            <p className="story-empty">Notes and photographs coming soon.</p>
          )}
        </div>
      </article>

      {story?.status !== "draft" && (previousStory || nextStory) ? (
        <nav className="story-nav" aria-label="Story navigation">
          {previousStory?.story ? (
            <a href={`/stories/${previousStory.story.slug}`} onClick={() => onSelectPlace(previousStory)}>
              <small>← Previous</small>
              <span>{previousStory.story.title ?? previousStory.name}</span>
            </a>
          ) : <span aria-hidden="true" />}

          {nextStory?.story ? (
            <a className="next" href={`/stories/${nextStory.story.slug}`} onClick={() => onSelectPlace(nextStory)}>
              <small>Next →</small>
              <span>{nextStory.story.title ?? nextStory.name}</span>
            </a>
          ) : <span aria-hidden="true" />}
        </nav>
      ) : null}

      {showRelatedStories ? (
        <aside className="story-related" aria-label="Related stories">
          <p>Related Stories</p>
          <div>
            {relatedPlaces.slice(0, 3).map((relatedPlace) => (
              <a
                href={relatedPlace.story ? `/stories/${relatedPlace.story.slug}` : "/stories"}
                key={relatedPlace.id}
                onClick={() => onSelectPlace(relatedPlace)}
              >
                <span>{relatedPlace.name}</span>
                <small>{relatedPlace.dateLabel} · {relatedPlace.country}</small>
              </a>
            ))}
          </div>
        </aside>
      ) : null}
    </main>
  );
}
