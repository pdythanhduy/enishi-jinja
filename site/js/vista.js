// 遠景：見晴らし台の南に谷の町と縁の浦（海）、まわりを幾重にも山並み。北には神社の御神体の山「縁の峰」。
// 朝は谷に雲海、夜は町に灯り。遠いので霧がかかり、季節で田畑と山頂の雪が変わる。
import * as THREE from "three";
import { MONZEN } from "./map.js?v=11041231";

const VY = MONZEN.valley;                     // 谷の高さ（見晴らし台の崖の下）
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
// 海岸線：南へ 330m ほど。ゆるい入り江（縁の浦）
export const coastZ = (x) => 330 + 46 * Math.sin(x * 0.009 + 1.0) + 24 * Math.sin(x * 0.027) - 40 * Math.exp(-(((x - 60) / 90) ** 2));
// 縁の峰：北北西。奥の院の遥拝所から、磐座ごしに拝む
export const PEAK = { x: -230, z: -540, r: 190, h: 270 };
function valleyY(x, z) {
  const d = Math.hypot(x, z);
  let y = VY + Math.sin(x * 0.013) * Math.cos(z * 0.011) * 4 * smooth(150, 260, d) + smooth(260, 520, d) * 18 * (0.5 + 0.5 * Math.sin(x * 0.006 + z * 0.004));
  const c = coastZ(x); if (z > c - 4) y = Math.min(y, VY - 3 * smooth(c - 4, c + 10, z) - 0.5);   // 海の底へ
  return y;
}

