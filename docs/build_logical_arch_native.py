"""Rebuild Logical Architecture (C4 L2) slide as native PowerPoint shapes.

Layout (slide 10in x 5.625in):
* Title                    y = 0.05 - 0.35
* Left section (swimlanes) x = 0.00 - 6.80      (lane labels + numbered nodes + arrows)
* Right section (commentary)  x = 6.95 - 9.95   (numbered legend)
* Footer                   y = 5.45 - 5.60

Idempotent - clears slide 5 and rebuilds.
"""
from pptx import Presentation
from pptx.util import Inches, Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from lxml import etree
import os

PPTX = r"D:\WorkspaceAI\hack2future\Hack2furure\docs\hackathon_blueprint_filled.pptx"
SLIDE_TITLE = "Logical Architecture (C4 L2)"


def rgb(h):
    h = h.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


C = {
    "orange":    rgb("#ea580c"), "orange_d": rgb("#9a3412"), "orange_lt": rgb("#fff7ed"), "orange_bd": rgb("#fed7aa"),
    "blue":      rgb("#0078d4"), "blue_d":   rgb("#0a2540"), "blue_lt":   rgb("#dbeafe"), "blue_bg":   rgb("#eff6ff"), "blue_bd": rgb("#bfdbfe"),
    "purple":    rgb("#742774"), "purple_d": rgb("#3d2c70"), "purple_lt": rgb("#ede4f5"), "purple_bg": rgb("#faf5ff"), "purple_bd": rgb("#e9d5ff"),
    "green":     rgb("#107c10"), "green_d":  rgb("#0e3a0e"), "green_lt":  rgb("#dcfce7"), "green_bg":  rgb("#f0fdf4"), "green_bd": rgb("#bbf7d0"),
    "gold":      rgb("#d99416"), "gold_d":   rgb("#92400e"), "gold_lt":   rgb("#f5b73a"), "gold_bg":   rgb("#fef3c7"), "gold_bd":  rgb("#fde68a"),
    "red":       rgb("#dc2626"), "red_d":    rgb("#7f1d1d"), "red_lt":    rgb("#fee2e2"),
    "amber":     rgb("#d97706"),
    "white":     rgb("#ffffff"), "black":    rgb("#0f172a"), "grey":     rgb("#5a6680"),
}


def I(v):
    return Inches(v)


def add_rect(slide, x, y, w, h, fill, line=None, line_w=0.75, rounded=True):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shape_type, I(x), I(y), I(w), I(h))
    s.fill.solid(); s.fill.fore_color.rgb = fill
    if line is not None:
        s.line.color.rgb = line; s.line.width = Pt(line_w)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def add_text(slide, x, y, w, h, text, *, size=8, bold=False, color=C["black"],
             align="left", valign="middle", italic=False):
    tb = slide.shapes.add_textbox(I(x), I(y), I(w), I(h))
    tf = tb.text_frame
    tf.margin_left = Emu(15000); tf.margin_right = Emu(15000)
    tf.margin_top = Emu(5000); tf.margin_bottom = Emu(5000)
    tf.word_wrap = True
    tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE, "bottom": MSO_ANCHOR.BOTTOM}[valign]
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[align]
        r = p.add_run(); r.text = line
        r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
        r.font.color.rgb = color
    return tb


def add_card(slide, x, y, w, h, fill, line, line_w, text, *,
             size=8, bold=False, font_color=C["black"], align="center", valign="middle"):
    add_rect(slide, x, y, w, h, fill, line, line_w)
    add_text(slide, x, y, w, h, text, size=size, bold=bold, color=font_color,
             align=align, valign=valign)


def add_numbered_node(slide, x, y, w, h, fill, line, line_w, number, label,
                      *, num_size=12, label_size=6, num_color=C["black"], label_color=C["black"]):
    add_rect(slide, x, y, w, h, fill, line, line_w)
    tb = slide.shapes.add_textbox(I(x), I(y), I(w), I(h))
    tf = tb.text_frame
    tf.margin_left = Emu(10000); tf.margin_right = Emu(10000)
    tf.margin_top = Emu(8000); tf.margin_bottom = Emu(8000)
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p1 = tf.paragraphs[0]; p1.alignment = PP_ALIGN.CENTER
    r1 = p1.add_run(); r1.text = str(number)
    r1.font.size = Pt(num_size); r1.font.bold = True; r1.font.color.rgb = num_color
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run(); r2.text = label
    r2.font.size = Pt(label_size); r2.font.bold = True; r2.font.color.rgb = label_color


