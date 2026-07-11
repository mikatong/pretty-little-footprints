import type { Place, StoryBlock } from "../types";

type StoryPageProps = {
  place: Place;
  relatedPlaces: Place[];
  onSelectPlace: (place: Place) => void;
};

function StoryImage({ src, alt, caption }: { src: string; alt?: string; caption?: string }) {
  return (
    <figure className="story-image">
      <img
        src={src}
        alt={alt ?? ""}
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
    return <p className="story-text">{block.content}</p>;
  }

  if (block.type === "image") {
    return <StoryImage src={block.src} alt={block.alt} caption={block.caption} />;
  }

  if (block.type === "gallery") {
    return (
      <div className="story-gallery">
        {block.images.map((image) => (
          <StoryImage key={image.src} src={image.src} alt={image.alt} caption={image.caption} />
        ))}
      </div>
    );
  }

  if (block.type === "quote") {
    return <blockquote className="story-quote">{block.content}</blockquote>;
  }

  return <hr className="story-divider" />;
}

export function StoryPage({ place, relatedPlaces, onSelectPlace }: StoryPageProps) {
  const story = place.story;
  const blocks = story?.blocks ?? [];

  return (
    <main className="story-page">
      <header className="story-header">
        <a className="story-wordmark" href="/">
          Pretty Little Maps
        </a>
        <a className="story-back" href="/#stories" onClick={() => onSelectPlace(place)}>
          ← Back to atlas
        </a>
      </header>

      <article className="story-article">
        <p className="story-kicker">{place.dateLabel}</p>
        <h1>{story?.title ?? place.name}</h1>
        <p className="story-meta">{place.country}</p>
        {story?.summary ? <p className="story-summary">{story.summary}</p> : null}

        <div className="story-blocks">
          {blocks.length > 0 ? (
            blocks.map((block) => <StoryBlockView key={block.id} block={block} />)
          ) : (
            <p className="story-empty">Notes and photographs coming soon.</p>
          )}
        </div>
      </article>

      {relatedPlaces.length > 0 ? (
        <aside className="story-related" aria-label="Related stories">
          <p>Related Stories</p>
          <div>
            {relatedPlaces.map((relatedPlace) => (
              <a
                href={`/#stories`}
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
