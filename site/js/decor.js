// 仕上げ：反射（環境マップ）、瓦・砂利のテクスチャ、幟、提灯の列、岩・植え込み、雲、蛍、水面のきらめき
import * as THREE from "three";
import { MAT, sharedLamp } from "./arch.js?v=11031417";
import { height, POND } from "./map.js?v=11031417";

const rnd = (a, b) => a + Math.random() * (b - a);
let sd = 11; const sr = (a, b) => a + ((sd = (sd * 16807) % 2147483647) / 2147483647) * (b - a);
const canvasTex = (w, h, draw, repeat = [1, 1], srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
};

// ------------------------------------------------------------------ 環境マップ（空の色を金・銅・水に映す）
export function environment(renderer, scene, env) {
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
    vertexShader: "varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: "uniform vec3 top,hor,bot; varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c = h>0. ? mix(hor,top,pow(h,0.6)) : mix(hor,bot,pow(-h,0.5)); gl_FragColor=vec4(c,1.); }" });
  envScene.add(new THREE.Mesh(geo, mat));
  // 灯籠の暖かい光を映す小さな光源
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb060 })); s.position.set(Math.cos(i) * 8, -1 + Math.sin(i * 2), Math.sin(i) * 8); envScene.add(s); }
  let rt = null;
  const update = () => {
    const h = env.hour, night = env.lamp;
    mat.uniforms.top.value.set(night > 0.5 ? 0x0a1030 : 0x6a9ad8); mat.uniforms.hor.value.set(night > 0.5 ? 0x5a3a50 : 0xe8dcc8); mat.uniforms.bot.value.set(night > 0.5 ? 0x201418 : 0x7a7060);
    if (h > 16.5 && h < 19) { mat.uniforms.hor.value.set(0xf08a4a); mat.uniforms.top.value.set(0x3a3a7a); }
    rt?.dispose(); rt = pm.fromScene(envScene, 0.04); scene.environment = rt.texture;
  };
  update(); return update;
}

