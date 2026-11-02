// 御朱印帳と御守り：絵はすべて Canvas で描く（墨の文字・朱の印）。端末に保存。
const KEY_G = "enishi_goshuin", KEY_O = "enishi_omamori";
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const KANJI = "〇一二三四五六七八九";
const kanjiNum = (n) => { if (n <= 10) return n === 10 ? "十" : KANJI[n]; if (n < 20) return "十" + KANJI[n - 10]; const t = Math.floor(n / 10), o = n % 10; return KANJI[t] + "十" + (o ? KANJI[o] : ""); };
export const jst = () => new Date(Date.now() + 9 * 3600e3);
export function wareki(d = jst()) { const y = d.getUTCFullYear() - 2018, m = d.getUTCMonth() + 1, day = d.getUTCDate(); return `令和${kanjiNum(y)}年${kanjiNum(m)}月${kanjiNum(day)}日`; }
const ymd = (d = jst()) => d.toISOString().slice(0, 10);

// 社ごとの御朱印（name: 中央の墨書、seal: 朱印の文字、mark: 小さな印）
export const SHUIN = {
  tosen:    { title: "当選の社", ink: "当選社", seal: "えにし神社", mark: "灯" },
  enmusubi: { title: "縁結びの社", ink: "縁結社", seal: "えにし神社", mark: "結" },
  gokaku:   { title: "合格の社", ink: "合格社", seal: "えにし神社", mark: "梅" },
  okunoin:  { title: "奥の院", ink: "奥之院", seal: "えにし神社", mark: "月" },
};
// 限定の印（日付で決まる）
export function limitedFor(d = jst()) {
  const m = d.getUTCMonth() + 1, day = d.getUTCDate(), out = [];
  if (day === 1) out.push({ id: "tsuitachi", name: "朔日参り", color: "#b8321e" });
  if (day === 15) out.push({ id: "jugoya", name: "月次祭", color: "#b8321e" });
  if (m === 11 && day === 15) out.push({ id: "shichigosan", name: "七五三", color: "#c0392b" });
  if (m === 1 && day <= 7) out.push({ id: "hatsumode", name: "初詣", color: "#c0392b" });
  if (m === 2 && day === 3) out.push({ id: "setsubun", name: "節分", color: "#3b6db0" });
  if (m === 7 && day === 7) out.push({ id: "tanabata", name: "七夕", color: "#3b6db0" });
  const season = m >= 3 && m <= 5 ? ["桜", "#d9668a"] : m >= 6 && m <= 8 ? ["青葉", "#3d8a4a"] : m >= 9 && m <= 11 ? ["紅葉", "#c8471f"] : ["雪", "#5a7aa8"];
  out.push({ id: "season_" + season[0], name: season[0], color: season[1], seasonal: true });
  return out;
}

// ------------------------------------------------------------------ 御朱印を描く
export function drawShuin(entry, w = 360, h = 520) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  const S = SHUIN[entry.hall];
  // 和紙
  x.fillStyle = "#f6efdf"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(150,120,80,${Math.random() * 0.05})`; x.fillRect(Math.random() * w, Math.random() * h, Math.random() * 2.5, Math.random() * 2.5); }
  x.strokeStyle = "rgba(120,90,60,.25)"; x.lineWidth = 2; x.strokeRect(10, 10, w - 20, h - 20);
  const ink = "#1a1612", font = (px, b = "") => `${b} ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
  const vtext = (str, cx, top, px, gap = 1.08, col = ink, bold = "") => { x.fillStyle = col; x.font = font(px, bold); x.textAlign = "center"; x.textBaseline = "top"; [...str].forEach((ch, i) => x.fillText(ch, cx + (Math.random() - 0.5) * 2, top + i * px * gap)); };
  // 右上「奉拝」・左下 日付
  vtext("奉拝", w - 52, 34, 34);
  vtext(entry.date, 46, 118, 21, 1.02);
  // 朱印（大きな角印）
  const sealR = 88; x.save(); x.translate(w / 2, h / 2 - 4); x.rotate((Math.random() - 0.5) * 0.06);
  x.fillStyle = "rgba(196,40,28,.86)"; x.strokeStyle = "rgba(196,40,28,.9)"; x.lineWidth = 6;
  x.strokeRect(-sealR, -sealR, sealR * 2, sealR * 2); x.lineWidth = 2; x.strokeRect(-sealR + 9, -sealR + 9, sealR * 2 - 18, sealR * 2 - 18);
  x.font = font(30, "bold"); x.textAlign = "center"; x.textBaseline = "middle";
  const st = S.seal; const half = Math.ceil(st.length / 2);
  [...st.slice(0, half)].forEach((ch, i) => x.fillText(ch, 26, -52 + i * 35)); [...st.slice(half)].forEach((ch, i) => x.fillText(ch, -26, -52 + i * 35));
  x.restore();
  // 中央の墨書（印の上に重ねる）
  vtext(S.ink, w / 2, 96, 66, 1.05, ink, "bold");
  // 小さな印（社の印）
  x.save(); x.translate(w / 2 + 92, 150); x.fillStyle = "rgba(196,40,28,.85)"; x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#f6efdf"; x.font = font(26, "bold"); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(S.mark, 0, 2); x.restore();
  // 限定印
  (entry.limited || []).forEach((L, i) => { x.save(); x.translate(64 + i * 8, h - 92 - i * 66); x.rotate(-0.12); x.strokeStyle = L.color; x.fillStyle = L.color; x.lineWidth = 3;
    x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.stroke(); x.font = font(L.name.length > 2 ? 16 : 22, "bold"); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(L.name, 0, 1); x.restore(); });
  return c;
}

