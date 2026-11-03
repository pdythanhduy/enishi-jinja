// 空・光・霧・季節。日本時間の時刻と月で境内の表情が変わる。
import * as THREE from "three";

export const jstNow = () => new Date(Date.now() + 9 * 3600e3);
export function season(d = jstNow()) {
  const q = typeof location !== "undefined" && new URLSearchParams(location.search).get("season"); if (["spring", "summer", "autumn", "winter"].includes(q)) return q;
  const m = d.getUTCMonth() + 1;
  return m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter";
}
// 葉の色（季節ごと）
export const FOLIAGE = {
  spring: { momiji: [0x8fb25a, 0xa6c46a, 0x7aa04c], sakura: [0xf6b8cf, 0xf9cfdd, 0xf2a3c0], ume: [0xffffff, 0xf7c6d6], ground: 0x5f7a42 },
  summer: { momiji: [0x4f8a3a, 0x5c9a42, 0x3f7a32], sakura: [0x4d8a3c, 0x5a9a44], ume: [0x4d8a3c, 0x5a9a44], ground: 0x557a38 },
  autumn: { momiji: [0xc8381f, 0xe0542a, 0xe8892f, 0xb02a24, 0xd9a13a], sakura: [0xc97a3a, 0xb8642c], ume: [0x9a7a3a, 0x8a6a30], ground: 0x5f6e44 },
  winter: { momiji: [0x6b5a4a, 0x7a6a5a], sakura: [0x6b5a4a], ume: [0xffffff, 0xf7c6d6], ground: 0xdfe6ee },
};

// 時刻ごとの空と光
const KEYS = [  // hour, sky top, mid, horizon, sun color, sun int, hemi int, fog, exposure, lanternOn
  [0, 0x050818, 0x141a3a, 0x2a2f55, 0x9fb0ff, 0.55, 0.5, 0x10142a, 1.15, 1],
  [5, 0x1a2350, 0x5a4a7a, 0xe8a07a, 0xffc8a0, 0.6, 0.6, 0x3a3550, 1.1, 1],
  [7, 0x5d8fd0, 0x9ec0e8, 0xf3d9b0, 0xfff0d8, 1.6, 1.0, 0xb8c8dc, 1.0, 0],
  [12, 0x3f7fd8, 0x86b6ef, 0xd8e8f8, 0xffffff, 2.0, 1.15, 0xc8d8ea, 0.95, 0],
  [16, 0x4a7fcf, 0xa2b8e0, 0xf0c890, 0xffd8a8, 1.6, 1.0, 0xc8b8a8, 1.0, 0],
  [17.5, 0x2a3a7a, 0x8a5a7a, 0xf08a4a, 0xffa860, 1.3, 0.85, 0x6a4a50, 1.1, 1],
  [19, 0x0b1030, 0x3c2b55, 0xd8714a, 0xc9d4ff, 0.9, 0.7, 0x262a44, 1.15, 1],
  [21, 0x050818, 0x161c40, 0x3a3060, 0x9fb0ff, 0.6, 0.55, 0x161a32, 1.15, 1],
  [24, 0x050818, 0x141a3a, 0x2a2f55, 0x9fb0ff, 0.55, 0.5, 0x10142a, 1.15, 1],
];
function sample(h) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1], k = (h - a[0]) / (b[0] - a[0] || 1);
  const c = (j) => new THREE.Color(a[j]).lerp(new THREE.Color(b[j]), k);
  const n = (j) => a[j] + (b[j] - a[j]) * k;
  return { top: c(1), mid: c(2), hor: c(3), sun: c(4), sunI: n(5), hemiI: n(6), fog: c(7), exp: n(8), lamp: n(9) };
}

export function createEnv(scene, renderer, { mobile }) {
  // 空（グラデーション＋星）
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, stars: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.); }",
    fragmentShader: `uniform vec3 top,mid,hor; uniform float stars; varying vec3 vP;
      float hs(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ vec3 d=normalize(vP - cameraPosition*0.0); float h=d.y;
        vec3 c = h>0.0 ? mix(mix(hor,mid,smoothstep(0.0,0.2,h)),top,smoothstep(0.15,0.75,h)) : mix(hor,hor*0.5,smoothstep(0.0,0.2,-h));
        vec3 q=floor(d*420.0); float st=step(0.9978,hs(q))*smoothstep(0.06,0.4,h)*stars; c+=vec3(1.0,0.95,0.85)*st*(0.5+0.5*hs(q+1.0));
        gl_FragColor=vec4(c,1.); }` }));
  sky.renderOrder = -1; scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xb3c0ff, 0x4a3a3a, 1.0); scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffc48a, 0.22); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
  sun.shadow.bias = -0.0004; scene.add(sun); scene.add(sun.target);
  scene.fog = new THREE.FogExp2(0x262a44, 0.0042);

  // 月と太陽（光の球）
  const disc = (col, r) => new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true }));
  const moon = disc(0xfff6e3, 7), sunDisc = disc(0xfff2cf, 9); scene.add(moon, sunDisc);

  const lampMats = new Set(), lampLights = new Set();   // 灯籠・提灯：夕方から点く
  const api = {
    hour: 0, lamp: 1, season: season(),
    registerLamp(mat, light) { if (mat) lampMats.add(mat); if (light) lampLights.add(light); },
    set(hour) {
      api.hour = hour; const s = sample(hour);
      skyU.top.value.copy(s.top); skyU.mid.value.copy(s.mid); skyU.hor.value.copy(s.hor); skyU.stars.value = s.lamp;
      scene.fog.color.copy(s.fog); scene.fog.density = 0.0018 + 0.0024 * s.lamp; renderer.toneMappingExposure = s.exp;
      hemi.intensity = s.hemiI; sun.color.copy(s.sun); sun.intensity = s.sunI; amb.intensity = 0.15 + s.lamp * 0.12;
      // 太陽/月の位置（東→西）
      const day = hour >= 6 && hour < 18.5, t = day ? (hour - 6) / 12.5 : ((hour + 24 - 18.5) % 24) / 11.5;
      const ang = Math.PI * t, R = 300;
      const pos = new THREE.Vector3(Math.cos(ang) * R * -1, Math.sin(ang) * R * 0.8 + 30, -120);
      (day ? sunDisc : moon).position.copy(pos); (day ? moon : sunDisc).position.set(0, -500, 0);
      moon.lookAt(0, 0, 0); sunDisc.lookAt(0, 0, 0);
      sun.position.set(pos.x * 0.25, Math.max(25, pos.y * 0.3), 40); sun.target.position.set(0, 0, -10);
      api.lamp = s.lamp;
      for (const m of lampMats) m.emissiveIntensity = m.userData.off ? 0.05 : (m.userData.base ?? 3) * (0.15 + 0.85 * s.lamp);
      for (const l of lampLights) l.intensity = (l.userData.base ?? 6) * s.lamp;
    },
    follow(p) { sun.position.add(new THREE.Vector3(p.x, 0, p.z).sub(sun.target.position).setY(0)); sun.target.position.set(p.x, 0, p.z); },
  };
  return api;
}
