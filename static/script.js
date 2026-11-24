/* ===== Outfit Matchmaker – front-end preview (Homework 2) =====
   Homework 2 changes:
   - The form is submitted to Flask (POST). Validation and saving happen on the SERVER.
   - The match score shown after saving comes from the ML model (window.SAVED_LOOK.score).
   - This file only draws the illustrated preview and refills the form. */

// Colour data: display name, hex for the swatch, and whether it is a neutral
const COLORS = {
  black:    { name: "Black",      hex: "#1f1f1f", neutral: true },
  white:    { name: "White",      hex: "#ffffff", neutral: true },
  beige:    { name: "Beige",      hex: "#d9c3a5", neutral: true },
  navy:     { name: "Navy",       hex: "#1f2f5a", neutral: true },
  grey:     { name: "Grey",       hex: "#9a9a9a", neutral: true },
  red:      { name: "Red",        hex: "#c0272d", neutral: false },
  pink:     { name: "Pink",       hex: "#efa7bd", neutral: false },
  green:    { name: "Green",      hex: "#2f6b4f", neutral: false },
  blue:     { name: "Light blue", hex: "#9cc3e6", neutral: false },
  mustard:  { name: "Mustard",    hex: "#d6a32b", neutral: false },
  burgundy: { name: "Burgundy",   hex: "#7a1f35", neutral: false },
  gold:     { name: "Gold",       hex: "#c9a24a", neutral: false },
  silver:   { name: "Silver",     hex: "#c7ccd1", neutral: false }
};

// Colour harmony rules: safe (neutral) partner and accent partner for each main colour
const PAIRS = {
  black:    { safe: "white", accent: "red" },
  white:    { safe: "navy",  accent: "mustard" },
  beige:    { safe: "white", accent: "burgundy" },
  navy:     { safe: "white", accent: "mustard" },
  grey:     { safe: "black", accent: "pink" },
  red:      { safe: "black", accent: "gold" },
  pink:     { safe: "grey",  accent: "white" },
  green:    { safe: "beige", accent: "pink" },
  blue:     { safe: "white", accent: "navy" },
  mustard:  { safe: "navy",  accent: "white" },
  burgundy: { safe: "beige", accent: "gold" }
};

const OCCASION_NAMES = {
  wedding: "Wedding", work: "Work", university: "University day",
  family: "Family gathering", outing: "Casual outing", sport: "Sport"
};

const PIECE_NAMES = { top: "top", dress: "dress", abaya: "abaya", trousers: "trousers", skirt: "skirt" };


/* ---------- Helpers ---------- */
function $(id) { return document.getElementById(id); }

function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- Read inputs ---------- */
function readInputs() {
  const styleInput = document.querySelector('input[name="style"]:checked');
  return {
    lookName: $("lookName").value.trim(),
    occasion: $("occasion").value,
    mainColor: $("mainColor").value,
    mainPiece: $("mainPiece").value,
    budgetRaw: $("budget").value.trim(),
    budget: Number($("budget").value),
    season: $("season").value,
    style: styleInput ? styleInput.value : "",
    wantShoes: $("wantShoes").checked,
    wantBag: $("wantBag").checked,
    wantAccessory: $("wantAccessory").checked
  };
}

/* ---------- Validation ---------- */
function validate(data) {
  const errors = [];
  clearInvalid();

  if (data.lookName === "") {
    errors.push("Please enter a name for your look.");
    markInvalid("lookName");
  } else if (data.lookName.length < 3) {
    errors.push("Look name must be at least 3 characters.");
    markInvalid("lookName");
  }
  if (data.occasion === "") { errors.push("Please select an occasion."); markInvalid("occasion"); }
  if (data.mainColor === "") { errors.push("Please select the colour of your main piece."); markInvalid("mainColor"); }
  if (data.mainPiece === "") { errors.push("Please select the type of your main piece."); markInvalid("mainPiece"); }

  if (data.budgetRaw === "") {
    errors.push("Please enter your budget in SAR.");
    markInvalid("budget");
  } else if (isNaN(data.budget) || data.budget < 50 || data.budget > 10000) {
    errors.push("Budget must be a number between 50 and 10,000 SAR.");
    markInvalid("budget");
  }

  if (data.style === "") {
    errors.push("Please choose a preferred style.");
    document.querySelector('input[name="style"]').closest("fieldset").classList.add("invalid");
  }

  // Logical rules between inputs
  if (data.occasion === "sport" && (data.mainPiece === "dress" || data.mainPiece === "abaya")) {
    errors.push("A " + PIECE_NAMES[data.mainPiece] + " is not suitable for sport. Please choose a top, trousers or skirt.");
    markInvalid("mainPiece");
  }
  if (!data.wantShoes && !data.wantBag && !data.wantAccessory) {
    errors.push("Select at least one item to suggest (shoes, bag or accessory).");
    $("wantShoes").closest("fieldset").classList.add("invalid");
  }
  return errors;
}

