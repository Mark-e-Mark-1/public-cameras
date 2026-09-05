import { cameraById, categoryLabel, getCatalog, regionLabel, relatedCameras } from "./catalog";
import { createYouTubeIframe, posterFallbackUrl, posterUrl, watchUrl } from "./embed";
import { isFavorite, listFavorites, toggleFavorite } from "./favorites";
import { hrefFor, navigate, parseRoute } from "./router";
import { bindGridLivePlayers, prefersReducedMotion } from "./slots";
import { getTheme, toggleTheme } from "./theme";
import type { Camera, CategoryId, Route } from "./types";

let cleanupLive: (() => void) | null = null;
let sheetOpen = false;
let restoreSearch = false;
let searchCaret = 0;

export function renderApp(root: HTMLElement): void {
  cleanupLive?.();
  cleanupLive = null;
  const route = parseRoute();
  root.innerHTML = "";
  root.append(renderHeader(route), renderMain(route), renderFooter());
  bindHeader(root);
  if (route.view === "detail") bindDetail(root, route);
  else {
    bindGrid(root);
    cleanupLive = attachLivePlayers(root);
  }
  if (restoreSearch) {
    const input = root.querySelector<HTMLInputElement>("#q");
    input?.focus();
    input?.setSelectionRange(searchCaret, searchCaret);
    restoreSearch = false;
  }
}

function renderHeader(route: Route): HTMLElement {
  const header = el("header", "topbar");
  header.innerHTML = `
    <div class="topbar-inner">
      <a class="brand" href="${hrefFor({ view: "grid", cameraId: undefined, favoritesOnly: false, category: "all", query: "", region: "all", sort: "featured" })}">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-copy">
          <span class="brand-title">Public Cameras</span>
          <span class="brand-sub">Live, curated, official</span>
        </span>
      </a>
      <form class="search" role="search">
        <label class="sr-only" for="q">Search cameras</label>
        <input id="q" name="q" type="search" placeholder="Search place or name" value="${escapeAttr(route.query)}" autocomplete="off" />
      </form>
      <div class="top-actions">
        <a class="chip-btn ${route.favoritesOnly ? "is-on" : ""}" href="${hrefFor({ view: "grid", favoritesOnly: !route.favoritesOnly, cameraId: undefined })}">
          ${heartSvg(route.favoritesOnly)} Favorites
        </a>
        <button type="button" class="icon-btn theme-btn" aria-label="Toggle theme">${themeIcon()}</button>
      </div>
    </div>
  `;
  return header;
}

function renderMain(route: Route): HTMLElement {
  const main = el("main", "main");
  main.id = "main";
  if (route.view === "detail") {
    const cam = route.cameraId ? cameraById(route.cameraId) : undefined;
    main.append(cam ? renderDetail(cam) : renderMissing());
  } else {
    main.append(renderGrid(route));
  }
  return main;
}

function renderFooter(): HTMLElement {
  const footer = el("footer", "site-footer");
  footer.innerHTML = `
    <p>Only official public HTTPS YouTube Live embeds. No IP cameras, RTSP, or private feeds. Video plays on YouTube — we do not proxy it.</p>
  `;
  return footer;
}

