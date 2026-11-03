// 境内全体を組み立てる（地形・植物・水・建物）。
import * as THREE from "three";
import { MAT, box, cyl, torii, toro, chochin, honden, smallHall, romon, pagoda, taikobashi, tamagaki, temizuya, juyosho, shinboku, okunoin, lampMat, roof } from "./arch.js?v=11031103";
import { PLACES, TRAIL, trailHeight, height, POND, BRIDGE, OKPOND, SMALL } from "./map.js?v=11031103";
import { FOLIAGE } from "./env.js?v=11031103";

const rnd = (a, b) => a + Math.random() * (b - a);
let seedN = 7; const srnd = () => ((seedN = (seedN * 16807) % 2147483647) / 2147483647);   // 毎回同じ配置になる乱数
const sr = (a, b) => a + srnd() * (b - a);

export function buildWorld(scene, env, { mobile }) {
  const W = { lamps: [], cushions: {}, altars: {}, foxes: [], spots: {}, update: [] };
  const pal = FOLIAGE[env.season];

  // ---------------------------------------------------------------- 地形
  const S = 300, N = mobile ? 150 : 220;
  const tg = new THREE.PlaneGeometry(S, S, N, N); tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  const grass = new THREE.Color(pal.ground), forest = new THREE.Color(env.season === "winter" ? 0xc9d2dc : 0x2f4a2c), gravel = new THREE.Color(0x7f776a), dirt = new THREE.Color(0x6b5a44);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 0, y = height(x, z); pos.setY(i, y);
    const inCourt = z > -6 && z <= 44 && Math.abs(x) < 24.5, side = z > 2 && z < 26 && Math.abs(x) >= 24.5 && Math.abs(x) < 42;
    c.copy(y > 3 ? forest : grass).lerp(dirt, Math.min(0.3, Math.abs(Math.sin(x * 0.3 + z * 0.2)) * 0.2));
    if (inCourt || side) c.copy(gravel).offsetHSL(0, 0, (Math.sin(x * 2.3) * Math.cos(z * 1.7)) * 0.02);
    col.set([c.r, c.g, c.b], i * 3);
  }
  tg.setAttribute("color", new THREE.BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  terrain.receiveShadow = true; scene.add(terrain); W.terrain = terrain;

  // ---------------------------------------------------------------- 参道の石畳
  const stoneGeo = new THREE.BoxGeometry(1, 0.12, 1);
  const pave = [];
  for (let z = 82; z > 43; z -= 1.05) for (let x = -2; x <= 2; x += 1.02) pave.push([x + sr(-0.04, 0.04), z + sr(-0.04, 0.04), 0.98, 0.98]);
  for (let z = 39; z > 9; z -= 1.05) for (let x = -2; x <= 2; x += 1.02) pave.push([x, z, 0.98, 0.98]);                       // 楼門から本殿
  for (let x = 2.5; x < 10.6; x += 1.05) for (const z of [53.5, 54.5]) pave.push([x, z, 0.98, 0.98]);                        // 池へ
  for (const sgn of [-1, 1]) for (let x = 24; x < SMALL.X + 0.6; x += 1.05) for (const z of [19.3, 20.3]) pave.push([sgn * x, z, 0.98, 0.98]);   // 縁結び・合格への石畳
  const paveI = new THREE.InstancedMesh(stoneGeo, MAT.stone, pave.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  pave.forEach(([x, z, w, d], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), sr(-0.04, 0.04)); m4.compose(v.set(x, 0.06, z), q, sc.set(w, 1, d)); paveI.setMatrixAt(i, m4); });
  paveI.receiveShadow = true; scene.add(paveI);

  // ---------------------------------------------------------------- ① 大鳥居 と ② 参道の灯籠
  torii(scene, { z: 76, s: 2.3, gaku: "えにし神社" });
  const entr = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), new THREE.MeshStandardMaterial({ color: 0x7d766b, roughness: 1 })); entr.rotation.x = -Math.PI / 2; entr.position.set(0, 0.02, 82); entr.receiveShadow = true; scene.add(entr);
  for (let z = 72; z > 46; z -= 4.5) for (const x of [-4.2, 4.2]) W.lamps.push(toro(scene, x, z, 0, env));
  for (const x of [-5.5, 5.5]) W.lamps.push(toro(scene, x, 80, 0, env, 1.3));

  // ---------------------------------------------------------------- ③ 池と太鼓橋、鯉
  const pondShape = new THREE.Shape(); pondShape.absellipse(0, 0, POND.rx, POND.rz, 0, Math.PI * 2);
  const water = new THREE.Mesh(new THREE.ShapeGeometry(pondShape, 48), MAT.water); water.rotation.x = -Math.PI / 2; water.position.set(POND.cx, 0.05, POND.cz); scene.add(water);
  const bed = new THREE.Mesh(new THREE.ShapeGeometry(pondShape, 48), new THREE.MeshStandardMaterial({ color: 0x1d2e26 })); bed.rotation.x = -Math.PI / 2; bed.position.set(POND.cx, 0.01, POND.cz); scene.add(bed);
  for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2; const r = box(scene, sr(0.5, 1.0), sr(0.25, 0.5), sr(0.5, 0.9), MAT.stoneD, POND.cx + Math.cos(a) * (POND.rx + 0.2), 0.15, POND.cz + Math.sin(a) * (POND.rz + 0.2)); r.rotation.y = sr(0, 3); r.userData.static = true; }
  taikobashi(scene, BRIDGE);
  const koi = [];
  const koiCols = [0xff6a2a, 0xffffff, 0xf2c14a, 0xe83a2a, 0x222222];
  for (let i = 0; i < 9; i++) {
    const k = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: koiCols[i % koiCols.length], roughness: 0.4 }));
    body.scale.set(2.6, 0.6, 1); k.add(body); const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), body.material); tail.rotation.z = Math.PI / 2; tail.position.x = -0.55; k.add(tail);
    k.position.y = -0.05; scene.add(k); koi.push({ k, a: sr(0, 6.28), r: sr(2, 6), sp: sr(0.15, 0.35), t: tail });
  }
  W.koi = koi; W.pondWater = water;
  W.update.push((t) => { for (const f of koi) { f.a += f.sp * 0.016 * (f.boost || 1); f.boost = Math.max(1, (f.boost || 1) * 0.99);
    const x = POND.cx + Math.cos(f.a) * f.r * 1.4, z = POND.cz + Math.sin(f.a) * f.r * 0.8; f.k.position.set(x, -0.02, z); f.k.rotation.y = -f.a - Math.PI / 2; f.t.rotation.y = Math.sin(t * 8 + f.a) * 0.4; } });
  for (const [x, z] of [[9, 47], [27, 47], [9, 61], [27, 61]]) W.lamps.push(toro(scene, x, z, 0, env, 0.85));

  // ---------------------------------------------------------------- ④ 楼門 と 玉垣
  romon(scene, env, { z: 41 });
  tamagaki(scene, [[[-24.5, 41], [-6.2, 41]], [[6.2, 41], [24.5, 41]], [[-24.5, 41], [-24.5, 26]], [[24.5, 41], [24.5, 26]], [[-24.5, 2], [-24.5, -6]], [[24.5, 2], [24.5, -6]],
    [[-42, 26], [-24.5, 26]], [[24.5, 26], [42, 26]], [[-42, 26], [-42, 2]], [[42, 26], [42, 2]], [[-42, 2], [-24.5, 2]], [[24.5, 2], [34, 2]]]);
  torii(scene, { x: 38.5, z: 2.2, s: 0.75, gaku: null });
  for (const s of [-1, 1]) { torii(scene, { x: s * 24.5, z: 17, s: 0.9, ry: Math.PI / 2, gaku: null }); }

  // ---------------------------------------------------------------- ⑤ 手水舎 ⑥ 授与所 ⑦ 御神木
  temizuya(scene, env, { x: PLACES.temizu.pos[0], z: PLACES.temizu.pos[1] });
  juyosho(scene, env, { x: PLACES.juyosho.pos[0] + 1.5, z: PLACES.juyosho.pos[1] });
  const kusu = new THREE.MeshStandardMaterial({ color: env.season === "winter" ? 0x3d5a3a : 0x3f6a36, roughness: 0.9, flatShading: true });
  shinboku(scene, { x: PLACES.shinboku.pos[0], z: PLACES.shinboku.pos[1] }, kusu);
  // 絵馬掛け（御神木の前）
  const emaRack = new THREE.Group(); emaRack.position.set(17.5, 0, 9.5); emaRack.rotation.y = -Math.PI / 2.4; scene.add(emaRack);
  for (const x of [-2, 2]) cyl(emaRack, 0.09, 0.09, 2.3, MAT.woodD, x, 1.15, 0, 8);
  for (const y of [1.25, 1.85]) box(emaRack, 4.3, 0.07, 0.07, MAT.woodD, 0, y, 0);
  roof(emaRack, { w: 4.8, d: 1.2, h: 0.4, lift: 0.1, y: 2.3, mat: MAT.hinoki, gable: false, ridgeGold: false });
  W.emaRack = emaRack;
  // おみくじ結び所（授与所の横）
  const musubi = new THREE.Group(); musubi.position.set(21, 0, 29); musubi.rotation.y = -Math.PI / 2; scene.add(musubi);
  for (const x of [-1.8, 1.8]) cyl(musubi, 0.08, 0.08, 1.9, MAT.woodD, x, 0.95, 0, 8);
  for (const y of [1.15, 1.65]) { const r = cyl(musubi, 0.025, 0.025, 3.6, MAT.rope, 0, y, 0, 6); r.rotation.z = Math.PI / 2; }
  W.musubi = musubi;

  // ---------------------------------------------------------------- ⑧ 本殿（当選の社）と賽銭箱・鈴・狛狐
  const hd = honden(scene, env, { z: 1 });
  const saisen = new THREE.Group(); saisen.position.set(0, 0, 12.4); scene.add(saisen);
  box(saisen, 3.6, 1.0, 1.3, MAT.wood, 0, 0.5, 0);
  for (let i = -8; i <= 8; i++) box(saisen, 0.06, 0.05, 1.2, MAT.kuro, i * 0.2, 1.02, 0, false);
  box(saisen, 3.0, 0.3, 0.05, MAT.gold, 0, 0.55, 0.66, false);
  W.saisen = saisen;
  const suzu = new THREE.Group(); suzu.position.set(0, 6.6, 11.4); scene.add(suzu);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), MAT.gold); bell.position.y = -0.4; bell.castShadow = true; suzu.add(bell);
  const suzuo = new THREE.Group(); suzu.add(suzuo);
  for (const [cc, dx] of [[0xd9412b, -0.08], [0xf4f1ea, 0], [0x3b6db0, 0.08]]) { const r = cyl(suzuo, 0.05, 0.05, 4.6, new THREE.MeshStandardMaterial({ color: cc }), dx, -2.8, 0, 8, false); }
  W.suzu = { group: suzu, bell, rope: suzuo };
  // 狛狐
  const fox = (x, z, flip) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = flip ? -0.45 : 0.45; scene.add(g);
    box(g, 1.3, 1.1, 1.3, MAT.stoneD, 0, 0.55, 0); box(g, 1.5, 0.16, 1.5, MAT.stoneL, 0, 1.18, 0);
    const wm = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.7 }); wm.userData.fox = true;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), wm); b.scale.set(0.9, 1.3, 0.9); b.position.y = 1.65; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), wm); h.position.set(0, 2.3, 0.12); h.scale.set(1, 0.95, 1.15); g.add(h);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 8), wm); sn.rotation.x = Math.PI / 2; sn.position.set(0, 2.24, 0.46); g.add(sn);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 8), wm); e.position.set(s * 0.15, 2.6, 0.05); g.add(e); }
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), wm); tl.scale.set(0.7, 1.7, 0.7); tl.position.set(0, 1.85, -0.5); g.add(tl);
    const bib = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 8, 20), MAT.shu); bib.rotation.x = Math.PI / 2.4; bib.position.set(0, 1.98, 0.14); g.add(bib);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), MAT.gold); gem.position.set(0, 1.9, 0.5); g.add(gem);
    g.traverse((o) => o.isMesh && (o.castShadow = true)); W.foxes.push(g); return g;
  };
  fox(-5.5, 18, false); fox(5.5, 18, true);
  for (const x of [-7.5, 7.5]) W.lamps.push(toro(scene, x, 15.5, 0, env, 1.25));
  for (const x of [-12, 12]) for (const z of [24, 34]) W.lamps.push(toro(scene, x, z, 0, env));

  // ---------------------------------------------------------------- ⑨ 縁結びの社 ⑩ 合格の社
  const en = smallHall(scene, env, { x: PLACES.enmusubi.pos[0], z: PLACES.enmusubi.pos[1], W: SMALL.W, D: SMALL.D, F: SMALL.F, roofMat: new THREE.MeshStandardMaterial({ color: 0x6a3a52, roughness: 0.6 }), zabMat: new THREE.MeshStandardMaterial({ color: 0xc23a5a }), theme: "en", crest: 0xf3a6b8 });
  const go = smallHall(scene, env, { x: PLACES.gokaku.pos[0], z: PLACES.gokaku.pos[1], W: SMALL.W, D: SMALL.D, F: SMALL.F, roofMat: new THREE.MeshStandardMaterial({ color: 0x2c3a5a, roughness: 0.6 }), zabMat: new THREE.MeshStandardMaterial({ color: 0x2c4a8a }), theme: "go", crest: 0xf6d36b });
  W.cushions.enmusubi = en.cushions; W.cushions.gokaku = go.cushions; W.altars.enmusubi = en.altar; W.altars.gokaku = go.altar;
  // 本殿の中の座布団
  const hdC = []; const zab = new THREE.MeshStandardMaterial({ color: 0x8b2c3a });
  for (let r = 0; r < 3; r++) for (let cI = 0; cI < 6; cI++) { const x = -6.25 + cI * 2.5, z = -1.6 + r * 2.2; box(scene, 0.95, 0.12, 0.95, zab, x, hd.floorY + 0.06, z + 1).userData.static = true; hdC.push([x, z + 1]); }
  W.cushions.tosen = hdC; W.altars.tosen = [0, -2.6];
  W.hondenMirror = hd.mirror;
  // 縁結び・合格の賽銭箱と鈴
  W.smallSaisen = {};
  for (const [hid, hx] of [["enmusubi", -SMALL.X], ["gokaku", SMALL.X]]) {
    const sb = new THREE.Group(); sb.position.set(hx, 0, SMALL.saisenZ); scene.add(sb);
    box(sb, 2.2, 0.8, 0.9, MAT.wood, 0, 0.4, 0); for (let i = -5; i <= 5; i++) box(sb, 0.05, 0.05, 0.85, MAT.kuro, i * 0.19, 0.82, 0, false);
    box(sb, 1.8, 0.24, 0.05, MAT.gold, 0, 0.45, 0.46, false);
    const sz = new THREE.Group(); sz.position.set(hx, SMALL.F + 3.1, SMALL.saisenZ - 0.3); scene.add(sz);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), MAT.gold); bl.position.y = -0.3; sz.add(bl);
    const rp = new THREE.Group(); sz.add(rp);
    for (const [cc, dx] of [[0xd9412b, -0.06], [0xf4f1ea, 0], [hid === "enmusubi" ? 0xe86aa0 : 0x3b6db0, 0.06]]) cyl(rp, 0.04, 0.04, 2.6, new THREE.MeshStandardMaterial({ color: cc }), dx, -1.6, 0, 8, false);
    W.smallSaisen[hid] = { box: sb, bell: bl, rope: rp };
  }
  // 赤い糸の結び木（縁結び）・撫で牛（合格）
  const enTree = new THREE.Group(); enTree.position.set(-29.5, 0, 23.8); enTree.userData.static = true; scene.add(enTree);
  cyl(enTree, 0.5, 0.7, 3.4, new THREE.MeshStandardMaterial({ color: 0x4a3426 }), 0, 1.7, 0, 10);
  const enRope = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 24), MAT.rope); enRope.rotation.x = Math.PI / 2; enRope.position.y = 1.6; enTree.add(enRope);
  const threadM = new THREE.MeshStandardMaterial({ color: 0xd61f3a, emissive: 0x700010, emissiveIntensity: 0.6 });
  for (let i = 0; i < 18; i++) cyl(enTree, 0.012, 0.012, sr(0.5, 1.2), threadM, sr(-1.3, 1.3), sr(2.4, 3.1), sr(-1.3, 1.3), 4, false);
  W.enTree = enTree;
  const ushi = new THREE.Group(); ushi.position.set(29.5, 0, 23.8); ushi.rotation.y = 0.4; scene.add(ushi);
  box(ushi, 2.0, 0.55, 1.1, MAT.stoneD, 0, 0.27, 0);
  const bronze = new THREE.MeshStandardMaterial({ color: 0x5b4a32, metalness: 0.6, roughness: 0.45 });
  const ub = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 6, 12), bronze); ub.rotation.z = Math.PI / 2; ub.position.y = 0.95; ub.castShadow = true; ushi.add(ub);
  const uh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshStandardMaterial({ color: 0x9a7a4a, metalness: 0.75, roughness: 0.3 })); uh.position.set(0.85, 1.05, 0); uh.scale.set(1.1, 0.9, 0.9); ushi.add(uh);  // 撫でられて光る頭
  for (const s of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 8), bronze); horn.rotation.z = -0.5; horn.position.set(0.9, 1.35, s * 0.2); ushi.add(horn); }
  W.ushi = ushi;
  for (const s of [-1, 1]) for (const [x, z] of [[41.5, 21], [41.5, 7]]) W.lamps.push(toro(scene, s * x, z, 0, env, 0.9));

  // ---------------------------------------------------------------- ⑪ 千本鳥居（山道）— InstancedMesh
  const trailPts = TRAIL.getSpacedPoints(160);
  const pillarG = new THREE.CylinderGeometry(0.13, 0.16, 3.3, 10), beamG = new THREE.BoxGeometry(3.2, 0.18, 0.22), topG = new THREE.BoxGeometry(3.7, 0.22, 0.34), footG = new THREE.CylinderGeometry(0.19, 0.19, 0.32, 10);
  const n = trailPts.length - 2;
  const pil = new THREE.InstancedMesh(pillarG, MAT.shu, n * 2), beam = new THREE.InstancedMesh(beamG, MAT.shu, n), top = new THREE.InstancedMesh(topG, MAT.kuro, n), foot = new THREE.InstancedMesh(footG, MAT.kuro, n * 2);
  const up = new THREE.Vector3(0, 1, 0), o3 = new THREE.Object3D();
  for (let i = 1; i <= n; i++) {
    const p = trailPts[i], nx = trailPts[i + 1], t = i / trailPts.length, y = trailHeight(t);
    const dir = new THREE.Vector3(nx.x - p.x, 0, nx.z - p.z).normalize(), side = new THREE.Vector3().crossVectors(up, dir).normalize();
    const ang = Math.atan2(dir.x, dir.z);
    for (const s of [-1, 1]) {
      o3.position.set(p.x + side.x * 1.45 * s, y + 1.65, p.z + side.z * 1.45 * s); o3.rotation.set(0, ang, 0); o3.updateMatrix(); pil.setMatrixAt((i - 1) * 2 + (s > 0 ? 1 : 0), o3.matrix);
      o3.position.y = y + 0.16; o3.updateMatrix(); foot.setMatrixAt((i - 1) * 2 + (s > 0 ? 1 : 0), o3.matrix);
    }
    o3.position.set(p.x, y + 2.75, p.z); o3.rotation.set(0, ang + Math.PI / 2, 0); o3.updateMatrix(); beam.setMatrixAt(i - 1, o3.matrix);
    o3.position.y = y + 3.35; o3.updateMatrix(); top.setMatrixAt(i - 1, o3.matrix);
  }
  for (const im of [pil, beam, top, foot]) { im.castShadow = true; scene.add(im); }
  // 山道の灯籠（間隔をあけて）
  for (let i = 8; i < trailPts.length - 4; i += 14) { const p = trailPts[i], nx = trailPts[i + 1], t = i / trailPts.length; const d = new THREE.Vector3(nx.z - p.z, 0, -(nx.x - p.x)).normalize();
    W.lamps.push(toro(scene, p.x + d.x * 2.6, p.z + d.z * 2.6, trailHeight(t), env, 0.75)); }
  torii(scene, { x: 14.5, z: -6.2, s: 1.1, gaku: null });

  // ---------------------------------------------------------------- ⑫ 奥の院・滝・灯籠流しの池
  const okY = 15.5;
  okunoin(scene, env, { x: -2, y: okY, z: -78 });
  const op = new THREE.Shape(); op.absellipse(0, 0, 5.5, 3.6, 0, Math.PI * 2);
  const oWater = new THREE.Mesh(new THREE.ShapeGeometry(op, 40), MAT.water); oWater.rotation.x = -Math.PI / 2; oWater.position.set(OKPOND.cx, okY + 0.05, OKPOND.cz); scene.add(oWater);
  W.okPond = { x: 6, z: -73, y: okY, rx: 5.5, rz: 3.6 };
  const fallTex = (() => { const cv = document.createElement("canvas"); cv.width = 32; cv.height = 128; const x = cv.getContext("2d");
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`; x.fillRect(Math.random() * 32, Math.random() * 128, 1 + Math.random() * 2, 8 + Math.random() * 20); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.85, color: 0xd8ecff, depthWrite: false }));
  fall.position.set(11, okY + 4.5, -76.5); fall.rotation.y = -0.6; scene.add(fall);
  { const b = box(scene, 6, 10, 3, MAT.stoneD, 12.5, okY + 4, -78.5); b.rotation.y = -0.6; b.userData.static = true; }
  W.update.push((t, dt) => { fallTex.offset.y -= dt * 1.4; });
  torii(scene, { x: 3.5, z: -70, y: okY, s: 0.8, gaku: null });
  for (const x of [-6, 2]) W.lamps.push(toro(scene, x, -69, okY, env, 0.8));

  // ---------------------------------------------------------------- ⑬ 五重塔
  pagoda(scene, env, { x: 40, z: -22, y: height(40, -22) });

  // ---------------------------------------------------------------- 木々（InstancedMesh：幹＋葉）
  const trees = { momiji: [], sakura: [], ume: [], sugi: [] };
  const halls = [PLACES.enmusubi.pos, PLACES.gokaku.pos];   // 社の中と正面の広場に木が生えないように
  const add = (k, x, z, s = 1) => { if (!halls.some(([hx, hz]) => Math.abs(x - hx) < SMALL.W / 2 + 2.5 && z > hz - SMALL.D / 2 - 2.5 && z < 26.5)) trees[k].push([x, z, s]); };
  for (let z = 74; z > 45; z -= 3.2) for (const sgn of [-1, 1]) add("momiji", sgn * sr(7.5, 11), z + sr(-1, 1), sr(0.9, 1.3));        // 参道の紅葉
  for (let i = 0; i < 40; i++) { const x = sr(-40, -8), z = sr(46, 84); if (Math.abs(x) > 7.5) add("momiji", x, z, sr(0.9, 1.4)); }
  for (let i = 0; i < 30; i++) { const x = sr(30, 44), z = sr(44, 84); add("momiji", x, z, sr(0.9, 1.4)); }
  for (let i = 0; i < 14; i++) add("momiji", sr(-23, -13), sr(28, 39), sr(0.9, 1.2));
  for (let i = 0; i < 18; i++) add("sakura", sr(-41, -26), sr(3, 25), sr(0.9, 1.3));                                                   // 縁結びの桜
  for (let i = 0; i < 16; i++) { const x = sr(26, 41), z = sr(3, 25); if (Math.hypot(x - 28, z - 21) > 2.5) add("ume", x, z, sr(0.7, 1)); } // 合格の梅
  for (let i = 0; i < (mobile ? 420 : 760); i++) {                                                                                     // 山の杉林
    const x = sr(-130, 130), z = sr(-140, 120);
    if (z > -8 && Math.abs(x) < 46 && z < 86) continue;
    const y = height(x, z); if (y < 0.5 && z > -8) continue;
    let near = false; for (let k = 0; k < trailPts.length; k += 6) if ((trailPts[k].x - x) ** 2 + (trailPts[k].z - z) ** 2 < 16) { near = true; break; }
    if (near || Math.hypot(x + 2, z + 72) < 12 || Math.hypot(x - 40, z + 22) < 8) continue;
    add("sugi", x, z, sr(0.8, 1.6));
  }
  for (let i = 0; i < 40; i++) { const t = sr(0.05, 0.95), p = TRAIL.getPointAt(t); const a = sr(0, 6.28), r = sr(3.2, 6); add("momiji", p.x + Math.cos(a) * r, p.z + Math.sin(a) * r, sr(0.8, 1.1)); }
  const trunkG = new THREE.CylinderGeometry(0.12, 0.22, 1, 7);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 1 });
  const leafG = new THREE.IcosahedronGeometry(1, 0);
  const sugiG = new THREE.ConeGeometry(1.4, 5, 7);
  const leafM = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const sugiM = new THREE.MeshStandardMaterial({ color: env.season === "winter" ? 0x3a4e42 : 0x24402c, roughness: 0.95, flatShading: true });
  const colorOf = (k) => { const arr = k === "momiji" ? pal.momiji : k === "sakura" ? pal.sakura : pal.ume; return new THREE.Color(arr[Math.floor(srnd() * arr.length)]); };
  let trunkCount = 0, leafCount = 0;
  for (const k of ["momiji", "sakura", "ume"]) { trunkCount += trees[k].length; leafCount += trees[k].length * 5; }
  const trunkI = new THREE.InstancedMesh(trunkG, trunkM, trunkCount + trees.sugi.length), leafI = new THREE.InstancedMesh(leafG, leafM, leafCount), sugiI = new THREE.InstancedMesh(sugiG, sugiM, trees.sugi.length);
  let ti = 0, li = 0;
  for (const k of ["momiji", "sakura", "ume"]) for (const [x, z, s] of trees[k]) {
    const y = height(x, z), h = (k === "ume" ? 2 : 2.9) * s;
    o3.position.set(x, y + h / 2, z); o3.rotation.set(0, 0, 0); o3.scale.set(s, h, s); o3.updateMatrix(); trunkI.setMatrixAt(ti++, o3.matrix);
    for (let j = 0; j < 5; j++) { const r = (k === "ume" ? 0.75 : 1.05) * s * sr(0.8, 1.25);
      o3.position.set(x + sr(-0.9, 0.9) * s, y + h + sr(-0.2, 0.9) * s, z + sr(-0.9, 0.9) * s); o3.rotation.set(sr(0, 3), sr(0, 3), 0); o3.scale.setScalar(r); o3.updateMatrix();
      leafI.setMatrixAt(li, o3.matrix); leafI.setColorAt(li, colorOf(k)); li++; }
  }
  trees.sugi.forEach(([x, z, s], i) => { const y = height(x, z);
    o3.position.set(x, y + 0.8 * s, z); o3.rotation.set(0, 0, 0); o3.scale.set(s, 1.6 * s, s); o3.updateMatrix(); trunkI.setMatrixAt(ti++, o3.matrix);
    o3.position.set(x, y + 3.6 * s, z); o3.rotation.set(0, sr(0, 3), 0); o3.scale.setScalar(s); o3.updateMatrix(); sugiI.setMatrixAt(i, o3.matrix); });
  // カメラとプレイヤーの間の木を網目状に透かす（シェーダーで点描ディザ）
  const fadeU = { uCam: { value: new THREE.Vector3(0, -999, 0) }, uTgt: { value: new THREE.Vector3(0, -999, 0) } };
  for (const m of [trunkM, leafM, sugiM]) m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, fadeU);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
varying vec3 vFadeW;`)
      .replace("#include <project_vertex>", `#include <project_vertex>
vec4 fw = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
fw = instanceMatrix * fw;
#endif
vFadeW = (modelMatrix * fw).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vFadeW; uniform vec3 uCam, uTgt;`)
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      { vec3 ab = uTgt - uCam; float t = clamp(dot(vFadeW - uCam, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
        float d = length(vFadeW - (uCam + ab * t)), r = mix(0.9, 2.4, t);
        float a = mix(0.18, 1.0, smoothstep(r * 0.55, r, d)) + step(0.97, t);
        vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
        float b = (mod(q.x, 2.0) * 2.0 + mod(q.y, 2.0) * 3.0 - 4.0 * mod(q.x, 2.0) * mod(q.y, 2.0)) / 4.0 + (step(2.0, q.x) * 2.0 + step(2.0, q.y) * 3.0 - 4.0 * step(2.0, q.x) * step(2.0, q.y)) / 16.0;
        if (a < 1.0 && a <= b + 0.03) discard; }`);
  };
  W.treeFade = (cam, tgt) => { fadeU.uCam.value.copy(cam); fadeU.uTgt.value.copy(tgt); };
  for (const im of [trunkI, leafI, sugiI]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
  leafI.instanceColor.needsUpdate = true;
  W.leafMat = leafM;

  // ---------------------------------------------------------------- 霧（山の中腹に薄い板）
  const mistTex = (() => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const x = cv.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();
  const mists = [];
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.12, depthWrite: false, color: 0xdfe3f0 }));
    s.scale.set(sr(30, 60), sr(8, 14), 1); s.position.set(sr(-110, 110), sr(8, 22), sr(-130, -30)); scene.add(s); mists.push(s); }
  W.update.push((t) => mists.forEach((m, i) => (m.position.x += Math.sin(t * 0.03 + i) * 0.01)));

  // ---------------------------------------------------------------- 冬：屋根の雪の代わりに雪の粒（季節）
  if (env.season === "winter") {
    const nS = mobile ? 600 : 1200, sg = new THREE.BufferGeometry(), sp = new Float32Array(nS * 3);
    for (let i = 0; i < nS; i++) sp.set([rnd(-40, 40), rnd(0, 30), rnd(-40, 60)], i * 3);
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9 })); scene.add(snow);
    W.update.push((t, dt, center) => { for (let i = 0; i < nS; i++) { sp[i * 3 + 1] -= dt * 1.2; sp[i * 3] += Math.sin(t + i) * dt * 0.3; if (sp[i * 3 + 1] < 0) sp[i * 3 + 1] = 30; }
      snow.position.set(center.x, 0, center.z - 10); sg.attributes.position.needsUpdate = true; });
  }
  // 季節の花びら・落ち葉（舞う）
  const petalCol = env.season === "spring" ? 0xf7c6d9 : env.season === "autumn" ? 0xe0542a : env.season === "summer" ? 0x9ad07a : 0xffffff;
  const pG = new THREE.PlaneGeometry(0.14, 0.14), petals = new THREE.InstancedMesh(pG, new THREE.MeshBasicMaterial({ color: petalCol, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 200);
  const pd = []; for (let i = 0; i < 200; i++) pd.push({ x: rnd(-18, 18), y: rnd(0, 9), z: rnd(-15, 20), s: rnd(0.4, 1), r: rnd(0, 6) });
  scene.add(petals);
  W.update.push((t, dt, center) => { for (let i = 0; i < 200; i++) { const p = pd[i]; p.y -= dt * 0.5 * p.s; p.x += Math.sin(t * 0.7 + i) * dt * 0.3; p.r += dt * 2;
      if (p.y < 0) { p.y = rnd(6, 10); p.x = rnd(-18, 18); p.z = rnd(-15, 20); }
      o3.position.set(center.x + p.x, height(center.x + p.x, center.z + p.z) + p.y, center.z + p.z); o3.rotation.set(p.r, p.r * 0.7, 0); o3.scale.setScalar(1); o3.updateMatrix(); petals.setMatrixAt(i, o3.matrix); }
    petals.instanceMatrix.needsUpdate = true; });

  return W;
}
