// えにし神社 — ネット神社（Three.js, ログイン不要）
// 境内：千本鳥居の参道 → 狛狐 → 拝殿（賽銭箱・鈴）。紅葉・石灯籠・提灯。
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HALLS, OMIKUJI, RANKS, NAMES_A, NAMES_B, EMA_CATS } from "./content.js";
import { connect, board } from "./net.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { wagara, Lanterns, fireflies, moon, ambience } from "./fx.js";
import { buildSpots } from "./spots.js";

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);  // JST

// ------------------------------------------------------------------ renderer / scene
const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 700;
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x262a44, 0.014);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);

// 夕暮れの空（グラデーション）
{
  const g = new THREE.SphereGeometry(200, 32, 16);
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x070b22) }, mid: { value: new THREE.Color(0x3c2b55) }, hor: { value: new THREE.Color(0xd8714a) }, bot: { value: new THREE.Color(0x1a1622) } },
    vertexShader: "varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.); }",
    fragmentShader: "uniform vec3 top,mid,hor,bot; varying vec3 vP; float hs(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }"
      + "void main(){ vec3 d=normalize(vP); float h=d.y; vec3 c = h>0.0 ? mix(mix(hor,mid,smoothstep(0.0,0.18,h)),top,smoothstep(0.15,0.7,h)) : mix(hor,bot,smoothstep(0.0,0.2,-h));"
      + " vec3 q=floor(d*380.0); float st=step(0.9975,hs(q))*smoothstep(0.08,0.45,h); c+=vec3(1.0,0.95,0.85)*st*(0.6+0.4*hs(q+1.0)); gl_FragColor=vec4(c,1.); }" });
  scene.add(new THREE.Mesh(g, m));
}
scene.add(new THREE.HemisphereLight(0xb3c0ff, 0x4a3a3a, 1.0));
scene.add(new THREE.AmbientLight(0xffc48a, 0.28));
const sun = new THREE.DirectionalLight(0xd6deff, 1.25);  // 月明かり
sun.position.set(-18, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 80 });
scene.add(sun);

// ------------------------------------------------------------------ materials
const M = {
  shu: new THREE.MeshStandardMaterial({ color: 0xd9412b, roughness: 0.55 }),           // 朱
  kuro: new THREE.MeshStandardMaterial({ color: 0x1d1b1a, roughness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.8 }),
  woodL: new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.75 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x2f3d33, roughness: 0.6 }),            // 銅板の緑青
  stone: new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: 0.95 }),
  stoneD: new THREE.MeshStandardMaterial({ color: 0x6f6b64, roughness: 0.95 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0x8f8676, roughness: 1 }),
  moss: new THREE.MeshStandardMaterial({ color: 0x5f6e44, roughness: 1 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.8, roughness: 0.3 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffa94d, emissiveIntensity: 2.6, roughness: 0.9 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffa94d, emissiveIntensity: 3.2 }),
  rope: new THREE.MeshStandardMaterial({ color: 0xd8c99a, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.8 }),
};
const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  parent.add(m); return m;
};

// ------------------------------------------------------------------ 地面・参道
const ground = add(new THREE.PlaneGeometry(160, 160), M.moss, 0, 0, 0, scene);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.castShadow = false;
const court = add(new THREE.PlaneGeometry(30, 22), M.gravel, 0, 0.01, -14);          // 境内の玉砂利
court.rotation.x = -Math.PI / 2; court.castShadow = false;
for (let z = 26; z > -4; z -= 1.15) {                                                  // 石畳の参道
  const s = add(new THREE.BoxGeometry(rand(2.6, 3.0), 0.12, 1.0), M.stone, rand(-0.06, 0.06), 0.06, z);
  s.rotation.y = rand(-0.03, 0.03);
}
const walkable = [ground, court];

// ------------------------------------------------------------------ 鳥居
function torii(z, scale = 1, big = false) {
  const g = new THREE.Group(); g.position.set(0, 0, z); g.scale.setScalar(scale);
  const w = 3.6, h = 4.2;
  for (const x of [-w / 2, w / 2]) {
    add(new THREE.CylinderGeometry(0.17, 0.2, h, 16), M.shu, x, h / 2, 0, g);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.35, 16), M.kuro, x, 0.17, 0, g);       // 根巻
  }
  add(new THREE.BoxGeometry(w + 0.8, 0.22, 0.28), M.shu, 0, h - 0.65, 0, g);           // 貫
  const kasagi = add(new THREE.BoxGeometry(w + 1.6, 0.26, 0.42), M.kuro, 0, h + 0.08, 0, g); // 笠木
  add(new THREE.BoxGeometry(w + 1.3, 0.2, 0.36), M.shu, 0, h - 0.12, 0, g);            // 島木
  if (big) add(new THREE.BoxGeometry(0.7, 0.8, 0.08), M.kuro, 0, h - 0.4, 0.18, g);     // 額束
  scene.add(g); return g;
}
torii(27, 1.35, true);
for (let z = 22; z > 4; z -= 1.05) torii(z, 0.86);                                     // 千本鳥居
torii(1.5, 1.25, true);

// ------------------------------------------------------------------ 石灯籠・提灯
const flames = [];
function toro(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  add(new THREE.CylinderGeometry(0.42, 0.5, 0.25, 6), M.stoneD, 0, 0.12, 0, g);
  add(new THREE.CylinderGeometry(0.13, 0.16, 1.0, 12), M.stone, 0, 0.75, 0, g);
  add(new THREE.CylinderGeometry(0.42, 0.3, 0.18, 6), M.stone, 0, 1.33, 0, g);
  add(new THREE.BoxGeometry(0.5, 0.42, 0.5), M.stone, 0, 1.62, 0, g);
  const f = add(new THREE.BoxGeometry(0.3, 0.26, 0.52), M.glow, 0, 1.62, 0, g, false); flames.push(f);
  add(new THREE.ConeGeometry(0.55, 0.38, 6), M.stoneD, 0, 2.0, 0, g);
  add(new THREE.SphereGeometry(0.09, 10, 8), M.stone, 0, 2.24, 0, g);
  const l = new THREE.PointLight(0xffa04a, 7, 9, 1.6); l.position.set(0, 1.62, 0); g.add(l);
  scene.add(g);
}
for (const z of [24, 17, 10]) { toro(-2.9, z); toro(2.9, z); }
toro(-5.5, -6); toro(5.5, -6);