def add_arrow(slide, x1, y1, x2, y2, color, weight=1.25, dashed=False):
    """Draw an arrow with a triangle head from (x1,y1) to (x2,y2). Uses STRAIGHT connector."""
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, I(x1), I(y1), I(x2), I(y2))
    conn.line.color.rgb = color
    conn.line.width = Pt(weight)
    # Force arrow head on tail end
    ln = conn.line._get_or_add_ln()
    tailEnd = ln.find(qn('a:tailEnd'))
    if tailEnd is None:
        tailEnd = etree.SubElement(ln, qn('a:tailEnd'))
    tailEnd.set('type', 'triangle'); tailEnd.set('w', 'sm'); tailEnd.set('len', 'sm')
    if dashed:
        prstDash = ln.find(qn('a:prstDash'))
        if prstDash is None:
            prstDash = etree.SubElement(ln, qn('a:prstDash'))
        prstDash.set('val', 'dash')
    return conn


def slide_title_text(slide):
    for shape in slide.shapes:
        if shape.has_text_frame and shape.text_frame.text.strip():
            return shape.text_frame.text.split("\n")[0].strip()
    return ""


def clear_slide(slide):
    sp_tree = slide.shapes._spTree
    for shape in list(slide.shapes):
        sp_tree.remove(shape._element)


# ======================================================================
# Node coordinate registry  -  (center_x, center_y) and edge anchor points
# Used to compute arrow endpoints.
# ======================================================================
NODES = {}  # key -> dict(x, y, w, h, cx, cy, top, bottom, left, right)


def register(key, x, y, w, h):
    NODES[key] = dict(x=x, y=y, w=w, h=h,
                      cx=x + w/2, cy=y + h/2,
                      top=(x + w/2, y),
                      bottom=(x + w/2, y + h),
                      left=(x, y + h/2),
                      right=(x + w, y + h/2))


def edge(node_key, side, offset=0):
    """Return a point on a node's edge. offset shifts along the edge."""
    n = NODES[node_key]
    if side == "top":    return (n["x"] + n["w"]/2 + offset, n["y"])
    if side == "bottom": return (n["x"] + n["w"]/2 + offset, n["y"] + n["h"])
    if side == "left":   return (n["x"], n["y"] + n["h"]/2 + offset)
    if side == "right":  return (n["x"] + n["w"], n["y"] + n["h"]/2 + offset)
    raise ValueError(side)


