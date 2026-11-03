# えにし神社 (Enishi Jinja) — 3D online shrine

Live: https://pdythanhduy.github.io/enishi-jinja/ (public repo pdythanhduy/enishi-jinja). The user writes in Vietnamese; site text is Japanese.

**Read `docs/TOAN_BO_ENISHI.md` first.** It is the full project history: concept, every feature, content, marketing and monetization plans, lessons learned and the to-do list (in Vietnamese).

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
  - Lamps: `sharedLamp()` in arch.js shares one material per color (chochin, 釣灯籠). The toro keep their own material. After the build, app.js registers every material with `userData.base` with env and applies the hour once. The sando lantern rows are InstancedMesh, animated in `lanternRows` tick.
  - `kito.js`: 御祈祷 ceremony in the honden (priest and miko NPCs, candles, light beam, synthesized norito voice and fue, cinematic camera, 御札 canvas). The norito reads the player's name and wish; the wish never leaves the device. Waits use timers, not rAF, so timing holds on slow devices. App hooks: `setCine`, `goSeat`, `hideOthers`.
    - The 御扉 (folding black-lacquer doors behind the mirror) open before the norito and close at 御札授与: `W.hondenDoors(k)`, k from 0 to 1, with a glow plane behind them.
    - When no rite is running, the priest and miko follow a JST routine: 朝 sweeping and 神饌, 昼 bows and suzu, 夕 lighting the candles, 夜 seiza (`MODES` in kito.js, 30 s cycles).
    - A third miko stands at the 授与所 and bows when a visitor comes near.
  - `profile.js`: 身支度 (name, yukata, pattern, hair, accessories gated by 徳). Looks are strings `v1.k.p.h.c.a` (`parseLook` in avatar.js); old numeric seeds still work. Opens on first visit.
  - `social.js`: preset phrases and emotes (`say`/`emo` acts carry an index, never free text), 縁 (tap a visitor, bow; a returned bow within 2 min binds), 縁帳 with presence and once-a-day blessings, streak (🔥), news when others pray for your ema. Identity: a secret `enishi_key` on the device; the public id is `pid = sha256("enishi:"+key)[:8]`.
  - `kenno.js`: 献灯所 at (-15, 8.6). 64 lanterns, one per person per day; each lantern gains a day of brightness every day its owner returns.
  - `guide.js`: 今日の参拝, five daily steps (手水 → お参り → おみくじ → 献灯/御祈祷 → 縁). It reuses the deeds.js quest ids, shows a gold marker at the next spot, and fires 満願 when all five are done. `STEP_OF` maps deed kinds to steps.
  - `temizu.js`: the 手水舎 (dragon spout with running water, ladle rack, 作法 sign, water sound) and the over-the-shoulder 手水 ritual.
  - `seasonal.js`: calendar events by JST month (now 七五三 in November: banners, 千歳飴 stand, extra 願意). Force one with `?event=753`.
  - `water.js`: light water shader (two drifting normal maps, Fresnel alpha so koi show from above, edge foam), bowl-shaped pond bed with caustics, lotus and iris. `koi.js`: patterned koi that wander and bend as they swim; `W.koiFeed(x, z)` gathers them. Ponds are dug into the terrain in `height()`.
    - `makeStream` builds a mountain stream: a bed ribbon, flowing water with foam on steep parts, and bank stones.
    - Its path is `STREAM` in map.js: from the summit pond it runs 3 m beside the trail, on the side opposite the lanterns. The trail shoulders are flattened to 6.6 m so the stream lies flat.
    - The stream has a babbling sound from the nearest point.
  - `freeze.js`: at startup, merges the meshes of groups marked `userData.static = true` (arch.js builders) into one mesh per material. Groups stay for position lookups. Anything that moves, or swaps materials per mesh, must NOT be marked static. Moving parts inside a static group can set `userData.live = true` (as the honden doors do), and freeze skips them. `?nofreeze` disables it.
- `site/fx.js`: wagara patterns, ambience sounds, `matsuri()` お囃子 festival music. `site/content.js`: halls, stories, omikuji.
- `worker/worker.js`: also /presence, /bless, /inbox, /kenno, /kenno/light (Remind DO tables pres, inbox, lamp) and GET /ema/:hall?ids=. Admin can hide a lamp with POST /admin/:hall {key, lamp}.
- `worker/worker.js`: Cloudflare Worker `enishi-rooms` with Durable Objects. Room is WebSocket, 100 per room. Board is SQLite ema/pray/report/light. Remind sends Web Push at 08:00 JST and tracks global 徳 (FEST_GOAL 300). Deploy with `python worker/deploy.py`, which reads keys from `.env`.

## Layout notes
- The honden is scaled ×1.3 and moved back (`HONDEN`, `hw()` in map.js convert the old honden coordinates). kito.js puts its props in a group `H` that follows the honden, so it still uses the old local numbers.
- AI art lives in `site/img/gen/` (tenjo ceiling, matsu pine, tsuru cranes, ume moon, washi UI paper). `artMat(name, repeat)` in arch.js loads one as a material.

- Music: `site/audio/bgm.json` lists Suno tracks for day and night (keidai.mp3 = 境内の調べ, tsukiyo.mp3 = 月夜の調べ, both 112 kbps). Made on the owner's Suno Pro account, so commercial use is allowed. If the files are missing, js/bgm.js falls back to generated koto/orin music.

- The map (地図) is a top-down render of the live scene (`drawMap` in app.js, bounds `MAPB`), so pins always match the real layout.
- `site/about.html` is the 運営者情報・privacy page. Contact is via GitHub Issues. Keep it accurate when data handling changes.

## Rules
- **Before every commit, run `python tools/bump.py`.** It adds `?v=` cache-busting to the relative imports. Without it, browsers keep serving stale modules.
- Check syntax with `node --experimental-vm-modules tools/modcheck.mjs site/js/*.js site/*.js`. It parses each file as a real ES module, so it catches duplicate declarations that `node --check` misses. Still load the page: lazy regex errors only show in the browser.
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
- Small-hall interiors (`smallHallInterior` in arch.js, `theme: "en"|"go"`): 縁結び has red threads, 猪目 plaque, 千羽鶴, 夫婦石, pink ema. 合格 has 掛け軸, 撫で牛, desk with brush and plum, daruma, blue ema.
- Trees between the camera and the player fade with a dithered shader (`W.treeFade`, world.js). Trees are kept out of the small-hall footprints.

## Next ideas
- Performance check on a real phone. Draw calls are ~260–420 (was ~1000–1560); triangles ~375–405k. The 41 stone toro each keep their own lamp material because DarkLanterns turns single ones off; they could become instanced if more savings are needed.
