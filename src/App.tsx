import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Hero } from "./components/Hero";
import { MapView } from "./components/MapView";
import { PlaceCard } from "./components/PlaceCard";
import { PlaceGlyph } from "./components/PlaceGlyph";
import { StoryPage } from "./components/StoryPage";
import { IconSystemPreview } from "./components/IconSystemPreview";
import { places } from "./data/places";
import { stories } from "./data/stories";
import {
  compressStoryImage,
  formatImageBytes,
  getFirstStoryText,
  getStoryGalleryUrls,
  isHeicNameOrType,
  loadOwnerCloudStories,
  loadOwnerCloudStory,
  loadPublishedCloudStories,
  mergeCloudStories,
  saveCloudStory,
  uploadStoryImage,
} from "./lib/cloudStories";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
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

function isLoginPath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/login";
}

function isIconSystemPath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/icon-system";
}

function getComposeSlugFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/^\/compose\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getLoginRedirect() {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  return redirect?.startsWith("/") ? redirect : "/";
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

function AtlasStoryRail({
  selectedPlace,
  storyPlaces,
  onSelect,
  editHref,
}: {
  selectedPlace: Place;
  storyPlaces: Place[];
  onSelect: (place: Place) => void;
  editHref?: string;
}) {
  const railPlaces = [selectedPlace, ...storyPlaces.filter((place) => place.id !== selectedPlace.id)];
  const accent = getPlaceAccent(selectedPlace);

  return (
    <aside className="story-panel atlas-story-rail" id="stories" style={{ "--place-accent": accent.primary, "--place-accent-pale": accent.pale } as Record<string, string>}>
      <div className="rail-story-cards" aria-label="Featured stories">
        {railPlaces.map((place) => {
          const image = place.story?.previewImage ?? place.story?.coverImage ?? place.photo;
          return (
            <button className={`rail-story-card${place.id === selectedPlace.id ? " selected" : ""}`} key={place.id} type="button" onClick={() => onSelect(place)} aria-current={place.id === selectedPlace.id ? "true" : undefined}>
              <span className="rail-card-image">
                {image ? <img src={image} alt={`${place.name} travel memory`} loading="lazy" decoding="async" /> : <PlaceGlyph place={place} />}
              </span>
              <strong>{place.story?.title ?? place.name}</strong>
              <small>{place.country}</small>
            </button>
          );
        })}
      </div>
      {editHref ? <a className="rail-edit-link" href={editHref}>Edit</a> : null}
    </aside>
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

function getStatusLabel(status: Story["status"]) {
  return status === "published" ? "Published" : "Draft";
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

function LoginPage({ session }: { session: Session | null }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const redirectTo = getLoginRedirect();

  const onSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      if (error) throw new Error(error.message);
      setMessage("Check your email for the magic link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send login link.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="compose-page">
      <form className="compose-card" onSubmit={onSubmit}>
        <p className="upload-kicker">Owner Login</p>
        <h1>Sign in to edit stories</h1>
        {session ? (
          <>
            <p className="upload-message">Signed in as {session.user.email ?? "owner"}.</p>
            <a className="upload-back" href={redirectTo}>Continue</a>
          </>
        ) : (
          <>
            <label>
              <span>Email</span>
              <input
                inputMode="email"
                type="email"
                value={email}
                onChange={(event: { target: HTMLInputElement }) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <button className="upload-button" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send Magic Link"}
            </button>
          </>
        )}
        {message ? <p className="upload-message">{message}</p> : null}
        <a className="upload-back" href="/">Back to atlas</a>
      </form>
    </main>
  );
}

function LocalStoryComposerPage({
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
      setMessage(`Saved · ${getStatusLabel(savedStatus)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="compose-page">
      <form className="compose-card" onSubmit={onSave}>
        <div className="compose-topline">
          <div className="compose-navlinks">
            <a className="upload-back" href="/">← Back to Atlas</a>
            <a className="upload-back" href={`/stories/${story.slug}`}>View story</a>
          </div>
        </div>
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

function CloudStoryComposerPage({
  place,
  session,
  relatedPlaces,
  meaningfulStories,
  onSelectPlace,
  onSignOut,
}: {
  place: Place | null;
  session: Session | null;
  relatedPlaces: Place[];
  meaningfulStories: Place[];
  onSelectPlace: (place: Place) => void;
  onSignOut: () => void;
}) {
  const staticStory = place?.story;
  const [loadedStory, setLoadedStory] = useState<Story | null>(staticStory ?? null);
  const story = loadedStory ?? staticStory;
  const [title, setTitle] = useState(story?.title ?? "");
  const [previewSummary, setPreviewSummary] = useState(story?.previewSummary ?? story?.dek ?? "");
  const [body, setBody] = useState(story ? getFirstStoryText(story) : "");
  const [status, setStatus] = useState<Story["status"]>(story?.status ?? "draft");
  const [featured, setFeatured] = useState(Boolean(story?.featured));
  const [coverUrl, setCoverUrl] = useState(story?.coverImage ?? "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(story ? getStoryGalleryUrls(story) : []);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [storyUrl, setStoryUrl] = useState("");
  const selectedFiles = [...(coverFile ? [coverFile] : []), ...photoFiles];

  useEffect(() => {
    let cancelled = false;
    if (!staticStory) return;

    setMessage("");
    setLoadedStory(staticStory);
    setTitle(staticStory.title);
    setPreviewSummary(staticStory.previewSummary ?? staticStory.dek ?? "");
    setBody(getFirstStoryText(staticStory));
    setStatus(staticStory.status);
    setFeatured(Boolean(staticStory.featured));
    setCoverUrl(staticStory.coverImage ?? "");
    setGalleryUrls(getStoryGalleryUrls(staticStory));

    loadOwnerCloudStory(staticStory.slug)
      .then((cloudStory) => {
        if (cancelled || !cloudStory) return;
        setLoadedStory(cloudStory);
        setTitle(cloudStory.title);
        setPreviewSummary(cloudStory.previewSummary ?? cloudStory.dek ?? "");
        setBody(getFirstStoryText(cloudStory));
        setStatus(cloudStory.status);
        setFeatured(Boolean(cloudStory.featured));
        setCoverUrl(cloudStory.coverImage ?? "");
        setGalleryUrls(getStoryGalleryUrls(cloudStory));
      })
      .catch((error) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load cloud Story.");
      });

    return () => {
      cancelled = true;
    };
  }, [staticStory]);

  if (!isSupabaseConfigured) {
    return (
      <main className="compose-page">
        <section className="compose-card">
          <p className="upload-kicker">Cloud Composer</p>
          <h1>Supabase is not configured.</h1>
          <p className="upload-message">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable cloud editing.</p>
          <a className="upload-back" href="/">Back to atlas</a>
        </section>
      </main>
    );
  }

  if (!session) {
    return <LoginPage session={null} />;
  }

  if (!place?.story || !story) {
    return (
      <main className="compose-page">
        <section className="compose-card">
          <p className="upload-kicker">Cloud Composer</p>
          <h1>Story not found</h1>
          <a className="upload-back" href="/">Back to atlas</a>
        </section>
      </main>
    );
  }

  const previewStory = getComposerStory(story, { title, previewSummary, body, status, featured, coverImage: coverUrl });
  if (galleryUrls.length > 0 && !previewStory.blocks.some((block) => block.type === "gallery")) {
    previewStory.blocks.push({
      id: `${story.slug}-gallery`,
      type: "gallery",
      layout: "grid",
      images: galleryUrls.map((src) => ({ src, alt: `${title} photo` })),
    });
  }
  const previewPlace: Place = {
    ...place,
    story: previewStory,
    featured,
    photo: previewStory.previewImage ?? previewStory.coverImage ?? place.photo,
  };

  const onSave = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setUploadProgress("");
    setUploadDetails([]);
    setStoryUrl("");

    try {
      let nextCoverUrl = coverUrl;
      const nextGalleryUrls = [...galleryUrls];
      const totalUploads = selectedFiles.length;
      let completedUploads = 0;
      const compressionDetails: string[] = [];

      const addCompressionDetail = (label: string, originalName: string, originalBytes: number, compressedBytes: number) => {
        compressionDetails.push(`${label}: ${originalName} · ${formatImageBytes(originalBytes)} → ${formatImageBytes(compressedBytes)}`);
        setUploadDetails([...compressionDetails]);
      };

      if (coverFile) {
        setUploadProgress(`Compressing cover 1 of ${totalUploads}...`);
        const compressedCover = await compressStoryImage(coverFile, "cover");
        addCompressionDetail("Cover", compressedCover.originalName, compressedCover.originalBytes, compressedCover.compressedBytes);
        setUploadProgress(`Uploading compressed cover 1 of ${totalUploads}...`);
        nextCoverUrl = await uploadStoryImage(compressedCover.file, session.user.id, story.slug, "cover");
        completedUploads += 1;
      }

      for (const file of photoFiles) {
        setUploadProgress(`Compressing gallery ${completedUploads + 1} of ${totalUploads}...`);
        const compressedPhoto = await compressStoryImage(file, "gallery");
        addCompressionDetail("Gallery", compressedPhoto.originalName, compressedPhoto.originalBytes, compressedPhoto.compressedBytes);
        setUploadProgress(`Uploading compressed gallery ${completedUploads + 1} of ${totalUploads}...`);
        nextGalleryUrls.push(await uploadStoryImage(compressedPhoto.file, session.user.id, story.slug, "gallery"));
        completedUploads += 1;
      }

      setUploadProgress("Saving Story...");
      const savedStory = await saveCloudStory({
        slug: story.slug,
        placeId: story.placeId,
        title,
        previewSummary,
        body,
        status,
        featured,
        coverUrl: nextCoverUrl,
        galleryUrls: nextGalleryUrls,
        userId: session.user.id,
      });

      setLoadedStory(savedStory);
      setCoverUrl(savedStory.coverImage ?? "");
      setGalleryUrls(getStoryGalleryUrls(savedStory));
      setCoverFile(null);
      setPhotoFiles([]);
      setStoryUrl(`/stories/${story.slug}`);
      setMessage(`Saved · ${getStatusLabel(savedStory.status)}`);
      setUploadProgress(totalUploads > 0 ? `Uploaded ${totalUploads} compressed image${totalUploads === 1 ? "" : "s"}.` : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
      setUploadProgress("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="compose-page">
      <form className="compose-card" onSubmit={onSave}>
        <div className="compose-topline">
          <div className="compose-navlinks">
            <a className="upload-back" href="/">← Back to Atlas</a>
            {story ? <a className="upload-back" href={`/stories/${story.slug}`}>View story</a> : null}
          </div>
          <button className="compose-signout" type="button" onClick={onSignOut}>Sign out</button>
        </div>
        <p className="upload-kicker">Cloud Composer</p>
        <h1>{story.title}</h1>

        <label>
          <span>Story Title</span>
          <input value={title} onChange={(event: { target: HTMLInputElement }) => setTitle(event.target.value)} required />
        </label>

        <label>
          <span>Preview Summary</span>
          <textarea value={previewSummary} rows={3} onChange={(event: { target: HTMLTextAreaElement }) => setPreviewSummary(event.target.value)} />
        </label>

        <label>
          <span>Cover Image URL</span>
          <input value={coverUrl} onChange={(event: { target: HTMLInputElement }) => setCoverUrl(event.target.value)} placeholder="Supabase Storage public URL" />
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
          <span>Gallery Upload</span>
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

        {uploadProgress ? <p className="upload-message">{uploadProgress}</p> : null}
        {uploadDetails.length > 0 ? (
          <section className="upload-files" aria-label="Compression results">
            <strong>Compression</strong>
            <ul>
              {uploadDetails.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </section>
        ) : null}
        {message ? <p className="upload-message">{message}</p> : null}
        {storyUrl ? <a className="upload-back" href={storyUrl}>Open Story: {storyUrl}</a> : null}
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
  // The place id is the single selection source for the timeline, map, routes, and story rail.
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlace.id);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [activeYear, setActiveYear] = useState(() => getStartYear(initialPlace));
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([latestYear]));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [cloudStories, setCloudStories] = useState<Story[]>([]);
  const [hiddenCloudDraftPlaceIds, setHiddenCloudDraftPlaceIds] = useState<Set<string>>(() => new Set());
  const [hiddenCloudDraftSlugs, setHiddenCloudDraftSlugs] = useState<Set<string>>(() => new Set());
  const [cloudStoriesAvailable, setCloudStoriesAvailable] = useState(false);
  const storySlug = useMemo(() => getStorySlugFromPath(), [routePath]);
  const composeSlug = useMemo(() => getComposeSlugFromPath(routePath), [routePath]);
  const loginPath = useMemo(() => isLoginPath(routePath), [routePath]);
  const iconSystemPath = useMemo(() => isIconSystemPath(routePath), [routePath]);
  const useCloudComposer = isSupabaseConfigured;
  const visiblePlaces = useMemo(() => {
    return cloudStoriesAvailable ? mergeCloudStories(timelinePlaces, cloudStories, hiddenCloudDraftPlaceIds, hiddenCloudDraftSlugs) : timelinePlaces;
  }, [cloudStories, cloudStoriesAvailable, hiddenCloudDraftPlaceIds, hiddenCloudDraftSlugs, timelinePlaces]);
  const selectedVisiblePlace = visiblePlaces.find((place) => place.id === selectedPlaceId) ?? initialPlace;

  const storyPlaces = useMemo(() => {
    const storyEntries = getFeaturedStories(visiblePlaces);
    if (selectedVisiblePlace.story?.featured && hasMeaningfulStoryContent(selectedVisiblePlace) && !storyEntries.some((place) => place.id === selectedVisiblePlace.id)) {
      return [selectedVisiblePlace, ...storyEntries];
    }
    return storyEntries;
  }, [selectedVisiblePlace, visiblePlaces]);

  const meaningfulStories = useMemo(() => getMeaningfulStories(visiblePlaces), [visiblePlaces]);

  const currentStoryPlace = useMemo(() => {
    if (!storySlug) return null;
    return visiblePlaces.find((place) => place.story?.slug === storySlug) ?? null;
  }, [storySlug, visiblePlaces]);

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
    const year = getStartYear(selectedVisiblePlace);
    setExpandedYears((current: Set<string>) => {
      if (current.has(year)) return current;
      return new Set([...current, year]);
    });
  }, [selectedVisiblePlace]);

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

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStories = session ? loadOwnerCloudStories : loadPublishedCloudStories;
    loadStories().then((result) => {
      if (cancelled) return;
      setCloudStories(result.stories);
      setHiddenCloudDraftPlaceIds(result.hiddenPlaceIds ?? new Set());
      setHiddenCloudDraftSlugs(result.hiddenSlugs ?? new Set());
      setCloudStoriesAvailable(result.available);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!composeSlug || !useCloudComposer || authLoading || session) return;
    const redirect = `/login?redirect=${encodeURIComponent(`/compose/${composeSlug}`)}`;
    window.history.replaceState({}, "", redirect);
    setRoutePath(window.location.pathname);
  }, [authLoading, composeSlug, session, useCloudComposer]);

  const handleSelectPlace = useCallback((place: Place) => {
    window.sessionStorage.setItem(selectedPlaceStorageKey, place.id);
    setActiveYear(getStartYear(place));
    setSelectedPlaceId(place.id);
    setSelectionRevision((current: number) => current + 1);
  }, []);

  const handleSignOut = useCallback(() => {
    void supabase?.auth.signOut();
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

  if (iconSystemPath) {
    return <IconSystemPreview />;
  }

  if (loginPath) {
    return <LoginPage session={session} />;
  }

  if (composeSlug) {
    if (useCloudComposer) {
      if (authLoading) {
        return (
          <main className="compose-page">
            <section className="compose-card">
              <p className="upload-kicker">Cloud Composer</p>
              <h1>Checking login...</h1>
            </section>
          </main>
        );
      }

      if (!session) return <LoginPage session={null} />;

      return (
        <CloudStoryComposerPage
          place={composerStoryPlace}
          session={session}
          relatedPlaces={relatedStoryPlaces}
          meaningfulStories={meaningfulStories}
          onSelectPlace={handleSelectPlace}
          onSignOut={handleSignOut}
        />
      );
    }

    return (
      <LocalStoryComposerPage
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
        visiblePlaces={visiblePlaces}
        selectedPlace={selectedVisiblePlace}
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
        selectedPlace={selectedVisiblePlace}
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
      <Hero
        placeCount={getPlaceCount(visiblePlaces)}
        countryCount={getCountryCount(visiblePlaces)}
        sinceYear={sinceYear}
      />

      <section className="atlas-layout">
        <Timeline
          visiblePlaces={visiblePlaces}
          selectedPlace={selectedVisiblePlace}
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
              places={visiblePlaces}
              selectedPlace={selectedVisiblePlace}
              selectionRevision={selectionRevision}
              activeYear={activeYear}
              onSelect={handleSelectPlace}
            />
          </div>

          <AtlasStoryRail
            selectedPlace={selectedVisiblePlace}
            storyPlaces={storyPlaces}
            onSelect={handleSelectPlace}
            editHref={(import.meta.env.DEV || session) && selectedVisiblePlace.story ? `/compose/${selectedVisiblePlace.story.slug}` : undefined}
          />
        </section>
      </section>
    </main>
  );
}
