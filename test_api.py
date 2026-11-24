"""Test the ML API: /health, one valid /predict and one invalid /predict.

Local:     python test_api.py
Deployed:  python test_api.py https://YOUR-APP.onrender.com
"""

import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5000").rstrip("/")


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            status, text = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode()
    print(f"\n=== {method} {BASE}{path}")
    if body is not None:
        print("Request :", json.dumps(body))
    print("Status  :", status)
    print("Response:", json.dumps(json.loads(text), indent=2))


call("GET", "/health")

call("POST", "/predict", {
    "occasion": "wedding", "mainColor": "burgundy", "mainPiece": "dress",
    "season": "winter", "style": "classic", "budget": 800,
})

call("POST", "/predict", {
    "occasion": "party", "mainColor": "burgundy", "mainPiece": "dress",
    "season": "winter", "style": "classic", "budget": 20000,
})