function renderGrid(route: Route): HTMLElement {
  const catalog = getCatalog();
  const matches = filterCameras(route);
  const featured = !route.favoritesOnly && route.category === "all" && !route.query && route.region === "all"
    ? catalog.cameras.filter((c) => c.featured)
    : [];
  const featuredIds = new Set(featured.map((c) => c.id));
  const cams = matches.filter((c) => !featuredIds.has(c.id));

  const wrap = el("div", "grid-page");
  wrap.innerHTML = `
    <section class="filters desktop-filters" aria-label="Filters">
      ${filterControls(route)}
    </section>
    ${featured.length ? `
      <section class="featured" aria-label="Editors’ picks">
        <div class="section-head">
          <h2>Editors’ picks</h2>
          <p>Three live views worth opening first.</p>
        </div>
        <div class="featured-row">
          ${featured.map((cam) => cardHtml(cam, true)).join("")}
        </div>
      </section>
    ` : ""}
    <section class="results" aria-live="polite">
      <div class="section-head">
        <h2>${resultsTitle(route, matches.length)}</h2>
        <p>${route.favoritesOnly ? "Saved on this device only." : "Muted in the grid. Open a camera to go fullscreen."}</p>
      </div>
      ${cams.length ? `<div class="cam-grid">${cams.map((cam) => cardHtml(cam, false)).join("")}</div>` : emptyHtml(route)}
    </section>
    <button type="button" class="filters-fab" aria-haspopup="dialog" aria-expanded="false">
      Filters${activeFilterCount(route) ? `<span class="fab-count">${activeFilterCount(route)}</span>` : ""}
    </button>
    <div class="sheet" hidden>
      <div class="sheet-backdrop" data-close-sheet></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="Filters">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-head">
          <h2>Filters</h2>
          <button type="button" class="icon-btn" data-close-sheet aria-label="Close filters">✕</button>
        </div>
        ${filterControls(route)}
      </div>
    </div>
  `;
  return wrap;
}

function filterControls(route: Route): string {
  const catalog = getCatalog();
  return `
    <div class="filter-block">
      <p class="filter-label">Category</p>
      <div class="chip-row">
        <a class="chip ${route.category === "all" ? "is-on" : ""}" href="${hrefFor({ view: "grid", category: "all", cameraId: undefined })}">All</a>
        ${catalog.categories.map((cat) => `
          <a class="chip ${route.category === cat.id ? "is-on" : ""}" href="${hrefFor({ view: "grid", category: cat.id, cameraId: undefined })}">${cat.label}</a>
        `).join("")}
      </div>
    </div>
    <div class="filter-row">
      <label class="select-wrap">
        <span>Region</span>
        <select name="region" data-filter="region">
          <option value="all" ${route.region === "all" ? "selected" : ""}>All regions</option>
          ${catalog.regions.map((r) => `<option value="${r.id}" ${route.region === r.id ? "selected" : ""}>${r.label}</option>`).join("")}
        </select>
      </label>
      <label class="select-wrap">
        <span>Sort</span>
        <select name="sort" data-filter="sort">
          <option value="featured" ${route.sort === "featured" ? "selected" : ""}>Featured</option>
          <option value="az" ${route.sort === "az" ? "selected" : ""}>A–Z</option>
        </select>
      </label>
    </div>
  `;
}

function cardHtml(cam: Camera, featured: boolean): string {
  const fav = isFavorite(cam.id);
  const href = hrefFor({ view: "detail", cameraId: cam.id });
  return `
    <article class="cam-card ${featured ? "is-featured" : ""}" data-cam-card data-cam-id="${escapeAttr(cam.id)}" data-yt="${escapeAttr(cam.youtubeId)}">
      <a class="cam-hit" href="${href}" aria-label="${escapeAttr(`${cam.name}, ${cam.place}, ${categoryLabel(cam.category)}, live camera`)}">
        <div class="cam-media">
          <img class="cam-poster" src="${posterUrl(cam.youtubeId)}" alt="" loading="lazy" data-fallback="${posterFallbackUrl(cam.youtubeId)}" />
          <div class="cam-player" hidden></div>
          <span class="live-badge">LIVE</span>
        </div>
        <div class="cam-meta">
          <h3>${escapeHtml(cam.name)}</h3>
          <p>${escapeHtml(cam.place)}</p>
          <span class="cat-chip">${escapeHtml(categoryLabel(cam.category))}</span>
        </div>
      </a>
      <button type="button" class="fav-btn ${fav ? "is-on" : ""}" data-fav="${escapeAttr(cam.id)}" aria-pressed="${fav}" aria-label="${fav ? "Remove from favorites" : "Add to favorites"}: ${escapeAttr(cam.name)}">
        ${heartSvg(fav)}
      </button>
    </article>
  `;
}

