// 境内全体を組み立てる（地形・植物・水・建物）。
import * as THREE from "three";
import { MAT, box, cyl, torii, toro, chochin, honden, smallHall, romon, kairo, kakezukuri, meotoSugi, pagoda, shoro, taikobashi, tamagaki, temizuya, juyosho, shinboku, okunoin, lampMat, roof } from "./arch.js?v=11032313";
import { PLACES, TRAIL, trailHeight, height, POND, BRIDGE, OKPOND, SMALL, HONDEN, hw, OKU_Y, STAGE, STREAM, noDecor } from "./map.js?v=11032313";
import { makePond, pondPlants, tickWater, makeStream } from "./water.js?v=11032313";
import { koiSchool } from "./koi.js?v=11032313";
import { FOLIAGE } from "./env.js?v=11032313";

const rnd = (a, b) => a + Math.random() * (b - a);
let seedN = 7; const srnd = () => ((seedN = (seedN * 16807) % 2147483647) / 2147483647);   // 毎回同じ配置になる乱数
const sr = (a, b) => a + srnd() * (b - a);

export function buildWorld(scene, env, opts = {}) {
  const { mobile } = opts;
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
  // 鯉の池：すり鉢の底・澄んだ水面・蓮と菖蒲・泳ぐ鯉
  const pond = makePond(scene, { cx: POND.cx, cz: POND.cz, rx: POND.rx, rz: POND.rz, y: -0.08, depth: 1.0 });
  // 岸の石組み：大小の自然石を、少し沈めて不揃いに
  { const rockG = [new THREE.DodecahedronGeometry(1, 0), new THREE.IcosahedronGeometry(1, 0)], rockM = [0x7a756c, 0x8a857b, 0x6a665e].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
    for (let i = 0; i < 58; i++) { const a = (i / 58) * Math.PI * 2 + sr(-0.03, 0.03), big = i % 7 === 0, k = big ? sr(0.55, 0.8) : sr(0.28, 0.5);
      const r = new THREE.Mesh(rockG[i % 2], rockM[i % 3]); r.scale.set(k * sr(1.0, 1.6), k * sr(0.55, 0.9), k * sr(0.9, 1.3));
      r.position.set(POND.cx + Math.cos(a) * (POND.rx + sr(0.0, 0.35)), big ? 0.12 : -0.02, POND.cz + Math.sin(a) * (POND.rz + sr(0.0, 0.3))); r.rotation.set(sr(0, 3), sr(0, 6), sr(0, 3));
      r.castShadow = r.receiveShadow = true; r.userData.static = true; scene.add(r); } }
  taikobashi(scene, BRIDGE);
  pondPlants(scene, { cx: POND.cx, cz: POND.cz, rx: POND.rx, rz: POND.rz, y: -0.08 }, { pads: mobile ? 12 : 22, lotus: 6, iris: 12 });
  const school = koiSchool(scene, { cx: POND.cx, cz: POND.cz, rx: POND.rx, rz: POND.rz, y: -0.08 }, mobile ? 9 : 14);
  W.koi = school.fish; W.koiFeed = school.feed; W.pondWater = pond.surface;
  W.update.push((t, dt) => { school.update(t, Math.min(dt, 0.05)); tickWater(t); });
  for (const [x, z] of [[9, 47], [27, 47], [9, 61], [27, 61]]) W.lamps.push(toro(scene, x, z, 0, env, 0.85));

  // ---------------------------------------------------------------- ④ 楼門 と 玉垣
  romon(scene, env, { z: 41, s: 1.4 });
  // 回廊：楼門の左右から境内を囲む
  kairo(scene, env, { cx: -17.35, cz: 41, len: 16.9, ry: Math.PI }); kairo(scene, env, { cx: 17.35, cz: 41, len: 16.9, ry: Math.PI });
  kairo(scene, env, { cx: -24.5, cz: 34.15, len: 16.3, ry: Math.PI / 2 }); kairo(scene, env, { cx: 24.5, cz: 34.15, len: 16.3, ry: -Math.PI / 2 });
  tamagaki(scene, [[[-24.5, 2], [-24.5, -6]], [[24.5, 2], [24.5, -6]],
    [[-42, 26], [-24.5, 26]], [[24.5, 26], [42, 26]], [[-42, 26], [-42, 2]], [[42, 26], [42, 2]], [[-42, 2], [-24.5, 2]], [[24.5, 2], [34, 2]]]);
  torii(scene, { x: 38.5, z: 2.2, s: 0.75, gaku: null });
  for (const s of [-1, 1]) { torii(scene, { x: s * 24.5, z: 17, s: 0.9, ry: Math.PI / 2, gaku: null }); }

  // ---------------------------------------------------------------- ⑤ 手水舎 ⑥ 授与所 ⑦ 御神木
  // 手水舎は js/temizu.js（水の流れと所作）
  juyosho(scene, env, { x: PLACES.juyosho.pos[0] + 1.5, z: PLACES.juyosho.pos[1] });
  const kusu = new THREE.MeshStandardMaterial({ color: env.season === "winter" ? 0x3d5a3a : 0x3f6a36, roughness: 0.9, flatShading: true });
  shinboku(scene, { x: PLACES.shinboku.pos[0], z: PLACES.shinboku.pos[1] }, kusu);
  // 絵馬掛け（御神木の前）
  const emaRack = new THREE.Group(); emaRack.position.set(21.2, 0, 11.6); emaRack.rotation.y = -Math.PI / 2.4; scene.add(emaRack);
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
  const hd = honden(scene, env, { z: HONDEN.Z, s: HONDEN.S });
  const saisen = new THREE.Group(); saisen.position.set(0, 0, 11.0); scene.add(saisen);
  box(saisen, 3.6, 1.0, 1.3, MAT.wood, 0, 0.5, 0);
  for (let i = -8; i <= 8; i++) box(saisen, 0.06, 0.05, 1.2, MAT.kuro, i * 0.2, 1.02, 0, false);
  box(saisen, 3.0, 0.3, 0.05, MAT.gold, 0, 0.55, 0.66, false);
  W.saisen = saisen;
  const suzu = new THREE.Group(); suzu.position.set(0, 7.25, 10.05); scene.add(suzu);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), MAT.gold); bell.position.y = -0.4; bell.castShadow = true; suzu.add(bell);
  const suzuo = new THREE.Group(); suzu.add(suzuo);
  for (const [cc, dx] of [[0xd9412b, -0.08], [0xf4f1ea, 0], [0x3b6db0, 0.08]]) { const r = cyl(suzuo, 0.05, 0.05, 5.2, new THREE.MeshStandardMaterial({ color: cc }), dx, -3.1, 0, 8, false); }
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
  const hdC = []; const zab = new THREE.MeshStandardMaterial({ color: 0xc9b27a, roughness: 0.95 });   // 円座（い草の丸い座）
  for (let r = 0; r < 2; r++) for (const cx of [-4.6, -3.0, 3.0, 4.6]) { const [x, z] = hw(cx, 1.5 + r * 2.2); const c = cyl(scene, 0.42, 0.44, 0.09, zab, x, hd.floorY + 0.05, z, 20); c.userData.static = true; hdC.push([x, z]); }
  W.cushions.tosen = hdC; W.altars.tosen = hw(0, -2.6);
  W.hondenMirror = hd.mirror; W.hondenDoors = hd.setDoors;
  // ライトアップ：夜、本殿の正面を足もとから照らす
  { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 128; const c = cv.getContext("2d");
    const gv = c.createLinearGradient(0, 128, 0, 0); gv.addColorStop(0, "rgba(255,196,120,1)"); gv.addColorStop(0.45, "rgba(255,170,90,.35)"); gv.addColorStop(1, "rgba(255,150,80,0)"); c.fillStyle = gv; c.fillRect(0, 0, 64, 128);
    const gh = c.createLinearGradient(0, 0, 64, 0); gh.addColorStop(0, "rgba(0,0,0,1)"); gh.addColorStop(0.5, "rgba(0,0,0,0)"); gh.addColorStop(1, "rgba(0,0,0,1)"); c.globalCompositeOperation = "destination-out"; c.fillStyle = gh; c.fillRect(0, 0, 64, 128);
    const glowM = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false });
    for (const cx of [-7.0, -4.0, 0, 4.0, 7.0]) { const [x, z] = hw(cx, 7.35); const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2 * HONDEN.S, 6.4 * HONDEN.S), glowM); p.position.set(x, 3.3 * HONDEN.S, z); scene.add(p); }
    W.update.push(() => { glowM.opacity = 0.55 * env.lamp; }); }
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
  // ---------------------------------------------------------------- 社ごとの顔：縁結び「赤い糸の結び棚」・合格「筆塚」
  const signTex = (text, bg, fg, w = 256, h = 64, px = 34) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `bold ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; x.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  {
    const tana = new THREE.Group(); tana.position.set(-34.6, 0, 24.5); tana.rotation.y = Math.PI; scene.add(tana);   // 表は参道（南）側
    for (const sx of [-1.65, 1.65]) cyl(tana, 0.07, 0.08, 2.3, MAT.woodD, sx, 1.15, 0, 8);
    box(tana, 3.7, 0.12, 0.14, MAT.woodD, 0, 2.25, 0);
    roof(tana, { w: 4.2, d: 0.9, h: 0.32, lift: 0.1, y: 2.32, mat: MAT.copper, gable: false, ridgeGold: false });
    const cordM = new THREE.MeshStandardMaterial({ color: 0x8a1a22, roughness: 0.7 });
    for (const y of [0.85, 1.3, 1.75]) { const r = cyl(tana, 0.018, 0.018, 3.3, cordM, 0, y, 0, 5, false); r.rotation.z = Math.PI / 2; }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.36), new THREE.MeshStandardMaterial({ map: signTex("赤い糸 結び処", "#2a1d14", "#f3c2c8") })); sg.position.set(0, 2.06, 0.08); tana.add(sg);
    // 結ばれた赤い糸：結び目と垂れた糸。結ぶたびに一本ずつ増える（最大 MAX）
    const MAX = 420, knotG = new THREE.TorusGeometry(0.035, 0.012, 4, 10), tailG = new THREE.CylinderGeometry(0.006, 0.006, 0.22, 3);
    const itoM = new THREE.MeshStandardMaterial({ color: 0xd61f3a, emissive: 0x6a0010, emissiveIntensity: 0.5, roughness: 0.6 }), pinkM = new THREE.MeshStandardMaterial({ color: 0xf07a96, emissive: 0x5a1020, emissiveIntensity: 0.4 });
    const knots = new THREE.InstancedMesh(knotG, itoM, MAX), tails = new THREE.InstancedMesh(tailG, itoM, MAX * 2), pinks = new THREE.InstancedMesh(knotG, pinkM, 40);
    const o = new THREE.Object3D(); let s0 = 77; const rnd = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < MAX; i++) {
      const x = -1.55 + rnd() * 3.1, y = [0.85, 1.3, 1.75][i % 3], z = (rnd() - 0.5) * 0.03;
      o.position.set(x, y, z); o.rotation.set(rnd() * 3, Math.PI / 2 + (rnd() - 0.5), rnd()); o.scale.setScalar(0.8 + rnd() * 0.5); o.updateMatrix(); knots.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 2; k++) { o.position.set(x + (k ? 0.02 : -0.02), y - 0.12, z); o.rotation.set((rnd() - 0.5) * 0.4, 0, (k ? 1 : -1) * (0.15 + rnd() * 0.2)); o.scale.setScalar(1); o.updateMatrix(); tails.setMatrixAt(i * 2 + k, o.matrix); }
    }
    for (let i = 0; i < 40; i++) { o.position.set(-1.55 + rnd() * 3.1, [0.85, 1.3, 1.75][i % 3], 0.01); o.rotation.set(0, Math.PI / 2, rnd()); o.scale.setScalar(1); o.updateMatrix(); pinks.setMatrixAt(i, o.matrix); }
    tana.add(knots, tails, pinks);
    const setN = (n) => { knots.count = Math.min(MAX, n); tails.count = knots.count * 2; };
    W.itoTana = { group: tana, setN, MAX };
    // 合格：筆塚（使い終えた筆に感謝して納める石碑）と筆納箱
    const fz = new THREE.Group(); fz.position.set(34.6, 0, 24.5); fz.rotation.y = Math.PI; scene.add(fz); fz.userData.static = true;
    box(fz, 1.7, 0.28, 1.1, MAT.stoneD, 0, 0.14, 0); box(fz, 1.3, 0.22, 0.8, MAT.stone, 0, 0.39, 0);
    const stoneT = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const x = c.getContext("2d");
      x.fillStyle = "#6f6a62"; x.fillRect(0, 0, 128, 256); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.08})`; x.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
      x.textAlign = "center"; x.textBaseline = "middle"; x.font = `bold 70px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
      for (const [ch, y] of [["筆", 80], ["塚", 170]]) { x.fillStyle = "rgba(20,18,16,.75)"; x.fillText(ch, 64, y); x.fillStyle = "rgba(255,255,255,.12)"; x.fillText(ch, 66, y + 2); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const stele = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.3), [MAT.stone, MAT.stone, MAT.stone, MAT.stone, new THREE.MeshStandardMaterial({ map: stoneT, roughness: 0.9 }), MAT.stone]);
    stele.position.set(0, 1.35, -0.1); stele.castShadow = true; fz.add(stele);
    const capS = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 16, 1, false, 0, Math.PI), MAT.stone); capS.rotation.z = Math.PI / 2; capS.rotation.y = Math.PI / 2; capS.position.set(0, 2.2, -0.1); fz.add(capS);
    // 筆納箱：木の箱に、納められた筆と鉛筆
    const bx = new THREE.Group(); bx.position.set(0.95, 0, 0.55); fz.add(bx);
    box(bx, 0.62, 0.5, 0.42, MAT.woodL, 0, 0.25, 0); box(bx, 0.66, 0.04, 0.46, MAT.woodD, 0, 0.51, 0);
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), new THREE.MeshStandardMaterial({ map: signTex("筆納箱", "#e9dcc0", "#2a1d14", 192, 56, 34) })); bm.position.set(0, 0.36, 0.215); bx.add(bm);
    const bamboo = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.6 }), tip = new THREE.MeshStandardMaterial({ color: 0x151210 }), pen = new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.5 });
    for (let i = 0; i < 9; i++) { const g2 = new THREE.Group(); g2.position.set(-0.22 + (i % 5) * 0.11, 0.62, -0.1 + Math.floor(i / 5) * 0.12); g2.rotation.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.5); bx.add(g2);
      const isPen = i % 3 === 2; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, isPen ? 6 : 6), isPen ? pen : bamboo); g2.add(st);
      const tp = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 6), isPen ? MAT.woodL : tip); tp.position.y = 0.19; g2.add(tp); }
    const lampG = toro(scene, 36.2, 24.8, 0, env, 0.6); W.lamps.push(lampG);
    W.fudezuka = fz;
  }
  for (const s of [-1, 1]) for (const [x, z] of [[40.6, 21], [40.6, 6.5]]) W.lamps.push(toro(scene, s * x, z, 0, env, 0.9));

  // ---------------------------------------------------------------- ⑪ 千本鳥居（山道）— InstancedMesh
  const trailPts = TRAIL.getSpacedPoints(160);
  const pillarG = new THREE.CylinderGeometry(0.13, 0.16, 3.3, 10), beamG = new THREE.BoxGeometry(3.2, 0.18, 0.22), topG = new THREE.BoxGeometry(3.7, 0.22, 0.34), footG = new THREE.CylinderGeometry(0.19, 0.19, 0.32, 10);
  const n = trailPts.length - 2;
  const pil = new THREE.InstancedMesh(pillarG, MAT.shu, n * 2), beam = new THREE.InstancedMesh(beamG, MAT.shu, n), top = new THREE.InstancedMesh(topG, MAT.kuro, n), foot = new THREE.InstancedMesh(footG, MAT.kuro, n * 2);
  const up = new THREE.Vector3(0, 1, 0), o3 = new THREE.Object3D();
  for (let i = 1; i <= n; i++) {
    const p = trailPts[i], nx = trailPts[i + 1], t = i / trailPts.length, y = trailHeight(t);
    o3.scale.setScalar(Math.hypot(p.x + 2, p.z + 74) < 12.5 ? 0 : 1);                 // 山頂の境内には鳥居を並べない
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
  for (let i = 8; i < trailPts.length - 4; i += 14) { const p = trailPts[i], nx = trailPts[i + 1], t = i / trailPts.length; const d = new THREE.Vector3(nx.z - p.z, 0, -(nx.x - p.x)).normalize(); if (Math.hypot(p.x + 2, p.z + 74) < 12.5) continue;
    W.lamps.push(toro(scene, p.x + d.x * 2.6, p.z + d.z * 2.6, trailHeight(t), env, 0.75)); }
  torii(scene, { x: 21.5, z: -6.2, s: 1.1, gaku: null });

  // ---------------------------------------------------------------- ⑫ 奥の院・滝・灯籠流しの池
  const okY = OKU_Y;
  okunoin(scene, env, { x: -2, y: okY, z: -78, s: 1.5 });
  kakezukuri(scene, env, { ...STAGE, ground: (x, z) => height(x, z) });
  meotoSugi(scene, { x: -9.5, z: -80, y: okY });
  // 奉納提灯：参道の両脇に、屋根つきの提灯掛け（二段）
  for (const sx of [-5.0, 1.0]) {
    const rk = new THREE.Group(); rk.position.set(sx, okY, -71); rk.rotation.y = Math.PI / 2; scene.add(rk); rk.userData.static = true;
    for (const zz of [-1.9, 1.9]) cyl(rk, 0.1, 0.1, 3.2, MAT.woodD, zz, 1.6, 0, 8);
    for (const yy of [1.55, 2.55]) box(rk, 4.0, 0.08, 0.1, MAT.woodD, 0, yy + 0.38, 0);
    roof(rk, { w: 4.6, d: 1.2, h: 0.45, lift: 0.12, y: 3.2, mat: MAT.copper, gable: false, ridgeGold: false });
    for (const yy of [1.55, 2.55]) for (let k = 0; k < 5; k++) chochin(rk, -1.6 + k * 0.8, yy, 0, env, 0.55, k % 2 ? 0xfff0d0 : 0xffe0c0);
  }
  // 磐座：しめ縄を巻いた大岩
  { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), new THREE.MeshStandardMaterial({ color: 0x77726a, roughness: 1, flatShading: true })); r.scale.set(1.2, 0.9, 1); r.position.set(-10.5, okY + 1.4, -73); r.castShadow = true; scene.add(r);
    const sm = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.11, 8, 36), MAT.rope); sm.rotation.x = Math.PI / 2; sm.scale.set(1.2, 1, 1); sm.position.set(-10.5, okY + 1.6, -73); scene.add(sm); }
  // 雲海：山腹をゆっくり流れる雲
  { const cv = document.createElement("canvas"); cv.width = cv.height = 256; const c = cv.getContext("2d");
    for (let i = 0; i < 70; i++) { const x = 40 + Math.random() * 176, y = 70 + Math.random() * 116, r = 30 + Math.random() * 50, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,255,255,.22)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }
    const t = new THREE.CanvasTexture(cv), cm = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.9, fog: false }), puffs = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = 30 + Math.random() * 26, p = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), cm); p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 6;
      p.position.set(-2 + Math.cos(a) * r, okY - 9 - Math.random() * 6, -74 + Math.sin(a) * r * 0.8); if (p.position.z > -40) p.position.z = -40 - Math.random() * 8; scene.add(p); puffs.push(p); }
    W.update.push((tt) => puffs.forEach((p, i) => { p.rotation.z += 0.0004 * (i % 2 ? 1 : -1); p.position.x += Math.sin(tt * 0.05 + i) * 0.005; })); }
  // 山頂の池（灯籠流し）：滝が東の端に落ちる
  makePond(scene, { cx: OKPOND.cx, cz: OKPOND.cz, rx: OKPOND.rx, rz: OKPOND.rz, y: okY - 0.08, depth: 0.85, minAlpha: 0.3 });
  pondPlants(scene, { cx: OKPOND.cx, cz: OKPOND.cz, rx: OKPOND.rx, rz: OKPOND.rz, y: okY - 0.08 }, { pads: 6, lotus: 2, iris: 5 });
  { const s2 = koiSchool(scene, { cx: OKPOND.cx, cz: OKPOND.cz, rx: OKPOND.rx, rz: OKPOND.rz, y: okY - 0.08 }, 4); W.update.push((t, dt) => s2.update(t, Math.min(dt, 0.05))); }
  W.okPond = { x: OKPOND.cx, z: OKPOND.cz, y: okY - 0.08, rx: OKPOND.rx, rz: OKPOND.rz };
  W.stream = makeStream(scene, STREAM, height).points;                                      // 渓流
  const fallTex = (() => { const cv = document.createElement("canvas"); cv.width = 32; cv.height = 128; const x = cv.getContext("2d");
    for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`; x.fillRect(Math.random() * 32, Math.random() * 128, 1 + Math.random() * 2, 8 + Math.random() * 20); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  // 滝：岩を積んだ崖から、二枚の水の幕が池の東の端へ落ちる。足もとに飛沫と霧
  const fx = OKPOND.cx + OKPOND.rx + 0.15, fz = OKPOND.cz, fallTop = okY + 8.5;
  const rockM = new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + Math.random() * 0.9, 0), rockM); const lvl = Math.floor(i / 4);
    r.position.set(fx + 1.2 + Math.random() * 1.6, okY + 0.6 + lvl * 2.1 + Math.random() * 0.6, fz + (i % 4 - 1.5) * 1.15 + (Math.random() - 0.5) * 0.6); r.rotation.set(Math.random() * 3, Math.random() * 3, 0); r.castShadow = r.receiveShadow = true; r.userData.static = true; scene.add(r); }
  const sheetM = (op, col) => new THREE.MeshBasicMaterial({ map: fallTex, alphaMap: fallTex, transparent: true, opacity: op, color: col, depthWrite: false, side: THREE.DoubleSide });
  const sheetT2 = fallTex.clone(); sheetT2.needsUpdate = true; sheetT2.repeat.set(1.5, 1.2);
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, fallTop - okY), sheetM(0.92, 0xe8f4ff)); s1.position.set(fx + 0.35, (fallTop + okY) / 2, fz); s1.rotation.y = -Math.PI / 2; scene.add(s1);
  const s2m = sheetM(0.55, 0xffffff); s2m.map = sheetT2; s2m.alphaMap = sheetT2;
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, fallTop - okY), s2m); s2.position.set(fx + 0.2, (fallTop + okY) / 2, fz + 0.05); s2.rotation.y = -Math.PI / 2; scene.add(s2);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 8), new THREE.MeshBasicMaterial({ color: 0xf2faff, transparent: true, opacity: 0.8 })); lip.rotation.x = Math.PI / 2; lip.position.set(fx + 0.4, fallTop, fz); scene.add(lip);
  // 飛沫（白い粒が跳ねる）と霧
  const SN = 90, spray = new THREE.BufferGeometry(), sp = new Float32Array(SN * 3), sv = new Float32Array(SN * 3);
  const respawn = (i) => { sp[i * 3] = fx + (Math.random() - 0.3) * 0.8; sp[i * 3 + 1] = okY; sp[i * 3 + 2] = fz + (Math.random() - 0.5) * 1.6; sv[i * 3] = -Math.random() * 1.2; sv[i * 3 + 1] = 1 + Math.random() * 1.8; sv[i * 3 + 2] = (Math.random() - 0.5) * 1.2; };
  for (let i = 0; i < SN; i++) { respawn(i); sp[i * 3 + 1] += Math.random() * 0.8; }
  spray.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(spray, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false })));
  const mcv = document.createElement("canvas"); mcv.width = mcv.height = 64; const mx = mcv.getContext("2d"), mg = mx.createRadialGradient(32, 32, 0, 32, 32, 32); mg.addColorStop(0, "rgba(255,255,255,.55)"); mg.addColorStop(1, "rgba(255,255,255,0)"); mx.fillStyle = mg; mx.fillRect(0, 0, 64, 64);
  const mist = [0, 1, 2].map((i) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mcv), transparent: true, depthWrite: false, opacity: 0.5 })); m.scale.setScalar(3.2 + i); m.position.set(fx - 0.3 - i * 0.4, okY + 0.6 + i * 0.4, fz); scene.add(m); return m; });
  W.update.push((t, dt) => {
    fallTex.offset.y -= dt * 1.6; sheetT2.offset.y -= dt * 2.3; dt = Math.min(dt, 0.05);
    for (let i = 0; i < SN; i++) { sv[i * 3 + 1] -= 9.8 * dt; sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt; if (sp[i * 3 + 1] < okY - 0.1) respawn(i); }
    spray.attributes.position.needsUpdate = true; mist.forEach((m, i) => { m.material.opacity = 0.35 + Math.sin(t * 0.8 + i) * 0.12; });
  });
  W.fallAt = [fx, fz];
  torii(scene, { x: 3.5, z: -70, y: okY, s: 0.8, gaku: null });
  for (const x of [-6, 2]) W.lamps.push(toro(scene, x, -69, okY, env, 0.8));

  // ---------------------------------------------------------------- ⑬ 五重塔
  const pg = pagoda(scene, env, { x: 40, z: -22, y: height(40, -22), ground: (lx, lz) => height(40 + lx, -22 + lz) - height(40, -22) }); W.update.push((t) => pg.userData.tick(t));
  // 鐘楼：塔の西に。正面の石畳と、由緒の立て札、灯籠
  const sh = shoro(scene, env, { x: 33.5, z: -19.5, y: height(33.5, -19.5), ry: 0 }); sh.log.userData.z0 = sh.log.position.z; W.shoro = sh;
  for (const [lx, lz] of [[37.6, -16.2], [42.4, -16.2]]) W.lamps.push(toro(scene, lx, lz, height(lx, lz), env, 0.85));
  { const c = document.createElement("canvas"); c.width = 256; c.height = 320; const q = c.getContext("2d"); q.fillStyle = "#efe6d0"; q.fillRect(0, 0, 256, 320); q.strokeStyle = "#5a3a22"; q.lineWidth = 8; q.strokeRect(4, 4, 248, 312);
    q.fillStyle = "#2a1d14"; q.font = 'bold 34px "Hiragino Mincho ProN","Yu Mincho",serif'; q.textAlign = "center"; q.fillText("五重塔", 128, 54); q.font = '20px "Hiragino Mincho ProN","Yu Mincho",serif';
    ["五つの屋根は、地・水・火・風・空。", "天へとのびる相輪に、", "えにしの願いを託します。", "", "鐘楼の鐘は、ひとつきごとに", "心の曇りをはらうといわれます。"].forEach((l, i) => q.fillText(l, 128, 100 + i * 34));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const bd = new THREE.Group(); bd.position.set(36.6, height(36.6, -14.8), -14.8); bd.rotation.y = 0.5; scene.add(bd);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshStandardMaterial({ map: t })); p.position.y = 1.3; bd.add(p);
    box(bd, 1.25, 0.08, 0.08, MAT.woodD, 0, 2.05, 0); for (const s of [-1, 1]) cyl(bd, 0.05, 0.05, 2.1, MAT.woodD, s * 0.6, 1.05, -0.03, 6); }

  // ---------------------------------------------------------------- 木々（InstancedMesh：幹＋葉）
  const trees = { momiji: [], sakura: [], ume: [], sugi: [] };
  const STREAM_PTS = new THREE.CatmullRomCurve3(STREAM.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "catmullrom", 0.5).getSpacedPoints(120);
  const SB = [Math.min(...STREAM_PTS.map((p) => p.x)) - 3, Math.max(...STREAM_PTS.map((p) => p.x)) + 3, Math.min(...STREAM_PTS.map((p) => p.z)) - 3, Math.max(...STREAM_PTS.map((p) => p.z)) + 3];
  const halls = [PLACES.enmusubi.pos, PLACES.gokaku.pos];   // 社の中と正面の広場に木が生えないように
  const add = (k, x, z, s = 1) => { if (Math.abs(x) > 21 && Math.abs(x) < 28 && z > 24.5 && z < 44) return;
    if (Math.hypot(x + 2, z + 74) < 14.5) return;
    if (noDecor(x, z)) return;                                                              // 作業室（書院・屋形船の桟橋）
    if (x > SB[0] && x < SB[1] && z > SB[2] && z < SB[3] && STREAM_PTS.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 6.3)) return;   // 渓流の上には木を植えない                                          // 山頂（奥の院）は木を植えない   // 回廊の上には木を植えない
    if (!halls.some(([hx, hz]) => Math.abs(x - hx) < SMALL.W / 2 + 2.5 && z > hz - SMALL.D / 2 - 2.5 && z < 26.5)) trees[k].push([x, z, s]); };
  for (let z = 74; z > 45; z -= 3.2) for (const sgn of [-1, 1]) add("momiji", sgn * sr(7.5, 11), z + sr(-1, 1), sr(0.9, 1.3));        // 参道の紅葉
  for (let i = 0; i < 40; i++) { const x = sr(-40, -8), z = sr(46, 84); if (Math.abs(x) > 7.5) add("momiji", x, z, sr(0.9, 1.4)); }
  for (let i = 0; i < 30; i++) { const x = sr(30, 44), z = sr(44, 84); add("momiji", x, z, sr(0.9, 1.4)); }
  for (let i = 0; i < 14; i++) add("momiji", sr(-23, -13), sr(28, 39), sr(0.9, 1.2));
  for (let i = 0; i < 18; i++) add("sakura", sr(-41, -26), sr(3, 25), sr(0.9, 1.3));                                                   // 縁結びの桜
  for (let i = 0; i < 16; i++) { const x = sr(26, 41), z = sr(3, 25); if (Math.hypot(x - 28, z - 21) > 2.5) add("ume", x, z, sr(0.7, 1)); } // 合格の梅
  for (let i = 0; i < (opts.lite ? 200 : mobile ? 420 : 760); i++) {                                                                                     // 山の杉林
    const x = sr(-130, 130), z = sr(-140, 120);
    if (z > -8 && Math.abs(x) < 46 && z < 86) continue;
    if (Math.abs(x) < 26 && z > -24) continue;                                             // 本殿の裏
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
