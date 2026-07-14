export type PlaceCategory = "lived" | "travel";

export type MapIconType =
  | "home"
  | "city"
  | "academic"
  | "temple"
  | "palace"
  | "pagoda"
  | "tower"
  | "bridge"
  | "mountain"
  | "fitzRoy"
  | "machuPicchu"
  | "iceberg"
  | "snow"
  | "forest"
  | "cypress"
  | "coast"
  | "tropical"
  | "palm"
  | "splitGate"
  | "desert"
  | "cactus"
  | "waterfall"
  | "eiffel"
  | "bigBen"
  | "cnTower"
  | "spaceNeedle"
  | "neon"
  | "landmark"
  | "default";

export type ImageSource = {
  type: "user" | "temporary-stock";
  credit?: string;
  sourceUrl?: string;
};

export type StoryBlock =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      alt?: string;
      caption?: string;
    }
  | {
      id: string;
      type: "gallery";
      images: {
        src: string;
        alt?: string;
        caption?: string;
      }[];
    }
  | {
      id: string;
      type: "quote";
      content: string;
    }
  | {
      id: string;
      type: "divider";
    };

export type Story = {
  slug: string;
  title?: string;
  summary?: string;
  blocks: StoryBlock[];
  relatedEntryIds?: string[];
  relatedPlaceIds?: string[];
};

export type MapPoint = {
  id: string;
  name: string;
  country: string;
  lat?: number;
  lng?: number;
};

export type Place = {
  id: string;
  name: string;
  country: string;
  lat?: number;
  lng?: number;
  category: PlaceCategory;
  dateLabel: string;
  startDate: string;
  endDate?: string;
  year: string;
  note: string;
  hasStory: boolean;
  featured: boolean;
  hasGuide: boolean;
  story?: Story;
  photo?: string;
  imageSource?: ImageSource;
  mapIconType?: MapIconType;
  mapPoints?: MapPoint[];
  links?: {
    label: string;
    url: string;
  }[];
};

export type CategoryFilter = "all" | PlaceCategory;
