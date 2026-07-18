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
  | "chengdu"
  | "beijing"
  | "shanghai"
  | "seoul"
  | "tokyo"
  | "bali"
  | "antarctica"
  | "lima"
  | "newYork"
  | "bayArea"
  | "vancouver"
  | "iceland"
  | "default";

export type ImageSource = {
  type: "user" | "temporary-stock" | "placeholder";
  credit?: string;
  sourceUrl?: string;
};

export type StoryStatus = "draft" | "published";
export type StoryImageOrientation = "portrait" | "landscape" | "square";

export type StoryBlock =
  | {
      id: string;
      type: "text";
      body: string;
    }
  | {
      id: string;
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      orientation?: StoryImageOrientation;
    }
  | {
      id: string;
      type: "gallery";
      images: {
        src: string;
        alt: string;
        caption?: string;
        orientation?: StoryImageOrientation;
      }[];
      layout?: "grid" | "scroll" | "masonry";
    }
  | {
      id: string;
      type: "quote";
      body: string;
      attribution?: string;
    }
  | {
      id: string;
      type: "map";
      placeIds?: string[];
      routeId?: string;
      caption?: string;
    }
  | {
      id: string;
      type: "divider";
    };

export type Story = {
  slug: string;
  placeId: string;
  title: string;
  dek?: string;
  dateLabel?: string;
  locationLabel?: string;
  status: StoryStatus;
  featured?: boolean;
  coverImage?: string;
  coverAlt?: string;
  previewImage?: string;
  previewSummary?: string;
  imageSource?: ImageSource;
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