function chochin(x, y, z, parent = scene) {                                            // 提灯
  const c = add(new THREE.SphereGeometry(0.32, 16, 12), M.paper, x, y, z, parent, false);
  c.scale.y = 1.35;
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), M.kuro, x, y + 0.45, z, parent, false);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12), M.kuro, x, y - 0.45, z, parent, false);
  flames.push(c);
  return c;
}

// ------------------------------------------------------------------ 狛狐（稲荷の神使）
const foxes = [];
function komagitsune(x, z, flip) {
  const g = new THREE.Group(); foxes.push(g); g.position.set(x, 0, z); g.rotation.y = flip ? -0.5 : 0.5;
  add(new THREE.BoxGeometry(1.1, 0.9, 1.1), M.stoneD, 0, 0.45, 0, g);
  add(new THREE.BoxGeometry(1.25, 0.15, 1.25), M.stone, 0, 0.95, 0, g);
  const body = add(new THREE.SphereGeometry(0.36, 16, 12), M.white, 0, 1.38, 0, g); body.scale.set(0.9, 1.25, 0.9);
  const head = add(new THREE.SphereGeometry(0.26, 16, 12), M.white, 0, 1.95, 0.1, g); head.scale.set(1, 0.95, 1.15);
  add(new THREE.ConeGeometry(0.11, 0.25, 8), M.white, 0, 1.9, 0.38, g).rotation.x = Math.PI / 2;   // 鼻先
  for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.09, 0.28, 8), M.white, s * 0.13, 2.22, 0.05, g);
  const tail = add(new THREE.SphereGeometry(0.22, 12, 10), M.white, 0, 1.55, -0.42, g); tail.scale.set(0.7, 1.6, 0.7);
  add(new THREE.TorusGeometry(0.2, 0.05, 8, 20), M.shu, 0, 1.68, 0.12, g).rotation.x = Math.PI / 2.4; // 赤いよだれかけ
  add(new THREE.SphereGeometry(0.06, 8, 8), M.gold, 0, 1.6, 0.42, g);                     // 宝珠
  scene.add(g);
}
komagitsune(-3.2, -1.5, false); komagitsune(3.2, -1.5, true);

// ------------------------------------------------------------------ 拝殿
const shrine = new THREE.Group(); shrine.position.set(0, 0, -16); scene.add(shrine);
{
  add(new THREE.BoxGeometry(12, 0.8, 8), M.stoneD, 0, 0.4, 0, shrine);                    // 基壇
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(4.2 - i * 0.2, 0.2, 0.5), M.stone, 0, 0.1 + i * 0.2, 4.25 + (3 - i) * 0.45, shrine); // 階段
  add(new THREE.BoxGeometry(10.5, 0.22, 7), M.wood, 0, 0.91, 0, shrine);                   // 床
  for (const x of [-4.6, -1.6, 1.6, 4.6]) for (const z of [-3, 3]) add(new THREE.CylinderGeometry(0.2, 0.2, 3.6, 12), M.shu, x, 2.8, z, shrine);
  add(new THREE.BoxGeometry(9.6, 3.2, 0.15), M.woodL, 0, 2.6, -2.9, shrine);              // 奥の壁
  for (const x of [-3.1, 0, 3.1]) add(new THREE.BoxGeometry(2.6, 2.4, 0.06), M.white, x, 2.5, -2.8, shrine); // 障子
  add(new THREE.BoxGeometry(10.4, 0.3, 6.6), M.shu, 0, 4.65, 0, shrine);                  // 梁
  // 屋根（入母屋風に2枚の傾いた板）
  for (const s of [-1, 1]) {
    const r = add(new THREE.BoxGeometry(13.5, 0.28, 5.4), M.roof, 0, 5.75, s * 2.15, shrine);
    r.rotation.x = s * 0.5;
  }
  add(new THREE.BoxGeometry(13.6, 0.3, 0.4), M.kuro, 0, 6.85, 0, shrine);                  // 棟
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.9, 0.3), M.gold, s * 6.7, 6.95, 0, shrine); // 千木風
  // しめ縄と紙垂
  const rope = add(new THREE.TorusGeometry(4.2, 0.18, 10, 40, Math.PI), M.rope, 0, 4.4, 3.35, shrine);
  rope.rotation.z = Math.PI; rope.scale.y = 0.18;
  for (const x of [-2.8, -1, 1, 2.8]) add(new THREE.BoxGeometry(0.22, 0.6, 0.02), M.white, x, 3.9, 3.38, shrine, false);
  // 提灯
  chochin(-3.2, 3.85, 3.2, shrine); chochin(3.2, 3.85, 3.2, shrine);
  const inner = new THREE.PointLight(0xffb36b, 6, 12, 1.6); inner.position.set(0, 3, 0); shrine.add(inner);
}
// 賽銭箱
const SZ = -9.6;  // 賽銭箱は石段の手前、地面の上
const saisen = add(new THREE.BoxGeometry(2.4, 0.9, 1.0), M.wood, 0, 0.45, SZ);
for (let i = -5; i <= 5; i++) add(new THREE.BoxGeometry(0.06, 0.05, 0.95), M.kuro, i * 0.2, 0.92, SZ, scene, false);
add(new THREE.BoxGeometry(2.0, 0.3, 0.05), M.gold, 0, 0.45, SZ + 0.52, scene, false);
add(new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }), 0, 0.5, SZ + 0.53, scene, false);
// 鈴と鈴緒
const suzuGroup = new THREE.Group(); suzuGroup.position.set(0, 4.3, SZ - 0.9); scene.add(suzuGroup);
const suzu = add(new THREE.SphereGeometry(0.34, 20, 16), M.gold, 0, -0.35, 0, suzuGroup);
const suzuo = new THREE.Group(); suzuGroup.add(suzuo);
for (const [c, dx] of [[0xd9412b, -0.07], [0xf4f1ea, 0], [0x3b6db0, 0.07]]) {
  const r = add(new THREE.CylinderGeometry(0.045, 0.045, 2.9, 8), new THREE.MeshStandardMaterial({ color: c }), dx, -2.1, 0, suzuo);
  r.castShadow = false;
}

