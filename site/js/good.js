// 善行（落ち葉掃き・灯籠に火・迷子の子狐）と夜祭り（花火・祭囃子）
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { height, footY, blocked } from "./map.js?v=11031845";

const rnd = (a, b) => a + Math.random() * (b - a);

// ------------------------------------------------------------------ 落ち葉の山
const LEAF_SPOTS0 = [[-3.2, 66], [3.4, 60], [-3, 52], [3, 47], [-9, 30], [9, 26], [-12, 14], [10, 16.5], [-6, 36], [-8, 12], [-17, 12], [18, 32], [-27.5, 21], [27.5, 18.5], [0, 72], [17, 4], [-17, 4]];
// 山そのものと、掃く人の立つ所（左手前）がどちらも歩ける所だけ
const LEAF_SPOTS = LEAF_SPOTS0.filter(([x, z]) => !blocked(x, z) && !blocked(x - 0.9, z + 0.4));
export class Leaves {
  constructor(scene, season) {
    this.scene = scene; this.piles = []; this.geo = new THREE.IcosahedronGeometry(0.22, 0);
    const cols = season === "spring" ? [0xf6b8cf, 0xf9cfdd] : season === "summer" ? [0x6a9a4a, 0x8ab05a] : season === "winter" ? [0xffffff, 0xe8eef5] : [0xc8471f, 0xd98a2b, 0xb02a24];
    this.mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
    for (let i = 0; i < 5; i++) this.spawn();
  }
  spawn() {
    const free = LEAF_SPOTS.filter(([x, z]) => !this.piles.some((p) => Math.hypot(p.x - x, p.z - z) < 1));
    if (!free.length || this.piles.length >= 8) return;
    const [x, z] = free[Math.floor(Math.random() * free.length)];
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const parts = this.mats.map(() => []), o = new THREE.Object3D();          // 色ごとに一つのメッシュへ
    for (let i = 0; i < 18; i++) { o.position.set(rnd(-0.6, 0.6), rnd(0.02, 0.22), rnd(-0.5, 0.5)); o.scale.set(1, 0.35, 1); o.rotation.set(rnd(0, 3), rnd(0, 3), 0); o.updateMatrix(); parts[i % this.mats.length].push(this.geo.clone().applyMatrix4(o.matrix)); }
    parts.forEach((list, k) => { const m = new THREE.Mesh(mergeGeometries(list), this.mats[k]); list.forEach((q) => q.dispose()); g.add(m); });
    this.scene.add(g); this.piles.push({ g, x, z });
  }
  near(p, r = 1.8) { return this.piles.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < r); }
  // 掃き終えた山を片づける
  remove(pile) { this.scene.remove(pile.g); pile.g.traverse((m) => m.isMesh && m.geometry.dispose()); this.piles = this.piles.filter((q) => q !== pile); }
  // ひと掃きで舞う葉
  burst(x, z, n = 7) {
    for (let i = 0; i < n; i++) {
      const l = new THREE.Mesh(this.geo, this.mats[i % this.mats.length]); l.scale.set(0.6, 0.25, 0.6);
      l.position.set(x + rnd(-0.3, 0.3), 0.15, z + rnd(-0.3, 0.3)); this.scene.add(l);
      const v = new THREE.Vector3(rnd(-1.4, 1.4), rnd(1.6, 3.0), rnd(-1.4, 1.4)), sp = new THREE.Vector3(rnd(-6, 6), rnd(-6, 6), 0), t0 = performance.now();
      (function f() { const t = (performance.now() - t0) / 1000; if (t > 1.3) { l.parent?.remove(l); return; }
        l.position.x += v.x * 0.016; l.position.z += v.z * 0.016; l.position.y = Math.max(0.03, 0.15 + v.y * t - 2.6 * t * t); l.rotation.x += sp.x * 0.016; l.rotation.y += sp.y * 0.016;
        requestAnimationFrame(f); })();
    }
  }
  async sweep(pile) {       // 少しずつ消える
    for (let k = 1; k <= 10; k++) { pile.g.scale.setScalar(1 - k * 0.09); pile.g.position.x += 0.04; await new Promise((r) => setTimeout(r, 120)); }
    this.scene.remove(pile.g); pile.g.traverse((m) => m.isMesh && m.geometry.dispose()); this.piles = this.piles.filter((q) => q !== pile);
  }
}

// ------------------------------------------------------------------ 消えた灯籠
export class DarkLanterns {
  constructor(lamps) { this.lamps = lamps.filter((g) => g.userData.lamp); this.off = new Set(); for (let i = 0; i < 4; i++) this.turnOffRandom(); }
  turnOffRandom() { const cand = this.lamps.filter((g) => !this.off.has(g)); if (!cand.length) return; const g = cand[Math.floor(Math.random() * cand.length)]; g.userData.lamp.userData.off = true; g.userData.lamp.emissiveIntensity = 0.05; this.off.add(g); }
  near(p, r = 2.4) { for (const g of this.off) { const v = new THREE.Vector3(); g.getWorldPosition(v); if (Math.hypot(v.x - p.x, v.z - p.z) < r && Math.abs(v.y - p.y) < 3) return g; } return null; }
  light(g, env) { g.userData.lamp.userData.off = false; g.userData.lamp.emissiveIntensity = (g.userData.lamp.userData.base || 3) * (0.15 + 0.85 * env.lamp); this.off.delete(g); }
}

