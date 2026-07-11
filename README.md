# Pretty Little Footprints

A soft, open-source travel footprint map for people who live, work, wander, and start over in different places.

This is a simple React + Vite + TypeScript template using MapLibre GL JS and OpenFreeMap. Fork it, change the places, replace the images, and deploy your own personal map.

## Demo idea

The page includes:

- an interactive world map
- custom place markers
- category filters
- a photo card for each place
- a scrollable place list
- mobile-friendly layout
- no backend and no database

## 1. Install

```bash
npm install
```

## 2. Run locally

```bash
npm run dev
```

Then open the local URL shown in your terminal, usually:

```text
http://localhost:5173
```

## 3. Edit your places

Open this file:

```text
src/data/places.ts
```

Each place looks like this:

```ts
{
  id: "canggu",
  name: "Canggu",
  country: "Indonesia",
  lat: -8.6478,
  lng: 115.1385,
  category: "stayed",
  year: "2026",
  note: "Where I learned that a day can be built around coffee, movement, ocean, and doing less.",
  photo: "/places/canggu.svg",
}
```

Available categories:

```text
lived
worked
stayed
visited
still-mapping
```

## 4. Add your own photos

Put your images here:

```text
public/places
```

Example:

```text
public/places/chengdu.jpg
```

Then update your place data:

```ts
photo: "/places/chengdu.jpg"
```

Recommended image size: 1200 x 900 or any 4:3 image.

## 4a. Add Story pages

Story pages live at:

```text
/stories/:slug
```

Story content is edited directly in:

```text
src/data/places.ts
```

Each entry can opt into a Story page with these flags:

```ts
hasStory: true,
featured: false,
hasGuide: false,
story: {
  slug: "patagonia",
  blocks: [
    { id: "patagonia-note", type: "text", content: "A place that rewards slowing down." },
  ],
}
```

Local Story images should be organized by slug:

```text
public/images/stories/patagonia/cover.jpg
public/images/stories/patagonia/01.jpg
public/images/stories/canggu/01.jpg
```

Use lowercase folder names that match each Story slug. Prefer simple file names like `cover.jpg`, `01.jpg`, `02.jpg`, and `gallery-01.jpg`. Recommended image dimensions are 1600 x 1200 for landscape images, or at least 1400px wide for full-width Story images.

Add a single image block:

```ts
{ id: "patagonia-cover", type: "image", src: "/images/stories/patagonia/cover.jpg", alt: "Patagonia mountains", caption: "A quiet morning in Patagonia." }
```

Add a gallery block:

```ts
{
  id: "patagonia-gallery",
  type: "gallery",
  images: [
    { src: "/images/stories/patagonia/01.jpg", alt: "Mountain view" },
    { src: "/images/stories/patagonia/02.jpg", alt: "Trail view" },
  ],
}
```

Story data references images explicitly. The app does not scan folders automatically.

## 5. Customize the text

Open:

```text
src/data/site.ts
```

Change the title, subtitle, and footer.

## 6. Customize the colors

Open:

```text
src/styles.css
```

Edit the variables at the top:

```css
:root {
  --paper: #fffaf2;
  --ink: #342d27;
  --muted: #8d7764;
  --lived: #7c4f37;
}
```

## 7. Build for production

```bash
npm run build
```

The final static files will be generated in:

```text
dist
```

## 8. Deploy option A: Vercel

1. Push this folder to a GitHub repo.
2. Go to Vercel.
3. Import your GitHub repo.
4. Click Deploy.

You do not need to change `vite.config.ts` for Vercel.

## 9. Deploy option B: GitHub Pages

This template already includes:

```text
.github/workflows/deploy.yml
```

Steps:

1. Push the project to GitHub.
2. Go to your repo Settings.
3. Open Pages.
4. Under Build and deployment, choose GitHub Actions.
5. Push to `main`.
6. GitHub Actions will build and deploy your site.

The `vite.config.ts` file automatically sets the right base path during GitHub Actions.

## Notes on photos and licensing

The code is MIT licensed. Your photos, essays, and personal writing do not need to be open-sourced unless you explicitly say so.

## License

MIT
