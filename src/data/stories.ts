import type { Story } from "../types";

export const stories: Story[] = [
  {
    slug: "west-vancouver",
    placeId: "west-vancouver",
    title: "West Vancouver",
    status: "published",
    previewSummary: "Where everything unfamiliar slowly became normal.",
    blocks: [
      {
        id: "west-vancouver-text",
        type: "text",
        body: "Where everything unfamiliar slowly became normal."
      }
    ]
  },
  {
    slug: "waterloo",
    placeId: "waterloo",
    title: "Waterloo",
    status: "published",
    previewSummary: "Where curiosity became a habit.",
    blocks: [
      {
        id: "waterloo-text",
        type: "text",
        body: "Where curiosity became a habit."
      }
    ]
  },
  {
    slug: "ann-arbor",
    placeId: "ann-arbor",
    title: "Ann Arbor",
    status: "published",
    previewSummary: "Two years of statistics, quiet libraries, and new beginnings.",
    blocks: [
      {
        id: "ann-arbor-text",
        type: "text",
        body: "Two years of statistics, quiet libraries, and new beginnings."
      }
    ]
  },
  {
    slug: "mountain-view",
    placeId: "mountain-view",
    title: "Mountain View",
    status: "published",
    previewSummary: "Where research became everyday life.",
    blocks: [
      {
        id: "mountain-view-text",
        type: "text",
        body: "Where research became everyday life."
      }
    ]
  },
  {
    slug: "iceland",
    placeId: "iceland",
    title: "Iceland",
    status: "published",
    featured: true,
    previewSummary: "Cold air, long roads, and landscapes that hardly felt real.",
    blocks: [
      {
        id: "iceland-text",
        type: "text",
        body: "Cold air, long roads, and landscapes that hardly felt real."
      }
    ]
  },
  {
    slug: "beijing",
    placeId: "beijing-2025",
    title: "Beijing",
    status: "published",
    coverImage: "/images/stories/beijing/cover.jpg",
    coverAlt: "Portrait by a red palace wall in Beijing",
    previewImage: "/images/stories/beijing/cover.jpg",
    imageSource: {
      type: "user"
    },
    blocks: [
      {
        id: "beijing-cover",
        type: "image",
        src: "/images/stories/beijing/cover.jpg",
        alt: "Portrait by a red palace wall in Beijing",
        orientation: "portrait"
      }
    ]
  },
  {
    slug: "big-sur",
    placeId: "big-sur",
    title: "Big Sur",
    status: "published",
    previewSummary: "One coastline I'll never get tired of.",
    blocks: [
      {
        id: "big-sur-text",
        type: "text",
        body: "One coastline I'll never get tired of."
      }
    ]
  },
  {
    slug: "patagonia",
    placeId: "patagonia",
    title: "Patagonia",
    status: "published",
    featured: true,
    previewSummary: "A place that rewards slowing down.",
    blocks: [
      {
        id: "patagonia-text",
        type: "text",
        body: "A place that rewards slowing down."
      }
    ]
  },
  {
    slug: "antarctica",
    placeId: "antarctica-expedition",
    title: "Antarctica Expedition",
    status: "published",
    featured: true,
    previewSummary: "Where silence feels different.",
    blocks: [
      {
        id: "antarctica-text",
        type: "text",
        body: "Where silence feels different."
      }
    ]
  },
  {
    slug: "peru",
    placeId: "peru-journey",
    title: "Peru Journey",
    status: "published",
    featured: true,
    previewSummary: "History, mountains, and mornings above the clouds.",
    blocks: [
      {
        id: "peru-text",
        type: "text",
        body: "History, mountains, and mornings above the clouds."
      }
    ]
  },
  {
    slug: "canggu",
    placeId: "canggu",
    title: "Canggu",
    status: "published",
    featured: true,
    previewSummary: "Days built around coffee, movement, and the ocean.",
    blocks: [
      {
        id: "canggu-text",
        type: "text",
        body: "Days built around coffee, movement, and the ocean."
      }
    ]
  },
  {
    slug: "chengdu",
    placeId: "chengdu-2026",
    title: "Chengdu",
    status: "published",
    blocks: [
      {
        id: "chengdu-text",
        type: "text",
        body: "Feels so good to be home"
      },
      {
        id: "chengdu-gallery",
        type: "gallery",
        images: [
          {
            src: "/images/stories/chengdu/01.jpeg",
            alt: "Chengdu photo"
          },
          {
            src: "/images/stories/chengdu/02.jpeg",
            alt: "Chengdu photo"
          },
          {
            src: "/images/stories/chengdu/03.jpeg",
            alt: "Chengdu photo"
          }
        ],
        layout: "grid"
      }
    ],
    previewSummary: "home home 🩵🏡",
    coverImage: "/images/stories/chengdu/cover.jpeg",
    previewImage: "/images/stories/chengdu/cover.jpeg",
    imageSource: {
      type: "user"
    }
  },
  {
    slug: "surrey",
    placeId: "surrey",
    title: "Surrey",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "richmond",
    placeId: "richmond",
    title: "Richmond",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "north-vancouver",
    placeId: "north-vancouver",
    title: "North Vancouver",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "cypress-mountain",
    placeId: "cypress-mountain",
    title: "Cypress Mountain",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "victoria",
    placeId: "victoria",
    title: "Victoria",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "burnaby",
    placeId: "burnaby",
    title: "Burnaby",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "toronto-2017",
    placeId: "toronto-2017",
    title: "Toronto",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "uk-winter-trip",
    placeId: "uk-winter-trip",
    title: "UK Winter Trip",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "china-trip-2018",
    placeId: "china-trip-2018",
    title: "China Trip 2018",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "montreal-2018",
    placeId: "montreal-2018",
    title: "Montreal",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "niagara",
    placeId: "niagara",
    title: "Niagara",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "montreal-2019",
    placeId: "montreal-2019",
    title: "Montreal",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "ottawa",
    placeId: "ottawa",
    title: "Ottawa",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "algonquin",
    placeId: "algonquin",
    title: "Algonquin",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "vancouver-2019",
    placeId: "vancouver-2019",
    title: "Vancouver",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "mississauga",
    placeId: "mississauga",
    title: "Mississauga",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "richmond-hill",
    placeId: "richmond-hill",
    title: "Richmond Hill",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "markham",
    placeId: "markham",
    title: "Markham",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "new-york-2021",
    placeId: "new-york-2021",
    title: "New York",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "minnesota",
    placeId: "minnesota",
    title: "Minnesota",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "miami-2021",
    placeId: "miami-2021",
    title: "Miami",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "key-west-2021",
    placeId: "key-west-2021",
    title: "Key West",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "chicago-2021",
    placeId: "chicago-2021",
    title: "Chicago",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "ohio",
    placeId: "ohio",
    title: "Ohio",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "orlando",
    placeId: "orlando",
    title: "Orlando",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "disney-world",
    placeId: "disney-world",
    title: "Disney World",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "universal-orlando",
    placeId: "universal-orlando",
    title: "Universal Orlando",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "tampa",
    placeId: "tampa",
    title: "Tampa",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "lansing",
    placeId: "lansing",
    title: "Lansing",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "waterloo-2022",
    placeId: "waterloo-2022",
    title: "Waterloo",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "banff",
    placeId: "banff",
    title: "Banff",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "toronto-2022",
    placeId: "toronto-2022",
    title: "Toronto",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "mcmaster-hamilton",
    placeId: "mcmaster-hamilton",
    title: "McMaster / Hamilton",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "new-york-2022",
    placeId: "new-york-2022",
    title: "New York",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "washington-dc",
    placeId: "washington-dc",
    title: "Washington, DC",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "boston",
    placeId: "boston",
    title: "Boston",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "southwest-road-trip",
    placeId: "southwest-road-trip",
    title: "Southwest Road Trip",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "cancun",
    placeId: "cancun",
    title: "Cancun",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "china-trip-2023",
    placeId: "china-trip-2023",
    title: "China Trip 2023",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "lake-tahoe",
    placeId: "lake-tahoe",
    title: "Lake Tahoe",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "france",
    placeId: "france",
    title: "France",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "santa-cruz-2023",
    placeId: "santa-cruz-2023",
    title: "Santa Cruz",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "punta-cana",
    placeId: "punta-cana",
    title: "Punta Cana",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "new-york-2023",
    placeId: "new-york-2023",
    title: "New York",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "san-francisco-2023",
    placeId: "san-francisco-2023",
    title: "San Francisco",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "los-angeles-2023",
    placeId: "los-angeles-2023",
    title: "Los Angeles",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "antioch",
    placeId: "antioch",
    title: "Antioch",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "mount-tamalpais",
    placeId: "mount-tamalpais",
    title: "Mount Tamalpais",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "point-lobos",
    placeId: "point-lobos",
    title: "Point Lobos",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "seattle-2024",
    placeId: "seattle-2024",
    title: "Seattle",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "phoenix-2024",
    placeId: "phoenix-2024",
    title: "Phoenix",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "toronto-2024",
    placeId: "toronto-2024",
    title: "Toronto",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "carmel",
    placeId: "carmel",
    title: "Carmel",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "los-angeles-2024",
    placeId: "los-angeles-2024",
    title: "Los Angeles",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "new-mexico",
    placeId: "new-mexico",
    title: "New Mexico",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "santa-barbara",
    placeId: "santa-barbara",
    title: "Santa Barbara",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "los-cabos",
    placeId: "los-cabos",
    title: "Los Cabos",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "san-diego-2025",
    placeId: "san-diego-2025",
    title: "San Diego",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "los-angeles-2025",
    placeId: "los-angeles-2025",
    title: "Los Angeles",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "napa",
    placeId: "napa",
    title: "Napa",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "carmel-valley",
    placeId: "carmel-valley",
    title: "Carmel Valley",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "pebble-beach",
    placeId: "pebble-beach",
    title: "Pebble Beach",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "miami-2025",
    placeId: "miami-2025",
    title: "Miami",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "key-west-2025",
    placeId: "key-west-2025",
    title: "Key West",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "seattle-2025",
    placeId: "seattle-2025",
    title: "Seattle",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "chicago-2025",
    placeId: "chicago-2025",
    title: "Chicago",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "las-vegas-2025",
    placeId: "las-vegas-2025",
    title: "Las Vegas",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "hawaii-august-2025",
    placeId: "hawaii-august-2025",
    title: "Hawaii August 2025",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "yosemite",
    placeId: "yosemite",
    title: "Yosemite",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "page-2025",
    placeId: "page-2025",
    title: "Page",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "miraval-arizona",
    placeId: "miraval-arizona",
    title: "Miraval, Arizona",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "chengdu-2025",
    placeId: "chengdu-2025",
    title: "Chengdu",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "taiyuan-2025",
    placeId: "taiyuan-2025",
    title: "Taiyuan",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "roseville",
    placeId: "roseville",
    title: "Roseville",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "hawaii-december-2025",
    placeId: "hawaii-december-2025",
    title: "Hawaii December 2025",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "los-angeles-disney",
    placeId: "los-angeles-disney",
    title: "Los Angeles / Disney",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "santa-cruz-redwoods",
    placeId: "santa-cruz-redwoods",
    title: "Santa Cruz / Redwoods",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "palm-springs-joshua-tree",
    placeId: "palm-springs-joshua-tree",
    title: "Palm Springs / Joshua Tree",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "phoenix-2026",
    placeId: "phoenix-2026",
    title: "Phoenix",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "dali-2026",
    placeId: "dali-2026",
    title: "Dali",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "seoul",
    placeId: "seoul",
    title: "Seoul",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "tokyo-2026",
    placeId: "tokyo-2026",
    title: "Tokyo",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "shanghai",
    placeId: "shanghai",
    title: "Shanghai",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "zhongshan-2026",
    placeId: "zhongshan-2026",
    title: "Zhongshan",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "shenzhen-2026",
    placeId: "shenzhen-2026",
    title: "Shenzhen",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "beijing-2026",
    placeId: "beijing-2026",
    title: "Beijing",
    status: "draft",
    featured: false,
    blocks: []
  },
  {
    slug: "taiyuan-2026",
    placeId: "taiyuan-2026",
    title: "Taiyuan",
    status: "draft",
    featured: false,
    blocks: []
  },
];

export const storiesByPlaceId = new Map(stories.map((story) => [story.placeId, story]));
export const storiesBySlug = new Map(stories.map((story) => [story.slug, story]));
