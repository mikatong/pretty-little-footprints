export type PlaceCategory = "lived" | "worked" | "stayed" | "visited" | "still-mapping";

export type Place = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  year: string;
  note: string;
  photo?: string;
  labelPosition?: "top" | "right" | "bottom" | "left";
  labelOffset?: [number, number];
  links?: {
    label: string;
    url: string;
  }[];
};

export type CategoryFilter = "all" | PlaceCategory;
