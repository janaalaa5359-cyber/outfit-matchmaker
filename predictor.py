"""Loads the trained model once and predicts the match score.

The model file model/outfit_model.pkl is created by:  python train_model.py
"""

import json
import os

import joblib
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "model", "outfit_model.pkl")
METRICS_PATH = os.path.join(BASE, "model", "metrics.json")
FEATURES = ["occasion", "mainColor", "mainPiece", "season", "style", "budget"]

# Load ONCE when Flask starts (not on every request)
_model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
_metrics = {}
if os.path.exists(METRICS_PATH):
    with open(METRICS_PATH) as f:
        _metrics = json.load(f)


def model_loaded():
    return _model is not None


def model_info():
    return {"model": _metrics.get("model"), "test_MAE": _metrics.get("test_MAE")}


def predict_score(data):
    """Return the predicted match score (int, 0–100) for validated inputs."""
    if _model is None:
        raise RuntimeError("Model file not found. Run: python train_model.py")
    row = pd.DataFrame([{f: data[f] for f in FEATURES}])
    score = float(_model.predict(row)[0])
    return int(max(0, min(100, round(score))))
