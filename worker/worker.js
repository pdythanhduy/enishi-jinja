// enishi-rooms: えにし神社のリアルタイム境内 + みんなの絵馬
//  GET  /room/:hall/:n      WebSocket（Durable Object "Room"、1部屋 最大100人）
//  GET  /rooms/:hall        各部屋の人数（ロビー）
//  GET  /ema/:hall          絵馬一覧（新しい順 60件）・今日の当選報告数
//  POST /ema/:hall          {cat,text}            絵馬を奉納
//  POST /pray/:hall         {id,on}               一緒に祈る
//  POST /report/:hall       {}                    当選報告（お礼参り）
//  GET  /ema/:hall?ids=a,b  自分の絵馬に集まった「一緒に祈る」の数
//  POST /presence {key,name,hall}  縁のある人に「境内にいる」と知らせる（key は端末の秘密。公開されるのは pid だけ）
//  GET  /presence?ids=pid,…        縁のある人がいまいるか
//  POST /bless {key,name,to}       縁のある人へ祈りを送る（一日一回）
//  POST /inbox {key}               届いた祈りを受け取る
//  GET  /kenno · POST /kenno {key,name,gan,text} · POST /kenno/light {key}   献灯（みんなの灯りの壁）
const MAX = 100, ROOMS = 30;
const ALLOW = ["https://enishi-jinja.pages.dev", "https://pdythanhduy.github.io", "http://localhost:8766"];
const NG = ["死ね", "殺す", "ころす", "しね", "消えろ", "ブス", "きもい", "キモい", "http", "www.", ".com", "ライン交換", "副業", "稼げる", "儲かる", "裏垢", "パパ活", "セックス", "エロ", "まんこ", "ちんこ", "fuck", "shit"];

const cors = (req) => {
  const o = req.headers.get("Origin") || "";
  return { "Access-Control-Allow-Origin": ALLOW.includes(o) || o.endsWith(".enishi-jinja.pages.dev") ? o : ALLOW[0],
           "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
};
const json = (req, o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...cors(req) } });
const jst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.pathname.split("/").filter(Boolean);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
    const hall = (p[1] || "tosen").replace(/[^a-z]/g, "").slice(0, 12) || "tosen";
    if (p[0] === "room") {
      const n = Math.max(1, Math.min(ROOMS, parseInt(p[2] || "1", 10) || 1));
      return env.ROOM.get(env.ROOM.idFromName(`${hall}-${n}`)).fetch(req);
    }
    if (p[0] === "rooms") {
      const out = [];
      for (let n = 1; n <= ROOMS; n++) {
        const r = await env.ROOM.get(env.ROOM.idFromName(`${hall}-${n}`)).fetch("https://x/count");
        const c = (await r.json()).n; out.push({ n, c });
        if (c < MAX && n >= 3 && out.every((x) => x.c < MAX * 0.8)) break;   // 空きがあれば全部は見ない
      }
      return json(req, { max: MAX, rooms: out });
    }
    if (p[0] === "admin" && req.method === "POST") {
      let b = {}; try { b = await req.json(); } catch {}
      if (!env.ADMIN_KEY || b.key !== env.ADMIN_KEY) return json(req, { error: "forbidden" }, 403);
      if (b.lamp) { const rm = env.REMIND.get(env.REMIND.idFromName("all")); const r = await rm.fetch(new Request("https://x/lamphide", { method: "POST", body: JSON.stringify({ id: b.lamp, admin: env.ADMIN_KEY }) })); return json(req, await r.json(), r.status); }
      const board = env.BOARD.get(env.BOARD.idFromName(hall));
      const r = await board.fetch(new Request("https://x/hide", { method: "POST", body: JSON.stringify({ id: b.id }) }));
      return json(req, await r.json(), r.status);
    }
    if (["remind", "msg", "toku", "festival", "presence", "bless", "inbox", "kenno"].includes(p[0])) {   // 通知・徳（全体で一つ）
      const rm = env.REMIND.get(env.REMIND.idFromName("all"));
      const r = await rm.fetch(new Request(`https://x/${p.join("/")}?ip=${encodeURIComponent(req.headers.get("CF-Connecting-IP") || "")}&${u.searchParams}`,
        { method: req.method, body: req.method === "POST" ? await req.text() : undefined }));
      return json(req, await r.json(), r.status);
    }
    if (["ema", "pray", "report", "light"].includes(p[0])) {
      const board = env.BOARD.get(env.BOARD.idFromName(hall));
      const r = await board.fetch(new Request(`https://x/${p[0]}?ip=${encodeURIComponent(req.headers.get("CF-Connecting-IP") || "")}&${u.searchParams}`,
        { method: req.method, body: req.method === "POST" ? await req.text() : undefined }));
      return json(req, await r.json(), r.status);
    }
    return json(req, { ok: true, service: "enishi-rooms" });
  },
};

