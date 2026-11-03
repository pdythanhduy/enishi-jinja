# えにし神社 (Enishi Jinja) — 3D online shrine

Live: https://pdythanhduy.github.io/enishi-jinja/ (public repo pdythanhduy/enishi-jinja). The user writes in Vietnamese; site text is Japanese.

## Stack
- `site/`: static Three.js r0.180 via jsdelivr importmap, no build step. Deployed by GitHub Pages (`.github/workflows/pages.yml`) on push to `site/**`.
- `site/js/`:
  - `env.js`: sky, lamps and fog by JST hour; season.
  - `map.js`: PLACES, terrain height, BLOCKS collision, walkable/routeTo/footY.
  - `arch.js`: MAT, roof(), torii, toro, chochin, honden (+inner sanctuary), smallHall, romon, pagoda, etc.
  - `world.js`: buildWorld.
  - `decor.js`: PMREM env, textures, nobori, lantern rows, rocks, clouds, snowRoofs.
  - `avatar.js`, `collect.js` (goshuin and omamori), `good.js` (leaves, dark lanterns, lost fox, fireworks), `deeds.js` (徳, ranks, quests), `net.js`.
  - `app.js`: core, rituals, UI, multiplayer.
- `site/fx.js`: wagara patterns, ambience sounds, `matsuri()` お囃子 festival music. `site/content.js`: halls, stories, omikuji.
- `worker/worker.js`: Cloudflare Worker `enishi-rooms` with Durable Objects. Room is WebSocket, 100 per room. Board is SQLite ema/pray/report/light. Remind sends Web Push at 08:00 JST and tracks global 徳 (FEST_GOAL 300). Deploy with `python worker/deploy.py`, which reads keys from `.env`.

## Rules
- **Before every commit, run `python tools/bump.py`.** It adds `?v=` cache-busting to the relative imports. Without it, browsers keep serving stale modules.
- Check JS syntax with `node --check site/js/*.js site/fx.js`.
- Never print or commit `.env`. It holds CF_WORKER_TOKEN, ADMIN_KEY, GEMINI_API_KEY and VAPID keys.
- Commit messages end with the Co-Authored-By / Claude-Session lines given by the harness.

## Testing locally
- Serve with `python -m http.server 8766` from `site/`.
- URL params: `?nointro`, `?hour=19` (time of day), `?season=winter|spring|summer|autumn`.
- `window.__enishi` exposes debug hooks: scene, camera, controls, me, run(id), fireworks, hayashi, bloom, etc.
- Chrome throttles rAF to about 2 fps when the window is in the background, so fps numbers taken then are meaningless.
- The nav sim (all routes and cushion paths) lived in the old session's scratchpad (simnav/sim.mjs). Re-create it if `map.js` routes change.
- Images: `tools/gen_image.py` (Gemini `gemini-3.1-flash-image`, GEMINI_API_KEY in `.env`).

## Done so far (2026-11-03)
- Halls: 当選 (honden), 縁結び, 合格, 奥の院.
- Rituals: temizu, coin choice, omairi, seiza.
- Features: omikuji, shared ema (with date reminders and push), goshuin book, omamori, 徳/quests, 夜祭り fireworks + お囃子 music.
- Scenery: winter snow, decor pass, curved gable bargeboards.

## Next ideas
- Small-hall interiors to match the honden.
- Fade trees that block the camera.
- Performance check on a real phone.
