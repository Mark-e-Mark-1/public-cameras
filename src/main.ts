import { cameraById, loadCatalog } from "./catalog";
import { renderApp, shareCameraLink } from "./render";
import { onRouteChange, parseRoute } from "./router";
import { initTheme } from "./theme";
import "./styles.css";

initTheme();

const root = document.getElementById("app");
if (!root) throw new Error("#app missing");

loadCatalog()
  .then(() => {
    renderApp(root);
    onRouteChange(() => renderApp(root));
    document.addEventListener("click", (event) => {
      const btn = (event.target as HTMLElement | null)?.closest?.("[data-share]");
      if (!(btn instanceof HTMLButtonElement)) return;
      const cam = parseRoute().cameraId ? cameraById(parseRoute().cameraId!) : undefined;
      if (!cam) return;
      event.preventDefault();
      shareCameraLink(cam, btn);
    });
  })
  .catch((error: unknown) => {
    root.innerHTML = `<main class="empty"><h1>Couldn’t load cameras</h1><p>${error instanceof Error ? error.message : "Unknown error"}</p></main>`;
  });

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}
