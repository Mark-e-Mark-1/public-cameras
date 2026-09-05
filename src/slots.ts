export function liveCap(): number {
  return window.matchMedia("(max-width: 720px)").matches ? 3 : 7;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldAutoplayGrid(): boolean {
  return !prefersReducedMotion() && !document.hidden;
}

/**
 * Assign live slots to the first `cap` intersecting cards (DOM order).
 * Never mounts more than the hard cap. Off-screen cards lose their iframe.
 */
export function bindGridLivePlayers(
  root: ParentNode,
  mount: (card: HTMLElement) => void,
  unmount: (card: HTMLElement) => void,
): () => void {
  const cards = [...root.querySelectorAll<HTMLElement>("[data-cam-card]")];
  const visible = new Set<HTMLElement>();

  const sync = () => {
    if (!shouldAutoplayGrid()) {
      for (const card of cards) unmount(card);
      return;
    }
    const cap = liveCap();
    const ranked = cards.filter((card) => visible.has(card));
    const keep = new Set(ranked.slice(0, cap));
    for (const card of cards) {
      if (keep.has(card)) mount(card);
      else unmount(card);
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = entry.target as HTMLElement;
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) visible.add(card);
        else visible.delete(card);
      }
      sync();
    },
    { rootMargin: "80px 0px", threshold: [0, 0.2, 0.4] },
  );

  for (const card of cards) io.observe(card);

  const onVisibility = () => sync();
  const onResize = () => sync();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", onResize);

  sync();

  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
    for (const card of cards) unmount(card);
  };
}