// ------------------------------------------------------------------ 境内（WebSocket Hibernation）
export class Room {
  constructor(state) { this.state = state; }
  socks() { return this.state.getWebSockets(); }
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === "/count") return Response.json({ n: this.socks().length });
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    if (this.socks().length >= MAX) return new Response("full", { status: 409 });
    const [client, server] = Object.values(new WebSocketPair());
    const id = crypto.randomUUID().slice(0, 8);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id, name: "", look: 0, x: 0, z: 29, ry: Math.PI, a: "", at: 0, seen: Date.now() });
    // 今いる人を送る
    const others = this.socks().filter((s) => s !== server && s.readyState === 1).map((s) => s.deserializeAttachment()).filter((o) => o && o.name);
    server.send(JSON.stringify({ t: "welcome", id, n: this.socks().length, max: MAX, others }));
    return new Response(null, { status: 101, webSocket: client });
  }
  broadcast(msg, except) { const s = JSON.stringify(msg); for (const w of this.socks()) if (w !== except) { try { w.send(s); } catch {} } }
  async webSocketMessage(ws, raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment() || {};
    const now = Date.now();
    me.seen = now;
    if (m.t === "ping") { ws.serializeAttachment(me); return; }
    if (m.t === "hi") {
      this.prune(now);
      const again = !!me.name;
      let name = String(m.name || "参拝者").replace(/[<>&"'`\\]/g, "").trim().slice(0, 12) || "参拝者";
      if (NG.some((w) => name.toLowerCase().includes(w.toLowerCase()))) name = "参拝者";
      me.name = name;
      me.look = typeof m.look === "string" ? m.look.replace(/[^v0-9.]/g, "").slice(0, 24) : Number(m.look) || 0;
      ws.serializeAttachment(me);
      if (again) this.broadcast({ t: "look", id: me.id, name: me.name, look: me.look }, ws);    // 身支度を変えた
      else this.broadcast({ t: "join", ...me, n: this.socks().length }, ws);
    } else if (m.t === "pos") {
      if (now - (me.at || 0) < 150) return;                     // 送信しすぎ防止
      me.x = +m.x || 0; me.z = +m.z || 0; me.ry = +m.ry || 0; me.at = now;
      ws.serializeAttachment(me);
      this.broadcast({ t: "pos", id: me.id, x: me.x, z: me.z, ry: me.ry }, ws);
    } else if (m.t === "act" && ["bow", "clap", "suzu", "kuji", "ema", "report", "pray", "musubi", "omokaru", "goldfox", "ito", "toro", "say", "emo", "kito", "kenno"].includes(m.a)) {
      if ((m.a === "say" || m.a === "emo") && now - (me.said || 0) < 1500) return;          // 言葉は少し間をあけて
      if (m.a === "say" || m.a === "emo") { me.said = now; ws.serializeAttachment(me); }
      this.broadcast({ t: "act", id: me.id, a: m.a, r: String(m.r || "").slice(0, 4) }, ws);
    } else if (m.t === "st") {                                                             // ひとこと：頭の上の言葉・話す
      const kind = m.kind === "say" ? "say" : "st";
      if (now - (me[kind + "At"] || 0) < (kind === "say" ? 2500 : 8000)) return;
      let text = String(m.text || "").replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, kind === "say" ? 60 : 20);
      if (this.sil?.has(me.id)) { try { ws.send(JSON.stringify({ t: "nope" })); } catch {} return; }   // 通報が集まった人の言葉は届けない
      if (text && NG.some((w) => text.toLowerCase().includes(w.toLowerCase()))) { try { ws.send(JSON.stringify({ t: "nope" })); } catch {} return; }
      if (kind === "say" && !text) return;
      me[kind + "At"] = now; if (kind === "st") me.st = text; ws.serializeAttachment(me);
      this.broadcast({ t: "st", id: me.id, kind, text }, ws);
    } else if (m.t === "rep") {                                                            // 言葉の通報：別々の3人からで、その人の言葉はこの部屋に届かなくなる
      const to = String(m.to || "").slice(0, 16); if (!to || to === me.id) return;
      this.reps ||= new Map(); const s = this.reps.get(to) || new Set(); s.add(me.id); this.reps.set(to, s);
      if (s.size >= 3) (this.sil ||= new Set()).add(to);
    } else if (m.t === "en") {                                                             // 縁：特定の一人へのお辞儀
      if (now - (me.en || 0) < 3000) return; me.en = now; ws.serializeAttachment(me);
      const pid = String(m.pid || "").replace(/[^0-9a-f]/g, "").slice(0, 16);
      for (const w of this.socks()) { const o = w.deserializeAttachment(); if (o && o.id === m.to && w !== ws) { try { w.send(JSON.stringify({ t: "en", from: me.id, name: me.name, look: me.look, pid })); } catch {} } }
    }
  }
  prune(now) {  // 70秒応答のない接続（閉じ忘れ・スリープ）を片付ける
    for (const w of this.socks()) { const a = w.deserializeAttachment(); if (a && a.seen && now - a.seen > 70e3) this.leave(w); }
  }
  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }
  leave(ws) { const me = ws.deserializeAttachment(); try { ws.close(); } catch {} if (me) this.broadcast({ t: "leave", id: me.id, n: this.socks().length - 1 }); }
}

