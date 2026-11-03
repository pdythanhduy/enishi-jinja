# えにし神社 (Enishi Jinja): toàn bộ dự án

> Tài liệu tổng hợp mọi thứ đã bàn và đã làm cho えにし神社, viết ngày 03/11/2026.
> Dành cho chủ dự án đọc lại, và cho mọi session Claude mới đọc **trước khi làm tiếp**.
> Bản ngắn cho máy đọc: `CLAUDE.md` ở thư mục gốc repo.

- **Web đang chạy:** https://enishijinja.com/ (link cũ pdythanhduy.github.io/enishi-jinja tự chuyển sang)
- **Repo:** github.com/pdythanhduy/enishi-jinja (public). Thư mục máy: `C:\Users\thanh\net-jinja`
- **Máy chủ thời gian thực:** https://enishi-rooms.thanhduy8vn.workers.dev (Cloudflare Worker)

---

## 1. Ý tưởng và lý do làm

### 1.1. Cảm hứng: Sansa, chùa online của Hàn Quốc
- sansatemple.com ra mắt khoảng 26/10/2026.
  - Người làm 26 tuổi, không biết lập trình, nhờ AI viết code.
  - Đạt hơn 600.000 lượt trong 3 ngày và khoảng 1 triệu người dùng sau 1 tuần. Có lúc sập máy chủ, giờ cao điểm phải xếp hàng ở cổng.
- **Cách chơi:**
  - Không đăng nhập, được gán tên dễ thương ngẫu nhiên.
  - Bấm sàn để đi, kéo chuột để xoay, cuộn để zoom.
  - 4 nút: chắp tay, lạy (tự đi tới đệm trống rồi lạy sát đất), gõ mõ, lần chuỗi 108 hạt.
  - Mỗi phòng 100 người. Không có chat, mọi người chỉ ngồi chung mà không làm phiền nhau.
- **Kỹ thuật Sansa** (quan sát được): Three.js r180, model GLB, Cloudflare. Người chơi khác dùng model nhẹ (LOD). URL phòng có dạng `?room=maru-48&instance=0&region=apac`.
- **Kiếm tiền:** gần như chưa có, chỉ có nút "cúng dường cơm" để ủng hộ tiền máy chủ.
- **Việt Nam** đã có "Niệm Phật Online": thắp hương, đèn hoa đăng, công đức, bảng xếp hạng.

### 1.2. Vì sao chọn đền Nhật cầu trúng (当選祈願)
- Người Nhật bốc thăm quanh năm: vé concert 推し, anime, Pokémon Center, hộp thẻ ポケカ, iPhone. Trước ngày công bố kết quả (当落), fan trên X đồng loạt "祈願", có người đi đền thật để cầu.
- Ở Nhật **đã có**, nhưng không có cảnh ngồi chung và không có gì để chia sẻ:
  - Đền thật cho rút quẻ online: 神田明神, 江の島神社, 愛宕神社.
  - Web đền ảo cá nhân: 運みくじ神社.
  - 「こまいぬAI神社」 (2024).
- **Chưa có** bản online đông người kiểu Sansa, và chưa có đền online riêng cho cầu trúng bốc thăm.
- **Nhu cầu là thật:** có hàng loạt bài kiểu "推し活神社15選". 福徳神社 nhận cầu trúng vé có thu 初穂料. 皆中稲荷 và 東京大神宮 cũng có người tới cầu.
- **Nối được với kaitoriprice.com:** web này đang theo dõi các đợt bốc thăm Pokémon và iPhone ("Trúng rồi? Bán ở đâu giá cao nhất").

### 1.3. Tên えにし神社
- えにし (縁) là cách đọc cổ, thơ của chữ "duyên", sợi dây vô hình nối người với người.
- Tên bao được mọi điện: duyên với vé (当選), tình duyên (縁結び), gia đình ở xa (奥の院), học hành (合格).
- Hợp tinh thần web: người lạ ngồi chung và cầu cho nhau (nút 「一緒に祈る」).
- Chủ dự án đã chốt tên: "tên đó ok nha".
- Điện cầu trúng gọi là **当選の社**, là điện chính.