# ======================================================================
def build(slide):
    clear_slide(slide)

    # ====== TITLE ======
    add_text(slide, 0.08, 0.04, 9.85, 0.20,
             "Logical Architecture (C4 L2)  —  swimlanes + numbered flow",
             size=12, bold=True, color=C["blue_d"], align="left", valign="middle")
    add_text(slide, 0.08, 0.22, 9.85, 0.14,
             "Numbers 1-13 trace runtime flow  ·  read with the commentary panel on the right",
             size=6, italic=True, color=C["grey"], align="left", valign="middle")

    # ====== SWIMLANES (left section, x=0 - 6.80) ======
    DIAG_RIGHT = 6.80
    LABEL_X = 0.04
    LABEL_W = 0.55
    CONT_X = 0.61
    CONT_W = DIAG_RIGHT - CONT_X - 0.02   # ~6.17

    lane_specs = [
        ("CUSTOMER\n& CHANNELS",  0.40, 0.52, C["orange"], C["white"], C["orange_lt"], C["orange_bd"]),
        ("FRONTEND\n(SWA)",       0.94, 0.52, C["blue"],   C["white"], C["blue_bg"],   C["blue_bd"]),
        ("COPILOT\nSTUDIO",       1.48, 0.62, C["purple"], C["white"], C["purple_bg"], C["purple_bd"]),
        ("POWER\nAUTOMATE",       2.12, 0.62, C["purple"], C["white"], C["purple_bg"], C["purple_bd"]),
        ("AZURE AI\nSERVICES",    2.76, 0.92, C["blue"],   C["white"], C["blue_bg"],   C["blue_bd"]),
        ("M365 TEAMS\n(Human)",   3.70, 0.52, C["green"],  C["white"], C["green_bg"],  C["green_bd"]),
        ("DATAVERSE\nGlass Box",  4.24, 1.20, C["gold"],   C["white"], C["gold_bg"],   C["gold_bd"]),
    ]
    for label, y, h, lab_fill, lab_fc, bg_fill, bg_bd in lane_specs:
        add_rect(slide, CONT_X, y, CONT_W, h, bg_fill, bg_bd, 0.4, rounded=False)
        add_card(slide, LABEL_X, y, LABEL_W, h, lab_fill, lab_fill, 0.4,
                 label, size=6, bold=True, font_color=lab_fc, align="center", valign="middle")

    # ====== NUMBERED NODES ======
    # Compact width = 6.17 / shared between ~7 columns

    # Lane 1
    register("n1", 0.75, 0.44, 1.00, 0.42)
    add_numbered_node(slide, 0.75, 0.44, 1.00, 0.42, C["orange"], C["orange_d"], 0.5,
                      "1", "Customer + 5 channels",
                      num_color=C["white"], label_color=C["white"])

    # Lane 2
    register("n2", 1.05, 0.98, 1.10, 0.42)
    add_numbered_node(slide, 1.05, 0.98, 1.10, 0.42, C["blue_lt"], C["blue"], 0.5,
                      "2", "React SPA + Token Broker",
                      num_color=C["blue_d"], label_color=C["blue_d"])
    register("n3", 2.35, 0.98, 1.05, 0.42)
    add_numbered_node(slide, 2.35, 0.98, 1.05, 0.42, C["blue_lt"], C["blue"], 0.5,
                      "3", "Direct Line / Bot",
                      num_color=C["blue_d"], label_color=C["blue_d"])

    # Lane 3
    register("n4", 2.35, 1.55, 1.15, 0.48)
    add_numbered_node(slide, 2.35, 1.55, 1.15, 0.48, C["purple_lt"], C["purple"], 0.75,
                      "4", "Intake Agent (AI)",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    register("n12", 5.50, 1.55, 1.25, 0.48)
    add_numbered_node(slide, 5.50, 1.55, 1.25, 0.48, C["purple_lt"], C["purple"], 0.75,
                      "12", "Explanation Agent (AI — NOT CSR)",
                      num_color=C["purple_d"], label_color=C["purple_d"])

    # Lane 4
    register("n5", 2.60, 2.20, 0.85, 0.48)
    add_numbered_node(slide, 2.60, 2.20, 0.85, 0.48, C["purple_lt"], C["purple"], 0.5,
                      "5", "Create_Claim",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    register("n6", 3.55, 2.20, 1.05, 0.48)
    add_numbered_node(slide, 3.55, 2.20, 1.05, 0.48, C["purple_lt"], C["purple"], 0.75,
                      "6", "Master Orchestration",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    # Tier router diamond
    diamond = slide.shapes.add_shape(MSO_SHAPE.DIAMOND, I(4.70), I(2.20), I(0.75), I(0.48))
    diamond.fill.solid(); diamond.fill.fore_color.rgb = C["white"]
    diamond.line.color.rgb = C["green"]; diamond.line.width = Pt(1.0)
    diamond.shadow.inherit = False
    register("n11", 4.70, 2.20, 0.75, 0.48)
    add_text(slide, 4.70, 2.22, 0.75, 0.44, "11\nRouter",
             size=7, bold=True, color=C["green_d"], align="center", valign="middle")
    register("n13", 5.55, 2.20, 1.10, 0.48)
    add_numbered_node(slide, 5.55, 2.20, 1.10, 0.48, C["green_lt"], C["green"], 0.75,
                      "13", "Notify_Customer",
                      num_color=C["green_d"], label_color=C["green_d"])

    # Lane 5 (Azure AI Services - 3 stacked + Adjudication)
    register("n7", 2.60, 2.82, 1.50, 0.24)
    add_card(slide, 2.60, 2.82, 1.50, 0.24, C["blue_lt"], C["blue"], 0.5,
             "7  Extraction", size=7, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    register("n8", 2.60, 3.08, 1.50, 0.24)
    add_card(slide, 2.60, 3.08, 1.50, 0.24, C["blue_lt"], C["blue"], 0.5,
             "8  Policy", size=7, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    register("n9", 2.60, 3.34, 1.50, 0.24)
    add_card(slide, 2.60, 3.34, 1.50, 0.24, C["blue_lt"], C["blue"], 0.5,
             "9  Validation · 7 ext checks", size=6, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    register("n10", 4.30, 3.00, 1.50, 0.55)
    add_numbered_node(slide, 4.30, 3.00, 1.50, 0.55, C["blue_d"], C["blue_d"], 1.0,
                      "10", "Adjudication · GPT-4.1",
                      num_color=C["white"], label_color=C["white"])

    # Lane 6 (Teams humans)
    register("nT2", 4.30, 3.76, 1.20, 0.20)
    add_card(slide, 4.30, 3.76, 1.20, 0.20, C["gold_bg"], C["amber"], 0.5,
             "T2 · Adjuster Teams Card", size=6, bold=True, font_color=C["gold_d"], align="center", valign="middle")
    register("nT3", 5.55, 3.76, 1.20, 0.20)
    add_card(slide, 5.55, 3.76, 1.20, 0.20, C["red_lt"], C["red"], 0.5,
             "T3 · Live CSR Teams Chat", size=6, bold=True, font_color=C["red_d"], align="center", valign="middle")
    add_text(slide, 0.75, 3.78, 3.45, 0.16,
             "Tier 1 = AI auto-approve, no human",
             size=6, italic=True, color=C["grey"], align="left", valign="middle")

    # Lane 7 (Dataverse + Audit)
    tables = [
        ("Policy", 0.70, 0.60),
        ("Claim", 1.32, 0.60),
        ("Document", 1.94, 0.70),
        ("Communication", 2.66, 0.90),
        ("Adjuster", 3.58, 0.60),
        ("Vendor", 4.20, 0.60),
        ("ClaimVendorAssgmt", 4.82, 1.20),
    ]
    for name, x, w in tables:
        add_card(slide, x, 4.32, w, 0.24, C["purple"], C["purple_d"], 0.3,
                 name, size=5, bold=True, font_color=C["white"], align="center", valign="middle")
    register("audit", 0.70, 4.62, 6.05, 0.40)
    add_card(slide, 0.70, 4.62, 6.05, 0.40, C["gold_lt"], C["gold"], 1.5,
             "🛡  Decision_Rationale  ·  THE GLASS BOX  ·  every AI step writes 1 row  ·  4 · 7 · 8 · 9 · 10 · 12",
             size=7, bold=True, font_color=C["blue_d"], align="center", valign="middle")

    # ====== ARROWS ======
    R = C["red"]; B = C["black"]; G = C["gold"]
    # (1)→(2)
    add_arrow(slide, *edge("n1", "bottom"), *edge("n2", "top"), R, 1.4)
    # (2)→(3)
    add_arrow(slide, *edge("n2", "right"), *edge("n3", "left"), R, 1.4)
    # (3)→(4)
    add_arrow(slide, *edge("n3", "bottom"), *edge("n4", "top"), R, 1.4)
    # (4)→(5)
    add_arrow(slide, *edge("n4", "bottom"), *edge("n5", "top"), R, 1.4)
    # (5)→(6)
    add_arrow(slide, *edge("n5", "right"), *edge("n6", "left"), R, 1.4)
    # (6)→(7)(8)(9) fan-out
    add_arrow(slide, *edge("n6", "bottom"), *edge("n7", "left"), R, 1.0)
    add_arrow(slide, edge("n6", "bottom")[0]-0.2, edge("n6", "bottom")[1], *edge("n8", "left"), R, 1.0)
    add_arrow(slide, edge("n6", "bottom")[0]-0.4, edge("n6", "bottom")[1], *edge("n9", "left"), R, 1.0)
    # (7)(8)(9)→(10) join
    add_arrow(slide, *edge("n7", "right"), *edge("n10", "left", -0.15), R, 1.0)
    add_arrow(slide, *edge("n8", "right"), *edge("n10", "left"), R, 1.0)
    add_arrow(slide, *edge("n9", "right"), *edge("n10", "left",  0.15), R, 1.0)
    # (10)→(11) router
    add_arrow(slide, *edge("n10", "top"), *edge("n11", "bottom"), R, 1.4)
    # (11)→T2 / T3 (black)
    add_arrow(slide, *edge("n11", "bottom"), *edge("nT2", "top"), B, 1.0)
    add_arrow(slide, *edge("n11", "right"), *edge("nT3", "top"), B, 1.0)
    # (11)→(12) Explanation (red, T1 path)
    add_arrow(slide, *edge("n11", "top"), *edge("n12", "bottom"), R, 1.4)
    # (12)→(13)
    add_arrow(slide, *edge("n12", "right"), edge("n13", "top")[0], edge("n12", "right")[1], R, 1.4)
    # Add second segment of (12)→(13)
    add_arrow(slide, edge("n13", "top")[0], edge("n12", "right")[1], *edge("n13", "top"), R, 1.4)
    # (13)→back to customer (long dashed loop back up-left)
    add_arrow(slide, *edge("n13", "right"), edge("n13", "right")[0]+0.05, 0.20, R, 1.0, dashed=True)
    add_arrow(slide, edge("n13", "right")[0]+0.05, 0.20, edge("n1", "top")[0], 0.20, R, 1.0, dashed=True)
    add_arrow(slide, edge("n1", "top")[0], 0.20, *edge("n1", "top"), R, 1.0, dashed=True)
    # Audit arrows (gold dashed) - skip individual ones to reduce clutter, draw 3 representative
    add_arrow(slide, *edge("n4", "left"), edge("n4", "left")[0]-0.05, edge("audit", "top")[1]-0.05, G, 0.75, dashed=True)
    add_arrow(slide, edge("n4", "left")[0]-0.05, edge("audit", "top")[1]-0.05, edge("n4", "left")[0]-0.05, edge("audit", "top")[1], G, 0.75, dashed=True)
    add_arrow(slide, *edge("n10", "bottom"), edge("n10", "bottom")[0], edge("audit", "top")[1], G, 0.75, dashed=True)

    # ====== COMMENTARY PANEL (right side, x=6.90 - 9.95) ======
    PX = 6.90; PW = 3.02; PY = 0.40; PH = 5.00
    add_rect(slide, PX, PY, PW, PH, C["white"], C["blue_d"], 1.0)
    add_card(slide, PX, PY, PW, 0.26, C["blue_d"], C["blue_d"], 0.5,
             "FLOW LEGEND", size=9, bold=True, font_color=C["white"], align="center", valign="middle")

    items = [
        ("1",  "CUSTOMER FILES FNOL",
         "Mobile · Web · Teams · SMS · Email", C["orange_lt"], C["orange_d"]),
        ("2",  "REACT SPA + TOKEN BROKER",
         "Azure Static Web Apps · token mint", C["blue_bg"], C["blue"]),
        ("3",  "DIRECT LINE BRIDGE",
         "Bot Service ↔ Copilot Studio", C["blue_bg"], C["blue"]),
        ("4",  "INTAKE AGENT (AI)",
         "11 loss-type topics · sub-flows · sentiment", C["purple_bg"], C["purple"]),
        ("5",  "CREATE_CLAIM FLOW",
         "Inserts Claim + Document rows", C["purple_bg"], C["purple"]),
        ("6",  "MASTER ORCHESTRATION",
         "Trigger on Claim insert · fan-out", C["purple_bg"], C["purple"]),
        ("7",  "EXTRACTION AGENT (AI)",
         "Doc Intel + GPT-4o Vision", C["blue_bg"], C["blue"]),
        ("8",  "POLICY AGENT (AI)",
         "AI Search vector RAG + citations", C["blue_bg"], C["blue"]),
        ("9",  "VALIDATION AGENT",
         "7 ext checks (NOAA, NHTSA live + 5 sb)", C["blue_bg"], C["blue"]),
        ("10", "ADJUDICATION (AI · GPT-4.1)",
         "Decides + assigns tier", C["blue_bg"], C["blue"]),
        ("11", "TIER ROUTER",
         "T1 auto · T2 adjuster · T3 CSR", C["green_bg"], C["green"]),
        ("12", "EXPLANATION AGENT (AI)",
         "Runs every claim · plain English", C["purple_bg"], C["purple"]),
        ("13", "NOTIFY_CUSTOMER",
         "Reply on original channel · loop close", C["green_bg"], C["green"]),
    ]
    item_h = 0.31
    item_y = PY + 0.30
    for num, title, body, fill, num_col in items:
        add_rect(slide, PX + 0.05, item_y, PW - 0.10, item_h, fill, num_col, 0.4)
        # number + title on first line, body on second
        tb = slide.shapes.add_textbox(I(PX + 0.08), I(item_y), I(PW - 0.16), I(item_h))
        tf = tb.text_frame
        tf.margin_left = Emu(15000); tf.margin_right = Emu(15000)
        tf.margin_top = Emu(10000); tf.margin_bottom = Emu(10000)
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
        r1 = p.add_run(); r1.text = f"{num}  "
        r1.font.size = Pt(9); r1.font.bold = True; r1.font.color.rgb = num_col
        r2 = p.add_run(); r2.text = title
        r2.font.size = Pt(6); r2.font.bold = True; r2.font.color.rgb = C["black"]
        p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.LEFT
        r3 = p2.add_run(); r3.text = body
        r3.font.size = Pt(6); r3.font.color.rgb = C["black"]
        item_y += item_h + 0.02

    # Glass Box callout at bottom of panel
    add_rect(slide, PX + 0.05, item_y + 0.05, PW - 0.10, 0.42, C["gold_bg"], C["gold"], 1.0)
    tb = slide.shapes.add_textbox(I(PX + 0.08), I(item_y + 0.05), I(PW - 0.16), I(0.42))
    tf = tb.text_frame; tf.word_wrap = True
    tf.margin_left = Emu(15000); tf.margin_right = Emu(15000)
    tf.margin_top = Emu(10000); tf.margin_bottom = Emu(10000)
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    r = p.add_run(); r.text = "🛡 GLASS BOX  "
    r.font.size = Pt(7); r.font.bold = True; r.font.color.rgb = C["gold_d"]
    r = p.add_run(); r.text = "(cross-cutting)"
    r.font.size = Pt(6); r.font.color.rgb = C["gold_d"]
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.LEFT
    r = p2.add_run()
    r.text = "1 row per AI step → CO SB21-169 · NAIC · NY DFS · CA AB 2930"
    r.font.size = Pt(6); r.font.color.rgb = C["gold_d"]

    # ====== FOOTER ======
    add_text(slide, 0.08, 5.45, 9.85, 0.15,
             "ARROWS:  red = runtime flow  ·  red dashed = loop back to customer  ·  black = Tier-2 / Tier-3 human branches  ·  gold dashed = audit write",
             size=6, italic=True, color=C["grey"], align="left", valign="middle")


def main():
    if not os.path.exists(PPTX):
        raise SystemExit(f"PPTX not found: {PPTX}")
    prs = Presentation(PPTX)
    target = None
    for s in prs.slides:
        if slide_title_text(s).startswith("Logical Architecture"):
            target = s; break
    if target is None:
        raise SystemExit(f"Could not find slide titled '{SLIDE_TITLE}'")
    build(target)
    prs.save(PPTX)
    print(f"Done. Slide rebuilt with {len(target.shapes)} native shapes (incl. arrows + commentary).")


if __name__ == "__main__":
    main()
