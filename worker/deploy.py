import json, sys, requests
sys.path.insert(0, r"C:\Users\thanh\kaitori-radar\marketing")
from daily_traffic import E, ACCOUNT
H = {"Authorization": "Bearer " + E["CF_WORKER_TOKEN"]}
A = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}"
NAME = "enishi-rooms"
ADMIN = [l.split("=", 1)[1].strip() for l in open(r"C:\Users\thanh\net-jinja\.env", encoding="utf-8") if l.startswith("ADMIN_KEY=")][0]
code = open(r"C:\Users\thanh\net-jinja\worker\worker.js", encoding="utf-8").read()
existing = requests.get(f"{A}/workers/scripts", headers=H).json()["result"]
first = not any(s["id"] == NAME for s in existing)
meta = {"main_module": "worker.js", "compatibility_date": "2026-10-01",
        "bindings": [{"type": "durable_object_namespace", "name": "ROOM", "class_name": "Room"},
                     {"type": "durable_object_namespace", "name": "BOARD", "class_name": "Board"},
                     {"type": "secret_text", "name": "ADMIN_KEY", "text": ADMIN}]}
if first:
    meta["migrations"] = {"new_tag": "v1", "new_sqlite_classes": ["Room", "Board"]}
r = requests.put(f"{A}/workers/scripts/{NAME}", headers=H, files={
    "metadata": (None, json.dumps(meta), "application/json"),
    "worker.js": ("worker.js", code, "application/javascript+module")}).json()
print("upload", r["success"], r.get("errors"))
if first:
    print("subdomain", requests.post(f"{A}/workers/scripts/{NAME}/subdomain", headers=H, json={"enabled": True}).json().get("success"))
