// enishi-rooms: えにし神社のリアルタイム境内 + みんなの絵馬
//  GET  /room/:hall/:n      WebSocket（Durable Object "Room"、1部屋 最大100人）
//  GET  /rooms/:hall        各部屋の人数（ロビー）
//  GET  /ema/:hall          絵馬一覧（新しい順 60件）・今日の当選報告数
//  POST /ema/:hall          {cat,text}            絵馬を奉納
//  POST /pray/:hall         {id,on}               一緒に祈る
//  POST /report/:hall       {}                    当選報告（お礼参り）
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
      const board = env.BOARD.get(env.BOARD.idFromName(hall));
      const r = await board.fetch(new Request("https://x/hide", { method: "POST", body: JSON.stringify({ id: b.id }) }));
      return json(req, await r.json(), r.status);
    }
    if (p[0] === "remind" || p[0] === "msg" || p[0] === "toku" || p[0] === "festival") {   // 通知・徳（全体で一つ）
      const rm = env.REMIND.get(env.REMIND.idFromName("all"));
      const r = await rm.fetch(new Request(`https://x/${p[0]}?ip=${encodeURIComponent(req.headers.get("CF-Connecting-IP") || "")}`,
        { method: req.method, body: req.method === "POST" ? await req.text() : undefined }));
      return json(req, await r.json(), r.status);
    }
    if (["ema", "pray", "report", "light"].includes(p[0])) {
      const board = env.BOARD.get(env.BOARD.idFromName(hall));
      const r = await board.fetch(new Request(`https://x/${p[0]}?ip=${encodeURIComponent(req.headers.get("CF-Connecting-IP") || "")}`,
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
    } else if (m.t === "act" && ["bow", "clap", "suzu", "kuji", "ema", "report", "pray", "musubi", "omokaru", "goldfox"].includes(m.a)) {
      this.broadcast({ t: "act", id: me.id, a: m.a, r: String(m.r || "").slice(0, 4) }, ws);
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
    let b = {}; if (req.method === "POST") { try { b = await req.json(); } catch {} }
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
    return Response.json({ error: "?" }, { status: 404 });
  }
}
const FEST_GOAL = 300;   // 一日の徳がここに届くと夜祭り
