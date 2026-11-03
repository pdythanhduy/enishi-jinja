// 建築：反りのある屋根、本殿、楼門、五重塔、太鼓橋、玉垣、鳥居、灯籠…（すべてプログラムで組み立てる）
import * as THREE from "three";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
export const MAT = {
  shu: std(0xd23a26, { roughness: 0.5 }), shuD: std(0xa82a1c, { roughness: 0.55 }), kuro: std(0x1c1a19, { roughness: 0.7 }),
  wood: std(0x6b4428), woodD: std(0x4a2e1c), woodL: std(0x9a6a3e), white: std(0xf3efe6, { roughness: 0.85 }), shoji: std(0xf7f1df, { emissive: 0xffd9a0, emissiveIntensity: 0.0 }),
  copper: std(0x3f7a68, { roughness: 0.55, metalness: 0.25 }), copperD: std(0x2d5a4c, { roughness: 0.6, metalness: 0.2 }), hinoki: std(0x5a3a2a, { roughness: 0.85 }),
  gold: std(0xe3b54a, { metalness: 0.9, roughness: 0.28 }), stone: std(0xcfc9bf, { roughness: 0.95 }), stoneD: std(0xa39e95, { roughness: 0.95 }), stoneL: std(0xe2ddd3, { roughness: 0.95 }),
  rope: std(0xd8c99a, { roughness: 1 }), paperW: std(0xffffff, { roughness: 0.9 }), tatami: std(0xb3ad76, { roughness: 0.95 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2f5e7a, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.92 }),
};
// 夜に灯る素材（環境から明るさを変える）
export const LIGHT_SPOTS = [];   // {obj, y, int, dist, color}：実際の光源は app 側のプールで近いものだけ点ける
export function lightSpot(obj, y, int, dist, color = 0xffa04a) { LIGHT_SPOTS.push({ obj, y, int, dist, color }); }
export function lampMat(color = 0xfff0d0, emissive = 0xffa040, base = 3) { const m = std(color, { emissive, emissiveIntensity: base, roughness: 0.9 }); m.userData.base = base; return m; }

export const box = (p, w, h, d, m, x, y, z, sh = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (sh) o.castShadow = o.receiveShadow = true; p.add(o); return o; };
export const cyl = (p, r1, r2, h, m, x, y, z, seg = 12, sh = true) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); o.position.set(x, y, z); if (sh) o.castShadow = o.receiveShadow = true; p.add(o); return o; };

// ------------------------------------------------------------------ 反りのある屋根（切妻を曲線で）
// w: 幅（x）、d: 奥行き（z）、h: 高さ、lift: 軒の反り上がり
export function roof(parent, { w, d, h, lift = 0.35, thick = 0.22, mat = MAT.copper, under = MAT.woodD, y = 0, x = 0, z = 0, gable = true, ridgeGold = true }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const half = d / 2;
  const shape = new THREE.Shape();
  // 断面（z-y平面）：軒先→棟→反対の軒先。凹んだ曲線で「反り」
  const N = 14, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, zz = -half + t * d, u = Math.abs(zz) / half;     // u: 0=棟, 1=軒
    const yy = h * (1 - Math.pow(u, 0.62)) + lift * Math.pow(u, 6);  // 反り
    top.push([zz, yy]); bot.push([zz, yy - thick * (1 - 0.3 * u)]);
  }
  shape.moveTo(top[0][0], top[0][1]); top.forEach(([a, b]) => shape.lineTo(a, b));
  [...bot].reverse().forEach(([a, b]) => shape.lineTo(a, b)); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
  // 軒裏（垂木の色）
  const ug = new THREE.ExtrudeGeometry(shape, { depth: w - 0.3, bevelEnabled: false }); ug.translate(0, -0.04, -(w - 0.3) / 2); ug.rotateY(Math.PI / 2);
  const um = new THREE.Mesh(ug, under); um.scale.set(1, 0.985, 0.995); g.add(um);
  // 棟と金の飾り
  box(g, w + 0.2, 0.32, 0.42, MAT.kuro, 0, h + 0.1, 0);
  if (ridgeGold) {
    for (const s of [-1, 1]) {      // 千木（交差する飾り）
      if (w > 12) for (const r of [-1, 1]) { const c = box(g, 0.12, 1.1, 0.12, MAT.gold, s * (w / 2 - 0.15), h + 0.55, r * 0.16); c.rotation.x = r * 0.42; }
    }
    for (let i = -2; i <= 2; i++) cyl(g, 0.11, 0.11, 0.7, MAT.gold, i * (w / 6), h + 0.38, 0, 10).rotation.x = Math.PI / 2;   // 鰹木
  }
  if (gable) for (const s of [-1, 1]) {    // 破風（妻の金の縁取り）
    const tri = new THREE.Shape(); tri.moveTo(-half * 0.92, 0); tri.lineTo(0, h * 0.92); tri.lineTo(half * 0.92, 0); tri.closePath();
    const tg = new THREE.ShapeGeometry(tri); const tm = new THREE.Mesh(tg, MAT.white); tm.rotation.y = s * Math.PI / 2; tm.position.set(s * (w / 2 - 0.25), 0.02, 0); g.add(tm);
    // 破風板：妻の斜めの縁に沿わせる（棟 (0,h) から 軒 (±half, lift) まで）
    const pts = top.map(([zz, yy]) => new THREE.Vector3(s * (w / 2 + 0.03), yy - thick * 0.45, zz));
    const bg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 6, false), MAT.gold); g.add(bg);
  }
  return g;
}

