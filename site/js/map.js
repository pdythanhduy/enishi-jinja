// えにし神社の地図：場所・地形・山道・当たり判定・道順。座標はメートル。+z が入口（南）、-z が山（北）。
import * as THREE from "three";

// 本殿：大きくして山側へ下げた。hw(x, z) は「以前の本殿まわりの座標」を今の座標に直す（中のものは全部これで置く）
export const HONDEN = { Z: -5.95, S: 1.55 };
export const hw = (x, z) => [x * HONDEN.S, HONDEN.Z + (z - 1) * HONDEN.S];
const [HX0, HZ0] = hw(-9, -4.5), [HX1, HZ1] = hw(9, 8.3);
export const inHonden = (x, z) => x > HX0 && x < HX1 && z > HZ0 && z < HZ1;
export const PLACES = {
  ootorii:  { n: 1,  name: "大鳥居",         yomi: "おおとりい",         pos: [0, 76],    stand: [0, 79],     face: Math.PI },
  sando:    { n: 2,  name: "参道",           yomi: "さんどう",           pos: [0, 58],    stand: [0, 60],     face: Math.PI },
  pond:     { n: 3,  name: "池と太鼓橋",     yomi: "いけ・たいこばし",    pos: [18, 54],   stand: [18, 54],    face: Math.PI / 2 },
  romon:    { n: 4,  name: "楼門",           yomi: "ろうもん",                pos: [0, 41],    stand: [0, 45.5],   face: Math.PI },
  temizu:   { n: 5,  name: "手水舎",         yomi: "ちょうずや",             pos: [11, 33],   stand: [11, 31.0],  face: 0 },
  juyosho:  { n: 6,  name: "授与所",         yomi: "じゅよしょ",          pos: [18.5, 21], stand: [15.6, 21],  face: Math.PI / 2 },
  shinboku: { n: 7,  name: "御神木",         yomi: "ごしんぼく",              pos: [13.5, 11.5], stand: [13.5, 15.8], face: Math.PI },
  honden:   { n: 8,  name: "本殿・当選の社", yomi: "ほんでん",  pos: [0, -6],    stand: [0, 12.8],   face: Math.PI },
  enmusubi: { n: 9,  name: "縁結びの社",     yomi: "えんむすびのやしろ",          pos: [-33, 11],  stand: [-33, 19.7], face: Math.PI },
  gokaku:   { n: 10, name: "合格の社",       yomi: "ごうかくのやしろ",             pos: [33, 11],   stand: [33, 19.7],  face: Math.PI },
  senbon:   { n: 11, name: "千本鳥居",       yomi: "せんぼんとりい",        pos: [21, -12],  stand: [21.5, -6.9], face: Math.PI },
  okunoin:  { n: 12, name: "奥の院",         yomi: "おくのいん",      pos: [-2, -78],  stand: [-2, -71],   face: Math.PI },
  pagoda:   { n: 13, name: "五重塔",         yomi: "ごじゅうのとう",           pos: [40, -22],  stand: [40, -11.9], face: Math.PI },
};