function markInvalid(id) {
  const el = $(id);
  el.classList.add("invalid");
  el.setAttribute("aria-invalid", "true");
}

function clearInvalid() {
  document.querySelectorAll(".invalid").forEach(function (el) {
    el.classList.remove("invalid");
    el.removeAttribute("aria-invalid");
  });
}

function showErrors(errors) {
  const box = $("form-error");
  if (errors.length === 0) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.innerHTML = errors.length === 1
    ? "⚠ " + errors[0]
    : "⚠ Please fix the following:<br>• " + errors.join("<br>• ");
  box.hidden = false;
}

/* ---------- Simulated matching rules ---------- */
function buildLook(d) {
  const pair = PAIRS[d.mainColor];
  const main = COLORS[d.mainColor];
  let partner = pair.safe;
  let accent = pair.accent;

  // Style changes how much contrast is used
  if (d.style === "minimal") {
    accent = pair.safe;                       // keep everything quiet
  } else if (d.style === "bold") {
    partner = pair.accent;                    // put the contrast on the big piece
    accent = main.neutral ? "red" : "black";
  } else if (d.style === "classic" && (d.occasion === "wedding" || d.occasion === "family")) {
    accent = "gold";
  }

  // Missing main piece: what completes the outfit?
  let complement;
  if (d.mainPiece === "dress") {
    complement = d.season === "winter" ? COLORS[partner].name + " long coat" : COLORS[partner].name + " light cardigan or shawl";
  } else if (d.mainPiece === "abaya") {
    complement = COLORS[partner].name + " inner dress or wide trousers";
  } else if (d.mainPiece === "top") {
    if (d.occasion === "work") complement = COLORS[partner].name + " tailored trousers";
    else if (d.occasion === "wedding") complement = COLORS[partner].name + " satin maxi skirt";
    else if (d.occasion === "sport") complement = COLORS[partner].name + " joggers";
    else complement = COLORS[partner].name + " wide-leg jeans";
  } else {
    // trousers or skirt -> suggest a top
    if (d.occasion === "work") complement = COLORS[partner].name + " structured blouse";
    else if (d.occasion === "sport") complement = COLORS[partner].name + " breathable sports top";
    else complement = COLORS[partner].name + " flowy blouse";
  }

  // Shoes by occasion
  let shoes;
  if (d.occasion === "wedding") shoes = COLORS[accent].name + " heeled sandals";
  else if (d.occasion === "work") shoes = (main.neutral ? "Black" : COLORS[partner].name) + " loafers or low pumps";
  else if (d.occasion === "sport") shoes = "White running trainers";
  else if (d.occasion === "university") shoes = COLORS[partner].name + " comfortable flats or sneakers";
  else if (d.season === "summer") shoes = COLORS[partner].name + " flat sandals";
  else shoes = "White sneakers";

  // Bag by occasion
  let bag;
  if (d.occasion === "wedding") bag = COLORS[accent].name + " clutch";
  else if (d.occasion === "work" || d.occasion === "university") bag = COLORS[partner].name + " structured tote";
  else if (d.occasion === "sport") bag = "Black gym backpack";
  else bag = COLORS[accent].name + " crossbody bag";

  // Accessory
  let accessory = accent === "gold" || d.style === "classic" ? "Gold minimal earrings" : "Silver watch";
  if (d.occasion === "sport") accessory = "Sports cap";

  // Match score: start at 70 and adjust with rules
  let score = 70;
  if (main.neutral) score += 8;                                         // neutrals are easy to match
  if (d.style === "minimal" && main.neutral) score += 6;
  if (d.style === "bold" && !main.neutral) score += 5;
  if (d.occasion === "wedding" && (d.mainColor === "burgundy" || d.mainColor === "navy")) score += 8;
  if (d.occasion === "work" && ["navy", "grey", "black", "white", "beige"].includes(d.mainColor)) score += 8;
  if (d.occasion === "work" && d.style === "bold") score -= 10;        // bold contrast is risky at work
  if (d.occasion === "wedding" && d.mainColor === "white") score -= 15; // white is usually the bride's colour
  if (d.season === "summer" && ["black", "burgundy", "navy"].includes(d.mainColor)) score -= 4;
  if (d.season === "winter" && ["white", "pink", "blue"].includes(d.mainColor)) score -= 3;
  score = Math.max(40, Math.min(98, score));

  // Price tier from budget
  let tier;
  if (d.budget >= 2000) tier = "Premium brands";
  else if (d.budget >= 700) tier = "Mid-range brands";
  else if (d.budget >= 250) tier = "High-street stores";
  else tier = "Budget picks / use what you own";

  const tip = makeTip(d, score);

  let fabric;
  if (d.season === "summer") fabric = "Linen or cotton";
  else if (d.season === "winter") fabric = "Wool or knit";
  else fabric = "Light crepe or denim";

  // ----- Data for the illustrated preview -----
  let shoeKind, shoeColor;
  if (d.occasion === "wedding") { shoeKind = "heels"; shoeColor = accent; }
  else if (d.occasion === "work") { shoeKind = "loafers"; shoeColor = main.neutral ? "black" : partner; }
  else if (d.occasion === "sport") { shoeKind = "trainers"; shoeColor = "white"; }
  else if (d.occasion === "university") { shoeKind = "flats"; shoeColor = partner; }
  else if (d.season === "summer") { shoeKind = "sandals"; shoeColor = partner; }
  else { shoeKind = "trainers"; shoeColor = "white"; }

  let bagKind, bagColor;
  if (d.occasion === "wedding") { bagKind = "clutch"; bagColor = accent; }
  else if (d.occasion === "work" || d.occasion === "university") { bagKind = "tote"; bagColor = partner; }
  else if (d.occasion === "sport") { bagKind = "backpack"; bagColor = "black"; }
  else { bagKind = "crossbody"; bagColor = accent; }

  const visual = {
    piece: d.mainPiece, style: d.style, main: d.mainColor, partner: partner, accent: accent,
    bottomKind: d.mainPiece === "skirt" ? (d.occasion === "wedding" ? "maxi" : "midi")
              : d.mainPiece === "top" ? (d.occasion === "wedding" ? "maxi" : "trousers") : "trousers",
    layerKind: d.season === "winter" ? "coat" : "cardigan",
    shoes: d.wantShoes ? { kind: shoeKind, color: shoeColor } : null,
    bag: d.wantBag ? { kind: bagKind, color: bagColor } : null,
    accessory: d.wantAccessory ? (d.occasion === "sport" ? "cap" : (accent === "gold" || d.style === "classic" ? "gold" : "silver")) : null
  };

  return {
    visual: visual,
    name: d.lookName, occasion: d.occasion, style: d.style,
    mainText: main.name + " " + PIECE_NAMES[d.mainPiece],
    colors: [d.mainColor, partner, accent],
    complement: complement,
    shoes: d.wantShoes ? shoes : null,
    bag: d.wantBag ? bag : null,
    accessory: d.wantAccessory ? accessory : null,
    fabric: fabric, tier: tier, score: score, tip: tip
  };
}

