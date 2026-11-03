// 写経・写歌：祓詞や和歌・俳句を、一字ずつ書き写す。キーボードで打っても、「なぞる」を押し続けても進む。
// 書き終えると「奉納」の朱印が押され、徳+10（一日三巻まで）。書いたものは帳（御札・宝物）に残る。
// 絵馬を描く：筆で描いた絵馬を、絵馬掛けに掛ける。絵はこの端末の中だけ（サーバーには送らない）。
const TEXTS = [
  { id: "harae", title: "祓詞", by: "神道の祝詞", text: "掛けまくも畏き 伊邪那岐大神 筑紫の日向の橘の 小戸の阿波岐原に 禊ぎ祓へ給ひし時に 生り坐せる祓戸の大神等 諸々の禍事罪穢 有らむをば 祓へ給ひ清め給へと 白す事を聞こし食せと 恐み恐みも白す" },
  { id: "ohara", title: "大祓詞（はじめ）", by: "神道の祝詞", text: "高天原に神留り坐す 皇親神漏岐神漏美の命以ちて 八百万神等を神集へに集へ賜ひ 神議りに議り賜ひて" },
  { id: "hisakata", title: "ひさかたの", by: "紀友則・百人一首", text: "ひさかたの 光のどけき 春の日に しづ心なく 花の散るらむ" },
  { id: "akinota", title: "秋の田の", by: "天智天皇・百人一首", text: "秋の田の かりほの庵の 苫をあらみ わが衣手は 露にぬれつつ" },
  { id: "chihaya", title: "ちはやぶる", by: "在原業平・百人一首", text: "ちはやぶる 神代もきかず 竜田川 からくれなゐに 水くくるとは" },
  { id: "harusugi", title: "春過ぎて", by: "持統天皇・百人一首", text: "春過ぎて 夏来にけらし 白妙の 衣ほすてふ 天の香具山" },
  { id: "furuike", title: "古池や", by: "松尾芭蕉", text: "古池や 蛙飛びこむ 水の音" },
  { id: "shizukasa", title: "閑さや", by: "松尾芭蕉", text: "閑さや 岩にしみ入る 蝉の声" },
  { id: "yuki", title: "雪とけて", by: "小林一茶", text: "雪とけて 村いっぱいの 子どもかな" },
];
const reiwa = () => { const d = new Date(Date.now() + 9 * 3600e3); return `令和${d.getUTCFullYear() - 2018}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`; };

