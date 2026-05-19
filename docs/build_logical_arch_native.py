"""Rebuild the Logical Architecture (C4 L2) diagram as NATIVE PowerPoint shapes
on slide 5 of hackathon_blueprint_filled.pptx.

Slide size: 10in x 5.625in (16:9). All coordinates in inches.

Idempotent: drops all shapes on slide 5 and rebuilds.
"""
from pptx import Presentation
from pptx.util import Inches, Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
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
    tf.margin_left = Emu(20000); tf.margin_right = Emu(20000)
    tf.margin_top = Emu(10000); tf.margin_bottom = Emu(10000)
    tf.word_wrap = True
    tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE, "bottom": MSO_ANCHOR.BOTTOM}[valign]
    for i, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[align]
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.italic = italic
        r.font.color.rgb = color
    return tb


def add_card(slide, x, y, w, h, fill, line, line_w, text, *,
             size=8, bold=False, font_color=C["black"], align="center", valign="middle"):
    add_rect(slide, x, y, w, h, fill, line, line_w)
    add_text(slide, x, y, w, h, text, size=size, bold=bold, color=font_color,
             align=align, valign=valign)


def add_numbered_node(slide, x, y, w, h, fill, line, line_w, number, label,
                      *, num_size=14, label_size=7, num_color=C["black"], label_color=C["black"]):
    add_rect(slide, x, y, w, h, fill, line, line_w)
    tb = slide.shapes.add_textbox(I(x), I(y), I(w), I(h))
    tf = tb.text_frame
    tf.margin_left = Emu(20000); tf.margin_right = Emu(20000)
    tf.margin_top = Emu(15000); tf.margin_bottom = Emu(15000)
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p1 = tf.paragraphs[0]; p1.alignment = PP_ALIGN.CENTER
    r1 = p1.add_run(); r1.text = str(number)
    r1.font.size = Pt(num_size); r1.font.bold = True; r1.font.color.rgb = num_color
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.CENTER
    r2 = p2.add_run(); r2.text = label
    r2.font.size = Pt(label_size); r2.font.bold = True; r2.font.color.rgb = label_color


def slide_title_text(slide):
    for shape in slide.shapes:
        if shape.has_text_frame and shape.text_frame.text.strip():
            return shape.text_frame.text.split("\n")[0].strip()
    return ""


def clear_slide(slide):
    sp_tree = slide.shapes._spTree
    for shape in list(slide.shapes):
        sp_tree.remove(shape._element)


