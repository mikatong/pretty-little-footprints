import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { MapView } from "./components/MapView";
import { PlaceCard } from "./components/PlaceCard";
import { PlaceGlyph } from "./components/PlaceGlyph";
import { StoryPage } from "./components/StoryPage";
import { places } from "./data/places";
import { stories } from "./data/stories";
import { getPlaceAccent } from "./placePresentation";
import {
  getFeaturedStories,
  getLatestMeaningfulFeaturedStory,
  getMeaningfulStories,
  getStartTime,
  hasMeaningfulStoryContent,
  selectedPlaceStorageKey,
} from "./storyUtils";
import type { MapPoint, Place, Story } from "./types";

const sinceYear = "2015";

function getStartYear(place: Place) {
  const match = place.year.match(/\d{4}/);
  return match ? match[0] : sinceYear;
}

function getTimelinePlaces() {
  return places.filter((place) => {
    const year = getStartYear(place);
    return Number(year) >= Number(sinceYear);
  });
}

function getDurationClass(place: Place) {
  const years = place.year.match(/\d{4}/g)?.map(Number);
  if (!years || years.length < 2) return "short";
  const duration = years[1] - years[0];
  if (duration >= 3) return "long";
  if (duration >= 1) return "medium";
  return "short";
}

function getCountryCount(visiblePlaces: Place[]) {
  return new Set(getActualMapPlaces(visiblePlaces).map((place) => place.country)).size;
}

function getPlaceCount(visiblePlaces: Place[]) {
  return new Set(getActualMapPlaces(visiblePlaces).map((place) => `${place.name}, ${place.country}`)).size;
}

function getActualMapPlaces(visiblePlaces: Place[]): MapPoint[] {
  return visiblePlaces.flatMap((place) => {
    if (place.mapPoints && place.mapPoints.length > 0) return place.mapPoints;
    return [{ id: place.id, name: place.name, country: place.country, lat: place.lat, lng: place.lng }];
  });
}

function getStorySlugFromPath() {
  const match = window.location.pathname.match(/^\/stories\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isTimelinePath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/timeline";
}

function isStoriesArchivePath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/stories";
}

function isUploadPath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/upload";
}

function getComposeSlugFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/^\/compose\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function hasKnownMonth(place: Place) {
  return /^\d{4}-\d{2}/.test(place.startDate);
}

function sortTimelinePlaces(visiblePlaces: Place[]) {
  return visiblePlaces
    .map((place, index) => ({ place, index }))
    .sort((a, b) => {
      const yearDelta = Number(getStartYear(b.place)) - Number(getStartYear(a.place));
      if (yearDelta !== 0) return yearDelta;

      const aHasMonth = hasKnownMonth(a.place);
      const bHasMonth = hasKnownMonth(b.place);
      if (aHasMonth !== bHasMonth) return aHasMonth ? -1 : 1;

      if (aHasMonth && bHasMonth) {
        const monthDelta = getStartTime(b.place) - getStartTime(a.place);
        if (monthDelta !== 0) return monthDelta;
      }

      return a.index - b.index;
    })
    .map(({ place }) => place);
}

function getTimelineColor(place: Place) {
  if (place.country.includes("United States") || place.country.includes("Canada")) return "north-america";
  if (place.country.includes("Peru") || place.country.includes("Chile") || place.country.includes("Argentina")) {
    return "south-america";
  }
  if (place.country.includes("Japan") || place.country.includes("China") || place.country.includes("Indonesia")) {
    return "asia";
  }
  if (place.country.includes("Antarctica")) return "antarctica";
  return "europe";
}

function TimelineInlinePreview({ place }: { place: Place }) {
  if (!hasMeaningfulStoryContent(place) || !place.story) return null;
  const accent = getPlaceAccent(place);
  const previewImage = place.story.previewImage ?? place.story.coverImage ?? place.photo;
  const previewText = place.story.previewSummary ?? place.story.dek ?? place.note;

  return (
    <a
      className="timeline-inline-preview"
      href={`/stories/${place.story.slug}`}
      style={{ "--place-accent": accent.primary, "--place-accent-pale": accent.pale } as Record<string, string>}
    >
      {previewImage ? <img src={previewImage} alt={`${place.name} story preview`} /> : <PlaceGlyph place={place} className="timeline-preview-glyph" />}
      <span>
        <small>{place.dateLabel} · {place.country}</small>
        <strong>{place.story.title ?? place.name}</strong>
        {previewText ? <em>{previewText}</em> : null}
        <b>Read story →</b>
      </span>
    </a>
  );
}

