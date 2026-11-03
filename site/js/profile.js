// 身支度：名前と見た目を選ぶ。初めての参拝では、境内に入る前にここから。
import { LOOK, parseLook, lookString, restyle } from "./avatar.js?v=11031057";

const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const RANKS = [[0, "参拝者"], [10, "常連さん"], [30, "氏子"], [70, "世話役"], [150, "総代"], [300, "神様の友"]];
const rankAt = (t) => { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (t >= n) r = name; return r; };

export function setupProfile(A) {
  const { me, camera } = A;
  const m = document.createElement("section"); m.className = "modal side"; m.id = "m-profile"; m.hidden = true;
  m.innerHTML = `<div class="sheet profile-sheet">
    <button class="x" data-close aria-label="閉じる">✕</button>
    <p class="kicker" id="pf-kicker">身支度</p><h2 id="pf-title">あなたの姿</h2>
    <p class="sub" id="pf-lead"></p>
    <label class="pf-label" for="pf-name">お名前 <small>境内のみんなに見えます · 12文字まで</small></label>
    <div class="pf-name"><input id="pf-name" maxlength="12" autocomplete="off"><button class="btn" id="pf-dice" title="おまかせの名前">🎲</button></div>
    <p class="pf-label">浴衣</p><div class="swatches" id="pf-k"></div>
    <p class="pf-label">柄</p><div class="chips" id="pf-p"></div>
    <p class="pf-label">髪型</p><div class="chips" id="pf-h"></div>
    <p class="pf-label">髪の色</p><div class="swatches" id="pf-c"></div>
    <p class="pf-label">小物 <small>徳を積むと増えます</small></p><div class="chips" id="pf-a"></div>
    <p class="sub pf-err" id="pf-err" role="alert"></p>
    <div class="row"><button class="btn" id="pf-cancel">もとに戻す</button><button class="btn primary" id="pf-save">この姿で参拝する</button></div>
  </div>`;
  document.body.appendChild(m);
  const $ = (s) => m.querySelector(s);
  let L = parseLook(A.getLook()), saved = A.getLook(), first = false;

  const render = () => {
    $("#pf-k").innerHTML = LOOK.yukata.map(([k, o], i) => `<button class="sw ${i === L.k ? "on" : ""}" data-v="${i}" aria-label="浴衣 ${i + 1}" style="background:linear-gradient(135deg,${hex(k)} 0 62%,${hex(o)} 62%)"></button>`).join("");
    $("#pf-p").innerHTML = LOOK.patNames.map((n, i) => `<button class="${i === L.p ? "on" : ""}" data-v="${i}">${n}</button>`).join("");
    $("#pf-h").innerHTML = LOOK.hairNames.map((n, i) => `<button class="${i === L.h ? "on" : ""}" data-v="${i}">${n}</button>`).join("");
    $("#pf-c").innerHTML = LOOK.hairCols.map((c, i) => `<button class="sw ${i === L.c ? "on" : ""}" data-v="${i}" aria-label="${LOOK.hairColNames[i]}" style="background:${hex(c)}"></button>`).join("");
    const toku = A.toku();
    $("#pf-a").innerHTML = LOOK.acc.map((a) => { const lock = toku < a.need; return `<button class="${a.id === L.a ? "on" : ""} ${lock ? "lock" : ""}" data-v="${a.id}" ${lock ? `data-need="${a.need}"` : ""}>${lock ? "🔒 " : ""}${a.name}${lock ? `<small>${rankAt(a.need)}から</small>` : ""}</button>`; }).join("");
  };
  const apply = () => { restyle(me, lookString(L), A.env); render(); };
  const pick = (id, key) => ($(id).onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.need) { $("#pf-err").textContent = `徳 ${b.dataset.need} で使えるようになります（いま ${A.toku()}）。お参りや良い行いで徳が積まれます。`; return; }
    $("#pf-err").textContent = ""; L[key] = +b.dataset.v; apply();
  });
  pick("#pf-k", "k"); pick("#pf-p", "p"); pick("#pf-h", "h"); pick("#pf-c", "c"); pick("#pf-a", "a");
  $("#pf-dice").onclick = () => { $("#pf-name").value = A.randomName(); };

  // 自分を正面からゆっくり回って見せる
  let t0 = 0;
  const orbit = () => {
    const t = (performance.now() - t0) / 1000, ry = me.rotation.y + Math.sin(t * 0.35) * 0.55, wide = innerWidth > innerHeight;
    const cx = me.position.x + Math.sin(ry) * 3.0, cz = me.position.z + Math.cos(ry) * 3.0;
    camera.position.set(cx, me.position.y + 1.8, cz);
    // 横長の画面では、右のパネルに隠れないよう少し右を見る（人物は左に寄る）
    const side = wide ? 0.9 : 0, lx = me.position.x + Math.cos(ry) * side, lz = me.position.z - Math.sin(ry) * side;
    camera.lookAt(lx, me.position.y + (wide ? 1.15 : 0.55), lz);
  };
  function open(isFirst = false) {
    first = isFirst; L = parseLook(A.getLook()); saved = A.getLook();
    $("#pf-name").value = A.getName(); $("#pf-err").textContent = "";
    $("#pf-kicker").textContent = isFirst ? "ようこそ" : "身支度";
    $("#pf-title").textContent = isFirst ? "えにし神社へようこそ" : "あなたの姿";
    $("#pf-lead").textContent = isFirst ? "境内に入る前に、お名前と浴衣を選んでください。あとから 👘 でいつでも変えられます。" : "名前と浴衣を変えられます。境内のみんなにもすぐ反映されます。";
    $("#pf-cancel").textContent = isFirst ? "おまかせで入る" : "もとに戻す";
    render(); m.hidden = false; t0 = performance.now(); A.setCine(orbit);
  }
  function close() { m.hidden = true; A.setCine(null); }
  function save() {
    const name = A.clean($("#pf-name").value);
    if (name.length < 1) { $("#pf-err").textContent = "お名前を入れてください"; return; }
    if (A.ng(name)) { $("#pf-err").textContent = "その名前は使えません。別の名前にしてください"; return; }
    A.setProfile(name, lookString(L)); A.store.set("enishi_profile", 1);
    close(); A.toast(first ? `ようこそ、${name}さん。ゆっくりお参りしていってください ⛩` : "身支度を整えました 👘", 3200);
  }
  $("#pf-save").onclick = save;
  $("#pf-cancel").onclick = () => { if (first) { A.store.set("enishi_profile", 1); close(); return; } restyle(me, saved, A.env); close(); };
  m.querySelector("[data-close]").onclick = () => $("#pf-cancel").onclick();
  return { open, get isOpen() { return !m.hidden; } };
}
