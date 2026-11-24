"""Outfit Matchmaker – Flask application (DS432 Group Homework 2).

Pages : /  (form, POST)   /records  (saved looks from SQLite)   /about
API   : POST /predict  (JSON prediction)    GET /health  (service status)
"""

from datetime import datetime

from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy

from outfit_rules import OCCASION_NAMES, COLOR_NAMES, suggest_items
from predictor import model_info, model_loaded, predict_score
from validation import validate_look

app = Flask(__name__)

# ---------- Database connection (SQLAlchemy + SQLite) ----------
# The database is a single file: instance/outfits.db
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///outfits.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)


class Look(db.Model):
    """One saved outfit look (one row in the 'look' table)."""
    id = db.Column(db.Integer, primary_key=True)
    look_name = db.Column(db.String(40), nullable=False)
    occasion = db.Column(db.String(20), nullable=False)
    main_color = db.Column(db.String(20), nullable=False)
    main_piece = db.Column(db.String(20), nullable=False)
    season = db.Column(db.String(20), nullable=False)
    style = db.Column(db.String(20), nullable=False)
    budget = db.Column(db.Integer, nullable=False)
    extras = db.Column(db.String(40), nullable=False)          # e.g. "shoes,bag"
    suggested_complement = db.Column(db.String(80))
    suggested_shoes = db.Column(db.String(80))
    suggested_bag = db.Column(db.String(80))
    match_score = db.Column(db.Integer, nullable=False)        # from the ML model
    created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)

    @property
    def code(self):
        return f"L{self.id:03d}"

    @property
    def main_text(self):
        return f"{COLOR_NAMES[self.main_color]} {self.main_piece}"

    @property
    def occasion_text(self):
        return OCCASION_NAMES[self.occasion]

    def form_values(self):
        """Values used to refill the form and draw the preview after saving."""
        return {
            "lookName": self.look_name, "occasion": self.occasion,
            "mainColor": self.main_color, "mainPiece": self.main_piece,
            "season": self.season, "style": self.style, "budget": self.budget,
            "extras": self.extras.split(",") if self.extras else [],
            "score": self.match_score, "id": self.code,
        }


with app.app_context():
    db.create_all()   # creates the table only if it does not exist yet


# ---------- Pages ----------
@app.route("/", methods=["GET", "POST"])
def home():
    errors = []
    values = {}
    saved = None

    if request.method == "POST":
        data, errors = validate_look(request.form)
        if errors:
            # Invalid: show the errors, keep what the user typed, save NOTHING.
            values = dict(request.form)
            values["extras"] = request.form.getlist("extras")
            recent = Look.query.order_by(Look.id.desc()).limit(5).all()
            return render_template("index.html", errors=errors, values=values,
                                   saved=None, recent=recent), 400

        # Valid: suggestions + ML score, then save to the database.
        items = suggest_items(data)
        look = Look(
            look_name=data["lookName"], occasion=data["occasion"],
            main_color=data["mainColor"], main_piece=data["mainPiece"],
            season=data["season"], style=data["style"], budget=data["budget"],
            extras=",".join(data["extras"]),
            suggested_complement=items["complement"],
            suggested_shoes=items["shoes"], suggested_bag=items["bag"],
            match_score=predict_score(data),
        )
        db.session.add(look)
        db.session.commit()
        # Post/Redirect/Get: refreshing the page will not save the look twice.
        return redirect(url_for("home", saved=look.id) + "#matchmaker")

    saved_id = request.args.get("saved", type=int)
    if saved_id:
        look = db.session.get(Look, saved_id)
        if look:
            saved = look.form_values()
            values = saved

    recent = Look.query.order_by(Look.id.desc()).limit(5).all()
    return render_template("index.html", errors=errors, values=values,
                           saved=saved, recent=recent)


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/records")
def records():
    looks = Look.query.order_by(Look.created_at.desc()).all()
    return render_template("records.html", looks=looks, total=Look.query.count())


# ---------- ML web service (JSON API) ----------
@app.route("/predict", methods=["POST"])
def predict_api():
    """POST JSON with the outfit inputs -> JSON with the predicted match score."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Request body must be JSON, e.g. "
                                 '{"occasion": "wedding", "mainColor": "burgundy", ...}'}), 400

    data, errors = validate_look(payload, require_name=False)
    if errors:
        return jsonify({"error": "Invalid input", "details": errors}), 400

    if not model_loaded():
        return jsonify({"error": "Model is not loaded on the server"}), 503

    data["extras"] = ["shoes", "bag"]
    items = suggest_items(data)
    return jsonify({
        "match_score": predict_score(data),
        "inputs": {k: data[k] for k in ("occasion", "mainColor", "mainPiece",
                                        "season", "style", "budget")},
        "suggested": items,
        "model": model_info()["model"],
    })


@app.route("/health")
def health():
    """Service status check."""
    return jsonify({
        "status": "ok" if model_loaded() else "model_missing",
        "service": "Outfit Matchmaker ML API",
        "model_loaded": model_loaded(),
        **model_info(),
    }), (200 if model_loaded() else 503)


if __name__ == "__main__":
    app.run(debug=True)