// ------------------------------------------------------------------ 絵馬掛け（SQLite）
export class Board {
  constructor(state) {
    this.state = state; this.sql = state.storage.sql; this.last = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ema (id TEXT PRIMARY KEY, cat TEXT, text TEXT, n INTEGER DEFAULT 0, ts INTEGER, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS stat (k TEXT PRIMARY KEY, v INTEGER)`);
  }
  inc(k) { this.sql.exec(`INSERT INTO stat (k,v) VALUES (?,1) ON CONFLICT(k) DO UPDATE SET v=v+1`, k); }
  get(k) { const r = this.sql.exec(`SELECT v FROM stat WHERE k=?`, k).toArray()[0]; return r ? r.v : 0; }
  async fetch(req) {
    const u = new URL(req.url), what = u.pathname.slice(1), ip = u.searchParams.get("ip") || "";
    if (req.method === "GET") {
      const ids = (u.searchParams.get("ids") || "").split(",").map((x) => x.replace(/[^0-9a-f-]/g, "")).filter(Boolean).slice(0, 30);
      if (ids.length) return Response.json({ mine: this.sql.exec(`SELECT id,n FROM ema WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids).toArray() });
      const rows = this.sql.exec(`SELECT id,cat,text,n,ts FROM ema WHERE hidden=0 ORDER BY ts DESC LIMIT 60`).toArray();
      return Response.json({ ema: rows, report: this.get("report:" + jst()), lights: this.get("light:" + jst()), total: this.get("ema") });
    }
    let b = {}; try { b = await req.json(); } catch {}
    const now = Date.now(), key = what + ip;
    if (what === "ema") {
      if (now - (this.last.get(key) || 0) < 60e3) return Response.json({ error: "少し時間をおいてから奉納してください" }, { status: 429 });
      const text = String(b.text || "").replace(/\s+/g, " ").trim().slice(0, 60);
      const cat = String(b.cat || "").slice(0, 20);
      if (text.length < 2) return Response.json({ error: "願いを書いてください" }, { status: 400 });
      if (NG.some((w) => text.toLowerCase().includes(w.toLowerCase()))) return Response.json({ error: "その言葉は絵馬に書けません" }, { status: 400 });
      const id = crypto.randomUUID().slice(0, 10);
      this.sql.exec(`INSERT INTO ema (id,cat,text,n,ts) VALUES (?,?,?,0,?)`, id, cat, text, now);
      this.inc("ema"); this.last.set(key, now);
      return Response.json({ ok: true, id });
    }
    if (what === "hide") { this.sql.exec(`UPDATE ema SET hidden=1 WHERE id=?`, String(b.id || "")); return Response.json({ ok: true }); }
    if (what === "pray") {
      if (now - (this.last.get(key + b.id) || 0) < 3e3) return Response.json({ ok: true });
      this.sql.exec(`UPDATE ema SET n = MAX(0, n + ?) WHERE id = ?`, b.on ? 1 : -1, String(b.id || ""));
      this.last.set(key + b.id, now);
      return Response.json({ ok: true });
    }
    if (what === "light") {
      if (now - (this.last.get(key) || 0) < 15e3) return Response.json({ ok: true, lights: this.get("light:" + jst()) });
      this.inc("light:" + jst()); this.last.set(key, now);
      return Response.json({ ok: true, lights: this.get("light:" + jst()) });
    }
    if (what === "report") {
      if (now - (this.last.get(key) || 0) < 3600e3) return Response.json({ ok: true, report: this.get("report:" + jst()) });
      this.inc("report:" + jst()); this.last.set(key, now);
      return Response.json({ ok: true, report: this.get("report:" + jst()) });
    }
    return Response.json({ error: "?" }, { status: 404 });
  }
}

