import { loadCatalog } from "./catalog";
import { renderApp } from "./render";
import { onRouteChange } from "./router";
import { initTheme } from "./theme";
import "./styles.css";

initTheme();

const root = document.getElementById("app");
if (!root) throw new Error("#app missing");

loadCatalog()
  .then(() => {
    renderApp(root);
    onRouteChange(() => renderApp(root));
  })
  .catch((error: unknown) => {
    root.innerHTML = `<main class="empty"><h1>Couldn’t load cameras</h1><p>${error instanceof Error ? error.message : "Unknown error"}</p></main>`;
  });

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}
