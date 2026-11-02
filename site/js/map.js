// えにし神社の地図：場所・地形・山道・当たり判定・道順。座標はメートル。+z が入口（南）、-z が山（北）。
import * as THREE from "three";

export const PLACES = {
  ootorii:  { n: 1,  name: "大鳥居",         vi: "Cổng torii lớn",         pos: [0, 76],    stand: [0, 79],     face: Math.PI },
  sando:    { n: 2,  name: "参道",           vi: "Đường vào đền",           pos: [0, 58],    stand: [0, 60],     face: Math.PI },
  pond:     { n: 3,  name: "池と太鼓橋",     vi: "Hồ cá koi & cầu cong",    pos: [18, 54],   stand: [18, 54],    face: Math.PI / 2 },
  romon:    { n: 4,  name: "楼門",           vi: "Cổng lầu",                pos: [0, 41],    stand: [0, 45.5],   face: Math.PI },
  temizu:   { n: 5,  name: "手水舎",         vi: "Nơi rửa tay",             pos: [11, 33],   stand: [11, 31.0],  face: 0 },
  juyosho:  { n: 6,  name: "授与所",         vi: "Quầy bùa & quẻ",          pos: [18.5, 21], stand: [15.6, 21],  face: Math.PI / 2 },
  shinboku: { n: 7,  name: "御神木",         vi: "Cây thiêng",              pos: [12, 9],    stand: [12, 13.2],  face: Math.PI },
  honden:   { n: 8,  name: "本殿・当選の社", vi: "Điện chính (cầu trúng)",  pos: [0, 1],     stand: [0, 14.2],   face: Math.PI },
  enmusubi: { n: 9,  name: "縁結びの社",     vi: "Điện cầu duyên",          pos: [-31, 12],  stand: [-31, 19.2], face: Math.PI },
  gokaku:   { n: 10, name: "合格の社",       vi: "Điện cầu đỗ",             pos: [31, 12],   stand: [31, 19.2],  face: Math.PI },
  senbon:   { n: 11, name: "千本鳥居",       vi: "Nghìn cổng torii",        pos: [14, -12],  stand: [14.5, -6.9], face: Math.PI },
  okunoin:  { n: 12, name: "奥の院",         vi: "Điện trên đỉnh núi",      pos: [-2, -78],  stand: [-2, -71],   face: Math.PI },
  pagoda:   { n: 13, name: "五重塔",         vi: "Tháp năm tầng",           pos: [40, -22],  stand: [39, -13.5], face: Math.PI },
};

// 千本鳥居の山道（本殿の右奥から、つづら折りで奥の院へ）
export const TRAIL = new THREE.CatmullRomCurve3([
  [14.5, -5.5], [13, -15], [4, -24], [-8, -28], [-12, -36], [-4, -44], [8, -50], [10, -57], [2, -63], [-2, -69],
].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "catmullrom", 0.4);
const TRAIL_PTS = TRAIL.getSpacedPoints(400);

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rawMountain(x, z) {
  const north = smooth(-6, -80, z);
  let h = north * 16;
  h += (Math.sin(x * 0.08) * 2.2 + Math.cos(z * 0.06 + x * 0.03) * 1.6) * north;
  h += smooth(46, 80, Math.abs(x)) * 12 + smooth(88, 120, z) * 10 + smooth(-80, -130, z) * 18;
  h += Math.max(0, 1 - Math.hypot(x - 40, z + 21) / 16) * 5;                       // 五重塔の丘
  return h;
}
function trailInfo(x, z) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < TRAIL_PTS.length; i += 2) { const p = TRAIL_PTS[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < best) { best = d; bi = i; } }
  return { d: Math.sqrt(best), t: bi / (TRAIL_PTS.length - 1) };
}
export const trailHeight = (t) => smooth(0.0, 1, t) * 15.5;
export function height(x, z) {
  if (z > -6 && Math.abs(x) < 46 && z < 88) {
    if (z < 2 && x > 33 && x < 44) return Math.max(0, smooth(2, -13, z) * (Math.max(0, 1 - Math.hypot(x - 40, z + 21) / 16) * 5 + smooth(-6, -80, z) * 16));
    return 0;
  }
  let h = rawMountain(x, z);
  if (Math.hypot(x + 2, z + 74) < 13) h = 15.5;                                     // 奥の院の平地
  if (z > -14 && z <= -6 && Math.abs(x) < 46) h *= smooth(-6, -14, z);
  const tr = trailInfo(x, z);
  if (tr.d < 4.2) { const k = smooth(4.2, 1.8, tr.d); h = h * (1 - k) + trailHeight(tr.t) * k; }
  return h;
}

