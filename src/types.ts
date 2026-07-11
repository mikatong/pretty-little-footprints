export type PlaceCategory = "lived" | "travel";

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
  mapPoints?: MapPoint[];
  links?: {
    label: string;
    url: string;
  }[];
};

export type CategoryFilter = "all" | PlaceCategory;