// ------------------------------------------------------------------ 寄り道スポット
const SP = buildSpots(scene);
const clickables = [...SP.spots.map((x) => x.obj), ...foxes];

// ------------------------------------------------------------------ 紅葉・木々
const leafCols = [0xc8381f, 0xe0542a, 0xe8892f, 0xb02a24, 0xd9a13a];
function tree(x, z, momiji = true) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const h = rand(2.4, 3.6);
  add(new THREE.CylinderGeometry(0.12, 0.2, h, 8), M.wood, 0, h / 2, 0, g);
  const mat = new THREE.MeshStandardMaterial({ color: momiji ? pick(leafCols) : 0x2e4a2a, roughness: 0.9, flatShading: true });
  for (let i = 0; i < 5; i++) {
    const s = add(new THREE.IcosahedronGeometry(rand(0.7, 1.2), 0), mat, rand(-0.8, 0.8), h + rand(-0.3, 0.9), rand(-0.8, 0.8), g);
    s.rotation.set(rand(0, 3), rand(0, 3), 0);
  }
  scene.add(g);
}
for (let i = 0; i < 70; i++) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side * rand(4.6, 30), z = rand(-34, 34);
  if (Math.abs(x) < 16 && z < -2 && z > -22) continue;   // 境内は空ける
  tree(x, z, Math.random() < 0.65);
}
// 散る紅葉
const leafGeo = new THREE.PlaneGeometry(0.16, 0.16);
const fall = new THREE.InstancedMesh(leafGeo, new THREE.MeshBasicMaterial({ color: 0xe0542a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 160);
const fallData = [];
const dummy = new THREE.Object3D();
for (let i = 0; i < 160; i++) fallData.push({ x: rand(-14, 14), y: rand(0, 9), z: rand(-24, 26), s: rand(0.4, 1), r: rand(0, 6) });
scene.add(fall);

// ------------------------------------------------------------------ 祈りの灯り・蛍・月
moon(scene);
const lanterns = new Lanterns(scene);
const ffUpdate = fireflies(scene, MOBILE ? 50 : 90);
let todayLights = 0;
const setLights = (n) => { todayLights = n; $("#lights").textContent = n.toLocaleString(); };
function releaseLight(x, z, mine) {
  lanterns.spawn(x, 1.6, z - 0.6, { mine });
  setLights(todayLights + 1);
}

// ------------------------------------------------------------------ アバター（浴衣のちびキャラ）
const YUKATA = [[0x2c3e73, 0xe8c67a], [0xc8432f, 0x2b2b2b], [0x5c8a5a, 0xf2e2c4], [0xe7a2b4, 0x6b3a5a], [0xe0b23a, 0x3b4f7a], [0x6a4c93, 0xe8c67a], [0xf4f1ea, 0xc8432f]];
function makeAvatar(seed = Math.random()) {
  const [kimono, obi] = YUKATA[Math.floor(seed * YUKATA.length) % YUKATA.length];
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);                                  // 上半身（お辞儀で傾ける）
  const skin = new THREE.MeshStandardMaterial({ color: 0xf6d7bd, roughness: 0.8 });
  const PATS = ["asanoha", "ichimatsu", "seigaiha", "yagasuri", "sakura"];
  const pat = PATS[Math.floor(seed * 997) % PATS.length];
  const accent = new THREE.Color(kimono).offsetHSL(0, -0.1, kimono === 0xf4f1ea ? -0.35 : 0.18).getHex();
  const km = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wagara(pat, kimono, accent), roughness: 0.85 });
  const om = new THREE.MeshStandardMaterial({ color: obi, roughness: 0.7 });
  add(new THREE.CylinderGeometry(0.28, 0.42, 0.62, 16), km, 0, 0.31, 0, g);     // 裾
  add(new RoundedBoxGeometry(0.62, 0.5, 0.46, 3, 0.16), km, 0, 0.78, 0, body);   // 胴
  add(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 16), om, 0, 0.66, 0, body);   // 帯
  add(new THREE.BoxGeometry(0.06, 0.34, 0.02), new THREE.MeshStandardMaterial({ color: 0xf4f1ea }), -0.06, 0.92, 0.235, body).rotation.z = 0.5; // 襟
  const head = add(new THREE.SphereGeometry(0.42, 24, 18), skin, 0, 1.38, 0, body);
  const hair = add(new THREE.SphereGeometry(0.44, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 }), 0, 1.42, -0.02, body);
  hair.rotation.x = -0.25;
  const hairM = hair.material, style = Math.floor(seed * 7919) % 3;
  if (style === 0) { add(new THREE.SphereGeometry(0.17, 14, 12), hairM, 0, 1.86, -0.12, body);                 // お団子
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), M.gold, 0.08, 1.9, -0.12, body, false).rotation.z = 1.1; } // かんざし
  else if (style === 1) { const b = add(new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.35), hairM, 0, 1.36, -0.04, body); b.scale.set(1.02, 1, 1); } // ボブ
  else { const pt = add(new THREE.CylinderGeometry(0.08, 0.04, 0.5, 10), hairM, 0, 1.3, -0.42, body); pt.rotation.x = 0.35; } // ポニーテール

  for (const s of [-1, 1]) {                                                    // 目（アニメ風：大きな黒目＋ハイライト）
    const e = add(new THREE.SphereGeometry(0.075, 12, 10), M.kuro, s * 0.15, 1.36, 0.36, body, false); e.scale.set(0.8, 1.15, 0.5);
    add(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.15 + 0.02, 1.4, 0.4, body, false);
  }
  add(new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8a3b3b }), 0, 1.24, 0.405, body, false).rotation.z = Math.PI; // 口
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf3a3a3, transparent: true, opacity: 0.6 }), s * 0.24, 1.26, 0.33, body, false); // 頬
  const arms = [];
  for (const s of [-1, 1]) {                                                    // 腕（袖）
    const a = new THREE.Group(); a.position.set(s * 0.33, 0.95, 0); body.add(a);
    add(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 10), km, 0, -0.2, 0, a);
    add(new THREE.SphereGeometry(0.08, 10, 8), skin, 0, -0.43, 0, a);
    a.rotation.z = s * 0.25; arms.push(a);
  }
  if (seed > 0.55) {                                                           // 狐面を頭の横に
    const mask = new THREE.Group(); mask.position.set(0.3, 1.62, 0.12); mask.rotation.set(-0.2, 0.7, -0.4); body.add(mask);
    const f = add(new THREE.SphereGeometry(0.17, 14, 12), M.white, 0, 0, 0, mask); f.scale.set(1, 0.9, 0.55);
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.06, 0.14, 6), M.white, s * 0.09, 0.15, -0.02, mask);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.015, 0.02), M.shu, s * 0.06, 0.02, 0.09, mask, false);
  }
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.16, 0.06, 0.28), M.wood, s * 0.13, 0.03, 0.04, g);     // 下駄
  if (seed > 0.3 && seed < 0.55) {                                               // 小さな提灯を持つ人も
    const lamp = add(new THREE.SphereGeometry(0.11, 12, 10), M.paper, 0, -0.62, 0.05, arms[1], false); lamp.scale.y = 1.3;
  }
  g.userData = { body, arms, head, walk: 0 };
  return g;
}

