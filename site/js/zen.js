// 静のひととき：長く居られる境内。
// 集中・座禅（15〜60分のタイマー。好きな場所で正座し、はじめに4-7-8の呼吸。5分ごとに徳+5。頭の上に「集中中」）
// ほかに、境内の音（mixer.js）、写経・絵馬を描く（shakyo.js）、眺める（tour.js）への入り口。
const SPOTS = [
  { id: "honden", name: "本殿の前", sub: "大きな社を仰いで", at: [3.6, 14.6], face: Math.PI },
  { id: "pond", name: "池のほとり", sub: "鯉と太鼓橋を眺めて", at: null, face: null },
  { id: "stage", name: "奥の院の舞台", sub: "境内を一望する山の上", at: null, face: 0 },
];
const MINS = [15, 25, 45, 60];
const TITLE = document.title;
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function setupZen(A) {
  SPOTS[1].at = A.PLACES.pond.stand; SPOTS[1].face = A.PLACES.pond.face;
  SPOTS[2].at = [(A.STAGE.x0 + A.STAGE.x1) / 2, A.STAGE.z1 - 1.6];
  const stats = () => { const s = A.store.get("enishi_zen", { day: "", today: 0, total: 0, sessions: 0 }); if (s.day !== A.today()) { s.day = A.today(); s.today = 0; } return s; };
  let pick = { min: A.store.get("enishi_zen_min", 25), spot: A.store.get("enishi_zen_spot", "honden"), breath: A.store.get("enishi_zen_breath", true), quiet: A.store.get("enishi_zen_quiet", false), sound: "そのまま" };

  // ---------------------------------------------------------------- 入り口のメニュー
  const menu = document.createElement("section"); menu.className = "modal"; menu.id = "m-zen"; menu.hidden = true;
  menu.innerHTML = `<div class="sheet"><button class="x" type="button" data-x>✕</button>
    <p class="kicker">SHIZUKA</p><h2>🧘 静のひととき</h2>
    <p class="sub">境内に、少し長く居てみませんか。勉強や仕事のあいだ、眠る前、ただ眺めていたいときに。</p>
    <div class="zen-cards">
      <button type="button" data-go="fune" class="wide-card"><span>🛶</span><b>屋形船で、みんなと作業</b><small>池に浮かぶ船の座敷。:00と:30に、みんなで25分集中・5分休憩</small></button>
      <button type="button" data-go="shoin" class="wide-card"><span>📖</span><b>書院で、みんなと作業</b><small>参道を眺める文机。同じ時間に、同じ部屋で</small></button>
      <button type="button" data-go="focus"><span>🧘</span><b>集中・作業</b><small>作業・勉強のおともに。15〜60分、座禅しながら</small></button>
      <button type="button" data-go="mix"><span>🎧</span><b>作業用BGM・境内の音</b><small>雨・せせらぎ・風鈴…を重ねる</small></button>
      <button type="button" data-go="shakyo"><span>🖌</span><b>写経・写歌</b><small>祓詞や和歌を一字ずつ書き写す</small></button>
      <button type="button" data-go="ema"><span>🎨</span><b>絵馬を描く</b><small>筆で描いて、絵馬掛けに掛ける</small></button>
      <button type="button" data-go="tour"><span>🎥</span><b>境内めぐり</b><small>カメラがゆっくり十三か所をめぐる</small></button>
      <button type="button" data-go="pond"><span>🏮</span><b>奥の院の池</b><small>灯籠の流れる池を眺め続ける</small></button>
    </div>
    <p class="sub zen-stat"></p></div>`;
  document.body.appendChild(menu);
  menu.onclick = (e) => {
    if (e.target.closest("[data-x]") || e.target === menu) { menu.hidden = true; return; }
    const b = e.target.closest("[data-go]"); if (!b) return; menu.hidden = true;
    const go = b.dataset.go;
    if (go === "fune" || go === "shoin") A.room(go); else if (go === "focus") openFocus(); else if (go === "mix") A.mixer.open(); else if (go === "shakyo") A.shakyo.open(); else if (go === "ema") A.shakyo.drawEma();
    else if (A.isBusy()) A.toast("いまの所作が終わってからどうぞ"); else A.tour.start(go === "tour" ? "tour" : "pond");
  };
  const statLine = () => { const s = stats(); return `今日 ${s.today}分 静かに過ごしました・これまで ${s.total}分（${s.sessions}回）`; };
  function openMenu() { menu.querySelector(".zen-stat").textContent = statLine(); menu.hidden = false; }

  // ---------------------------------------------------------------- 集中・座禅の設定
  const fm = document.createElement("section"); fm.className = "modal"; fm.id = "m-focus"; fm.hidden = true;
  fm.innerHTML = `<div class="sheet"><button class="x" type="button" data-x>✕</button>
    <p class="kicker">ZAZEN · FOCUS</p><h2>🧘 集中・作業</h2>
    <p class="sub">好きな場所で正座して、時間まで静かに過ごします。5分ごとに徳+5。頭の上に「集中中」と出て、まわりの人にも伝わります。</p>
    <h3>時間</h3><div class="chips" data-g="min">${MINS.map((m) => `<button type="button" class="chip" data-v="${m}">${m}分</button>`).join("")}</div>
    <h3>場所</h3><div class="chips" data-g="spot">${SPOTS.map((s) => `<button type="button" class="chip" data-v="${s.id}">${s.name}<small>${s.sub}</small></button>`).join("")}</div>
    <h3>音</h3><div class="chips" data-g="sound">${["そのまま", "集中", "奥の院の雨夜", "参道の朝"].map((s) => `<button type="button" class="chip" data-v="${s}">${s === "集中" ? "雨と音楽" : s}</button>`).join("")}</div>
    <label class="chk"><input type="checkbox" data-c="breath"> はじめに呼吸を整える（4-7-8 を三回・約1分）</label>
    <label class="chk"><input type="checkbox" data-c="quiet"> 画面を静かにする（ボタンを隠す）</label>
    <p class="sub zen-others"></p>
    <button type="button" class="btn primary wide" data-start>はじめる</button></div>`;
  document.body.appendChild(fm);
  const paintF = () => {
    fm.querySelectorAll("[data-g] .chip").forEach((c) => c.classList.toggle("on", String(pick[c.parentElement.dataset.g]) === c.dataset.v));
    fm.querySelector("[data-c=breath]").checked = pick.breath; fm.querySelector("[data-c=quiet]").checked = pick.quiet;
    const n = A.focusing(); fm.querySelector(".zen-others").textContent = n ? `いま境内で ${n}人が集中しています。` : statLine();
  };
  fm.onclick = (e) => {
    if (e.target.closest("[data-x]") || e.target === fm) { fm.hidden = true; return; }
    const c = e.target.closest("[data-g] .chip"); if (c) { const gname = c.parentElement.dataset.g; pick[gname] = gname === "min" ? +c.dataset.v : c.dataset.v; paintF(); return; }
    if (e.target.closest("[data-start]")) { fm.hidden = true; start(); }
  };
  fm.onchange = (e) => { const k = e.target.dataset.c; if (k) pick[k] = e.target.checked; };
  function openFocus() { if (session) { A.toast("いま集中しています"); return; } paintF(); fm.hidden = false; }

  // ---------------------------------------------------------------- 呼吸（4-7-8）
  const br = document.createElement("div"); br.id = "breath"; br.hidden = true;
  br.innerHTML = `<div class="br-ring"><div class="br-dot"></div></div><p class="br-say"></p><small class="br-n"></small><button type="button" class="br-skip">とばす</button>`;
  document.body.appendChild(br);
  function breathe() {
    return new Promise((resolve) => {
      br.hidden = false; const dot = br.querySelector(".br-dot"), say = br.querySelector(".br-say"), n = br.querySelector(".br-n");
      let done = false; const timers = [];
      const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); br.hidden = true; resolve(); };
      br.querySelector(".br-skip").onclick = finish;
      const steps = [["鼻から吸って", 4, 1], ["息を止めて", 7, 1], ["口から、ゆっくり吐いて", 8, 0.35]];
      let at = 400;
      for (let c = 0; c < 3; c++) for (const [txt, sec, scale] of steps) {
        timers.push(setTimeout(() => { say.textContent = txt; n.textContent = `${c + 1} / 3`; dot.style.transition = `transform ${sec}s ease-in-out`; dot.style.transform = `scale(${scale})`; A.breathTone?.(txt); }, at));
        at += sec * 1000;
      }
      timers.push(setTimeout(finish, at + 300));
      dot.style.transition = "none"; dot.style.transform = "scale(0.35)";
    });
  }

  // ---------------------------------------------------------------- 集中中の表示
  const hud = document.createElement("div"); hud.id = "focus-hud"; hud.hidden = true;
  hud.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="fr-bg"/><circle cx="22" cy="22" r="19" class="fr-fg"/></svg>
    <div class="fh-t"><b class="fh-time">25:00</b><small class="fh-sub">集中中</small></div>
    <button type="button" class="fh-q" title="画面を静かに">🌙</button><button type="button" class="fh-end">終える</button>`;
  document.body.appendChild(hud);
  let session = null;
  const C = 2 * Math.PI * 19;
  function tick() {
    if (!session) return;
    const el = (Date.now() - session.t0) / 1000, left = Math.max(0, session.min * 60 - el);
    hud.querySelector(".fh-time").textContent = fmt(left); document.title = `🧘 ${fmt(left)} 集中中｜えにし神社`;
    hud.querySelector(".fr-fg").style.strokeDashoffset = String(C * (1 - el / (session.min * 60)));
    const blocks = Math.floor(el / 300);
    if (blocks > session.blocks) { const add = blocks - session.blocks; session.blocks = blocks; A.addToku(5 * add); A.soft?.(); hud.querySelector(".fh-sub").textContent = `徳 +${session.blocks * 5}`; }
    const n = A.focusing(); if (n !== session.n) { session.n = n; }
    if (left <= 0) end(true);
  }
  async function start() {
    A.store.set("enishi_zen_min", pick.min); A.store.set("enishi_zen_spot", pick.spot); A.store.set("enishi_zen_breath", pick.breath); A.store.set("enishi_zen_quiet", pick.quiet);
    if (pick.sound !== "そのまま") A.mixer.preset(pick.sound);
    const spot = SPOTS.find((s) => s.id === pick.spot) || SPOTS[0];
    A.doing(async () => {
      await A.walkRoute(spot.at); A.me.rotation.y = spot.face; A.setPose(A.me, "seiza");
      const back = spot.face + Math.PI, cx = () => A.me.position;
      let sway = 0;
      A.setCine((dt) => { sway += (dt || 0.016) * 0.05; const a = back + Math.sin(sway) * 0.25, p = cx();
        const x = p.x + Math.sin(a) * 4.4, z = p.z + Math.cos(a) * 4.4; A.camera.position.set(x, Math.max(p.y + 2.9, A.footY(x, z) + 1.4), z);
        A.camera.lookAt(p.x - Math.sin(back) * 8, p.y + 0.9, p.z - Math.cos(back) * 8); });
      if (pick.breath) await breathe();
      const prev = A.getStatus();
      session = { min: pick.min, t0: Date.now(), blocks: 0, prev, n: 0, iv: setInterval(tick, 1000) };
      A.setStatus(`🧘 集中中 ${pick.min}分`);
      hud.hidden = false; hud.querySelector(".fh-sub").textContent = "集中中"; document.body.classList.toggle("focus-quiet", pick.quiet);
      A.gong?.(); tick();
      await new Promise((r) => (session.resolve = r));
    });
  }
  function end(complete) {
    if (!session) return;
    const s = session; session = null; clearInterval(s.iv);
    const mins = Math.floor((Date.now() - s.t0) / 60000);
    const st = stats(); st.today += mins; st.total += mins; if (mins >= 1) st.sessions += 1; A.store.set("enishi_zen", st);
    A.setStatus(s.prev || "");
    hud.hidden = true; document.body.classList.remove("focus-quiet"); A.setCine(null); document.title = TITLE;
    if (complete) { A.gong?.(); A.deedHook("zen", { min: mins }); }
    if (mins >= 5) showDone(mins, st, s.blocks * 5, complete);
    else A.toast(`${mins}分 静かに過ごしました。今日は合わせて ${st.today}分。`, 5000);
    s.resolve?.();
  }
  // おつかれさまカード：記録をシェア（#えにし作業室）
  const done = document.createElement("section"); done.className = "modal"; done.id = "m-zendone"; done.hidden = true; document.body.appendChild(done);
  function card(mins, st) {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1080; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, "#141a2c"); g.addColorStop(1, "#0b0e18"); x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
    x.strokeStyle = "rgba(232,198,122,.55)"; x.lineWidth = 3; x.strokeRect(60, 60, 960, 960);
    const f = (px, w = "bold") => `${w} ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
    x.textAlign = "center"; x.fillStyle = "#e8c67a"; x.font = f(40, ""); x.fillText("えにし作業室", 540, 200);
    x.fillStyle = "#f4ead8"; x.font = f(220); x.fillText(String(mins), 540, 520); x.font = f(56); x.fillText("分、集中しました", 540, 620);
    x.fillStyle = "#b9b0a0"; x.font = f(36, ""); x.fillText(`今日の合計 ${st.today}分 ・ これまで ${st.total}分`, 540, 720);
    const d = new Date(Date.now() + 9 * 3600e3); x.fillText(`${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`, 540, 780);
    x.fillStyle = "#e8c67a"; x.font = f(52); x.fillText("えにし神社", 540, 920); x.fillStyle = "#8a7f70"; x.font = f(28, ""); x.fillText("作業と祈りのオンライン神社", 540, 965);
    return c;
  }
  function showDone(mins, st, toku, complete) {
    const c = card(mins, st);
    done.innerHTML = `<div class="sheet"><button class="x" type="button" data-x>✕</button><p class="kicker">${complete ? "おつかれさまでした" : "おつかれさまでした"}</p>
      <h2>🧘 ${mins}分、集中しました</h2><p class="sub">徳 +${toku}・今日は合わせて ${st.today}分。また、いつでも境内へ。</p>
      <div class="zd-card"></div><div class="row"><button type="button" class="btn" data-x>閉じる</button><button type="button" class="btn primary" data-share>記録をシェア</button></div></div>`;
    c.className = "zd-cv"; done.querySelector(".zd-card").appendChild(c); done.hidden = false;
    done.onclick = (e) => {
      if (e.target.closest("[data-x]") || e.target === done) done.hidden = true;
      if (e.target.closest("[data-share]")) A.shareCanvas(c, `えにし神社で${mins}分、もくもく集中しました🧘 今日は合わせて${st.today}分。\n#えにし神社 #えにし作業室`, "enishi-focus.png");
    };
  }
  hud.querySelector(".fh-end").onclick = () => end(false);
  hud.querySelector(".fh-q").onclick = () => document.body.classList.toggle("focus-quiet");
  return { open: openMenu, openFocus, get active() { return !!session; } };
}