// ------------------------------------------------------------------ 鳥居
export function torii(parent, { x = 0, z = 0, y = 0, s = 1, ry = 0, gaku = "", mat = MAT.shu }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g); g.userData.static = true;
  const w = 3.6, h = 4.2;
  for (const xx of [-w / 2, w / 2]) { cyl(g, 0.17, 0.21, h, mat, xx, h / 2, 0, 16); cyl(g, 0.25, 0.25, 0.4, MAT.kuro, xx, 0.2, 0, 16); }
  box(g, w + 0.9, 0.22, 0.26, mat, 0, h - 0.7, 0);                          // 貫
  box(g, w + 1.4, 0.2, 0.34, mat, 0, h - 0.12, 0);                          // 島木
  const kasagi = new THREE.Shape();                                        // 反った笠木
  const L = (w + 2.0) / 2; kasagi.moveTo(-L, 0.25); kasagi.quadraticCurveTo(0, -0.05, L, 0.25); kasagi.lineTo(L, 0.55); kasagi.quadraticCurveTo(0, 0.22, -L, 0.55); kasagi.closePath();
  const kg = new THREE.ExtrudeGeometry(kasagi, { depth: 0.46, bevelEnabled: false }); kg.translate(0, 0, -0.23);
  const km = new THREE.Mesh(kg, MAT.kuro); km.position.y = h - 0.05; km.castShadow = true; g.add(km);
  if (gaku !== null) { box(g, 0.14, 0.7, 0.14, mat, 0, h - 0.4, 0); const gk = box(g, 0.75, 0.95, 0.08, MAT.kuro, 0, h - 0.42, 0.16); gk.userData.gaku = gaku; }
  return g;
}

// ------------------------------------------------------------------ 石灯籠
export function toro(parent, x, z, y = 0, env, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g); g.userData.static = true;
  cyl(g, 0.45, 0.55, 0.28, MAT.stoneD, 0, 0.14, 0, 6); cyl(g, 0.14, 0.17, 1.05, MAT.stone, 0, 0.8, 0, 12);
  cyl(g, 0.44, 0.3, 0.2, MAT.stone, 0, 1.42, 0, 6); box(g, 0.52, 0.44, 0.52, MAT.stone, 0, 1.73, 0);
  const fm = lampMat(0xffe2a8, 0xffa040, 2.4); box(g, 0.32, 0.27, 0.54, fm, 0, 1.73, 0, false); box(g, 0.54, 0.27, 0.32, fm, 0, 1.73, 0, false);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 6), MAT.stoneD); cap.position.y = 2.15; cap.castShadow = true; g.add(cap);
  cyl(g, 0.1, 0.1, 0.16, MAT.stone, 0, 2.42, 0, 10);
  lightSpot(g, 1.73 * scale, 5, 9);
  env && env.registerLamp(fm, null);
  g.userData.lamp = fm;
  return g;
}
// 提灯
export function chochin(parent, x, y, z, env, s = 1, col = 0xfff3d6) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const m = lampMat(col, 0xff9a3a, 1.8);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m); b.scale.y = 1.35; g.add(b);
  cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, 0.45, 0, 12, false); cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, -0.45, 0, 12, false);
  env && env.registerLamp(m, null);
  return g;
}

// ------------------------------------------------------------------ 本殿（大きな拝殿＋本殿、向拝、金の飾り）
export function honden(parent, env, { x = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  const W = 18, D = 12, F = 1.4;                                   // 幅・奥行き・床の高さ
  box(g, W + 2, F, D + 2, MAT.stoneD, 0, F / 2, 0);                 // 基壇
  box(g, W + 2.4, 0.15, D + 2.4, MAT.stoneL, 0, F + 0.05, 0);
  for (let i = 0; i < 7; i++) box(g, 7.4, 0.2, 0.5, MAT.stoneL, 0, 0.1 + i * 0.2, D / 2 + 1 + (6 - i) * 0.42);   // 正面の大階段
  box(g, W, 0.2, D, MAT.wood, 0, F + 0.2, 0);                      // 縁側の床
  // 柱（朱）
  const cols = [-8.6, -5.4, -2.6, 2.6, 5.4, 8.6];
  for (const cx of cols) for (const cz of [-D / 2 + 0.4, D / 2 - 0.4]) cyl(g, 0.3, 0.3, 4.8, MAT.shu, cx, F + 2.6, cz, 16);
  for (const cz of [-2, 2]) for (const cx of [-8.6, 8.6]) cyl(g, 0.3, 0.3, 4.8, MAT.shu, cx, F + 2.6, cz, 16);
  // 壁と蔀戸（白と朱）・内部の明かり
  box(g, W - 0.6, 4.6, 0.2, MAT.white, 0, F + 2.6, -D / 2 + 0.5);
  for (const s of [-1, 1]) box(g, 0.2, 4.6, D - 1, MAT.white, s * (W / 2 - 0.5), F + 2.6, 0);
  for (const cx of [-4, 0, 4]) { const sh = box(g, 3.2, 2.8, 0.1, MAT.shoji, cx, F + 2.0, -D / 2 + 0.62, false); sh.material = MAT.shoji; }
  // 欄間・頭貫（金の線）
  box(g, W + 0.2, 0.36, D + 0.2, MAT.shuD, 0, F + 5.15, 0);
  for (const zz of [-D / 2 - 0.12, D / 2 + 0.12]) box(g, W + 0.2, 0.1, 0.06, MAT.gold, 0, F + 5.05, zz, false);
  // 高欄（縁の手すり）
  for (const s of [-1, 1]) box(g, 0.12, 0.6, D, MAT.shu, s * (W / 2 + 0.6), F + 0.6, 0);
  box(g, (W - 7.4) / 2, 0.6, 0.12, MAT.shu, -(W / 2 - (W - 7.4) / 4 + 0.6) + 0.6, F + 0.6, D / 2 + 0.6);
  box(g, (W - 7.4) / 2, 0.6, 0.12, MAT.shu, (W / 2 - (W - 7.4) / 4 + 0.6) - 0.6, F + 0.6, D / 2 + 0.6);
  // 大屋根（二重）
  roof(g, { w: W + 5, d: D + 5, h: 4.2, lift: 0.7, y: F + 5.3, mat: MAT.copper });
  roof(g, { w: W - 4, d: D - 3, h: 3.0, lift: 0.5, y: F + 8.6, mat: MAT.copper });
  // 向拝（正面に張り出す屋根）
  for (const cx of [-3.4, 3.4]) cyl(g, 0.26, 0.26, 4.2, MAT.shu, cx, F + 2.3, D / 2 + 2.6, 16);
  roof(g, { w: 9, d: 4.6, h: 1.6, lift: 0.5, y: F + 4.4, z: D / 2 + 2.3, mat: MAT.copper, ridgeGold: false });
  box(g, 7.6, 0.3, 0.3, MAT.shuD, 0, F + 4.45, D / 2 + 2.6);
  box(g, 1.6, 1.1, 0.1, MAT.kuro, 0, F + 4.0, D / 2 + 2.78);      // 扁額
  // しめ縄と紙垂・大提灯
  const rope = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.26, 10, 40, Math.PI), MAT.rope); rope.rotation.z = Math.PI; rope.scale.y = 0.16; rope.position.set(0, F + 4.0, D / 2 + 2.85); g.add(rope);
  for (const xx of [-2.2, -0.8, 0.8, 2.2]) box(g, 0.24, 0.62, 0.02, MAT.paperW, xx, F + 3.45, D / 2 + 2.9, false);
  chochin(g, -5.2, F + 3.7, D / 2 + 1.6, env, 1.6); chochin(g, 5.2, F + 3.7, D / 2 + 1.6, env, 1.6);
  for (let i = -3; i <= 3; i++) if (i) chochin(g, i * 2.4, F + 4.7, D / 2 + 0.2, env, 0.75, 0xffe7b0);
  lightSpot(g, F + 3, 12, 18, 0xffb06a);
  hondenInterior(g, env, W, D, F);
  return { group: g, floorY: F + 0.3, front: z + D / 2 + 1 };
}