function renderDetail(cam: Camera): HTMLElement {
  const fav = isFavorite(cam.id);
  const related = relatedCameras(cam);
  const reduced = prefersReducedMotion();
  const section = el("article", "detail");
  section.innerHTML = `
    <a class="back-link" href="${hrefFor({ view: "grid", cameraId: undefined })}">← All cameras</a>
    <div class="player-stage" data-player-stage>
      <div class="player-frame" data-player-frame>
        <img class="detail-poster" src="${posterUrl(cam.youtubeId)}" alt="" data-fallback="${posterFallbackUrl(cam.youtubeId)}" />
        <div class="player-host" data-player-host></div>
        <div class="player-fallback" hidden>
          <p>This embed isn’t available right now.</p>
          <a class="btn primary" href="${watchUrl(cam.youtubeId)}" target="_blank" rel="noopener noreferrer">Open on source</a>
        </div>
      </div>
      <div class="player-toolbar">
        <button type="button" class="chip-btn" data-fullscreen>Fullscreen</button>
        <button type="button" class="chip-btn ${fav ? "is-on" : ""}" data-fav="${escapeAttr(cam.id)}" aria-pressed="${fav}">
          ${heartSvg(fav)} Favorite
        </button>
        <button type="button" class="chip-btn" data-share>Share</button>
      </div>
    </div>
    <header class="detail-head">
      <p class="eyebrow">${escapeHtml(categoryLabel(cam.category))} · ${escapeHtml(regionLabel(cam.region))}</p>
      <h1>${escapeHtml(cam.name)}</h1>
      <p class="place">${escapeHtml(cam.place)}</p>
      <p class="blurb">${escapeHtml(cam.blurb)}</p>
      <p class="attribution">
        Source: <a href="${escapeAttr(cam.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cam.sourceName)}</a>
        · <a href="${watchUrl(cam.youtubeId)}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
      </p>
      ${reduced ? `<p class="note">Reduced motion is on, so this page starts on a still poster. Press play in the player if you want live video.</p>` : ""}
    </header>
    <section class="related">
      <h2>Related cameras</h2>
      <div class="cam-grid related-grid">${related.map((c) => cardHtml(c, false)).join("")}</div>
    </section>
  `;
  return section;
}

function renderMissing(): HTMLElement {
  const box = el("div", "empty");
  box.innerHTML = `
    <h1>Camera not found</h1>
    <p>That link doesn’t match a camera in the catalog.</p>
    <a class="btn primary" href="${hrefFor({ view: "grid", cameraId: undefined })}">Back to the grid</a>
  `;
  return box;
}

function emptyHtml(route: Route): string {
  if (route.favoritesOnly) {
    return `<div class="empty"><h3>No favorites yet</h3><p>Tap the heart on a camera to save it on this phone or computer.</p></div>`;
  }
  const bits: string[] = [];
  if (route.query) bits.push(`“${escapeHtml(route.query)}”`);
  if (route.category && route.category !== "all") bits.push(categoryLabel(route.category));
  if (route.region && route.region !== "all") bits.push(regionLabel(route.region));
  const detail = bits.length ? ` for ${bits.join(" · ")}` : "";
  return `<div class="empty">
    <h3>No cameras match${detail}</h3>
    <p>Try another search, or reset filters.</p>
    <a class="btn primary" href="${hrefFor({ view: "grid", query: route.query, category: "all", region: "all", sort: "featured", cameraId: undefined, favoritesOnly: false })}">Search all cameras</a>
  </div>`;
}

function bindHeader(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>(".search");
  const input = root.querySelector<HTMLInputElement>("#q");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    navigate({ view: "grid", query: input?.value.trim() ?? "", cameraId: undefined });
  });
  let timer = 0;
  input?.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      restoreSearch = true;
      searchCaret = input.selectionStart ?? input.value.length;
      navigate({ view: "grid", query: input.value.trim(), cameraId: undefined });
    }, 220);
  });
  root.querySelector(".theme-btn")?.addEventListener("click", () => {
    toggleTheme();
    const btn = root.querySelector(".theme-btn");
    if (btn) btn.innerHTML = themeIcon();
  });
  bindFavButtons(root);
  bindPosterFallbacks(root);
}

