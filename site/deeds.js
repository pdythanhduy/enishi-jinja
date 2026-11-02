// 徳（とく）と、日々のお勤め。端末に保存。境内全体の徳はサーバーで合計。
const KEY = "enishi_toku";
const RANKS = [[0, "参拝者"], [10, "常連さん"], [30, "氏子"], [70, "世話役"], [150, "総代"], [300, "神様の友"]];
const QUESTS = [
  { id: "temizu_omairi", label: "手水で清めてから、お参りする", n: 1 },
  { id: "sweep", label: "境内の落ち葉を掃く", n: 3 },
  { id: "pray_ema", label: "誰かの絵馬に「一緒に祈る」", n: 1 },
];
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

export function deeds({ onChange, onAllDone }) {
  let s = load(); s.toku ||= 0;
  if (s.day !== today()) { s.day = today(); s.q = {}; s.bonus = false; save(s); }
  const rank = () => { let r = RANKS[0][1]; for (const [t, n] of RANKS) if (s.toku >= t) r = n; return r; };
  const next = () => (RANKS.find(([t]) => t > s.toku) || [null])[0];
  const api = {
    get toku() { return s.toku; }, rank, next,
    quests: () => QUESTS.map((q) => ({ ...q, done: Math.min(q.n, (s.q || {})[q.id] || 0) })),
    add(points, questId) {
      const before = rank();
      s.toku += points;
      if (questId) { s.q ||= {}; s.q[questId] = (s.q[questId] || 0) + 1; }
      const allDone = QUESTS.every((q) => ((s.q || {})[q.id] || 0) >= q.n);
      if (allDone && !s.bonus) { s.bonus = true; s.toku += 5; save(s); onAllDone?.(); }
      save(s); onChange?.(points, before !== rank() ? rank() : null);
    },
  };
  return api;
}
