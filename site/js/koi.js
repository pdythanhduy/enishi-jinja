// 鯉：模様（紅白・大正三色・昭和三色・黄金・丹頂・浅黄・茶鯉）、体をくねらせて泳ぐ。
// 行き先を池の中から選びつづけ、餌をもらうとその場所に集まってくる。
import * as THREE from "three";

const KINDS = ["kohaku", "sanke", "showa", "ogon", "tancho", "asagi", "chagoi", "kohaku", "sanke", "ogon"];
function patternTex(kind) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 64; const x = c.getContext("2d");
  const base = { kohaku: "#f7f3ea", sanke: "#f7f3ea", showa: "#1d1b1a", ogon: "#e9b84a", tancho: "#f7f3ea", asagi: "#7f98a8", chagoi: "#8a5a32" }[kind];
  x.fillStyle = base; x.fillRect(0, 0, 128, 64);
  const blot = (col, n, rmin, rmax, v0 = 0.05, v1 = 0.9) => { x.fillStyle = col; for (let i = 0; i < n; i++) { const u = Math.random() * 128, v = (v0 + Math.random() * (v1 - v0)) * 64; x.beginPath(); x.ellipse(u, v, rmin + Math.random() * (rmax - rmin), (rmin + Math.random() * (rmax - rmin)) * 0.8, Math.random() * 3, 0, 7); x.fill(); } };
  if (kind === "kohaku") blot("#d8401c", 7, 8, 18);
  if (kind === "sanke") { blot("#d8401c", 6, 7, 15); blot("#1d1b1a", 9, 2, 5); }
  if (kind === "showa") { blot("#d8401c", 6, 7, 15); blot("#f7f3ea", 6, 5, 12); }
  if (kind === "tancho") { x.fillStyle = "#d8401c"; x.beginPath(); x.arc(64, 6, 7, 0, 7); x.fill(); }
  if (kind === "asagi") { x.fillStyle = "rgba(232,110,40,.85)"; x.fillRect(0, 0, 128, 10); x.fillRect(0, 54, 128, 10); }
  if (kind === "ogon") { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, "rgba(255,240,180,.5)"); g.addColorStop(1, "rgba(160,110,20,.3)"); x.fillStyle = g; x.fillRect(0, 0, 128, 64); }
  // うろこ（細かい網目）
  x.strokeStyle = "rgba(0,0,0,.07)"; for (let i = 0; i < 128; i += 5) for (let j = 10; j < 60; j += 5) { x.beginPath(); x.arc(i, j, 3, 0, Math.PI); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeKoi(kind, size) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ map: patternTex(kind), roughness: kind === "ogon" ? 0.25 : 0.45, metalness: kind === "ogon" ? 0.5 : 0.05 });
  const finCol = { kohaku: 0xf2e6da, sanke: 0xf2e6da, showa: 0x3a3330, ogon: 0xf0c860, tancho: 0xf2e6da, asagi: 0x9fb0b8, chagoi: 0x9a6a3a }[kind];
  const fin = new THREE.MeshStandardMaterial({ color: finCol, transparent: true, opacity: 0.72, side: THREE.DoubleSide, roughness: 0.6, depthWrite: false });
  const bodyG = new THREE.SphereGeometry(1, 18, 12); bodyG.rotateX(Math.PI / 2);
  const front = new THREE.Mesh(bodyG, skin); front.scale.set(0.12, 0.09, 0.26); front.position.z = 0.1; g.add(front);
  const mid = new THREE.Group(); mid.position.z = -0.02; g.add(mid);
  const back = new THREE.Mesh(bodyG, skin); back.scale.set(0.1, 0.075, 0.2); back.position.z = -0.12; mid.add(back);
  const tail = new THREE.Group(); tail.position.z = -0.28; mid.add(tail);
  const ped = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 10), skin); ped.rotation.x = -Math.PI / 2; ped.position.z = -0.04; tail.add(ped);
  const ts = new THREE.Shape(); ts.moveTo(0, 0); ts.quadraticCurveTo(0.16, -0.06, 0.2, -0.24); ts.quadraticCurveTo(0.05, -0.17, 0, -0.2); ts.quadraticCurveTo(-0.05, -0.17, -0.2, -0.24); ts.quadraticCurveTo(-0.16, -0.06, 0, 0);
  const caudal = new THREE.Mesh(new THREE.ShapeGeometry(ts, 8), fin); caudal.rotation.x = -Math.PI / 2; caudal.position.z = -0.1; tail.add(caudal);
  const dors = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.14), fin); dors.rotation.set(0, Math.PI / 2, 0); dors.scale.y = 1; const dsh = new THREE.Shape(); dsh.moveTo(0, 0); dsh.quadraticCurveTo(0.05, 0.07, 0.16, 0.0); dsh.lineTo(0, 0);
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(dsh, 6), fin); dorsal.rotation.y = Math.PI / 2; dorsal.position.set(0, 0.075, 0.08); g.add(dorsal);
  const pecs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.1, -0.03, 0.18); g.add(p);
    const pf = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10, 0, Math.PI), fin); pf.rotation.set(-Math.PI / 2, 0, s * -Math.PI / 2); pf.position.x = s * 0.02; p.add(pf); return p; });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 })); e.position.set(s * 0.085, 0.03, 0.3); g.add(e); }
  g.scale.setScalar(size);
  g.traverse((o) => o.isMesh && (o.castShadow = false));
  return { g, mid, tail, pecs };
}

