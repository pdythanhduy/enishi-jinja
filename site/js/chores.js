// 境内のお手伝い：手を動かして、気持ちよく、徳を積む。
// ・落ち葉掃き：ほうきで落ち葉を塵取りへ。サッと集まる気持ちよさ、葉の下の小さな見つけもの
// ・狛狐を磨く／手水鉢を洗う／打ち水（冬は雪かき）：こすって、きれいになっていく
// ・草むしり：ぽんっと抜ける。花は残す
// どれも一日一回ずつ（落ち葉は何度でも）。制限時間はなく、急がなくていい。
const rnd = (a, b) => a + Math.random() * (b - a);
const LEAF_COL = ["#d8402a", "#e86a2a", "#f0a030", "#c8281e", "#e8b43a", "#b84a20", "#f3c34a"];

export const CHORES = [
  { id: "fox0", kind: "rub", art: "fox", label: "🧽 狛狐を磨く", at: [-5.5, 19.6], r: 2.4, title: "狛狐を磨く", hint: "なでるように、苔とほこりを落としましょう" },
  { id: "fox1", kind: "rub", art: "fox", label: "🧽 狛狐を磨く", at: [5.5, 19.6], r: 2.4, title: "狛狐を磨く", hint: "なでるように、苔とほこりを落としましょう", flip: true },
  { id: "chozu", kind: "rub", art: "basin", label: "🪣 手水鉢を洗う", at: [13.8, 33.2], r: 1.8, title: "手水鉢を洗う", hint: "鉢の苔と落ち葉を、たわしでこすって" },
  { id: "uchimizu", kind: "rub", art: "path", label: "💧 打ち水をする", at: [0, 53], r: 2.5, title: "打ち水", hint: "柄杓で水をまいて、参道を涼しく清めます", winter: { art: "snow", label: "❄ 雪かきをする", title: "雪かき", hint: "参道の雪を、スコップでよけましょう" } },
  { id: "kusa", kind: "weed", label: "🌱 草むしりをする", at: [36.5, -11], r: 2.6, title: "草むしり", hint: "雑草をタップして抜きます。お花は残してね" },
];