function bindGrid(root: HTMLElement): void {
  root.querySelectorAll<HTMLSelectElement>("[data-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      if (select.dataset.filter === "region") {
        navigate({ view: "grid", region: select.value as Route["region"], cameraId: undefined });
      } else {
        navigate({ view: "grid", sort: select.value === "az" ? "az" : "featured", cameraId: undefined });
      }
    });
  });

  const fab = root.querySelector<HTMLButtonElement>(".filters-fab");
  const sheet = root.querySelector<HTMLElement>(".sheet");
  const openSheet = () => {
    sheetOpen = true;
    sheet?.removeAttribute("hidden");
    fab?.setAttribute("aria-expanded", "true");
    document.body.classList.add("sheet-open");
  };
  const closeSheet = () => {
    sheetOpen = false;
    sheet?.setAttribute("hidden", "");
    fab?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("sheet-open");
  };
  fab?.addEventListener("click", () => (sheetOpen ? closeSheet() : openSheet()));
  sheet?.querySelectorAll("[data-close-sheet]").forEach((node) => node.addEventListener("click", closeSheet));
  if (sheetOpen) openSheet();

  root.querySelectorAll(".sheet .chip").forEach((link) => {
    link.addEventListener("click", () => {
      sheetOpen = false;
    });
  });
}

function bindDetail(root: HTMLElement, route: Route): void {
  const cam = route.cameraId ? cameraById(route.cameraId) : undefined;
  if (!cam) return;
  const host = root.querySelector<HTMLElement>("[data-player-host]");
  const fallback = root.querySelector<HTMLElement>(".player-fallback");
  const stage = root.querySelector<HTMLElement>("[data-player-stage]");
  const frame = root.querySelector<HTMLElement>("[data-player-frame]");
  if (!host || !frame) return;

  const iframe = createYouTubeIframe(cam.youtubeId, `${cam.name} live camera`, {
    autoplay: !prefersReducedMotion(),
    mute: true,
    controls: true,
  });
  if (iframe) {
    host.append(iframe);
    iframe.addEventListener("error", () => {
      iframe.remove();
      fallback?.removeAttribute("hidden");
    });
  } else {
    fallback?.removeAttribute("hidden");
  }

  root.querySelector("[data-fullscreen]")?.addEventListener("click", async () => {
    if (!document.fullscreenElement) {
      try {
        await frame.requestFullscreen();
      } catch {
        await stage?.requestFullscreen().catch(() => undefined);
      }
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
  });

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (document.fullscreenElement) {
      event.preventDefault();
      document.exitFullscreen().catch(() => undefined);
    }
  };
  document.addEventListener("keydown", onKey);

  root.querySelector("[data-share]")?.addEventListener("click", async (event) => {
    const url = `${location.origin}${location.pathname}${hrefFor({
      view: "detail",
      cameraId: cam.id,
      favoritesOnly: false,
      query: "",
      category: "all",
      region: "all",
      sort: "featured",
    })}`;
    const btn = event.currentTarget as HTMLButtonElement;
    const reset = () => {
      window.setTimeout(() => {
        btn.textContent = "Share";
      }, 1800);
    };
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "Link copied";
    } catch {
      btn.textContent = "Copy failed";
    }
    reset();
    if (navigator.share) {
      navigator.share({ title: cam.name, text: `${cam.name} — ${cam.place}`, url }).catch(() => undefined);
    }
  });

  const relatedRoot = root.querySelector(".related-grid");
  if (relatedRoot) {
    cleanupLive = bindGridLivePlayers(
      relatedRoot,
      (card) => mountCardPlayer(card, true),
      unmountCardPlayer,
    );
  }

  const prevCleanup = cleanupLive;
  cleanupLive = () => {
    document.removeEventListener("keydown", onKey);
    prevCleanup?.();
  };

  bindFavButtons(root);
  bindPosterFallbacks(root);
}

function attachLivePlayers(root: HTMLElement): () => void {
  return bindGridLivePlayers(
    root,
    (card) => mountCardPlayer(card, false),
    unmountCardPlayer,
  );
}

