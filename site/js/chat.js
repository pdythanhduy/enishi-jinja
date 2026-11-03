// チャット：同じ境内（部屋）にいる人たちと、ことばを交わす。60文字まで。禁止語はサーバーでも止める。
// 言葉をタップすると、その人の言葉を表示しない（ミュート）・通報ができる。別々の3人から通報されると、その人の言葉は部屋に届かなくなる。
// 記録は端末の中だけ（この画面を開いているあいだ）。
const esc = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hhmm = () => { const d = new Date(Date.now() + 9 * 3600e3); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };

export function setupChat(A) {
  const el = document.createElement("section"); el.id = "chat"; el.hidden = true; el.setAttribute("aria-label", "境内のことば");
  el.innerHTML = `<div class="ch-head"><b>💬 境内のことば</b><small class="ch-room"></small><button class="ch-x" type="button" aria-label="閉じる">✕</button></div>
    <div class="ch-log" aria-live="polite"></div>
    <div class="ch-menu" hidden><span class="ch-who"></span><button type="button" data-m="mute">🔇 表示しない</button><button type="button" data-m="rep">🚩 通報する</button><button type="button" data-m="no">やめる</button></div>
    <form class="ch-form"><input maxlength="60" placeholder="みんなに話しかける（60文字まで）" autocomplete="off" enterkeyhint="send"><button class="btn primary" type="submit">送る</button></form>
    <p class="ch-note">やさしい言葉で。名前・連絡先など個人の情報は書かないでください。</p>`;
  document.body.appendChild(el);
  const btn = document.createElement("button"); btn.id = "chat-btn"; btn.type = "button"; btn.setAttribute("aria-label", "チャット"); btn.innerHTML = `💬<i hidden></i>`; document.body.appendChild(btn);
  const tick = document.createElement("div"); tick.id = "chat-tick"; tick.hidden = true; document.body.appendChild(tick);
  const $ = (s) => el.querySelector(s), log = $(".ch-log"), input = $(".ch-form input"), note = $(".ch-note"), menu = $(".ch-menu");
  const lines = []; let unread = 0, menuFor = null, lastSend = 0, tickT = 0;
  const NOTE = note.textContent;

  function render(l) {
    const d = document.createElement("div"); d.className = `ch-l ${l.kind}`;
    if (l.kind === "sys") d.innerHTML = `<span>${esc(l.text)}</span><time>${l.t}</time>`;
    else { d.innerHTML = `<b>${esc(l.name)}</b><span>${esc(l.text)}</span><time>${l.t}</time>`; if (l.kind === "other") { d.dataset.id = l.id; d.dataset.name = l.name; d.tabIndex = 0; } }
    log.appendChild(d); while (log.children.length > 80) log.firstChild.remove();
    if (!el.hidden) log.scrollTop = log.scrollHeight;
  }
  function push(l) {
    l.t = hhmm(); lines.push(l); if (lines.length > 80) lines.shift(); render(l);
    if (el.hidden && l.kind !== "me") {
      if (l.kind === "other") { unread++; btn.querySelector("i").hidden = false; btn.querySelector("i").textContent = unread > 9 ? "9+" : unread; }
      tick.innerHTML = l.kind === "sys" ? esc(l.text) : `<b>${esc(l.name)}</b> ${esc(l.text)}`; tick.hidden = false; tick.classList.remove("on"); void tick.offsetWidth; tick.classList.add("on");
      clearTimeout(tickT); tickT = setTimeout(() => (tick.hidden = true), 6000);
    }
  }
  function open() {
    el.hidden = false; tick.hidden = true; unread = 0; btn.querySelector("i").hidden = true; btn.classList.add("on");
    $(".ch-room").textContent = A.room ? `${A.room()}番の境内` : "";
    log.scrollTop = log.scrollHeight;
    if (!lines.length) push({ kind: "sys", text: "ここに書いた言葉は、いま境内にいる人みんなに届きます" });
    if (!matchMedia("(pointer: coarse)").matches) input.focus();
  }
  function close() { el.hidden = true; menu.hidden = true; btn.classList.remove("on"); input.blur(); }
  btn.onclick = () => (el.hidden ? open() : close());
  tick.onclick = open;
  $(".ch-x").onclick = close;
  const say = (msg) => { note.textContent = msg; note.classList.add("warn"); setTimeout(() => { note.textContent = NOTE; note.classList.remove("warn"); }, 3500); };
  $(".ch-form").onsubmit = (e) => {
    e.preventDefault();
    const t = A.clean(input.value, 60); if (!t) return;
    if (A.ng(t)) { say("その言葉は境内では使えません"); return; }
    if (performance.now() - lastSend < 2600) { say("少し間をあけて送ってください"); return; }
    lastSend = performance.now(); input.value = "";
    A.net()?.st(t, "say"); A.sayMine(t); mine(t); A.deedHook("say");
  };
  input.addEventListener("keydown", (e) => e.stopPropagation());   // 入力中は歩く操作にしない
  log.onclick = (e) => {
    const l = e.target.closest(".ch-l.other"); if (!l) return;
    menuFor = { id: l.dataset.id, name: l.dataset.name }; $(".ch-who").textContent = `${menuFor.name}さんの言葉を`; menu.hidden = false;
  };
  menu.onclick = (e) => {
    const b = e.target.closest("button"); if (!b || !menuFor) return;
    if (b.dataset.m === "mute") A.mute(menuFor.id);
    else if (b.dataset.m === "rep") { A.net()?.rep(menuFor.id); A.mute(menuFor.id, true); A.toast("通報しました。ご協力ありがとうございます。この人の言葉は表示しません", 3800); }
    menu.hidden = true; menuFor = null;
  };
  const mine = (text) => push({ kind: "me", name: A.getName(), text });
  return {
    open, close, mine,
    add: (o, text) => { if (!o.muted && text) push({ kind: "other", id: o.id, name: o.name || "参拝者", text }); },
    sys: (text) => push({ kind: "sys", text }),
  };
}