export function buildVista(scene, env, { mobile = false, lite = false } = {}) {
  const root = new THREE.Group(); scene.add(root);
  const season = env.season;
  // ---------------------------------------------------------------- 谷の田畑と林
  const N = lite ? 90 : 140, S = 1500, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const field = { spring: [0x6f9a4a, 0x8fb35a, 0x9c8a5a], summer: [0x4f8a3a, 0x5f9a40, 0x6a8a3a], autumn: [0xc9a43a, 0xb98a32, 0x7a8a3a], winter: [0xc9cdd2, 0xb9bec4, 0x8a8f8a] }[season] || [0x5f9a40, 0x6f9a4a, 0x8a8a5a];
  const forest = new THREE.Color(season === "winter" ? 0x7d8a86 : season === "autumn" ? 0x7a4a2a : 0x2e4a30);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = valleyY(x, z); pos.setY(i, y);
    const cx = Math.floor(x / 26), cz = Math.floor(z / 18), r = hash(cx, cz);
    if (y > VY + 6) c.set(forest); else if (z > coastZ(x) - 6) c.set(0xcabf9a); else c.set(field[Math.floor(r * 3)]);
    c.offsetHSL(0, 0, (hash(x, z) - 0.5) * 0.04); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const valley = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); valley.receiveShadow = false; root.add(valley);

  // ---------------------------------------------------------------- 縁の浦（海）
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 900), new THREE.MeshStandardMaterial({ color: 0x2b5874, roughness: 0.28, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, VY - 0.4, 700); root.add(sea);

  // ---------------------------------------------------------------- 谷の町（屋根の家並み）と夜の灯り
  const houses = [], want = lite ? 220 : mobile ? 360 : 620;
  for (let k = 0; houses.length < want && k < want * 12; k++) {
    const x = (Math.random() - 0.5) * 520, z = 160 + Math.random() * 240;
    if (z > coastZ(x) - 14) continue;
    const road = Math.exp(-(((x - 18 * Math.sin(z * 0.02)) / 70) ** 2)), near = Math.exp(-(((z - 190) / 90) ** 2));   // 参道の石段から海へ下る道ぞいに家が多い
    if (Math.random() > 0.15 + 0.85 * Math.max(road, near * 0.6)) continue;
    const y = valleyY(x, z); if (y > VY + 3) continue;
    houses.push([x, y, z, 5 + Math.random() * 5, 3 + Math.random() * 2.5, 5 + Math.random() * 4, Math.random() * Math.PI]);
  }
  const bodyM = new THREE.MeshLambertMaterial({ color: 0xffffff }), roofM = new THREE.MeshLambertMaterial({ color: 0x3e434c });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bodyM, houses.length), roofs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 1, 4, 1).rotateY(Math.PI / 4), roofM, houses.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const wallCols = [0xe9e2d2, 0xd9cdb6, 0x8a6a4a, 0xf0ece2];
  houses.forEach(([x, y, z, w, h, d, ry], i) => {
    q.setFromAxisAngle(up, ry); m4.compose(v.set(x, y + h / 2, z), q, sc.set(w, h, d)); bodies.setMatrixAt(i, m4); bodies.setColorAt(i, c.set(wallCols[i % 4]));
    m4.compose(v.set(x, y + h + 1.1, z), q, sc.set(w * 1.15, 2.2, d * 1.15)); roofs.setMatrixAt(i, m4);
  });
  root.add(bodies, roofs);
  // 夜の灯り（家の半分ほど）
  const lp = []; houses.forEach(([x, y, z, w, h], i) => { if (i % 2 === 0) lp.push(x, y + h * 0.6, z); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const dot = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 32; const x = cv.getContext("2d"), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,230,170,1)"); gr.addColorStop(0.4, "rgba(255,170,80,.6)"); gr.addColorStop(1, "rgba(255,150,60,0)"); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cv); })();
  const lightsM = new THREE.PointsMaterial({ size: 7, map: dot, transparent: true, depthWrite: false, opacity: 0, fog: false, blending: THREE.AdditiveBlending });
  const lights = new THREE.Points(lg, lightsM); root.add(lights);

  // ---------------------------------------------------------------- 山並み（三重）。南は海へひらける
  const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  function ridge(R, H, seed, color, snow) {
    const SEG = 220, rows = [[R + 40, VY - 10, 0], [R, 0.55, 0.55], [R - 34, 1, 1]], P = [], C = [], I = [], base = new THREE.Color(color), top = new THREE.Color(snow ? 0xf2f4f7 : color).lerp(new THREE.Color(0xffffff), snow ? 0 : 0.08);
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2, open = 1 - 0.9 * Math.exp(-((angDiff(a, Math.PI) / 0.8) ** 2));   // a=0 北、a=π 南（海）
      const hh = H * open * (0.55 + 0.25 * Math.sin(a * 3 + seed) + 0.15 * Math.sin(a * 7.3 + seed * 2) + 0.08 * Math.sin(a * 17 + seed * 3));
      for (const [r, f] of rows) {
        const y = f === VY - 10 ? VY - 10 : VY + hh * f; P.push(Math.sin(a) * r, y, -Math.cos(a) * r);
        const cc = base.clone().lerp(top, f === VY - 10 ? 0 : f > 0.9 && snow && hh > H * 0.62 ? 1 : f * 0.12); C.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < SEG; i++) for (let r = 0; r < 2; r++) { const a = i * 3 + r, b = a + 3; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); gg.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); gg.setIndex(I); gg.computeVertexNormals();
    const m = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); root.add(m); return m;
  }
  const winter = season === "winter";
  ridge(420, 95, 1.3, winter ? 0x8b9a98 : 0x2f4a3a, false);
  ridge(540, 150, 4.1, winter ? 0x9aa6b0 : 0x405a5e, winter);
  ridge(680, 230, 2.2, 0x5f7488, true);

  // ---------------------------------------------------------------- 縁の峰（御神体の山）
  { const gg = new THREE.ConeGeometry(PEAK.r, PEAK.h, 64, 14, true), p = gg.attributes.position, cc = [], k = new THREE.Color();
    const rock = new THREE.Color(0x58606a), wood = new THREE.Color(winter ? 0x6f7d7a : 0x2f4a34), snowC = new THREE.Color(0xf4f6f9), snowLine = winter ? 0.42 : 0.72;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = (y + PEAK.h / 2) / PEAK.h, a = Math.atan2(z, x);
      const n = 1 + (0.08 * Math.sin(a * 5 + f * 6) + 0.05 * Math.sin(a * 11 - f * 9)) * (1 - f) + (f > 0.95 ? 0 : 0);
      p.setX(i, x * n); p.setZ(i, z * n);
      const sn = f > snowLine + 0.06 * Math.sin(a * 7) ? 1 : 0; k.copy(wood).lerp(rock, smooth(0.35, 0.7, f)); if (sn) k.copy(snowC); cc.push(k.r, k.g, k.b);
    }
    gg.setAttribute("color", new THREE.Float32BufferAttribute(cc, 3)); gg.computeVertexNormals();
    const peak = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true })); peak.position.set(PEAK.x, VY - 12 + PEAK.h / 2, PEAK.z); root.add(peak);
  }

  // ---------------------------------------------------------------- 雲海（夜明けから朝、谷に雲がたまる）
  const cloudTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const x = cv.getContext("2d");
    for (let i = 0; i < 40; i++) { const px = 20 + Math.random() * 88, py = 20 + Math.random() * 88, r = 14 + Math.random() * 22, gr = x.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
    return new THREE.CanvasTexture(cv); })();
  const clouds = [], cm = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false, fog: true });
  for (let i = 0; i < (lite ? 5 : 9); i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), cm); p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 6;
    const a = (i / 9) * Math.PI * 2; p.position.set(Math.sin(a) * (230 + Math.random() * 120), VY + 9 + Math.random() * 5, -Math.cos(a) * (230 + Math.random() * 120) + 60); root.add(p); clouds.push(p); }

  return {
    root,
    tick(t) {
      const h = env.hour ?? 12;
      lightsM.opacity = Math.min(1, (env.lamp ?? 0) * 1.1);
      cm.opacity = 0.75 * (smooth(4.5, 6, h) - smooth(8.5, 10.5, h));                      // 夜明けから十時ごろまで
      for (let i = 0; i < clouds.length; i++) clouds[i].rotation.z += 0.00004 * (i % 2 ? 1 : -1);
    },
  };
}