function Timeline({
  visiblePlaces,
  selectedPlace,
  expandedYears,
  onToggleYear,
  onActivateYear,
  onSelect,
}: {
  visiblePlaces: Place[];
  selectedPlace: Place;
  expandedYears: Set<string>;
  onToggleYear: (year: string) => void;
  onActivateYear: (year: string) => void;
  onSelect: (place: Place) => void;
}) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const groupedPlaces = useMemo(() => {
    return sortTimelinePlaces(visiblePlaces).reduce<Record<string, Place[]>>((groups, place) => {
      const year = getStartYear(place);
      groups[year] = [...(groups[year] ?? []), place];
      return groups;
    }, {});
  }, [visiblePlaces]);

  const years = Object.keys(groupedPlaces).sort((a, b) => {
    return Number(b) - Number(a);
  });

  useEffect(() => {
    itemRefs.current[selectedPlace.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedPlace.id, expandedYears]);

  return (
    <section className="timeline-panel" id="journey" aria-label="Timeline">
      <div className="module-header">
        <p>Timeline</p>
      </div>
      <div className="timeline-scroll">
        {years.map((year) => {
          const yearPlaces = groupedPlaces[year];
          const isExpanded = expandedYears.has(year);

          return (
            <section className="timeline-year-group" key={year}>
              <button
                className="year-toggle"
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${year} timeline entries`}
                onClick={() => {
                  onActivateYear(year);
                  onToggleYear(year);
                }}
              >
                <span>{year}</span>
                <small>{yearPlaces.length} entries</small>
              </button>

              {isExpanded ? (
                <div className="timeline-items">
                  {yearPlaces.map((place) => {
                    const selected = selectedPlace.id === place.id;
                    return (
                      <article className="timeline-entry" key={place.id}>
                        <button
                          className={`timeline-item ${selected ? "selected" : ""} ${getDurationClass(place)} ${getTimelineColor(place)}`}
                          style={{ "--place-accent": getPlaceAccent(place).primary } as Record<string, string>}
                          ref={(element: HTMLButtonElement | null) => {
                            itemRefs.current[place.id] = element;
                          }}
                          type="button"
                          aria-expanded={selected && hasMeaningfulStoryContent(place) ? "true" : undefined}
                          onClick={() => onSelect(place)}
                        >
                          <span className="timeline-month">{place.dateLabel}</span>
                          <span className="timeline-dot" />
                          <PlaceGlyph place={place} className="timeline-glyph" />
                          <span className="timeline-copy">
                            <strong>{place.name}</strong>
                            <small>{place.country}</small>
                            <em>{place.note}</em>
                          </span>
                        </button>
                        {selected ? <TimelineInlinePreview place={place} /> : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <a className="timeline-link" href="/timeline">View full timeline</a>
    </section>
  );
}

function FullTimelinePage({
  visiblePlaces,
  selectedPlace,
  expandedYears,
  onToggleYear,
  onActivateYear,
  onSelect,
}: {
  visiblePlaces: Place[];
  selectedPlace: Place;
  expandedYears: Set<string>;
  onToggleYear: (year: string) => void;
  onActivateYear: (year: string) => void;
  onSelect: (place: Place) => void;
}) {
  return (
    <main className="full-timeline-page">
      <header className="story-header">
        <a className="story-wordmark" href="/">
          Pretty Little Maps
        </a>
        <a className="story-back" href="/">
          ← Back to atlas
        </a>
      </header>
      <Timeline
        visiblePlaces={visiblePlaces}
        selectedPlace={selectedPlace}
        expandedYears={expandedYears}
        onToggleYear={onToggleYear}
        onActivateYear={onActivateYear}
        onSelect={onSelect}
      />
    </main>
  );
}

function StoriesArchivePage({
  stories,
  selectedPlace,
  onSelect,
}: {
  stories: Place[];
  selectedPlace: Place;
  onSelect: (place: Place) => void;
}) {
  return (
    <main className="story-page story-archive-page">
      <header className="story-header">
        <a className="story-wordmark" href="/">
          Pretty Little Maps
        </a>
        <a className="story-back" href="/">
          ← Back to atlas
        </a>
      </header>
      <article className="story-article">
        <p className="story-kicker">Stories</p>
        <h1>Story Archive</h1>
        <p className="story-summary">Published notes and photographs from the atlas.</p>
      </article>
      <section className="story-archive-grid" aria-label="Published stories">
        {stories.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            month={place.dateLabel}
            selected={selectedPlace.id === place.id}
            onSelect={onSelect}
          />
        ))}
      </section>
    </main>
  );
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

function getFirstTextBlock(story: Story) {
  return story.blocks.find((block) => block.type === "text");
}

function getComposerStory(
  story: Story,
  values: { title: string; previewSummary: string; body: string; status: Story["status"]; featured: boolean; coverImage: string },
): Story {
  let updatedFirstText = false;
  const trimmedBody = values.body.trim();
  const blocks = story.blocks.map((block) => {
    if (block.type !== "text" || updatedFirstText) return block;
    updatedFirstText = true;
    return { ...block, body: trimmedBody };
  });

  return {
    ...story,
    title: values.title,
    previewSummary: values.previewSummary,
    status: values.status,
    featured: values.featured,
    coverImage: values.coverImage || story.coverImage,
    previewImage: values.coverImage || story.previewImage,
    blocks: updatedFirstText || !trimmedBody ? blocks : [{ id: `${story.slug}-text`, type: "text", body: trimmedBody }, ...blocks],
  };
}

function UploadPage() {
  const [selectedSlug, setSelectedSlug] = useState(stories[0]?.slug ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const selectedFiles = [...(coverFile ? [coverFile] : []), ...photoFiles];

  const onSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setMessage("");

    if (!import.meta.env.DEV) return;
    if (!selectedSlug) {
      setMessage("Choose a Story.");
      return;
    }
    if (selectedFiles.length === 0) {
      setMessage("Choose at least one image.");
      return;
    }
    if (selectedFiles.some(isHeicFile)) {
      setMessage("HEIC upload is not supported yet. Please choose JPEG, PNG, or WebP.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("slug", selectedSlug);
      if (coverFile) formData.append("cover", coverFile);
      photoFiles.forEach((file) => formData.append("photos", file));

      const response = await fetch("/api/local-upload", { method: "POST", body: formData });
      const result = await response.json() as { saved?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      setMessage(`Uploaded: ${result.saved?.join(", ") ?? "files saved"}`);
      setCoverFile(null);
      setPhotoFiles([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (!import.meta.env.DEV) {
    return (
      <main className="upload-page">
        <section className="upload-card">
          <p className="upload-kicker">Pretty Little Maps</p>
          <h1>Photo upload is available locally.</h1>
          <a className="upload-back" href="/">Back to atlas</a>
        </section>
      </main>
    );
  }

  return (
    <main className="upload-page">
      <form className="upload-card" onSubmit={onSubmit}>
        <p className="upload-kicker">Pretty Little Maps</p>
        <h1>Upload photos</h1>

        <label>
          <span>Story</span>
          <select value={selectedSlug} onChange={(event: { target: HTMLSelectElement }) => setSelectedSlug(event.target.value)}>
            {stories.map((story) => (
              <option key={story.slug} value={story.slug}>{story.title}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Upload Cover</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            onChange={(event: { target: HTMLInputElement }) => setCoverFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          <span>Upload Photos</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple
            onChange={(event: { target: HTMLInputElement }) => setPhotoFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        <section className="upload-files" aria-label="Selected files">
          <strong>Selected Files</strong>
          {selectedFiles.length > 0 ? (
            <ul>
              {coverFile ? <li>Cover: {coverFile.name}</li> : null}
              {photoFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
            </ul>
          ) : (
            <p>No files selected.</p>
          )}
        </section>

        <button className="upload-button" type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {message ? <p className="upload-message">{message}</p> : null}
      </form>
    </main>
  );
}

function StoryComposerPage({
  place,
  relatedPlaces,
  meaningfulStories,
  onSelectPlace,
}: {
  place: Place | null;
  relatedPlaces: Place[];
  meaningfulStories: Place[];
  onSelectPlace: (place: Place) => void;
}) {
  if (!import.meta.env.DEV) {
    return (
      <main className="upload-page">
        <section className="upload-card">
          <p className="upload-kicker">Pretty Little Maps</p>
          <h1>Story editing is available locally.</h1>
          <a className="upload-back" href="/">Back to atlas</a>
        </section>
      </main>
    );
  }

  if (!place?.story) {
    return (
      <main className="compose-page">
        <section className="compose-card">
          <p className="upload-kicker">Pretty Little Maps</p>
          <h1>Story not found</h1>
          <a className="upload-back" href="/">Back to atlas</a>
        </section>
      </main>
    );
  }

  const story = place.story;
  const [title, setTitle] = useState(story.title);
  const [previewSummary, setPreviewSummary] = useState(story.previewSummary ?? story.dek ?? "");
  const [body, setBody] = useState(getFirstTextBlock(story)?.body ?? "");
  const [status, setStatus] = useState<Story["status"]>(story.status);
  const [featured, setFeatured] = useState(Boolean(story.featured));
  const [coverImage, setCoverImage] = useState(story.coverImage ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [storyUrl, setStoryUrl] = useState("");
  const selectedFiles = [...(coverFile ? [coverFile] : []), ...photoFiles];
  const previewStory = getComposerStory(story, { title, previewSummary, body, status, featured, coverImage });
  const previewPlace: Place = {
    ...place,
    story: previewStory,
    featured,
    photo: previewStory.previewImage ?? previewStory.coverImage ?? place.photo,
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return { cover: "", gallery: [] as string[] };
    if (selectedFiles.some(isHeicFile)) throw new Error("HEIC upload is not supported yet. Please choose JPEG, PNG, or WebP.");

    const formData = new FormData();
    formData.append("slug", story.slug);
    if (coverFile) formData.append("cover", coverFile);
    photoFiles.forEach((file) => formData.append("photos", file));

    const response = await fetch("/api/local-upload", { method: "POST", body: formData });
    const result = await response.json() as { saved?: string[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Upload failed.");

    const savedPaths = (result.saved ?? []).map((path) => `/images/stories/${path}`);
    return {
      cover: savedPaths.find((path) => path.includes(`/${story.slug}/cover.`)) ?? "",
      gallery: savedPaths.filter((path) => !path.includes(`/${story.slug}/cover.`)),
    };
  };

  const onSave = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setStoryUrl("");

    try {
      const uploaded = await uploadFiles();
      const response = await fetch("/api/local-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: story.slug,
          title,
          previewSummary,
          body,
          status,
          featured,
          coverImage: uploaded.cover || coverImage,
          previewImage: uploaded.cover || coverImage,
          galleryImages: uploaded.gallery,
        }),
      });
      const result = await response.json() as { story?: Story; url?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Save failed.");

      const localUrl = result.url ?? `/stories/${story.slug}`;
      const savedStatus = result.story?.status ?? status;
      setCoverImage(uploaded.cover || coverImage);
      setCoverFile(null);
      setPhotoFiles([]);
      setStoryUrl(localUrl);
      setMessage(`Saved · ${savedStatus === "published" ? "Published" : "Draft"}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="compose-page">
      <form className="compose-card" onSubmit={onSave}>
        <p className="upload-kicker">Local Author Mode</p>
        <h1>{story.title}</h1>

        <label>
          <span>Story Title</span>
          <input value={title} onChange={(event: { target: HTMLInputElement }) => setTitle(event.target.value)} />
        </label>

        <label>
          <span>Preview Summary</span>
          <textarea value={previewSummary} rows={3} onChange={(event: { target: HTMLTextAreaElement }) => setPreviewSummary(event.target.value)} />
        </label>

        <label>
          <span>Cover Image Path</span>
          <input value={coverImage} onChange={(event: { target: HTMLInputElement }) => setCoverImage(event.target.value)} placeholder="/images/stories/story/cover.jpg" />
        </label>

        <label>
          <span>Cover Upload</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            onChange={(event: { target: HTMLInputElement }) => setCoverFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          <span>Photo Upload</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
            multiple
            onChange={(event: { target: HTMLInputElement }) => setPhotoFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        <section className="upload-files" aria-label="Selected files">
          <strong>Selected Files</strong>
          {selectedFiles.length > 0 ? (
            <ul>
              {coverFile ? <li>Cover: {coverFile.name}</li> : null}
              {photoFiles.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
            </ul>
          ) : (
            <p>No files selected.</p>
          )}
        </section>

        <label>
          <span>Main Story Text</span>
          <textarea value={body} rows={10} onChange={(event: { target: HTMLTextAreaElement }) => setBody(event.target.value)} />
        </label>

        <label>
          <span>Status</span>
          <select value={status} onChange={(event: { target: HTMLSelectElement }) => setStatus(event.target.value as Story["status"])}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <label className="compose-toggle">
          <input type="checkbox" checked={featured} onChange={(event: { target: HTMLInputElement }) => setFeatured(event.target.checked)} />
          <span>Featured</span>
        </label>

        <div className="compose-actions">
          <button className="upload-button secondary" type="button" onClick={() => setShowPreview((shown: boolean) => !shown)}>
            Preview
          </button>
          <button className="upload-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {message ? <p className="upload-message">{message}</p> : null}
        {storyUrl ? <a className="upload-back" href={storyUrl}>Open local Story: {storyUrl}</a> : null}
      </form>

      {showPreview ? (
        <section className="compose-preview" aria-label="Story preview">
          <StoryPage
            place={previewPlace}
            relatedPlaces={relatedPlaces}
            meaningfulStories={meaningfulStories}
            onSelectPlace={onSelectPlace}
          />
        </section>
      ) : null}
    </main>
  );
}

export default function App() {
  const timelinePlaces = useMemo(() => getTimelinePlaces(), []);
  const latestYear = useMemo(() => {
    return Math.max(...timelinePlaces.map((place) => Number(getStartYear(place)))).toString();
  }, [timelinePlaces]);
  const latestFeaturedPlace = useMemo(() => getLatestMeaningfulFeaturedStory(timelinePlaces), [timelinePlaces]);
  const storedSelectedPlace = useMemo(() => {
    const storedId = window.sessionStorage.getItem(selectedPlaceStorageKey);
    return timelinePlaces.find((place) => place.id === storedId);
  }, [timelinePlaces]);
  const initialPlace = storedSelectedPlace ?? latestFeaturedPlace ?? timelinePlaces.find((place) => getStartYear(place) === latestYear) ?? timelinePlaces[0] ?? places[0];
  const [selectedPlace, setSelectedPlace] = useState<Place>(initialPlace);
  const [activeYear, setActiveYear] = useState(() => getStartYear(initialPlace));
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([latestYear]));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const storySlug = useMemo(() => getStorySlugFromPath(), [routePath]);
  const composeSlug = useMemo(() => getComposeSlugFromPath(routePath), [routePath]);

  const storyPlaces = useMemo(() => {
    const storyEntries = getFeaturedStories(timelinePlaces);
    if (selectedPlace.story?.featured && hasMeaningfulStoryContent(selectedPlace) && !storyEntries.some((place) => place.id === selectedPlace.id)) {
      return [selectedPlace, ...storyEntries];
    }
    return storyEntries;
  }, [selectedPlace, timelinePlaces]);

  const meaningfulStories = useMemo(() => getMeaningfulStories(timelinePlaces), [timelinePlaces]);

  const currentStoryPlace = useMemo(() => {
    if (!storySlug) return null;
    return timelinePlaces.find((place) => place.story?.slug === storySlug) ?? null;
  }, [storySlug, timelinePlaces]);

  const composerStoryPlace = useMemo(() => {
    if (!composeSlug) return null;
    return timelinePlaces.find((place) => place.story?.slug === composeSlug) ?? null;
  }, [composeSlug, timelinePlaces]);

  const relatedStoryPlaces = useMemo(() => {
    if (!currentStoryPlace?.story) return [];
    const relatedIds = currentStoryPlace.story.relatedEntryIds ?? currentStoryPlace.story.relatedPlaceIds ?? [];
    const explicitRelated = relatedIds
      .map((id) => timelinePlaces.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place && place.id !== currentStoryPlace.id && hasMeaningfulStoryContent(place)));
    if (explicitRelated.length >= 2) return explicitRelated;

    const inferredRelated = meaningfulStories.filter((place) => {
      if (place.id === currentStoryPlace.id) return false;
      return place.country === currentStoryPlace.country || getStartYear(place) === getStartYear(currentStoryPlace);
    });
    return inferredRelated.slice(0, 3);
  }, [currentStoryPlace, meaningfulStories, timelinePlaces]);

  useEffect(() => {
    const year = getStartYear(selectedPlace);
    setExpandedYears((current: Set<string>) => {
      if (current.has(year)) return current;
      return new Set([...current, year]);
    });
  }, [selectedPlace]);

  useEffect(() => {
    if (!isTimelinePath(routePath)) return;
    const years = new Set(timelinePlaces.map(getStartYear));
    setExpandedYears(years);
  }, [routePath, timelinePlaces]);

  useEffect(() => {
    const handlePopState = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelectPlace = useCallback((place: Place) => {
    window.sessionStorage.setItem(selectedPlaceStorageKey, place.id);
    setActiveYear(getStartYear(place));
    setSelectedPlace(place);
  }, []);

  const handleToggleYear = useCallback((year: string) => {
    setExpandedYears((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }, []);

  if (isUploadPath(routePath)) {
    return <UploadPage />;
  }

  if (composeSlug) {
    return (
      <StoryComposerPage
        place={composerStoryPlace}
        relatedPlaces={relatedStoryPlaces}
        meaningfulStories={meaningfulStories}
        onSelectPlace={handleSelectPlace}
      />
    );
  }

  if (isTimelinePath(routePath)) {
    return (
      <FullTimelinePage
        visiblePlaces={timelinePlaces}
        selectedPlace={selectedPlace}
        expandedYears={expandedYears}
        onToggleYear={handleToggleYear}
        onActivateYear={setActiveYear}
        onSelect={handleSelectPlace}
      />
    );
  }

  if (isStoriesArchivePath(routePath)) {
    return (
      <StoriesArchivePage
        stories={[...meaningfulStories].reverse()}
        selectedPlace={selectedPlace}
        onSelect={handleSelectPlace}
      />
    );
  }

  if (storySlug) {
    if (currentStoryPlace) {
      return (
        <StoryPage
          place={currentStoryPlace}
          relatedPlaces={relatedStoryPlaces}
          meaningfulStories={meaningfulStories}
          onSelectPlace={handleSelectPlace}
        />
      );
    }

    return (
      <main className="story-page">
        <header className="story-header">
          <a className="story-wordmark" href="/">
            Pretty Little Maps
          </a>
          <a className="story-back" href="/">
            ← Back to atlas
          </a>
        </header>
        <article className="story-article">
          <h1>Story not found</h1>
          <p className="story-empty">This Story is not available yet.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {import.meta.env.DEV && selectedPlace.story ? (
        <a className="author-edit-button" href={`/compose/${selectedPlace.story.slug}`}>
          Edit
        </a>
      ) : null}
      <Hero
        placeCount={getPlaceCount(timelinePlaces)}
        countryCount={getCountryCount(timelinePlaces)}
        sinceYear={sinceYear}
        selectedPlace={selectedPlace}
      />

      <section className="atlas-layout">
        <Timeline
          visiblePlaces={timelinePlaces}
          selectedPlace={selectedPlace}
          expandedYears={expandedYears}
          onToggleYear={handleToggleYear}
          onActivateYear={setActiveYear}
          onSelect={handleSelectPlace}
        />

        <section className={`map-section ${mapOpen ? "open" : ""}`} id="map" aria-label="Journey map">
          <button className="map-toggle" type="button" onClick={() => setMapOpen((open: boolean) => !open)}>
            {mapOpen ? "Hide map" : "View map"}
          </button>
          <div className="map-panel">
            <MapView
              places={timelinePlaces}
              selectedPlace={selectedPlace}
              activeYear={activeYear}
              meaningfulStories={meaningfulStories}
              onSelect={handleSelectPlace}
            />
          </div>

          <aside className="story-panel" id="stories">
            <div className="module-header">
              <p>Featured Stories</p>
              <a href="/stories">View all →</a>
            </div>
            <div className="story-list">
              {storyPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  month={place.dateLabel}
                  selected={selectedPlace.id === place.id}
                  onSelect={handleSelectPlace}
                />
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