// ------------------------------------------------------------------ 自分
const myLook = store.get("enishi_look", null) ?? Math.random(); store.set("enishi_look", myLook);
const me = makeAvatar(myLook);
me.position.set(0, 0, 29); me.rotation.y = Math.PI;
scene.add(me);
const myName = store.get("enishi_name", null) || `${pick(NAMES_A)}${pick(NAMES_B)}`;
store.set("enishi_name", myName);
$("#me-tag").textContent = "わたし · " + myName;

// ------------------------------------------------------------------ ほかの参拝者
const others = new Map();
function addOther(o) {
  if (others.has(o.id)) return;
  const av = makeAvatar(o.look || Math.random()); av.position.set(o.x ?? 0, 0, o.z ?? 29); av.rotation.y = o.ry ?? Math.PI; scene.add(av);
  const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = o.name || "参拝者"; document.body.appendChild(tag);
  others.set(o.id, { av, tag, to: new THREE.Vector3(o.x ?? 0, 0, o.z ?? 29), ry: o.ry ?? Math.PI, bubble: null });
}
function removeOther(id) { const o = others.get(id); if (!o) return; scene.remove(o.av); o.tag.remove(); o.bubble?.remove(); others.delete(id); }
function bubble(o, text, ms = 2500) {
  o.bubble?.remove(); const b = document.createElement("div"); b.className = "tag bub"; b.textContent = text; document.body.appendChild(b); o.bubble = b;
  setTimeout(() => { if (o.bubble === b) { b.remove(); o.bubble = null; } }, ms);
}
async function otherAct(o, a, r) {
  const u = o.av.userData;
  if (a === "bow") {
    for (const v of [1.2, 0]) {
      const s0 = u.body.rotation.x, t0 = performance.now();
      await new Promise((res) => (function f() { const k = Math.min(1, (performance.now() - t0) / 600); u.body.rotation.x = s0 + (v - s0) * k; k < 1 ? requestAnimationFrame(f) : res(); })());
      await wait(300);
    }
  } else if (a === "clap") { bubble(o, "👏"); releaseLight(o.av.position.x, o.av.position.z, false); }
  else if (a === "suzu") bubble(o, "🔔");
  else if (a === "kuji") bubble(o, r ? `🎋 ${r}` : "🎋", 4000);
  else if (a === "ema") bubble(o, "🪵 絵馬を奉納");
  else if (a === "report") bubble(o, "🎉 当選しました！", 5000);
  else if (a === "pray") bubble(o, "🙏");
  else if (a === "musubi") { bubble(o, "🎋 結んだ"); SP.addKuji(1); }
  else if (a === "omokaru") bubble(o, r === "軽" ? "🪨 軽い！" : "🪨 重い…");
  else if (a === "goldfox") { bubble(o, "✨ 金の狐！", 4000); releaseLight(o.av.position.x, o.av.position.z, false); }
}
let net = null;
const setCount = (n) => { $("#ppl").textContent = Math.max(1, n || 1); };

// ------------------------------------------------------------------ ポストエフェクト（ぼんやり光る）
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), MOBILE ? 0.7 : 0.9, 0.55, 0.72);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ カメラ
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.47; controls.minPolarAngle = Math.PI * 0.18;
camera.position.set(0, 5, 37);
controls.target.set(0, 1.2, 29);

