// 水：二枚の波の法線をずらして流し、真上から見ると澄んで（鯉が見える）、斜めからは空を映す（フレネル）。
// 岸に白い泡、底には揺れる光の網（集光模様）。どれも追加の描画パスなしで軽い。
import * as THREE from "three";

// 継ぎ目なく繰り返す波の法線（整数の波数の正弦を重ねる）
function normalTex(size = 256, seed = 3) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const waves = Array.from({ length: 14 }, () => { const kx = Math.floor(rnd() * 9) - 4, ky = Math.floor(rnd() * 9) - 4; return [kx || 1, ky, 1 / Math.hypot(kx || 1, ky), rnd() * 6.283]; });
  const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d"), img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let dx = 0, dy = 0;
    for (const [kx, ky, a, ph] of waves) { const arg = (6.283 * (kx * i + ky * j)) / size + ph, cs = Math.cos(arg) * a; dx += cs * kx; dy += cs * ky; }
    const n = new THREE.Vector3(-dx * 0.12, -dy * 0.12, 1).normalize(), k = (j * size + i) * 4;
    img.data[k] = (n.x * 0.5 + 0.5) * 255; img.data[k + 1] = (n.y * 0.5 + 0.5) * 255; img.data[k + 2] = (n.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
// 水底の光の網（集光模様）
function causticTex(size = 256) {
  const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d"), img = x.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i / size) * 6.283, v = (j / size) * 6.283;
    let w = 0;
    for (const [a, b, p, q] of [[2, 3, 0.0, 1.7], [3, -2, 2.1, 0.4], [-1, 4, 4.2, 2.9], [4, 1, 1.3, 5.1]]) w += 1 - Math.abs(Math.sin(a * u + b * v + p + 0.9 * Math.sin(b * u - a * v + q)));
    const val = Math.pow(Math.max(0, w / 4), 7) * 255, k = (j * size + i) * 4;
    img.data[k] = val; img.data[k + 1] = val; img.data[k + 2] = val; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let NT = null, CT = null;
const clock = { t: 0 };
const live = [];
export function tickWater(t) { clock.t = t; for (const f of live) f(t); }

// 水面の素材。rx, rz：楕円の半径（岸の泡に使う）
export function waterMaterial({ color = 0x2f6a6a, minAlpha = 0.34, rx = 1, rz = 1, foam = 1, scale = 0.18 } = {}) {
  NT ||= normalTex();
  const U = { uT: { value: 0 }, uR: { value: new THREE.Vector2(rx, rz) }, uMinA: { value: minAlpha }, uFoam: { value: foam }, uScale: { value: scale } };
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.1, normalMap: NT, normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, depthWrite: false, envMapIntensity: 1.4 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vWP;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvWP = position.xy;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vWP; uniform float uT, uMinA, uFoam, uScale; uniform vec2 uR;")
      .replace("#include <normal_fragment_maps>", `
        vec3 n1 = texture2D(normalMap, vWP * uScale + vec2(uT * 0.021, uT * 0.013)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(normalMap, vWP * uScale * 1.73 + vec2(-uT * 0.016, uT * 0.027)).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3((n1.xy + n2.xy) * normalScale, 1.0));
        normal = normalize(tbn * mapN);`)
      .replace("#include <opaque_fragment>", `
        vec3 Vw = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normal, Vw), 0.0, 1.0), 2.4);
        float rr = length(vWP / uR);
        float fn = texture2D(normalMap, vWP * uScale * 3.1 + vec2(uT * 0.05, -uT * 0.03)).x;
        float foamA = uFoam * smoothstep(0.90, 0.995, rr + (fn - 0.5) * 0.1) * smoothstep(0.35, 0.7, fn);
        outgoingLight = mix(outgoingLight, vec3(0.88, 0.93, 0.93), foamA * 0.45);
        diffuseColor.a = clamp(mix(uMinA, 0.94, fres) + foamA * 0.35, 0.0, 1.0);
        #include <opaque_fragment>`);
  };
  live.push((t) => (U.uT.value = t));
  return m;
}

// 池：楕円の水面、すり鉢の底（集光模様）、岸のまわり。cx, cz, rx, rz, y（水面の高さ）, depth
export function makePond(scene, { cx, cz, rx, rz, y, depth = 0.9, minAlpha = 0.34 }) {
  CT ||= causticTex();
  const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
  // 底：中ほど深いすり鉢
  const bedG = new THREE.RingGeometry(0.0001, 1, 64, 10), p = bedG.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), yy = p.getY(i), r = Math.hypot(x, yy); p.setXYZ(i, x * (rx + 0.25), yy * (rz + 0.25), -depth * (1 - Math.pow(Math.min(1, r), 2.2))); }
  bedG.computeVertexNormals();
  const ct = CT.clone(); ct.needsUpdate = true; ct.repeat.set(rx / 3, rz / 3);
  const bedM = new THREE.MeshStandardMaterial({ color: 0x4a5a46, roughness: 0.95, emissive: 0x9fd8c8, emissiveMap: ct, emissiveIntensity: 0.35 });
  const bed = new THREE.Mesh(bedG, bedM); bed.rotation.x = -Math.PI / 2; bed.position.y = y + 0.02; bed.receiveShadow = true; g.add(bed);
  // 底の小石
  const peb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: 0x7d776c, roughness: 1, flatShading: true }), 60), o = new THREE.Object3D();
  for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.9; o.position.set(Math.cos(a) * r * rx, y - depth * (1 - Math.pow(r, 2.2)) + 0.06, Math.sin(a) * r * rz); o.scale.setScalar(0.5 + Math.random()); o.rotation.set(Math.random() * 3, Math.random() * 3, 0); o.updateMatrix(); peb.setMatrixAt(i, o.matrix); }
  g.add(peb);
  // 水面
  const shape = new THREE.Shape(); shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2);
  const surf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), waterMaterial({ rx, rz, minAlpha })); surf.rotation.x = -Math.PI / 2; surf.position.y = y; surf.renderOrder = 2; g.add(surf);
  live.push((t) => { ct.offset.set(t * 0.012, t * 0.008); bedM.emissiveIntensity = 0.32 + Math.sin(t * 0.7) * 0.05; });
  return { group: g, surface: surf, y, cx, cz, rx, rz };
}

