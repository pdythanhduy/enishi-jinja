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
    if (["ema", "pray", "report"].includes(p[0])) {
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
      me.name = String(m.name || "参拝者").slice(0, 16); me.look = Number(m.look) || 0;
      ws.serializeAttachment(me);
      this.broadcast({ t: "join", ...me, n: this.socks().length }, ws);
    } else if (m.t === "pos") {
      if (now - (me.at || 0) < 150) return;                     // 送信しすぎ防止
      me.x = +m.x || 0; me.z = +m.z || 0; me.ry = +m.ry || 0; me.at = now;
      ws.serializeAttachment(me);
      this.broadcast({ t: "pos", id: me.id, x: me.x, z: me.z, ry: me.ry }, ws);
    } else if (m.t === "act" && ["bow", "clap", "suzu", "kuji", "ema", "report", "pray"].includes(m.a)) {
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
      return Response.json({ ema: rows, report: this.get("report:" + jst()), total: this.get("ema") });
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
    if (what === "report") {
      if (now - (this.last.get(key) || 0) < 3600e3) return Response.json({ ok: true, report: this.get("report:" + jst()) });
      this.inc("report:" + jst()); this.last.set(key, now);
      return Response.json({ ok: true, report: this.get("report:" + jst()) });
    }
    return Response.json({ error: "?" }, { status: 404 });
  }
}
