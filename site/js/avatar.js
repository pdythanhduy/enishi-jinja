// 参拝者（浴衣のちびキャラ）。和柄・髪型・狐面・提灯。正座とお辞儀のポーズ。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { wagara } from "../fx.js?v=11030914";

const YUKATA = [[0x2c3e73, 0xe8c67a], [0xc8432f, 0x2b2b2b], [0x5c8a5a, 0xf2e2c4], [0xe7a2b4, 0x6b3a5a], [0xe0b23a, 0x3b4f7a], [0x6a4c93, 0xe8c67a], [0xf4f1ea, 0xc8432f], [0x1f5f6a, 0xf0d8a8]];
const PATS = ["asanoha", "ichimatsu", "seigaiha", "yagasuri", "sakura"];
const M = { kuro: new THREE.MeshStandardMaterial({ color: 0x1d1b1a }), white: new THREE.MeshStandardMaterial({ color: 0xf4f1ea }), shu: new THREE.MeshStandardMaterial({ color: 0xd9412b }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.8, roughness: 0.3 }), wood: new THREE.MeshStandardMaterial({ color: 0x6b4428 }), skin: new THREE.MeshStandardMaterial({ color: 0xf6d7bd, roughness: 0.8 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.8 }), eyeHi: new THREE.MeshBasicMaterial({ color: 0xffffff }), mouth: new THREE.MeshBasicMaterial({ color: 0x8a3b3b }),
  cheek: new THREE.MeshStandardMaterial({ color: 0xf3a3a3, transparent: true, opacity: 0.55 }) };
const add = (p, geo, mat, x, y, z, sh = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sh) m.castShadow = true; p.add(m); return m; };

export function makeAvatar(seed = Math.random(), env) {
  const [kimono, obi] = YUKATA[Math.floor(seed * YUKATA.length) % YUKATA.length];
  const pat = PATS[Math.floor(seed * 997) % PATS.length];
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
  const hair = add(body, new THREE.SphereGeometry(0.44, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hair, 0, 1.42, -0.02); hair.rotation.x = -0.25;
  const style = Math.floor(seed * 7919) % 3;
  if (style === 0) { add(body, new THREE.SphereGeometry(0.17, 14, 12), M.hair, 0, 1.86, -0.12); add(body, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), M.gold, 0.08, 1.9, -0.12, false).rotation.z = 1.1; }
  else if (style === 1) add(body, new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.35), M.hair, 0, 1.36, -0.04);
  else { const pt = add(body, new THREE.CylinderGeometry(0.08, 0.04, 0.5, 10), M.hair, 0, 1.3, -0.42); pt.rotation.x = 0.35; }
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
  if (seed > 0.55) {                                                                // 狐面
    const mask = new THREE.Group(); mask.position.set(0.3, 1.62, 0.12); mask.rotation.set(-0.2, 0.7, -0.4); body.add(mask);
    const f = add(mask, new THREE.SphereGeometry(0.17, 14, 12), M.white, 0, 0, 0); f.scale.set(1, 0.9, 0.55);
    for (const s of [-1, 1]) { add(mask, new THREE.ConeGeometry(0.06, 0.14, 6), M.white, s * 0.09, 0.15, -0.02); add(mask, new THREE.BoxGeometry(0.08, 0.015, 0.02), M.shu, s * 0.06, 0.02, 0.09, false); }
  }
  if (seed > 0.3 && seed < 0.55) {                                                  // 小さな提灯
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
