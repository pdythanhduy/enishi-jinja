// 境内の「寄り道スポット」：手水舎・おもかる石・狛狐・絵馬掛け・おみくじ結び所
import * as THREE from "three";

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const M = { wood: mat(0x6b4428), woodL: mat(0x9a6a3e), roof: mat(0x2f3d33, { roughness: 0.6 }), stone: mat(0x8e8a82, { roughness: 0.95 }),
  stoneD: mat(0x6f6b64, { roughness: 0.95 }), water: mat(0x6fa7c9, { roughness: 0.15, metalness: 0.2, emissive: 0x1d3c55, emissiveIntensity: 0.6 }),
  shu: mat(0xd9412b, { roughness: 0.55 }), ema: mat(0xe2c38a), paper: mat(0xf7f1e3), rope: mat(0xd8c99a, { roughness: 1 }), gold: mat(0xd9b45a, { metalness: 0.8, roughness: 0.3 }) };

function box(g, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
function cyl(g, r1, r2, h, m, x, y, z, seg = 12) { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }

// 立て札（浮かぶ名前）
function sign(text) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "rgba(20,22,26,.72)"; x.beginPath(); x.roundRect(4, 8, 248, 48, 24); x.fill();
  x.fillStyle = "#f4ead8"; x.font = "bold 28px serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 128, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(2.4, 0.6, 1); return s;
}

export function buildSpots(scene) {
  const spots = [];   // {name, obj, stand:[x,z], face}
  // ---------------- 手水舎（左手前）
  {
    const g = new THREE.Group(); g.position.set(-7.5, 0, -4.5); scene.add(g);
    for (const [x, z] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) cyl(g, 0.12, 0.12, 2.6, M.wood, x, 1.3, z, 8);
    const r1 = box(g, 3.4, 0.16, 1.4, M.roof, 0, 2.85, -0.55); r1.rotation.x = -0.45;
    const r2 = box(g, 3.4, 0.16, 1.4, M.roof, 0, 2.85, 0.55); r2.rotation.x = 0.45;
    box(g, 2.0, 0.6, 0.9, M.stone, 0, 0.45, 0);                         // 水盤
    box(g, 1.8, 0.05, 0.7, M.water, 0, 0.76, 0);
    for (let i = -2; i <= 2; i++) { const h = cyl(g, 0.05, 0.05, 0.5, M.woodL, i * 0.3, 0.95, 0.25, 8); h.rotation.x = 1.2; } // 柄杓
    const s = sign("手水舎"); s.position.set(0, 3.6, 0); g.add(s);
    spots.push({ name: "temizu", obj: g, stand: [-7.5, -3.2], face: Math.PI });
  }
  // ---------------- おもかる石（右手前）
  let omoStone;
  {
    const g = new THREE.Group(); g.position.set(7.5, 0, -4.5); scene.add(g);
    cyl(g, 0.4, 0.48, 0.25, M.stoneD, 0, 0.12, 0, 6); cyl(g, 0.14, 0.17, 0.9, M.stone, 0, 0.7, 0); box(g, 0.6, 0.3, 0.6, M.stone, 0, 1.3, 0);
    omoStone = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), M.stoneD); omoStone.position.set(0, 1.68, 0); omoStone.castShadow = true; g.add(omoStone);
    const s = sign("おもかる石"); s.position.set(0, 2.7, 0); g.add(s);
    spots.push({ name: "omokaru", obj: g, stand: [7.5, -3.3], face: Math.PI });
  }
  // ---------------- 絵馬掛け（右奥）
  const emaRack = new THREE.Group(); emaRack.position.set(8.2, 0, -10.5); emaRack.rotation.y = -0.6; scene.add(emaRack);
  {
    for (const x of [-1.6, 1.6]) cyl(emaRack, 0.08, 0.08, 2.2, M.wood, x, 1.1, 0, 8);
    for (const y of [1.2, 1.8]) box(emaRack, 3.4, 0.06, 0.06, M.wood, 0, y, 0);
    const r = box(emaRack, 3.8, 0.1, 0.7, M.roof, 0, 2.3, 0); r.rotation.x = 0.1;
    const s = sign("絵馬掛け"); s.position.set(0, 3.0, 0); emaRack.add(s);
    spots.push({ name: "emarack", obj: emaRack, stand: [6.9, -9.3], face: Math.PI - 0.6 });
  }
  // ---------------- おみくじ結び所（左奥）
  const musubi = new THREE.Group(); musubi.position.set(-8.2, 0, -10.5); musubi.rotation.y = 0.6; scene.add(musubi);
  {
    for (const x of [-1.6, 1.6]) cyl(musubi, 0.07, 0.07, 1.9, M.wood, x, 0.95, 0, 8);
    for (const y of [1.1, 1.6]) { const r = cyl(musubi, 0.02, 0.02, 3.2, M.rope, 0, y, 0, 6); r.rotation.z = Math.PI / 2; }
    const s = sign("おみくじ結び所"); s.position.set(0, 2.5, 0); musubi.add(s);
    spots.push({ name: "musubi", obj: musubi, stand: [-6.9, -9.3], face: Math.PI + 0.6 });
  }
  // 絵馬（みんなの奉納数に合わせて板を増やす）
  const emaGeo = new THREE.BoxGeometry(0.26, 0.2, 0.02);
  let emaN = 0;
  function setEma(n) {
    n = Math.min(n, 48);
    for (; emaN < n; emaN++) {
      const row = emaN % 2, col = Math.floor(emaN / 2);
      const e = new THREE.Mesh(emaGeo, M.ema); e.position.set(-1.45 + (col % 12) * 0.26, (row ? 1.08 : 1.68) - 0.12, 0.04 + Math.random() * 0.01);
      e.rotation.z = (Math.random() - 0.5) * 0.15; e.castShadow = true; emaRack.add(e);
    }
  }
  // 結ばれたおみくじ
  const kujiGeo = new THREE.BoxGeometry(0.05, 0.16, 0.03);
  let kujiN = 0;
  function addKuji(n = 1) {
    for (let i = 0; i < n && kujiN < 90; i++, kujiN++) {
      const k = new THREE.Mesh(kujiGeo, M.paper); k.position.set(-1.5 + Math.random() * 3.0, (Math.random() < 0.5 ? 1.1 : 1.6) - 0.06, 0.02);
      k.rotation.z = (Math.random() - 0.5) * 0.4; musubi.add(k);
    }
  }
  return { spots, omoStone, setEma, addKuji };
}