def build(slide):
    clear_slide(slide)

    # ====== TITLE (y=0.05 to 0.40) ======
    add_text(slide, 0.10, 0.05, 9.8, 0.22,
             "Logical Architecture (C4 L2)  —  left-to-right swimlanes",
             size=12, bold=True, color=C["blue_d"], align="left", valign="middle")
    add_text(slide, 0.10, 0.25, 9.8, 0.15,
             "Numbers 1–13 trace runtime flow  ·  red = flow  ·  black = human review  ·  gold = audit write",
             size=6, italic=True, color=C["grey"], align="left", valign="middle")

    # ====== SWIMLANES (y=0.42 to 5.55) ======
    # Lane heights tuned so all 7 fit in 5.13 inches
    lane_specs = [
        # (label_text, top_y, height, label_fill, label_text_color, content_bg_fill, content_bg_border)
        ("CUSTOMER\n& CHANNELS",  0.42, 0.55, C["orange"], C["white"], C["orange_lt"], C["orange_bd"]),
        ("FRONTEND\n(SWA)",       0.99, 0.55, C["blue"],   C["white"], C["blue_bg"],   C["blue_bd"]),
        ("COPILOT\nSTUDIO",       1.56, 0.65, C["purple"], C["white"], C["purple_bg"], C["purple_bd"]),
        ("POWER\nAUTOMATE",       2.23, 0.65, C["purple"], C["white"], C["purple_bg"], C["purple_bd"]),
        ("AZURE AI\nSERVICES",    2.90, 1.00, C["blue"],   C["white"], C["blue_bg"],   C["blue_bd"]),
        ("M365 TEAMS\n(Human)",   3.92, 0.55, C["green"],  C["white"], C["green_bg"],  C["green_bd"]),
        ("DATAVERSE\nGlass Box",  4.49, 1.05, C["gold"],   C["white"], C["gold_bg"],   C["gold_bd"]),
    ]
    LABEL_X = 0.05
    LABEL_W = 0.75
    CONT_X = 0.82
    CONT_W = 9.10
    for label, y, h, lab_fill, lab_fc, bg_fill, bg_bd in lane_specs:
        # lane content background
        add_rect(slide, CONT_X, y, CONT_W, h, bg_fill, bg_bd, 0.5, rounded=False)
        # lane label
        add_card(slide, LABEL_X, y, LABEL_W, h, lab_fill, lab_fill, 0.5,
                 label, size=7, bold=True, font_color=lab_fc, align="center", valign="middle")

    # ====== NUMBERED NODES (in lanes, left-to-right by step) ======
    # Lane 1 - Customer
    add_numbered_node(slide, 0.90, 0.49, 1.30, 0.42, C["orange"], C["orange_d"], 0.5,
                      "1", "Customer + 5 channels",
                      num_color=C["white"], label_color=C["white"])

    # Lane 2 - Frontend
    add_numbered_node(slide, 1.40, 1.06, 1.30, 0.42, C["blue_lt"], C["blue"], 0.75,
                      "2", "React SPA + Token Broker",
                      num_color=C["blue_d"], label_color=C["blue_d"])
    add_numbered_node(slide, 2.80, 1.06, 1.30, 0.42, C["blue_lt"], C["blue"], 0.75,
                      "3", "Direct Line / Bot",
                      num_color=C["blue_d"], label_color=C["blue_d"])

    # Lane 3 - Copilot Studio
    add_numbered_node(slide, 2.80, 1.65, 1.30, 0.50, C["purple_lt"], C["purple"], 1.0,
                      "4", "Intake Agent (AI)",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    add_numbered_node(slide, 7.40, 1.65, 1.80, 0.50, C["purple_lt"], C["purple"], 1.0,
                      "12", "Explanation Agent (AI — NOT CSR)",
                      num_color=C["purple_d"], label_color=C["purple_d"])

    # Lane 4 - Power Automate
    add_numbered_node(slide, 3.30, 2.30, 1.15, 0.50, C["purple_lt"], C["purple"], 0.75,
                      "5", "Create_Claim",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    add_numbered_node(slide, 4.55, 2.30, 1.40, 0.50, C["purple_lt"], C["purple"], 1.0,
                      "6", "Master Orchestration",
                      num_color=C["purple_d"], label_color=C["purple_d"])
    # Tier router (diamond)
    diamond = slide.shapes.add_shape(MSO_SHAPE.DIAMOND, I(6.30), I(2.30), I(0.90), I(0.55))
    diamond.fill.solid(); diamond.fill.fore_color.rgb = C["white"]
    diamond.line.color.rgb = C["green"]; diamond.line.width = Pt(1.5)
    diamond.shadow.inherit = False
    add_text(slide, 6.30, 2.32, 0.90, 0.50, "11\nTier Router",
             size=8, bold=True, color=C["green_d"], align="center", valign="middle")
    add_numbered_node(slide, 7.40, 2.30, 1.40, 0.50, C["green_lt"], C["green"], 1.0,
                      "13", "Notify_Customer",
                      num_color=C["green_d"], label_color=C["green_d"])

    # Lane 5 - Azure AI agents (3 stacked + adjudication on right)
    add_card(slide, 3.30, 2.97, 1.80, 0.27, C["blue_lt"], C["blue"], 0.5,
             "7  Extraction", size=8, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    add_card(slide, 3.30, 3.27, 1.80, 0.27, C["blue_lt"], C["blue"], 0.5,
             "8  Policy", size=8, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    add_card(slide, 3.30, 3.57, 1.80, 0.27, C["blue_lt"], C["blue"], 0.5,
             "9  Validation · 7 ext checks", size=7, bold=True, font_color=C["blue_d"], align="center", valign="middle")
    add_numbered_node(slide, 5.30, 3.10, 1.90, 0.65, C["blue_d"], C["blue_d"], 1.5,
                      "10", "Adjudication  ·  GPT-4.1",
                      num_color=C["white"], label_color=C["white"])

    # Lane 6 - M365 Teams (Humans)
    add_card(slide, 6.50, 3.97, 1.30, 0.20, C["gold_bg"], C["amber"], 0.5,
             "T2 · Adjuster Teams Card (back-office human)",
             size=6, bold=True, font_color=C["gold_d"], align="center", valign="middle")
    add_card(slide, 7.90, 3.97, 1.30, 0.20, C["red_lt"], C["red"], 0.5,
             "T3 · Live CSR Teams Chat (front-line human)",
             size=6, bold=True, font_color=C["red_d"], align="center", valign="middle")
    add_text(slide, 6.50, 4.20, 2.70, 0.18,
             "Tier 1 = auto-approve, no human", size=6, italic=True, color=C["grey"],
             align="center", valign="middle")

    # Lane 7 - Dataverse + Audit + Tables
    table_specs = [
        ("Policy", 0.90, 0.70),
        ("Claim", 1.65, 0.70),
        ("Document", 2.40, 0.80),
        ("Communication", 3.25, 1.00),
        ("Adjuster", 4.30, 0.70),
        ("Vendor", 5.05, 0.70),
        ("ClaimVendorAssignment", 5.80, 1.40),
    ]
    for name, x, w in table_specs:
        add_card(slide, x, 4.56, w, 0.28, C["purple"], C["purple_d"], 0.5,
                 name, size=6, bold=True, font_color=C["white"], align="center", valign="middle")
    # Glass Box audit highlight
    add_card(slide, 0.90, 4.92, 8.55, 0.45, C["gold_lt"], C["gold"], 2.0,
             "🛡  Decision_Rationale  ·  THE GLASS BOX  ·  every AI step writes 1 row  ·  source: 4 · 7 · 8 · 9 · 10 · 12",
             size=8, bold=True, font_color=C["blue_d"], align="center", valign="middle")

    # ====== FOOTER ======
    add_text(slide, 0.10, 5.45, 9.8, 0.15,
             "AI Elites carrier  ·  Glass Box AI  ·  Compliance: CO SB21-169 · NAIC AI Bulletin · NY DFS Circular 7 · CA AB 2930",
             size=6, italic=True, color=C["grey"], align="left", valign="middle")


def main():
    if not os.path.exists(PPTX):
        raise SystemExit(f"PPTX not found: {PPTX}")
    prs = Presentation(PPTX)
    target = None
    for s in prs.slides:
        if slide_title_text(s) == SLIDE_TITLE:
            target = s; break
    if target is None:
        raise SystemExit(f"Could not find slide titled '{SLIDE_TITLE}'")
    build(target)
    prs.save(PPTX)
    print(f"Done. Slide rebuilt with {len(target.shapes)} native shapes.")


if __name__ == "__main__":
    main()
