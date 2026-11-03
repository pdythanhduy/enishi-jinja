// はじめての人への案内：四枚のカードで「できること」を。最後まで見なくても、いつでも閉じられる。
// 一度見たら出さない（enishi_welcome）。身支度（名前）を決めたあとに出す。
const CARDS = [
  { icon: "⛩", t: "えにし神社へようこそ", d: "作業と祈りのオンライン神社。ログインなしで、知らない誰かと同じ境内に。まずは下の「今日の参拝」の五つで、ゆっくりお参りを。" },
  { icon: "📖", t: "みんなで作業する部屋", d: "参道わきの書院と、池に浮かぶ屋形船。毎時 :00 と :30 に、みんなで25分集中・5分休憩。いる人は正座で並んでいます。", btn: "書院をのぞいてみる", go: "shoin" },
  { icon: "🧹", t: "お手伝いで、徳を積む", d: "落ち葉掃き、狛狐みがき、打ち水、草むしり。手を動かすと、気持ちがすっと落ち着きます。徳がたまると位が上がり、身支度も増えます。" },
  { icon: "🧘", t: "静のひととき", d: "右上の 🧘 から、作業用BGM（雨・せせらぎ・和風lo-fi）、写経、境内めぐり。開いたまま、作業や勉強のおともに。", btn: "🧘 を開く", go: "zen" },
];

export function setupWelcome(A) {
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-welcome"; m.hidden = true;
  m.innerHTML = `<div class="sheet wl"><button class="x" type="button" data-x>✕</button>
    <div class="wl-card"><span class="wl-ic"></span><h2 class="wl-t"></h2><p class="wl-d"></p><button type="button" class="btn wl-go" hidden></button></div>
    <div class="wl-dots">${CARDS.map((_, i) => `<i data-i="${i}"></i>`).join("")}</div>
    <div class="row"><button type="button" class="btn" data-skip>あとで</button><button type="button" class="btn primary" data-next>つぎへ</button></div></div>`;
  document.body.appendChild(m);
  let i = 0;
  const paint = () => {
    const c = CARDS[i];
    m.querySelector(".wl-ic").textContent = c.icon; m.querySelector(".wl-t").textContent = c.t; m.querySelector(".wl-d").textContent = c.d;
    const go = m.querySelector(".wl-go"); go.hidden = !c.btn; go.textContent = c.btn || "";
    m.querySelectorAll(".wl-dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    m.querySelector("[data-next]").textContent = i === CARDS.length - 1 ? "はじめる" : "つぎへ";
    const card = m.querySelector(".wl-card"); card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
  };
  const close = () => { m.hidden = true; A.store.set("enishi_welcome", 1); };
  m.onclick = (e) => {
    if (e.target.closest("[data-x],[data-skip]") || e.target === m) { close(); return; }
    if (e.target.closest("[data-next]")) { if (i < CARDS.length - 1) { i++; paint(); } else close(); return; }
    const d = e.target.closest(".wl-dots i"); if (d) { i = +d.dataset.i; paint(); return; }
    if (e.target.closest(".wl-go")) { const go = CARDS[i].go; close(); if (go === "zen") A.openZen(); else A.enterRoom(go); }
  };
  function maybeShow() { if (A.store.get("enishi_welcome", 0) || !A.ready()) return false; i = 0; paint(); m.hidden = false; return true; }
  // 身支度が終わるのを待って出す（最大2分）
  let tries = 0; const iv = setInterval(() => { if (maybeShow() || ++tries > 120 || A.store.get("enishi_welcome", 0)) clearInterval(iv); }, 1000);
  return { open: () => { i = 0; paint(); m.hidden = false; } };
}
