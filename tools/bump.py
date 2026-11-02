"""Gắn số phiên bản vào mọi import/đường dẫn nội bộ để trình duyệt không dùng file cũ trong cache.
  python tools/bump.py            # phiên bản = thời gian hiện tại
"""
import re
import time
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
V = time.strftime("%m%d%H%M")
pat = re.compile(r'''((?:from|import)\s*\(?\s*["'])(\.{1,2}/[^"'?]+\.js)(?:\?v=[^"']*)?(["'])''')
for f in list(SITE.glob("*.js")) + list(SITE.glob("js/*.js")):
    s = f.read_text(encoding="utf-8")
    n = pat.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={V}{m.group(3)}", s)
    if n != s:
        f.write_text(n, encoding="utf-8")
idx = SITE / "index.html"
s = idx.read_text(encoding="utf-8")
s = re.sub(r'(src="js/app\.js)(\?v=[^"]*)?"', rf'\1?v={V}"', s)
s = re.sub(r'(href="style\.css)(\?v=[^"]*)?"', rf'\1?v={V}"', s)
idx.write_text(s, encoding="utf-8")
print("version", V)