// 池（楕円の中は水。橋の上だけ通れる）
export const POND = { cx: 18, cz: 54, rx: 9, rz: 6 };
export const BRIDGE = { x0: 8.4, x1: 27.6, z: 54, w: 2.2 };
export const OKPOND = { cx: 6, cz: -73, rx: 5.5, rz: 3.6 };
const inEll = (x, z, e) => ((x - e.cx) / e.rx) ** 2 + ((z - e.cz) / e.rz) ** 2 < 1;

// 当たり判定 [x0, z0, x1, z1]
const hallBlocks = (cx) => [[cx - 5.6, 7.9, cx + 5.6, 9.4], [cx - 5.6, 7.9, cx - 4.7, 16.1], [cx + 4.7, 7.9, cx + 5.6, 16.1], [cx - 5.6, 15.6, cx - 1.8, 16.2], [cx + 1.8, 15.6, cx + 5.6, 16.2]];
export const BLOCKS = [
  [-10.6, -6.2, 10.6, -4.5], [-10.6, -6.2, -9, 8.3], [9, -6.2, 10.6, 8.3], [-10.6, 6.7, -3.8, 8.3], [3.8, 6.7, 10.6, 8.3],   // 本殿
  [-1.9, 11.7, 1.9, 13.1],                                    // 賽銭箱
  [-32.15, 17.45, -29.85, 18.35], [29.85, 17.45, 32.15, 18.35],  // 縁結び・合格の賽銭箱
  ...hallBlocks(-31), ...hallBlocks(31),
  [-6.3, 38.9, -2.1, 43.1], [2.1, 38.9, 6.3, 43.1],           // 楼門の左右
  [-24.6, 40.6, -6.3, 41.4], [6.3, 40.6, 24.6, 41.4],         // 南の玉垣
  [-25, 26, -24, 41], [24, 26, 25, 41], [-25, -6, -24, 2], [24, -6, 25, 2],
  [16.4, 17.4, 20.6, 24.6],                                   // 授与所
  [9.6, 32.2, 12.4, 33.8],                                    // 手水舎の水盤
  [9.8, 6.8, 14.2, 11.2],                                     // 御神木
  [-6.2, 17, -4.8, 19], [4.8, 17, 6.2, 19],                   // 狛狐の台
  [36.2, -25.8, 43.8, -18.2],                                 // 五重塔
  [-5.2, -80.6, 1.2, -75.4],                                  // 奥の院
];
export function walkable(x, z) {
  if (z > 44 && z < 85 && Math.abs(x) < 7.2) return true;                                // 参道・大鳥居前
  if (z > 44 && z < 64 && x > 6 && x < 30) return !inEll(x, z, POND) || (Math.abs(z - BRIDGE.z) < BRIDGE.w / 2 && x > BRIDGE.x0 && x < BRIDGE.x1);
  if (z > -6 && z <= 44 && Math.abs(x) < 24.5) return true;                              // 境内
  if (z > 2 && z < 26 && Math.abs(x) >= 24.5 && Math.abs(x) < 42) return true;           // 東西の社
  if (z <= 3 && z > -13.5 && x > 34 && x < 43) return true;                              // 五重塔への坂
  if (z < -8 && z > -32 && Math.hypot(x - 40, z + 21) < 9.5) return true;                 // 五重塔の丘
  if (z <= -5 && trailInfo(x, z).d < 1.4) return true;                                 // 千本鳥居
  if (Math.hypot(x + 2, z + 74) < 11.5) return !inEll(x, z, OKPOND);                     // 奥の院
  return false;
}
export function blocked(x, z) {
  if (!walkable(x, z)) return true;
  for (const [x0, z0, x1, z1] of BLOCKS) if (x > x0 && x < x1 && z > z0 && z < z1) return true;
  return false;
}
// 床：平らな床と階段（ランプ）
export const floors = [
  { x0: -9, x1: 9, z0: -4.5, z1: 8.3, y: 1.7 },                                       // 本殿の中
  { x0: -3.8, x1: 3.8, z0: 8.3, z1: 10.9, ramp: [1.6, 0] },                            // 本殿の大階段
  ...[-31, 31].flatMap((cx) => [{ x0: cx - 4.7, x1: cx + 4.7, z0: 9.4, z1: 15.9, y: 0.52 }, { x0: cx - 1.8, x1: cx + 1.8, z0: 15.9, z1: 16.9, ramp: [0.48, 0] }]),
];
export function bridgeY(x, z) {
  if (Math.abs(z - BRIDGE.z) > BRIDGE.w / 2 || x < BRIDGE.x0 || x > BRIDGE.x1) return 0;
  return Math.sin(((x - BRIDGE.x0) / (BRIDGE.x1 - BRIDGE.x0)) * Math.PI) * 1.9 + 0.08;
}
export function footY(x, z) {
  for (const f of floors) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) {
    if (f.ramp) { const k = (z - f.z0) / (f.z1 - f.z0); return f.ramp[0] + (f.ramp[1] - f.ramp[0]) * k; }
    return f.y;
  }
  return Math.max(height(x, z), bridgeY(x, z));
}