// Short tip using if / else if / else (uses the ML score once the look is saved)
function makeTip(d, score) {
  if (d.occasion === "wedding" && d.mainColor === "white") {
    return "White is usually reserved for the bride. Consider beige or a pastel shade instead.";
  } else if (score >= 85) {
    return "Excellent harmony! These colours are a proven combination for this occasion.";
  } else if (score >= 70) {
    return "Good match. Keep accessories simple so the main piece stays the focus.";
  }
  return "Fair match. Try a more neutral style or a different main colour for a safer look.";
}

/* ---------- Illustrated outfit preview (SVG built from the look) ---------- */
const SKIN = "#f1cdb0";
const HAIR = "#3b2620";
const LINE = 'stroke="#3a2f3a" stroke-opacity="0.3" stroke-width="0.9" stroke-linejoin="round"';

function hex(c) { return COLORS[c].hex; }
function shape(d, fill) { return '<path d="' + d + '" fill="' + fill + '" ' + LINE + "/>"; }

function drawShoe(kind, x, c) {
  if (kind === "heels") {
    return '<path d="M' + (x - 8) + " 291 Q" + (x - 2) + " 283 " + (x + 8) + " 289 L" + (x + 8) + " 292 Z\" fill=\"" + c + '" ' + LINE + "/>" +
           '<rect x="' + (x - 8) + '" y="290" width="1.8" height="7" fill="' + c + '"/>';
  }
  if (kind === "loafers") return '<rect x="' + (x - 7) + '" y="285" width="15" height="7" rx="3.5" fill="' + c + '" ' + LINE + "/>";
  if (kind === "trainers") {
    return '<rect x="' + (x - 8) + '" y="283" width="17" height="9" rx="4" fill="' + c + '" ' + LINE + "/>" +
           '<rect x="' + (x - 8) + '" y="290" width="17" height="2.5" rx="1.2" fill="#d6d6d6"/>' +
           '<path d="M' + (x - 3) + " 286 h5 M" + (x - 3) + ' 288 h5" stroke="#9a9a9a" stroke-width="0.8"/>';
  }
  if (kind === "sandals") {
    return '<ellipse cx="' + x + '" cy="291" rx="8" ry="2.4" fill="' + c + '" ' + LINE + "/>" +
           '<path d="M' + (x - 4) + " 290 Q" + x + " 283 " + (x + 4) + ' 290" fill="none" stroke="' + c + '" stroke-width="2"/>';
  }
  return '<ellipse cx="' + x + '" cy="290" rx="8" ry="3.6" fill="' + c + '" ' + LINE + "/>"; // ballet flats
}