export function setupShakyo(A) {
  // ---------------------------------------------------------------- 写経
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-shakyo"; m.hidden = true;
  m.innerHTML = `<div class="sheet wide-sheet"><button class="x" type="button" data-x>✕</button>
    <div class="sk-pick"><p class="kicker">SHAKYO</p><h2>🖌 写経・写歌</h2>
      <p class="sub">うすく見える字を、指（マウス）でなぞって一字ずつ書き写します。同じ字を日本語で打っても進みます。書き終えると奉納の印が押されます。</p>
      <div class="sk-list">${TEXTS.map((t, i) => `<button type="button" data-t="${i}"><b>${t.title}</b><small>${t.by}・${[...t.text.replace(/\s/g, "")].length}字</small></button>`).join("")}</div>
      <p class="sub sk-count"></p></div>
    <div class="sk-write" hidden>
      <div class="sk-paper"><div class="sk-text" lang="ja"></div><div class="sk-seal" hidden><b>奉納</b><small></small></div></div>
      <div class="sk-pad"><canvas width="300" height="300" aria-label="なぞり書きの紙"></canvas><div class="sk-padside"><b class="sk-next"></b><small class="sk-tip">うすい字を、なぞって書きましょう</small><button type="button" class="btn sk-clear">書き直す</button></div></div>
      <div class="sk-ctl"><input class="sk-in" placeholder="または、同じ字を打つ（日本語入力）" autocomplete="off" autocapitalize="off" lang="ja"></div>
      <div class="row"><span class="sub sk-prog"></span><button type="button" class="btn" data-back>ほかの文へ</button></div></div></div>`;
  document.body.appendChild(m);
  const $ = (s) => m.querySelector(s);
  let cur = null, chars = [], pos = 0, exact = 0, composing = false;
  const listCount = () => { const l = A.store.get("enishi_shakyo", []); $(".sk-count").textContent = l.length ? `これまでに ${l.length}巻 書き写しました。` : ""; };
  function choose(i) {
    cur = TEXTS[i]; pos = 0; exact = 0;
    const el = $(".sk-text"); el.innerHTML = ""; chars = [];
    for (const ch of cur.text) { if (/\s/.test(ch)) { el.appendChild(Object.assign(document.createElement("i"), { className: "gap" })); continue; } const s = document.createElement("span"); s.textContent = ch; el.appendChild(s); chars.push(s); }
    el.insertAdjacentHTML("beforeend", `<em class="sk-by">${cur.by}</em>`);
    $(".sk-seal").hidden = true; $(".sk-pick").hidden = true; $(".sk-write").hidden = false; $(".sk-in").value = ""; prog(); padChar();
    if (!matchMedia("(pointer: coarse)").matches) $(".sk-in").focus();
  }
  const prog = () => { $(".sk-prog").textContent = `${pos} / ${chars.length}字`; };
  function write(typed) {
    if (!cur || pos >= chars.length) return;
    const s = chars[pos]; s.classList.add("ink", "ok"); exact++;
    pos++; prog(); A.brush?.(); padChar();
    s.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (pos >= chars.length) finish();
  }
  function finish() {
    const day = A.today(), list = A.store.get("enishi_shakyo", []), todayN = list.filter((x) => x.day === day).length;
    list.unshift({ id: cur.id, title: cur.title, date: reiwa(), day, exact, n: chars.length }); A.store.set("enishi_shakyo", list.slice(0, 100));
    $(".sk-seal small").textContent = reiwa(); $(".sk-seal").hidden = false; A.chime?.();
    const toku = todayN < 3 ? 10 : 0; if (toku) A.addToku(toku);
    A.deedHook("shakyo", { id: cur.id });
    A.toast(`「${cur.title}」${chars.length}字を書き写し、奉納しました。${toku ? "徳 +10" : ""}`, 6000);
  }
  const input = $(".sk-in");
  input.addEventListener("compositionstart", () => (composing = true));
  input.addEventListener("compositionend", () => { composing = false; consume(); });
  input.addEventListener("input", () => { if (!composing) consume(); });
  input.addEventListener("keydown", (e) => e.stopPropagation());
  function consume() {
    const v = input.value.replace(/\s/g, ""); input.value = "";
    for (const ch of v) { if (pos >= chars.length) break; if (ch === chars[pos].textContent) write(ch); else { tip(`次の字は「${chars[pos].textContent}」です`); break; } }
  }
  const tip = (t) => { const el = $(".sk-tip"); el.textContent = t; el.classList.remove("warn"); void el.offsetWidth; el.classList.add("warn"); };
  // なぞり書き：うすい手本の字の上を筆でなぞり、字の形の半分以上をおおえたら一字できあがる
  const pad = $(".sk-pad canvas"), pc = pad.getContext("2d"), P = 300, R = 60;
  const ink = document.createElement("canvas"); ink.width = ink.height = P; const ic = ink.getContext("2d");
  const small = document.createElement("canvas"); small.width = small.height = R; const sc = small.getContext("2d", { willReadFrequently: true });
  let glyph = null, glyphN = 1, stroke = null;
  const FONT = (px) => `${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
  function padChar() {
    ic.clearRect(0, 0, P, P);
    if (!cur || pos >= chars.length) { glyph = null; drawPad(); $(".sk-next").textContent = ""; return; }
    const ch = chars[pos].textContent; $(".sk-next").textContent = `${pos + 1} / ${chars.length}`; $(".sk-tip").textContent = "うすい字を、なぞって書きましょう"; $(".sk-tip").classList.remove("warn");
    sc.clearRect(0, 0, R, R); sc.fillStyle = "#000"; sc.font = FONT(R * 0.86); sc.textAlign = "center"; sc.textBaseline = "middle"; sc.fillText(ch, R / 2, R / 2 + R * 0.04);
    const d = sc.getImageData(0, 0, R, R).data; glyph = new Uint8Array(R * R); glyphN = 0; for (let i = 0; i < R * R; i++) if (d[i * 4 + 3] > 90) { glyph[i] = 1; glyphN++; }
    drawPad();
  }
  function drawPad() {
    pc.fillStyle = "#f6eedb"; pc.fillRect(0, 0, P, P);
    pc.strokeStyle = "rgba(180,60,40,.25)"; pc.lineWidth = 1; pc.setLineDash([6, 6]); pc.beginPath(); pc.moveTo(P / 2, 0); pc.lineTo(P / 2, P); pc.moveTo(0, P / 2); pc.lineTo(P, P / 2); pc.stroke(); pc.setLineDash([]);
    if (cur && pos < chars.length) { pc.fillStyle = "rgba(60,45,30,.2)"; pc.font = FONT(P * 0.86); pc.textAlign = "center"; pc.textBaseline = "middle"; pc.fillText(chars[pos].textContent, P / 2, P / 2 + P * 0.04); }
    pc.drawImage(ink, 0, 0);
  }
  function score() {
    sc.clearRect(0, 0, R, R); sc.drawImage(ink, 0, 0, R, R); const d = sc.getImageData(0, 0, R, R).data; let hit = 0, inkN = 0;
    for (let i = 0; i < R * R; i++) if (d[i * 4 + 3] > 40) { inkN++; if (glyph[i]) hit++; }
    return { cover: hit / glyphN, stray: inkN ? 1 - hit / inkN : 0 };
  }
  const padPt = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * P, ((e.clientY - r.top) / r.height) * P]; };
  for (const ev of ["touchstart", "touchmove"]) pad.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  pad.addEventListener("pointerdown", (e) => { if (!glyph) return; e.preventDefault(); pad.setPointerCapture(e.pointerId); stroke = padPt(e); });
  pad.addEventListener("pointermove", (e) => { if (!stroke) return; e.preventDefault(); const p = padPt(e);
    ic.strokeStyle = "#17120d"; ic.lineCap = ic.lineJoin = "round"; ic.lineWidth = 22; ic.beginPath(); ic.moveTo(stroke[0], stroke[1]); ic.lineTo(p[0], p[1]); ic.stroke(); stroke = p; drawPad();
    if (Math.random() < 0.15) A.brush?.(); });
  const up = () => { if (!stroke) return; stroke = null; const { cover, stray } = score();
    if (cover >= 0.5 && stray < 0.55) { A.tone?.([[784, 0.25]], 0.4, 0.04); write(chars[pos].textContent); }
    else if (stray >= 0.55 && cover < 0.3) tip("字の形にそって、なぞってみましょう"); };
  pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  $(".sk-clear").onclick = () => { ic.clearRect(0, 0, P, P); drawPad(); };
  m.onclick = (e) => {
    if (e.target.closest("[data-x]") || e.target === m) { m.hidden = true; return; }
    const t = e.target.closest("[data-t]"); if (t) { choose(+t.dataset.t); return; }
    if (e.target.closest("[data-back]")) { $(".sk-pick").hidden = false; $(".sk-write").hidden = true; listCount(); }
  };
  function open() { $(".sk-pick").hidden = false; $(".sk-write").hidden = true; listCount(); m.hidden = false; }

  // ---------------------------------------------------------------- 絵馬を描く
  const d = document.createElement("section"); d.className = "modal"; d.id = "m-emadraw"; d.hidden = true;
  const COLORS = [["墨", "#1d1712"], ["朱", "#c8321e"], ["金", "#c9a23a"], ["藍", "#22406e"], ["若草", "#4f8a3a"], ["桜", "#e88aa6"], ["白", "#fbf6ea"]];
  d.innerHTML = `<div class="sheet"><button class="x" type="button" data-x>✕</button>
    <p class="kicker">EMA</p><h2>🎨 絵馬を描く</h2>
    <p class="sub">筆で絵や文字を描いて、絵馬掛けに掛けます。絵はこの端末の中だけで、ほかの人には見えません。</p>
    <canvas class="ed-cv" width="480" height="400" aria-label="絵馬の画面"></canvas>
    <div class="ed-tools"><div class="ed-cols">${COLORS.map(([n, c], i) => `<button type="button" data-c="${i}" title="${n}" style="--c:${c}"></button>`).join("")}</div>
      <div class="ed-size">${[3, 7, 14].map((s, i) => `<button type="button" data-s="${s}" class="${i === 1 ? "on" : ""}"><i style="width:${s + 2}px;height:${s + 2}px"></i></button>`).join("")}</div>
      <button type="button" class="btn" data-undo>↶ 戻す</button><button type="button" class="btn" data-clear>消す</button></div>
    <button type="button" class="btn primary wide" data-hang>絵馬掛けに掛ける</button></div>`;
  document.body.appendChild(d);
  const cv = d.querySelector(".ed-cv"), cx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const shape = (c) => { c.beginPath(); c.moveTo(18, 120); c.lineTo(W / 2, 14); c.lineTo(W - 18, 120); c.lineTo(W - 18, H - 16); c.lineTo(18, H - 16); c.closePath(); };
  function board() {
    cx.clearRect(0, 0, W, H); cx.save(); shape(cx); cx.clip();
    const gr = cx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "#e7c99a"); gr.addColorStop(1, "#d3ae78"); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { cx.strokeStyle = `rgba(120,80,40,${0.05 + Math.random() * 0.08})`; cx.lineWidth = 1 + Math.random() * 2; cx.beginPath(); const y = Math.random() * H; cx.moveTo(0, y); cx.bezierCurveTo(W / 3, y + rand(-8, 8), (2 * W) / 3, y + rand(-8, 8), W, y + rand(-6, 6)); cx.stroke(); }
    cx.restore();
    shape(cx); cx.strokeStyle = "#8a5a2a"; cx.lineWidth = 6; cx.stroke();
    cx.fillStyle = "#c8281e"; cx.beginPath(); cx.arc(W / 2, 58, 9, 0, 7); cx.fill();                 // 紐の穴
    cx.strokeStyle = "#c8281e"; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(W / 2 - 40, 30); cx.quadraticCurveTo(W / 2, 75, W / 2 + 40, 30); cx.stroke();
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  let strokes = [], col = 0, size = 7, curS = null;
  function redraw() { board(); cx.save(); shape(cx); cx.clip(); for (const s of strokes) paintStroke(s); cx.restore(); }
  function paintStroke(s) {
    cx.strokeStyle = COLORS[s.c][1]; cx.lineCap = cx.lineJoin = "round";
    for (let i = 1; i < s.p.length; i++) { const [x0, y0, w0] = s.p[i - 1], [x1, y1, w1] = s.p[i]; cx.lineWidth = (w0 + w1) / 2; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); }
    if (s.p.length === 1) { cx.fillStyle = COLORS[s.c][1]; cx.beginPath(); cx.arc(s.p[0][0], s.p[0][1], s.p[0][2] / 2, 0, 7); cx.fill(); }
  }
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); curS = { c: col, p: [[x, y, size * 0.6]], t: performance.now() }; strokes.push(curS); redraw(); });
  cv.addEventListener("pointermove", (e) => {
    if (!curS) return; const [x, y] = pt(e), last = curS.p[curS.p.length - 1], dist = Math.hypot(x - last[0], y - last[1]); if (dist < 1.5) return;
    const w = Math.max(size * 0.35, Math.min(size * 1.35, size * (1.4 - dist / 22)));                // 速く引くと細く、ゆっくりだと太く（筆らしく）
    curS.p.push([x, y, last[2] * 0.6 + w * 0.4]); cx.save(); shape(cx); cx.clip(); paintStroke({ c: curS.c, p: curS.p.slice(-2) }); cx.restore();
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, () => { if (curS && curS.p.length > 2) { const l = curS.p[curS.p.length - 1]; l[2] *= 0.4; } curS = null; redraw(); });
  d.onclick = (e) => {
    if (e.target.closest("[data-x]") || e.target === d) { d.hidden = true; return; }
    const c = e.target.closest("[data-c]"); if (c) { col = +c.dataset.c; d.querySelectorAll("[data-c]").forEach((b) => b.classList.toggle("on", b === c)); }
    const s = e.target.closest("[data-s]"); if (s) { size = +s.dataset.s; d.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("on", b === s)); }
    if (e.target.closest("[data-undo]")) { strokes.pop(); redraw(); }
    if (e.target.closest("[data-clear]")) { strokes = []; redraw(); }
    if (e.target.closest("[data-hang]")) {
      if (!strokes.length) { A.toast("まず、筆で何か描いてみましょう"); return; }
      const out = document.createElement("canvas"); out.width = 240; out.height = 200; out.getContext("2d").drawImage(cv, 0, 0, 240, 200);
      const url = out.toDataURL("image/png"); const list = A.store.get("enishi_myema", []); list.unshift({ url, date: reiwa() }); A.store.set("enishi_myema", list.slice(0, 6));
      A.hangEma(); d.hidden = true; A.chime?.(); A.deedHook("ema_draw");
      A.toast("描いた絵馬を、御神木の前の絵馬掛けに掛けました（あなたにだけ見えます）", 5000);
    }
  };
  function drawEma() { strokes = []; redraw(); d.querySelector("[data-c='0']").classList.add("on"); d.hidden = false; }
  return { open, drawEma, TEXTS };
}
