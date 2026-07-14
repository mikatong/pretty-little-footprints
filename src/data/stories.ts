import type { Story } from "../types";

export const stories: Story[] = [
  {
    slug: "west-vancouver",
    placeId: "west-vancouver",
    title: "West Vancouver",
    status: "published",
    previewSummary: "Where everything unfamiliar slowly became normal.",
    blocks: [{ id: "west-vancouver-text", type: "text", body: "Where everything unfamiliar slowly became normal." }],
  },
  {
    slug: "waterloo",
    placeId: "waterloo",
    title: "Waterloo",
    status: "published",
    previewSummary: "Where curiosity became a habit.",
    blocks: [{ id: "waterloo-text", type: "text", body: "Where curiosity became a habit." }],
  },
  {
    slug: "ann-arbor",
    placeId: "ann-arbor",
    title: "Ann Arbor",
    status: "published",
    previewSummary: "Two years of statistics, quiet libraries, and new beginnings.",
    blocks: [{ id: "ann-arbor-text", type: "text", body: "Two years of statistics, quiet libraries, and new beginnings." }],
  },
  {
    slug: "mountain-view",
    placeId: "mountain-view",
    title: "Mountain View",
    status: "published",
    previewSummary: "Where research became everyday life.",
    blocks: [{ id: "mountain-view-text", type: "text", body: "Where research became everyday life." }],
  },
  {
    slug: "iceland",
    placeId: "iceland",
    title: "Iceland",
    status: "published",
    featured: true,
    previewSummary: "Cold air, long roads, and landscapes that hardly felt real.",
    blocks: [{ id: "iceland-text", type: "text", body: "Cold air, long roads, and landscapes that hardly felt real." }],
  },
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
      },
    ],
  },
  {
    slug: "big-sur",
    placeId: "big-sur",
    title: "Big Sur",
    status: "published",
    previewSummary: "One coastline I'll never get tired of.",
    blocks: [{ id: "big-sur-text", type: "text", body: "One coastline I'll never get tired of." }],
  },
  {
    slug: "patagonia",
    placeId: "patagonia",
    title: "Patagonia",
    status: "published",
    featured: true,
    previewSummary: "A place that rewards slowing down.",
    blocks: [{ id: "patagonia-text", type: "text", body: "A place that rewards slowing down." }],
  },
  {
    slug: "antarctica",
    placeId: "antarctica-expedition",
    title: "Antarctica Expedition",
    status: "published",
    featured: true,
    previewSummary: "Where silence feels different.",
    blocks: [{ id: "antarctica-text", type: "text", body: "Where silence feels different." }],
  },
  {
    slug: "peru",
    placeId: "peru-journey",
    title: "Peru Journey",
    status: "published",
    featured: true,
    previewSummary: "History, mountains, and mornings above the clouds.",
    blocks: [{ id: "peru-text", type: "text", body: "History, mountains, and mornings above the clouds." }],
  },
  {
    slug: "canggu",
    placeId: "canggu",
    title: "Canggu",
    status: "published",
    featured: true,
    previewSummary: "Days built around coffee, movement, and the ocean.",
    blocks: [{ id: "canggu-text", type: "text", body: "Days built around coffee, movement, and the ocean." }],
  },
  {
    slug: "chengdu",
    placeId: "chengdu-2026",
    title: "Chengdu",
    status: "draft",
    blocks: [],
  },
];

export const storiesByPlaceId = new Map(stories.map((story) => [story.placeId, story]));
export const storiesBySlug = new Map(stories.map((story) => [story.slug, story]));

/*
How to add examples:

Photo caption:
{
  slug: "beijing",
  placeId: "beijing-2025",
  title: "Beijing",
  status: "published",
  coverImage: "/images/stories/beijing/cover.jpg",
  coverAlt: "Portrait beside a red palace wall in Beijing",
  blocks: [{ id: "beijing-cover", type: "image", src: "/images/stories/beijing/cover.jpg", alt: "Portrait beside a red palace wall in Beijing", orientation: "portrait", caption: "" }]
}

Small essay:
{
  slug: "canggu",
  placeId: "canggu",
  title: "Canggu",
  status: "published",
  blocks: [{ id: "canggu-note", type: "text", body: `First paragraph.

Second paragraph.` }]
}

Draft:
{
  slug: "chengdu",
  placeId: "chengdu-2026",
  title: "Chengdu",
  status: "draft",
  blocks: []
}
*/