function drawFace(cx, cy) {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="10" ry="12" fill="' + SKIN + '"/>' +
    // brows
    '<path d="M' + (cx - 6.5) + " " + (cy - 4.5) + " q2.5 -1.6 4.5 0 M" + (cx + 2) + " " + (cy - 4.5) + ' q2.5 -1.6 4.5 0" fill="none" stroke="' + HAIR + '" stroke-width="0.8" stroke-linecap="round"/>' +
    // eyes with lashes
    '<ellipse cx="' + (cx - 4) + '" cy="' + (cy - 0.5) + '" rx="1.3" ry="1.7" fill="#2b1d1a"/>' +
    '<ellipse cx="' + (cx + 4) + '" cy="' + (cy - 0.5) + '" rx="1.3" ry="1.7" fill="#2b1d1a"/>' +
    '<path d="M' + (cx - 6) + " " + (cy - 1.8) + " l-1.2 -0.8 M" + (cx + 6) + " " + (cy - 1.8) + ' l1.2 -0.8" stroke="#2b1d1a" stroke-width="0.7" stroke-linecap="round"/>' +
    // blush
    '<circle cx="' + (cx - 6) + '" cy="' + (cy + 3.5) + '" r="2.2" fill="#f19b9b" opacity="0.45"/>' +
    '<circle cx="' + (cx + 6) + '" cy="' + (cy + 3.5) + '" r="2.2" fill="#f19b9b" opacity="0.45"/>' +
    // nose + lips
    '<path d="M' + cx + " " + (cy + 1) + " q-0.8 2 0.6 2.6" + '" fill="none" stroke="#c99a7e" stroke-width="0.7" stroke-linecap="round"/>' +
    '<path d="M' + (cx - 2.6) + " " + (cy + 6) + " Q" + cx + " " + (cy + 8.4) + " " + (cx + 2.6) + " " + (cy + 6) +
    " Q" + cx + " " + (cy + 5.2) + " " + (cx - 2.6) + " " + (cy + 6) + ' Z" fill="#c9566f"/>';
}