export function koiSchool(scene, pond, n = 12) {
  const fish = [];
  const inside = (x, z, k = 0.82) => ((x - pond.cx) / pond.rx) ** 2 + ((z - pond.cz) / pond.rz) ** 2 < k * k;
  const pickTarget = () => { for (;;) { const x = pond.cx + (Math.random() * 2 - 1) * pond.rx, z = pond.cz + (Math.random() * 2 - 1) * pond.rz; if (inside(x, z, 0.78)) return [x, z]; } };
  for (let i = 0; i < n; i++) {
    const kind = KINDS[i % KINDS.length], size = 1.0 + Math.random() * 0.7, k = makeKoi(kind, size);
    const [x, z] = pickTarget(); k.g.position.set(x, pond.y - 0.32 - Math.random() * 0.25, z); scene.add(k.g);
    fish.push({ ...k, h: Math.random() * 6.283, sp: 0.35 + Math.random() * 0.3, target: pickTarget(), ph: Math.random() * 6, depth: k.g.position.y, boost: 1, feed: null });
  }
  const update = (t, dt) => {
    for (const f of fish) {
      const p = f.g.position;
      if (f.boost > 1.02 && f.feed) f.target = [f.feed[0] + Math.sin(f.ph) * 0.8, f.feed[1] + Math.cos(f.ph) * 0.6];
      else if (Math.hypot(f.target[0] - p.x, f.target[1] - p.z) < 0.5 || Math.random() < 0.002) f.target = pickTarget();
      const want = Math.atan2(f.target[0] - p.x, f.target[1] - p.z);
      let d = ((want - f.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI; const turn = 1.4 * dt * f.boost;
      f.h += Math.max(-turn, Math.min(turn, d));
      const sp = f.sp * f.boost * (0.6 + 0.4 * Math.abs(Math.cos(d)));
      const nx = p.x + Math.sin(f.h) * sp * dt, nz = p.z + Math.cos(f.h) * sp * dt;
      if (inside(nx, nz, 0.9)) { p.x = nx; p.z = nz; } else f.target = pickTarget();
      f.g.rotation.y = f.h;
      p.y = f.depth + Math.sin(t * 0.6 + f.ph) * 0.03 + (f.boost > 1.5 ? 0.18 : 0);       // 餌の時は水面近くへ
      const w = t * (4 + sp * 6) + f.ph, amp = 0.25 + sp * 0.5;
      f.mid.rotation.y = Math.sin(w) * amp * 0.35; f.tail.rotation.y = Math.sin(w - 1.1) * amp;
      f.pecs.forEach((pc, i) => (pc.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 3 + f.ph) * 0.25)));
      f.boost = Math.max(1, f.boost - dt * 0.35);
    }
  };
  // 餌をまく：近くの鯉が集まる
  const feed = (x, z) => { for (const f of fish) { f.boost = 3.2; f.feed = [x, z]; } };
  return { fish, update, feed };
}
