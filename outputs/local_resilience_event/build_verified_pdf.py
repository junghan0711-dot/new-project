from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph as P, Spacer, Table as RT, TableStyle, PageBreak, KeepTogether
from xml.sax.saxutils import escape

DOCX = "/Users/junghanchiu/Documents/New project/outputs/local_resilience_event/地方韌性跨域共創發表會_行前參考指南_20260715.docx"
OUT = "/Users/junghanchiu/Documents/New project/outputs/local_resilience_event/地方韌性跨域共創發表會_行前參考指南_20260715.pdf"
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
pdfmetrics.registerFont(TTFont("STHeiti", FONT, subfontIndex=0))

styles = getSampleStyleSheet()
body = ParagraphStyle("body", fontName="STHeiti", fontSize=10.2, leading=16, spaceAfter=6, textColor=colors.HexColor("#222222"))
h1 = ParagraphStyle("h1", parent=body, fontSize=16, leading=22, textColor=colors.HexColor("#2E74B5"), spaceBefore=14, spaceAfter=8, keepWithNext=True)
h2 = ParagraphStyle("h2", parent=body, fontSize=13, leading=19, textColor=colors.HexColor("#2E74B5"), spaceBefore=10, spaceAfter=6, keepWithNext=True)
h3 = ParagraphStyle("h3", parent=body, fontSize=11.5, leading=17, textColor=colors.HexColor("#1F4D78"), spaceBefore=8, spaceAfter=4, keepWithNext=True)
callout = ParagraphStyle("callout", parent=body, backColor=colors.HexColor("#F4F6F9"), borderColor=colors.HexColor("#D9E1EA"), borderWidth=.5, borderPadding=7, leftIndent=5, rightIndent=5, spaceBefore=5, spaceAfter=8)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=16, firstLineIndent=-10, bulletIndent=5, spaceAfter=4)
number = ParagraphStyle("number", parent=body, leftIndent=18, firstLineIndent=-13, bulletIndent=3, spaceAfter=4)
cover_title = ParagraphStyle("cover_title", parent=body, fontSize=25, leading=33, alignment=TA_CENTER, textColor=colors.HexColor("#243746"), spaceAfter=7)
cover_sub = ParagraphStyle("cover_sub", parent=body, fontSize=14, leading=21, alignment=TA_CENTER, textColor=colors.HexColor("#1F4D78"), spaceAfter=18)
kicker = ParagraphStyle("kicker", parent=body, fontSize=10, leading=14, alignment=TA_CENTER, textColor=colors.HexColor("#A46B12"), spaceAfter=12)

def iter_blocks(parent):
    for child in parent.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)

def clean(text):
    return escape(text).replace("\n", "<br/>")

doc = Document(DOCX)
story = []
num_counter = 0
for block in iter_blocks(doc):
    if isinstance(block, Paragraph):
        text = block.text.strip()
        if not text:
            story.append(Spacer(1, 4))
            continue
        sty = block.style.name if block.style else "Normal"
        if text == "FIELD GUIDE":
            story.append(Spacer(1, 1.1*inch)); story.append(P(text, kicker)); continue
        if text == "地方韌性跨域共創發表會":
            story.append(P(clean(text), cover_title)); continue
        if text == "世界咖啡館參與與政策對話行前參考指南":
            story.append(P(clean(text), cover_sub)); continue
        if sty == "Heading 1":
            if story and text.startswith("一、"):
                story.append(PageBreak())
            story.append(P(clean(text), h1)); num_counter = 0
        elif sty == "Heading 2":
            story.append(P(clean(text), h2)); num_counter = 0
        elif sty == "Heading 3":
            story.append(P(clean(text), h3))
        elif sty == "Guide Callout":
            story.append(P(clean(text), callout))
        elif sty == "List Bullet":
            story.append(P("• " + clean(text), bullet))
        elif sty == "List Number":
            num_counter += 1
            story.append(P(f"{num_counter}. " + clean(text), number))
        else:
            story.append(P(clean(text), body))
    else:
        data = []
        for row in block.rows:
            data.append([P(clean(cell.text.strip()), ParagraphStyle("cell", parent=body, fontSize=8.7, leading=12, spaceAfter=0)) for cell in row.cells])
        if not data: continue
        cols = len(data[0])
        widths = [6.5*inch/cols]*cols
        table = RT(data, colWidths=widths, repeatRows=1, hAlign="CENTER")
        table.setStyle(TableStyle([
            ("FONTNAME", (0,0), (-1,-1), "STHeiti"),
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#E8EEF5")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.HexColor("#1F4D78")),
            ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#C8D2DC")),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(table); story.append(Spacer(1, 7))

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont("STHeiti", 8); canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.drawCentredString(letter[0]/2, .42*inch, f"地方韌性跨域共創發表會｜行前參考指南　　{doc.page}")
    canvas.restoreState()

pdf = SimpleDocTemplate(OUT, pagesize=letter, leftMargin=inch, rightMargin=inch, topMargin=.72*inch, bottomMargin=.68*inch,
                        title="地方韌性跨域共創發表會行前參考指南", author="Codex")
pdf.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