function outfitSVG(v) {
  const mainFill = hex(v.main);
  const accentHex = hex(v.accent);
  // Bold style: the partner piece gets accent stripes
  const partnerFill = v.style === "bold" ? "url(#boldStripes)" : hex(v.partner);
  const parts = [];
  const back = [];

  const defs = '<defs><pattern id="boldStripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
               '<rect width="7" height="7" fill="' + hex(v.partner) + '"/><rect width="3" height="7" fill="' + accentHex + '"/></pattern></defs>';

  // Slim fashion silhouette: narrow shoulders, defined waist, long legs
  const TOP = "M98 56 L142 56 Q147 60 145 70 L135 100 Q131 112 133 124 L107 124 Q109 112 105 100 L95 70 Q93 60 98 56 Z";
  let sleeves = ["M98 56 Q91 58 90 66 L82 120 L89 122 L98 74 Z", "M142 56 Q149 58 150 66 L158 120 L151 122 L142 74 Z"];
  let hands = [[85.5, 125], [154.5, 125]];
  const TROUSERS = "M107 122 L133 122 Q139 140 138 160 L135 286 L123 286 L120 168 L117 286 L105 286 L102 160 Q101 140 107 122 Z";
  const MAXI = "M107 122 L133 122 Q140 150 152 288 L88 288 Q100 150 107 122 Z";
  const MIDI = "M107 122 L133 122 Q140 145 148 232 L92 232 Q100 145 107 122 Z";

  let hemY = 288;
  let feet = [113, 127];
  let sleeveFill = mainFill;
  let torso = "";
  let waist = [107, 26];      // belt x and width

  if (v.piece === "dress") {
    torso = shape("M98 56 L142 56 Q147 60 145 70 L135 100 Q131 112 133 122 Q142 160 150 240 L90 240 Q98 160 107 122 Q109 112 105 100 L95 70 Q93 60 98 56 Z", mainFill);
    hemY = 240;
    const len = v.layerKind === "coat" ? 252 : 140;   // long coat in winter, short cardigan otherwise
    torso += shape("M97 56 L109 58 L106 " + len + " L90 " + len + " Q92 100 95 70 Z", partnerFill) +
             shape("M143 56 L131 58 L134 " + len + " L150 " + len + " Q148 100 145 70 Z", partnerFill);
    sleeveFill = partnerFill;
  } else if (v.piece === "abaya") {
    torso = shape("M97 56 L143 56 Q148 60 146 70 L160 288 L80 288 L94 70 Q92 60 97 56 Z", mainFill) +
            shape("M114 60 L126 60 L130 288 L110 288 Z", partnerFill);
    sleeves = ["M97 57 Q88 60 87 68 L76 124 L90 126 L98 78 Z", "M143 57 Q152 60 153 68 L164 124 L150 126 L142 78 Z"];
    hands = [[83, 130], [157, 130]];
    feet = [111, 129];
    waist = [92, 56];
  } else {
    const topFill = v.piece === "top" ? mainFill : partnerFill;
    const bottomFill = v.piece === "top" ? partnerFill : mainFill;
    let bottom;
    if (v.bottomKind === "trousers") { bottom = TROUSERS; feet = [111, 129]; }
    else if (v.bottomKind === "maxi") { bottom = MAXI; }
    else { bottom = MIDI; hemY = 232; }
    torso = shape(bottom, bottomFill) + shape(TOP, topFill);
    sleeveFill = topFill;
  }

  // Backpack sits behind the body
  if (v.bag && v.bag.kind === "backpack") {
    back.push('<rect x="130" y="62" width="36" height="52" rx="10" fill="' + hex(v.bag.color) + '" ' + LINE + "/>");
  }

  // Long hair falling behind the shoulders
  if (v.piece !== "abaya") {
    back.push('<path d="M108 22 Q102 52 99 88 Q107 95 116.5 86 L116.5 40 L123.5 40 L123.5 86 Q133 95 141 88 Q138 52 132 22 Z" fill="' + HAIR + '"/>');
  }

  // Slim legs, visible under shorter pieces
  if (hemY < 280) {
    parts.push('<path d="M109 ' + (hemY - 3) + " L117 " + (hemY - 3) + ' L115.5 289 L111 289 Z" fill="' + SKIN + '"/>' +
               '<path d="M123 ' + (hemY - 3) + " L131 " + (hemY - 3) + ' L129 289 L124.5 289 Z" fill="' + SKIN + '"/>');
  }
  // Shoes
  const shoe = v.shoes ? v.shoes : { kind: "flats", color: "beige" };
  parts.push(drawShoe(shoe.kind, feet[0], hex(shoe.color)) + drawShoe(shoe.kind, feet[1], hex(shoe.color)));

  // Neck, then clothes
  parts.push('<path d="M116.5 38 L123.5 38 L124 58 L116 58 Z" fill="' + SKIN + '"/>');
  parts.push(torso);
  parts.push(shape(sleeves[0], sleeveFill) + shape(sleeves[1], sleeveFill));
  parts.push('<ellipse cx="' + hands[0][0] + '" cy="' + hands[0][1] + '" rx="3.6" ry="4.6" fill="' + SKIN + '"/>' +
             '<ellipse cx="' + hands[1][0] + '" cy="' + hands[1][1] + '" rx="3.6" ry="4.6" fill="' + SKIN + '"/>');

  // Style details
  if (v.style === "classic") {
    parts.push('<rect x="' + waist[0] + '" y="117" width="' + waist[1] + '" height="5.5" rx="1" fill="' + accentHex + '" ' + LINE + "/>" +
               '<rect x="117" y="115.8" width="6" height="8" rx="1.2" fill="none" stroke="#c9a24a" stroke-width="1.6"/>');
  } else if (v.style === "modern") {
    parts.push('<path d="M100 90 L142 68 L141 78 L102 100 Z" fill="' + accentHex + '" opacity="0.9"/>');
  }

  // Head: hijab with the abaya, otherwise face + hair
  if (v.piece === "abaya") {
    parts.push('<path d="M106 32 Q105 11 120 11 Q135 11 134 32 L141 64 L99 64 Z" fill="' + mainFill + '" ' + LINE + "/>" + drawFace(120, 30));
  } else {
    parts.push(drawFace(120, 30) +
      '<path d="M109.5 27 Q108 13 121 13 Q133 13 131.5 28 Q129 20 122 19 Q118 24 109.5 27 Z" fill="' + HAIR + '"/>');
  }

  // Accessory
  if (v.accessory === "cap") {
    parts.push('<path d="M108.5 22 Q120 7 131.5 22 Z" fill="#1f1f1f"/><path d="M130 21 L144 24 L130 24 Z" fill="#1f1f1f"/>');
  } else if (v.accessory) {
    const metal = v.accessory === "gold" ? "#c9a24a" : "#b9c0c6";
    if (v.piece === "abaya") parts.push('<circle cx="120" cy="66" r="3" fill="' + metal + '" stroke="#fff" stroke-width="1.2"/>');
    else parts.push('<circle cx="110" cy="35" r="1.8" fill="' + metal + '"/><circle cx="130" cy="35" r="1.8" fill="' + metal + '"/>');
  }

  // Bag
  if (v.bag) {
    const c = hex(v.bag.color);
    const hx = hands[1][0];
    if (v.bag.kind === "clutch") {
      parts.push('<rect x="' + (hx - 6) + '" y="119" width="28" height="15" rx="3" fill="' + c + '" ' + LINE + "/>" +
                 '<path d="M' + (hx - 6) + " 124 L" + (hx + 22) + ' 124" stroke="#000" stroke-opacity="0.2"/>');
    } else if (v.bag.kind === "tote") {
      parts.push('<path d="M' + (hx - 6) + " 134 Q" + (hx + 6) + " 112 " + (hx + 18) + ' 134" fill="none" stroke="' + c + '" stroke-width="2.4"/>' +
                 '<rect x="' + (hx - 12) + '" y="130" width="36" height="32" rx="3" fill="' + c + '" ' + LINE + "/>");
    } else if (v.bag.kind === "crossbody") {
      parts.push('<path d="M100 58 L' + (hx - 2) + ' 140" stroke="' + c + '" stroke-width="2"/>' +
                 '<rect x="' + (hx - 9) + '" y="136" width="26" height="19" rx="6" fill="' + c + '" ' + LINE + "/>");
    } else {
      parts.push('<path d="M106 57 L109 104 M134 57 L131 104" stroke="' + c + '" stroke-width="3" stroke-linecap="round"/>');
    }
  }

  return '<svg class="outfit-svg" viewBox="62 4 116 298" role="img" aria-label="Illustrated preview of the suggested outfit on a model">' +
         defs + back.join("") + parts.join("") + "</svg>";
}

