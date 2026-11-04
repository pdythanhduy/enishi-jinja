// 末社：境内のあちこちにまつられた小さなお社。それぞれの神さまと御利益、お参りすると御朱印がいただける。
// 置き場所は神さまに合わせて：祓戸は入口、恵比寿は門前の商いのそば、猿田彦は一の鳥居、厳島（弁天）は池、
// 水神は手水舎のそば、天神は合格の社の梅林、稲荷は千本鳥居の登り口、山の神は山道の途中。
import * as THREE from "three";
import { MAT, box, cyl, roof, torii } from "./arch.js?v=11041008";
import { height } from "./map.js?v=11041008";

export const MASHA = [
  { id: "haraedo", name: "祓戸社", kami: "祓戸大神", goriyaku: "罪・けがれを祓う", at: [-6.7, 74.3], stand: [-4.9, 74.3], mark: "祓", gate: "wood",
    text: "参道の入口で、まず身と心のけがれを祓っていただくお社です。大きな神社では、本殿へ向かう前にここで手を合わせます。" },
  { id: "ebisu", name: "恵比寿社", kami: "事代主神（えびすさま）", goriyaku: "商売繁盛・大漁", at: [-8.7, 84.2], stand: [-6.5, 84.2], mark: "鯛", gate: "shu",
    text: "門前町の商いを見守るえびすさま。釣り竿と鯛を持つ姿で親しまれ、商いと暮らしの実りを授けてくださいます。" },
  { id: "saruta", name: "猿田彦社", kami: "猿田彦大神", goriyaku: "道開き・交通安全・導き", at: [7.6, 120.6], stand: [5.6, 120.6], mark: "導", gate: "stone",
    text: "神話で、天から降りた神々の道案内をした神さま。旅のはじまりや、新しい一歩を踏み出すときに、よい方向へ導いてくださいます。" },
  { id: "itsuku", name: "厳島社", kami: "市杵島姫命（弁天さま）", goriyaku: "芸事・財運・水の守り", at: [29.2, 49.4], stand: [27.2, 49.6], mark: "琵", gate: "shu",
    text: "水辺にまつられる女神。弁天さまとも呼ばれ、音楽や芸事の上達、財運を願う人がお参りします。池のほとりにあるのはそのためです。" },
  { id: "suijin", name: "水神社", kami: "罔象女神", goriyaku: "水の恵み・清め", at: [16.6, 36.4], stand: [16.6, 34.4], mark: "水", gate: "wood",
    text: "井戸や川、田をうるおす水の神さま。手水舎の清らかな水も、この神さまの恵みと考えられています。" },
  { id: "tenjin", name: "天神社", kami: "菅原道真公", goriyaku: "学業成就・文筆", at: [39.6, 21.5], stand: [39.6, 19.4], mark: "梅", gate: "stone",
    text: "学問の神さま、天神さま。梅の花を愛したことから、天神社のまわりには梅が植えられます。合格の社の梅林にあるのはそのためです。" },
  { id: "inari", name: "稲荷社", kami: "宇迦之御魂神（お稲荷さま）", goriyaku: "五穀豊穣・商売繁盛", at: [25.3, -7.6], stand: [21.6, -7.6], mark: "稲", gate: "shu", foxes: true,
    text: "稲の実りの神さま。狐はお稲荷さまの使いです。願いが通ったお礼に鳥居を奉納する習わしが、千本鳥居のはじまりといわれます。" },
  { id: "yama", name: "山神社", kami: "大山祇神（山の神）", goriyaku: "山の安全・家内安全", at: [-3.4, -25.7], stand: [-3.3, -28.3], mark: "山", gate: "wood",
    text: "この山そのものを守る山の神さま。山道を行く人の無事を見守ります。奥の院へ登る前に、ひと声かけていきましょう。" },
];

const FONT = (px) => `bold ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
function plaque(text) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64 * text.length + 24; const q = c.getContext("2d");
  q.fillStyle = "#1d1a17"; q.fillRect(0, 0, c.width, c.height); q.strokeStyle = "#c9a560"; q.lineWidth = 4; q.strokeRect(3, 3, c.width - 6, c.height - 6);
  q.fillStyle = "#e8c67a"; q.font = FONT(46); q.textAlign = "center"; q.textBaseline = "top"; [...text].forEach((ch, i) => q.fillText(ch, 32, 12 + i * 64));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const white = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 });
function fox(g, x, z, ry) {   // 小さな白狐（お稲荷さまの使い）
  const f = new THREE.Group(); f.position.set(x, 0.3, z); f.rotation.y = ry; g.add(f);
  box(f, 0.34, 0.3, 0.34, MAT.stoneD, 0, -0.15, 0);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.38, 8), white); body.position.y = 0.19; f.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), white); head.position.set(0, 0.42, 0.03); f.add(head);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6), white); e.position.set(s * 0.05, 0.53, 0.02); f.add(e); }
  const bib = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1, 8, 1, true), MAT.shu); bib.position.set(0, 0.32, 0.03); bib.rotation.x = Math.PI; f.add(bib);
}
// 流造の小さなお社と、前の鳥居・賽銭箱
function hokora(scene, m) {
  const [x, z] = m.at, y = height(x, z), ry = Math.atan2(m.stand[0] - x, m.stand[1] - z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.userData.static = true; scene.add(g);
  box(g, 1.9, 0.9, 1.7, MAT.stoneD, 0, 0.0, -0.1);                                            // 石の基壇（地面に少し埋める）
  box(g, 1.1, 0.95, 0.85, MAT.hinoki, 0, 0.92, -0.2);                                         // 本体
  box(g, 0.74, 0.66, 0.04, MAT.kuro, 0, 0.88, 0.24);                                          // 御扉
  for (const s of [-1, 1]) cyl(g, 0.035, 0.035, 0.04, MAT.gold, s * 0.08, 0.9, 0.27, 8).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) cyl(g, 0.05, 0.05, 1.0, MAT.hinoki, s * 0.5, 0.95, 0.55, 8);       // 向拝の柱（流造：前に長くのびる屋根を支える）
  box(g, 0.9, 0.08, 0.3, MAT.woodD, 0, 0.5, 0.45); box(g, 0.9, 0.08, 0.26, MAT.woodD, 0, 0.36, 0.72);   // 小さな階
  roof(g, { w: 1.5, d: 2.2, h: 0.6, lift: 0.08, thick: 0.1, mat: MAT.copper, under: MAT.woodD, y: 1.42, z: 0.12, gable: false, ridgeGold: false });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2 * (m.name.length + 0.4)), new THREE.MeshStandardMaterial({ map: plaque(m.name), roughness: 0.6 }));
  pl.position.set(0, 1.52, 0.6); g.add(pl);
  box(g, 0.5, 0.32, 0.3, MAT.wood, 0, 0.16, 1.2);                                             // 賽銭箱
  const gm = m.gate === "stone" ? MAT.stoneD : m.gate === "wood" ? MAT.woodL : MAT.shu;
  torii(g, { z: 1.55, s: 0.48, gaku: null, mat: gm, top: m.gate === "shu" ? MAT.kuro : gm });
  if (m.foxes) { fox(g, -0.72, 1.05, 0.3); fox(g, 0.72, 1.05, -0.3); }
  return g;
}
export function buildMasha(scene) {
  const root = new THREE.Group(); root.userData.static = true; scene.add(root);
  for (const m of MASHA) hokora(root, m);
  return root;
}
