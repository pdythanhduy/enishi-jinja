# えにし神社 (Enishi Jinja) — 3D online shrine

Live: https://enishijinja.com/ (GitHub Pages custom domain; the old pdythanhduy.github.io/enishi-jinja URL 301-redirects. DNS is on Cloudflare in DNS-only mode. Public repo pdythanhduy/enishi-jinja). The user writes in Vietnamese; site text is Japanese.

**Brand**
- Name: えにし神社 ～作業と祈りのオンライン神社～ (concept: 祈り × 作業・集中).
- Tab title: `⛩ えにし神社｜作業と祈りのオンライン神社`. During a focus session it becomes `🧘 mm:ss 集中中｜えにし神社`.
- Hashtags: #えにし神社, and #えにし作業室 on the focus share card.

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
    - It also hangs 18 奉納提灯 on the honden side walls with today's kenno names (your own first). Empty slots get 講 and 崇敬会 names.
  - 静のひととき (🧘 button in the top bar) is for long stays:
    - `zen.js`: the menu and 集中・座禅.
      - Pick 15, 25, 45 or 60 minutes and a spot: honden front, pond or 奥の院 stage. Spots more than 28 m away are reached with a fade-out warp.
      - Optional 4-7-8 breathing first; seiza with a slow sway camera.
      - +5 徳 every 5 minutes. The status tag shows `🧘 集中中 N分`, which other players see and `focusing()` counts. Optional quiet mode hides the HUD.
      - Stats are kept in `enishi_zen`.
    - `mixer.js`: synthesized ambient layers (rain, stream, wind, mushi, birds, furin, suzu, 拍子木 every 5/10/20 s) plus the music volume, and presets. Rain also draws falling lines around the camera.
    - `shakyo.js`: 写経・写歌 of PD texts (祓詞, 大祓詞, 百人一首, 芭蕉, 一茶). Each character is traced over a faint model on a pad; ≥50% glyph cover with little stray ink inks it. Typing only advances on the exact character.
      - Finishing adds a 奉納 seal and +10 徳 (up to 3 a day) and is saved in `enishi_shakyo`.
      - 絵馬を描く is a brush canvas. The drawing is kept only on the device (`enishi_myema`, max 6) and is hung on `W.emaRack`.
    - `tour.js`: 境内めぐり, a 40 s slow arc per PLACES entry with fades and captions, and 奥の院の池, a fixed view with floating lanterns. Tap or Esc exits.
  - `welcome.js`: a four-card intro (rooms, chores, 🧘) shown once after the profile, stored in `enishi_welcome`.
  - Notifications: the room HUD 🔔 asks for permission. `notify()` shows a system notification only when the tab is hidden, and vibrates on phones.
  - `#room-live` chip at the top left shows which room has people right now; tapping it joins.
  - og.jpg is a 書院 dusk shot with the tagline, composed with PIL and Yu Mincho.
  - `sagyo.js` (えにし作業室): two shared focus rooms.
    - 屋形船「えにし丸」 is moored on the main pond (`YAKATA`, with a pier and entry at [18, 62.6]). The 書院 sits beside the 参道 (`SHOIN`, open to the east, entry at [-6.4, 67]).
    - Players warp into a free seat and sit seiza, with a fixed room camera.
    - The Pomodoro is shared by JST clock: 25 min focus and 5 min break, starting at :00 and :30. Breaks bring a gong and everyone bows.
    - Rewards: +5 徳 per 5 focus minutes; counts are kept in `enishi_pomo`.
    - Status is `🛶 屋形船で作業中` or `📖 書院で作業中`. Others with 🧘, 🛶 or 📖 statuses are shown seated (`poseBySt`). These statuses are cleared on reload.
    - Music channels (`bgm.setChannel`): lofi uses the bgm.json key `lofi`, keidai is the default, and nature silences the music and applies the mixer preset 雨と川.
  - Inside a room:
    - `body.in-room` hides the joystick, action bar, guide and own tag. The HUD starts collapsed (`.mini`) on phones.
    - One-finger drag looks around (yaw ±1.25 rad, pitch).
    - Seated people write during focus and sip tea during breaks (`life()`). Steam rises from the 書院 cups.
    - Sleeping 三毛猫 lie on the 書院 engawa and the boat bow; tap one to make it purr.
  - Sound: one 音量 slider sets the music and the effects (effects at ×0.7).
  - 楼門 has a raised base floor (0.56) with front and back steps.
  - Speech bubbles sit above the name tag and wrap.
  - `chores.js`: お手伝い mini-games, each with no timer, once a day, +3 徳 via `deedHook("chore")`.
    - Chores: 狛狐を磨く (×2), 手水鉢を洗う, 打ち水 (雪かき in winter) and 草むしり (keep the flowers).
    - Leaf sweeping is now a broom game: push leaves into the 塵取り. A find is hidden under the leaves, and the game gives +2 徳.
    - `chores.near(p)` feeds `currentAction`. Debug with `__enishi.chores.run(spec)`.
  - Stairs: ramp floors in map.js get a `table` of real step heights. `measureStairs()` in app.js raycasts them at startup, so feet land on each tread instead of sliding along a slope.
  - Controls work like a map.
    - One finger or left-drag rotates (the original feel). Two fingers or right-drag pan along the ground, and pinch zooms. There are also ⟲⟳ buttons (`#cam-rot`) on touch devices.
    - Walk speed (`SPEED`) is 2.5 m/s.
    - sw.js has no fetch handler. A navigation handler once seemed to make reloads hang on iPhone, so it was removed.
    - The loading watchdog in index.html prints errors on the loading screen. After 25 s it offers reload and 「軽量モード」.
    - `?lite` (remembered in `enishi_lite`, cleared by `?full`) sets pixel ratio 1, turns bloom off and plants fewer trees.
    - Panning sets `freeCam`, which stops the follow camera and shows 「📍 自分の場所へ」. Walking, the joystick or `setCine(null)` turn it back off.
    - Movement comes from the joystick `#joy` (touch only) or WASD/arrow keys (`steer()`). Map trips over 38 m warp.
  - Minigame canvases block touch scrolling with non-passive `touchmove`/`touchstart` `preventDefault`, because iOS needs more than `touch-action`.
  - Bows pivot at the hip (HIP 0.6 in avatar.js `bowTo`).
  - Effects go through `AC.fxBus`, which has its own volume (`enishi_fxvol`, default 0.4). Tapping a blocked spot walks to the nearest free point, and walking gives up after 1.4 s without progress.
  - `chat.js`: room chat (💬 button at bottom left). Lines are up to 60 characters, filtered by the NG list on both client and server.
    - Tap a line to mute or report that person. Reports from 3 different people silence that socket in that room (`t:"rep"`, in-memory in the Room DO).
    - Nothing is stored server-side.
  - `guide.js`: 今日の参拝, five daily steps (手水 → お参り → おみくじ → 献灯/御祈祷 → 縁). It reuses the deeds.js quest ids, shows a gold marker at the next spot, and fires 満願 when all five are done. `STEP_OF` maps deed kinds to steps.
  - `temizu.js`: the 手水舎 (dragon spout with running water, ladle rack, 作法 sign, water sound) and the over-the-shoulder 手水 ritual.
  - `seasonal.js`: calendar events by JST date. Force one with `?event=753|oharae|joya|hatsumode|juken` (joya starts the clock at 23:57:40).
    - 年越の大祓 (Dec 20–31): 茅の輪 at (0, 28) with the figure-8 walk; 人形 modal (write a name, stroke, three breaths, offer; the name stays on the device).
    - 除夜の鐘 (Dec 31 22:00 – Jan 1 1:00): a distant bell with a shared count n/108 based on JST time, a 10-second countdown, then fireworks.
    - 七五三 (November): banners, 千歳飴 stand.
    - 初詣 (Jan 1–7): 門松, banners, 甘酒 stand.
    - 受験 (Jan 8 – Mar 15): banners at the 合格 hall.
  - `water.js`: light water shader (two drifting normal maps, Fresnel alpha so koi show from above, edge foam), bowl-shaped pond bed with caustics, lotus and iris. `koi.js`: patterned koi that wander and bend as they swim; `W.koiFeed(x, z)` gathers them. Ponds are dug into the terrain in `height()`.
    - `makeStream` builds a mountain stream: a bed ribbon, flowing water with foam on steep parts, and bank stones.
    - Its path is `STREAM` in map.js: from the summit pond it runs 3 m beside the trail, on the side opposite the lanterns. The trail shoulders are flattened to 6.6 m so the stream lies flat.
    - The stream has a babbling sound from the nearest point.
  - `monzen.js` (門前町, south of 大鳥居, `MONZEN` in map.js): 8 町家; usable ones are 茶屋 (sit on the 縁台), 土鈴 shop (one 土鈴 a day, goes to 宝物), 案内所 (map) and 酒蔵 (杉玉). Also 一の鳥居 (stone) with 社号標, and the 見晴らし台 (3-shot view, `miharasu`). The 遥拝所 stone at 奥の院 (`PLACES.yohai`) faces 縁の峰.
  - `vista.js`: distant scenery. Valley town at y = −38 with night lights, 縁の浦 sea (`coastZ`), three mountain rings, 縁の峰 (`PEAK`, the shrine's sacred mountain; the yohai face is computed from it) and a morning cloud sea. Camera far is 1500.
  - `freeze.js`: at startup, merges the meshes of groups marked `userData.static = true` (arch.js builders) into one mesh per material. Groups stay for position lookups. Anything that moves, or swaps materials per mesh, must NOT be marked static. Moving parts inside a static group can set `userData.live = true` (as the honden doors do), and freeze skips them. `?nofreeze` disables it.
- `site/fx.js`: wagara patterns, ambience sounds, `matsuri()` お囃子 festival music. `site/content.js`: halls, stories, omikuji.
- `worker/worker.js`: also /presence, /bless, /inbox, /kenno, /kenno/light (Remind DO tables pres, inbox, lamp) and GET /ema/:hall?ids=. Admin can hide a lamp with POST /admin/:hall {key, lamp}.
- `worker/worker.js`: Cloudflare Worker `enishi-rooms` with Durable Objects. Room is WebSocket, 100 per room. Board is SQLite ema/pray/report/light. Remind sends Web Push at 08:00 JST and tracks global 徳 (FEST_GOAL 300). Deploy with `python worker/deploy.py`, which reads keys from `.env`.

## Layout notes
- The honden is scaled ×1.3 and moved back (`HONDEN`, `hw()` in map.js convert the old honden coordinates). kito.js puts its props in a group `H` that follows the honden, so it still uses the old local numbers.
- AI art lives in `site/img/gen/` (tenjo ceiling, matsu pine, tsuru cranes, ume moon, washi UI paper). `artMat(name, repeat)` in arch.js loads one as a material.

- Music: `site/audio/bgm.json` lists Suno tracks for day and night (keidai.mp3 = 境内の調べ, tsukiyo.mp3 = 月夜の調べ, both 112 kbps). Made on the owner's Suno Pro account, so commercial use is allowed. The `lofi` key holds four 和風 lo-fi tracks (lofi1–4.mp3, えにし作業室 lo-fi, 112 kbps) used by the work rooms' 🎧 channel. If the files are missing, js/bgm.js falls back to generated koto/orin music.

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
- Hall identity outside: 赤い糸の結び棚 at the 縁結び hall (`W.itoTana`, one thread a day) and 筆塚 with 筆納箱 at the 合格 hall.
- The 📖 book has a 御札・宝物 tab: ofuda from kito and finds from sweeping and events.
- Small-hall interiors (`smallHallInterior` in arch.js, `theme: "en"|"go"`): 縁結び has red threads, 猪目 plaque, 千羽鶴, 夫婦石, pink ema. 合格 has 掛け軸, 撫で牛, desk with brush and plum, daruma, blue ema.
- Trees between the camera and the player fade with a dithered shader (`W.treeFade`, world.js). Trees are kept out of the small-hall footprints.

## Next ideas
- Distance culling (app.js, after freeze): meshes under 3 m stop rendering beyond 55× their radius (18–120 m) by switching them to layer 1, so `visible` is left alone. Avatars are skipped, the map camera enables all layers, and `?nolod` turns it off. Meshes under 0.8 m cast no shadow, and the shadow map redraws every other frame. Court went from ~1350 to ~570 draw calls (2026-11-03).
- Performance check on a real phone. Draw calls are ~260–420 (was ~1000–1560); triangles ~375–405k. The 41 stone toro each keep their own lamp material because DarkLanterns turns single ones off; they could become instanced if more savings are needed.