/* ---------- Render result (DOM manipulation) ---------- */
function renderLook(look, saved) {
  const labels = ["Main", "Partner", "Accent"];
  const swatches = look.colors.map(function (c, i) {
    return '<div class="swatch"><span style="background:' + COLORS[c].hex + '" title="' + COLORS[c].name + '"></span>' +
           labels[i] + "<br>" + COLORS[c].name + "</div>";
  }).join("");

  let items = '<li><b>Main piece</b><span>' + escapeHTML(look.mainText) + "</span></li>" +
              "<li><b>Pair with</b><span>" + look.complement + "</span></li>";
  if (look.shoes) items += "<li><b>Shoes</b><span>" + look.shoes + "</span></li>";
  if (look.bag) items += "<li><b>Bag</b><span>" + look.bag + "</span></li>";
  if (look.accessory) items += "<li><b>Accessory</b><span>" + look.accessory + "</span></li>";
  items += "<li><b>Fabric</b><span>" + look.fabric + "</span></li>";
  items += "<li><b>Price tier</b><span>" + look.tier + "</span></li>";

  $("result").innerHTML =
    '<span class="result-label">' + (saved ? "SAVED · ML PREDICTION" : "LIVE PREVIEW") + "</span>" +
    '<p class="result-title"><strong>' + escapeHTML(look.name) + "</strong> · " + OCCASION_NAMES[look.occasion] +
    " · " + capitalize(look.style) + "</p>" +
    '<figure class="outfit-preview">' + outfitSVG(look.visual) +
    "<figcaption>How your look will appear · " + capitalize(look.style) + " style</figcaption></figure>" +
    '<div class="palette">' + swatches + "</div>" +
    '<ul class="result-list">' + items + "</ul>" +
    (saved
      ? '<p class="score-text">Match score: ' + look.score + "% <small>(ML model)</small></p>" +
        '<div class="score-bar"><div class="score-fill" style="width:0%"></div></div>' +
        '<p class="tip">💡 ' + look.tip + "</p>"
      : '<p class="placeholder">Press <strong>Match &amp; save my look</strong> to get the ML match score and save this look.</p>');

  // animate score bar after it is inserted
  if (saved) {
    requestAnimationFrame(function () {
      document.querySelector(".score-fill").style.width = look.score + "%";
    });
  }
}

