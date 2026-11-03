// 人とのつながり：ことば（定型文）・縁を結ぶ（お辞儀を交わす）・縁帳・祈りを送る・連続参拝・絵馬への祈りの知らせ。
// 端末の秘密 key から公開用の pid をつくる。他の人に見えるのは pid と名前だけ。
import * as THREE from "three";

export const PHRASES = ["こんにちは", "こんばんは", "よろしくお願いします", "ありがとう", "おめでとう！", "当選しますように", "一緒に祈りましょう", "合格しますように",
  "良いご縁がありますように", "お疲れさまです", "きれいですね", "大吉でした！", "がんばって！", "また明日", "お先に失礼します", "おやすみなさい"];
export const EMOTES = ["🙏", "🙇", "✨", "🎉", "💞", "🌸", "🍀", "⛩"];
const MILESTONES = { 3: 3, 7: 7, 14: 10, 30: 20, 100: 50 };

const hexKey = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function pidOf(key) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("enishi:" + key));
  return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const esc = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function setupSocial(A) {
  const { API, store, me, scene, camera, toast } = A;
  let key = store.get("enishi_key", ""); if (!/^[0-9a-f]{32}$/.test(key)) { key = hexKey(); store.set("enishi_key", key); }
  const pid = await pidOf(key);
  const post = (path, body) => fetch(`${API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...body }) }).then((r) => r.json());
  const enList = () => store.get("enishi_en", []);
  const saveEn = (l) => store.set("enishi_en", l.slice(0, 100));

  // ---------------------------------------------------------------- ことば（定型文・絵文字）
  const pop = document.createElement("div"); pop.id = "say-pop"; pop.hidden = true;
  pop.innerHTML = `<div class="say-free"><input id="say-text" maxlength="20" placeholder="ひとこと（20文字まで）" autocomplete="off" enterkeyhint="send"><div class="say-free-btns"><button type="button" class="btn" data-free="st">頭の上に出す</button><button type="button" class="btn primary" data-free="say">話す</button></div><p class="say-note" id="say-note"></p></div>
    <div class="say-emo">${EMOTES.map((e, i) => `<button data-e="${i}" aria-label="${e}">${e}</button>`).join("")}</div>
    <div class="say-list">${PHRASES.map((p, i) => `<button data-p="${i}">${p}</button>`).join("")}</div>`;
  document.body.appendChild(pop);
  let myBubble = null;
  const say = (text) => {
    myBubble?.remove(); const b = document.createElement("div"); b.className = "tag bub mine"; b.textContent = text; document.body.appendChild(b); myBubble = b;
    setTimeout(() => { if (myBubble === b) { b.remove(); myBubble = null; } }, 4200);
  };
  const note = (t) => { pop.querySelector("#say-note").textContent = t; };
  const sendFree = (kind) => {
    const t = A.clean(pop.querySelector("#say-text").value, 20);
    if (kind === "say" && !t) { note("ことばを入れてください"); return; }
    if (A.ng(t)) { note("その言葉は使えません"); return; }
    if (kind === "st") { A.setStatus(t); A.net?.st(t, "st"); note(t ? "頭の上に出しました（みんなに見えます）" : "頭の上の言葉を消しました"); }
    else { say(t); A.net?.st(t, "say"); A.logMine?.(t); pop.querySelector("#say-text").value = ""; pop.hidden = true; A.deedHook("say"); }
  };
  pop.querySelector("#say-text").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); sendFree("say"); } });
  pop.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.free) { sendFree(b.dataset.free); return; }
    if (b.dataset.e) { say(EMOTES[+b.dataset.e]); A.net?.act("emo", b.dataset.e); A.logMine?.(EMOTES[+b.dataset.e]); }
    else { say(PHRASES[+b.dataset.p]); A.net?.act("say", b.dataset.p); A.logMine?.(PHRASES[+b.dataset.p]); }
    pop.hidden = true; A.deedHook("say");
  };
  document.addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target.id !== "act-say" && !e.target.closest("#act-say")) pop.hidden = true; });
  const toggleSay = () => { pop.hidden = !pop.hidden; };
  // 自分の吹き出しを頭の上に
  const v = new THREE.Vector3();
  const meTag = document.getElementById("me-tag");
  A.W.update.push(() => { if (!myBubble) return; myBubble.style.left = meTag.style.left; myBubble.style.top = `calc(${meTag.style.top} - ${meTag.offsetHeight + 6}px)`; myBubble.style.display = meTag.style.display; });   // 自分の名札の上に
  const otherSay = (a, r) => (a === "say" ? PHRASES[+r] : EMOTES[+r]) || null;

  // ---------------------------------------------------------------- 縁を結ぶ：相手をタップ → お辞儀 → 相手もお辞儀を返すと結ばれる
  const pending = new Map();      // 自分がお辞儀した相手（socket id → 時刻）
  const card = document.createElement("div"); card.id = "en-card"; card.hidden = true; document.body.appendChild(card);
  let cardFor = null;
  function showCard(o, html) { cardFor = o; card.innerHTML = html; card.hidden = false; clearTimeout(card._t); card._t = setTimeout(() => (card.hidden = true), 12000); }
  card.onclick = async (e) => {
    const b = e.target.closest("button"); if (!b || !cardFor) return;
    const o = cardFor; card.hidden = true;
    if (b.dataset.do === "bow") await bowTo(o, false);
    else if (b.dataset.do === "return") await bowTo(o, true);
    else if (b.dataset.do === "mute") A.toggleMute(o);
  };
  async function bowTo(o, isReturn) {
    if (A.isBusy()) return;
    const dx = o.av.position.x - me.position.x, dz = o.av.position.z - me.position.z;
    me.rotation.y = Math.atan2(dx, dz);
    pending.set(o.id, Date.now());
    A.net?.en(o.id, pid); A.net?.act("bow");
    await A.bowTo(me, 1.1, 550); await new Promise((r) => setTimeout(r, 250)); await A.bowTo(me, 0, 450);
    if (isReturn && o.inbound && Date.now() - o.inbound.at < 120e3) bind(o, o.inbound);
    else if (!isReturn) toast(`${o.name}さんにお辞儀をしました。お辞儀が返ってくると、縁が結ばれます`, 3200);
  }
  // 他の人をタップしたとき
  function tapOther(o) {
    const known = enList().find((x) => x.pid && x.pid === o.pid);
    showCard(o, `<p class="en-name">${esc(o.name)}<small>${known ? "🧧 縁のある人" : "参拝者"}</small></p>
      <div class="en-btns"><button data-do="bow" class="btn primary">🙇 お辞儀をする</button><button data-do="mute" class="btn">${A.isMuted(o) ? "言葉を表示する" : "言葉を表示しない"}</button></div>
      <p class="sub">${known ? "また会えましたね。お辞儀で挨拶を。" : "お辞儀を交わすと、縁が結ばれて縁帳に残ります。"}</p>`);
  }
  // 相手からお辞儀が届いた
  function onEn(o, m) {
    o.pid = m.pid; o.inbound = { at: Date.now(), pid: m.pid, name: m.name, look: m.look };
    A.bubble(o, "🙇");
    const mine = pending.get(o.id);
    if (mine && Date.now() - mine < 120e3) { bind(o, o.inbound); return; }
    showCard(o, `<p class="en-name">${esc(m.name)}さんが<br>あなたにお辞儀をしています</p>
      <div class="en-btns"><button data-do="return" class="btn primary">🙇 お辞儀を返す</button></div><p class="sub">返すと、ふたりの縁が結ばれます。</p>`);
  }
  // 結ばれた：赤い糸がふたりの間に渡る
  function bind(o, info) {
    pending.delete(o.id); o.inbound = null;
    const list = enList(), had = list.find((x) => x.pid === info.pid);
    if (had) { had.name = info.name; had.look = info.look; had.met = A.today(); saveEn(list); toast(`${info.name}さんとの縁が、またひとつ深まりました 🧧`, 3400); return thread(o); }
    list.unshift({ pid: info.pid, name: info.name, look: info.look, since: A.today(), met: A.today() }); saveEn(list);
    thread(o); A.chime(); toast(`${info.name}さんと縁を結びました 🧧 縁帳に記しました`, 4200); A.deedHook("en"); badge();
  }
  function thread(o) {
    const a = me.position.clone().setY(me.position.y + 1.0), b = o.av.position.clone().setY(o.av.position.y + 1.0), mid = a.clone().lerp(b, 0.5); mid.y += 1.2;
    const geo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 30, 0.03, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 1 }); mat.color.multiplyScalar(2.2);
    const line = new THREE.Mesh(geo, mat); scene.add(line);
    const t0 = performance.now(); (function f() { const k = (performance.now() - t0) / 4500; mat.opacity = Math.max(0, 1 - k * k); if (k < 1) requestAnimationFrame(f); else { scene.remove(line); geo.dispose(); mat.dispose(); } })();
  }

  // ---------------------------------------------------------------- 縁帳（縁のある人・届いた祈り）
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-en"; m.hidden = true;
  m.innerHTML = `<div class="sheet"><button class="x" data-close aria-label="閉じる">✕</button><p class="kicker">縁帳</p><h2>縁のある人</h2>
    <p class="sub">境内でお辞儀を交わした人たちです。一日に一度、それぞれに祈りを送れます。</p>
    <div id="en-inbox"></div><div id="en-list" class="en-list"></div></div>`;
  document.body.appendChild(m);
  m.querySelector("[data-close]").onclick = () => (m.hidden = true);
  m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
  const HALL = { tosen: "当選の社", enmusubi: "縁結びの社", gokaku: "合格の社", okunoin: "奥の院" };
  async function openBook() {
    clearBadge();
    const list = enList(), log = store.get("enishi_inbox_log", []);
    m.querySelector("#en-inbox").innerHTML = log.length ? `<h3>あなたに届いた祈り</h3><ul class="en-inbox">${log.slice(0, 8).map((x) => `<li>🙏 <b>${esc(x.name)}</b>さん <small>${esc(x.day.slice(5).replace("-", "/"))}</small></li>`).join("")}</ul>` : "";
    const el = m.querySelector("#en-list");
    if (!list.length) { el.innerHTML = `<div class="en-empty"><p>まだ縁はありません。</p><p class="sub">境内で誰かをタップして「お辞儀をする」を選び、相手もお辞儀を返すと、縁が結ばれてここに残ります。</p></div>`; m.hidden = false; return; }
    const blessed = store.get("enishi_blessed", {}), today = A.today();
    const row = (x, st) => `<div class="en-row"><div><b>${esc(x.name)}</b><small>${st || ""} · ${esc(x.since.replace(/-/g, "/"))} に結ぶ</small></div>
      <button class="btn ${blessed[x.pid] === today ? "" : "primary"}" data-bless="${x.pid}" ${blessed[x.pid] === today ? "disabled" : ""}>${blessed[x.pid] === today ? "祈りを送りました" : "🙏 祈りを送る"}</button></div>`;
    el.innerHTML = list.map((x) => row(x, "")).join("");
    m.hidden = false;
    try {
      const r = await fetch(`${API}/presence?ids=${list.map((x) => x.pid).join(",")}`).then((r) => r.json()), by = Object.fromEntries((r.people || []).map((p) => [p.pid, p]));
      el.innerHTML = list.map((x) => { const p = by[x.pid]; const st = p ? (p.on ? `🟢 いま${HALL[p.hall] || "境内"}に` : p.ago < 60 ? `${p.ago}分前に参拝` : p.ago < 1440 ? `${Math.round(p.ago / 60)}時間前に参拝` : `${Math.round(p.ago / 1440)}日前に参拝`) : ""; return row(x, st); }).join("");
    } catch {}
  }
  m.querySelector("#en-list").onclick = async (e) => {
    const b = e.target.closest("[data-bless]"); if (!b) return;
    const to = b.dataset.bless, x = enList().find((y) => y.pid === to); b.disabled = true; b.textContent = "送っています…";
    try { const r = await post("bless", { to, name: A.getName() }); if (r.error) throw 0;
      const bl = store.get("enishi_blessed", {}); bl[to] = A.today(); store.set("enishi_blessed", bl);
      b.textContent = "祈りを送りました"; b.classList.remove("primary"); A.chime(); toast(`${x?.name || ""}さんへ祈りを送りました。次に参拝したとき届きます 🙏`, 3600); A.deedHook("bless");
    } catch { b.disabled = false; b.textContent = "🙏 祈りを送る"; toast("いまは送れませんでした。少し時間をおいてください"); }
  };
  const btn = document.getElementById("btn-en");
  const badge = () => btn?.classList.add("dot"), clearBadge = () => btn?.classList.remove("dot");

  // ---------------------------------------------------------------- 境内にいることを知らせる・届いた祈りを受け取る
  const beat = () => post("presence", { name: A.getName(), hall: A.hall() }).catch(() => {});
  beat(); setInterval(() => { if (document.visibilityState === "visible") beat(); }, 90e3);
  post("inbox", {}).then((r) => {
    const msgs = (r && r.msgs) || []; if (!msgs.length) return;
    const log = store.get("enishi_inbox_log", []); for (const x of msgs) log.unshift({ name: x.name, day: x.day }); store.set("enishi_inbox_log", log.slice(0, 40));
    const names = [...new Set(msgs.map((x) => x.name))];
    setTimeout(() => { A.chime(); toast(`🙏 ${names.slice(0, 2).join("さん・")}さん${names.length > 2 ? `ほか${names.length - 2}人` : ""}が、あなたのために祈ってくれました`, 5200); badge(); }, 4500);
  }).catch(() => {});
  // 縁のある人が境内に来たら、一日一度だけそっと知らせる
  async function watchEn() {
    const list = enList(); if (!list.length) return;
    try { const r = await fetch(`${API}/presence?ids=${list.map((x) => x.pid).join(",")}`).then((r) => r.json());
      const seen = store.get("enishi_en_seen", {}), today = A.today();
      for (const p of r.people || []) if (p.on && seen[p.pid] !== today) { seen[p.pid] = today; store.set("enishi_en_seen", seen); const x = list.find((y) => y.pid === p.pid); toast(`🧧 縁のある${x ? x.name : ""}さんが、いま${HALL[p.hall] || "境内"}にいます`, 4200); badge(); break; }
    } catch {}
  }
  setTimeout(watchEn, 20e3); setInterval(watchEn, 180e3);

  // ---------------------------------------------------------------- 連続参拝
  function streakTick() {
    const s = store.get("enishi_streak", { last: "", n: 0, best: 0 }), today = A.today();
    if (s.last === today) return null;
    const yest = new Date(Date.parse(today + "T00:00:00Z") - 86400e3).toISOString().slice(0, 10);
    s.n = s.last === yest ? s.n + 1 : 1; s.best = Math.max(s.best || 0, s.n); s.last = today; store.set("enishi_streak", s);
    showStreak();
    const bonus = MILESTONES[s.n];
    setTimeout(() => toast(bonus ? `🔥 連続参拝 ${s.n}日！ 徳 +${bonus}。続けてくださって、ありがとうございます` : s.n > 1 ? `🔥 連続参拝 ${s.n}日目` : "今日のお参りを記しました。明日も来ると、連続参拝になります", bonus ? 4800 : 2600), 2800);
    if (bonus) A.deedHook("streak", { bonus });
    return s.n;
  }
  function showStreak() {
    const s = store.get("enishi_streak", { last: "", n: 0 }), el = document.getElementById("streak"); if (!el) return;
    const yest = new Date(Date.parse(A.today() + "T00:00:00Z") - 86400e3).toISOString().slice(0, 10);
    const alive = s.last === A.today() || s.last === yest;
    el.textContent = alive && s.n ? `🔥${s.n}日` : ""; el.title = alive ? `連続参拝 ${s.n}日（最長 ${s.best || s.n}日）` : "";
  }
  showStreak();
  // 久しぶり・続いている、のあいさつ
  (() => {
    const s = store.get("enishi_streak", { last: "", n: 0 }); if (!s.last || s.last === A.today()) return;
    const yest = new Date(Date.parse(A.today() + "T00:00:00Z") - 86400e3).toISOString().slice(0, 10);
    setTimeout(() => toast(s.last === yest ? `おかえりなさい。今日お参りすると、連続参拝 ${s.n + 1}日目です 🔥` : "おかえりなさい。また会えてうれしいです ⛩", 4200), 6000);
  })();

  // ---------------------------------------------------------------- 絵馬に集まった祈りの知らせ
  async function emaNews() {
    const mine = store.get("enishi_myema", []); if (!mine.length) return;
    const byHall = {}; for (const e of mine) (byHall[e.hall] ||= []).push(e);
    let gained = 0, top = null;
    for (const [hall, list] of Object.entries(byHall)) {
      try { const r = await fetch(`${API}/ema/${hall}?ids=${list.map((e) => e.id).join(",")}`).then((r) => r.json());
        for (const row of r.mine || []) { const e = mine.find((x) => x.id === row.id); if (!e) continue; const d = (row.n || 0) - (e.n || 0); if (d > 0) { gained += d; if (!top || d > top.d) top = { d, text: e.text }; } e.n = row.n || 0; }
      } catch {}
    }
    store.set("enishi_myema", mine);
    if (gained > 0) setTimeout(() => { A.chime(); toast(`🪵 あなたの絵馬「${top.text.slice(0, 14)}${top.text.length > 14 ? "…" : ""}」に、新しく${gained}人が一緒に祈ってくれました`, 5600); }, 9000);
  }
  emaNews();
  const rememberEma = (hall, id, text) => { const l = store.get("enishi_myema", []); l.unshift({ hall, id, text, n: 0 }); store.set("enishi_myema", l.slice(0, 30)); };

  const openSay = () => { pop.hidden = false; pop.querySelector("#say-text").value = A.getStatus(); note(""); };
  return { pid, sayMine: say, toggleSay: () => (pop.hidden ? openSay() : (pop.hidden = true)), otherSay, tapOther, onEn, openBook, streakTick, rememberEma, close: () => { pop.hidden = true; card.hidden = true; } };
}