### 1.4. Nguyên tắc
- Đền **hư cấu**, ghi rõ là giải trí (ネタ・エンタメ). Không mạo danh đền thật.
- **Không bán may mắn**: không "tăng tỉ lệ trúng", không "bảo đảm", không 縁切り hay trù ếm. Điểm 徳 chỉ là trò chơi.
- Lời quẻ ấm áp, có lời khuyên, không hù doạ.
- Nội dung người dùng đăng (絵馬) phải lọc từ xấu, có nút báo vi phạm và lệnh ẩn của admin.
- Mỗi điện có một câu chuyện 由来 nhân văn. Đây là yêu cầu của chủ dự án.

---

## 2. Bản đồ đền (13 địa điểm)

Toạ độ theo `site/js/map.js` → `PLACES`. Đi từ ngoài vào trong:

| # | Địa điểm | Tiếng Việt | Có gì |
|---|---|---|---|
| 1 | 大鳥居 | Cổng torii lớn | Torii đỏ lớn, điểm xuất phát. Hai bên có đèn đá |
| 2 | 参道 | Đường vào đền | Lối đá dài, đèn đá hai bên, cờ nobori đỏ, hàng đèn lồng giăng dây |
| 3 | 池と太鼓橋 | Hồ koi và cầu cong | Hồ có cá koi bơi, cầu cong đỏ đi qua được. Hành động: **cho cá ăn** |
| 4 | 楼門 | Cổng lầu | Cổng hai tầng mái đồng, hàng rào 玉垣 đỏ chạy quanh khuôn viên |
| 5 | 手水舎 | Nơi rửa tay | Nghi thức **手水** 4 bước (giữ nút) |
| 6 | 授与所 | Quầy bùa và quẻ | **おみくじ** theo từng điện, **御朱印**, **御守り**. Bên cạnh có giá **buộc quẻ** |
| 7 | 御神木 | Cây thiêng | Cây long não lớn có dây しめ縄, giá **絵馬** treo thẻ 3D của mọi người |
| 8 | 本殿・当選の社 | Điện chính (cầu trúng) | Hòm công đức, chuông 鈴, 2 tượng **狛狐** (xoa được), **ngồi quỳ** trên 18 đệm. Bên trong có nội thất (mục 4.6) |
| 9 | 縁結びの社 | Điện cầu duyên (phía tây) | Hòm công đức và chuông riêng, cây **sợi chỉ đỏ**, nội thất riêng, ngồi quỳ |
| 10 | 合格の社 | Điện cầu đỗ (phía đông) | Hòm công đức và chuông riêng, **tượng bò 撫で牛**, nội thất riêng, ngồi quỳ |
| 11 | 千本鳥居 | Nghìn cổng torii | Đường hầm torii đỏ leo núi (vẽ bằng InstancedMesh cho nhẹ) |
| 12 | 奥の院 | Điện trên đỉnh núi | Điện nhỏ, hồ phản chiếu trăng, thác nước. Hành động: **thả đèn lồng 灯籠流し** |
| 13 | 五重塔 | Tháp năm tầng | Tháp đỏ 5 tầng. Khi có 夜祭り, pháo hoa bắn trên trời phía tháp |

- **Bản đồ:** nút 📍 mở `img/map.jpg` (ảnh do Gemini vẽ) có các ghim. Bấm ghim là nhân vật **tự đi tới** theo đường an toàn (`routeTo` qua các điểm trung chuyển).
- **Va chạm:** dùng các hình chữ nhật `BLOCKS` và hàm `walkable()`. Người chơi khác né nhau khi đi.
- **Kiểm chứng:** script mô phỏng bằng Node chạy đủ 156/156 tuyến giữa mọi cặp địa điểm và mọi đường vào đệm ngồi, đều thông. Script cũ nằm ở scratchpad (`simnav/sim.mjs`), nên viết lại nếu sửa đường đi.

---

## 3. Nghi thức và hoạt động

### 3.1. Nút hành động theo ngữ cảnh
- Thanh dưới cùng gồm: 📍 地図 · **nút chính đổi theo chỗ đang đứng** · 🪵 絵馬 · 🎉 当選報告.
- Nút chính (`ACTIONS` trong `app.js`) đổi theo vị trí, ví dụ:
  - ⛩ お参り (4 điện), 💧 手水をとる, ⛩ 授与所, 🪵 絵馬を奉納, 🎋 おみくじを結ぶ.
  - 🦊 狐を撫でる, 🐂 撫で牛を撫でる, 💞 赤い糸に願う, 🐟 鯉にえさをあげる, 🏮 灯籠を流す.
  - 🙇 正座して祈る (trong 3 điện).
  - Việc tốt bất chợt: 🧹 落ち葉を掃く, 🏮 灯籠に火を灯す, 🦊 迷子の子狐を連れていく hoặc 子狐を狛狐のもとへ.
  - Khi đứng xa mọi chỗ, nút chính là "本殿へ" (đi tới điện chính).