/* ---------- Refill the form with values sent by Flask ---------- */
function fillForm(v) {
  if (!v || Object.keys(v).length === 0) return;
  ["lookName", "occasion", "mainColor", "mainPiece", "budget", "season"].forEach(function (id) {
    if (v[id] !== undefined && v[id] !== null) $(id).value = v[id];
  });
  document.querySelectorAll('input[name="style"]').forEach(function (r) { r.checked = (r.value === v.style); });
  const extras = Array.isArray(v.extras) ? v.extras : (v.extras ? [v.extras] : []);
  ["shoes", "bag", "accessory"].forEach(function (x) {
    $("want" + capitalize(x)).checked = extras.includes(x);
  });
}

function isComplete(d) {
  return d.lookName.length >= 3 && d.occasion && d.mainColor && d.mainPiece && d.style &&
         d.budget >= 50 && d.budget <= 10000 &&
         !(d.occasion === "sport" && (d.mainPiece === "dress" || d.mainPiece === "abaya")) &&
         (d.wantShoes || d.wantBag || d.wantAccessory);
}

/* ---------- Event listeners (only on the Home page) ---------- */
const form = $("outfit-form");
if (form) {
  fillForm(window.FORM_VALUES);

  // After a successful save, Flask sends the saved look with its ML score
  if (window.SAVED_LOOK) {
    const d = readInputs();
    const look = buildLook(d);
    look.score = window.SAVED_LOOK.score;
    look.tip = makeTip(d, look.score);
    renderLook(look, true);
  }

  // No preventDefault: the form is sent to Flask, which validates and saves it.

  form.addEventListener("reset", function () {
    clearInvalid();
    showErrors([]);
    const msg = $("save-msg");
    if (msg) msg.textContent = "";
    $("result").innerHTML = '<p class="placeholder">Fill in the form and press <strong>Match &amp; save my look</strong> to see your suggested look here.</p>';
    window.FORM_VALUES = {};
    // the browser resets to the refilled values, so clear them explicitly
    setTimeout(function () {
      ["lookName", "occasion", "mainColor", "mainPiece", "budget"].forEach(function (id) { $(id).value = ""; });
      $("season").value = "summer";
      document.querySelectorAll('input[name="style"]').forEach(function (r) { r.checked = false; });
      $("wantShoes").checked = true; $("wantBag").checked = true; $("wantAccessory").checked = false;
    }, 0);
  });

  // Live preview: once all fields look complete, redraw the illustration (no score until saved)
  form.addEventListener("change", function () {
    const d = readInputs();
    if (!isComplete(d)) return;
    renderLook(buildLook(d), false);
  });

  // Remove the red highlight as soon as the user fixes a field
  form.addEventListener("input", function (e) {
    e.target.classList.remove("invalid");
    e.target.removeAttribute("aria-invalid");
    const fs = e.target.closest("fieldset");
    if (fs) fs.classList.remove("invalid");
  });
}