// 千本鳥居の山道（本殿の右奥から、つづら折りで奥の院へ）
export const TRAIL = new THREE.CatmullRomCurve3([
  [21.5, -5.5], [20.5, -16], [7, -27], [-8, -29], [-12, -36], [-4, -44], [8, -50], [10, -57], [2, -63], [-2, -69],
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
// 奥の院は高い山の頂。舞台（懸造り）は南西の崖にせり出して、境内を見下ろす
export const OKU_Y = 30;
export const STAGE = { x0: -15.5, x1: -6.5, z0: -66.5, z1: -58.5, y: OKU_Y + 0.35 };
export const trailHeight = (t) => smooth(0.0, 1, t) * OKU_Y;
export function height(x, z) {
  if (z > -6 && Math.abs(x) < 46 && z < 88) {
    if (z < 2 && x > 33 && x < 44) return Math.max(0, smooth(2, -13, z) * (Math.max(0, 1 - Math.hypot(x - 40, z + 21) / 16) * 5 + smooth(-6, -80, z) * 16));
    const rp = Math.hypot((x - POND.cx) / POND.rx, (z - POND.cz) / POND.rz);   // 池はすり鉢に掘る
    return rp < 1.25 ? -1.3 * smooth(1.25, 0.88, rp) : 0;
  }
  let h = rawMountain(x, z);
  const dOk = Math.hypot(x + 2, z + 74);
  if (dOk < 46) h = Math.max(h, OKU_Y - Math.pow(Math.max(0, dOk - 13), 1.18) * 0.95);   // 山頂へ尖っていく
  if (dOk < 13) { h = OKU_Y; const ro = Math.hypot((x - OKPOND.cx) / OKPOND.rx, (z - OKPOND.cz) / OKPOND.rz); if (ro < 1.25) h -= 1.1 * smooth(1.25, 0.88, ro); }   // 奥の院の平地と池
  if (z > -14 && z <= -6 && Math.abs(x) < 46) h *= smooth(-6, -14, z);
  if (Math.abs(x) < 25 && z > -30) h *= Math.max(smooth(-20, -30, z), smooth(17, 25, Math.abs(x)));   // 本殿の裏は平らに、なだらかに山へ
  const tr = trailInfo(x, z);
  if (tr.d < 6.6) { const k = smooth(6.6, 4.4, tr.d); h = h * (1 - k) + trailHeight(tr.t) * k; }   // 参道と両脇の路肩（渓流が流れる）は平らに
  return h;
}

// 池（楕円の中は水。橋の上だけ通れる）
export const POND = { cx: 18, cz: 54, rx: 9, rz: 6 };
// えにし作業室：池に浮かぶ屋形船と、参道わきの書院（東の参道へ開く）。rows＝座の x、cols＝座の z
export const YAKATA = { x: 18, z: 57.6, len: 8, wid: 3, deck: 0.32 };
export const SHOIN = { x0: -20.5, x1: -9.6, z0: 63, z1: 71, y: 0.62, rows: [-16.6, -13.2], cols: [64.4, 66.2, 68.0, 69.8] };
export const noDecor = (x, z) => (x > SHOIN.x0 - 2 && x < SHOIN.x1 + 1.6 && z > SHOIN.z0 - 1.6 && z < SHOIN.z1 + 1.6) || (Math.abs(x - YAKATA.x) < 1.6 && z > YAKATA.z + 1 && z < YAKATA.z + 6);
export const BRIDGE = { x0: 8.4, x1: 27.6, z: 54, w: 2.2 };
export const OKPOND = { cx: 7.0, cz: -76, rx: 3.4, rz: 2.7 };
// 渓流：山頂の池の南西からあふれ、参道の脇（灯籠と反対側、3m）を沿って下る
export const STREAM = (() => {
  const pts = [[6.0, -73.9], [4.6, -72.0], [2.9, -70.2]];
  for (let t = 0.98; t > 0.45; t -= 0.02) {
    const p = TRAIL.getPointAt(t), q = TRAIL.getPointAt(Math.min(1, t + 0.005)), dx = q.z - p.z, dz = -(q.x - p.x), l = Math.hypot(dx, dz) || 1;
    pts.push([p.x - (dx / l) * 3.0, p.z - (dz / l) * 3.0]);
  }
  return pts;
})();
const inEll = (x, z, e) => ((x - e.cx) / e.rx) ** 2 + ((z - e.cz) / e.rz) ** 2 < 1;

// 当たり判定 [x0, z0, x1, z1]
// 縁結び・合格の社の大きさ（arch.js の smallHall と共通）。正面は +z、賽銭箱は向拝の柱の間
export const SMALL = { X: 33, Z: 11, W: 13, D: 10, F: 0.6, saisenZ: 18.2, standZ: 19.7 };
const hallBlocks = (cx) => {
  const { Z, W, D } = SMALL, b = Z - D / 2, f = Z + D / 2, w = W / 2;
  return [[cx - w - 0.7, b - 0.6, cx + w + 0.7, b + 0.6], [cx - w - 0.7, b - 0.6, cx - w + 0.7, f + 0.3], [cx + w - 0.7, b - 0.6, cx + w + 0.7, f + 0.3],
    [cx - w - 0.7, f - 0.2, cx - 2.2, f + 0.8], [cx + 2.2, f - 0.2, cx + w + 0.7, f + 0.8],                       // 正面の高欄（真ん中だけ入れる）
    [cx - 2.45, f + 2.35, cx - 1.95, f + 2.85], [cx + 1.95, f + 2.35, cx + 2.45, f + 2.85],                     // 向拝の柱
    [cx - 1.15, SMALL.saisenZ - 0.45, cx + 1.15, SMALL.saisenZ + 0.45],                                         // 賽銭箱
    [cx - w + 0.6, b + 0.4, cx + w - 0.6, b + 2.3]];                                                           // 祭壇のまわり（内陣）
};
export const BLOCKS = [
  [...hw(-9, -4.5), ...hw(9, -1.05)],                          // 本殿の内陣（結界の先へは入らない）
  ...[[-10.6, -6.2, 10.6, -4.5], [-10.6, -6.2, -9, 8.3], [9, -6.2, 10.6, 8.3], [-10.6, 6.7, -3.8, 8.3], [3.8, 6.7, 10.6, 8.3]].map(([a, b, c, d]) => [...hw(a, b), ...hw(c, d)]),   // 本殿
  [-1.9, 10.35, 1.9, 11.65],                                  // 賽銭箱
  [-36.4, 24.15, -32.8, 24.85],                               // 赤い糸の結び棚
  [33.6, 23.8, 35.6, 25.1], [36.0, 24.5, 36.5, 25.1],         // 筆塚と灯籠
  ...hallBlocks(-SMALL.X), ...hallBlocks(SMALL.X),            // 縁結び・合格の社
  [-8.9, 38.0, -2.9, 44.0], [2.9, 38.0, 8.9, 44.0],           // 楼門の左右（1.4倍）
  [-25.9, 39.6, -8.9, 42.4], [8.9, 39.6, 25.9, 42.4],         // 南の回廊
  [-25.9, 25.9, -23.1, 42.4], [23.1, 25.9, 25.9, 42.4],       // 東西の回廊 [-25, -6, -24, 2], [24, -6, 25, 2],
  [16.4, 17.4, 20.6, 24.6],                                   // 授与所
  [9.6, 32.2, 12.4, 33.8],                                    // 手水舎の水盤
  [11.3, 9.3, 15.7, 13.7],                                    // 御神木
  [-21.1, 18.2, -20.0, 25.8],                                 // 献灯所
  [-6.2, 17, -4.8, 19], [4.8, 17, 6.2, 19],                   // 狛狐の台
  [-30.3, 23.0, -28.7, 24.6], [28.4, 23.0, 30.6, 24.6],        // 赤い糸の木・撫で牛
  [35.6, -26.4, 44.4, -17.6],                                 // 五重塔（基壇）
  [38.2, -17.6, 41.8, -13.7],                                  // 五重塔の正面石段（見るだけ）
  [31.8, -21.2, 35.2, -17.8],                                 // 鐘楼
  [-7.4, -82.4, 3.4, -74.0],                                  // 奥の院（1.5倍・透塀まで）
  [-13.0, -75.4, -8.0, -70.6], [-12.2, -81.0, -6.8, -79.0],    // 磐座・夫婦杉
  [-5.3, -73.1, -4.7, -68.9], [0.7, -73.1, 1.3, -68.9],        // 奉納提灯の掛け台
];
export function walkable(x, z) {
  if (inHonden(x, z)) return true;
  if (x > STAGE.x0 + 0.4 && x < STAGE.x1 - 0.4 && z > STAGE.z0 && z < STAGE.z1 - 0.4) return true;   // 舞台の上
  if (z > 44 && z < 85 && Math.abs(x) < 7.2) return true;                                // 参道・大鳥居前
  if (z > 44 && z < 64 && x > 6 && x < 30) return !inEll(x, z, POND) || (Math.abs(z - BRIDGE.z) < BRIDGE.w / 2 && x > BRIDGE.x0 && x < BRIDGE.x1);
  if (z > -6 && z <= 44 && Math.abs(x) < 24.5) return true;                              // 境内
  if (z > 2 && z < 26 && Math.abs(x) >= 24.5 && Math.abs(x) < 41.6) return true;         // 東西の社（玉垣の内側）
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
  { x0: STAGE.x0, x1: STAGE.x1, z0: STAGE.z0 + 1.6, z1: STAGE.z1, y: STAGE.y },              // 奥の院の舞台
  { x0: HX0, x1: HX1, z0: HZ0, z1: HZ1, y: 1.7 * HONDEN.S },                         // 本殿の中
  { x0: YAKATA.x - 3.8, x1: YAKATA.x + 3.6, z0: YAKATA.z - 1.3, z1: YAKATA.z + 1.3, y: YAKATA.deck + 0.06 },   // 屋形船の座敷
  { x0: SHOIN.x0, x1: SHOIN.x1, z0: SHOIN.z0, z1: SHOIN.z1, y: SHOIN.y },                // 書院の畳
  { x0: -8.8, x1: 8.8, z0: 37.8, z1: 44.2, y: 0.56 },                                     // 楼門の基壇（くぐるときに足が沈まない）
  { x0: -3.0, x1: 3.0, z0: 44.2, z1: 45.15, ramp: [0.56, 0] }, { x0: -3.0, x1: 3.0, z0: 36.85, z1: 37.8, ramp: [0, 0.56] },   // 楼門の前後の石段
  { x0: -3.8 * HONDEN.S, x1: 3.8 * HONDEN.S, z0: HZ1, z1: hw(0, 10.9)[1], ramp: [1.6 * HONDEN.S, 0] },   // 本殿の大階段
  ...[-SMALL.X, SMALL.X].flatMap((cx) => { const { Z, W, D, F } = SMALL, f = Z + D / 2;
    return [{ x0: cx - W / 2, x1: cx + W / 2, z0: Z - D / 2, z1: f + 0.6, y: F + 0.06 }, { x0: cx - 2.2, x1: cx + 2.2, z0: f + 0.6, z1: f + 2.0, ramp: [F, 0] }]; }),
];
export function bridgeY(x, z) {
  if (Math.abs(z - BRIDGE.z) > BRIDGE.w / 2 || x < BRIDGE.x0 || x > BRIDGE.x1) return 0;
  return Math.sin(((x - BRIDGE.x0) / (BRIDGE.x1 - BRIDGE.x0)) * Math.PI) * 1.9 + 0.08;
}
export function footY(x, z) {
  for (const f of floors) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) {
    if (f.table) { const n = f.table.length - 1, i = Math.round(((z - f.z0) / (f.z1 - f.z0)) * n); return f.table[Math.max(0, Math.min(n, i))]; }   // 段ごとの実際の高さ
    if (f.ramp) { const k = (z - f.z0) / (f.z1 - f.z0); return f.ramp[0] + (f.ramp[1] - f.ramp[0]) * k; }
    return f.y;
  }
  return Math.max(height(x, z), bridgeY(x, z));
}

// 地域と道順（地図から選んだとき、道に沿って歩く）
export function region(x, z) {
  if (inHonden(x, z)) return "court";
  if (z > 44) return x > 6 && z < 64 ? "pond" : "sando";
  if (z > 2 && z < 26 && x <= -24.5) return "west";
  if (z > 2 && z < 26 && x >= 24.5) return "east";
  if (x > 33 && z <= 3) return "pagoda";
  if (z <= -5.5) return "trail";
  return "court";
}
const HUB = { sando: [0, 47], pond: [6.6, 54], court: [0, 24], west: [-23, 17], east: [23, 17], trail: [9, -5], pagoda: [38, 0] };
function trailPath(t0, t1) { const pts = [], n = Math.max(2, Math.ceil(Math.abs(t1 - t0) * 40)); for (let i = 1; i <= n; i++) { const p = TRAIL.getPointAt(Math.min(1, Math.max(0, t0 + ((t1 - t0) * i) / n))); pts.push([p.x, p.z]); } return pts; }
// 線分が通れるか（10cm刻みで当たり判定）
export function clear(a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 0.1));
  for (let i = 0; i <= n; i++) if (blocked(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)) return false;
  return true;
}
// 境内の中の道：まっすぐ行けなければ、角の中継点を一つか二つ使う（授与所・御神木・狛狐を避ける）
const COURT_VIA = [[0, 22], [16.2, 16.2], [21.8, 25.8], [8, 15], [-8, 15], [15.5, 26.5], [22.8, 15], [3, 30], [-3, 30], [-17, 16], [-18, 27], [5.5, 10.5], [-5.5, 10.5]];
function courtPath(a, b) {
  if (clear(a, b)) return [];
  let best = null, bl = 1e9;
  const len = (p) => p.reduce((s, q, i) => s + Math.hypot(q[0] - (i ? p[i - 1] : a)[0], q[1] - (i ? p[i - 1] : a)[1]), 0) + Math.hypot(b[0] - p[p.length - 1][0], b[1] - p[p.length - 1][1]);
  for (const v of COURT_VIA) if (clear(a, v) && clear(v, b)) { const l = len([v]); if (l < bl) { bl = l; best = [v]; } }
  if (best) return best;
  for (const v of COURT_VIA) for (const w of COURT_VIA) if (v !== w && clear(a, v) && clear(v, w) && clear(w, b)) { const l = len([v, w]); if (l < bl) { bl = l; best = [v, w]; } }
  return best || [[0, 22]];
}
export function routeTo(from, to) {
  const a = region(...from), b = region(...to);
  if (a === b && a !== "trail") return a === "court" ? [...courtPath(from, to), to] : [to];
  // まず境内（court）へ。東西の社は鳥居（z=17）をくぐってから社の正面へ
  const sx = SMALL.standZ;
  const toCourt = { sando: [[0, 46], [0, 38]], pond: [[6.6, 54], [0, 47], [0, 38]], west: [[-28, sx], [-26.5, 17], [-22.8, 17]], east: [[28, sx], [26.5, 17], [22.8, 17]], pagoda: [[38, 0], [34.5, 3.2], [23, 4.5], [16, 13.5]], court: [] };
  const fromCourt = { sando: [[0, 38], [0, 47]], pond: [[0, 38], [0, 47], [6.6, 54]], west: [[-22.8, 17], [-26.5, 17], [-28, sx]], east: [[22.8, 17], [26.5, 17], [28, sx]], pagoda: [[16, 13.5], [23, 4.5], [34.5, 3.2], [38, 0]], court: [] };
  const TRAIL_IN = [[8, 15], [17.2, 14.8], [18.6, -3], [21.5, -4.2]];
  const pts = [];
  if (a === "trail" && b === "trail") return trailPath(trailT(from), trailT(to)).concat([to]);
  if (a === "trail") pts.push(...trailPath(trailT(from), 0), ...[...TRAIL_IN].reverse()); else pts.push(...toCourt[a]);
  const enter = b === "trail" ? TRAIL_IN[0] : fromCourt[b][0] || to;
  pts.push(...courtPath(pts.length ? pts[pts.length - 1] : from, enter));
  if (b === "trail") pts.push(...TRAIL_IN, ...trailPath(0, trailT(to))); else pts.push(...fromCourt[b]);
  pts.push(to);
  return pts;
}
function trailT(p) { if (Math.hypot(p[0] + 2, p[1] + 74) < 12) return 1; return trailInfo(p[0], p[1]).t; }
export const HUBS = HUB;