### 3.2. 手水 (rửa tay)
Giữ nút để làm đủ 4 bước theo đúng thứ tự thật: tay trái, tay phải, miệng, cán gáo. Xong thì được tính là "đã thanh tẩy" trước khi お参り.

### 3.3. お参り và tiền công đức
- **Chọn đồng xu** (`COINS`), mỗi mức có một ý nghĩa chơi chữ của người Nhật. Tất cả đều miễn phí, chỉ để vui:
  - 5円: ご縁がありますように (mong có duyên)
  - 15円: 十分なご縁 (duyên đầy đủ)
  - 25円: 二重にご縁 (duyên gấp đôi)
  - 45円: 始終ご縁 (duyên trọn đời)
  - 115円: いいご縁 (duyên tốt)
  - 485円: 四方八方からご縁 (duyên từ bốn phương tám hướng)
- Sau đó: xu bay vào hòm, rung chuông 鈴, rồi **二礼二拍手一礼** (lạy 2, vỗ tay 2, lạy 1) có âm thanh. Nhân vật cúi chào đúng hướng điện.
- Có ở cả 4 điện: 当選, 縁結び, 合格, 奥の院.

### 3.4. 正座 (ngồi quỳ cầu nguyện)
Tự đi vào điện tới đệm trống gần nhất theo đường đã kiểm chứng, rồi ngồi quỳ và cúi lạy. Người chơi khác thấy được tư thế này.

### 3.5. おみくじ (rút quẻ)
- Rút ở 授与所, quẻ riêng cho từng điện (`OMIKUJI` trong `content.js`), đủ mọi bậc từ 大吉 tới 凶:
  - 当選: 19 quẻ
  - 縁結び: 10 quẻ
  - 合格: 10 quẻ
  - 奥の院: 8 quẻ
- Mỗi quẻ có câu ngắn, lời khuyên và 4 mục (ví dụ 恋愛, 待ち人, ラッキー). Giọng ấm áp. Quẻ 凶 thì khuyên đem buộc lên giá để "để lại điều xấu ở đây".
- Có **ảnh chia sẻ** để đăng X.
- Buộc quẻ ở giá おみくじ結び所.

### 3.6. 絵馬 (thẻ ước, dùng chung)
- Viết lời ước ẩn danh và chọn loại: 🎤 ライブ・チケット / 🃏 ポケカ・トレカ / 📱 抽選・予約 / 🎓 合格 / ✨ そのほか.
- Thẻ treo **3D thật** trên giá cạnh cây thiêng, ai vào cũng thấy.
- Nút 「一緒に祈る」 để cầu cùng người khác.
- **Ngày nhắc** (ví dụ ngày công bố kết quả bốc thăm):
  - Bật thông báo thì 08:00 sáng hôm đó (giờ Nhật) máy sẽ nhận Web Push nhắc lời ước.
  - Thông báo không chứa nội dung, chỉ là một tín hiệu để máy hiện nhắc.
- Có lọc từ xấu, nút báo vi phạm và lệnh ẩn của admin (`POST /admin/:hall`, cần ADMIN_KEY).

### 3.7. 当選報告 (báo trúng)
Bấm báo "đã trúng" để làm お礼参り. Web hiện số người báo trúng hôm nay để tạo niềm tin và giúp lan truyền.

### 3.8. 御朱印帳 (sổ ấn)
- Mỗi điện có một con dấu riêng, **vẽ bằng canvas** theo kiểu viết tay:
  - 当選社: dấu 灯
  - 縁結社: dấu 結
  - 合格社: dấu 梅
  - 奥之院: dấu 月
  - Mỗi dấu kèm ngày theo niên hiệu 令和.
- **Dấu giới hạn theo ngày:** 朔日 (mùng 1), 月次祭 (ngày 15), 七五三, 初詣, 節分, 七夕, và các dấu theo mùa.
- Xem lại trong sổ 📖.

