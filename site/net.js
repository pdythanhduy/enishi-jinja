// みんなの境内：WebSocketで他の参拝者を表示し、ことばを交わす。サーバーに繋がらなくても一人でお参りできる。
export const API = "https://enishi-rooms.thanhduy8vn.workers.dev";
const WS = API.replace(/^http/, "ws");

export function connect({ hall, name, look, onWelcome, onJoin, onPos, onAct, onLeave, onCount, onLook, onEn, onSt, onNope }) {
  let myStatus = "";
  let ws = null, room = 1, alive = true, retry = 0;
  async function pickRoom() {
    try {
      const r = await fetch(`${API}/rooms/${hall}`).then((r) => r.json());
      const open = r.rooms.filter((x) => x.c < r.max);
      // 人がいる部屋を優先（静かすぎない境内に）
      open.sort((a, b) => (b.c > 0) - (a.c > 0) || a.n - b.n);
      return (open[0] || { n: r.rooms.length + 1 }).n;
    } catch { return 1; }
  }
  async function open() {
    if (!alive) return;
    const forced = new URLSearchParams(location.search).get("room");
    room = forced ? +forced : await pickRoom();
    ws = new WebSocket(`${WS}/room/${hall}/${room}`);
    ws.onopen = () => { retry = 0; ws.send(JSON.stringify({ t: "hi", name, look })); if (myStatus) setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ t: "st", kind: "st", text: myStatus })), 9000); };
    clearInterval(open._p); open._p = setInterval(() => ws && ws.readyState === 1 && ws.send('{"t":"ping"}'), 25e3);
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === "welcome") { onWelcome(m, room); onCount(m.n); }
      else if (m.t === "join") { onJoin(m); onCount(m.n); }
      else if (m.t === "pos") onPos(m);
      else if (m.t === "act") onAct(m);
      else if (m.t === "look") onLook?.(m);
      else if (m.t === "en") onEn?.(m);
      else if (m.t === "st") onSt?.(m);
      else if (m.t === "nope") onNope?.();
      else if (m.t === "leave") { onLeave(m); onCount(m.n); }
    };
    ws.onclose = () => { if (!alive) return; retry++; setTimeout(open, Math.min(15000, 1000 * 2 ** retry)); };
  }
  open();
  addEventListener("pagehide", () => { alive = false; try { ws && ws.close(); } catch {} });
  let lastSent = 0, last = "";
  return {
    pos(x, z, ry) {
      const now = performance.now(), k = `${x.toFixed(1)},${z.toFixed(1)},${ry.toFixed(1)}`;
      if (now - lastSent < 200 || k === last || !ws || ws.readyState !== 1) return;
      lastSent = now; last = k; ws.send(JSON.stringify({ t: "pos", x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(2) }));
    },
    act(a, r = "") { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "act", a, r })); },
    st(text, kind = "st") { if (kind === "st") myStatus = text; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "st", kind, text })); },
    rep(to) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "rep", to })); },
    en(to, pid) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "en", to, pid })); },
    // 名前・見た目を変えたとき（再接続のときも新しい値で入る）
    hello(n, l) { name = n; look = l; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "hi", name, look })); },
    get room() { return room; },
    close() { alive = false; ws && ws.close(); },
  };
}

export const board = {
  list: (hall) => fetch(`${API}/ema/${hall}`).then((r) => r.json()),
  post: (hall, cat, text) => fetch(`${API}/ema/${hall}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cat, text }) }).then(async (r) => ({ ok: r.ok, ...(await r.json()) })),
  pray: (hall, id, on) => fetch(`${API}/pray/${hall}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, on }) }),
  light: (hall) => fetch(`${API}/light/${hall}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
  report: (hall) => fetch(`${API}/report/${hall}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.json()),
};
