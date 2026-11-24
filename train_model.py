"""Train the Outfit Matchmaker match-score model (DS432 Homework 2).

DATASET – DEMONSTRATION DATA (clearly labelled, not real user ratings)
  We do not have real rated outfits, so this script GENERATES a small
  demonstration dataset: random outfit combinations scored with the colour /
  dress-code rules from Homework 1, plus random noise (like different people
  giving slightly different ratings). The file is saved to
  data/outfit_demo_dataset.csv so it can be inspected.

INPUT FEATURES : occasion, mainColor, mainPiece, season, style, budget
TARGET         : match_score (0–100)
MODEL          : RandomForestRegressor inside a scikit-learn Pipeline
                 (OneHotEncoder for the text columns)
EVALUATION     : Mean Absolute Error (MAE) and R² on a 20% test split

Run:  python train_model.py
Output: model/outfit_model.pkl  (loaded by predictor.py / Flask)
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from validation import OCCASIONS, COLORS, PIECES, SEASONS, STYLES

BASE = os.path.dirname(os.path.abspath(__file__))
RANDOM_STATE = 42
N_SAMPLES = 2000

CATEGORICAL = ["occasion", "mainColor", "mainPiece", "season", "style"]
NUMERIC = ["budget"]
FEATURES = CATEGORICAL + NUMERIC
NEUTRALS = {"black", "white", "beige", "navy", "grey"}


def rule_score(r):
    """Homework 1 colour-harmony and dress-code rules (used only to label the demo data)."""
    neutral = r["mainColor"] in NEUTRALS
    s = 70
    if neutral: s += 8
    if r["style"] == "minimal" and neutral: s += 6
    if r["style"] == "bold" and not neutral: s += 5
    if r["occasion"] == "wedding" and r["mainColor"] in ("burgundy", "navy"): s += 8
    if r["occasion"] == "work" and r["mainColor"] in NEUTRALS: s += 8
    if r["occasion"] == "work" and r["style"] == "bold": s -= 10
    if r["occasion"] == "wedding" and r["mainColor"] == "white": s -= 15
    if r["season"] == "summer" and r["mainColor"] in ("black", "burgundy", "navy"): s -= 4
    if r["season"] == "winter" and r["mainColor"] in ("white", "pink", "blue"): s -= 3
    # A very small budget makes it harder to buy the missing pieces
    if r["budget"] < 150: s -= 3
    return s


def make_demo_dataset(n, rng):
    occasions, colors, pieces = sorted(OCCASIONS), sorted(COLORS), sorted(PIECES)
    seasons, styles = sorted(SEASONS), sorted(STYLES)
    rows = []
    while len(rows) < n:
        r = {
            "occasion": rng.choice(occasions),
            "mainColor": rng.choice(colors),
            "mainPiece": rng.choice(pieces),
            "season": rng.choice(seasons),
            "style": rng.choice(styles),
            "budget": int(rng.integers(5, 1001)) * 10,   # 50 – 10,000 SAR
        }
        if r["occasion"] == "sport" and r["mainPiece"] in ("dress", "abaya"):
            continue   # same rule as the form: not a valid combination
        noise = rng.normal(0, 4)   # different "raters" disagree a little
        r["match_score"] = int(np.clip(round(rule_score(r) + noise), 0, 100))
        rows.append(r)
    return pd.DataFrame(rows)


def main():
    rng = np.random.default_rng(RANDOM_STATE)
    df = make_demo_dataset(N_SAMPLES, rng)

    os.makedirs(os.path.join(BASE, "data"), exist_ok=True)
    df.to_csv(os.path.join(BASE, "data", "outfit_demo_dataset.csv"), index=False)

    X, y = df[FEATURES], df["match_score"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE)

    model = Pipeline([
        ("prep", ColumnTransformer([
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
        ], remainder="passthrough")),          # budget passes through as a number
        ("rf", RandomForestRegressor(n_estimators=150, max_depth=12,
                                     min_samples_leaf=3, random_state=RANDOM_STATE)),
    ])
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    baseline_mae = mean_absolute_error(y_test, np.full(len(y_test), y_train.mean()))

    os.makedirs(os.path.join(BASE, "model"), exist_ok=True)
    joblib.dump(model, os.path.join(BASE, "model", "outfit_model.pkl"))

    metrics = {
        "dataset": "DEMONSTRATION data generated from Homework 1 rules + random noise",
        "rows": len(df), "train_rows": len(X_train), "test_rows": len(X_test),
        "features": FEATURES, "target": "match_score",
        "model": "RandomForestRegressor (150 trees) + OneHotEncoder",
        "test_MAE": round(mae, 2), "test_R2": round(r2, 3),
        "baseline_MAE_predict_mean": round(baseline_mae, 2),
    }
    with open(os.path.join(BASE, "model", "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print("Dataset rows:", len(df), "(demonstration data)")
    print("Features:", ", ".join(FEATURES), "| Target: match_score")
    print(f"Test MAE: {mae:.2f} points   (baseline that always predicts the mean: {baseline_mae:.2f})")
    print(f"Test R²:  {r2:.3f}")
    print("Saved: model/outfit_model.pkl and model/metrics.json")


if __name__ == "__main__":
    main()