// ------------------------------------------------------------------ 歩く
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let target = null, busy = false, onArrive = null;
let downAt = null;
canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
canvas.addEventListener("pointerup", (e) => {
  if (!downAt || busy) return;
  const [x, y, t] = downAt; downAt = null;
  if (Math.hypot(e.clientX - x, e.clientY - y) > 8 || performance.now() - t > 400) return;   // ドラッグは見回し
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const sh = ray.intersectObjects(clickables, true)[0];
  if (sh) { let o = sh.object; while (o && !clickables.includes(o)) o = o.parent; if (o) { useSpot(o); $("#hint").style.opacity = 0; return; } }
  const hit = ray.intersectObjects(walkable)[0];
  if (hit) walkTo(hit.point.x, hit.point.z);
  $("#hint").style.opacity = 0;
});
function clampPos(x, z) {
  x = THREE.MathUtils.clamp(x, -14, 14); z = THREE.MathUtils.clamp(z, SZ + 1.1, 32);
  if (z < SZ + 2 && Math.abs(x) < 1.5) z = Math.max(z, SZ + 1.1);
  if (z < 26 && z > 3 && Math.abs(x) > 1.3 && Math.abs(x) < 2.6) x = Math.sign(x) * 1.3;       // 鳥居の柱をすり抜けない
  return [x, z];
}
function walkTo(x, z, cb = null) { [x, z] = clampPos(x, z); target = new THREE.Vector3(x, 0, z); onArrive = cb; }
const SPEED = 3.2;
function stepMove(dt) {
  const u = me.userData;
  if (target) {
    const d = target.clone().sub(me.position); d.y = 0;
    const dist = d.length();
    if (dist < 0.06) { target = null; u.walk = 0; const cb = onArrive; onArrive = null; cb && cb(); }
    else {
      const ang = Math.atan2(d.x, d.z);
      me.rotation.y += ((((ang - me.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 10);
      me.position.add(d.normalize().multiplyScalar(Math.min(dist, SPEED * dt)));
      u.walk += dt * 11;
    }
  }
  const bob = target ? Math.abs(Math.sin(u.walk)) * 0.08 : 0;
  u.body.position.y = bob;
  u.arms.forEach((a, i) => { if (!u.pose) a.rotation.x = target ? Math.sin(u.walk + i * Math.PI) * 0.5 : 0; });
}

// ------------------------------------------------------------------ 音（WebAudioで合成：ファイル不要）
let AC = null, muted = store.get("enishi_mute", false);
const ac = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(freqs, dur = 2.5, gain = 0.25) {
  if (muted) return; const a = ac(), t = a.currentTime, out = a.createGain(); out.gain.value = gain; out.connect(a.destination);
  freqs.forEach(([f, g]) => { const o = a.createOscillator(), v = a.createGain(); o.frequency.value = f; o.type = "sine";
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur * (0.5 + g)); o.connect(v).connect(out); o.start(t); o.stop(t + dur * 1.5); });
}
const sfx = {
  suzu: () => { for (let i = 0; i < 6; i++) setTimeout(() => tone([[2093 + rand(-30, 30), 0.5], [3136, 0.3], [4186, 0.2]], 1.2, 0.12), i * 90); },
  clap: () => { if (muted) return; const a = ac(), n = a.sampleRate * 0.12, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "bandpass"; f.frequency.value = 1400; g.gain.value = 0.9; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(); },
  coin: () => tone([[1567, 0.6], [2349, 0.3]], 0.5, 0.15),
  gong: () => tone([[110, 0.8], [220, 0.4], [331, 0.2]], 3.5, 0.2),
};
$("#btn-sound").textContent = muted ? "🔇" : "🔈";
const startAmb = ambience(() => ac(), () => muted);
addEventListener("pointerdown", () => { ac(); startAmb(); }, { once: false });
$("#btn-sound").onclick = () => { muted = !muted; store.set("enishi_mute", muted); $("#btn-sound").textContent = muted ? "🔇" : "🔈"; };

// ------------------------------------------------------------------ UI helpers
const toast = (t, ms = 2600) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), ms); };
const stepText = (t) => { const el = $("#step"); el.textContent = t; el.classList.toggle("on", !!t); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const open = (id) => { $(id).hidden = false; };
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => (b.closest(".modal").hidden = true)));
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; }));

let hall = HALLS[0];
$("#hall-name").textContent = hall.name;

// ------------------------------------------------------------------ 寄り道スポットの動き
let purified = false;
function splash() {
  if (muted) return; const a = ac(), n = a.sampleRate * 0.5, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2) * 0.5;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = "highpass"; f.frequency.value = 1800; g.gain.value = 0.35;
  src.buffer = b; src.connect(f).connect(g).connect(a.destination); src.start();
}
function drops(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const d = add(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x9fd4ff }), x + rand(-0.15, 0.15), y, z + rand(-0.1, 0.1), scene, false);
    const vy = rand(0.5, 1.4), vx = rand(-0.5, 0.5), t0 = performance.now();
    (function f() { const k = (performance.now() - t0) / 1000; d.position.y = y + vy * k - 4.9 * k * k; d.position.x += vx * 0.01;
      if (d.position.y > 0.1 && k < 1.2) requestAnimationFrame(f); else scene.remove(d); })();
  }
}
async function useSpot(o) {
  if (busy) return;
  if (foxes.includes(o)) return petFox(o);
  const sp = SP.spots.find((x) => x.obj === o); if (!sp) return;
  busy = true; setActions(false);
  await new Promise((r) => walkTo(sp.stand[0], sp.stand[1], r));
  me.rotation.y = sp.face; const u = me.userData; u.pose = true;
  try {
    if (sp.name === "temizu") {
      for (const [t, arm] of [["左手を清める", 1], ["右手を清める", 0], ["口をすすぐ", 1], ["柄杓を清める", 1]]) {
        stepText(t); u.arms[arm].rotation.x = -1.2; splash(); drops(me.position.x + (arm ? 0.3 : -0.3), 1.0, me.position.z - 0.5); await wait(1300); u.arms[arm].rotation.x = 0;
      }
      stepText(""); purified = true; toast("心と手を清めました。気持ちよくお参りできます 💧");
    } else if (sp.name === "omokaru") {
      stepText("願いを思い浮かべて…"); await wait(1500);
      stepText("石を持ち上げる"); u.arms.forEach((a) => (a.rotation.x = -1.6));
      const light = Math.random() < 0.5, st = SP.omoStone, y0 = st.position.y, t0 = performance.now(), dur = light ? 600 : 1800;
      await new Promise((res) => (function f() { const k = Math.min(1, (performance.now() - t0) / dur);
        st.position.y = y0 + (light ? 0.6 : 0.18) * Math.sin(k * Math.PI) + (light ? 0 : Math.sin(k * 40) * 0.01); k < 1 ? requestAnimationFrame(f) : res(); })());
      u.arms.forEach((a) => (a.rotation.x = 0)); stepText("");
      if (light) { sfx.suzu(); toast("「軽い！」思ったより軽く持ち上がりました。願いは近いうちに叶いそうです ✨", 4200); }
      else { sfx.gong(); toast("「重い…」願いを叶えるには、もう少し準備と努力を。焦らず進めば大丈夫です 🪨", 4200); }
      net?.act("omokaru", light ? "軽" : "重");
    } else if (sp.name === "emarack") {
      u.pose = false; busy = false; setActions(true); renderEma(); loadEma(); open("#m-ema"); return;
    } else if (sp.name === "musubi") {
      const done = store.get("enishi_kuji", {})[hall.id] === today();
      if (!done) toast("先におみくじを引いてから、ここに結びましょう 🎋");
      else { u.arms.forEach((a) => (a.rotation.x = -1.4)); await wait(900); u.arms.forEach((a) => (a.rotation.x = 0)); SP.addKuji(1); toast("おみくじを結びました。良い縁がありますように 🎋"); net?.act("musubi"); }
    }
  } finally { u.pose = false; busy = false; setActions(true); stepText(""); }
}
const goldM = new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 0.9, roughness: 0.25, emissive: 0x7a5400, emissiveIntensity: 0.6 });
function petFox(fox) {
  const b = document.createElement("div"); b.className = "tag bub"; b.textContent = "コン♪"; document.body.appendChild(b);
  const v = new THREE.Vector3(); fox.getWorldPosition(v); v.y += 2.6; v.project(camera);
  b.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px"; b.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px"; setTimeout(() => b.remove(), 1500);
  tone([[880, 0.4], [1320, 0.2]], 0.4, 0.12);
  const n = store.get("enishi_pet", 0) + 1; store.set("enishi_pet", n);
  if (Math.random() < 1 / 25 || n === 7) {                                   // まれに金の狐
    const keep = []; fox.traverse((m) => { if (m.isMesh && m.material.color && m.material.color.getHex() === 0xf4f1ea) { keep.push([m, m.material]); m.material = goldM; } });
    sfx.suzu(); releaseLight(fox.position.x, fox.position.z + 0.5, true);
    toast("✨ 金の狐が微笑みました。今日はいいことがありそうです", 4500); net?.act("goldfox");
    setTimeout(() => keep.forEach(([m, mm]) => (m.material = mm)), 8000);
  }
}