### 3.9. 御守り (bùa)
- Có 6 loại: 当選守, 縁結守, 合格守, 健康守, 交通安全, 家内安全. Mỗi loại có màu và hoa văn riêng.
- **Hiệu lực 1 năm.** Hết hạn thì nhắc "trả lại" (返納) đúng như phong tục thật.

### 3.10. 徳 (đức) và nhiệm vụ hằng ngày
- **Điểm 徳** có được khi làm nghi thức và việc tốt. Mỗi việc nhỏ tính một lần mỗi ngày để tránh cày điểm.
- **Bậc:**
  - 参拝者 (0)
  - 常連さん (10)
  - 氏子 (30)
  - 世話役 (70)
  - 総代 (150)
  - 神様の友 (300)
- **お勤め mỗi ngày** (nút 📜) có 3 nhiệm vụ: rửa tay rồi お参り; quét lá 3 lần; 「一緒に祈る」 cho thẻ ước của người khác. Làm đủ cả 3 thì có thưởng thêm.
- **Việc tốt:**
  - **Quét lá rụng** (`good.js` Leaves): lá gom thành đống ở nhiều chỗ.
  - **Thắp đèn đá bị tắt** (DarkLanterns): vài đèn đá ngẫu nhiên tắt, đi tới thắp lại.
  - **Dẫn chú cáo con lạc đường** (LostFox): cáo con ở một chỗ ngẫu nhiên, dẫn nó về bên tượng 狛狐.

### 3.11. Đức chung của cả đền và 夜祭り (lễ hội đêm)
- Đức của **mọi người** trong ngày được cộng dồn trên máy chủ. Thanh "境内の徳" ở góc trái trên hiện X/300.
- Đủ **300** thì mở **夜祭り**, rồi về 0 vào ngày hôm sau:
  - Pháo hoa bắn trên trời phía tháp.
  - Nhạc lễ hội **お囃子** phát (trống taiko, chuông 鉦, sáo 篠笛, do code tự tạo).
  - Có thông báo "今夜は夜祭りです".
- Vì cả đền phải cùng góp mới đủ, mọi người có lý do rủ nhau vào.

### 3.12. Chơi nhiều người
- Mỗi phòng tối đa 100 người, mỗi điện có nhiều phòng. Máy chủ tự chia người vào phòng còn trống.
- Thấy được người khác đi lại, cúi lạy, ngồi quỳ. Tên hiện dạng "紅葉の狐火（参拝者）".
- **Không có chat**, giống Sansa: ngồi chung nhưng yên tĩnh.
- Mỗi người còn **thắp 祈りの灯り** (đèn cầu nguyện). Số đèn cả ngày hiện ở HUD.

### 3.13. Câu chuyện 由来 của các điện
Câu chuyện tự mở lần đầu bước vào mỗi điện, xem lại bằng nút 📃.

| Điện | Tựa | Tóm tắt | Thông điệp |
|---|---|---|---|
| 当選の社 | ― 最後列の灯り ― | Cô gái trượt vé 10 lần, lần thứ 11 trúng ghế cuối hội trường. Thần tượng nói: "Hàng cuối anh vẫn thấy rõ". Từ đó đền giữ ngọn đèn của cả người trúng lẫn người chưa trúng | Ghế nào cũng là ghế được gặp |
| 縁結びの社 | ― 風にさらわれた傘 ― | Hai người lạ cùng đuổi theo chiếc ô đỏ bị gió thổi bay, cùng đi tìm chủ ô. 50 năm sau họ quay lại đền dưới chính chiếc ô ấy | Duyên đến khi ta quên mình để nghĩ cho người khác |
| 合格の社 | ― 夜通しの灯り ― | Thầy giáo già để đèn sáng mỗi đêm cho học trò đi học về khuya, không phải để học mà để các em không sợ. Học trò ấy sau này cũng trở thành người để đèn | Ngọn đèn cố gắng của bạn cũng soi đường cho người khác |
| 奥の院 | ― 同じ月を見る ― | Chàng trai từ nước ngoài sang làm việc, 3 năm chưa gặp mẹ, khóc bên hồ. Một chú cáo chỉ lên trăng. Đêm đó thư mẹ viết: "Trăng đẹp quá, con có đang nhìn không?" | Xa nhau vẫn cùng nhìn một mặt trăng |

---

## 4. Hình ảnh và không khí

