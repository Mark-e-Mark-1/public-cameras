import type { Camera, Catalog, Category, CategoryId, Region, RegionId } from "./types";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const HTTPS = /^https:\/\//i;

let catalog: Catalog | null = null;

export async function loadCatalog(): Promise<Catalog> {
  if (catalog) return catalog;
  const res = await fetch("./catalog.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not load camera catalog");
  const data = (await res.json()) as Catalog;
  catalog = sanitizeCatalog(data);
  return catalog;
}

export function getCatalog(): Catalog {
  if (!catalog) throw new Error("Catalog not loaded");
  return catalog;
}

export function cameraById(id: string): Camera | undefined {
  return getCatalog().cameras.find((c) => c.id === id);
}

export function categoryLabel(id: CategoryId): string {
  return getCatalog().categories.find((c) => c.id === id)?.label ?? id;
}

export function regionLabel(id: RegionId): string {
  return getCatalog().regions.find((r) => r.id === id)?.label ?? id;
}

export function relatedCameras(cam: Camera, limit = 6): Camera[] {
  const all = getCatalog().cameras.filter((c) => c.id !== cam.id);
  const sameCat = all.filter((c) => c.category === cam.category);
  const sameRegion = all.filter((c) => c.region === cam.region && c.category !== cam.category);
  const rest = all.filter((c) => c.category !== cam.category && c.region !== cam.region);
  return [...sameCat, ...sameRegion, ...rest].slice(0, limit);
}

function sanitizeCatalog(data: Catalog): Catalog {
  const categories = (data.categories ?? []).filter((c): c is Category => Boolean(c.id && c.label));
  const regions = (data.regions ?? []).filter((r): r is Region => Boolean(r.id && r.label));
  const catIds = new Set(categories.map((c) => c.id));
  const regionIds = new Set(regions.map((r) => r.id));
  const seen = new Set<string>();

  const cameras = (data.cameras ?? []).filter((cam) => {
    if (!cam.id || seen.has(cam.id)) return false;
    if (!YT_ID.test(cam.youtubeId)) return false;
    if (!HTTPS.test(cam.sourceUrl)) return false;
    if (!catIds.has(cam.category) || !regionIds.has(cam.region)) return false;
    if (!cam.name || !cam.place || !cam.sourceName) return false;
    seen.add(cam.id);
    return true;
  });

  return {
    updated: data.updated,
    inclusionCriteria: data.inclusionCriteria ?? [],
    categories,
    regions,
    cameras,
  };
}