// ------------------------------------------------------------------ お参り（賽銭 → 鈴 → 二礼二拍手一礼）
const bowTo = (ang, ms) => new Promise((r) => { const b = me.userData.body, s = b.rotation.x, t0 = performance.now();
  (function f() { const k = Math.min(1, (performance.now() - t0) / ms); b.rotation.x = s + (ang - s) * (0.5 - Math.cos(k * Math.PI) / 2); k < 1 ? requestAnimationFrame(f) : r(); })(); });
async function omairi() {
  if (busy) return; busy = true; setActions(false);
  stepText("");
  await new Promise((r) => walkTo(0, SZ + 1.15, r));
  me.rotation.y = Math.PI;
  const u = me.userData; u.pose = true;
  // 賽銭
  toast("お賽銭を入れて…", 1500);
  const coin = add(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), M.gold, me.position.x, 1.0, me.position.z - 0.3, scene, false);
  await new Promise((r) => { const t0 = performance.now(); (function f() { const k = Math.min(1, (performance.now() - t0) / 700);
    coin.position.z = me.position.z - 0.3 - k * 0.85; coin.position.y = 0.95 + Math.sin(k * Math.PI) * 0.8; coin.rotation.x += 0.4;
    k < 1 ? requestAnimationFrame(f) : r(); })(); });
  scene.remove(coin); sfx.coin(); await wait(400); net?.act("suzu");
  // 鈴
  u.arms.forEach((a) => (a.rotation.x = -2.4)); sfx.suzu();
  for (let i = 0; i < 18; i++) { suzuo.rotation.x = Math.sin(i / 2) * 0.25 * (1 - i / 18); suzu.position.x = Math.sin(i / 1.5) * 0.05; await wait(45); }
  u.arms.forEach((a) => (a.rotation.x = 0)); await wait(400);
  // 二礼
  for (let i = 0; i < 2; i++) { stepText(i ? "二 礼" : "一 礼"); net?.act("bow"); await bowTo(1.25, 650); await wait(350); await bowTo(0, 500); await wait(250); }
  // 二拍手
  stepText("二 拍 手"); net?.act("clap");
  for (let i = 0; i < 2; i++) { u.arms.forEach((a, j) => { a.rotation.x = -1.3; a.rotation.z = (j ? -1 : 1) * 0.05; }); sfx.clap(); await wait(260);
    u.arms.forEach((a, j) => (a.rotation.z = (j ? -1 : 1) * 0.6)); await wait(260); }
  u.arms.forEach((a, j) => { a.rotation.x = -1.3; a.rotation.z = (j ? -1 : 1) * 0.05; });
  stepText("祈 る"); releaseLight(me.position.x, me.position.z, true); board.light(hall.id).then((r) => r && r.lights && setLights(r.lights)).catch(() => {}); await wait(2200);
  // 一礼
  stepText("一 礼"); net?.act("bow"); u.arms.forEach((a, j) => { a.rotation.x = 0; a.rotation.z = (j ? -1 : 1) * 0.25; });
  await bowTo(1.25, 650); await wait(500); await bowTo(0, 600);
  stepText(""); u.pose = false; busy = false; setActions(true);
  const n = store.get("enishi_visits", 0) + 1; store.set("enishi_visits", n);
  toast(purified ? `手水で清めてからの丁寧なお参りでした。${n}回目のご参拝です 🙏` : `お参りしました。${n}回目のご参拝です 🙏`); purified = false;
}
function setActions(on) { document.querySelectorAll("#actions button").forEach((b) => (b.disabled = !on)); }

