// 言語：日本語（もとのまま）・English・Tiếng Việt。
// 日本語の画面の文字を、出てきたその場で訳す（MutationObserver）。辞書は lang.js（日本語以外のときだけ読みこむ）。
// 3D の看板・絵馬・御朱印など、絵として描く文字は日本語のまま（神社らしさ）。祝詞・写経の本文・和歌も日本語。
const KEY = "enishi_lang";
export const LANGS = [["ja", "日本語"], ["en", "English"], ["vi", "Tiếng Việt"]];
export const LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q && LANGS.some(([k]) => k === q)) localStorage.setItem(KEY, q);
    const s = localStorage.getItem(KEY); if (s && LANGS.some(([k]) => k === s)) return s;
  } catch {}
  const n = (navigator.language || "ja").toLowerCase();
  return n.startsWith("ja") ? "ja" : n.startsWith("vi") ? "vi" : "en";
})();
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch {} location.reload(); }

const JP = /[぀-ヿ㐀-鿿]/;
let exact = null, pats = [];
// 訳：完全一致 → 型（{0} など）。型の中身も、辞書にあれば訳す
export function t(s) {
  if (!exact || !s || !JP.test(s)) return s;
  const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim();
  const hit = exact.get(core); if (hit !== undefined) return lead + hit + tail;
  for (const p of pats) {
    const m = p.re.exec(core); if (!m) continue;
    return lead + p.out.replace(/\{(\d+)\}/g, (_, id) => { const i = p.ids.indexOf(+id); return i < 0 ? "" : t(m[i + 1]); }) + tail;
  }
  // 先頭に絵文字などが足されている文（「💧 手水舎で…」）は、その後ろを訳す
  const pre = core.match(/^[^぀-ヿ㐀-鿿]+/);
  if (pre && pre[0].length < core.length) { const rest = core.slice(pre[0].length), o = t(rest); if (o !== rest) return lead + pre[0] + o + tail; }
  return s;
}
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function build(rows) {
  exact = new Map(); pats = [];
  const col = LANG === "en" ? 1 : 2;
  for (const r of rows) {
    const ja = r[0], tr = r[col]; if (!tr) continue;
    if (!/\{\d+\}/.test(ja)) { exact.set(ja, tr); continue; }
    const ids = [], parts = ja.split(/\{(\d+)\}/);
    let src = "^"; parts.forEach((p, i) => { if (i % 2) { ids.push(+p); src += "([\\s\\S]*?)"; } else src += esc(p); });
    pats.push({ re: new RegExp(src + "$"), ids, out: tr, lit: parts.filter((_, i) => i % 2 === 0).join("").length });
  }
  pats.sort((a, b) => b.lit - a.lit);                       // 文字の多い（具体的な）型を先に
}

// 画面の文字を訳す（入力欄・利用者の書いた文字は除く）
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CANVAS", "SVG"]);
const done = new WeakMap();
function doText(n) {
  const v = n.nodeValue; if (!v || !JP.test(v) || done.get(n) === v) return;
  for (let p = n.parentElement; p; p = p.parentElement) { if (SKIP.has(p.tagName) || p.hasAttribute?.("data-noi18n")) return; }
  const o = t(v); done.set(n, o); if (o !== v) n.nodeValue = o;
}
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
function doEl(el) {
  if (el.nodeType !== 1 || SKIP.has(el.tagName) && el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
  for (const a of ATTRS) { const v = el.getAttribute(a); if (v && JP.test(v)) { const o = t(v); if (o !== v) el.setAttribute(a, o); } }
}
function walk(root) {
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1) return;
  doEl(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === 3 ? doText(n) : doEl(n);
}

// 言語の切りかえ（🎵 音の設定の中と、はじめての人向けに左下の小さな 🌐）
function picker() {
  const box = document.createElement("label"); box.className = "lang-row"; box.setAttribute("data-noi18n", "");
  box.innerHTML = `<span>🌐 ${LANG === "ja" ? "言語" : LANG === "vi" ? "Ngôn ngữ" : "Language"}</span><select>${LANGS.map(([k, n]) => `<option value="${k}"${k === LANG ? " selected" : ""}>${n}</option>`).join("")}</select>`;
  box.querySelector("select").onchange = (e) => setLang(e.target.value);
  return box;
}
export function mountPicker(parent) { if (parent && !parent.querySelector(".lang-row")) parent.appendChild(picker()); }

export async function initI18n() {
  document.documentElement.lang = LANG;
  if (LANG === "ja") return;
  const mod = await import("./lang.js?v=11041008");
  build(mod.default);
  walk(document.documentElement);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
