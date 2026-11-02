"""Tạo ảnh bằng Gemini (key trong net-jinja/.env → GEMINI_API_KEY).
  python tools/gen_image.py <out.png> "<prompt>" [model]
"""
import base64
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
KEY = [l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text(encoding="utf-8").splitlines() if l.startswith("GEMINI_API_KEY=")][0]


def gen(out: str, prompt: str, model: str = "gemini-3.1-flash-image") -> None:
    r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                      headers={"x-goog-api-key": KEY, "Content-Type": "application/json"},
                      json={"contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}}, timeout=180)
    if not r.ok:
        raise SystemExit(f"HTTP {r.status_code}: {r.text[:400]}")
    for part in r.json()["candidates"][0]["content"]["parts"]:
        if "inlineData" in part:
            Path(out).parent.mkdir(parents=True, exist_ok=True)
            Path(out).write_bytes(base64.b64decode(part["inlineData"]["data"]))
            print("saved", out)
            return
    raise SystemExit("no image in response: " + str(r.json())[:300])


if __name__ == "__main__":
    gen(sys.argv[1], sys.argv[2], *(sys.argv[3:4]))
