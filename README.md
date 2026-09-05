# Public Cameras

A small browser app for Mark’s computer and phone: curated **live public camera** feeds from around the world.

No backend. The catalog is a JSON file. Video stays on YouTube — this site only embeds official HTTPS players.

## Run locally

```bash
cd C:\Users\mcall\projects\public-cameras
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Open on your phone (same Wi-Fi)

1. Run `npm run dev` (it already binds `--host`).
2. On the computer, note the Network URL, e.g. `http://192.168.1.23:5173`.
3. Open that address in the phone browser.
4. Optional: use **Add to Home Screen** — the app is PWA-friendly (manifest + standalone display).

If Windows Firewall asks, allow Node on private networks.

### Production build

```bash
npm run validate
npm run build
npm run preview
```

`dist/` is a static site you can drop on any host.

## Use the app

- **Grid** — posters first; muted live previews only when a tile is near the viewport. Hard cap: 3 concurrent live embeds on a phone, 7 on desktop. Off-screen tiles and a hidden tab drop their iframes.
- **Filters** — category chips, region, Featured / A–Z. On a phone, a sticky **Filters** chip opens a bottom sheet.
- **Favorites** — hearts store IDs in `localStorage` only. No account.
- **Detail** — `#/cam/<id>` with a large player (starts muted; unmute after you tap the YouTube controls), fullscreen, share/copy link, source attribution, related strip.
- **Deep links** — `#/category/beaches`, `#/?q=tokyo`, `#/?fav=1`.

`prefers-reduced-motion` keeps the grid on still posters.

## How to add a camera

1. Confirm it is an **intentional public** live camera from a known operator (city, port, park, observatory, EarthCam, explore.org, NASA, official tourism partner).
2. Get the YouTube **video ID** (11 characters in `watch?v=` or `/live/`).
3. Append an object to `public/catalog.json` → `cameras`:

```json
{
  "id": "my-camera-slug",
  "name": "Readable name",
  "place": "City, Country",
  "region": "europe",
  "category": "landmarks",
  "featured": false,
  "blurb": "One or two sentences.",
  "youtubeId": "xxxxxxxxxxx",
  "sourceName": "Operator name",
  "sourceUrl": "https://official-operator-page.example/"
}
```

4. Allowed `category` values: `cities`, `nature`, `beaches`, `landmarks`, `weather`, `transit`, `wildlife`.
5. Allowed `region` values: `north-america`, `europe`, `asia`, `africa`, `south-america`, `oceania`, `middle-east`, `space`.
6. Run `npm run validate`.

YouTube Live IDs **rotate** when an operator restarts a stream. Keep the same `id` and only change `youtubeId`.

Do **not** add raw IP URLs, RTSP, CCTV dumps, Shodan finds, home cameras, or admin UIs. The app will ignore anything that is not a valid YouTube ID plus an `https://` source page.

## Inclusion criteria

See `inclusionCriteria` in `public/catalog.json`. Short version:

- Public, official, or partner livestream (EarthCam / explore.org / NASA / city / port / park).
- Official YouTube Live iframe only (`youtube-nocookie.com/embed/<id>` built in code).
- Attribution on every detail view.
- Quality over quantity (~20–40 cams).

## Embed approach

YouTube Live official embeds (`https://www.youtube.com/embed/<id>`) are the default because they are HTTPS, allowlisted, support muted autoplay, and never expose a camera’s IP or admin interface. The catalog stores only the video ID; the app constructs the iframe URL. If an embed fails, the detail view keeps the poster and an **Open on source** / YouTube link. We do not proxy or re-encode video.

## GitHub Pages (optional)

1. Push this repo.
2. Settings → Pages → Deploy from branch → `main` / `/ (root)` **or** use GitHub Actions to publish `dist`.
3. If you publish the built site, run `npm run build` and upload `dist`.
4. Routes are hash-based (`#/cam/...`) so they work on project pages without a server rewrite. `public/404.html` also maps `/cam/:id` back to the hash route.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local Vite server, reachable on the LAN |
| `npm run validate` | Security/shape check on `public/catalog.json` |
| `npm run build` | Typecheck + static build |
| `npm run preview` | Serve the production build |