// ------------------------------------------------------------------ おみくじ（一日一回・日替わり）
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function drawKuji() {
  const seed = hash(myName + today() + hall.id);
  const rk = RANKS[seed % 1000 < 170 ? 0 : seed % 1000 < 450 ? 1 : seed % 1000 < 700 ? 2 : seed % 1000 < 860 ? 3 : seed % 1000 < 960 ? 4 : 5];
  const list = OMIKUJI[hall.id].filter((o) => o.rank === rk.key);
  const o = list[(seed >>> 8) % list.length];
  return { rk, o };
}
function openKuji() {
  open("#m-omikuji");
  const done = store.get("enishi_kuji", {})[hall.id] === today();
  $("#kuji-stage").hidden = done; $("#kuji-result").hidden = !done;
  if (done) showKuji(); else { $("#kuji-box").classList.remove("shake", "out"); $("#kuji-help").textContent = "箱をタップして、振ってください"; }
}
$("#kuji-box").onclick = async () => {
  const b = $("#kuji-box"); if (b.classList.contains("shake")) return;
  b.classList.add("shake"); $("#kuji-help").textContent = "心の中で、願いをひとつ…";
  for (let i = 0; i < 6; i++) setTimeout(() => tone([[400 + rand(0, 200), 0.3]], 0.15, 0.08), i * 230);
  await wait(1600); b.classList.add("out"); sfx.suzu(); await wait(900);
  const k = store.get("enishi_kuji", {}); k[hall.id] = today(); store.set("enishi_kuji", k);
  $("#kuji-stage").hidden = true; $("#kuji-result").hidden = false; showKuji(); net?.act("kuji", drawKuji().rk.key);
};
function showKuji() {
  const { rk, o } = drawKuji();
  $("#r-hall").textContent = hall.name; $("#r-rank").textContent = rk.key; $("#r-luck").textContent = `${hall.luck}：${rk.stars}`;
  $("#r-msg").textContent = o.msg;
  $("#r-items").innerHTML = o.items.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}
$("#btn-again").onclick = () => { $("#m-omikuji").hidden = true; SP.addKuji(1); net?.act("musubi"); toast("おみくじを結び所に結びました。良い縁がありますように 🎋"); };
$("#btn-share").onclick = async () => {
  const { rk, o } = drawKuji();
  const text = `えにし神社の${hall.name}でおみくじを引いたら【${rk.key}】でした。\n「${o.short}」\n#えにし神社 #当選祈願 #推し活`;
  const url = location.origin + location.pathname;
  try {
    const blob = await kujiImage(rk, o);
    const file = new File([blob], "enishi-omikuji.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ text, url, files: [file] }); return; }
  } catch {}
  open_(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
};
const open_ = (u) => window.open(u, "_blank", "noopener");
async function kujiImage(rk, o) {                         // シェア用の画像（1080x1350）
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "#1c2340"); g.addColorStop(0.55, "#d9825b"); g.addColorStop(1, "#3a2a33");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = "#fbf6ea"; x.fillRect(180, 140, 720, 1060);
  x.fillStyle = "#d9412b"; x.fillRect(180, 140, 720, 18);
  x.fillStyle = "#8a7f70"; x.textAlign = "center"; x.font = "34px serif"; x.fillText(`えにし神社 · ${hall.name}`, 540, 230);
  x.fillStyle = "#b8321e"; x.font = "bold 190px serif"; x.fillText(rk.key, 540, 470);
  x.fillStyle = "#2b2620"; x.font = "40px serif"; x.fillText(`${hall.luck}：${rk.stars}`, 540, 560);
  x.font = "42px serif"; wrap(x, o.short, 540, 680, 600, 64);
  x.fillStyle = "#8a7f70"; x.font = "30px serif"; x.fillText("みんなで祈るネット神社", 540, 1120);
  x.fillStyle = "#fbf6ea"; x.font = "34px serif"; x.fillText("#えにし神社", 540, 1290);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
function wrap(x, t, cx, y, w, lh) { let line = ""; for (const ch of t) { if (x.measureText(line + ch).width > w) { x.fillText(line, cx, y); y += lh; line = ch; } else line += ch; } x.fillText(line, cx, y); }

// ------------------------------------------------------------------ 絵馬（みんなで共有）
let emaCat = EMA_CATS[0], emaList = [], reportCount = 0;
$("#ema-cats").innerHTML = EMA_CATS.map((c, i) => `<button class="${i ? "" : "on"}" data-c="${c}">${c}</button>`).join("");
$("#ema-cats").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; emaCat = b.dataset.c; $("#ema-cats").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); };
$("#ema-text").oninput = (e) => ($("#ema-count").textContent = `${e.target.value.length}/60`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function loadEma() {
  try { const r = await board.list(hall.id); emaList = r.ema || []; reportCount = r.report || 0; } catch { emaList = []; }
  renderEma();
}
function renderEma() {
  const prayed = store.get("enishi_prayed", {});
  $("#ema-wall").innerHTML = emaList.length ? emaList.map((m) => `<div class="ema"><div class="cat">${esc(m.cat)}</div>${esc(m.text)}
    <div class="pray"><span>🙏 ${m.n || 0}</span><button data-id="${esc(m.id)}" class="${prayed[m.id] ? "on" : ""}">一緒に祈る</button></div></div>`).join("")
    : `<p class="sub">まだ絵馬がありません。最初の一枚を、どうぞ。</p>`;
}
$("#ema-wall").onclick = (e) => {
  const b = e.target.closest("button[data-id]"); if (!b) return;
  const id = b.dataset.id, p = store.get("enishi_prayed", {}), on = !p[id];
  p[id] = on; store.set("enishi_prayed", p);
  const m = emaList.find((x) => x.id === id); if (m) m.n = Math.max(0, (m.n || 0) + (on ? 1 : -1));
  renderEma(); board.pray(hall.id, id, on).catch(() => {});
  if (on) { net?.act("pray"); toast("一緒に祈りました 🙏"); }
};
$("#btn-ema").onclick = async () => {
  const t = $("#ema-text").value.trim(); if (t.length < 2) return toast("願いを書いてください");
  $("#btn-ema").disabled = true;
  try {
    const r = await board.post(hall.id, emaCat, t);
    if (!r.ok) { toast(r.error || "奉納できませんでした"); return; }
    $("#ema-text").value = ""; $("#ema-count").textContent = "0/60"; sfx.gong(); toast("絵馬を奉納しました 🪵"); net?.act("ema"); await loadEma();
  } catch { toast("通信できませんでした。少し後でもう一度。"); }
  finally { $("#btn-ema").disabled = false; }
};

// ------------------------------------------------------------------ 由来
function openStory() {
  const s = hall.story;
  $("#story-body").innerHTML = `<h2>${hall.name}の由来</h2><p class="lead">${s.lead}</p>${s.body.map((p) => `<p>${p}</p>`).join("")}<p class="moral">${s.moral}</p>`;
  open("#m-story");
}
$("#btn-story").onclick = openStory;

// ------------------------------------------------------------------ 当選報告（お礼参り）
async function report() {
  if (!confirm("当選しましたか？おめでとうございます！お礼参りとして記録します。")) return;
  sfx.suzu(); net?.act("report");
  try { const r = await board.report(hall.id); reportCount = r.report || reportCount; } catch {}
  toast(`🎉 おめでとうございます！今日は${Math.max(1, reportCount)}人がお礼参りに来ました。`, 4200);
}

// ------------------------------------------------------------------ actions
$("#actions").onclick = (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  ac();  // iOS: 最初のタップで音を有効化
  ({ omairi, omikuji: openKuji, ema: () => { renderEma(); loadEma(); open("#m-ema"); }, report })[b.dataset.act]();
};

// ------------------------------------------------------------------ オープニング（千本鳥居をくぐる）
let intro = store.get("enishi_intro", "") !== today() ? { t: 0 } : null;
if (intro) { store.set("enishi_intro", today()); $("#title-card").hidden = false; controls.enabled = false; }
const introPath = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 14, 48), new THREE.Vector3(0, 2.2, 30), new THREE.Vector3(0, 1.9, 14),
  new THREE.Vector3(0, 2.0, 4), new THREE.Vector3(0, 5, 37)]);
