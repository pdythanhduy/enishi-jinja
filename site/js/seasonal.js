// 季節の行事：日本時間の暦で、境内に飾りと「できること」を足す。
// 七五三（11月）・初詣（1月1〜7日）・受験の季節（1月8日〜3月15日）。?event=753|hatsumode|juken で試せる。
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
  return { events };
}
