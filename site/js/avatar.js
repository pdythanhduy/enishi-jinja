// 参拝者（浴衣のちびキャラ）。和柄・髪型・狐面・提灯。正座とお辞儀のポーズ。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { wagara } from "../fx.js?v=11031118";

const YUKATA = [[0x2c3e73, 0xe8c67a], [0xc8432f, 0x2b2b2b], [0x5c8a5a, 0xf2e2c4], [0xe7a2b4, 0x6b3a5a], [0xe0b23a, 0x3b4f7a], [0x6a4c93, 0xe8c67a], [0xf4f1ea, 0xc8432f], [0x1f5f6a, 0xf0d8a8]];
const PATS = ["asanoha", "ichimatsu", "seigaiha", "yagasuri", "sakura"];
const M = { kuro: new THREE.MeshStandardMaterial({ color: 0x1d1b1a }), white: new THREE.MeshStandardMaterial({ color: 0xf4f1ea }), shu: new THREE.MeshStandardMaterial({ color: 0xd9412b }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.8, roughness: 0.3 }), wood: new THREE.MeshStandardMaterial({ color: 0x6b4428 }), skin: new THREE.MeshStandardMaterial({ color: 0xf6d7bd, roughness: 0.8 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 }), kanzashi: new THREE.MeshStandardMaterial({ color: 0xf3a6b8, roughness: 0.6 }), eyeHi: new THREE.MeshBasicMaterial({ color: 0xffffff }), mouth: new THREE.MeshBasicMaterial({ color: 0x8a3b3b }),
  cheek: new THREE.MeshStandardMaterial({ color: 0xf3a3a3, transparent: true, opacity: 0.55 }) };
const add = (p, geo, mat, x, y, z, sh = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sh) m.castShadow = true; p.add(m); return m; };