// 地域と道順（地図から選んだとき、道に沿って歩く）
export function region(x, z) {
  if (z > 44) return x > 6 && z < 64 ? "pond" : "sando";
  if (z > 2 && z < 26 && x <= -24.5) return "west";
  if (z > 2 && z < 26 && x >= 24.5) return "east";
  if (x > 33 && z <= 3) return "pagoda";
  if (z <= -5.5) return "trail";
  return "court";
}
const HUB = { sando: [0, 47], pond: [6.6, 54], court: [0, 24], west: [-23, 17], east: [23, 17], trail: [9, -5], pagoda: [38, 0] };
function trailPath(t0, t1) { const pts = [], n = Math.max(2, Math.ceil(Math.abs(t1 - t0) * 40)); for (let i = 1; i <= n; i++) { const p = TRAIL.getPointAt(Math.min(1, Math.max(0, t0 + ((t1 - t0) * i) / n))); pts.push([p.x, p.z]); } return pts; }
export function routeTo(from, to) {
  const a = region(...from), b = region(...to), pts = [];
  if (a === b && a !== "trail") return [to];
  // まず境内（court）へ
  const toCourt = { sando: [[0, 46], [0, 38]], pond: [[6.6, 54], [0, 47], [0, 38]], west: [[-23, 17]], east: [[26, 15], [22.5, 13]], pagoda: [[38, 0], [23, 4], [16, 13.5]], court: [], trail: null };
  const fromCourt = { sando: [[0, 38], [0, 47]], pond: [[0, 38], [0, 47], [6.6, 54]], west: [[-23, 17], [-26, 17]], east: [[22.5, 13], [26, 15]], pagoda: [[16, 13.5], [23, 4], [38, 0]], court: [], trail: null };
  if (a === "trail" && b === "trail") return trailPath(trailT(from), trailT(to)).concat([to]);
  if (a === "trail") pts.push(...trailPath(trailT(from), 0), [14.5, -4.2], [15.5, -3], [15.5, 12.5], [8, 14.5]); else pts.push(...toCourt[a]);
  if (a !== "court" && b !== "court" && a !== "trail" && b !== "trail") pts.push([0, 22]);     // 境内の中を通る（本殿を突っ切らない）
  if (b === "trail") pts.push([8, 14.5], [15.5, 12.5], [15.5, -3], [14.5, -4.2], ...trailPath(0, trailT(to))); else pts.push(...fromCourt[b]);
  pts.push(to);
  return pts;
}
function trailT(p) { if (Math.hypot(p[0] + 2, p[1] + 74) < 12) return 1; return trailInfo(p[0], p[1]).t; }
export const HUBS = HUB;
