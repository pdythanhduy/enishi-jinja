// 門前町：大鳥居の南にのびる参道の町。茶屋・土鈴の店・境内案内所・酒蔵のほか、和菓子・旅籠・染物・蕎麦の町家。
// 南の端に一の鳥居と社号標、その先が谷の町と縁の浦を見下ろす見晴らし台。奥の院には縁の峰の遥拝所。
import * as THREE from "three";
import { MAT, box, cyl, roof, torii, toro, chochin } from "./arch.js?v=11041008";
import { MONZEN, PLACES, OKU_Y, height } from "./map.js?v=11041008";

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const TILE = std(0x41444a, { roughness: 0.7 }), WOOD = std(0x3a281c), PLASTER = std(0xece4d2, { roughness: 0.95 }), EARTH = std(0x8b806d, { roughness: 1 });
const FONT = (px, w = "bold") => `${w} ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const plane = (p, w, h, map, x, y, z, ry = 0, opts = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.9, ...opts })); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m; };
// 縦書き・横書きの文字
function vText(q, text, x, y, px, gap = 1.08) { [...text].forEach((ch, i) => q.fillText(ch, x, y + i * px * gap)); }

// 格子（町家の表）と虫籠窓（二階）
const LATTICE = canvasTex(256, 128, (q, w, h) => { q.fillStyle = "#1d140e"; q.fillRect(0, 0, w, h); q.fillStyle = "#6b4a30"; for (let x = 2; x < w; x += 9) q.fillRect(x, 0, 5, h); q.fillRect(0, 0, w, 6); q.fillRect(0, h - 8, w, 8); q.fillRect(0, h * 0.45, w, 4); });
const MUSHIKO = canvasTex(256, 64, (q, w, h) => { q.fillStyle = "#ece4d2"; q.fillRect(0, 0, w, h); for (const x0 of [40, 150]) { q.fillStyle = "#3a2a1e"; q.fillRect(x0, 18, 66, 30); q.fillStyle = "#ece4d2"; for (let x = x0 + 6; x < x0 + 62; x += 10) q.fillRect(x, 18, 4, 30); } });
// 店先の中（夜は灯りがともる）
function shopInside(kind) {
  return canvasTex(256, 160, (q, w, h) => {
    const g = q.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#2a1a10"); g.addColorStop(1, "#5a3a22"); q.fillStyle = g; q.fillRect(0, 0, w, h);
    q.fillStyle = "#7a5634"; q.fillRect(0, h - 34, w, 34);                                       // 上がり框・台
    if (kind === "chaya") { q.fillStyle = "#c8432f"; q.fillRect(20, h - 52, 216, 18); for (const x of [60, 128, 196]) { q.fillStyle = "#222"; q.beginPath(); q.arc(x, 60, 16, 0, 7); q.fill(); q.fillRect(x - 3, 40, 6, 8); } q.fillStyle = "#e9dcc0"; q.font = FONT(18); q.fillText("抹茶　団子　甘酒", 44, 110); }
    if (kind === "dorei") { const cols = ["#c8432f", "#e8c67a", "#f3efe6", "#5c8a5a", "#2c3e73"]; for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { q.fillStyle = cols[(i + r) % 5]; q.beginPath(); q.arc(24 + i * 26, 40 + r * 34, 10, 0, 7); q.fill(); q.fillStyle = "#1a1a1a"; q.fillRect(19 + i * 26, 42 + r * 34, 10, 2); } }
    if (kind === "annai") { q.fillStyle = "#efe6d0"; q.fillRect(36, 24, 184, 96); q.strokeStyle = "#8a3a2a"; q.lineWidth = 3; q.beginPath(); q.moveTo(128, 112); q.lineTo(128, 40); q.stroke(); q.fillStyle = "#8a3a2a"; q.font = FONT(16); q.fillText("境内案内", 96, 132); }
    if (kind === "saka") { for (let i = 0; i < 5; i++) { q.fillStyle = "#efe9dc"; q.fillRect(14 + i * 48, 52, 40, 54); q.fillStyle = "#b8281c"; q.font = FONT(14); q.fillText("奉納", 20 + i * 48, 84); } }
    if (kind === "wagashi") { for (let i = 0; i < 6; i++) { q.fillStyle = ["#f3c2c8", "#e8f0d0", "#e9dcc0"][i % 3]; q.beginPath(); q.arc(30 + i * 38, 90, 13, 0, 7); q.fill(); } }
    if (kind === "soba") { q.fillStyle = "#1d140e"; for (let i = 0; i < 4; i++) q.fillRect(26 + i * 56, 54, 40, 40); }
  });
}
function noren(color, text, fg = "#fff") {
  return canvasTex(256, 112, (q, w, h) => { q.fillStyle = color; q.fillRect(0, 0, w, h); q.fillStyle = "rgba(0,0,0,.25)"; for (const x of [85, 170]) q.fillRect(x, 10, 2, h);
    q.fillStyle = fg; q.textAlign = "center"; q.textBaseline = "middle"; q.font = FONT(text.length > 3 ? 40 : 52); q.fillText(text, w / 2, h / 2 + 8); });
}
function kanban(text) {   // 二階の看板（横書き・右から読む昔の書き方は避け、今の左から）
  return canvasTex(512, 128, (q, w, h) => { q.fillStyle = "#2a1d14"; q.fillRect(0, 0, w, h); q.strokeStyle = "#c9a560"; q.lineWidth = 6; q.strokeRect(6, 6, w - 12, h - 12);
    q.fillStyle = "#f1e3bd"; q.textAlign = "center"; q.textBaseline = "middle"; q.font = FONT(text.length > 5 ? 54 : 66); q.fillText(text, w / 2, h / 2 + 4); });
}
// 町家（平入り）：表を +z に向けて作り、通りに向けて回す
function machiya(scene, env, { side, z, kind, sign, nore, noreCol, nfg }) {
  const W = 7.0, D = MONZEN.depth, g = new THREE.Group(); g.userData.static = true;
  g.position.set(side * (MONZEN.front + D / 2), 0, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(g);
  const fz = D / 2;
  box(g, W + 0.2, 0.3, D + 0.2, MAT.stoneD, 0, 0.15, 0);                                  // 基礎の石
  box(g, W, 3.0, D - 0.7, WOOD, 0, 1.8, -0.35);                                          // 一階
  const open = ["chaya", "dorei", "annai", "saka", "wagashi", "soba"].includes(kind);
  plane(g, W - 0.4, 2.4, open ? shopInside(kind) : LATTICE, 0, 1.6, fz - 0.69, 0, open ? { emissive: 0xffb060, emissiveIntensity: 0.0 } : {});
  for (const x of [-W / 2 + 0.1, -W / 6, W / 6, W / 2 - 0.1]) box(g, 0.2, 3.0, 0.2, WOOD, x, 1.8, fz - 0.55);   // 表の柱
  box(g, W + 0.1, 0.24, 0.3, WOOD, 0, 3.2, fz - 0.55);                                   // 桁
  roof(g, { w: W + 0.5, d: 2.0, h: 0.42, lift: 0.04, thick: 0.12, mat: TILE, under: WOOD, y: 3.0, z: fz - 0.35, gable: false, ridgeGold: false });   // 一階の庇
  box(g, W, 2.0, D - 1.6, PLASTER, 0, 4.25, -0.8);                                       // 二階（低い厨子二階）
  plane(g, W - 0.6, 1.2, MUSHIKO, 0, 4.25, (D - 1.6) / 2 - 0.8 + 0.01);
  roof(g, { w: W + 0.6, d: D + 0.6, h: 1.5, lift: 0.1, thick: 0.2, mat: TILE, under: WOOD, y: 5.15, gable: false, ridgeGold: false });
  for (const s of [-1, 1]) {                                                             // 妻壁
    const tri = new THREE.Shape(); tri.moveTo(-(D - 1.6) / 2 - 0.1, 0); tri.lineTo(0, 1.35); tri.lineTo((D - 1.6) / 2 + 0.1, 0); tri.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), PLASTER); m.rotation.y = s * Math.PI / 2; m.position.set(s * (W / 2 - 0.02), 5.25, -0.8); g.add(m);
  }
  if (nore) { const nm = plane(g, 2.2, 0.95, noren(noreCol, nore, nfg), 0, 2.45, fz - 0.4); nm.material.side = THREE.DoubleSide; }
  if (sign) plane(g, 3.2, 0.8, kanban(sign), 0, 3.9, fz - 0.66);
  chochin(g, W / 2 - 0.7, 2.35, fz - 0.3, env, 0.62);
  return g;
}

export function buildMonzen(scene, env, W) {
  const L = MONZEN.lots, root = new THREE.Group(); root.userData.static = true; scene.add(root);   // 全部動かない：まとめて描く（freeze）
  // 通りの土と石畳（参道の続き）
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, MONZEN.edge - MONZEN.z0 + 0.6), EARTH); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.012, (MONZEN.z0 + MONZEN.edge) / 2); ground.receiveShadow = true; root.add(ground);
  const stones = []; for (let z = 85.6; z < 119; z += 1.05) for (const x of [-1.02, 0, 1.02]) stones.push([x, z, 0.98]);
  for (let z = 119.6; z < 133; z += 1.62) for (let x = -8.1; x <= 8.2; x += 1.62) stones.push([x, z, 1.58]);
  const sI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 1), MAT.stone, stones.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  stones.forEach(([x, z, s], i) => { q.setFromAxisAngle(v.set(0, 1, 0), (Math.random() - 0.5) * 0.06); m4.compose(v.set(x, 0.06, z), q, sc.set(s, 1, s)); sI.setMatrixAt(i, m4); }); sI.receiveShadow = true; root.add(sI);

  // 町家：東（右）に茶屋・土鈴・酒蔵・和菓子、西（左）に案内所・旅籠・染物・蕎麦
  const shops = [
    { side: 1, z: L[0], kind: "chaya", sign: "縁茶屋", nore: "茶", noreCol: "#2c4a3a" },
    { side: 1, z: L[1], kind: "dorei", sign: "土鈴 鈴音堂", nore: "鈴", noreCol: "#8a2a1e" },
    { side: 1, z: L[2], kind: "saka", sign: "縁の酒蔵", nore: "酒", noreCol: "#24324e" },
    { side: 1, z: L[3], kind: "wagashi", sign: "御菓子司 縁堂", nore: "菓子", noreCol: "#e9dcc0", nfg: "#5a2a1e" },
    { side: -1, z: L[0], kind: "annai", sign: "境内案内所", nore: "案内", noreCol: "#5a2a1e" },
    { side: -1, z: L[1], kind: "house", sign: "旅籠 縁宿", nore: "宿", noreCol: "#3a3a3a" },
    { side: -1, z: L[2], kind: "house", sign: "染物 藍屋", nore: "藍", noreCol: "#1f3a6a" },
    { side: -1, z: L[3], kind: "soba", sign: "手打ち蕎麦", nore: "そば", noreCol: "#f3efe6", nfg: "#1d140e" },
  ];
  W.monzen = {};
  for (const s of shops) W.monzen[s.kind === "house" ? s.sign : s.kind] = machiya(root, env, s);

  // 茶屋の縁台（緋毛氈）と野点傘：縁台に上がって一服する
  { const g = new THREE.Group(); g.position.set(6.0, 0, L[0]); g.userData.static = true; root.add(g);
    const red = std(0xb8281c, { roughness: 1 });
    box(g, 0.95, 0.08, 4.0, WOOD, 0, 0.4, 0); box(g, 0.97, 0.03, 3.6, red, 0, 0.455, 0);
    for (const zz of [-1.8, 1.8]) for (const xx of [-0.38, 0.38]) box(g, 0.08, 0.4, 0.08, WOOD, xx, 0.2, zz);
    cyl(g, 0.035, 0.035, 2.7, WOOD, -0.2, 1.35, 2.6, 6);
    const kasa = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.55, 20, 1, true), std(0xc8321e, { side: THREE.DoubleSide, roughness: 0.9 })); kasa.position.set(-0.2, 2.7, 2.6); kasa.castShadow = true; g.add(kasa);
    W.chayaSeat = [6.0, L[0]];
  }
  // 土鈴の店先：ひな壇にならぶ土鈴（干支・狐・鳩・鶴・招き猫）
  { const g = new THREE.Group(); g.position.set(6.1, 0, L[1]); g.userData.static = true; root.add(g);
    for (let r = 0; r < 3; r++) box(g, 0.5, 0.05, 3.2, WOOD, -r * 0.32 + 0.2, 0.45 + r * 0.32, 0);
    box(g, 1.2, 0.45, 3.2, WOOD, -0.15, 0.22, 0);
    const cols = [0xc8432f, 0xe8c67a, 0xf3efe6, 0x5c8a5a, 0x2c3e73];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), std(cols[(i + r) % 5], { roughness: 0.6 })); s.position.set(-r * 0.32 + 0.2, 0.58 + r * 0.32, -1.4 + i * 0.35); g.add(s); }
  }
  // 酒蔵：軒先の杉玉と、奉納の菰樽
  { const g = new THREE.Group(); g.position.set(MONZEN.front + 0.35, 0, L[2]); g.userData.static = true; root.add(g);
    const sg = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), std(0x7a5a2e, { roughness: 1, flatShading: true })); sg.position.set(0, 2.55, 2.2); g.add(sg);
    cyl(g, 0.015, 0.015, 0.5, MAT.rope, 0, 3.0, 2.2, 4);
    for (const [zz, yy] of [[-2.6, 0.35], [-1.9, 0.35], [-2.25, 0.95]]) { const t = cyl(g, 0.34, 0.34, 0.6, MAT.paperW, 0, yy, zz, 14); t.rotation.z = Math.PI / 2; }
    W.sugidama = sg;
  }
  // 境内案内所の前：本当の配置をそのまま描いた案内図
  { const g = new THREE.Group(); g.position.set(-5.7, 0, L[0] + 2.3); g.rotation.y = Math.PI / 2; g.userData.static = true; root.add(g);
    const tex = canvasTex(512, 384, (q, w, h) => {
      q.fillStyle = "#efe6d0"; q.fillRect(0, 0, w, h); q.strokeStyle = "#5a3a22"; q.lineWidth = 10; q.strokeRect(5, 5, w - 10, h - 10);
      q.fillStyle = "#2a1d14"; q.font = FONT(30); q.textAlign = "center"; q.fillText("えにし神社 境内案内図", w / 2, 44);
      const X0 = -48, X1 = 48, Z0 = -90, Z1 = 134, px = (x) => 40 + ((x - X0) / (X1 - X0)) * (w - 80), py = (z) => 64 + ((z - Z0) / (Z1 - Z0)) * (h - 90);
      q.strokeStyle = "#b9a684"; q.lineWidth = 8; q.beginPath(); q.moveTo(px(0), py(134)); q.lineTo(px(0), py(12)); q.stroke();
      q.font = FONT(15, "normal"); q.textAlign = "left";
      for (const [id, p] of Object.entries(PLACES)) { const [x, z] = p.pos; q.fillStyle = id === "monzen" ? "#b8281c" : "#2a1d14"; q.beginPath(); q.arc(px(x), py(z), 5, 0, 7); q.fill(); q.fillText(p.name.replace(/・.*$/, ""), px(x) + 8, py(z) + 5); }
      q.fillStyle = "#b8281c"; q.font = FONT(16); q.fillText("現在地 ▶", px(-40), py(104) + 5);
    });
    plane(g, 1.9, 1.42, tex, 0, 1.6, 0.06); box(g, 2.05, 1.58, 0.1, WOOD, 0, 1.6, 0); for (const s of [-1, 1]) box(g, 0.1, 2.4, 0.1, WOOD, s * 0.95, 1.2, -0.06);
    roof(g, { w: 2.4, d: 0.7, h: 0.22, lift: 0.03, thick: 0.08, mat: TILE, under: WOOD, y: 2.45, gable: false, ridgeGold: false });
  }

  // 一の鳥居（石）と社号標・常夜灯
  torii(root, { z: 124, s: 1.9, gaku: "えにし神社", mat: MAT.stoneD, top: MAT.stoneD });
  { const g = new THREE.Group(); g.position.set(-6.2, 0, 121.6); g.userData.static = true; root.add(g);
    box(g, 1.2, 0.3, 1.2, MAT.stoneD, 0, 0.15, 0); box(g, 0.72, 3.4, 0.72, MAT.stone, 0, 2.0, 0);
    const t = canvasTex(64, 320, (q, w, h) => { q.fillStyle = "#cfc9bf"; q.fillRect(0, 0, w, h); q.fillStyle = "#2b2824"; q.font = FONT(46); q.textAlign = "center"; q.textBaseline = "top"; vText(q, "えにし神社", w / 2, 12, 46, 1.25); });
    plane(g, 0.62, 3.1, t, 0, 2.0, 0.365);
  }
  for (const s of [-1, 1]) W.lamps.push(toro(root, s * 7.6, 126.8, 0, env, 1.55));

  // 見晴らし台：石の玉垣、方位盤、腰掛け、立て札
  { const g = new THREE.Group(); g.userData.static = true; root.add(g); const ez = MONZEN.edge - 0.2;
    for (let x = -14; x <= 14.01; x += 1.4) { box(g, 0.24, 1.0, 0.24, MAT.stone, x, 0.5, ez); }
    box(g, 28.4, 0.14, 0.3, MAT.stone, 0, 1.02, ez); box(g, 28.4, 0.12, 0.22, MAT.stone, 0, 0.45, ez);
    for (const s of [-1, 1]) { box(g, 0.24, 1.0, 0.24, MAT.stone, s * 14, 0.5, ez - 1.4); box(g, 0.3, 0.14, 12, MAT.stone, s * 14, 1.02, ez - 6); }
    // 方位盤：縁の浦・門前の町・縁の峰の方角
    cyl(g, 0.5, 0.6, 0.9, MAT.stoneD, 0, 0.45, 131.7, 20);
    const dial = canvasTex(256, 256, (q, w, h) => { q.fillStyle = "#3d3a35"; q.beginPath(); q.arc(128, 128, 126, 0, 7); q.fill(); q.strokeStyle = "#c9a560"; q.lineWidth = 3; q.beginPath(); q.arc(128, 128, 110, 0, 7); q.stroke();
      q.fillStyle = "#efe6d0"; q.textAlign = "center"; q.textBaseline = "middle"; q.font = FONT(26);
      // 上が南（見る人の前）。北は後ろの山
      q.fillText("南", 128, 34); q.fillText("北", 128, 222); q.fillText("東", 30, 128); q.fillText("西", 226, 128);
      q.font = FONT(15, "normal"); q.fillText("縁の浦（海）", 128, 64); q.fillText("縁の峰・奥の院", 128, 192); q.fillText("門前の町", 128, 88); });
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.7 })); top.rotation.x = -Math.PI / 2; top.rotation.z = Math.PI; top.position.set(0, 0.905, 131.7); g.add(top);
    for (const s of [-1, 1]) { box(g, 3.6, 0.12, 0.9, MAT.stone, s * 7.5, 0.48, 130.9); for (const d of [-1.4, 1.4]) box(g, 0.3, 0.42, 0.7, MAT.stoneD, s * 7.5 + d, 0.21, 130.9); }
    const t = canvasTex(256, 300, (q, w, h) => { q.fillStyle = "#efe6d0"; q.fillRect(0, 0, w, h); q.strokeStyle = "#5a3a22"; q.lineWidth = 8; q.strokeRect(4, 4, w - 8, h - 8);
      q.fillStyle = "#2a1d14"; q.textAlign = "center"; q.font = FONT(30); q.fillText("見晴らし台", 128, 48); q.font = FONT(17, "normal");
      ["ここは参道のはじまり。", "南には谷の町と、縁の浦。", "昔の人は、この石段を上り", "一の鳥居で一礼してから", "門前町を歩いて参拝しました。", "北をふりかえると、", "奥の院のさらに奥に縁の峰。"].forEach((l, i) => q.fillText(l, 128, 90 + i * 28)); });
    const bd = new THREE.Group(); bd.position.set(-10.6, 0, 127.6); bd.rotation.y = 0.35; g.add(bd);
    plane(bd, 1.0, 1.17, t, 0, 1.4, 0.03); box(bd, 1.12, 1.3, 0.05, WOOD, 0, 1.4, 0); for (const s of [-1, 1]) box(bd, 0.08, 2.1, 0.08, WOOD, s * 0.55, 1.05, -0.04);
  }
  // 崖の下へ降りる石段（町へ）：見えるところまで
  { const g = new THREE.Group(); g.userData.static = true; root.add(g);
    for (let i = 0; i < 26; i++) { const z = MONZEN.edge + 0.4 + i * 0.62, y = Math.min(0, height(0, z) + 0.15); box(g, 3.2, 1.4, 0.66, MAT.stoneD, 0, y - 0.7, z); }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = MONZEN.edge + 3 + i * 3.4; toro(g, s * 2.3, z, height(s * 2.3, z), env, 0.55); }
  }

  // 奥の院：縁の峰の遥拝所（磐座の前から、北の霊峰を拝む）
  { const p = PLACES.yohai, g = new THREE.Group(); g.position.set(p.stand[0] + Math.sin(p.face) * 1.6, OKU_Y, p.stand[1] + Math.cos(p.face) * 1.6); g.rotation.y = p.face;   // 拝む人と峰を結ぶ線の上 g.userData.static = true; root.add(g);
    box(g, 0.5, 0.2, 0.5, MAT.stoneD, 0, 0.1, 0); box(g, 0.36, 1.5, 0.36, MAT.stone, 0, 0.95, 0);
    const t = canvasTex(48, 256, (q, w, h) => { q.fillStyle = "#cfc9bf"; q.fillRect(0, 0, w, h); q.fillStyle = "#2b2824"; q.font = FONT(36); q.textAlign = "center"; q.textBaseline = "top"; vText(q, "遥拝所", w / 2, 18, 36, 1.5); });
    plane(g, 0.3, 1.4, t, 0, 0.95, -0.185, Math.PI);
  }
  return root;
}