// 蓮の葉と花・岸の菖蒲
export function pondPlants(scene, { cx, cz, rx, rz, y }, { pads = 18, lotus = 5, iris = 10 } = {}) {
  const padShape = new THREE.Shape(); padShape.moveTo(0, 0); padShape.absarc(0, 0, 1, 0.25, Math.PI * 2 - 0.05, false); padShape.lineTo(0, 0);
  const padG = new THREE.ShapeGeometry(padShape, 20); padG.rotateX(-Math.PI / 2);
  const padI = new THREE.InstancedMesh(padG, new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.6, side: THREE.DoubleSide }), pads), o = new THREE.Object3D(), col = new THREE.Color();
  const spots = [];
  for (let i = 0; i < pads; i++) {
    const a = Math.random() * 6.283, r = 0.45 + Math.random() * 0.45, x = cx + Math.cos(a) * r * rx, z = cz + Math.sin(a) * r * rz;
    o.position.set(x, y + 0.012, z); o.rotation.set(0, Math.random() * 6.283, 0); o.scale.setScalar(0.28 + Math.random() * 0.25); o.updateMatrix(); padI.setMatrixAt(i, o.matrix);
    padI.setColorAt(i, col.setHSL(0.28 + Math.random() * 0.05, 0.45, 0.28 + Math.random() * 0.1)); spots.push([x, z, o.scale.x]);
  }
  padI.receiveShadow = true; scene.add(padI);
  const petalM = new THREE.MeshStandardMaterial({ color: 0xf7c3d4, roughness: 0.5, emissive: 0x401020, emissiveIntensity: 0.15, side: THREE.DoubleSide });
  const petalG = new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI, 0, Math.PI); petalG.scale(0.6, 1.3, 0.35);
  for (let i = 0; i < lotus && i < spots.length; i++) {
    const [x, z] = spots[i], f = new THREE.Group(); f.position.set(x, y + 0.06, z); scene.add(f);
    for (let k = 0; k < 10; k++) { const p = new THREE.Mesh(petalG, petalM); const a = (k / 10) * 6.283; p.position.set(Math.cos(a) * 0.05, 0.06, Math.sin(a) * 0.05); p.rotation.set(-0.5 * (k % 2 ? 0.6 : 1), -a + Math.PI / 2, 0); f.add(p); }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xf2d24a, roughness: 0.6 })); core.position.y = 0.09; f.add(core);
  }
  const bladeM = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8, side: THREE.DoubleSide }), irisM = new THREE.MeshStandardMaterial({ color: 0x6a4aa8, roughness: 0.6 });
  for (let i = 0; i < iris; i++) {
    const a = Math.random() * 6.283, x = cx + Math.cos(a) * (rx + 0.6), z = cz + Math.sin(a) * (rz + 0.5), c = new THREE.Group(); c.position.set(x, 0, z); scene.add(c);
    for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.8 + Math.random() * 0.4), bladeM); b.position.set((Math.random() - 0.5) * 0.3, 0.45, (Math.random() - 0.5) * 0.3); b.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.3); c.add(b); }
    for (let k = 0; k < 2; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), irisM); fl.scale.set(1, 0.7, 1); fl.position.set((Math.random() - 0.5) * 0.2, 0.95 + Math.random() * 0.2, (Math.random() - 0.5) * 0.2); c.add(fl); }
  }
}
