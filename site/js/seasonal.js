// 季節の行事：日本時間の暦で、境内に飾りと「できること」を足す。
// 七五三（11月）・年越の大祓（12月20〜31日）・除夜の鐘（大晦日の夜）・初詣（1月1〜7日）・受験の季節（1月8日〜3月15日）。
// ?event=753|oharae|joya|hatsumode|juken で試せる（joya は 23:57:40 から始まる）。
import * as THREE from "three";

const jstNow = () => new Date(Date.now() + 9 * 3600e3);
const font = (px, b = "bold") => `${b} ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;

function banner(scene, x, z, text, col = "#c8281e") {
  const c = document.createElement("canvas"); c.width = 96; c.height = 420; const g = c.getContext("2d");
  g.fillStyle = col; g.fillRect(0, 0, 96, 420); g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, 96, 26);
  g.fillStyle = "#fff"; g.font = font(54); g.textAlign = "center"; g.textBaseline = "top"; [...text].forEach((ch, i) => g.fillText(ch, 48, 40 + i * 62));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 5.2, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); pole.position.y = 2.6; grp.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.5), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(0.42, 3.3, 0); grp.add(flag);
  grp.userData.flag = flag; return grp;
}
// 千歳飴の台：紅白の袋を並べる
function chitoseStand(scene, x, z, ry, { sign: signText = "七五三 千歳飴", bag = ["千歳", "飴"], cloth: clothC = 0xc8281e } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }), cloth = new THREE.MeshStandardMaterial({ color: clothC, roughness: 0.9 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), wood); top.position.y = 0.85; g.add(top);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.8, 0.82), cloth); skirt.position.y = 0.43; g.add(skirt);
  const c = document.createElement("canvas"); c.width = 64; c.height = 160; const x2 = c.getContext("2d");
  x2.fillStyle = "#fbf6ea"; x2.fillRect(0, 0, 64, 160); x2.fillStyle = "#c8281e"; x2.fillRect(0, 0, 64, 18); x2.fillRect(0, 142, 64, 18);
  x2.fillStyle = "#2b6a3a"; x2.beginPath(); x2.arc(32, 52, 12, 0, 7); x2.fill(); x2.fillStyle = "#c8281e"; x2.font = font(22); x2.textAlign = "center"; bag.forEach((t, k) => x2.fillText(t, 32, 96 + k * 26));
  const bagT = new THREE.CanvasTexture(c); bagT.colorSpace = THREE.SRGBColorSpace;
  const bagM = new THREE.MeshStandardMaterial({ map: bagT, roughness: 0.85 });
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.06), bagM); b.position.set(-0.72 + i * 0.24, 1.1, -0.1 + (i % 2) * 0.12); b.rotation.y = (i % 3 - 1) * 0.12; g.add(b); }
  const sign = document.createElement("canvas"); sign.width = 256; sign.height = 64; const s = sign.getContext("2d");
  s.fillStyle = "#2a1d14"; s.fillRect(0, 0, 256, 64); s.fillStyle = "#f3d999"; s.font = font(30); s.textAlign = "center"; s.textBaseline = "middle"; s.fillText(signText, 128, 34);
  const st = new THREE.CanvasTexture(sign); st.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: st })); board.position.set(0, 1.6, -0.36); g.add(board);
  for (const sx of [-0.85, 0.85]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), wood); p.position.set(sx, 1.3, -0.36); g.add(p); }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

// 門松：三本の青竹（斜めに切る）と松・梅、藁の袴
function kadomatsu(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const take = new THREE.MeshStandardMaterial({ color: 0x5f8f3a, roughness: 0.45 }), cut = new THREE.MeshStandardMaterial({ color: 0xd8e2a8, roughness: 0.7 });
  [[0, 1.55, 0], [-0.17, 1.2, 0.1], [0.17, 1.0, 0.08]].forEach(([dx, h, dz]) => {
    const geo = new THREE.CylinderGeometry(0.08, 0.08, h, 14, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, h / 2 - 0.12 + p.getZ(i) * 1.5);   // 斜めの切り口
    geo.computeVertexNormals(); const b = new THREE.Mesh(geo, [take, cut, take]); b.position.set(dx, h / 2 + 0.25, dz); b.castShadow = true; g.add(b);
  });
  const waraM = new THREE.MeshStandardMaterial({ color: 0xc8a960, roughness: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.55, 18), waraM); base.position.y = 0.27; g.add(base);
  for (const y of [0.12, 0.42]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 6, 20), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const pine = new THREE.MeshStandardMaterial({ color: 0x2c5a2c, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), pine); l.scale.set(1, 0.6, 1); l.position.set(Math.cos(a) * 0.3, 0.68 + (i % 2) * 0.1, Math.sin(a) * 0.3); g.add(l); }
  const ume = new THREE.MeshStandardMaterial({ color: 0xe0506a, emissive: 0x501020, emissiveIntensity: 0.3 });
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), ume); f.position.set(Math.cos(i * 1.7) * 0.32, 0.85 + Math.sin(i) * 0.06, Math.sin(i * 1.7) * 0.32); g.add(f); }
  return g;
}

// 茅の輪：茅を束ねた大きな輪と、両脇の青竹・しめ縄・作法の立て札
function chinowa(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const c = document.createElement("canvas"); c.width = 64; c.height = 64; const q = c.getContext("2d");
  for (let i = 0; i < 64; i += 4) { q.fillStyle = `hsl(${60 + Math.random() * 18},${32 + Math.random() * 14}%,${30 + Math.random() * 16}%)`; q.fillRect(i, 0, 4, 64); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 3); tex.colorSpace = THREE.SRGBColorSpace;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.3, 12, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })); ring.position.y = 2.32; ring.castShadow = true; g.add(ring);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, b = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 16), new THREE.MeshStandardMaterial({ color: 0xc8b070, roughness: 1 }));   // 縛り
    b.position.set(Math.cos(a) * 2.0, 2.32 + Math.sin(a) * 2.0, 0); b.rotation.y = Math.PI / 2; b.rotation.x = a; g.add(b); }
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x6a8a3a, roughness: 0.5 }), leaf = new THREE.MeshStandardMaterial({ color: 0x4f7a2e, roughness: 0.9, flatShading: true });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 5.0, 10), bamboo); p.position.set(s * 2.5, 2.5, 0); p.castShadow = true; g.add(p);
    for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), leaf); l.scale.set(1, 0.5, 0.6); l.position.set(s * 2.5 + Math.sin(k * 2) * 0.25, 5.0 + k * 0.12, Math.cos(k * 2) * 0.2); g.add(l); } }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8), new THREE.MeshStandardMaterial({ color: 0xd8c99a, roughness: 1 })); rope.rotation.z = Math.PI / 2; rope.position.y = 4.6; g.add(rope);
  const shide = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 });
  for (const sx of [-1.6, -0.55, 0.55, 1.6]) for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), shide); p.position.set(sx + (k % 2 ? 0.07 : -0.07), 4.42 - k * 0.18, 0.02); p.rotation.z = (k % 2 ? 1 : -1) * 0.3; g.add(p); }
  const sg = document.createElement("canvas"); sg.width = 160; sg.height = 300; const t = sg.getContext("2d"); t.fillStyle = "#efe6d0"; t.fillRect(0, 0, 160, 300); t.fillStyle = "#2a1d14";
  t.font = font(30); t.textAlign = "center"; [..."茅の輪くぐり"].forEach((ch, i) => t.fillText(ch, 108, 44 + i * 36)); t.font = font(18, "");
  ["左まわり", "右まわり", "左まわり", "そしてくぐる"].forEach((s, i) => t.fillText(`${i + 1} ${s}`, 46, 70 + i * 52));
  const st = new THREE.CanvasTexture(sg); st.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.5), new THREE.MeshStandardMaterial({ map: st })); board.position.set(-3.6, 1.35, 1.2); board.rotation.y = 0.4; g.add(board);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), bamboo); leg.position.set(-3.6, 0.5, 1.15); g.add(leg);
  // 人形の納め所（右手前の小さな案）
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.7 }), paper = new THREE.MeshStandardMaterial({ color: 0xfbfaf4, roughness: 0.9 });
  const an = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), wood); an.position.set(4.2, 0.8, 1.6); g.add(an);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.55), wood); l.position.set(4.2 + s * 0.55, 0.4, 1.6); g.add(l); }
  for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.3), paper); p.position.set(3.85 + (k % 3) * 0.2, 0.84 + Math.floor(k / 3) * 0.012, 1.55 + Math.floor(k / 3) * 0.05); g.add(p); }
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.3), wood); box.position.set(4.6, 0.98, 1.6); g.add(box);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}
// 人形（ひとがた）：名前を書き、体をなでて、三度息をかけ、納める（すべて端末の中だけ）
function hitogataModal(A) {
  const m = document.createElement("section"); m.className = "modal"; m.hidden = true;
  m.innerHTML = `<div class="sheet ht"><button class="x" type="button" data-x>✕</button><p class="kicker">TOSHIKOSHI NO OHARAE</p><h2>📜 人形で祓う</h2>
    <p class="sub ht-h"></p><canvas width="320" height="360" class="ht-cv"></canvas><div class="mg-bar"><i></i></div>
    <div class="row ht-row"><input class="ht-name" maxlength="8" placeholder="お名前" autocomplete="off"><button type="button" class="btn primary ht-go"></button></div>
    <p class="sub">名前はこの端末の中だけで使い、どこにも送りません。</p></div>`;
  document.body.appendChild(m);
  const cv = m.querySelector("canvas"), c = cv.getContext("2d"), bar = m.querySelector(".mg-bar i"), go = m.querySelector(".ht-go"), name = m.querySelector(".ht-name");
  let step = 0, rub = 0, breaths = 0, mist = [], raf = 0, fly = 0, last = null, resolve = null;
  const HINT = ["お名前を書いて「書く」を", "人形で、体をやさしくなでます（人形の上をなぞって）", "人形に、ふっと三度、息を吹きかけます", "けがれを人形に移しました。「納める」で、川へ流します"];
  function doll() {
    c.save(); c.translate(160, 200 - fly * 220); c.rotate(Math.sin(fly * 6) * 0.2 * fly); c.globalAlpha = 1 - fly;
    c.fillStyle = "#fffdf6"; c.strokeStyle = "#cfc6b0"; c.lineWidth = 2;
    c.beginPath(); c.arc(0, -110, 30, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-26, -80); c.lineTo(26, -80); c.lineTo(78, -40); c.lineTo(60, -26); c.lineTo(34, -46); c.lineTo(44, 120); c.lineTo(8, 120); c.lineTo(0, 40); c.lineTo(-8, 120); c.lineTo(-44, 120); c.lineTo(-34, -46); c.lineTo(-60, -26); c.lineTo(-78, -40); c.closePath(); c.fill(); c.stroke();
    if (step >= 1) { c.fillStyle = "#1a1612"; c.font = font(24); c.textAlign = "center"; [...(name.value || "参拝者")].slice(0, 8).forEach((ch, i) => c.fillText(ch, 0, -42 + i * 24)); }
    c.restore();
  }
  function draw() {
    c.clearRect(0, 0, 320, 360);
    const g = c.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, "#202a3c"); g.addColorStop(1, "#141a26"); c.fillStyle = g; c.fillRect(0, 0, 320, 360);
    if (step === 3 || fly > 0) { c.fillStyle = "rgba(120,170,200,.35)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(160, 330 - i * 6, 150 - i * 20, 10, 0, 0, 7); c.fill(); } }
    doll();
    mist = mist.filter((p) => (p.t -= 1) > 0); for (const p of mist) { c.fillStyle = `rgba(230,240,255,${p.t / 90})`; c.beginPath(); c.arc(p.x, p.y, 10 + (60 - p.t) * 0.4, 0, 7); c.fill(); p.x += p.vx; p.y += p.vy; }
    raf = requestAnimationFrame(draw);
  }
  const paint = () => { m.querySelector(".ht-h").textContent = HINT[Math.min(step, 3)]; go.textContent = ["書く", "なでています…", `ふっと息を（${breaths}/3）`, "納める"][step]; go.disabled = step === 1; name.disabled = step > 0;
    bar.style.width = `${[0, Math.min(1, rub / 900) * 33, 33 + breaths * 11, 100][step]}%`; };
  cv.onpointerdown = (e) => { last = [e.offsetX, e.offsetY]; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => { if (!last || step !== 1) return; rub += Math.hypot(e.offsetX - last[0], e.offsetY - last[1]); last = [e.offsetX, e.offsetY]; if (Math.random() < 0.3) A.noise?.(0.05, 3800, 0.02, "bandpass");
    if (rub > 900) { step = 2; A.tone?.([[784, 0.2]], 0.6, 0.04); } paint(); };
  cv.onpointerup = () => (last = null);
  go.onclick = () => {
    if (step === 0) { if (!name.value.trim()) name.value = A.getName(); step = 1; paint(); return; }
    if (step === 2) { breaths++; for (let i = 0; i < 14; i++) mist.push({ x: 160 + (Math.random() - 0.5) * 30, y: 330, vx: (Math.random() - 0.5) * 1.2, vy: -2.2 - Math.random() * 1.5, t: 60 + Math.random() * 30 }); A.noise?.(0.6, 900, 0.05, "lowpass");
      if (breaths >= 3) step = 3; paint(); return; }
    if (step === 3) { go.disabled = true; A.noise?.(1.4, 1600, 0.05, "highpass"); const t0 = performance.now();
      (function f() { fly = Math.min(1, (performance.now() - t0) / 2600); if (fly < 1) requestAnimationFrame(f); else finish(true); })(); }
  };
  function finish(ok) { cancelAnimationFrame(raf); m.hidden = true; const r = resolve; resolve = null; r?.(ok); }
  m.querySelector("[data-x]").onclick = () => finish(false);
  return () => new Promise((res) => { resolve = res; step = 0; rub = 0; breaths = 0; fly = 0; mist = []; name.value = A.getName(); paint(); m.hidden = false; draw(); });
}

export function setupSeasonal(A) {
  const d = jstNow(), m = d.getUTCMonth() + 1, day = d.getUTCDate(), force = new URLSearchParams(location.search).get("event");
  const events = [];
  // ---------------- 七五三（11月。15日が七五三の日）
  if (m === 11 || force === "753") {
    events.push("753");
    const flags = [banner(A.scene, -4.6, 46.6, "七五三詣"), banner(A.scene, 4.6, 46.6, "七五三詣", "#d4507a")];
    A.W.update.push((t) => flags.forEach((f, i) => { f.userData.flag.rotation.y = Math.sin(t * 1.3 + i) * 0.12; }));
    const stand = [14.6, 26.4];
    chitoseStand(A.scene, stand[0], stand[1] + 1.1, Math.PI);
    A.addAction({ id: "chitose", label: "🍬 千歳飴をいただく", at: stand, r: 2.2, run: () => A.chitose() });
    A.addGan("七五三・成長");
    const big = day === 15 ? "今日は七五三の日。" : "";
    setTimeout(() => A.toast(`🎎 ${big}11月は七五三。お子さまの健やかな成長を祈る月です。授与所の前で千歳飴を、本殿で「七五三・成長」の御祈祷を。`, 6500), 7000);
  }
  // ---------------- 初詣（1月1日〜7日）：門松、のぼり、甘酒の振る舞い
  if ((m === 1 && day <= 7) || force === "hatsumode") {
    events.push("hatsumode");
    const flags = [banner(A.scene, -4.6, 46.6, "初詣"), banner(A.scene, 4.6, 46.6, "迎春", "#b8281c")];
    A.W.update.push((t) => flags.forEach((f, i) => { f.userData.flag.rotation.y = Math.sin(t * 1.3 + i) * 0.12; }));
    for (const sx of [-1, 1]) kadomatsu(A.scene, sx * 3.0, 49.2);
    const stand = [14.6, 26.4];
    chitoseStand(A.scene, stand[0], stand[1] + 1.1, Math.PI, { sign: "甘酒 振る舞い", bag: ["甘", "酒"], cloth: 0xf2efe6 });
    A.addAction({ id: "amazake", label: "🍶 甘酒をいただく", at: stand, r: 2.2, run: () => A.amazake() });
    A.addGan("初詣・一年の幸");
    setTimeout(() => A.toast("🎍 あけましておめでとうございます。初詣の参拝、ようこそ。授与所の前で甘酒の振る舞いを、本殿で新年の御祈祷を。", 7000), 2500);
  }
  // ---------------- 受験の季節（1月8日〜3月15日）：合格の社にのぼり
  if ((m === 1 && day >= 8) || m === 2 || (m === 3 && day <= 15) || force === "juken") {
    events.push("juken");
    const flags = [banner(A.scene, 28.6, 18.6, "合格祈願", "#2c4a8a"), banner(A.scene, 37.4, 18.6, "必勝祈願", "#2c4a8a")];
    A.W.update.push((t) => flags.forEach((f, i) => { f.userData.flag.rotation.y = Math.sin(t * 1.2 + i) * 0.12; }));
    setTimeout(() => A.toast("🌸 受験の季節です。合格の社で撫で牛を撫で、筆塚に手を合わせて。御祈祷は「合格祈願」で。", 6500), 4000);
  }
  // ---------------- 年越の大祓（12月20日〜31日）：茅の輪くぐりと人形
  const joyaForce = force === "joya";
  if ((m === 12 && day >= 20) || force === "oharae" || joyaForce) {
    events.push("oharae");
    const RX = 0, RZ = 28; chinowa(A.scene, RX, RZ);
    const flags = [banner(A.scene, -4.6, 46.6, "年越の大祓", "#3a5a2e"), banner(A.scene, 4.6, 46.6, "茅の輪くぐり", "#3a5a2e")];
    A.W.update.push((t) => flags.forEach((f, i) => { f.userData.flag.rotation.y = Math.sin(t * 1.3 + i) * 0.12; }));
    const P = (dx, dz) => [RX + dx, RZ + dz];
    A.addAction({ id: "chinowa", label: "🌾 茅の輪をくぐる", at: P(0, 3.2), r: 1.9, run: () => A.doing(async () => {
      await A.walk(P(0, 3.2)); A.me.rotation.y = Math.PI; await A.bow();
      A.toast("「思ふこと みな尽きねとて 麻の葉を 切りに切りても 祓ひつるかな」と唱えながら、左・右・左と八の字に。", 6500);
      for (const [k, dir] of [[1, -1], [2, 1], [3, -1]]) {
        A.stepText(`${["", "一", "二", "三"][k]} ${dir < 0 ? "左まわり" : "右まわり"}`);
        for (const p of [P(0, -2.6), P(dir * 3.1, -2.2), P(dir * 3.5, 0.2), P(dir * 3.0, 2.6), P(0, 3.2)]) await A.walk(p);
      }
      A.stepText("くぐる"); await A.walk(P(0, -2.8)); A.me.rotation.y = Math.PI; await A.bow(); A.stepText("");
      A.light(A.me.position.x, A.me.position.z); A.deedHook("chinowa");
      const first = A.once("chinowa"); if (first) A.addToku(5);
      A.toast(`🌾 茅の輪をくぐり、この一年のけがれを祓いました。清らかな心で、新しい年を。${first ? "（徳 +5）" : ""}`, 6000);
    }) });
    const hitogata = hitogataModal(A);
    A.addAction({ id: "hitogata", label: "📜 人形で祓う", at: P(4.2, 3.0), r: 1.6, run: () => A.doing(async () => {
      await A.walk(P(4.2, 3.0)); A.me.rotation.y = Math.PI;
      if (!(await hitogata())) return;
      A.light(A.me.position.x, A.me.position.z); A.deedHook("hitogata");
      const first = A.once("hitogata"); if (first) A.addToku(5);
      A.toast(`📜 人形がけがれを持って、川へ流れていきました。${first ? "（徳 +5）" : ""}`, 5000);
    }) });
    A.addGan("年越の大祓・厄除け");
    if (!joyaForce) setTimeout(() => A.toast("🌾 年の瀬です。本殿へ向かう境内に、茅の輪が立ちました。八の字にくぐって、一年のけがれを祓いましょう。", 6500), 3000);
  }
  // ---------------- 除夜の鐘と年越し（12月31日22時〜1月1日1時）：遠くのお寺の鐘、みんなで同じ数を数える
  {
    const shift = joyaForce ? Date.UTC(d.getUTCFullYear(), 11, 31, 23, 57, 40) - d.getTime() : 0;
    const now = () => new Date(Date.now() + 9 * 3600e3 + shift);
    const inJoya = (t) => (t.getUTCMonth() === 11 && t.getUTCDate() === 31 && t.getUTCHours() >= 22) || (t.getUTCMonth() === 0 && t.getUTCDate() === 1 && t.getUTCHours() < 1);
    if (inJoya(now())) {
      events.push("joya");
      const chip = document.createElement("div"); chip.id = "joya"; document.body.appendChild(chip);
      const cd = document.createElement("div"); cd.id = "joya-cd"; cd.hidden = true; document.body.appendChild(cd);
      let lastN = -1, fired = false;
      const count = (t) => { if (t.getUTCMonth() === 0) return 108; const s = (t.getUTCHours() - 23) * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds(); return s < 0 ? 0 : Math.min(107, Math.floor(s / 33) + 1); };
      const bell = () => { A.tone?.([[82, 0.9], [164, 0.45], [247, 0.22], [329, 0.1], [83.5, 0.5]], 9, 0.2); };
      const iv = setInterval(() => {
        const t = now(); if (!inJoya(t)) { chip.remove(); cd.remove(); clearInterval(iv); return; }
        const n = count(t);
        if (n !== lastN) { if (lastN >= 0 && n > lastN && !document.hidden) bell(); lastN = n; }
        chip.innerHTML = n ? `🔔 除夜の鐘 <b>${n}</b> / 108 <small>遠くのお寺から</small>` : "🔔 23時から、遠くのお寺で除夜の鐘がはじまります";
        const toMid = t.getUTCMonth() === 11 ? (24 * 3600 - (t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds())) : -1;
        if (toMid > 0 && toMid <= 10) { cd.hidden = false; cd.textContent = String(toMid); cd.className = ""; void cd.offsetWidth; cd.className = "tick"; }
        else if (toMid <= 0 && !fired && t.getUTCMonth() === 0) {
          fired = true; cd.hidden = false; cd.className = "new"; cd.innerHTML = `<small>${t.getUTCFullYear()}</small>あけまして<br>おめでとうございます`;
          bell(); A.chime?.(); A.fireworks.on = true; for (let k = 0; k < 6; k++) setTimeout(() => A.fireworks.burst(-20 + k * 8, 34 + Math.random() * 8, -20 - Math.random() * 15), k * 400);
          setTimeout(() => (cd.hidden = true), 9000); setTimeout(() => (A.fireworks.on = false), 4 * 60e3);
          A.toast("🎍 新しい年になりました。今年もえにし神社で、よいご縁がありますように。", 8000);
        } else if (toMid > 10) cd.hidden = true;
      }, 1000);
      setTimeout(() => A.toast("🔔 大晦日の夜です。遠くのお寺から、除夜の鐘が聞こえてきます。0時には、みんなで新年を。", 6500), 4000);
    }
  }
  return { events };
}