// ------------------------------------------------------------------ 迷子の子狐
const KIT_SPOTS = [[-5, 62], [5, 50], [-15, 33], [19, 12], [-20, 4], [33, 9], [-33, 23], [4, -24], [-11, -36], [8, -50]];
export class LostFox {
  constructor(scene) {
    this.scene = scene; this.state = "none"; this.g = null; this.timer = rnd(25, 60);
    const w = new THREE.MeshStandardMaterial({ color: 0xf6f0e6, roughness: 0.7 }), o = new THREE.MeshStandardMaterial({ color: 0xe0904a, roughness: 0.7 }), k = new THREE.MeshStandardMaterial({ color: 0x1d1b1a });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), o); body.scale.set(1.3, 0.85, 0.9); body.position.y = 0.3; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), o); head.position.set(0, 0.5, 0.22); g.add(head);
    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 8), w); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.47, 0.38); g.add(muzzle);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), o); e.position.set(s * 0.09, 0.66, 0.18); g.add(e);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), k); eye.position.set(s * 0.07, 0.53, 0.36); g.add(eye); }
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), o); tail.scale.set(0.8, 0.8, 2.2); tail.position.set(0, 0.42, -0.32); tail.rotation.x = 0.7; g.add(tail);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), w); tip.position.set(0, 0.62, -0.52); g.add(tip);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.8, roughness: 0.3 })); bell.position.set(0, 0.38, 0.32); g.add(bell);
    g.traverse((m) => m.isMesh && (m.castShadow = true)); g.scale.setScalar(1.15); this.model = g; this.t = 0; this.tail = tail;
  }
  update(dt, me) {
    this.t += dt;
    if (this.state === "none") { this.timer -= dt; if (this.timer <= 0) this.appear(); return; }
    const g = this.g; if (!g) return;
    if (this.state === "waiting") { g.rotation.y += Math.sin(this.t * 0.8) * 0.01; g.position.y = footY(g.position.x, g.position.z) + Math.abs(Math.sin(this.t * 3)) * 0.04; }
    if (this.state === "follow") {
      const behind = new THREE.Vector3(Math.sin(me.rotation.y) * -1.1, 0, Math.cos(me.rotation.y) * -1.1).add(me.position);
      const d = behind.sub(g.position); d.y = 0; const dist = d.length();
      if (dist > 0.1) { g.position.add(d.multiplyScalar(Math.min(1, dt * 3))); g.rotation.y = Math.atan2(d.x, d.z); }
      g.position.y = footY(g.position.x, g.position.z) + Math.abs(Math.sin(this.t * 10)) * (dist > 0.3 ? 0.08 : 0);
    }
    this.tail.rotation.y = Math.sin(this.t * 6) * 0.4;
  }
  appear() { const [x, z] = KIT_SPOTS[Math.floor(Math.random() * KIT_SPOTS.length)]; this.g = this.model; this.g.position.set(x, footY(x, z), z); this.scene.add(this.g); this.state = "waiting"; }
  near(p, r = 2) { return this.state === "waiting" && this.g && Math.hypot(this.g.position.x - p.x, this.g.position.z - p.z) < r; }
  follow() { this.state = "follow"; }
  home() { this.scene.remove(this.g); this.g = null; this.state = "none"; this.timer = rnd(120, 240); }
}

// ------------------------------------------------------------------ 夜祭り：花火
export class Fireworks {
  constructor(scene) { this.scene = scene; this.list = []; this.cool = 0; this.on = false; }
  burst(x, y, z) {
    const n = 140, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), vel = [];
    const col = new THREE.Color().setHSL(Math.random(), 0.9, 0.62);
    for (let i = 0; i < n; i++) { pos.set([x, y, z], i * 3); const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = rnd(7, 11); vel.push([Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp, Math.sin(ph) * Math.sin(th) * sp]); }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: col, size: 0.55, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const p = new THREE.Points(g, m); this.scene.add(p); this.list.push({ p, pos, vel, t: 0 });
  }
  update(dt, play) {
    if (this.on) { this.cool -= dt; if (this.cool <= 0) { this.cool = rnd(1.2, 3.2); this.burst(rnd(28, 52), rnd(32, 46), rnd(-40, -10)); play?.(); } }
    for (let i = this.list.length - 1; i >= 0; i--) { const f = this.list[i]; f.t += dt;
      for (let k = 0; k < f.vel.length; k++) { f.vel[k][1] -= 4 * dt; f.vel[k][0] *= 0.985; f.vel[k][2] *= 0.985; f.pos[k * 3] += f.vel[k][0] * dt; f.pos[k * 3 + 1] += f.vel[k][1] * dt; f.pos[k * 3 + 2] += f.vel[k][2] * dt; }
      f.p.geometry.attributes.position.needsUpdate = true; f.p.material.opacity = Math.max(0, 1 - f.t / 2.4);
      if (f.t > 2.4) { this.scene.remove(f.p); f.p.geometry.dispose(); f.p.material.dispose(); this.list.splice(i, 1); } }
  }
}