// 本殿の内陣：御簾・神鏡・御幣・鏡餅・榊・大太鼓・釣灯籠
function hondenInterior(g, env, W, D, F) {
  const y0 = F + 0.3, zb = -D / 2 + 1.0;
  // 内陣の壇（二段）と金の縁
  box(g, W - 5, 0.45, 2.6, MAT.woodD, 0, y0 + 0.22, zb + 0.9);
  box(g, W - 8, 0.45, 1.6, MAT.wood, 0, y0 + 0.67, zb + 0.5);
  for (const [w, yy, zz] of [[W - 5, y0 + 0.46, zb + 2.2], [W - 8, y0 + 0.91, zb + 1.3]]) box(g, w, 0.06, 0.06, MAT.gold, 0, yy, zz, false);
  // 神鏡（台つき）
  const mirM = new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 1, roughness: 0.06 });
  box(g, 0.5, 0.9, 0.3, MAT.kuro, 0, y0 + 1.35, zb + 0.4);
  const mir = cyl(g, 0.75, 0.75, 0.08, mirM, 0, y0 + 2.4, zb + 0.4, 40); mir.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 8, 40), MAT.gold); rim.position.set(0, y0 + 2.4, zb + 0.44); g.add(rim);
  // 御幣（金の紙垂）
  for (const s of [-1, 1]) {
    cyl(g, 0.04, 0.04, 2.0, MAT.woodL, s * 1.6, y0 + 1.9, zb + 0.5, 6);
    for (let k = 0; k < 4; k++) { const p = box(g, 0.22, 0.34, 0.02, k % 2 ? MAT.paperW : MAT.gold, s * 1.6 + (k % 2 ? 0.12 : -0.12), y0 + 2.75 - k * 0.3, zb + 0.5, false); p.rotation.z = (k % 2 ? 1 : -1) * 0.25; }
  }
  // 榊（左右）
  const sakM = std(0x2c5a2c, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    cyl(g, 0.12, 0.1, 0.5, MAT.white, s * 2.7, y0 + 1.15, zb + 0.6, 10);
    for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), sakM); l.scale.set(1, 0.55, 0.7); l.position.set(s * 2.7 + Math.sin(k * 2.3) * 0.2, y0 + 1.5 + k * 0.13, zb + 0.6 + Math.cos(k * 1.7) * 0.12); g.add(l); }
  }
  // 三方に鏡餅・お神酒
  const mochiM = std(0xfbf8f0, { roughness: 0.7 }), daiM = std(0xff8a1e, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    const cx = s * 3.9; box(g, 0.7, 0.35, 0.7, MAT.woodL, cx, y0 + 0.62, zb + 1.7);
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), mochiM); m1.scale.y = 0.5; m1.position.set(cx, y0 + 0.92, zb + 1.7); g.add(m1);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), mochiM); m2.scale.y = 0.55; m2.position.set(cx, y0 + 1.08, zb + 1.7); g.add(m2);
    const dd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), daiM); dd.position.set(cx, y0 + 1.22, zb + 1.7); g.add(dd);
    for (const dz of [-0.25, 0.25]) cyl(g, 0.08, 0.1, 0.36, MAT.white, s * 4.9, y0 + 0.62, zb + 1.7 + dz, 10);
  }
  // 御簾（すだれ）と紫の房
  const misuM = misuMat(6);
  const misu = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, 1.4), misuM); misu.position.set(0, F + 4.0, zb + 2.3); g.add(misu);
  box(g, W - 5.6, 0.14, 0.14, MAT.kuro, 0, F + 4.75, zb + 2.3, false);
  const fusaM = std(0x6a2a8a, { roughness: 0.8 });
  for (const s of [-1, 0, 1]) { const f = cyl(g, 0.02, 0.12, 0.7, fusaM, s * 3.2, F + 3.0, zb + 2.36, 8, false); }
  // 大太鼓（左手）
  const drumG = new THREE.Group(); drumG.position.set(-7.5, y0, -3.3); g.add(drumG);
  for (const s of [-1, 1]) { box(drumG, 0.12, 1.4, 0.12, MAT.woodD, s * 0.75, 0.7, 0); }
  box(drumG, 1.7, 0.12, 0.3, MAT.woodD, 0, 0.15, 0);
  const body = cyl(drumG, 0.62, 0.62, 0.9, std(0x7a3a1c, { roughness: 0.5 }), 0, 1.3, 0, 24); body.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const hd = cyl(drumG, 0.6, 0.6, 0.02, std(0xe9dcc0, { roughness: 0.8 }), s * 0.46, 1.3, 0, 24, false); hd.rotation.z = Math.PI / 2;
    const tm = new THREE.Mesh(new THREE.CircleGeometry(0.28, 3), std(0x1a1a1a)); tm.position.set(s * 0.475, 1.3, 0); tm.rotation.y = s * Math.PI / 2; drumG.add(tm); }
  drumG.rotation.y = 0.9;
  // 釣灯籠（青銅）：向拝の両脇の軒に
  for (const cx of [-7, -4.2, 4.2, 7]) tsuriDoro(g, cx, F + 4.75, D / 2 - 0.1);
  lightSpot(g, F + 2.5, 6, 10, 0xffc27a);
}