// 身支度：見た目は "v1.色.柄.髪型.髪色.小物" の文字列。昔の数値（乱数の種）もそのまま使える
export const LOOK = {
  yukata: YUKATA, pats: PATS, patNames: ["麻の葉", "市松", "青海波", "矢絣", "桜"], hairNames: ["お団子", "ボブ", "ポニー"],
  hairCols: [0x2a211c, 0x4a2e1c, 0x7a4a2a, 0xb9b3aa], hairColNames: ["黒", "焦茶", "栗色", "銀"],
  acc: [{ id: 0, name: "なし", need: 0 }, { id: 1, name: "狐面", need: 10 }, { id: 2, name: "提灯", need: 30 }, { id: 3, name: "金の簪", need: 70 }],
};
export function parseLook(look) {
  if (typeof look === "string" && look.startsWith("v1.")) {
    const [k, p, h, c, a] = look.slice(3).split(".").map((n) => parseInt(n, 10) || 0);
    return { k: k % YUKATA.length, p: p % PATS.length, h: h % 3, c: c % LOOK.hairCols.length, a: a % LOOK.acc.length };
  }
  const seed = Number(look) || 0;
  return { k: Math.floor(seed * YUKATA.length) % YUKATA.length, p: Math.floor(seed * 997) % PATS.length, h: Math.floor(seed * 7919) % 3, c: 0, a: seed > 0.55 ? 1 : seed > 0.3 ? 2 : 0 };
}
export const lookString = (L) => `v1.${L.k}.${L.p}.${L.h}.${L.c}.${L.a}`;
// 自分の姿を着替える（同じ Group のまま中身を入れ替える）
export function restyle(av, look, env) {
  const fresh = makeAvatar(look, env);
  for (const c of [...av.children]) av.remove(c);
  for (const c of [...fresh.children]) av.add(c);
  const pose = av.userData.pose; av.userData = fresh.userData; if (pose) setPose(av, pose);
}
export const AV_SCALE = 0.8;   // 人の大きさ（建物が大きく感じられるように少し小さめ）
export function makeAvatar(look = Math.random(), env) {
  const L = parseLook(look);
  const [kimono, obi] = YUKATA[L.k];
  const pat = PATS[L.p];
  const accent = new THREE.Color(kimono).offsetHSL(0, -0.1, kimono === 0xf4f1ea ? -0.35 : 0.18).getHex();
  const km = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wagara(pat, kimono, accent), roughness: 0.85 });
  const om = new THREE.MeshStandardMaterial({ color: obi, roughness: 0.7 });
  const g = new THREE.Group();
  const lower = new THREE.Group(); g.add(lower);                                   // 下半身（正座で沈む）
  const body = new THREE.Group(); g.add(body);                                     // 上半身（お辞儀で傾く）
  add(lower, new THREE.CylinderGeometry(0.28, 0.42, 0.62, 16), km, 0, 0.31, 0);
  add(body, new RoundedBoxGeometry(0.62, 0.5, 0.46, 3, 0.16), km, 0, 0.78, 0);
  add(body, new THREE.CylinderGeometry(0.33, 0.33, 0.14, 16), om, 0, 0.66, 0);
  add(body, new THREE.BoxGeometry(0.06, 0.34, 0.02), M.white, -0.06, 0.92, 0.235).rotation.z = 0.5;
  add(body, new THREE.SphereGeometry(0.42, 24, 18), M.skin, 0, 1.38, 0);
  const HM = L.c ? new THREE.MeshStandardMaterial({ color: LOOK.hairCols[L.c], roughness: 0.75 }) : M.hair;
  const hair = add(body, new THREE.SphereGeometry(0.44, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), HM, 0, 1.42, -0.02); hair.rotation.x = -0.25;
  const style = L.h;
  if (style === 0) { add(body, new THREE.SphereGeometry(0.17, 14, 12), HM, 0, 1.86, -0.12); add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), M.gold, 0.08, 1.9, -0.12, false).rotation.z = 1.1; }
  else if (style === 1) add(body, new THREE.SphereGeometry(0.46, 20, 14, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, Math.PI * 0.35, Math.PI * 0.35), HM, 0, 1.36, -0.04);   // 顔の前は空ける
  else { const pt = add(body, new THREE.CylinderGeometry(0.08, 0.04, 0.5, 10), HM, 0, 1.3, -0.42); pt.rotation.x = 0.35; }
  for (const s of [-1, 1]) {
    const e = add(body, new THREE.SphereGeometry(0.075, 12, 10), M.kuro, s * 0.15, 1.36, 0.36, false); e.scale.set(0.8, 1.15, 0.5);
    add(body, new THREE.SphereGeometry(0.022, 8, 6), M.eyeHi, s * 0.15 + 0.02, 1.4, 0.4, false);
    add(body, new THREE.SphereGeometry(0.06, 8, 8), M.cheek, s * 0.24, 1.26, 0.33, false);
  }
  add(body, new THREE.TorusGeometry(0.035, 0.01, 6, 12, Math.PI), M.mouth, 0, 1.24, 0.405, false).rotation.z = Math.PI;
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.33, 0.95, 0); body.add(a);
    add(a, new THREE.CylinderGeometry(0.1, 0.14, 0.42, 10), km, 0, -0.2, 0); add(a, new THREE.SphereGeometry(0.08, 10, 8), M.skin, 0, -0.43, 0);
    a.rotation.z = s * 0.25; arms.push(a);
  }
  if (L.a === 1) {                                                                  // 狐面
    const mask = new THREE.Group(); mask.position.set(0.3, 1.62, 0.12); mask.rotation.set(-0.2, 0.7, -0.4); body.add(mask);
    const f = add(mask, new THREE.SphereGeometry(0.17, 14, 12), M.white, 0, 0, 0); f.scale.set(1, 0.9, 0.55);
    for (const s of [-1, 1]) { add(mask, new THREE.ConeGeometry(0.06, 0.14, 6), M.white, s * 0.09, 0.15, -0.02); add(mask, new THREE.BoxGeometry(0.08, 0.015, 0.02), M.shu, s * 0.06, 0.02, 0.09, false); }
  }
  if (L.a === 3) {                                                                  // 金の簪と桜の飾り
    const pin = add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), M.gold, -0.22, 1.72, -0.1, false); pin.rotation.z = -1.0;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(body, new THREE.SphereGeometry(0.035, 8, 6), M.kanzashi, -0.36 + Math.cos(a) * 0.05, 1.82 + Math.sin(a) * 0.05, -0.08, false); }
    for (let i = 0; i < 3; i++) add(body, new THREE.SphereGeometry(0.022, 6, 6), M.gold, -0.4, 1.7 - i * 0.07, -0.08, false);
  }
  if (L.a === 2) {                                                                  // 小さな提灯
    const lm = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffa94d, emissiveIntensity: 2.4 }); lm.userData.base = 2.4; env?.registerLamp(lm, null);
    const lamp = add(arms[1], new THREE.SphereGeometry(0.11, 12, 10), lm, 0, -0.62, 0.05, false); lamp.scale.y = 1.3;
  }
  for (const s of [-1, 1]) add(lower, new THREE.BoxGeometry(0.16, 0.06, 0.28), M.wood, s * 0.13, 0.03, 0.04);
  g.userData = { body, lower, arms, walk: 0, pose: null };
  return g;
}

// ポーズ：stand / seiza（正座）
export function setPose(av, pose) {
  const u = av.userData; u.pose = pose;
  if (pose === "seiza") { u.lower.scale.y = 0.45; u.lower.position.y = 0; u.body.position.y = -0.32; u.arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? -1 : 1) * 0.15; }); }
  else { u.lower.scale.y = 1; u.body.position.y = 0; u.arms.forEach((a, i) => { a.rotation.x = 0; a.rotation.z = (i ? -1 : 1) * 0.25; }); }
}
// お辞儀（角度へ ms でなめらかに）
export function bowTo(av, ang, ms) {
  const b = av.userData.body, s = b.rotation.x, t0 = performance.now();
  return new Promise((r) => (function f() { const k = Math.min(1, (performance.now() - t0) / ms); b.rotation.x = s + (ang - s) * (0.5 - Math.cos(k * Math.PI) / 2); k < 1 ? requestAnimationFrame(f) : r(); })());
}
