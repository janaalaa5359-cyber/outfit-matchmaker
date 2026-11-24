"""Server-side validation for the Outfit Matchmaker form.

The same function is used by the HTML form route ("/") and by the JSON API
("/predict"), so both apply exactly the same rules.
"""

OCCASIONS = {"wedding", "work", "university", "family", "outing", "sport"}
COLORS = {"black", "white", "beige", "navy", "grey", "red", "pink",
          "green", "blue", "mustard", "burgundy"}
PIECES = {"top", "dress", "abaya", "trousers", "skirt"}
SEASONS = {"summer", "winter", "spring"}
STYLES = {"classic", "modern", "minimal", "bold"}
EXTRAS = {"shoes", "bag", "accessory"}

BUDGET_MIN = 50
BUDGET_MAX = 10000


def validate_look(raw, require_name=True):
    """Check the submitted values.

    raw: a dict-like object (request.form or JSON). For the form, "extras"
         is a list of the ticked checkboxes.
    require_name: the form needs a look name; the /predict API does not.

    Returns (clean_data, errors). If errors is not empty, nothing should be saved.
    """
    errors = []
    data = {}

    # Look name (text)
    name = str(raw.get("lookName", "") or "").strip()
    if require_name:
        if name == "":
            errors.append("Please enter a name for your look.")
        elif len(name) < 3:
            errors.append("Look name must be at least 3 characters.")
        elif len(name) > 40:
            errors.append("Look name must be 40 characters or fewer.")
    data["lookName"] = name

    # Select / radio inputs: the value must be one of the allowed options
    def check_choice(field, allowed, message, default=None):
        value = str(raw.get(field, "") or "").strip().lower()
        if value == "" and default is not None:
            value = default
        if value not in allowed:
            errors.append(message)
        data[field] = value

    check_choice("occasion", OCCASIONS, "Please select a valid occasion.")
    check_choice("mainColor", COLORS, "Please select a valid main piece colour.")
    check_choice("mainPiece", PIECES, "Please select a valid main piece type.")
    check_choice("season", SEASONS, "Please select a valid season.", default="summer")
    check_choice("style", STYLES, "Please choose a preferred style.")

    # Budget (number between 50 and 10,000)
    budget_raw = raw.get("budget", "")
    budget_text = str(budget_raw if budget_raw is not None else "").strip()
    if budget_text == "":
        errors.append("Please enter your budget in SAR.")
        data["budget"] = None
    else:
        try:
            budget = float(budget_text)
        except ValueError:
            budget = None
        if budget is None or budget != budget:  # also rejects NaN
            errors.append("Budget must be a number.")
            data["budget"] = None
        elif budget < BUDGET_MIN or budget > BUDGET_MAX:
            errors.append(f"Budget must be between {BUDGET_MIN} and {BUDGET_MAX:,} SAR.")
            data["budget"] = budget
        else:
            data["budget"] = int(round(budget))

    # Logical rule between inputs (same as Homework 1)
    if data["occasion"] == "sport" and data["mainPiece"] in ("dress", "abaya"):
        errors.append(f"A {data['mainPiece']} is not suitable for sport. "
                      "Please choose a top, trousers or skirt.")

    # Extras (checkboxes) – only checked for the form
    if require_name:
        if hasattr(raw, "getlist"):
            extras = raw.getlist("extras")
        else:
            extras = raw.get("extras", []) or []
        extras = [e for e in extras if e in EXTRAS]
        if not extras:
            errors.append("Select at least one item to suggest (shoes, bag or accessory).")
        data["extras"] = extras

    return data, errors