// 御簾の素材（すだれ＋紫の帯）
function misuMat(rep) {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 128; const x = cv.getContext("2d");
  for (let yy = 0; yy < 128; yy += 4) { x.fillStyle = `rgba(${150 + Math.random() * 30},${115 + Math.random() * 20},60,0.9)`; x.fillRect(0, yy, 64, 3); }
  x.fillStyle = "rgba(90,40,110,.95)"; for (const yy of [30, 90]) x.fillRect(0, yy, 64, 4);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(rep, 1);
  return new THREE.MeshStandardMaterial({ map: tx, transparent: true, opacity: 0.88, roughness: 0.9, side: THREE.DoubleSide });
}
// 釣灯籠（青銅）
const BRONZE = std(0x6f6a3a, { metalness: 0.7, roughness: 0.45 });
function tsuriDoro(g, cx, y, z, s = 1) {
  const tg = new THREE.Group(); tg.position.set(cx, y, z); tg.scale.setScalar(s); g.add(tg);
  cyl(tg, 0.015, 0.015, 0.5, BRONZE, 0, -0.2, 0, 4, false);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.25, 6), BRONZE); cap.position.y = -0.55; tg.add(cap);
  cyl(tg, 0.2, 0.2, 0.42, lampMat(0xfff0c8, 0xffa040, 2.0), 0, -0.88, 0, 6, false);
  cyl(tg, 0.24, 0.16, 0.1, BRONZE, 0, -1.14, 0, 6, false);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; box(tg, 0.03, 0.44, 0.03, BRONZE, Math.cos(a) * 0.21, -0.88, Math.sin(a) * 0.21, false); }
  return tg;
}
// 縦書きの掛け軸（壁に掛ける。rotY で向き）
function kakejiku(g, text, x, y, z, rotY, accent = "#b8321e") {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 320; const c = cv.getContext("2d");
  c.fillStyle = "#3a5a4a"; c.fillRect(0, 0, 128, 320);                       // 表装
  c.fillStyle = "#f4ecd8"; c.fillRect(14, 34, 100, 252);                      // 本紙
  c.fillStyle = "#1a1612"; c.font = `bold 50px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textAlign = "center"; c.textBaseline = "top";
  [...text].forEach((ch, i) => c.fillText(ch, 64, 46 + i * 58));
  c.fillStyle = accent; c.fillRect(80, 258, 18, 18);                          // 落款
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const sg = new THREE.Group(); sg.position.set(x, y, z); sg.rotation.y = rotY; g.add(sg);
  sg.add(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.55), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })));
  for (const dy of [0.79, -0.79]) { const r = cyl(sg, 0.03, 0.03, 0.72, dy > 0 ? MAT.woodD : MAT.kuro, 0, dy, 0.02, 6, false); r.rotation.z = Math.PI / 2; }
  return sg;
}
// 絵馬掛け（壁ぞい・InstancedMesh）。side: 壁が +x なら 1、-x なら -1
function emaWall(g, x, z0, z1, y, side, colors) {
  const rows = 3, per = Math.floor((z1 - z0) / 0.36), n = rows * per;
  for (let r = 0; r < rows; r++) box(g, 0.05, 0.05, z1 - z0 + 0.2, MAT.woodD, x - side * 0.05, y + 0.15 - r * 0.38, (z0 + z1) / 2, false);
  const sh = new THREE.Shape(); sh.moveTo(-0.15, -0.1); sh.lineTo(0.15, -0.1); sh.lineTo(0.15, 0.06); sh.lineTo(0, 0.13); sh.lineTo(-0.15, 0.06); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false });
  const im = new THREE.InstancedMesh(geo, std(0xffffff, { roughness: 0.85 }), n), o = new THREE.Object3D(), col = new THREE.Color();
  let i = 0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
    o.position.set(x - side * 0.1, y - r * 0.38 + (Math.random() - 0.5) * 0.02, z0 + 0.18 + k * 0.36 + (Math.random() - 0.5) * 0.05);
    o.rotation.set(0, -side * Math.PI / 2, (Math.random() - 0.5) * 0.2); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i++, col.set(Math.random() < 0.65 ? 0xe9cf9e : colors[Math.floor(Math.random() * colors.length)]));
  }
  im.castShadow = true; g.add(im); return im;
}

// ------------------------------------------------------------------ 小さな社（縁結び・合格）— 中に入れる
export function smallHall(parent, env, { x, z, roofMat = MAT.copper, zabMat, theme }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  const W = 10, D = 7, F = 0.45;
  box(g, W + 1, F, D + 1, MAT.stoneD, 0, F / 2, 0);
  for (let i = 0; i < 2; i++) box(g, 3.4, 0.22, 0.5, MAT.stoneL, 0, 0.11 + i * 0.22, D / 2 + 0.9 - i * 0.45);
  box(g, W, 0.06, D, MAT.tatami, 0, F + 0.03, 0);
  for (const cx of [-W / 2, -1.6, 1.6, W / 2]) for (const cz of [-D / 2, D / 2]) cyl(g, 0.17, 0.17, 3.4, MAT.shu, cx, F + 1.7, cz, 12);
  box(g, W, 3.2, 0.16, MAT.woodL, 0, F + 1.6, -D / 2 + 0.05);
  for (const s of [-1, 1]) box(g, 0.16, 3.2, D, MAT.woodL, s * (W / 2 - 0.05), F + 1.6, 0);
  for (const cx of [-3, 0, 3]) box(g, 2.4, 2.3, 0.05, MAT.shoji, cx, F + 1.6, -D / 2 + 0.16, false);
  box(g, W + 0.4, 0.28, D + 0.4, MAT.shuD, 0, F + 3.45, 0);
  roof(g, { w: W + 3, d: D + 3.4, h: 2.6, lift: 0.45, y: F + 3.6, mat: roofMat });
  // 祭壇：神鏡・榊・灯明
  box(g, 2.8, 0.85, 0.8, MAT.wood, 0, F + 0.43, -D / 2 + 0.8);
  const mir = cyl(g, 0.45, 0.45, 0.06, new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.08 }), 0, F + 1.4, -D / 2 + 0.8, 32); mir.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { cyl(g, 0.06, 0.08, 0.5, MAT.white, s * 1.05, F + 1.1, -D / 2 + 0.8, 8);
    for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), std(0x2f5a2e)); l.scale.set(1, 0.6, 0.6); l.position.set(s * 1.05, F + 1.4 + k * 0.1, -D / 2 + 0.8); g.add(l); } }
  lightSpot(g, F + 2.4, 9, 12, 0xffb36b);
  // 座布団 3列×4
  const cushions = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const cx = -2.7 + c * 1.8, cz = -0.5 + r * 1.35; box(g, 0.85, 0.12, 0.85, zabMat, cx, F + 0.1, cz); cushions.push([x + cx, z + cz]); }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.15, 8, 32, Math.PI), MAT.rope); rope.rotation.z = Math.PI; rope.scale.y = 0.16; rope.position.set(0, F + 3.2, D / 2 + 0.1); g.add(rope);
  chochin(g, -4, F + 2.7, D / 2 + 0.5, env, 0.9); chochin(g, 4, F + 2.7, D / 2 + 0.5, env, 0.9);
  smallHallInterior(g, theme, W, D, F);
  return { group: g, cushions, floor: { x0: x - W / 2 + 0.3, x1: x + W / 2 - 0.3, z0: z - D / 2 + 1.2, z1: z + D / 2 + 0.3, y: F + 0.06 }, altar: [x, z - D / 2 + 1.5] };
}

// 小さな社の内装：共通（御簾・御幣・釣灯籠・絵馬掛け）＋社ごとの飾り
function smallHallInterior(g, theme, W, D, F) {
  const zb = -D / 2, xw = W / 2 - 0.13;
  // 御簾（祭壇の上）
  const misu = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.5), misuMat(4)); misu.position.set(0, F + 2.95, zb + 1.35); g.add(misu);
  box(g, 4.5, 0.1, 0.1, MAT.kuro, 0, F + 3.22, zb + 1.35, false);
  // 御幣（祭壇の両端）
  for (const s of [-1, 1]) {
    cyl(g, 0.03, 0.03, 1.1, MAT.woodL, s * 0.75, F + 1.4, zb + 0.95, 6, false);
    for (let k = 0; k < 4; k++) { const p = box(g, 0.15, 0.24, 0.02, k % 2 ? MAT.paperW : MAT.gold, s * 0.75 + (k % 2 ? 0.08 : -0.08), F + 1.88 - k * 0.2, zb + 0.95, false); p.rotation.z = (k % 2 ? 1 : -1) * 0.25; }
  }
  // 釣灯籠（正面の軒）
  for (const cx of [-2.6, 2.6]) tsuriDoro(g, cx, F + 3.3, D / 2 - 0.05, 0.8);
  if (theme === "en") {
    // 赤い糸：天井を渡る三本の糸
    const threadM = std(0xd61f3a, { emissive: 0x900018, emissiveIntensity: 0.7, roughness: 0.6 });
    for (const [zz, sag] of [[-1.2, 0.35], [0.4, 0.5], [2.0, 0.3]]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(-xw + t * 2 * xw, F + 3.1 - Math.sin(t * Math.PI) * sag, zz + Math.sin(t * 9) * 0.06)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 4, false), threadM));
    }
    // 猪目（ハート）の板：祭壇の上
    const hs = new THREE.Shape(); hs.moveTo(0, -0.22); hs.bezierCurveTo(-0.3, 0, -0.26, 0.24, 0, 0.12); hs.bezierCurveTo(0.26, 0.24, 0.3, 0, 0, -0.22);
    box(g, 0.9, 0.62, 0.06, MAT.woodL, 0, F + 2.35, zb + 0.2);
    const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.03, bevelEnabled: false }), std(0xd8436a, { emissive: 0x5a0a20, emissiveIntensity: 0.4 }));
    heart.position.set(0, F + 2.35, zb + 0.24); g.add(heart);
    // 千羽鶴（右の奥）
    const craneG = new THREE.OctahedronGeometry(0.06, 0), cols = [0xe64a6a, 0xf3a6b8, 0xf6d36b, 0x8ac6e8, 0xb48ae0, 0xffffff, 0x6fc28a];
    for (let k = 0; k < 7; k++) {
      const cx = 3.4 + (k % 4) * 0.28, cz = zb + 0.45 + Math.floor(k / 4) * 0.3;
      cyl(g, 0.004, 0.004, 1.6, MAT.paperW, cx, F + 2.35, cz, 3, false);
      const m = std(cols[k], { roughness: 0.8 });
      for (let j = 0; j < 12; j++) { const c = new THREE.Mesh(craneG, m); c.scale.set(1.4, 0.6, 1); c.rotation.y = j * 0.7; c.position.set(cx, F + 3.05 - j * 0.12, cz); g.add(c); }
      cyl(g, 0.01, 0.05, 0.18, m, cx, F + 1.48, cz, 6, false);
    }
    // 夫婦石（左の奥）としめ縄
    const stM = std(0x8a857c, { roughness: 0.95, flatShading: true });
    for (const [cx, r] of [[-4.1, 0.42], [-3.3, 0.34]]) { const st = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), stM); st.scale.y = 1.3; st.position.set(cx, F + r * 1.2, zb + 0.8); st.castShadow = true; g.add(st); }
    const sm = cyl(g, 0.04, 0.04, 0.95, MAT.rope, -3.7, F + 0.75, zb + 0.8, 8, false); sm.rotation.z = Math.PI / 2;
    for (const xx of [-3.85, -3.55]) box(g, 0.08, 0.2, 0.01, MAT.paperW, xx, F + 0.6, zb + 0.85, false);
    // 桃色の絵馬（左右の壁）
    for (const s of [-1, 1]) emaWall(g, s * xw, -1.6, 2.2, F + 1.9, s, [0xf3a6b8, 0xe64a6a, 0xffd6e0]);
  } else if (theme === "go") {
    // 掛け軸（左右の壁）
    kakejiku(g, "合格祈願", -xw + 0.03, F + 1.95, -1.4, Math.PI / 2);
    kakejiku(g, "学業成就", xw - 0.03, F + 1.95, -1.4, -Math.PI / 2, "#2c4a8a");
    // 撫で牛（左の奥）：頭だけ金色に光る＝みんなに撫でられた跡
    const ox = std(0x2a2622, { metalness: 0.55, roughness: 0.4 }), nade = std(0x8a6a3a, { metalness: 0.85, roughness: 0.25 });
    const cow = new THREE.Group(); cow.position.set(-3.7, F, zb + 0.95); cow.rotation.y = 0.5; g.add(cow);
    box(cow, 1.4, 0.18, 0.8, MAT.stone, 0, 0.09, 0);
    const bd = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), ox); bd.scale.set(1.35, 0.7, 0.8); bd.position.set(0, 0.48, 0); cow.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), nade); hd.scale.set(1.2, 0.95, 0.9); hd.position.set(0.62, 0.62, 0.05); cow.add(hd);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), ox); h.position.set(0.6, 0.82, s * 0.13); h.rotation.x = s * 0.6; cow.add(h); }
    const apron = box(cow, 0.5, 0.02, 0.5, std(0xb8321e, { roughness: 0.8 }), -0.1, 0.83, 0, false); apron.rotation.y = 0.3;
    cow.traverse((o) => o.isMesh && (o.castShadow = true));
    // 文机：硯・筆・梅の一枝（右の奥）
    const dx0 = 3.9, dz0 = zb + 0.75;
    box(g, 1.3, 0.06, 0.6, MAT.woodD, dx0, F + 0.42, dz0);
    for (const [dx, dz] of [[-0.58, -0.24], [0.58, -0.24], [-0.58, 0.24], [0.58, 0.24]]) box(g, 0.05, 0.4, 0.05, MAT.woodD, dx0 + dx, F + 0.2, dz0 + dz);
    box(g, 0.3, 0.04, 0.42, MAT.kuro, dx0 - 0.35, F + 0.47, dz0, false);
    box(g, 0.5, 0.005, 0.36, MAT.paperW, dx0 + 0.15, F + 0.452, dz0 + 0.03, false);
    const fude = cyl(g, 0.015, 0.012, 0.4, MAT.woodL, dx0 + 0.45, F + 0.47, dz0, 6, false); fude.rotation.x = Math.PI / 2;
    cyl(g, 0.07, 0.1, 0.3, MAT.white, dx0 + 0.5, F + 0.6, dz0 - 0.2, 10, false);
    const ume = std(0xf6c6d2, { emissive: 0x401018, emissiveIntensity: 0.3 });
    for (let k = 0; k < 4; k++) {
      const rz = (k - 1.5) * 0.35, bx = dx0 + 0.5;
      const b = cyl(g, 0.012, 0.012, 0.5, MAT.woodD, bx - Math.sin(rz) * 0.25, F + 0.75 + Math.cos(rz) * 0.25, dz0 - 0.2, 4, false); b.rotation.z = rz;
      for (let j = 1; j <= 3; j++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), ume); f.position.set(bx - Math.sin(rz) * j * 0.15, F + 0.75 + Math.cos(rz) * j * 0.15, dz0 - 0.2 + (j % 2 ? 0.03 : -0.03)); g.add(f); }
    }
    // だるま（祭壇の脇の棚）：片目だけ入れてある
    box(g, 1.2, 0.05, 0.4, MAT.woodL, -2.3, F + 0.9, zb + 0.35);
    const red = std(0xc8281e, { roughness: 0.45 }), face = std(0xf6efe2);
    for (const [k, sc] of [[0, 1.2], [1, 1], [2, 0.8]]) {
      const cx = -2.7 + k * 0.4, r = 0.15 * sc, cy = F + 0.925 + r * 1.15;
      const dm = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), red); dm.scale.y = 1.15; dm.position.set(cx, cy, zb + 0.35); g.add(dm);
      const fc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 14), face); fc.position.set(cx, cy + r * 0.15, zb + 0.35 + r * 0.97); g.add(fc);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 8), MAT.kuro); eye.position.set(cx - r * 0.2, cy + r * 0.28, zb + 0.35 + r * 0.98); g.add(eye);
    }
    // 青い絵馬（壁ぞい）
    for (const s of [-1, 1]) emaWall(g, s * xw, -0.3, 2.4, F + 1.9, s, [0x8ac6e8, 0x2c4a8a, 0xf6d36b]);
  }
}

// ------------------------------------------------------------------ 楼門（二階建ての門）
export function romon(parent, env, { x = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  const W = 12, D = 4;
  box(g, W + 0.6, 0.4, D + 0.6, MAT.stoneD, 0, 0.2, 0);
  for (const cx of [-5.6, -2, 2, 5.6]) for (const cz of [-D / 2 + 0.3, D / 2 - 0.3]) cyl(g, 0.3, 0.3, 5, MAT.shu, cx, 2.9, cz, 16);
  for (const s of [-1, 1]) box(g, 3.2, 4.2, 0.2, MAT.white, s * 3.8, 2.5, 0);                // 左右の間（随身の間）
  box(g, W + 0.2, 0.4, D + 0.2, MAT.shuD, 0, 5.4, 0);
  roof(g, { w: W + 3, d: D + 3.4, h: 1.4, lift: 0.45, y: 5.55, mat: MAT.copper, gable: false, ridgeGold: false });   // 一階の屋根（腰屋根）
  // 二階：高欄と柱
  box(g, W - 1.4, 0.25, D, MAT.wood, 0, 7.15, 0);
  for (const s of [-1, 1]) box(g, W - 1, 0.5, 0.1, MAT.shu, 0, 7.55, s * (D / 2 + 0.05));
  for (const cx of [-4.8, -1.6, 1.6, 4.8]) for (const cz of [-D / 2 + 0.4, D / 2 - 0.4]) cyl(g, 0.24, 0.24, 2.8, MAT.shu, cx, 8.6, cz, 12);
  box(g, W - 1.6, 2.4, 0.15, MAT.white, 0, 8.5, 0);
  box(g, W - 1.2, 0.3, D + 0.1, MAT.shuD, 0, 10.05, 0);
  roof(g, { w: W + 2.6, d: D + 4, h: 2.6, lift: 0.6, y: 10.2, mat: MAT.copper });
  box(g, 1.4, 1.0, 0.1, MAT.kuro, 0, 8.8, D / 2 + 0.12);                                     // 扁額
  chochin(g, 0, 4.4, D / 2 + 0.3, env, 1.8);                                                 // 大提灯
  for (const s of [-1, 1]) chochin(g, s * 3.8, 4.6, D / 2 + 0.4, env, 0.9);
  return g;
}

// ------------------------------------------------------------------ 五重塔
export function pagoda(parent, env, { x, z, y = 0 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); g.userData.static = true;
  box(g, 7.5, 0.8, 7.5, MAT.stoneD, 0, 0.4, 0);
  let yy = 0.8, w = 5.6;
  for (let i = 0; i < 5; i++) {
    const h = i === 0 ? 3.2 : 2.3;
    box(g, w, h, w, MAT.shuD, 0, yy + h / 2, 0);
    for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(g, 0.12, 0.12, h, MAT.shu, s * (w / 2), yy + h / 2, t * (w / 2), 8);
    box(g, w * 0.5, h * 0.55, 0.06, MAT.white, 0, yy + h * 0.45, w / 2 + 0.02, false);
    yy += h;
    roof(g, { w: w + 3.0, d: w + 3.0, h: 0.9, lift: 0.55, y: yy - 0.1, mat: MAT.hinoki, gable: false, ridgeGold: false });
    const r2 = roof(g, { w: w + 3.0, d: w + 3.0, h: 0.9, lift: 0.55, y: yy - 0.1, mat: MAT.hinoki, gable: false, ridgeGold: false }); r2.rotation.y = Math.PI / 2;
    yy += 0.7; w *= 0.84;
  }
  cyl(g, 0.12, 0.16, 6, MAT.gold, 0, yy + 3, 0, 10);                                     // 相輪
  for (let i = 0; i < 9; i++) cyl(g, 0.45 - i * 0.02, 0.45 - i * 0.02, 0.08, MAT.gold, 0, yy + 0.9 + i * 0.5, 0, 16);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), MAT.gold); top.position.y = yy + 6.2; g.add(top);
  for (let i = 0; i < 4; i++) chochin(g, (i % 2 ? 1 : -1) * 3.3, 3.2, (i < 2 ? 1 : -1) * 3.3, env, 0.8);
  return g;
}

// ------------------------------------------------------------------ 太鼓橋
export function taikobashi(parent, { x0, x1, z, w }) {
  const g = new THREE.Group(); parent.add(g); g.userData.static = true;
  const L = x1 - x0, N = 26;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N, xx = x0 + t * L, yy = Math.sin(t * Math.PI) * 1.9, slope = Math.cos(t * Math.PI) * Math.PI * 1.9 / L;
    const p = box(g, L / N + 0.03, 0.14, w, MAT.woodL, xx, yy, z); p.rotation.z = Math.atan(slope);
  }
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(x0 + t * L, Math.sin(t * Math.PI) * 1.9 + 0.75, z + s * (w / 2))); }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 6, false), MAT.shu); rail.castShadow = true; g.add(rail);
    for (let i = 0; i <= 8; i++) { const t = i / 8, yy = Math.sin(t * Math.PI) * 1.9; cyl(g, 0.07, 0.07, 0.8, MAT.shu, x0 + t * L, yy + 0.38, z + s * (w / 2), 8);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), MAT.gold); k.position.set(x0 + t * L, yy + 0.85, z + s * (w / 2)); g.add(k); }
  }
  for (const xx of [x0 + 0.3, x1 - 0.3]) for (const s of [-1, 1]) cyl(g, 0.12, 0.14, 1.4, MAT.shu, xx, -0.4, z + s * (w / 2 - 0.1), 8);
  return g;
}

// ------------------------------------------------------------------ 玉垣（朱の塀・InstancedMesh で軽く）
export function tamagaki(parent, segments, h = 1.3) {
  const posts = [], geo = new THREE.BoxGeometry(0.16, h, 0.16);
  for (const [[ax, az], [bx, bz]] of segments) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) posts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    const rail = (yy) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.12), MAT.shu); r.position.set((ax + bx) / 2, yy, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax); r.castShadow = true; parent.add(r); };
    rail(h - 0.1); rail(h * 0.45);
  }
  const inst = new THREE.InstancedMesh(geo, MAT.shu, posts.length); const m = new THREE.Matrix4();
  posts.forEach(([x, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, h / 2, z))); inst.castShadow = true; parent.add(inst);
  return inst;
}

// ------------------------------------------------------------------ 手水舎
export function temizuya(parent, env, { x, z }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  for (const [xx, zz] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]]) cyl(g, 0.15, 0.15, 3, MAT.woodD, xx, 1.5, zz, 10);
  roof(g, { w: 4.6, d: 3.6, h: 1.3, lift: 0.3, y: 3.0, mat: MAT.copper, ridgeGold: false });
  box(g, 2.6, 0.75, 1.3, MAT.stoneL, 0, 0.5, 0);
  box(g, 2.3, 0.06, 1.05, MAT.water, 0, 0.86, 0, false);
  const dragon = cyl(g, 0.09, 0.12, 0.6, MAT.gold, -1.0, 1.15, 0, 10); dragon.rotation.z = -1.1;   // 竜の口（水が出る）
  for (let i = -2; i <= 2; i++) { const h = cyl(g, 0.03, 0.03, 0.7, MAT.woodL, i * 0.36, 0.98, 0.5, 6); h.rotation.x = 1.25; cyl(g, 0.08, 0.08, 0.12, MAT.woodL, i * 0.36, 0.95, 0.85, 10); }
  chochin(g, 0, 2.6, 1.6, env, 0.6);
  return g;
}

// ------------------------------------------------------------------ 授与所（お守り・おみくじ）
export function juyosho(parent, env, { x, z, ry = -Math.PI / 2 }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); g.userData.static = true;
  box(g, 7, 0.3, 4, MAT.stoneD, 0, 0.15, 0);
  for (const xx of [-3.2, 3.2]) for (const zz of [-1.7, 1.7]) cyl(g, 0.14, 0.14, 3, MAT.woodD, xx, 1.6, zz, 10);
  box(g, 6.6, 2.8, 0.15, MAT.woodL, 0, 1.7, -1.7);
  for (const s of [-1, 1]) box(g, 0.15, 2.8, 3.4, MAT.woodL, s * 3.2, 1.7, 0);
  box(g, 6.4, 1.0, 0.6, MAT.wood, 0, 0.8, 1.4);                                              // 授与台
  const cloth = box(g, 6.4, 0.06, 0.62, std(0xc8331f), 0, 1.33, 1.4, false);
  const colors = [0xd8402a, 0x2c5aa0, 0xe8b23a, 0x3d8a4a, 0xd96aa0, 0xffffff];
  for (let i = 0; i < 14; i++) box(g, 0.22, 0.32, 0.04, std(colors[i % colors.length], { emissive: colors[i % colors.length], emissiveIntensity: 0.12 }), -2.8 + i * 0.43, 1.55, 1.3, false); // お守り
  roof(g, { w: 8.4, d: 5.4, h: 1.5, lift: 0.3, y: 3.1, mat: MAT.hinoki, ridgeGold: false });
  chochin(g, -2.4, 2.6, 1.9, env, 0.7); chochin(g, 2.4, 2.6, 1.9, env, 0.7);
  return g;
}

// ------------------------------------------------------------------ 御神木（大きな楠）
export function shinboku(parent, { x, z }, leafMat) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  const trunk = cyl(g, 0.9, 1.5, 6.5, std(0x4a3426, { roughness: 1 }), 0, 3.25, 0, 14);
  for (let i = 0; i < 5; i++) { const r = cyl(g, 0.18, 0.4, 2.2, std(0x4a3426), Math.cos(i * 1.3) * 1.4, 0.4, Math.sin(i * 1.3) * 1.4, 8); r.rotation.set(Math.sin(i) * 0.9, 0, Math.cos(i * 1.3) * 0.9); }   // 根
  const rope = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.16, 10, 28), MAT.rope); rope.rotation.x = Math.PI / 2; rope.position.y = 2.6; g.add(rope);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.24, 0.55, 0.02, MAT.paperW, Math.cos(a) * 1.36, 2.2, Math.sin(a) * 1.36, false).rotation.y = -a + Math.PI / 2; }
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.6, 1), leafMat); s.position.set((Math.random() - 0.5) * 7, 6.5 + Math.random() * 3.5, (Math.random() - 0.5) * 7); s.castShadow = true; g.add(s); }
  // 柵
  const fence = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; cyl(g, 0.06, 0.06, 0.8, MAT.woodD, Math.cos(a) * 2.6, 0.4, Math.sin(a) * 2.6, 6); }
  const fr = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 6, 40), MAT.woodD); fr.rotation.x = Math.PI / 2; fr.position.y = 0.75; g.add(fr);
  return g;
}

// ------------------------------------------------------------------ 奥の院（山頂の小さな社）
export function okunoin(parent, env, { x, z, y }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); g.userData.static = true;
  box(g, 6, 0.5, 4.5, MAT.stoneD, 0, 0.25, 0);
  for (const xx of [-2.6, 2.6]) for (const zz of [-1.9, 1.9]) cyl(g, 0.14, 0.14, 2.8, MAT.shu, xx, 1.9, zz, 10);
  box(g, 5.6, 2.6, 0.12, MAT.woodL, 0, 1.8, -1.9);
  for (const s of [-1, 1]) box(g, 0.12, 2.6, 3.8, MAT.woodL, s * 2.75, 1.8, 0);
  roof(g, { w: 7.6, d: 6.2, h: 2, lift: 0.4, y: 3.3, mat: MAT.copperD });
  const mir = cyl(g, 0.35, 0.35, 0.05, new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.08 }), 0, 1.6, -1.7, 28); mir.rotation.x = Math.PI / 2;
  chochin(g, -2.2, 2.4, 2.4, env, 0.7, 0xdde8ff); chochin(g, 2.2, 2.4, 2.4, env, 0.7, 0xdde8ff);
  return g;
}