export function setupChores(A) {
  const done = () => { const m = A.store.get("enishi_chores", {}); return m.day === A.today() ? m : { day: A.today() }; };
  const mark = (id) => { const m = done(); m[id] = 1; A.store.set("enishi_chores", m); };
  const winter = () => A.season() === "winter";
  const spec = (c) => (winter() && c.winter ? { ...c, ...c.winter } : c);

  // ---------------------------------------------------------------- 共通の画面
  const ov = document.createElement("section"); ov.className = "modal mg"; ov.hidden = true;
  ov.innerHTML = `<div class="sheet"><p class="kicker">OTETSUDAI</p><h2 class="mg-t"></h2><p class="sub mg-h"></p>
    <div class="mg-stage"><canvas width="400" height="400"></canvas><div class="mg-fx"></div></div>
    <div class="mg-bar"><i></i></div><div class="row"><span class="sub mg-n"></span><button type="button" class="btn mg-x">やめる</button></div></div>`;
  document.body.appendChild(ov);
  const cv = ov.querySelector("canvas"), cx = cv.getContext("2d"), fx = ov.querySelector(".mg-fx"), bar = ov.querySelector(".mg-bar i");
  // スマホ：なぞっても画面がスクロール・拡大しないように（iPhone の Safari は touch-action だけでは止まらないことがある）
  for (const ev of ["touchstart", "touchmove"]) cv.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  ov.addEventListener("touchmove", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  const W = 400, H = 400;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  function pop(x, y, text, cls = "") {   // 浮かぶ文字・きらきら
    const r = cv.getBoundingClientRect(), s = document.createElement("span"); s.className = `mg-pop ${cls}`; s.textContent = text;
    s.style.left = `${(x / W) * r.width}px`; s.style.top = `${(y / H) * r.height}px`; fx.appendChild(s); setTimeout(() => s.remove(), 1100);
  }
  function open(title, hint) { ov.querySelector(".mg-t").textContent = title; ov.querySelector(".mg-h").textContent = hint; bar.style.width = "0%"; ov.querySelector(".mg-n").textContent = ""; fx.innerHTML = ""; ov.hidden = false; }
  let stop = null;
  ov.querySelector(".mg-x").onclick = () => stop?.(false);

  // ---------------------------------------------------------------- 音
  function rustle(vol = 0.06, f = 3200, dur = 0.12, type = "highpass") { A.noise?.(dur, f + rnd(-400, 400), vol, type); }
  function plink(n) { A.tone?.([[880 * Math.pow(1.06, Math.min(n, 12)), 0.3]], 0.35, 0.05); }

  // ---------------------------------------------------------------- 落ち葉掃き
  function leafPath(c, t, s) {
    c.beginPath();
    if (t === 0) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.42 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }   // 紅葉
    else if (t === 1) { c.moveTo(0, s * 0.7); c.lineTo(-s * 0.9, -s * 0.35); c.quadraticCurveTo(0, -s * 1.05, s * 0.9, -s * 0.35); c.closePath(); }                         // 銀杏
    else { c.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2); }                                                                                                                 // 葉
  }
  function sweepGame({ find, onStroke }) {
    return new Promise((resolve) => {
      open("落ち葉を掃く", "ほうきで落ち葉を、右下の塵取りへ。サッ、サッと。");
      const N = 40, PAN = { x: 336, y: 338, r: 52 };
      const floor = document.createElement("canvas"); floor.width = W; floor.height = H; const fc = floor.getContext("2d");
      fc.fillStyle = "#8d8778"; fc.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 50) for (let x = (y / 50) % 2 ? -25 : 0; x < W; x += 50) { fc.fillStyle = `hsl(40,6%,${50 + Math.random() * 8}%)`; fc.fillRect(x + 2, y + 2, 46, 46); }
      for (let i = 0; i < 300; i++) { fc.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; fc.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      const item = find && find.id !== "none" ? { x: rnd(60, 260), y: rnd(60, 260), got: false, f: find } : null;
      const leaves = [];
      for (let i = 0; i < N; i++) {
        const near = item && i < 9, x = near ? item.x + rnd(-28, 28) : rnd(20, 300), y = near ? item.y + rnd(-28, 28) : rnd(20, 300);
        leaves.push({ x, y, vx: 0, vy: 0, rot: rnd(0, 6.3), vr: 0, s: rnd(13, 20), t: Math.floor(rnd(0, 3)), c: LEAF_COL[i % LEAF_COL.length], z: rnd(0, 1), in: false, a: 1 });
      }
      let got = 0, pile = 0, down = false, last = null, brush = { x: -99, y: -99, ang: 0 }, lastSound = 0, streak = 0, streakT = 0, raf = 0, finished = false;
      const count = () => { ov.querySelector(".mg-n").textContent = `${got} / ${N} 枚`; bar.style.width = `${(got / N) * 100}%`; };
      count();
      function draw() {
        cx.drawImage(floor, 0, 0);
        // 塵取り
        cx.save(); cx.translate(PAN.x, PAN.y); cx.rotate(-0.6); cx.fillStyle = "#5a4a32"; cx.fillRect(-46, -30, 92, 60); cx.fillStyle = "#73603f"; cx.fillRect(-42, -26, 84, 52);
        cx.fillStyle = "#3a2e20"; cx.fillRect(40, -6, 34, 12); cx.restore();
        for (let i = 0; i < Math.min(pile, 40); i++) { const a = i * 2.4, r = 6 + (i % 7) * 3; cx.save(); cx.translate(PAN.x + Math.cos(a) * r * 0.9, PAN.y + Math.sin(a) * r * 0.5 - i * 0.25); cx.rotate(a); cx.fillStyle = LEAF_COL[i % LEAF_COL.length]; leafPath(cx, i % 3, 9); cx.fill(); cx.restore(); }
        cx.fillStyle = "rgba(255,255,255,.75)"; cx.font = "bold 14px sans-serif"; cx.textAlign = "center"; if (pile < 3) cx.fillText("ここへ", PAN.x - 6, PAN.y - 44);
        // 見つけもの（葉の下）
        if (item && !item.got) {
          const hidden = leaves.some((l) => !l.in && Math.hypot(l.x - item.x, l.y - item.y) < 24);
          cx.font = "28px serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
          if (!hidden) { const p = 0.5 + 0.5 * Math.sin(performance.now() / 160); cx.fillStyle = `rgba(255,236,170,${0.25 + p * 0.35})`; cx.beginPath(); cx.arc(item.x, item.y, 22 + p * 4, 0, 7); cx.fill(); }
          cx.fillText(item.f.icon, item.x, item.y); item.visible = !hidden;
        }
        for (const l of leaves) { if (l.a <= 0) continue; cx.save(); cx.globalAlpha = l.a; cx.translate(l.x + 2, l.y + 3); cx.rotate(l.rot); cx.fillStyle = "rgba(0,0,0,.18)"; leafPath(cx, l.t, l.s); cx.fill(); cx.restore();
          cx.save(); cx.globalAlpha = l.a; cx.translate(l.x, l.y); cx.rotate(l.rot); cx.fillStyle = l.c; leafPath(cx, l.t, l.s); cx.fill(); cx.strokeStyle = "rgba(80,30,10,.35)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(0, -l.s * 0.8); cx.lineTo(0, l.s * 0.8); cx.stroke(); cx.restore(); }
        // ほうき
        if (brush.x > -50) { cx.save(); cx.translate(brush.x, brush.y); cx.rotate(brush.ang); cx.strokeStyle = "#c9a46a"; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(0, -10); cx.lineTo(0, -70); cx.stroke();
          cx.fillStyle = "#b8964a"; cx.beginPath(); cx.moveTo(-26, 8); cx.lineTo(26, 8); cx.lineTo(12, -12); cx.lineTo(-12, -12); cx.closePath(); cx.fill();
          cx.strokeStyle = "#8a6a2a"; cx.lineWidth = 1.5; for (let i = -24; i <= 24; i += 4) { cx.beginPath(); cx.moveTo(i * 0.5, -10); cx.lineTo(i, 10); cx.stroke(); } cx.restore(); }
      }
      function step() {
        const now = performance.now();
        if (Math.random() < 0.004) { const wx = rnd(-0.6, 0.6); for (const l of leaves) if (!l.in) { l.vx += wx * (0.5 + l.z); l.vr += rnd(-0.03, 0.03); } }   // そよ風
        for (const l of leaves) {
          if (l.in) { l.a -= 0.06; continue; }
          l.x += l.vx; l.y += l.vy; l.vx *= 0.9; l.vy *= 0.9; l.rot += l.vr; l.vr *= 0.93;
          if (l.x < 8) { l.x = 8; l.vx = Math.abs(l.vx) * 0.5; } if (l.x > W - 8) { l.x = W - 8; l.vx = -Math.abs(l.vx) * 0.5; }
          if (l.y < 8) { l.y = 8; l.vy = Math.abs(l.vy) * 0.5; } if (l.y > H - 8) { l.y = H - 8; l.vy = -Math.abs(l.vy) * 0.5; }
          if (Math.hypot(l.x - PAN.x, l.y - PAN.y) < PAN.r) {
            l.in = true; got++; pile++; streak = now - streakT < 900 ? streak + 1 : 1; streakT = now; plink(streak); count();
            if (streak === 4) pop(PAN.x - 40, PAN.y - 70, "サッ！"); if (streak === 8) pop(PAN.x - 50, PAN.y - 80, "気持ちいい！", "big"); if (streak === 14) pop(PAN.x - 60, PAN.y - 90, "見事！", "big");
          }
        }
        draw();
        if (!finished && got >= N * 0.88) finish();
        raf = requestAnimationFrame(step);
      }
      function finish() {
        finished = true; for (const l of leaves) if (!l.in) { l.vx = (PAN.x - l.x) * 0.08; l.vy = (PAN.y - l.y) * 0.08; }
        A.chime?.(); pop(W / 2 - 70, H / 2 - 20, "きれいになりました", "big");
        setTimeout(() => end(true), 1500);
      }
      function end(ok) {
        cancelAnimationFrame(raf); cv.onpointerdown = cv.onpointermove = cv.onpointerup = null; stop = null; ov.hidden = true;
        resolve({ ok, found: ok && item ? true : !!item?.got, item: item?.f || null, n: got });
      }
      stop = end;
      cv.onpointerdown = (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; last = pt(e); brush.x = last[0]; brush.y = last[1];
        if (item && !item.got && item.visible && Math.hypot(last[0] - item.x, last[1] - item.y) < 26) { item.got = true; A.tone?.([[1318, 0.3], [1760, 0.25], [2637, 0.15]], 1.0, 0.07); pop(item.x - 20, item.y - 30, `${item.f.icon} 見つけた！`, "big"); } };
      cv.onpointermove = (e) => {
        e.preventDefault();
        const p = pt(e); brush.x = p[0]; brush.y = p[1]; if (!down || !last) return;
        const dx = p[0] - last[0], dy = p[1] - last[1], d = Math.hypot(dx, dy); if (d < 1) return;
        brush.ang += (Math.atan2(dx, -dy) * 0.25 - brush.ang) * 0.3; let hit = 0;
        for (const l of leaves) { if (l.in) continue; const dist = Math.hypot(l.x - p[0], l.y - p[1]); if (dist < 56) { const k = 1 - dist / 56; l.vx += dx * 0.32 * k + rnd(-0.6, 0.6); l.vy += dy * 0.32 * k + rnd(-0.6, 0.6); l.vr += rnd(-0.25, 0.25) * k; hit++; } }
        const now = performance.now();
        if (d > 6 && now - lastSound > 75) { lastSound = now; rustle(Math.min(0.09, 0.025 + hit * 0.007), 2600 + hit * 60); if (hit) onStroke?.(); if (d > 22 && hit > 3 && Math.random() < 0.25) pop(p[0], p[1] - 20, "ザッ", "soft"); }
        last = p;
      };
      cv.onpointerup = cv.onpointercancel = () => { down = false; last = null; };
      step();
    });
  }

  // ---------------------------------------------------------------- こすってきれいに（狛狐・手水鉢・打ち水・雪かき）
  const ART = {
    fox(c, flip) {
      c.fillStyle = "#3a4a3a"; c.fillRect(0, 0, W, H); const g = c.createRadialGradient(200, 160, 40, 200, 220, 280); g.addColorStop(0, "#6a7a6a"); g.addColorStop(1, "#2c362c"); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.save(); if (flip) { c.translate(W, 0); c.scale(-1, 1); }
      c.fillStyle = "#8f8a80"; c.fillRect(110, 320, 180, 50); c.fillStyle = "#a39e94"; c.fillRect(100, 310, 200, 16);   // 台座
      const st = "#e6e2da"; c.fillStyle = st;
      c.beginPath(); c.ellipse(205, 250, 70, 70, 0, 0, 7); c.fill();                                    // 胴
      c.beginPath(); c.moveTo(250, 290); c.quadraticCurveTo(330, 280, 300, 170); c.quadraticCurveTo(290, 230, 250, 250); c.fill();   // 尾
      c.beginPath(); c.ellipse(185, 150, 52, 46, 0, 0, 7); c.fill();                                   // 頭
      c.beginPath(); c.moveTo(150, 120); c.lineTo(158, 70); c.lineTo(178, 112); c.fill(); c.beginPath(); c.moveTo(195, 108); c.lineTo(222, 68); c.lineTo(226, 120); c.fill();   // 耳
      c.beginPath(); c.moveTo(140, 160); c.quadraticCurveTo(110, 175, 128, 186); c.lineTo(165, 178); c.fill();   // 鼻先
      c.fillStyle = "#c8281e"; c.beginPath(); c.moveTo(150, 192); c.quadraticCurveTo(200, 250, 250, 192); c.quadraticCurveTo(200, 215, 150, 192); c.fill();   // 前掛け
      c.fillStyle = "#2a2622"; c.beginPath(); c.ellipse(170, 142, 5, 9, 0.4, 0, 7); c.fill(); c.beginPath(); c.arc(126, 178, 4, 0, 7); c.fill();
      c.fillStyle = "#d4af37"; c.beginPath(); c.arc(203, 220, 9, 0, 7); c.fill();                   // 宝珠
      c.restore();
    },
    basin(c) {
      c.fillStyle = "#4a5a48"; c.fillRect(0, 0, W, H);
      c.fillStyle = "#9a958a"; c.beginPath(); c.roundRect(40, 70, 320, 260, 30); c.fill(); c.fillStyle = "#b3aea2"; c.beginPath(); c.roundRect(52, 82, 296, 236, 24); c.fill();
      const g = c.createLinearGradient(0, 100, 0, 300); g.addColorStop(0, "#9fd4e0"); g.addColorStop(1, "#4f98a8"); c.fillStyle = g; c.beginPath(); c.roundRect(78, 106, 244, 188, 16); c.fill();
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(200, 200, 30 + i * 22, 14 + i * 9, 0, 0, 7); c.stroke(); }
      c.fillStyle = "#2a2622"; c.font = "bold 34px serif"; c.textAlign = "center"; c.fillText("洗 心", 200, 66);
    },
    path(c) {
      c.fillStyle = "#3a3832"; c.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 56) for (let x = (y / 56) % 2 ? -40 : 0; x < W; x += 80) { c.fillStyle = `hsl(210,8%,${24 + Math.random() * 6}%)`; c.fillRect(x + 3, y + 3, 74, 50); c.fillStyle = "rgba(170,200,230,.12)"; c.fillRect(x + 8, y + 8, 30, 6); }
    },
    snow(c) { ART.path(c); },
  };
  const COVER = {
    fox(c) { for (let i = 0; i < 70; i++) { const x = rnd(110, 320), y = rnd(80, 330), r = rnd(10, 30); const g = c.createRadialGradient(x, y, 0, x, y, r); const col = Math.random() < 0.5 ? "90,110,60" : "110,95,70"; g.addColorStop(0, `rgba(${col},.95)`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } },
    basin(c) { for (let i = 0; i < 60; i++) { const x = rnd(60, 340), y = rnd(90, 310), r = rnd(12, 30); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(70,110,50,.9)"); g.addColorStop(1, "rgba(70,110,50,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      for (let i = 0; i < 12; i++) { c.save(); c.translate(rnd(90, 310), rnd(110, 290)); c.rotate(rnd(0, 6)); c.fillStyle = LEAF_COL[i % 7]; leafPath(c, i % 3, 13); c.fill(); c.restore(); } },
    path(c) { for (let y = 0; y < H; y += 56) for (let x = (y / 56) % 2 ? -40 : 0; x < W; x += 80) { c.fillStyle = `hsl(38,14%,${70 + Math.random() * 8}%)`; c.fillRect(x + 3, y + 3, 74, 50); } c.fillStyle = "rgba(255,240,200,.12)"; c.fillRect(0, 0, W, H); },
    snow(c) { c.fillStyle = "#f4f7fb"; c.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(200,215,235,${Math.random() * 0.5})`; c.beginPath(); c.arc(rnd(0, W), rnd(0, H), rnd(1, 4), 0, 7); c.fill(); } },
  };
  function rubGame(s) {
    return new Promise((resolve) => {
      open(s.title, s.hint);
      const base = document.createElement("canvas"); base.width = W; base.height = H; ART[s.art](base.getContext("2d"), s.flip);
      const cov = document.createElement("canvas"); cov.width = W; cov.height = H; const cc = cov.getContext("2d"); COVER[s.art](cc);
      const alphaSum = () => { const d = cc.getImageData(0, 0, W, H).data; let a = 0; for (let i = 3; i < d.length; i += 16) a += d[i]; return a; };
      const total = alphaSum() || 1, need = s.art === "path" || s.art === "snow" ? 0.8 : 0.9;
      const water = s.art === "path", snow = s.art === "snow", R = water ? 34 : snow ? 30 : 24;
      let down = false, last = null, lastSound = 0, prog = 0, raf = 0, finished = false, sparkle = [];
      const draw = () => { cx.drawImage(base, 0, 0); cx.drawImage(cov, 0, 0);
        sparkle = sparkle.filter((p) => (p.t -= 1) > 0); for (const p of sparkle) { cx.fillStyle = `rgba(255,255,230,${p.t / 30})`; cx.beginPath(); cx.arc(p.x, p.y, 2 + (30 - p.t) * 0.12, 0, 7); cx.fill(); }
        raf = requestAnimationFrame(draw); };
      draw();
      const dab = (x, y) => {
        cc.save(); cc.globalCompositeOperation = "destination-out";
        if (water) { for (let i = 0; i < 6; i++) { const ax = x + rnd(-R, R), ay = y + rnd(-R, R), r = rnd(6, 16); cc.beginPath(); cc.arc(ax, ay, r, 0, 7); cc.fill(); } }
        else { const g = cc.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); cc.fillStyle = g; cc.beginPath(); cc.arc(x, y, R, 0, 7); cc.fill(); }
        cc.restore();
        if (!snow && Math.random() < 0.35) sparkle.push({ x: x + rnd(-14, 14), y: y + rnd(-14, 14), t: 30 });
      };
      const measure = () => { prog = Math.min(1, (1 - alphaSum() / total) / need); bar.style.width = `${prog * 100}%`; ov.querySelector(".mg-n").textContent = `${Math.round(prog * 100)}%`;
        if (prog >= 1 && !finished) { finished = true; A.chime?.(); pop(W / 2 - 70, H / 2 - 30, s.art === "fox" ? "ぴかぴか！" : s.art === "basin" ? "すっきり！" : snow ? "道ができた！" : "涼しくなった！", "big"); setTimeout(() => end(true), 1300); } };
      let mIv = setInterval(measure, 300);
      function end(ok) { clearInterval(mIv); cancelAnimationFrame(raf); cv.onpointerdown = cv.onpointermove = cv.onpointerup = null; stop = null; ov.hidden = true; resolve(ok); }
      stop = end;
      cv.onpointerdown = (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); down = true; last = pt(e); dab(...last);
        if (water) { rustle(0.07, 1800, 0.35, "highpass"); pop(last[0], last[1] - 20, "パシャ", "soft"); } };
      cv.onpointermove = (e) => {
        e.preventDefault();
        if (!down) return; const p = pt(e), d = Math.hypot(p[0] - last[0], p[1] - last[1]); if (d < 2) return;
        const n = Math.ceil(d / (water ? 18 : 8)); for (let i = 1; i <= n; i++) dab(last[0] + ((p[0] - last[0]) * i) / n, last[1] + ((p[1] - last[1]) * i) / n);
        const now = performance.now(); if (now - lastSound > (water ? 260 : 90)) { lastSound = now;
          if (water) rustle(0.05, 1600, 0.3, "highpass"); else if (snow) rustle(0.08, 500, 0.1, "lowpass"); else rustle(0.04, 4200, 0.07, "bandpass"); s.onStroke?.(); }
        last = p;
      };
      cv.onpointerup = cv.onpointercancel = () => { down = false; };
    });
  }

  // ---------------------------------------------------------------- 草むしり（タップで抜く。花は残す）
  function weedGame(s) {
    return new Promise((resolve) => {
      open(s.title, s.hint);
      const NEED = 16; let pulled = 0, raf = 0, combo = 0, comboT = 0;
      const ground = document.createElement("canvas"); ground.width = W; ground.height = H; const gc = ground.getContext("2d");
      gc.fillStyle = "#6a5a40"; gc.fillRect(0, 0, W, H); for (let i = 0; i < 900; i++) { gc.fillStyle = `rgba(${Math.random() < 0.5 ? "40,30,20" : "120,100,70"},${Math.random() * 0.4})`; gc.beginPath(); gc.arc(rnd(0, W), rnd(0, H), rnd(1, 3), 0, 7); gc.fill(); }
      const plants = [];
      const spawn = () => { const flower = Math.random() < 0.18; plants.push({ x: rnd(45, 355), y: rnd(90, 380), s: 0, flower, col: ["#f2c94c", "#eb8fb0", "#ffffff", "#a98ee8"][Math.floor(rnd(0, 4))], up: 0, vy: 0, gone: false, sway: rnd(0, 6) }); };
      for (let i = 0; i < 11; i++) spawn();
      const flying = [];
      function draw() {
        cx.drawImage(ground, 0, 0); const t = performance.now() / 600;
        for (const p of plants) { if (p.gone) continue; p.s = Math.min(1, p.s + 0.05); const k = p.s, sw = Math.sin(t + p.sway) * 0.08;
          cx.save(); cx.translate(p.x, p.y); cx.rotate(sw); cx.scale(k * 1.7, k * 1.7);
          if (p.flower) { cx.strokeStyle = "#4f8a3a"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, -34); cx.stroke(); cx.fillStyle = p.col; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cx.beginPath(); cx.ellipse(Math.cos(a) * 7, -38 + Math.sin(a) * 7, 6, 4, a, 0, 7); cx.fill(); } cx.fillStyle = "#f2b33a"; cx.beginPath(); cx.arc(0, -38, 4, 0, 7); cx.fill(); }
          else {                                                                                 // 雑草：とがった葉が立ち上がる株
            for (let i = -2; i <= 2; i++) { const tx = i * 9, ty = -30 + Math.abs(i) * 5; cx.fillStyle = i % 2 ? "#4f8a2a" : "#62a336";
              cx.beginPath(); cx.moveTo(-4 + i, 0); cx.quadraticCurveTo(tx * 0.4 - 4, ty * 0.5, tx, ty); cx.quadraticCurveTo(tx * 0.4 + 4, ty * 0.5, 4 + i, 0); cx.closePath(); cx.fill(); }
            cx.fillStyle = "#3f6a22"; cx.beginPath(); cx.ellipse(0, 0, 8, 3, 0, 0, 7); cx.fill(); }
          cx.restore(); }
        for (const f of flying) { f.vy += 0.5; f.y += f.vy; f.x += f.vx; f.r += 0.2; f.a -= 0.02; cx.save(); cx.globalAlpha = Math.max(0, f.a); cx.translate(f.x, f.y); cx.rotate(f.r); cx.fillStyle = "#4f8a2a"; cx.fillRect(-3, -22, 6, 22); cx.fillStyle = "#8a6a40"; cx.beginPath(); cx.ellipse(0, 2, 7, 5, 0, 0, 7); cx.fill(); cx.restore(); }
        for (let i = flying.length - 1; i >= 0; i--) if (flying[i].a <= 0) flying.splice(i, 1);
        raf = requestAnimationFrame(draw);
      }
      draw();
      function end(ok) { cancelAnimationFrame(raf); cv.onpointerdown = null; stop = null; ov.hidden = true; resolve(ok); }
      stop = end;
      cv.onpointerdown = (e) => {
        const [x, y] = pt(e); let best = null, bd = 46;
        for (const p of plants) if (!p.gone) { const d = Math.hypot(p.x - x, p.y - 32 - y); if (d < bd) { bd = d; best = p; } }
        if (!best) return;
        if (best.flower) { pop(best.x - 30, best.y - 60, "お花は残しましょう", "soft"); A.tone?.([[523, 0.2]], 0.4, 0.03); return; }
        best.gone = true; pulled++; const now = performance.now(); combo = now - comboT < 800 ? combo + 1 : 1; comboT = now;
        flying.push({ x: best.x, y: best.y - 10, vx: rnd(-3, 3), vy: -rnd(7, 10), r: 0, a: 1 });
        A.tone?.([[392 * Math.pow(1.08, Math.min(combo, 10)), 0.3]], 0.25, 0.06); A.noise?.(0.08, 700, 0.05, "lowpass");
        pop(best.x - 12, best.y - 50, combo >= 5 ? "スポッ！" : "ぽん", combo >= 5 ? "big" : "soft"); s.onStroke?.();
        bar.style.width = `${(pulled / NEED) * 100}%`; ov.querySelector(".mg-n").textContent = `${pulled} / ${NEED} 本`;
        if (pulled < NEED && plants.filter((p) => !p.gone && !p.flower).length < 4) for (let i = 0; i < 4; i++) spawn();
        if (pulled >= NEED) { A.chime?.(); pop(W / 2 - 80, H / 2 - 20, "すっきりしました", "big"); setTimeout(() => end(true), 1300); }
      };
      ov.querySelector(".mg-n").textContent = `0 / ${NEED} 本`;
    });
  }

  // ---------------------------------------------------------------- 境内での入り口
  function near(p) {
    const m = done();
    for (const c0 of CHORES) { if (m[c0.id]) continue; const c = spec(c0); if (Math.hypot(c.at[0] - p.x, c.at[1] - p.z) < c.r) return c; }
    return null;
  }
  async function run(c0, onStroke) {
    const c = { ...c0, onStroke }, ok = c.kind === "weed" ? await weedGame(c) : await rubGame(c);
    if (!ok) return false;
    mark(c.id); return true;
  }
  return { near, run, sweepGame, isDone: (id) => !!done()[id], list: () => CHORES.map((c) => ({ ...spec(c), done: !!done()[c.id] })) };
}
