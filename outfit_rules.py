"""Outfit suggestions (partner piece, shoes, bag) – ported from script.js (Homework 1).

These rules only choose WHICH items to suggest so they can be saved in the
database. The match score is NOT calculated here: it comes from the ML model
(see predictor.py).
"""

COLOR_NAMES = {
    "black": "Black", "white": "White", "beige": "Beige", "navy": "Navy",
    "grey": "Grey", "red": "Red", "pink": "Pink", "green": "Green",
    "blue": "Light blue", "mustard": "Mustard", "burgundy": "Burgundy",
    "gold": "Gold", "silver": "Silver",
}
NEUTRALS = {"black", "white", "beige", "navy", "grey"}

PAIRS = {
    "black": ("white", "red"),     "white": ("navy", "mustard"),
    "beige": ("white", "burgundy"), "navy": ("white", "mustard"),
    "grey": ("black", "pink"),     "red": ("black", "gold"),
    "pink": ("grey", "white"),     "green": ("beige", "pink"),
    "blue": ("white", "navy"),     "mustard": ("navy", "white"),
    "burgundy": ("beige", "gold"),
}

OCCASION_NAMES = {
    "wedding": "Wedding", "work": "Work", "university": "University day",
    "family": "Family gathering", "outing": "Casual outing", "sport": "Sport",
}


def suggest_items(d):
    """Return a dict with the suggested complement, shoes and bag text."""
    safe, accent = PAIRS[d["mainColor"]]
    partner = safe
    neutral = d["mainColor"] in NEUTRALS

    if d["style"] == "minimal":
        accent = safe
    elif d["style"] == "bold":
        partner = accent
        accent = "red" if neutral else "black"
    elif d["style"] == "classic" and d["occasion"] in ("wedding", "family"):
        accent = "gold"

    p, a = COLOR_NAMES[partner], COLOR_NAMES[accent]
    occ, piece = d["occasion"], d["mainPiece"]

    # Piece that completes the outfit
    if piece == "dress":
        complement = f"{p} long coat" if d["season"] == "winter" else f"{p} light cardigan or shawl"
    elif piece == "abaya":
        complement = f"{p} inner dress or wide trousers"
    elif piece == "top":
        complement = {"work": f"{p} tailored trousers", "wedding": f"{p} satin maxi skirt",
                      "sport": f"{p} joggers"}.get(occ, f"{p} wide-leg jeans")
    else:  # trousers or skirt -> suggest a top
        complement = {"work": f"{p} structured blouse",
                      "sport": f"{p} breathable sports top"}.get(occ, f"{p} flowy blouse")

    # Shoes
    if occ == "wedding":
        shoes = f"{a} heeled sandals"
    elif occ == "work":
        shoes = ("Black" if neutral else p) + " loafers or low pumps"
    elif occ == "sport":
        shoes = "White running trainers"
    elif occ == "university":
        shoes = f"{p} comfortable flats or sneakers"
    elif d["season"] == "summer":
        shoes = f"{p} flat sandals"
    else:
        shoes = "White sneakers"

    # Bag
    if occ == "wedding":
        bag = f"{a} clutch"
    elif occ in ("work", "university"):
        bag = f"{p} structured tote"
    elif occ == "sport":
        bag = "Black gym backpack"
    else:
        bag = f"{a} crossbody bag"

    extras = d.get("extras", ["shoes", "bag"])
    return {
        "complement": complement,
        "shoes": shoes if "shoes" in extras else None,
        "bag": bag if "bag" in extras else None,
    }