// ------------------------------------------------------------------ 通知（絵馬の願いの日）と、境内全体の徳
// 送る push は中身なし（暗号化不要）。端末の service worker が /msg で文面を取りにくる。
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = new TextEncoder();
let VKEY = null;
async function vapidJwt(env, aud) {
  if (!VKEY) VKEY = await crypto.subtle.importKey("jwk", { ...JSON.parse(env.VAPID_PRIVATE_JWK), ext: true }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://pdythanhduy.github.io/enishi-jinja/" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, VKEY, enc.encode(h + "." + c));
  return h + "." + c + "." + b64u(sig);
}
async function webpush(env, endpoint) {
  const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `vapid t=${await vapidJwt(env, new URL(endpoint).origin)}, k=${env.VAPID_PUBLIC}`, TTL: "86400", Urgency: "normal", "Content-Length": "0" } });
  return r.status;
}
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400e3).toISOString().slice(0, 10);
export class Remind {
  constructor(state, env) {
    this.state = state; this.env = env; this.sql = state.storage.sql; this.last = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rem (id TEXT PRIMARY KEY, ep TEXT, day TEXT, kind TEXT, text TEXT, sent INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS msg (ep TEXT PRIMARY KEY, title TEXT, body TEXT, url TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS stat (k TEXT PRIMARY KEY, v INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS pres (pid TEXT PRIMARY KEY, name TEXT, hall TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS inbox (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, frm TEXT, name TEXT, kind TEXT, day TEXT, ts INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS lamp (id TEXT PRIMARY KEY, pid TEXT, name TEXT, gan TEXT, text TEXT, days INTEGER DEFAULT 1, last TEXT, ts INTEGER, hidden INTEGER DEFAULT 0)`);
  }
  inc(k, n = 1) { this.sql.exec(`INSERT INTO stat (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=v+?`, k, n, n); }
  get(k) { const r = this.sql.exec(`SELECT v FROM stat WHERE k=?`, k).toArray()[0]; return r ? r.v : 0; }
  async arm() {     // 毎日 8:00 JST（= 23:00 UTC）に起きる
    const now = Date.now(), d = new Date(now); let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 0, 0);
    if (t <= now) t += 86400e3; const cur = await this.state.storage.getAlarm(); if (!cur || cur > t) await this.state.storage.setAlarm(t);
  }
  async alarm() {
    const day = jst();
    const due = this.sql.exec(`SELECT id, ep, kind, text FROM rem WHERE sent=0 AND day<=?`, day).toArray();
    for (const r of due) {
      const title = r.kind === "day" ? "🌸 今日は願いの日です" : "⛩ その後、いかがでしたか";
      const body = r.kind === "day" ? `「${r.text}」\nえにし神社から、そっと応援しています。いってらっしゃい。` : `「${r.text}」の結果はどうでしたか？よかったら、お礼参りに来てください。`;
      this.sql.exec(`INSERT OR REPLACE INTO msg (ep,title,body,url,ts) VALUES (?,?,?,?,?)`, r.ep, title, body, "./?from=remind", Date.now());
      let st = 0; try { st = await webpush(this.env, r.ep); } catch {}
      this.sql.exec(`UPDATE rem SET sent=? WHERE id=?`, st === 404 || st === 410 ? 2 : 1, r.id);
    }
    this.sql.exec(`DELETE FROM rem WHERE sent>0 AND day < ?`, addDays(day, -30));
    await this.arm();
  }
  async fetch(req) {
    const u = new URL(req.url), what = u.pathname.slice(1), ip = u.searchParams.get("ip") || "";
    let b = {}; if (req.method === "POST") { try { b = await req.json(); } catch {} }   // ip は将来の制限用
    if (what === "remind") {
      const ep = String(b.endpoint || ""), day = String(b.day || ""), text = String(b.text || "").slice(0, 60);
      if (!/^https:\/\//.test(ep) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return Response.json({ error: "bad" }, { status: 400 });
      if (day < jst() || day > addDays(jst(), 400)) return Response.json({ error: "日付を確かめてください" }, { status: 400 });
      const n = this.sql.exec(`SELECT COUNT(*) AS c FROM rem WHERE ep=? AND sent=0`, ep).toArray()[0].c; if (n >= 10) return Response.json({ error: "通知は10件までです" }, { status: 429 });
      const id = crypto.randomUUID().slice(0, 12);
      this.sql.exec(`INSERT INTO rem (id,ep,day,kind,text) VALUES (?,?,?,?,?)`, id + "d", ep, day, "day", text);
      this.sql.exec(`INSERT INTO rem (id,ep,day,kind,text) VALUES (?,?,?,?,?)`, id + "a", ep, addDays(day, 3), "after", text);
      await this.arm(); return Response.json({ ok: true });
    }
    if (what === "msg") {
      const r = this.sql.exec(`SELECT title, body, url FROM msg WHERE ep=?`, String(b.endpoint || "")).toArray()[0];
      return Response.json(r || { title: "えにし神社", body: "境内でお待ちしています。", url: "./" });
    }
    if (what === "toku") {     // 境内全体の今日の徳（POST {n} で加算）
      const k = "toku:" + jst();
      if (req.method === "POST") { const now = Date.now(); if (now - (this.last.get(ip) || 0) > 1500) { this.inc(k, Math.max(1, Math.min(5, Math.round(+b.n || 1)))); this.last.set(ip, now); } }
      return Response.json({ toku: this.get(k), goal: FEST_GOAL });
    }
    if (what === "festival") return Response.json({ toku: this.get("toku:" + jst()), goal: FEST_GOAL });
    if (what === "lamphide") { if (!this.env.ADMIN_KEY || b.admin !== this.env.ADMIN_KEY) return Response.json({ error: "forbidden" }, { status: 403 }); this.sql.exec(`UPDATE lamp SET hidden=1 WHERE id=?`, String(b.id || "")); return Response.json({ ok: true }); }
    // ---- 縁・献灯：端末の秘密 key から公開用の pid をつくる（key 自体は保存しない）
    const key = String(b.key || "").replace(/[^0-9a-f]/g, "");
    const pidOf = async (k) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode("enishi:" + k)))].slice(0, 8).map((x) => x.toString(16).padStart(2, "0")).join("");
    const cleanName = (t, n) => { let x = String(t || "").replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, n); return NG.some((w) => x.toLowerCase().includes(w.toLowerCase())) ? "" : x; };
    const slow = (k, ms) => { const now = Date.now(), t = this.last.get(k) || 0; if (now - t < ms) return true; this.last.set(k, now); return false; };
    if (what === "presence" && req.method === "GET") {
      const ids = (u.searchParams.get("ids") || "").split(",").map((x) => x.replace(/[^0-9a-f]/g, "")).filter(Boolean).slice(0, 60);
      if (!ids.length) return Response.json({ people: [] });
      const rows = this.sql.exec(`SELECT pid,name,hall,ts FROM pres WHERE pid IN (${ids.map(() => "?").join(",")})`, ...ids).toArray();
      const now = Date.now();
      return Response.json({ people: rows.map((r) => ({ pid: r.pid, name: r.name, hall: r.hall, on: now - r.ts < 150e3, ago: Math.round((now - r.ts) / 60e3) })) });
    }
    if (what === "kenno" && req.method === "GET") {
      const rows = this.sql.exec(`SELECT id,pid,name,gan,text,days,ts FROM lamp WHERE hidden=0 ORDER BY ts DESC LIMIT 240`).toArray();
      return Response.json({ lamps: rows, total: this.sql.exec(`SELECT COUNT(*) AS c FROM lamp WHERE hidden=0`).toArray()[0].c });
    }
    if (key.length < 24) return Response.json({ error: "key" }, { status: 400 });
    const pid = await pidOf(key);
    if (what === "presence") {
      if (!slow("p" + pid, 20e3)) this.sql.exec(`INSERT INTO pres (pid,name,hall,ts) VALUES (?,?,?,?) ON CONFLICT(pid) DO UPDATE SET name=excluded.name, hall=excluded.hall, ts=excluded.ts`, pid, cleanName(b.name, 12) || "参拝者", String(b.hall || "").replace(/[^a-z]/g, "").slice(0, 12), Date.now());
      return Response.json({ pid });
    }
    if (what === "bless") {
      const to = String(b.to || "").replace(/[^0-9a-f]/g, "").slice(0, 16), day = jst();
      if (!to || to === pid) return Response.json({ error: "bad" }, { status: 400 });
      if (this.sql.exec(`SELECT COUNT(*) AS c FROM inbox WHERE pid=? AND frm=? AND day=?`, to, pid, day).toArray()[0].c) return Response.json({ ok: true, already: true });
      if (this.sql.exec(`SELECT COUNT(*) AS c FROM inbox WHERE pid=?`, to).toArray()[0].c >= 60) return Response.json({ ok: true, full: true });
      this.sql.exec(`INSERT INTO inbox (pid,frm,name,kind,day,ts) VALUES (?,?,?,?,?,?)`, to, pid, cleanName(b.name, 12) || "参拝者", "pray", day, Date.now());
      return Response.json({ ok: true });
    }
    if (what === "inbox") {
      const rows = this.sql.exec(`SELECT frm,name,kind,day,ts FROM inbox WHERE pid=? ORDER BY ts`, pid).toArray();
      this.sql.exec(`DELETE FROM inbox WHERE pid=?`, pid);
      return Response.json({ pid, msgs: rows });
    }
    if (what === "kenno/light") {                                                    // 今日も自分の灯りに火を足す
      const day = jst(), rows = this.sql.exec(`SELECT id FROM lamp WHERE pid=? AND hidden=0 AND (last IS NULL OR last<?)`, pid, day).toArray();
      for (const r of rows) this.sql.exec(`UPDATE lamp SET days=days+1, last=? WHERE id=?`, day, r.id);
      return Response.json({ ok: true, lit: rows.length });
    }
    if (what === "kenno" && req.method === "POST") {
      if (slow("k" + pid, 10e3)) return Response.json({ error: "少し時間をおいてください" }, { status: 429 });
      const day = jst();
      if (this.sql.exec(`SELECT COUNT(*) AS c FROM lamp WHERE pid=? AND ts>?`, pid, Date.now() - 86400e3).toArray()[0].c >= 1) return Response.json({ error: "献灯は一日にひとつです。明日また灯してください" }, { status: 429 });
      const text = cleanName(b.text, 16), name = cleanName(b.name, 12) || "参拝者", gan = cleanName(b.gan, 8);
      if (String(b.text || "").trim() && !text) return Response.json({ error: "その言葉は書けません" }, { status: 400 });
      const id = crypto.randomUUID().slice(0, 10);
      this.sql.exec(`INSERT INTO lamp (id,pid,name,gan,text,days,last,ts) VALUES (?,?,?,?,?,1,?,?)`, id, pid, name, gan, text, day, Date.now());
      return Response.json({ ok: true, id, pid });
    }
    return Response.json({ error: "?" }, { status: 404 });
  }
}
const FEST_GOAL = 300;   // 一日の徳がここに届くと夜祭り
