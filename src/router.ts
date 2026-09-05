import type { CategoryId, RegionId, Route, SortId } from "./types";

const CATEGORIES = new Set<CategoryId>([
  "cities",
  "nature",
  "beaches",
  "landmarks",
  "weather",
  "transit",
  "wildlife",
]);

const REGIONS = new Set<RegionId>([
  "north-america",
  "europe",
  "asia",
  "africa",
  "south-america",
  "oceania",
  "middle-east",
  "space",
]);

function asCategory(value: string | null): CategoryId | "all" {
  if (value && CATEGORIES.has(value as CategoryId)) return value as CategoryId;
  return "all";
}

function asRegion(value: string | null): RegionId | "all" {
  if (value && REGIONS.has(value as RegionId)) return value as RegionId;
  return "all";
}

function asSort(value: string | null): SortId {
  return value === "az" ? "az" : "featured";
}

export function parseRoute(): Route {
  const hash = location.hash.replace(/^#/, "");
  const [rawPath, rawQuery] = hash.split("?");
  const path = (rawPath || location.pathname).replace(/^\/+/, "");
  const params = new URLSearchParams(rawQuery || location.search.replace(/^\?/, ""));

  const parts = path.split("/").filter(Boolean);
  const favoritesOnly = params.get("fav") === "1" || params.get("favorites") === "1";
  const query = params.get("q") ?? "";
  const region = asRegion(params.get("region"));
  const sort = asSort(params.get("sort"));

  if (parts[0] === "cam" && parts[1]) {
    return {
      view: "detail",
      cameraId: decodeURIComponent(parts[1]),
      category: asCategory(params.get("category")),
      favoritesOnly,
      query,
      region,
      sort,
    };
  }

  const category = parts[0] === "category" ? asCategory(parts[1] ?? null) : asCategory(params.get("category"));
  return {
    view: "grid",
    category,
    favoritesOnly,
    query,
    region,
    sort,
  };
}

export function hrefFor(partial: Partial<Route> & { view?: Route["view"] }): string {
  const current = parseRoute();
  const next: Route = { ...current, ...partial };
  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.region !== "all") params.set("region", next.region);
  if (next.sort !== "featured") params.set("sort", next.sort);
  if (next.favoritesOnly) params.set("fav", "1");
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";

  if (next.view === "detail" && next.cameraId) {
    return `#/cam/${encodeURIComponent(next.cameraId)}${suffix}`;
  }
  if (next.category && next.category !== "all") {
    return `#/category/${encodeURIComponent(next.category)}${suffix}`;
  }
  return `#/${suffix}`;
}

export function navigate(partial: Partial<Route>): void {
  const href = hrefFor(partial);
  if (location.hash === href.slice(1) || location.hash === href) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  location.hash = href.slice(1);
}

export function onRouteChange(fn: () => void): void {
  window.addEventListener("hashchange", fn);
  window.addEventListener("popstate", fn);
}