### 4.1. Trời và thời gian thật
- Bầu trời, ánh sáng và sương **theo giờ thật ở Nhật**: bình minh, ngày, hoàng hôn, đêm có trăng và sao.
- Ban đêm đèn sáng lên. Độ chói (bloom) và sương thay đổi theo giờ để ban ngày không bị mờ trắng.

### 4.2. Bốn mùa theo tháng thật
- **Xuân:** hoa anh đào hồng.
- **Hạ:** lá xanh, có đom đóm.
- **Thu:** lá phong đỏ vàng, lá rụng bay, có đom đóm.
- **Đông:** đất trắng, tuyết rơi, **tuyết phủ trên mái, đèn đá và thanh đen cổng torii** (shader `snowRoofs`).
- Xem trước mùa khác bằng `?season=winter|spring|summer|autumn`.

### 4.3. Kiến trúc (tất cả dựng bằng code, không dùng model tải về)
- Mái cong kiểu Nhật (反り), lợp đồng xanh có vân. Viền vàng 破風 uốn theo đường cong mái. Có 鰹木 và 千木 trên điện lớn.
- Cột đỏ 朱, tường trắng, dây しめ縄 với giấy 紙垂, đèn lồng 提灯, đèn đá 灯籠.
- Đá có vân, mặt nước có gợn sóng. Phản chiếu môi trường (PMREM) cho kim loại và nước.

### 4.4. Trang trí
- Cờ nobori đỏ hai bên đường vào, có lay theo gió: 奉納えにし, 五穀豊穣, 家内安全, 商売繁盛, 縁結び.
- Hàng đèn lồng giăng dây, đá và bụi cây, mây trôi, trăng, lá rụng, sương mỏng.

### 4.5. Nhân vật
- Nhân vật chibi mặc yukata hoa văn truyền thống (wagara: 麻の葉, 青海波, 市松…), mắt kiểu anime, 3 kiểu tóc. Có người đeo mặt nạ cáo hoặc cầm đèn lồng.
- Mỗi người một vẻ, tạo ngẫu nhiên.

### 4.6. Nội thất
- **Điện chính:** rèm tre 御簾 tua tím, gương thần viền vàng, 御幣 vàng, cây sakaki, bánh kagami mochi trên 三方, rượu thần, trống taiko lớn, đèn đồng treo dưới mái hiên, 18 đệm ngồi.
- **縁結び:** sợi chỉ đỏ, biển 猪目 (hình trái tim cổ), 千羽鶴, đá vợ chồng 夫婦石, thẻ ước hồng.
- **合格:** tranh cuộn 掛け軸, bò 撫で牛, bàn có bút lông và cành mai, búp bê daruma, thẻ ước xanh.

### 4.7. Âm thanh (tạo bằng code, không có file nhạc)
- Gió, dế kêu, chuông gió.
- Tiếng chuông 鈴, vỗ tay, xu rơi.
- Nhạc お囃子 khi có lễ hội.
- Nút 🔈 / 🔇 để tắt hoặc bật.

### 4.8. Camera
- Có đoạn mở màn bay vào đền (bỏ qua bằng `?nointro`).
- Trên điện thoại dọc, góc nhìn và khoảng cách tự chỉnh.
- Cây nằm giữa camera và nhân vật sẽ mờ dần (dithered fade).

---

## 5. Kỹ thuật

### 5.1. Mặt trước (site/)
- HTML, CSS, JS thuần. **Three.js r0.180** nạp qua importmap jsdelivr, không có bước build.
- Hiệu ứng: EffectComposer gồm UnrealBloomPass và OutputPass.
- **Tối ưu:**
  - Đèn thật (PointLight) chỉ có khoảng 8 cái, gán cho các đèn gần người chơi nhất. Đèn xa chỉ tự phát sáng.
  - Cây, torii, lối đá vẽ bằng InstancedMesh.
  - `freeze.js` gộp các khối tĩnh theo vật liệu: draw call giảm từ khoảng 1500 xuống khoảng 260–420.
- **PWA:** có `manifest.json` và `sw.js`, cài lên màn hình điện thoại được.