// ------------------------------------------------------------------ 御守り
export const OMAMORI = [
  { id: "tosen", name: "当選守", kanji: "当選守", color: "#c8321f", pat: "#e8b23a", desc: "抽選・チケット・ポケカ。待つ時間に、そっと寄り添うお守り。" },
  { id: "enmusubi", name: "縁結守", kanji: "縁結守", color: "#d96aa0", pat: "#fff0f6", desc: "良いご縁が結ばれますように。" },
  { id: "gokaku", name: "合格守", kanji: "合格守", color: "#2c5aa0", pat: "#e8c67a", desc: "試験・資格・面接。積み重ねた努力が実りますように。" },
  { id: "kenko", name: "健康守", kanji: "健康守", color: "#3d8a4a", pat: "#f2e2c4", desc: "心と体が健やかでありますように。" },
  { id: "kotsu", name: "交通安全守", kanji: "交通安全", color: "#e0a020", pat: "#ffffff", desc: "旅や毎日の道のりが無事でありますように。" },
  { id: "kazoku", name: "家族守", kanji: "家内安全", color: "#6a4c93", pat: "#e8c67a", desc: "遠く離れていても、家族が元気でありますように。" },
];
export function drawOmamori(o, w = 200, h = 300) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.fillStyle = "rgba(0,0,0,0)"; x.fillRect(0, 0, w, h);
  // 紐
  x.strokeStyle = o.pat; x.lineWidth = 6; x.beginPath(); x.moveTo(w / 2 - 14, 38); x.bezierCurveTo(w / 2 - 30, 0, w / 2 + 30, 0, w / 2 + 14, 38); x.stroke();
  // 袋（錦）
  const top = 40, R = 26; x.fillStyle = o.color; x.beginPath(); x.moveTo(24 + R, top); x.lineTo(w - 24 - R, top); x.quadraticCurveTo(w - 24, top, w - 24, top + R);
  x.lineTo(w - 24, h - 20); x.lineTo(24, h - 20); x.lineTo(24, top + R); x.quadraticCurveTo(24, top, 24 + R, top); x.fill();
  x.save(); x.clip(); x.strokeStyle = o.pat; x.globalAlpha = 0.35; x.lineWidth = 2;   // 亀甲（六角）模様
  for (let yy = top; yy < h; yy += 22) for (let xx = 10; xx < w; xx += 26) { x.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; x.lineTo(xx + ((yy / 22) % 2 ? 13 : 0) + Math.cos(a) * 10, yy + Math.sin(a) * 10); } x.closePath(); x.stroke(); }
  x.restore();
  // 結び目
  x.fillStyle = o.pat; x.beginPath(); x.ellipse(w / 2, top + 10, 18, 10, 0, 0, Math.PI * 2); x.fill();
  // 題字（白い札）
  x.fillStyle = "#f6efdf"; x.fillRect(w / 2 - 26, top + 38, 52, h - top - 80);
  x.fillStyle = "#1a1612"; x.font = `bold 30px "Hiragino Mincho ProN","Yu Mincho",serif`; x.textAlign = "center"; x.textBaseline = "top";
  [...o.kanji].forEach((ch, i) => x.fillText(ch, w / 2, top + 50 + i * 36));
  x.fillStyle = o.color; x.font = `14px serif`; x.fillText("えにし神社", w / 2, h - 46);
  return c;
}

// ------------------------------------------------------------------ 保存
export const book = {
  goshuin: () => load(KEY_G),
  addGoshuin(hall) {
    const list = load(KEY_G), today = ymd();
    if (list.some((e) => e.hall === hall && e.day === today)) return null;
    const lim = limitedFor().filter((L) => L.seasonal ? !list.some((e) => (e.limited || []).some((x) => x.id === L.id) && e.hall === hall) : true);
    const entry = { hall, day: today, date: wareki(), limited: lim };
    list.push(entry); save(KEY_G, list); return entry;
  },
  omamori: () => load(KEY_O),
  addOmamori(id) {
    const list = load(KEY_O).filter((x) => x.id !== id || new Date(x.until) < new Date());
    const until = new Date(Date.now() + 365 * 86400e3).toISOString().slice(0, 10);
    list.push({ id, from: ymd(), until }); save(KEY_O, list); return { id, until };
  },
  returnOmamori(id) { save(KEY_O, load(KEY_O).filter((x) => x.id !== id)); },
};
