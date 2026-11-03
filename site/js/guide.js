// 今日の参拝（参拝の道）：作法の順に五つ。次の場所に金の目印が立ち、タップするとそこへ歩く。五つ揃うと満願。
import * as THREE from "three";

export const STEPS = [
  { id: "temizu", icon: "💧", label: "手水舎で心と手を清める", short: "手水", to: "temizu" },
  { id: "omairi", icon: "⛩", label: "本殿でお参りする", short: "お参り", to: [0, 12.2] },
  { id: "kuji", icon: "🎋", label: "授与所でおみくじを引く", short: "おみくじ", to: "juyosho" },
  { id: "light", icon: "🏮", label: "献灯するか、御祈祷を受ける", short: "献灯・御祈祷", to: [-18.2, 22] },
  { id: "en", icon: "🧧", label: "誰かにお辞儀・ことば・祈りを贈る", short: "縁", to: [16.4, 13.2] },
];
// 行いの種類 → どの段か
export const STEP_OF = { temizu: "temizu", omairi: "omairi", kuji: "kuji", kenno: "light", kito: "light", en: "en", say: "en", bless: "en", pray: "en" };

export function setupGuide(A) {
  const { scene, me, PLACES } = A;
  const pos = (s) => (typeof s.to === "string" ? PLACES[s.to].stand : s.to);
  // ---------------------------------------------------------------- 画面：上の小さな帯
  const el = document.createElement("button"); el.id = "guide"; el.type = "button";
  el.innerHTML = `<span class="gd-dots"></span><span class="gd-txt"></span><span class="gd-go" aria-hidden="true">›</span>`;
  document.body.appendChild(el);
  const done = () => { const q = Object.fromEntries(A.D.quests().map((x) => [x.id, x.done >= x.n])); return STEPS.map((s) => !!q[s.id]); };
  const next = () => { const d = done(); const i = d.indexOf(false); return i < 0 ? null : STEPS[i]; };
  function render(flashId) {
    const d = done(), n = d.filter(Boolean).length, nx = next();
    el.querySelector(".gd-dots").innerHTML = STEPS.map((s, i) => `<i class="${d[i] ? "on" : ""} ${nx === s ? "now" : ""}" title="${s.short}"></i>`).join("");
    el.querySelector(".gd-txt").innerHTML = nx ? `<small>今日の参拝 ${n}/5</small>${nx.icon} ${nx.label}` : `<small>今日の参拝 5/5</small>🌸 満願。また明日お待ちしています`;
    el.classList.toggle("all", !nx);
    if (flashId) { el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
    placeMarker();
  }
  el.onclick = () => {
    const nx = next(); if (!nx || A.isBusy()) { A.openList(); return; }
    A.toast(`${nx.short}へ向かいます`, 1600); A.walkRoute(pos(nx));
  };

  // ---------------------------------------------------------------- 目印：金の菱と光の柱
  const mk = new THREE.Group(); scene.add(mk);
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa53a, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), gold); gem.scale.y = 1.5; mk.add(gem);
  const colM = new THREE.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 6, 20, 1, true), colM); col.position.y = -0.4; mk.add(col);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 40), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; mk.add(ring);
  let target = null;
  function placeMarker() {
    const nx = next(); target = nx ? pos(nx) : null;
    if (target) { mk.position.set(target[0], 0, target[1]); }
  }
  A.W.update.push((t) => {
    const near = target && Math.hypot(me.position.x - target[0], me.position.z - target[1]) < 2.6;
    mk.visible = !!target && !near && !A.inCine();
    if (!mk.visible) return;
    const y = A.footY(target[0], target[1]);
    gem.position.y = y + 3.0 + Math.sin(t * 2) * 0.15; gem.rotation.y = t * 1.4;
    col.position.y = y + 2.6; ring.position.y = y + 0.05; ring.scale.setScalar(1 + (t % 1.6) * 0.35); ring.material.opacity = 0.55 * (1 - (t % 1.6) / 1.6);
  });

  // ---------------------------------------------------------------- 行いが済んだとき
  // 直前の状態を覚えておき、新しく済んだ段だけを知らせる（徳の記録は先に更新されるため）
  let prev = done(), prevDay = A.today();
  function onDeed(kind) {
    if (!STEP_OF[kind]) return;
    setTimeout(() => {
      if (prevDay !== A.today()) { prevDay = A.today(); prev = STEPS.map(() => false); }
      const now = done(), fresh = STEPS.filter((s, i) => now[i] && !prev[i]);
      const wasAll = prev.every(Boolean); prev = now;
      if (!fresh.length) return;
      render(fresh[0].id);
      if (now.every(Boolean) && !wasAll) mangan();
      else A.toast(`✅ ${fresh[0].short}を納めました。次は「${next().label}」`, 3000);
    }, 60);
  }
  function mangan() {
    A.chime(); setTimeout(A.chime, 380);
    for (let k = 0; k < 12; k++) setTimeout(() => A.releaseLight(me.position.x + (Math.random() - 0.5) * 3, me.position.y, me.position.z + (Math.random() - 0.5) * 3, true), k * 140);
    const days = A.store.get("enishi_mangan", []); if (!days.includes(A.today())) { days.unshift(A.today()); A.store.set("enishi_mangan", days.slice(0, 400)); }
    setTimeout(() => A.toast(`🌸 満願。今日の参拝をすべて納めました（徳 +5）。満願 ${days.length}日目です`, 5200), 900);
  }
  render();
  return { render, onDeed, steps: () => STEPS.map((s, i) => ({ ...s, done: done()[i] })), next };
}
