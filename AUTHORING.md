# Pretty Little Maps Authoring

This project has no CMS yet. Story content is edited in code, and photos are added to `public`.

## Where To Edit

- Story text: `src/data/stories.ts`
- Story photos: `public/images/stories/<slug>/`

Example image paths use the public root:

```ts
coverImage: "/images/stories/beijing/cover.jpg"
```

Supported image formats: `jpg`, `jpeg`, `png`, `webp`.

## Story Fields

- `status: "draft"` keeps the route available but hides the Story from public preview lists.
- `status: "published"` makes the Story eligible for Story surfaces when it has meaningful content.
- `featured: true` shows a published meaningful Story in Featured Stories.
- `coverImage` is the main Story image.
- `previewImage` is the smaller card/map preview image.
- Image blocks require useful `alt` text.
- Captions are optional.

Do not overwrite the existing Beijing image at:

```text
public/images/stories/beijing/cover.jpg
```

## Copyable Examples

### A. Beijing: One Photo Plus Caption

```ts
{
  slug: "beijing",
  placeId: "beijing-2025",
  title: "Beijing",
  status: "published",
  coverImage: "/images/stories/beijing/cover.jpg",
  coverAlt: "Portrait by a red palace wall in Beijing",
  previewImage: "/images/stories/beijing/cover.jpg",
  imageSource: { type: "user" },
  blocks: [
    {
      id: "beijing-cover",
      type: "image",
      src: "/images/stories/beijing/cover.jpg",
      alt: "Portrait by a red palace wall in Beijing",
      orientation: "portrait",
      caption: "Optional caption goes here."
    }
  ],
}
```

### B. Canggu: Short Note Plus Gallery

```ts
{
  slug: "canggu",
  placeId: "canggu",
  title: "Canggu",
  status: "published",
  featured: true,
  previewSummary: "Short preview text goes here.",
  blocks: [
    {
      id: "canggu-note",
      type: "text",
      body: `First paragraph.

Second paragraph.`
    },
    {
      id: "canggu-gallery",
      type: "gallery",
      layout: "grid",
      images: [
        {
          src: "/images/stories/canggu/01.jpg",
          alt: "Describe the first Canggu photo",
          caption: "Optional caption."
        },
        {
          src: "/images/stories/canggu/02.jpg",
          alt: "Describe the second Canggu photo"
        }
      ]
    }
  ],
}
```

### C. Patagonia: Small Essay Plus Images

```ts
{
  slug: "patagonia",
  placeId: "patagonia",
  title: "Patagonia",
  status: "published",
  featured: true,
  previewSummary: "Short preview text goes here.",
  blocks: [
    {
      id: "patagonia-opening",
      type: "text",
      body: `Opening paragraph goes here.

Another paragraph goes here.`
    },
    {
      id: "patagonia-image-01",
      type: "image",
      src: "/images/stories/patagonia/01.jpg",
      alt: "Describe the Patagonia photo",
      orientation: "landscape",
      caption: "Optional caption."
    },
    {
      id: "patagonia-divider",
      type: "divider"
    },
    {
      id: "patagonia-closing",
      type: "text",
      body: "Closing paragraph goes here."
    }
  ],
}
```

## Preview Locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

Before committing:

```bash
npm run build
```

## Deploy

Commit changes to `main` and push to GitHub. This repository is connected to Vercel, so a successful push to `main` should start a Production deployment automatically.
