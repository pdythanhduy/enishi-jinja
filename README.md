# えにし神社（ネット神社）

ログイン不要、ブラウザでお参りできるネット神社。

- Three.js の3D境内：千本鳥居、紅葉、狛狐
- お参り：賽銭 → 鈴 → 二礼二拍手一礼
- おみくじ（一日一回）、みんなの絵馬、当選報告

構成：

- `site/` 静的サイト
- `worker/` Cloudflare Worker `enishi-rooms`
  - 境内のリアルタイム同期：Durable Object `Room`、1部屋100人
  - 絵馬：Durable Object `Board`、SQLite
