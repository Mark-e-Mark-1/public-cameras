export type CategoryId =
  | "cities"
  | "nature"
  | "beaches"
  | "landmarks"
  | "weather"
  | "transit"
  | "wildlife";

export type RegionId =
  | "north-america"
  | "europe"
  | "asia"
  | "africa"
  | "south-america"
  | "oceania"
  | "middle-east"
  | "space";

export type SortId = "featured" | "az";

export interface Category {
  id: CategoryId;
  label: string;
}

export interface Region {
  id: RegionId;
  label: string;
}

export interface Camera {
  id: string;
  name: string;
  place: string;
  region: RegionId;
  category: CategoryId;
  featured: boolean;
  blurb: string;
  youtubeId: string;
  sourceName: string;
  sourceUrl: string;
}

export interface Catalog {
  updated: string;
  inclusionCriteria: string[];
  categories: Category[];
  regions: Region[];
  cameras: Camera[];
}

export interface Route {
  view: "grid" | "detail";
  cameraId?: string;
  category?: CategoryId | "all";
  favoritesOnly: boolean;
  query: string;
  region: RegionId | "all";
  sort: SortId;
}

export interface Filters {
  category: CategoryId | "all";
  region: RegionId | "all";
  sort: SortId;
  query: string;
  favoritesOnly: boolean;
}
