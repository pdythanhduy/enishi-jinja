// 各 ES モジュールを本当に「モジュールとして」構文解析する（import は空のスタブに置き換え）
import { readFileSync } from "fs";
import vm from "vm";
let bad = 0;
for (const f of process.argv.slice(2)) {
  const src = readFileSync(f, "utf8").replace(/^import[^;]*;$/gm, "");
  try { new vm.SourceTextModule(src, { identifier: f }); } catch (e) { bad++; console.log("ERR", f, e.message); }
}
console.log(bad ? `${bad} file(s) failed` : "all modules parse");
