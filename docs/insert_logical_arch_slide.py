"""Insert the logical architecture PNG into hackathon_blueprint_filled.pptx
as a new slide that fills the slide edge-to-edge.

Slide size: 10in x 5.625in (16:9)
PNG size:   1861 x 1021  (aspect 1.823)

We fit to slide width (10in) -> image height becomes 10/1.823 = 5.49in.
Tiny vertical gap (0.067in / ~0.17cm) top and bottom for centering.
"""
from pptx import Presentation
from pptx.util import Inches, Emu
from copy import deepcopy
from lxml import etree

PPTX = r"D:\WorkspaceAI\hack2future\Hack2furure\docs\hackathon_blueprint_filled.pptx"
PNG  = r"D:\WorkspaceAI\hack2future\Hack2furure\docs\02_logical_architecture.drawio.png"

prs = Presentation(PPTX)
slide_w = prs.slide_width        # EMU
slide_h = prs.slide_height       # EMU

# Use a blank layout (find the one with fewest placeholders)
blank_layout = None
for layout in prs.slide_layouts:
    if len(layout.placeholders) == 0:
        blank_layout = layout
        break
if blank_layout is None:
    blank_layout = prs.slide_layouts[6]   # standard "Blank" index
print("Using layout:", blank_layout.name)

# Add new slide at end
new_slide = prs.slides.add_slide(blank_layout)

# Fit PNG to slide width, center vertically
from PIL import Image
img = Image.open(PNG)
pw, ph = img.size
aspect = pw / ph
fit_w_emu = slide_w
fit_h_emu = int(slide_w / aspect)
x_emu = 0
y_emu = (slide_h - fit_h_emu) // 2
new_slide.shapes.add_picture(PNG, x_emu, y_emu, width=fit_w_emu, height=fit_h_emu)

# Add a small title text box at very top-left so the slide is identifiable in nav
tx_left = Inches(0.15)
tx_top  = Inches(0.05)
tx_w    = Inches(6)
tx_h    = Inches(0.35)
tb = new_slide.shapes.add_textbox(tx_left, tx_top, tx_w, tx_h)
tf = tb.text_frame
tf.text = "Logical Architecture (C4 L2)"
tf.paragraphs[0].runs[0].font.size = Inches(0.18)  # ~13pt
tf.paragraphs[0].runs[0].font.bold = True

# Reorder: move the new slide to position 5 (right after the existing flow-diagram slide at position 4)
# python-pptx doesn't provide a public reorder API, so we manipulate the XML directly.
TARGET_POS = 5   # 1-indexed
xml_slides = prs.slides._sldIdLst   # CT_SlideIdList
slides_list = list(xml_slides)
# new slide is currently the last element
new_xml = slides_list[-1]
xml_slides.remove(new_xml)
# Insert at TARGET_POS - 1 (0-indexed)
xml_slides.insert(TARGET_POS - 1, new_xml)

prs.save(PPTX)
print(f"Inserted logical architecture as slide {TARGET_POS} of {len(prs.slides)} total slides.")
print(f"Image: {fit_w_emu/914400:.2f}in x {fit_h_emu/914400:.2f}in, y-offset {y_emu/914400:.3f}in")
