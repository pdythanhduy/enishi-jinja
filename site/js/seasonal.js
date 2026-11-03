// 季節の行事：日本時間の暦で、境内に飾りと「できること」を足す。
// いまは七五三（11月）。初詣・節分なども同じ形で足していける。
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
function chitoseStand(scene, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 }), cloth = new THREE.MeshStandardMaterial({ color: 0xc8281e, roughness: 0.9 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), wood); top.position.y = 0.85; g.add(top);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.8, 0.82), cloth); skirt.position.y = 0.43; g.add(skirt);
  const c = document.createElement("canvas"); c.width = 64; c.height = 160; const x2 = c.getContext("2d");
  x2.fillStyle = "#fbf6ea"; x2.fillRect(0, 0, 64, 160); x2.fillStyle = "#c8281e"; x2.fillRect(0, 0, 64, 18); x2.fillRect(0, 142, 64, 18);
  x2.fillStyle = "#2b6a3a"; x2.beginPath(); x2.arc(32, 52, 12, 0, 7); x2.fill(); x2.fillStyle = "#c8281e"; x2.font = font(22); x2.textAlign = "center"; x2.fillText("千歳", 32, 96); x2.fillText("飴", 32, 124);
  const bagT = new THREE.CanvasTexture(c); bagT.colorSpace = THREE.SRGBColorSpace;
  const bagM = new THREE.MeshStandardMaterial({ map: bagT, roughness: 0.85 });
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.06), bagM); b.position.set(-0.72 + i * 0.24, 1.1, -0.1 + (i % 2) * 0.12); b.rotation.y = (i % 3 - 1) * 0.12; g.add(b); }
  const sign = document.createElement("canvas"); sign.width = 256; sign.height = 64; const s = sign.getContext("2d");
  s.fillStyle = "#2a1d14"; s.fillRect(0, 0, 256, 64); s.fillStyle = "#f3d999"; s.font = font(30); s.textAlign = "center"; s.textBaseline = "middle"; s.fillText("七五三 千歳飴", 128, 34);
  const st = new THREE.CanvasTexture(sign); st.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: st })); board.position.set(0, 1.6, -0.36); g.add(board);
  for (const sx of [-0.85, 0.85]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6), wood); p.position.set(sx, 1.3, -0.36); g.add(p); }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
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
  return { events };
}