| File | Vai trò |
|---|---|
| `index.html`, `style.css` | Giao diện: HUD, nút, các hộp thoại (quẻ, thẻ ước, sổ ấn, bùa, nhiệm vụ…) |
| `js/app.js` | Lõi: renderer, đi lại, camera, âm thanh, nghi thức, giao diện, nhiều người chơi |
| `js/env.js` | Trời theo giờ, mùa, sương, độ sáng đèn |
| `js/map.js` | Địa điểm, địa hình, va chạm, tìm đường |
| `js/arch.js` | Vật liệu và các hàm dựng công trình (mái, torii, đèn, các điện, tháp, cầu…) |
| `js/world.js` | Dựng cả thế giới |
| `js/decor.js` | Vân bề mặt, phản chiếu, nobori, hàng đèn lồng, đá, mây, tuyết mái |
| `js/freeze.js` | Gộp khối tĩnh để chạy nhanh |
| `js/avatar.js` | Nhân vật, tư thế quỳ, cúi lạy |
| `js/collect.js` | Sổ ấn và bùa (vẽ canvas, lưu localStorage) |
| `js/good.js` | Lá rụng, đèn tắt, cáo con lạc, pháo hoa |
| `deeds.js` | Điểm 徳, bậc, nhiệm vụ ngày |
| `content.js` | Các điện, câu chuyện, quẻ, tên ngẫu nhiên, loại thẻ ước |
| `fx.js` | Hoa văn yukata, đom đóm, trăng, âm thanh nền, nhạc お囃子 |
| `net.js` | Kết nối máy chủ (WebSocket và API thẻ ước) |

### 5.2. Máy chủ (worker/)
Cloudflare Worker `enishi-rooms` dùng Durable Objects, gói miễn phí:
- **Room:** WebSocket, 100 người mỗi phòng. Ai im lặng quá 70 giây thì bị loại khỏi danh sách.
- **Board** (SQLite): thẻ ước, 「一緒に祈る」, báo trúng, đèn cầu nguyện, báo vi phạm.
- **Remind** (SQLite):
  - Báo thức 08:00 hằng ngày theo giờ Nhật, gửi Web Push nhắc thẻ ước, có ký bằng VAPID.
  - Cộng đức chung của cả đền, mốc FEST_GOAL = 300.
- **Deploy:** `python worker/deploy.py`, script đọc mọi khoá trong `.env`.
  - Lần đầu tạo Remind đã chạy migration `--migrate v2`.
  - Subdomain workers.dev mới mất khoảng 5 phút mới chạy (trong lúc đó báo lỗi 1042).

### 5.3. Deploy web
- Push lên `main` có thay đổi trong `site/**` là GitHub Actions (`pages.yml`) tự đưa lên GitHub Pages, mất khoảng 30 giây.
- **Bắt buộc chạy `python tools/bump.py` trước mỗi lần commit.** Script gắn `?v=` vào các import để trình duyệt không dùng file cũ. Lỗi này đã gặp thật.

### 5.4. Ảnh
- Dùng `tools/gen_image.py`, gọi Gemini `gemini-3.1-flash-image` (gói miễn phí dùng được), khoá GEMINI_API_KEY nằm trong `.env`.
- Đã tạo: `img/map.jpg` (bản đồ), `img/og.jpg` (ảnh chia sẻ), icon 192 và 512.

### 5.5. Bảo mật
- `.env` không bao giờ được commit hay in ra. File này chứa CF_WORKER_TOKEN, ADMIN_KEY, GEMINI_API_KEY và khoá VAPID.
- Không gửi email người dùng cho dịch vụ nào. Phần subject của VAPID đã bỏ email.

### 5.6. Thử trên máy
- Chạy `cd site && python -m http.server 8766`, rồi mở `http://localhost:8766/?nointro`.
- Tham số: `?hour=19` (đổi giờ), `?season=winter` (đổi mùa), `?nofreeze` (tắt gộp khối).
- Gõ `window.__enishi` trong console để điều khiển: camera, nhân vật, `run("omairi")`, pháo hoa, nhạc…
- Lưu ý:
  - Chrome giảm còn khoảng 2 fps khi tab nằm nền, nên đừng tin số fps đo lúc đó.
  - `node --check` không bắt hết lỗi, vẫn phải mở trang ra xem.

---

## 6. Lịch sử làm (theo commit)

