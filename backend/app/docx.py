"""DOCX export without dependencies.

Word files are zip archives of XML parts. A resume needs only the smallest
valid subset -- content types, the root relationship, one document part and a
small style sheet -- so it is written by hand rather than pulling in
python-docx. The output favours parsers over beauty: real heading styles, real
list paragraphs, nothing exotic, which also makes it ATS-friendly by accident.
"""

from __future__ import annotations

from collections.abc import Iterable
from io import BytesIO
from xml.sax.saxutils import escape
import zipfile

from .schemas import PaperSize, ResumeDocument

# Twips (1/1440 inch). A4 = 210x297mm, Letter = 8.5x11in.
_PAGE_SIZE = {
    PaperSize.A4: (11906, 16838),
    PaperSize.LETTER: (12240, 15840),
}

_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>"""

_ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

_STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/>
      <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2"/></w:pBdr></w:pPr>
    <w:rPr><w:b/><w:caps/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:pPr><w:spacing w:after="40"/></w:pPr>
    <w:rPr><w:i/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Meta">
    <w:name w:val="Meta"/>
    <w:pPr><w:spacing w:after="20"/></w:pPr>
    <w:rPr><w:sz w:val="18"/><w:color w:val="444444"/></w:rPr>
  </w:style>
  <w:style w:type="numbering" w:styleId="ResumeBullet">
    <w:name w:val="Resume Bullet"/>
    <w:pPr><w:numPr><w:numId w:val="1"/></w:numPr><w:spacing w:after="40"/></w:pPr>
  </w:style>
</w:styles>"""


def _p(
    text: str,
    style: str | None = None,
    bold_prefix: str | None = None,
) -> str:
    """One paragraph. `bold_prefix` renders a leading bold run ("Company · ")."""
    props = f'<w:pStyle w:val="{style}"/>' if style else ""
    runs = ""
    if bold_prefix:
        runs += (
            "<w:r><w:rPr><w:b/></w:rPr>"
            f"<w:t xml:space=\"preserve\">{escape(bold_prefix)}</w:t></w:r>"
        )
    if text:
        runs += f'<w:r><w:t xml:space="preserve">{escape(text)}</w:t></w:r>'
    return f"<w:p>{props}{runs}</w:p>"


def _bullets(items: Iterable[str]) -> str:
    return "".join(_p(b.strip(), "ResumeBullet") for b in items if b.strip())


def _document_xml(doc: ResumeDocument, paper: PaperSize) -> str:
    basics = doc.basics
    width, height = _PAGE_SIZE[paper]

    parts: list[str] = []
    name = basics.full_name.strip()
    headline = basics.headline.strip()
    contact = [p for p in (basics.email, basics.phone, basics.location, basics.website) if p.strip()]
    links = [l.label.strip() or l.url.strip() for l in basics.links if (l.url.strip() or l.label.strip())]

    if name:
        parts.append(_p(name, "Title"))
    if headline:
        parts.append(_p(headline, "Subtitle"))
    line = "  ·  ".join([*contact, *links])
    if line:
        parts.append(_p(line, "Meta"))

    for section in doc.sections:
        if not section.visible or section.title.strip() == "":
            continue
        visible_items = [
            i for i in getattr(section, "items", []) if i.visible
        ]
        if not visible_items:
            continue

        parts.append(_p(escape(section.title), "Heading1"))

        if section.type == "summary":
            parts.extend(_p(i.summary.strip()) for i in visible_items if i.summary.strip())
        elif section.type == "skills":
            # Column mode flattens every group; category mode keeps its lines.
            if getattr(section, "layout", "inline") == "bullets":
                seen: set[str] = set()
                flat: list[str] = []
                for group in visible_items:
                    for skill in group.skills:
                        s = skill.strip()
                        if s and s not in seen:
                            seen.add(s)
                            flat.append(s)
                parts.append(_bullets(flat))
            else:
                for group in visible_items:
                    label = group.category.strip()
                    skills = ", ".join(s.strip() for s in group.skills if s.strip())
                    parts.append(_p(skills, None, bold_prefix=f"{label}: " if label else None))
        elif section.type == "languages":
            for item in visible_items:
                level = f" — {item.proficiency.strip()}" if item.proficiency.strip() else ""
                parts.append(_p(f"{item.name.strip()}{level}"))
        elif section.type in {"experience", "education", "projects", "custom"}:
            for item in visible_items:
                head_parts = [
                    p for p in (item.position if hasattr(item, "position") else None,
                                getattr(item, "degree", "") or getattr(item, "name", "") or getattr(item, "title", ""),
                                getattr(item, "company", "") or getattr(item, "institution", "") or getattr(item, "role", "") or getattr(item, "subtitle", ""))
                    if p and str(p).strip()
                ]
                date = ""
                start = getattr(item, "start_date", "")
                end = getattr(item, "end_date", "")
                if getattr(item, "current", False):
                    end = "Present"
                date = " – ".join(p for p in (start.strip(), end.strip()) if p)
                title_line = " · ".join(str(p).strip() for p in head_parts[:1])
                rest_line = " · ".join(str(p).strip() for p in head_parts[1:])
                meta = " | ".join(p for p in (rest_line, date) if p)
                parts.append(_p(meta, None, bold_prefix=title_line if title_line else None))
                bullets = getattr(item, "bullets", [])
                if bullets:
                    parts.append(_bullets(bullets))
                url = getattr(item, "url", "")
                if url.strip():
                    parts.append(_p(url.strip()))
        else:  # certifications and anything custom-shaped
            for item in visible_items:
                line_bits = [
                    p for p in (getattr(item, "name", ""), getattr(item, "issuer", ""), getattr(item, "date", ""), getattr(item, "proficiency", ""))
                    if str(p).strip()
                ]
                parts.append(_p(" · ".join(str(p).strip() for p in line_bits)))

    body = "".join(parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="{width}" w:h="{height}"/>
      <w:pgMar w:top="720" w:right="900" w:bottom="720" w:left="900" w:header="0" w:footer="0" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""


def build_docx(document: ResumeDocument, paper_size: PaperSize = PaperSize.A4) -> bytes:
    document_xml = _document_xml(document, paper_size)
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _CONTENT_TYPES)
        archive.writestr("_rels/.rels", _ROOT_RELS)
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("word/styles.xml", _STYLES)
    return buffer.getvalue()
