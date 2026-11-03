// 献灯所：みんなの名前と願いの灯りが並ぶ棚。毎日お参りすると自分の灯りが少しずつ明るくなる。
import * as THREE from "three";
import { HONDEN } from "./map.js?v=11032001";

export const KENNO = { x: -20.6, z: 22, ry: Math.PI / 2, stand: [-18.2, 22] };
const COLS = 16, ROWS = 4, GANS = ["当選", "縁結び", "合格", "健康", "家内安全", "心願成就"];
const TINT = { 当選: 0xffe7b8, 縁結び: 0xffc6d4, 合格: 0xcfe0ff, 健康: 0xd8f5d0, 家内安全: 0xfff1d6, 心願成就: 0xf2dcff };
const esc = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

export function setupKenno(A) {
  const { scene, env, store, API } = A;
  const key = store.get("enishi_key", "");
  // ---------------------------------------------------------------- 棚（朱の柱・四段の棚・銅の屋根・扁額）
  const g = new THREE.Group(); g.position.set(KENNO.x, 0, KENNO.z); g.rotation.y = KENNO.ry; scene.add(g);
  const shu = std(0xd23a26, { roughness: 0.5 }), wood = std(0x6b4428), copper = std(0x3f7a68, { roughness: 0.5, metalness: 0.25 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.14, 0.16, 3.9, 12), shu, s * 3.75, 1.95, 0);
  add(new THREE.BoxGeometry(7.9, 0.12, 0.7), wood, 0, 0.18, 0);
  for (let r = 0; r < ROWS; r++) { add(new THREE.BoxGeometry(7.5, 0.06, 0.55), wood, 0, 0.62 + r * 0.72, 0); add(new THREE.BoxGeometry(7.5, 0.05, 0.05), shu, 0, 1.12 + r * 0.72, 0.22); }
  add(new THREE.BoxGeometry(7.5, 3.2, 0.06), std(0x3a2a1e), 0, 2.0, -0.28);
  const rf = add(new THREE.BoxGeometry(8.6, 0.12, 1.3), copper, 0, 3.95, 0); rf.rotation.x = 0.06;
  add(new THREE.BoxGeometry(8.8, 0.18, 0.2), shu, 0, 3.82, 0.45);
  // 扁額：献灯の数
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 128; const cx = cv.getContext("2d");
  const plaque = new THREE.CanvasTexture(cv); plaque.colorSpace = THREE.SRGBColorSpace;
  const drawPlaque = (n) => {
    cx.fillStyle = "#1c1a19"; cx.fillRect(0, 0, 512, 128); cx.strokeStyle = "#e3b54a"; cx.lineWidth = 6; cx.strokeRect(8, 8, 496, 112);
    cx.fillStyle = "#e8c67a"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.font = `bold 58px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
    cx.fillText(n ? `献灯　${n.toLocaleString()}灯` : "献　灯　所", 256, 66); plaque.needsUpdate = true;
  };
  drawPlaque(0);
  add(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.6 }), 0, 4.35, 0.42);

  // ---------------------------------------------------------------- 灯り（InstancedMesh：本体・上下の口輪）
  const N = COLS * ROWS;
  const bodyM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), bodyM, N);
  const rims = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10), std(0x1c1a19), N * 2);
  const o3 = new THREE.Object3D(), col = new THREE.Color();
  const slot = (i) => [(-3.35 + (i % COLS) * (6.7 / (COLS - 1))), 0.86 + (ROWS - 1 - Math.floor(i / COLS)) * 0.72];
  for (let i = 0; i < N; i++) {
    const [x, y] = slot(i);
    o3.position.set(x, y, 0.05); o3.rotation.set(0, 0, 0); o3.scale.set(1, 1.3, 1); o3.updateMatrix(); body.setMatrixAt(i, o3.matrix);
    for (const k of [0, 1]) { o3.position.set(x, y + (k ? 0.2 : -0.2), 0.05); o3.scale.set(1, 1, 1); o3.updateMatrix(); rims.setMatrixAt(i * 2 + k, o3.matrix); }
    body.setColorAt(i, col.setRGB(0.12, 0.1, 0.09));                  // まだ空の灯り
  }
  body.instanceColor.needsUpdate = true; g.add(body, rims);
  let lamps = [], mine = new Set(), base = [];
  function paint() {
    base = [];
    for (let i = 0; i < N; i++) {
      const L = lamps[i];
      if (!L) { base.push(null); body.setColorAt(i, col.setRGB(0.12, 0.1, 0.09)); continue; }
      const glow = 0.7 + Math.min(L.days || 1, 30) / 30 * 0.9;
      const c = new THREE.Color(mine.has(L.pid) ? 0xffc65a : TINT[L.gan] || 0xffe9c8); base.push({ c, glow });
    }
    tint(); body.instanceColor.needsUpdate = true;
  }
  let lastLamp = -1;
  function tint() {
    const night = 0.55 + 0.85 * env.lamp;
    base.forEach((b, i) => { if (b) body.setColorAt(i, col.copy(b.c).multiplyScalar(b.glow * night)); });
    body.instanceColor.needsUpdate = true;
  }
  A.W.update.push(() => { if (Math.abs(env.lamp - lastLamp) > 0.02) { lastLamp = env.lamp; tint(); } });
  // 本殿の奉納提灯：左右の壁の上に十八張。今日献灯した人の名前が入る（自分の名前は先頭に）。足りないところは講や崇敬会の名
  const hlan = (() => {
    const g = new THREE.Group(); g.position.set(0, 0, HONDEN.Z); g.scale.setScalar(HONDEN.S); scene.add(g);
    const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(0.17 + 0.11 * Math.sin(Math.PI * t), (t - 0.5) * 0.8)); }
    const geo = new THREE.LatheGeometry(prof, 24), cap = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 16), cord = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4);
    const kuro = std(0x1a1612), beamM = std(0x4a3020, { roughness: 0.6 }), list = [];
    for (const sx of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 7.6), beamM); beam.position.set(sx * 8.35, 5.85, 1.2); g.add(beam);
      for (let k = 0; k < 9; k++) {
        const z = -2.2 + k * 0.85, c = document.createElement("canvas"); c.width = 512; c.height = 256;
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffcf90, emissiveMap: t, roughness: 0.8 }); m.userData.base = 0.9; env.registerLamp(m, null);
        const l = new THREE.Mesh(geo, m); l.position.set(sx * 8.35, 5.0, z); g.add(l);
        for (const dy of [-0.42, 0.42]) { const cp = new THREE.Mesh(cap, kuro); cp.position.set(sx * 8.35, 5.0 + dy, z); g.add(cp); }
        const cd = new THREE.Mesh(cord, kuro); cd.position.set(sx * 8.35, 5.64, z); g.add(cd);
        list.push({ c, t });
      }
    }
    const FALL = ["えにし講", "崇敬会", "氏子一同", "奉納", "商売繁盛", "家内安全", "無病息災", "交通安全", "学業成就", "良縁祈願", "心願成就", "五穀豊穣"];
    const font = (px) => `bold ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
    return (names) => list.forEach(({ c, t }, i) => {
      const x = c.getContext("2d"), n = [...String(names[i] || FALL[(i * 5) % FALL.length])].slice(0, 7);
      x.fillStyle = "#fbf3e0"; x.fillRect(0, 0, 512, 256);
      x.fillStyle = "#b8281c"; x.fillRect(0, 0, 512, 20); x.fillRect(0, 236, 512, 20);
      x.textAlign = "center"; x.textBaseline = "middle";
      for (const cx of [128, 384]) {                                    // 表と裏（LatheGeometry の u=0.25 / 0.75 が左右の向き）
        x.fillStyle = "#b8281c"; x.font = font(26); x.fillText("奉 納", cx, 42);
        const px = Math.min(50, Math.floor(172 / n.length)); x.fillStyle = "#1a1612"; x.font = font(px);
        n.forEach((ch, k) => x.fillText(ch, cx, 62 + px * 0.55 + k * px * 1.0));
      }
      t.needsUpdate = true;
    });
  })();
  hlan([]);
  async function load() {
    try {
      const r = await fetch(`${API}/kenno`).then((r) => r.json());
      const myPid = A.pid();
      lamps = (r.lamps || []).slice(0, N); mine = new Set([myPid]);
      // 自分の灯りが見えるところに来るように、古くても先頭へ
      const own = (r.lamps || []).filter((l) => l.pid === myPid);
      for (const l of own) if (!lamps.includes(l)) lamps.splice(N - 1, 1), lamps.unshift(l);
      paint(); drawPlaque(r.total || lamps.length);
      const names = [...new Set([...own, ...(r.lamps || [])].map((l) => l.name).filter(Boolean))]; hlan(names);
    } catch { /* まだサーバーが対応していないときは空の棚のまま */ }
  }
  load();
  // 毎日、自分の灯りに火を足す
  if (key && A.store.get("enishi_kenno_light", "") !== A.today()) {
    fetch(`${API}/kenno/light`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).then((r) => r.json()).then((r) => {
      A.store.set("enishi_kenno_light", A.today());
      if (r.lit > 0) setTimeout(() => A.toast("🏮 あなたの献灯に、今日も火が足されました。少し明るくなっています", 4200), 12000);
    }).catch(() => {});
  }

  // ---------------------------------------------------------------- 灯りをタップ → 名前と願い
  const card = document.createElement("div"); card.id = "lamp-card"; card.hidden = true; document.body.appendChild(card);
  card.onclick = () => (card.hidden = true);
  A.tapHandlers.push((ray) => {
    const h = ray.intersectObject(body)[0]; if (!h || h.distance > 18) return false;
    const L = lamps[h.instanceId];
    card.innerHTML = L ? `<p class="kicker">献灯</p><p class="lamp-name">${esc(L.name)}${mine.has(L.pid) ? " <small>あなたの灯り</small>" : ""}</p>
        ${L.gan ? `<p class="lamp-gan">${esc(L.gan)}</p>` : ""}${L.text ? `<p class="lamp-text">「${esc(L.text)}」</p>` : ""}<p class="sub">灯して ${L.days || 1}日目</p>`
      : `<p class="kicker">献灯</p><p class="lamp-name">まだ灯っていない灯り</p><p class="sub">近くの「🏮 献灯する」から、あなたの灯りを奉納できます。</p>`;
    card.hidden = false; clearTimeout(card._t); card._t = setTimeout(() => (card.hidden = true), 6000);
    return true;
  });

  // ---------------------------------------------------------------- 奉納の画面
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-kenno"; m.hidden = true;
  m.innerHTML = `<div class="sheet kito-sheet"><button class="x" data-close aria-label="閉じる">✕</button>
    <p class="kicker">献灯所</p><h2>灯りをひとつ奉納する</h2>
    <p class="sub">あなたの名前と願いを書いた灯りが、この棚に並びます。毎日お参りに来ると、灯りが少しずつ明るくなります。献灯は一日にひとつです。</p>
    <h3>願い</h3><div class="chips" id="kn-gan">${GANS.map((x, i) => `<button class="${i ? "" : "on"}" data-g="${x}">${x}</button>`).join("")}</div>
    <h3>ひとこと <small>（16文字まで・みんなに見えます）</small></h3><input id="kn-text" maxlength="16" placeholder="例：家族がみんな元気で" autocomplete="off">
    <p class="sub pf-err" id="kn-err" role="alert"></p>
    <div class="row"><span class="sub">名前：<b id="kn-name"></b></span><button class="btn primary" id="kn-go">🏮 灯す</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector("[data-close]").onclick = () => (m.hidden = true);
  m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
  let gan = GANS[0];
  m.querySelector("#kn-gan").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; gan = b.dataset.g; m.querySelectorAll("#kn-gan button").forEach((x) => x.classList.toggle("on", x === b)); };
  function open() { m.querySelector("#kn-name").textContent = A.getName(); m.querySelector("#kn-err").textContent = ""; m.hidden = false; }
  m.querySelector("#kn-go").onclick = async () => {
    const text = A.clean(m.querySelector("#kn-text").value).slice(0, 16), err = m.querySelector("#kn-err");
    if (A.ng(text)) { err.textContent = "その言葉は書けません"; return; }
    const btn = m.querySelector("#kn-go"); btn.disabled = true; err.textContent = "";
    try {
      const r = await fetch(`${API}/kenno`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, name: A.getName(), gan, text }) }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
      if (!r.ok) { err.textContent = r.error && r.error !== "?" ? r.error : "献灯所はまもなく開きます。少し時間をおいてください"; return; }
      m.hidden = true; m.querySelector("#kn-text").value = ""; await load();
      A.store.set("enishi_kenno_light", A.today());
      A.chime(); A.net?.act("kenno"); A.deedHook("kenno");
      A.toast("🏮 あなたの灯りが献灯所に灯りました。金色の灯りがあなたのものです", 4600);
    } catch { err.textContent = "いまは奉納できませんでした。少し時間をおいてください"; }
    finally { btn.disabled = false; }
  };
  return { open, reload: load };
}