| Commit | Nội dung |
|---|---|
| v0 | Sân đền 3D, お参り, おみくじ, 絵馬, đồng bộ thời gian thực |
| Heartbeat / deploy | Loại người treo máy, lệnh ẩn admin, script deploy |
| Beauty pass | Bloom, trời đêm, 祈りの灯り, đom đóm, yukata hoa văn, mặt anime, intro, âm thanh nền, ảnh OG. Thêm 手水舎, おもかる石, 狛狐, 絵馬掛け, 結び所 |
| **Phase 1** | Bản đồ đầy đủ 13 địa điểm, núi, kiến trúc mái cong, cây theo mùa, trời theo giờ, va chạm và đi theo bản đồ (156/156 tuyến), nút theo ngữ cảnh, ngồi quỳ, đèn thông minh |
| **Phase 2** | Nghi thức: 手水 giữ nút 4 bước, chọn đồng xu, お参り ở cả ba điện có hòm và chuông riêng |
| **Phase 3** | 御朱印帳, 御守り (6 loại, hạn 1 năm), nhắc ngày thẻ ước bằng Web Push, PWA |
| **Phase 4** | 徳 và bậc, お勤め ngày, việc tốt (quét lá, thắp đèn, cáo con), thanh đức chung, pháo hoa 夜祭り |
| **Phase 5a** | Nội dung 縁結び, 合格, 奥の院: câu chuyện và quẻ đủ mọi bậc, quẻ theo điện ở 授与所, câu chuyện tự mở |
| Mobile | Góc nhìn khi cầm dọc, tông đá dịu hơn |
| Decor pass | Phản chiếu, vân mái, đá, nước, nobori, hàng đèn lồng, đá và bụi cây, mây, đom đóm, chỉnh bloom |
| Festival / winter | Nhạc お囃子, tuyết phủ mái, `?season=` |
| Honden interior | 御簾, gương thần, 御幣, sakaki, kagami mochi, trống, đèn đồng |
| Bargeboards | Viền vàng uốn theo mái cong |
| Small halls | Nội thất 縁結び và 合格, cây mờ khi che camera |
| Perf | Gộp khối tĩnh, dùng chung vật liệu đèn: draw call từ khoảng 1500 xuống khoảng 300 |

### Góp ý của người review và cách đã xử lý
Có một người review gửi 6 góp ý. Đã làm đủ cả 6:
- 御朱印 → **làm** (mục 3.8)
- Chọn đồng 5円 → **làm** (mục 3.3)
- 絵馬 kèm ngày nhắc → **làm** (mục 3.6)
- Trời và mùa theo thời gian thật → **làm** (mục 4.1, 4.2)
- 夜祭り với thanh đức chung → **làm** (mục 3.11)
- 御守り có hạn → **làm** (mục 3.9)

### Lỗi đã gặp và bài học
- **Trình duyệt dùng file JS cũ** → viết `tools/bump.py`.
- **Đường đi xuyên công trình** (điểm xuất phát đường leo núi nằm sau điện chính, cầu ngắn, đường cắt qua 授与所) → thêm điểm trung chuyển, rồi kiểm bằng mô phỏng.
- **Hộp công đức chắn đường vào đệm** → đặt đường đi cố định.
- **CSS `display` đè thuộc tính `[hidden]`**, làm thẻ tiêu đề không ẩn → thêm `[hidden]{display:none}`.
- **Chữ cờ nobori bên phải bị ngược** → dùng hình học riêng cho bên phải.
- **Viền mái thẳng nổi lên trên mái cong** → đổi sang ống cong theo đúng đường cong mái.
- **Ban ngày bị chói và mờ** → bloom và sương thay đổi theo giờ.
- **Lỗi 1042 khi worker mới tạo** → chờ khoảng 5 phút.

---

## 7. Kiếm tiền (kế hoạch, **chưa làm**)

1. **Affiliate theo từng điện:** nguồn thu chính. Đặt **sau** câu chuyện và quẻ, ghi rõ nhãn PR, không chen vào giữa nghi thức.
   - 当選 → kaitoriprice.com, tin bốc thăm.
   - 縁結び → app hẹn hò (Pairs, with…). Mảng này trả cao trên A8.
   - 合格 → học online (スタディサプリ…).
   - 奥の院 (gia đình ở xa) → chuyển tiền, gửi quà về quê.
2. **御守り, 絵馬 đặc biệt bản số (100–300円)**, ví dụ bùa làm hình nền điện thoại. Bán online phải có trang **特定商取引法**.
3. **Nút ủng hộ tiền máy chủ** (OFUSE…), như nút "cúng dường cơm" của Sansa.
4. **Quảng cáo** khi lượt xem đủ lớn.
5. Về sau: nhân vật linh vật để làm sticker LINE. Hợp tác giới thiệu đền 推し活 thật.