function mountCardPlayer(card: HTMLElement, allowControls: boolean): void {
  if (card.dataset.live === "1") return;
  const youtubeId = card.dataset.yt ?? "";
  const host = card.querySelector<HTMLElement>(".cam-player");
  if (!host) return;
  const title = card.querySelector("h3")?.textContent ?? "Live camera";
  const iframe = createYouTubeIframe(youtubeId, `${title} (muted preview)`, {
    autoplay: true,
    mute: true,
    controls: allowControls,
  });
  if (!iframe) return;
  iframe.tabIndex = -1;
  host.replaceChildren(iframe);
  host.hidden = false;
  card.dataset.live = "1";
}

function unmountCardPlayer(card: HTMLElement): void {
  if (card.dataset.live !== "1") return;
  const host = card.querySelector<HTMLElement>(".cam-player");
  host?.replaceChildren();
  if (host) host.hidden = true;
  delete card.dataset.live;
}

function bindFavButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.dataset.fav;
      if (!id) return;
      const on = toggleFavorite(id);
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
      btn.innerHTML = `${heartSvg(on)}${btn.textContent?.includes("Favorite") ? " Favorite" : ""}`;
      const route = parseRoute();
      if (route.favoritesOnly && route.view === "grid") renderApp(document.getElementById("app")!);
    });
  });
}

function bindPosterFallbacks(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>("[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const next = img.dataset.fallback;
      if (next && img.src !== next) img.src = next;
    });
  });
}

function filterCameras(route: Route): Camera[] {
  const favs = new Set(listFavorites());
  let cams = getCatalog().cameras.slice();
  if (route.category !== "all") cams = cams.filter((c) => c.category === route.category);
  if (route.region !== "all") cams = cams.filter((c) => c.region === route.region);
  if (route.favoritesOnly) cams = cams.filter((c) => favs.has(c.id));
  if (route.query) {
    const q = route.query.toLowerCase();
    cams = cams.filter((c) =>
      [c.name, c.place, c.blurb, categoryLabel(c.category), c.sourceName].join(" ").toLowerCase().includes(q),
    );
  }
  if (route.sort === "az") {
    cams.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    cams.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  }
  return cams;
}

function resultsTitle(route: Route, count: number): string {
  if (route.favoritesOnly) return `${count} favorite${count === 1 ? "" : "s"}`;
  if (route.category !== "all") return `${categoryLabel(route.category as CategoryId)} · ${count}`;
  if (route.query) return `${count} match${count === 1 ? "" : "es"}`;
  return `All cameras · ${count}`;
}

function activeFilterCount(route: Route): number {
  return (route.category !== "all" ? 1 : 0) + (route.region !== "all" ? 1 : 0) + (route.sort !== "featured" ? 1 : 0);
}

function themeIcon(): string {
  return getTheme() === "dark"
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm8-5a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM6 12a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm11.66 6.66a1 1 0 0 1-1.41 0l-.71-.7a1 1 0 0 1 1.41-1.42l.71.71a1 1 0 0 1 0 1.41ZM8.46 8.46a1 1 0 0 1-1.41 0l-.71-.7A1 1 0 0 1 7.75 6.34l.71.7a1 1 0 0 1 0 1.42Zm8.49-2.12a1 1 0 0 1 0 1.41l-.71.71A1 1 0 0 1 14.83 7l.71-.7a1 1 0 0 1 1.41 0ZM8.46 15.54a1 1 0 0 1 0 1.41l-.71.71a1 1 0 1 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0ZM12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.3 2.1a1 1 0 0 1 1.05.14A9 9 0 1 1 8.1 20.7a1 1 0 0 1 .7-1.83 7 7 0 1 0 4.7-12.9 1 1 0 0 1-.2-1.87Z"/></svg>`;
}

function heartSvg(on: boolean): string {
  return on
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.6-9.3-8.7C1 9.2 2.4 6 5.6 6c1.8 0 3.1 1 3.9 2.2C10.3 7 11.6 6 13.4 6c3.2 0 4.6 3.2 2.9 6.3C19.2 16.4 12 21 12 21Z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 19.6C4.8 14.7 3.2 10.5 5.4 7.8 6.7 6.2 8.8 6 10 7.1c.7.6 1.1 1.4 2 1.4s1.3-.8 2-1.4C15.2 6 17.3 6.2 18.6 7.8c2.2 2.7.6 6.9-6.6 11.8Z"/></svg>`;
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