// ------------------------------------------------------------------ 質感：瓦（銅板・檜皮）、石、砂利
export function textures(W) {
  // 銅板葺き：縦の継ぎ目＋横のうね＋緑青のむら
  const copper = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = "#4f8f7a"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "30,70,60" : "120,170,150"},${Math.random() * 0.18})`; x.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2 + Math.random() * 5); }
    for (let xx = 0; xx < w; xx += 16) { x.fillStyle = "rgba(20,40,35,.55)"; x.fillRect(xx, 0, 2, h); x.fillStyle = "rgba(160,210,190,.25)"; x.fillRect(xx + 2, 0, 1, h); }
    for (let yy = 0; yy < h; yy += 32) { x.fillStyle = "rgba(20,40,35,.25)"; x.fillRect(0, yy, w, 1); }
  }, [6, 3]);
  MAT.copper.map = copper; MAT.copper.color.set(0xffffff); MAT.copper.roughness = 0.45; MAT.copper.metalness = 0.35; MAT.copper.needsUpdate = true;
  MAT.copperD.map = copper; MAT.copperD.color.set(0xb0c8c0); MAT.copperD.needsUpdate = true;
  const hinoki = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = "#5a3a2a"; x.fillRect(0, 0, w, h);
    for (let yy = 0; yy < h; yy += 6) { x.fillStyle = `rgba(${30 + Math.random() * 30},${18 + Math.random() * 20},10,.5)`; x.fillRect(0, yy, w, 2); }
    for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(140,100,70,${Math.random() * 0.15})`; x.fillRect(Math.random() * w, Math.random() * h, 6, 1); }
  }, [5, 3]);
  MAT.hinoki.map = hinoki; MAT.hinoki.color.set(0xffffff); MAT.hinoki.needsUpdate = true;
  // 石：細かいむら
  const stone = canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#8a857d"; x.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { const g = 100 + Math.random() * 60; x.fillStyle = `rgba(${g},${g - 4},${g - 10},.35)`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); } }, [1, 1]);
  for (const m of [MAT.stone, MAT.stoneD, MAT.stoneL]) { m.map = stone; m.needsUpdate = true; }
  // 朱：塗りの艶
  MAT.shu.roughness = 0.35; MAT.shu.metalness = 0.05; MAT.gold.roughness = 0.22; MAT.gold.metalness = 1;
  // 木・畳・朱塗り・漆喰：世界座標で貼る（箱の大きさに関係なく同じ細かさ・木目はいつも縦）
  const img = (name) => { const t = new THREE.TextureLoader().load(`img/gen/${name}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 8; return t; };
  const wood = img("wood"), tatami = img("tatami");
  const lacquer = canvasTex(256, 256, (x, w, h) => {                                    // 朱塗り：縦の刷毛目と擦れ（白に近い灰色＝元の色にかける）
    x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const g = 205 + Math.random() * 50; x.fillStyle = `rgba(${g},${g},${g},.55)`; x.fillRect(Math.random() * w, 0, 1 + Math.random() * 2, h); }
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(120,90,80,${Math.random() * 0.18})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 6 + Math.random() * 30); }
  });
  const plaster = canvasTex(256, 256, (x, w, h) => {                                    // 漆喰：やわらかなむら
    x.fillStyle = "#fbfaf6"; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const g = 228 + Math.random() * 27; x.fillStyle = `rgba(${g},${g - 2},${g - 6},.35)`; const r = 2 + Math.random() * 10; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, 7); x.fill(); }
  });
  for (const t of [lacquer, plaster]) t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  const tri = (m, map, size, color) => {
    m.map = map; if (color !== undefined) m.color.set(color); m.userData.tri = 1 / size;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.triScale = { value: m.userData.tri };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vTriW; varying vec3 vTriN;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvec4 triW = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ntriW = instanceMatrix * triW;\n#endif\ntriW = modelMatrix * triW; vTriW = triW.xyz; vTriN = normalize(mat3(modelMatrix) * objectNormal);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vTriW; varying vec3 vTriN; uniform float triScale;")
        .replace("#include <map_fragment>", "#ifdef USE_MAP\n vec3 tn = abs(normalize(vTriN));\n vec2 tuv = tn.y > max(tn.x, tn.z) ? vTriW.xz : (tn.x > tn.z ? vTriW.zy : vTriW.xy);\n diffuseColor *= texture2D(map, tuv * triScale);\n#endif");
    };
    m.needsUpdate = true;
  };
  tri(MAT.woodL, wood, 1.6, 0xffffff); tri(MAT.wood, wood, 1.6, 0xb08865); tri(MAT.woodD, wood, 1.6, 0x6e5240);
  tri(MAT.tatami, tatami, 0.9, 0xffffff);
  tri(MAT.shu, lacquer, 1.2); tri(MAT.shuD, lacquer, 1.2);
  tri(MAT.white, plaster, 2.2);
  // 水：きらめき（法線マップを流す）
  const nrm = canvasTex(256, 256, (x, w, h) => { const img = x.createImageData(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const a = Math.sin(xx * 0.09 + Math.sin(yy * 0.05) * 2) + Math.sin(yy * 0.13 + xx * 0.03); const b = Math.cos(yy * 0.08 + Math.cos(xx * 0.06) * 2);
      const i = (yy * w + xx) * 4; img.data[i] = 128 + a * 30; img.data[i + 1] = 128 + b * 30; img.data[i + 2] = 255; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); }, [3, 3], false);
  MAT.water.normalMap = nrm; MAT.water.normalScale = new THREE.Vector2(0.35, 0.35); MAT.water.roughness = 0.05; MAT.water.metalness = 0.6; MAT.water.needsUpdate = true;
  return (t) => { nrm.offset.set(t * 0.01, t * 0.007); };
}

// ------------------------------------------------------------------ 幟（のぼり）：参道の両脇でゆれる
export function nobori(scene) {
  const tex = (txt, col) => canvasTex(64, 256, (x, w, h) => {
    x.fillStyle = col; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(255,255,255,.9)"; x.fillRect(0, 0, w, 10); x.fillRect(0, 0, 6, h);
    x.fillStyle = "#fff"; x.font = `bold 38px "Hiragino Mincho ProN","Yu Mincho",serif`; x.textAlign = "center"; x.textBaseline = "top";
    [...txt].forEach((ch, i) => x.fillText(ch, w / 2 + 2, 22 + i * 44));
  });
  const T = [tex("奉納えにし", "#c8321f"), tex("家内安全", "#c8321f"), tex("商売繁盛", "#b02a24"), tex("五穀豊穣", "#c8321f"), tex("縁結び", "#d0507a")];
  const flags = [];
  const geoL = new THREE.PlaneGeometry(0.62, 2.4, 1, 8); geoL.translate(0.31, -1.2, 0);
  const geoR = new THREE.PlaneGeometry(0.62, 2.4, 1, 8); geoR.translate(-0.31, -1.2, 0);
  let i = 0;
  for (let z = 70; z > 47; z -= 3.2) for (const side of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(side * 5.6, 0, z); scene.add(g);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 3.6, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a1a })); pole.position.y = 1.8; g.add(pole);
    const m = new THREE.Mesh(side > 0 ? geoR : geoL, new THREE.MeshStandardMaterial({ map: T[i++ % T.length], side: THREE.DoubleSide, roughness: 0.9 })); m.position.set(side > 0 ? -0.03 : 0.03, 3.45, 0); m.castShadow = true; g.add(m);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.66, 5), pole.material); bar.rotation.z = Math.PI / 2; bar.position.set(side > 0 ? -0.31 : 0.31, 3.45, 0); g.add(bar);
    flags.push({ m, ph: Math.random() * 6 });
  }
  return (t) => { for (const f of flags) { f.m.rotation.x = Math.sin(t * 1.3 + f.ph) * 0.05; f.m.rotation.z = Math.sin(t * 0.9 + f.ph) * 0.04; } };
}

// ------------------------------------------------------------------ 提灯の列（参道の上に渡す）
export function lanternRows(scene, env) {
  // 揺れる提灯は InstancedMesh で（本体1・口輪1＝2ドローコール）
  const L = [], wireM = new THREE.MeshStandardMaterial({ color: 0x222222 }), poleM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a }), poleG = new THREE.CylinderGeometry(0.05, 0.06, 4, 6);
  for (let z = 68; z > 48; z -= 6.5) {
    const pts = []; for (let k = 0; k <= 20; k++) { const u = k / 20; pts.push(new THREE.Vector3(-4.8 + u * 9.6, 3.9 - Math.sin(u * Math.PI) * 0.6, z)); }
    const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 4), wireM); wire.userData.static = true; scene.add(wire);
    for (let k = 1; k < 10; k++) { const u = k / 10; L.push({ x: -4.8 + u * 9.6, y: 3.9 - Math.sin(u * Math.PI) * 0.6 - 0.45, z, ph: Math.random() * 6, col: k % 2 ? 0xfff0d0 : 0xffd0c0 }); }
    for (const x of [-4.8, 4.8]) { const p = new THREE.Mesh(poleG, poleM); p.position.set(x, 2, z); p.userData.static = true; scene.add(p); }
  }
  const S = 0.55, body = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 16, 12), sharedLamp(0xffffff, 0xff9a3a, 1.1, env), L.length);
  const rim = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), MAT.kuro, L.length * 2);
  const col = new THREE.Color(); L.forEach((l, i) => body.setColorAt(i, col.set(l.col)));
  const G = new THREE.Matrix4(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(S, S, S);
  const bodyL = new THREE.Matrix4().makeScale(1, 1.35, 1), up = new THREE.Matrix4().makeTranslation(0, 0.45, 0), dn = new THREE.Matrix4().makeTranslation(0, -0.45, 0);
  const tick = (t) => {
    L.forEach((l, i) => {
      e.set(0, 0, Math.sin(t * 1.1 + l.ph) * 0.06); q.setFromEuler(e); p.set(l.x, l.y + Math.sin(t * 0.9 + l.ph) * 0.02, l.z); G.compose(p, q, sc);
      body.setMatrixAt(i, M.multiplyMatrices(G, bodyL)); rim.setMatrixAt(i * 2, M.multiplyMatrices(G, up)); rim.setMatrixAt(i * 2 + 1, M.multiplyMatrices(G, dn));
    });
    body.instanceMatrix.needsUpdate = rim.instanceMatrix.needsUpdate = true;
  };
  tick(0); body.computeBoundingSphere(); rim.computeBoundingSphere();
  scene.add(body, rim);
  return tick;
}

// ------------------------------------------------------------------ 岩・植え込み・苔（InstancedMesh）
export function rocksAndBushes(scene, season) {
  const rockG = new THREE.DodecahedronGeometry(1, 0), bushG = new THREE.IcosahedronGeometry(1, 1);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x75716a, roughness: 1, flatShading: true });
  const bushM = new THREE.MeshStandardMaterial({ color: season === "winter" ? 0x56705a : 0x3f6a36, roughness: 0.95, flatShading: true });
  const azalea = new THREE.MeshStandardMaterial({ color: season === "spring" ? 0xe8579a : season === "autumn" ? 0xb8462a : 0x4a7a3c, roughness: 0.95, flatShading: true });
  const rocks = [], bushes = [], az = [];
  const ok = (x, z) => Math.abs(x) > 3 || z < 44 || z > 84;
  for (let i = 0; i < 90; i++) { const x = sr(-42, 42), z = sr(-6, 84); if (!ok(x, z)) continue; if (z > -6 && z < 44 && Math.abs(x) < 24) { if (Math.random() < 0.7) continue; } rocks.push([x, z, sr(0.2, 0.6)]); }
  for (let z = 72; z > 46; z -= 1.6) for (const s of [-1, 1]) bushes.push([s * sr(6.6, 7.4), z, sr(0.5, 0.8)]);   // 参道沿いの植え込み
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; az.push([POND.cx + Math.cos(a) * (POND.rx + 1.6), POND.cz + Math.sin(a) * (POND.rz + 1.4), sr(0.45, 0.75)]); }
  for (const [x, z] of [[-14, 30], [-18, 36], [14, 37], [-20, 12], [20, 4], [-16, 4]]) for (let k = 0; k < 6; k++) az.push([x + sr(-2, 2), z + sr(-2, 2), sr(0.5, 0.8)]);
  const o = new THREE.Object3D();
  const make = (list, geo, mat, sy = 1) => { const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach(([x, z, s], i) => { o.position.set(x, height(x, z) + s * 0.35 * sy, z); o.rotation.set(sr(0, 3), sr(0, 3), sr(0, 3) * (sy < 1 ? 0 : 1)); o.scale.set(s * 1.3, s * sy, s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im); };
  make(rocks, rockG, rockM, 0.7); make(bushes, bushG, bushM, 0.75); make(az, bushG, azalea, 0.7);
}

// ------------------------------------------------------------------ 雲（時刻で色が変わる）
export function clouds(scene) {
  const tex = canvasTex(256, 128, (x, w, h) => { for (let i = 0; i < 14; i++) { const g = x.createRadialGradient(40 + i * 13, 64 + Math.sin(i) * 14, 0, 40 + i * 13, 64 + Math.sin(i) * 14, 40);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); } });
  const list = [];
  for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false, fog: false }));
    s.scale.set(rnd(60, 120), rnd(18, 30), 1); s.position.set(rnd(-250, 250), rnd(70, 120), rnd(-300, -60)); scene.add(s); list.push(s); }
  return (t, env) => { const night = env.lamp, eve = env.hour > 16.3 && env.hour < 19;
    for (const s of list) { s.position.x += 0.02; if (s.position.x > 260) s.position.x = -260; s.material.color.set(eve ? 0xffb08a : night > 0.5 ? 0x2a3050 : 0xffffff); s.material.opacity = night > 0.5 ? 0.35 : 0.55; } };
}

// ------------------------------------------------------------------ 冬：屋根に積もる雪（上向きの面だけ白く）
export function snowRoofs(season, mats = [MAT.copper, MAT.copperD, MAT.hinoki, MAT.stoneD, MAT.kuro]) {
  if (season !== "winter") return;
  for (const m of mats) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSnowN;")
        .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvSnowN = normalize(mat3(modelMatrix) * objectNormal);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vSnowN;")
        .replace("#include <color_fragment>", "#include <color_fragment>\nfloat sn = smoothstep(0.45, 0.8, vSnowN.y);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), sn);");
    };
    m.customProgramCacheKey = () => "snow"; m.needsUpdate = true;
  }
}