**Chi phí:** hiện gần 0 (GitHub Pages và Cloudflare gói miễn phí). Nếu đông cỡ Sansa thì Workers khoảng $5/tháng.

---

## 8. Giới thiệu cho người Nhật (kế hoạch, **chưa làm**)

1. **X (Twitter) là kênh số 1.**
   - Chủ dự án tự tạo tài khoản X cho đền. Claude không tạo tài khoản thay được.
   - Bài đầu kể kiểu người làm: 「韓国で話題のオンライン寺院みたいなのを、日本版で作ってみました。チケット当選祈願できる神社です⛩」 (đã làm thử bản Nhật của chùa online đang hot ở Hàn, một đền để cầu trúng vé), kèm **video 15 giây** (đi vào, kéo chuông, rút được 大吉).
   - Hashtag: #推し活 #当選祈願 #当落 #ポケカ抽選 #チケット祈願.
2. **Mỗi lần rút quẻ là một quảng cáo miễn phí:** ảnh kết quả đẹp kèm nút 「Xでシェア」 tự gắn hashtag và link. Đã có ảnh chia sẻ quẻ.
3. **Bám ngày công bố kết quả (当落):**
   - 26/11: kết quả bốc thăm ハドウシーカー, cùng các đợt vé concert cuối năm. Đăng bài "明日は当落！今夜みんなで祈願しよう" (mai có kết quả, tối nay cùng nhau cầu).
   - **初詣 (1/1)** và **mùa thi (giữa tháng 1)** là hai đợt cao điểm lớn nhất.
4. **Gửi tin cho báo mạng** qua form 情報提供, miễn phí: ねとらぼ, ロケットニュース24, GIGAZINE, Togetter. Góc tin: "Sansa ở Hàn có 1 triệu người, giờ đã có bản Nhật". **PR TIMES** khoảng 30.000円, để sau khi đã có người dùng.
5. **TikTok và Reels:** video 15–30 giây (rút quẻ, viết thẻ ước, "đền ai cũng ngồi chung mà không ai nói chuyện").
6. **Mời 20–30 người dùng thử trước** (bạn bè, người quen có bạn Nhật). Đền có người ngồi sẵn thì người mới vào mới thấy vui.

| Thời điểm | Việc |
|---|---|
| Ngày ra mắt | Mở X, đăng bài kèm video, nhờ người quen vào ngồi và chia sẻ |
| 2–3 ngày sau | Gửi tin cho ねとらぼ, ロケットニュース24, Togetter |
| Trước 26/11 | Bài "đêm trước ngày công bố, cùng cầu trúng" |
| Cuối 12 đến tháng 1 | Sự kiện 初詣 online, đẩy điện 合格 cho mùa thi |

**Nói thật:** viral thì không ai bảo đảm được. Việc làm được là tăng tối đa khả năng: web chia sẻ được, đúng thời điểm, đúng cộng đồng, chi phí gần 0.

---

## 9. Việc tiếp theo

**Kỹ thuật và đồ hoạ:**
- [ ] Thử trên **điện thoại thật** (iPhone và Android): mượt không, nóng máy không. Nếu cần thì gộp 41 đèn đá thành instanced.
- [ ] Ảnh chia sẻ đẹp hơn cho báo trúng và sổ ấn. Nút 「Xでシェア」 có sẵn hashtag.
- [ ] Sự kiện **初詣** (1/1): trang trí 門松, quẻ đầu năm, dấu 初詣 (đã có trong sổ ấn).
- [ ] Mùa thi: đẩy 合格の社, thêm bài theo ngày 共通テスト.
- [ ] Có thể thêm điện **ほどき** (buông bỏ sau chia tay) và **仕事** (công việc), như ý tưởng ban đầu.
- [ ] Nhân vật cầm 御守り hoặc đeo đồ theo bậc 徳.

**Ra mắt:**
- [ ] Trang 運営者情報, chính sách bảo mật, ghi chú ネタ・エンタメ (kiểm tra lại footer).
- [ ] Kiểm tra trùng tên với đền thật nhỏ trước khi quảng bá mạnh.
- [ ] Tài khoản X, video 15 giây, danh sách người dùng thử (mục 8).
- [ ] Gắn affiliate và nút ủng hộ (mục 7).
