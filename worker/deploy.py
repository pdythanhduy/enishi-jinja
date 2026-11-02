"""Deploy Worker enishi-rooms lên Cloudflare (token CF_WORKER_TOKEN ở kaitori-radar/.env, khoá ở net-jinja/.env).
  python worker/deploy.py              # cập nhật code
  python worker/deploy.py --migrate v2 # khi thêm class Durable Object mới (xem MIGRATIONS)
"""
import json
import sys

import requests

sys.path.insert(0, r"C:\Users\thanh\kaitori-radar\marketing")
from daily_traffic import E, ACCOUNT  # noqa: E402

H = {"Authorization": "Bearer " + E["CF_WORKER_TOKEN"]}
A = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}"
NAME = "enishi-rooms"
ENV = {l.split("=", 1)[0]: l.split("=", 1)[1].strip() for l in open(r"C:\Users\thanh\net-jinja\.env", encoding="utf-8") if "=" in l}
MIGRATIONS = {"v1": {"new_tag": "v1", "new_sqlite_classes": ["Room", "Board"]},
              "v2": {"old_tag": "v1", "new_tag": "v2", "new_sqlite_classes": ["Remind"]}}
code = open(r"C:\Users\thanh\net-jinja\worker\worker.js", encoding="utf-8").read()
existing = requests.get(f"{A}/workers/scripts", headers=H).json()["result"]
first = not any(s["id"] == NAME for s in existing)
meta = {"main_module": "worker.js", "compatibility_date": "2026-10-01",
        "bindings": [{"type": "durable_object_namespace", "name": "ROOM", "class_name": "Room"},
                     {"type": "durable_object_namespace", "name": "BOARD", "class_name": "Board"},
                     {"type": "durable_object_namespace", "name": "REMIND", "class_name": "Remind"},
                     {"type": "secret_text", "name": "ADMIN_KEY", "text": ENV["ADMIN_KEY"]},
                     {"type": "secret_text", "name": "VAPID_PRIVATE_JWK", "text": ENV["VAPID_PRIVATE_JWK"]},
                     {"type": "plain_text", "name": "VAPID_PUBLIC", "text": ENV["VAPID_PUBLIC"]}]}
if "--migrate" in sys.argv:
    meta["migrations"] = MIGRATIONS[sys.argv[sys.argv.index("--migrate") + 1]]
elif first:
    meta["migrations"] = {"new_tag": "v2", "new_sqlite_classes": ["Room", "Board", "Remind"]}
r = requests.put(f"{A}/workers/scripts/{NAME}", headers=H, files={
    "metadata": (None, json.dumps(meta), "application/json"),
    "worker.js": ("worker.js", code, "application/javascript+module")}).json()
print("upload", r["success"], r.get("errors"))
if first:
    print("subdomain", requests.post(f"{A}/workers/scripts/{NAME}/subdomain", headers=H, json={"enabled": True}).json().get("success"))