function runIntro(dt) {
  intro.t += dt / 7;
  if (intro.t >= 1) { endIntro(); return; }
  const k = intro.t < 0.8 ? intro.t / 0.8 * 0.8 : 0.8 + (intro.t - 0.8) * 1;
  camera.position.copy(introPath.getPointAt(Math.min(0.999, k)));
  const look = intro.t < 0.8 ? new THREE.Vector3(0, 1.8, camera.position.z - 12) : controls.target;
  camera.lookAt(look);
}
function endIntro() { intro = null; $("#title-card").classList.add("out"); setTimeout(() => ($("#title-card").hidden = true), 1200);
  camera.position.set(0, 5, 37); controls.target.set(me.position.x, 1.2, me.position.z); controls.enabled = true; controls.update(); }
$("#title-card").onclick = () => intro && endIntro();

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const tagEl = $("#me-tag"), v3 = new THREE.Vector3();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepMove(dt);
  // カメラは自分を追う
  const want = me.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  if (intro) { /* オープニング中はカメラを自由に動かす */ } else {
  const delta = want.clone().sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
  controls.target.add(delta); camera.position.add(delta);
  controls.update(); }
  // 千本鳥居の中ではカメラを笠木より下に（画面が朱一色にならないように）
  const cp = camera.position;
  if (cp.z > 2.2 && cp.z < 27.5 && Math.abs(cp.x) < 3.4 && cp.y > 2.45) cp.y += (2.45 - cp.y) * Math.min(1, dt * 12);
  for (let i = 0; i < fallData.length; i++) {
    const p = fallData[i]; p.y -= dt * 0.5 * p.s; p.x += Math.sin(t * 0.7 + i) * dt * 0.3; p.r += dt * 2;
    if (p.y < 0) { p.y = rand(6, 10); p.x = rand(-14, 14); p.z = rand(-24, 26); }
    dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.r, p.r * 0.7, 0); dummy.updateMatrix(); fall.setMatrixAt(i, dummy.matrix);
  }
  fall.instanceMatrix.needsUpdate = true;
  for (const o of others.values()) {
    const d = o.to.clone().sub(o.av.position); d.y = 0; const dist = d.length(), u = o.av.userData;
    if (dist > 0.05) {
      o.av.position.add(d.multiplyScalar(Math.min(1, dt * 5))); u.walk += dt * 11; u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.08;
      u.arms.forEach((a, i) => (a.rotation.x = Math.sin(u.walk + i * Math.PI) * 0.5));
    } else { u.body.position.y = 0; u.arms.forEach((a) => (a.rotation.x = 0)); }
    o.av.rotation.y += ((((o.ry - o.av.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 8);
    v3.copy(o.av.position); v3.y += 2.05; v3.project(camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
    const X = (v3.x * 0.5 + 0.5) * innerWidth + "px", Y = (-v3.y * 0.5 + 0.5) * innerHeight + "px";
    o.tag.style.display = vis ? "" : "none"; o.tag.style.left = X; o.tag.style.top = Y;
    if (o.bubble) { o.bubble.style.display = vis ? "" : "none"; o.bubble.style.left = X; o.bubble.style.top = `calc(${Y} - 22px)`; }
  }
  net?.pos(me.position.x, me.position.z, me.rotation.y);
  lanterns.update(dt, t); ffUpdate(t);
  if (intro) runIntro(dt);
  composer.render();
  v3.copy(me.position); v3.y += 2.15; v3.project(camera);
  tagEl.style.left = (v3.x * 0.5 + 0.5) * innerWidth + "px"; tagEl.style.top = (-v3.y * 0.5 + 0.5) * innerHeight + "px";
  requestAnimationFrame(loop);
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
loop();
setTimeout(() => $("#loading").classList.add("done"), 400);
setTimeout(() => ($("#hint").style.opacity = 0), 9000);
if (!store.get("enishi_seen_story", false)) { store.set("enishi_seen_story", true); setTimeout(openStory, intro ? 7600 : 1200); }
net = connect({ hall: hall.id, name: myName, look: myLook,
  onWelcome: (m) => m.others.forEach(addOther),
  onJoin: addOther, onLeave: (m) => removeOther(m.id), onCount: setCount,
  onPos: (m) => { const o = others.get(m.id); if (o) { o.to.set(m.x, 0, m.z); o.ry = m.ry; } },
  onAct: (m) => { const o = others.get(m.id); if (o) otherAct(o, m.a, m.r); } });
loadEma();
board.list(hall.id).then((r) => { SP.setEma(r.total || 0); SP.addKuji(Math.min(40, Math.floor((r.lights || 0) / 2))); const n = r.lights || 0; setLights(n); for (let i = 0; i < Math.min(n, MOBILE ? 80 : 160); i++) lanterns.spawn(0, 0, 0, { instant: true }); }).catch(() => {});
window.__enishi = { scene, me, walkTo, others };
