"""Read an existing resume into the fields AgentCV edits.

Every format is first reduced to plain text and then read by a single parser.
That is what makes PDF, DOCX, TXT and LaTeX behave alike: a heading is a
heading whatever wrapping it arrived in, and a date range is recognised in the
same place. The output is deliberately neutral -- no ids, no settings -- so the
client can pour it into whichever template the author chose.

The parser is a reader, not a magician. Text extraction from a PDF gives back
lines, not layout, so entries are reconstructed from the conventions resumes
share: a heading, then a dated line, then bullets. Anything it cannot place
becomes a custom section rather than disappearing, and the review step exists
because the last word belongs to the person who wrote the original.
"""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from xml.etree import ElementTree as ET

# Formats are named after what they are, not after the extension, so the
# review step can say "Read as LaTeX" even when the file was named .txt.
PDF = "pdf"
DOCX = "docx"
TEXT = "txt"
LATEX = "tex"

MAX_BYTES = 10 * 1024 * 1024
MAX_LINES = 4000

EXTENSIONS = {
    ".pdf": PDF,
    ".docx": DOCX,
    ".txt": TEXT,
    ".text": TEXT,
    ".tex": LATEX,
    ".latex": LATEX,
}


class UnsupportedFile(Exception):
    """The upload is not a resume format this reader understands."""


class UnreadableFile(Exception):
    """The format is right but no text could be recovered from it."""


# --------------------------------------------------------------------------
# Format detection and text extraction
# --------------------------------------------------------------------------


def detect_format(filename: str, data: bytes) -> str | None:
    """Content first, extension second.

    A `.pdf` that is really a DOCX is a mislabelled file, not an error we
    should hand to the PDF reader.
    """
    if data[:5] == b"%PDF-":
        return PDF
    if data[:4] == b"PK\x03\x04":
        # A zip is only a Word document if it carries the document part.
        try:
            with zipfile.ZipFile(BytesIO(data)) as archive:
                if "word/document.xml" in archive.namelist():
                    return DOCX
        except zipfile.BadZipFile:
            return None
    lowered = filename.lower()
    for extension, kind in EXTENSIONS.items():
        if lowered.endswith(extension):
            return kind
    # Latex is plain text, so a .txt containing a documentclass is still LaTeX
    # in every way that matters to the reader.
    head = data[:4096].decode("utf-8", "ignore")
    if "\\documentclass" in head or re.search(r"^\s*\\section\*?\{", head, re.M):
        return LATEX
    # Last resort: anything that decodes as printable text is a text resume,
    # even when the name lost its extension on the way here. Binary formats
    # fail this test rather than pretending to be text.
    if _looks_like_text(data):
        return TEXT
    return None


def _looks_like_text(data: bytes) -> bool:
    if not data or b"\x00" in data[:4096]:
        return False
    try:
        sample = data[:8192].decode("utf-8-sig")
    except UnicodeDecodeError:
        return False
    if not sample.strip():
        return False
    printable = sum(1 for ch in sample if ch.isprintable() or ch in "\n\r\t")
    return printable / len(sample) > 0.95


def extract_text(kind: str, data: bytes) -> str:
    if kind == PDF:
        return _pdf_text(data)
    if kind == DOCX:
        return _docx_text(data)
    if kind == LATEX:
        return latex_to_text(_decode(data))
    return _decode(data)


def _decode(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "cp1252", "latin-1"):
        try:
            return data.decode(encoding)
        except (UnicodeDecodeError, UnicodeError):
            continue
    return data.decode("utf-8", "replace")


def _pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # pragma: no cover - dependency is pinned
        raise UnreadableFile("PDF reading is unavailable on this server.") from exc

    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            # An empty password covers the common "protected, not secret" case.
            if not reader.decrypt(""):
                raise UnreadableFile("This PDF is password protected. Remove the password and try again.")
        pages = [(page.extract_text() or "").strip() for page in reader.pages]
    except UnreadableFile:
        raise
    except Exception as exc:  # pypdf raises several different types here
        raise UnreadableFile("This PDF could not be opened. Try re-saving it as PDF and uploading again.") from exc

    text = "\n".join(pages).strip()
    if len(text) < 20:
        raise UnreadableFile(
            "This PDF has no text layer, which usually means it is a scan or a photo. "
            "Upload a PDF exported from a word processor, or a DOCX/TXT file."
        )
    return text


W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _docx_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            payload = archive.read("word/document.xml")
        root = ET.fromstring(payload)
    except (KeyError, zipfile.BadZipFile, ET.ParseError) as exc:
        raise UnreadableFile("This Word file could not be opened. Try re-saving it as .docx.") from exc

    body = root.find(f"{W}body")
    if body is None:
        raise UnreadableFile("This Word file has no readable body.")

    lines: list[str] = []
    for child in body:
        if child.tag == f"{W}p":
            text = _docx_paragraph(child)
            if text:
                lines.append(text)
        elif child.tag == f"{W}tbl":
            # One row per line, cells separated by " | ": that is exactly the
            # shape the resume parser reads for an entry header.
            for row in child.findall(f"{W}tr"):
                cells = []
                for cell in row.findall(f"{W}tc"):
                    parts = [_docx_paragraph(p) for p in cell.findall(f"{W}p")]
                    cells.append(" ".join(p for p in parts if p).strip())
                line = " | ".join(c for c in cells if c)
                if line:
                    lines.append(line)
    return "\n".join(lines)


def _docx_paragraph(paragraph: ET.Element) -> str:
    # Adjacent runs are separate XML nodes but contiguous on the page, and a
    # bold title followed by its description is written as two runs. A space
    # at that boundary is what a reader sees; without it "Acme" + "Engineer"
    # arrives as "AcmeEngineer".
    out = ""
    for node in paragraph.iter():
        if node.tag == f"{W}t":
            text = node.text or ""
            if not text:
                continue
            if (
                out
                and not out[-1].isspace()
                and not text[0].isspace()
                and out[-1] not in "-/("
                and text[0] not in ".,;:)!?"
            ):
                out += " "
            out += text
        elif node.tag in (f"{W}tab", f"{W}cr", f"{W}br"):
            out += " "
    text = re.sub(r"\s+", " ", out).strip()
    if not text:
        return ""
    # Word's bullet numbering usually lives in a paragraph *style* (ours does)
    # rather than in the paragraph itself, so both places are checked.
    if paragraph.find(f".//{W}numPr") is not None or _docx_bullet_style(paragraph):
        return "• " + text
    return text


def _docx_bullet_style(paragraph: ET.Element) -> bool:
    # Ours writes <w:p><w:pStyle .../>; Word itself writes <w:p><w:pPr>...
    # Searching from the paragraph finds both without caring which is which.
    style = paragraph.find(f".//{W}pStyle")
    if style is None:
        return False
    value = (style.get(f"{W}val") or "").lower()
    return "bullet" in value or value.endswith("listparagraph")



# --------------------------------------------------------------------------
# LaTeX: reduce the source to the same plain text the other formats give us
# --------------------------------------------------------------------------

_MONTHS = (
    "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|"
    "aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
)

_TEX_SIMPLE = {
    # Contact macros seen in the wild. They are read before the body is
    # flattened, so their arguments keep their own line.
    "name": "@name",
    "email": "@email",
    "phone": "@phone",
    "mobile": "@phone",
    "location": "@location",
    "address": "@location",
    "linkedin": "@linkedin",
    "github": "@github",
    "website": "@website",
    "homepage": "@website",
}

_TEX_UNWRAP = {
    "textbf", "textit", "textmd", "textup", "emph", "underline", "textsc",
    "texttt", "textrm", "textsf", "textnormal", "text", "mathrm", "mathbf",
    "mathit", "mbox", "uppercase", "MakeUppercase", "small", "large", "Large",
    "huge", "Huge",
}

_TEX_DROP = {
    "vspace", "hspace", "hfill", "vfill", "smallskip", "medskip", "bigskip",
    "fontsize", "selectfont", "color", "textcolor", "colorbox", "label",
    "ref", "pageref", "includegraphics", "setlength", "addtolength", "rule",
    "newpage", "clearpage", "pagebreak", "noindent", "centering", "raggedright",
    "hrule", "vspace*", "hspace*", "linespread", "setstretch", "thispagestyle",
    "pagestyle", "geometry", "hypersetup", "definecolor", "usepackage",
    "documentclass", "input", "include", "renewcommand", "newcommand", "def",
    "setlist", "par", "medskip", "itemsep", "topsep", "parsep",
}


def latex_to_text(source: str) -> str:
    """Turn a LaTeX resume into lines the shared parser can read.

    Section commands become plain headings, `\\item` becomes a bullet, and the
    common resume macros (`\\resumeSubheading` and friends) are unpacked into
    the `position | company | dates` shape the parser expects. Everything else
    is unwrapped to its visible text, which is what a reader would see.
    """
    text = re.sub(r"(?<!\\)%.*$", "", source, flags=re.MULTILINE)
    # A pipe written in math mode is a separator, not arithmetic.
    text = re.sub(r"\$\s*\\?[|]\s*\$", " | ", text)
    text = text.replace("$", "")

    # The preamble is package options and geometry, not a resume. Cutting it
    # keeps `\documentclass[10pt]{article}` and friends from reaching the
    # parser as text. The body is what a reader would see.
    begin = re.search(r"\\begin\{document\}", text)
    if begin:
        text = text[begin.end():]
    text = re.split(r"\\end\{document\}", text)[0]
    text = re.sub(r"\\begin\{(?:document|center|flushleft|flushright|itemize|enumerate|description|tabular\*?|minipage)\}(?:\[[^\]]*\])?(?:\{[^}]*\})?", "\n", text)
    text = re.sub(r"\\end\{(?:document|center|flushleft|flushright|itemize|enumerate|description|tabular\*?|minipage)\}", "\n", text)

    # Resume-specific macros. Each rule is ordered before the generic
    # unwrapping, because their argument order is not the order on the page.
    def subheading(match: re.Match[str]) -> str:
        company, location, title, dates = (_tex_arg(match, i) for i in range(1, 5))
        parts = [title, company, location, dates]
        return "\n" + " | ".join(p for p in parts if p) + "\n"

    text = re.sub(
        r"\\resumeSubheading\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}",
        subheading,
        text,
    )
    text = re.sub(
        r"\\resumeProjectHeading\s*\{([^{}]*)\}\s*\{([^{}]*)\}",
        lambda m: "\n" + " | ".join(x for x in (_tex_arg(m, 1), _tex_arg(m, 2)) if x) + "\n",
        text,
    )
    text = re.sub(
        r"\\cventry\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}",
        lambda m: "\n"
        + " | ".join(x for x in (_tex_arg(m, 2), _tex_arg(m, 3), _tex_arg(m, 4), _tex_arg(m, 5), _tex_arg(m, 1)) if x)
        + "\n",
        text,
    )
    text = re.sub(
        r"\\(?:resumeItem|resumeSubItem|item)[ \t]*(?:\[[^\]]*\])?[ \t]*\{",
        "\n• ",
        text,
    )
    text = re.sub(r"\\item[ \t]*(?:\[[^\]]*\])?", "\n• ", text)
    text = re.sub(r"\\section\*?[ \t]*\{", "\n\n", text)
    text = re.sub(r"\\subsection\*?[ \t]*\{", "\n\n", text)
    text = re.sub(r"\\begin\{rSection\}[ \t]*\{", "\n\n", text)
    text = re.sub(r"\\end\{rSection\}", "\n", text)

    # Contact fields get a label so the header reader can place them even when
    # the author's own order is unusual.
    def contact(match: re.Match[str]) -> str:
        kind = match.group(1)
        value = match.group(2).strip()
        label = _TEX_SIMPLE[kind].lstrip("@")
        return f"\n{label}: {value}\n"

    text = re.sub(
        rf"\\({ '|'.join(_TEX_SIMPLE) })\s*\{{([^{{}}]*)\}}",
        contact,
        text,
    )

    # \newcommand{\name}{John Doe} defines a macro whose value is the real
    # content. Read the definition, then let the call site print it.
    text = re.sub(
        r"\\newcommand\s*\{?\\([A-Za-z@]+)\}?\s*\{([^{}]*)\}",
        lambda m: f"\n{m.group(2)}\n" if m.group(1).lower() in _TEX_SIMPLE else "",
        text,
    )

    text = re.sub(
        r"\\href\s*\{([^{}]*)\}\s*\{([^{}]*)\}",
        lambda m: _tex_arg(m, 2) or _tex_arg(m, 1),
        text,
    )
    text = re.sub(
        r"\\url\s*\{([^{}]*)\}",
        lambda m: _tex_arg(m, 1),
        text,
    )

    # Unwrap formatting, drop layout commands with their arguments.
    for _ in range(6):
        before = text
        text = re.sub(
            r"\\([A-Za-z]+)\*?[ \t]*\{([^{}]*)\}",
            lambda m: m.group(2) if m.group(1) in _TEX_UNWRAP else ("" if m.group(1) in _TEX_DROP else m.group(2)),
            text,
        )
        text = re.sub(
            # No trailing whitespace match here: `\medskip\n\n\section{…}`
            # would otherwise swallow the newlines that separate them.
            r"\\([A-Za-z]+)\*?(?:\[[^\]]*\])?",
            lambda m: "" if m.group(1) in _TEX_DROP else "",
            text,
        )
        text = re.sub(r"\\\\(?:\[[^\]]*\])?", "\n", text)
        text = text.replace("\\&", "&").replace("\\%", "%").replace("\\$", "$")
        text = text.replace("\\#", "#").replace("\\_", "_").replace("\\{", "{").replace("\\}", "}")
        if text == before:
            break

    text = _tex_accents(text)
    text = text.replace("~", " ").replace("\\,", " ").replace("\\;", " ")
    # TeX's own dashes: -- is an en dash, --- an em dash. Resume date ranges
    # are almost always written with one of them.
    text = text.replace("---", "\u2014").replace("--", "\u2013")
    text = re.sub(r"[{}]", "", text)
    return text


def _tex_arg(match: re.Match[str], index: int) -> str:
    try:
        return (match.group(index) or "").strip()
    except IndexError:
        return ""


_TEX_ACCENTS = {
    "'": "\u0301",
    "`": "\u0300",
    "^": "\u0302",
    '"': "\u0308",
    "~": "\u0303",
    "c": "\u0327",
    "v": "\u030c",
    "u": "\u0306",
    "=": "\u0304",
}


def _tex_accents(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        mark = _TEX_ACCENTS.get(match.group(1))
        return match.group(2) + (mark or "") if mark else match.group(2)

    text = re.sub(r"\\(['`^\"~cvu=])\s*\{?([A-Za-z])\}?", replace, text)
    import unicodedata

    return unicodedata.normalize("NFC", text)


# --------------------------------------------------------------------------
# Section vocabulary
# --------------------------------------------------------------------------

CANONICAL_TITLES = {
    "summary": "Summary",
    "experience": "Work Experience",
    "education": "Education",
    "skills": "Skills",
    "projects": "Projects",
    "certifications": "Certifications",
    "languages": "Languages",
}

SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "summary": (
        "summary", "professional summary", "profile", "profile summary", "about",
        "about me", "objective", "career objective", "personal statement",
        "executive summary", "professional profile", "career summary",
        "professional overview", "overview", "career profile",
    ),
    "experience": (
        "experience", "work experience", "professional experience",
        "employment history", "work history", "employment", "career history",
        "professional background", "relevant experience", "work", "internships",
        "internship experience", "professional experience & projects",
    ),
    "education": (
        "education", "academic background", "academic qualifications",
        "qualifications", "education and training", "education & training",
        "academic history", "educational background", "academics",
    ),
    "skills": (
        "skills", "technical skills", "core skills", "key skills", "competencies",
        "core competencies", "expertise", "technologies", "technical proficiencies",
        "technical expertise", "skill set", "areas of expertise",
        "tools and technologies", "technical stack", "tech stack",
        "skills and interests", "skills & interests", "core strengths",
        "strengths", "key strengths", "professional skills",
    ),
    "projects": (
        "projects", "personal projects", "key projects", "selected projects",
        "side projects", "academic projects", "notable projects",
        "technical projects", "project experience",
    ),
    "certifications": (
        "certifications", "certificates", "licenses",
        "licenses and certifications", "licenses & certifications",
        "certification", "training", "courses", "coursework",
        "professional certifications", "professional development",
    ),
    "languages": ("languages", "language skills", "languages spoken"),
}

EXTRA_SECTIONS: dict[str, tuple[str, ...]] = {
    "Awards": (
        "awards", "honors", "honours", "achievements", "awards and honors",
        "awards & honors", "accomplishments", "recognition", "awards & achievements",
    ),
    "Publications": (
        "publications", "papers", "research", "research publications",
        "presentations", "conference papers",
    ),
    "Volunteer": (
        "volunteer", "volunteering", "volunteer experience", "community service",
        "extracurricular", "extracurricular activities", "leadership",
        "leadership experience",
    ),
    "Interests": ("interests", "hobbies", "hobbies and interests", "activities"),
    "Personal Details": (
        "personal details", "personal information", "personal data",
        "personal profile", "personal particulars", "bio data", "biodata",
    ),
    "Career Interests": (
        "career interests", "career interest", "areas of interest",
        "professional interests", "job interests", "preferred roles",
    ),
    "Additional Information": (
        "additional information", "other information", "miscellaneous",
        "additional details", "other details",
    ),
}

SKIP_SECTIONS = ("references",)

_ALIAS_KIND: dict[str, str] = {}
for _kind, _names in SECTION_ALIASES.items():
    for _name in _names:
        _ALIAS_KIND[_name] = _kind
for _title, _names in EXTRA_SECTIONS.items():
    for _name in _names:
        _ALIAS_KIND[_name] = f"custom:{_title}"
for _name in SKIP_SECTIONS:
    _ALIAS_KIND[_name] = "skip"


# --------------------------------------------------------------------------
# Line-level helpers
# --------------------------------------------------------------------------

_BULLET_GLYPHS = "•·▪◦‣∙●○■□➢➤"
_BULLET_RE = re.compile(rf"^[{_BULLET_GLYPHS}]\s*")
_DASH_BULLET_RE = re.compile(r"^[-*—–]\s+")
_PAGE_NUMBER_RE = re.compile(r"^(?:page\s+)?\d+(?:\s*(?:of|/)\s*\d+)?$", re.I)

_DATE = rf"(?:(?:{_MONTHS})\.?\s*'?\s*(?:19|20)\d{{2}}|\d{{1,2}}\s*/\s*(?:19|20)\d{{2}}|(?:19|20)\d{{2}})"
_RANGE_RE = re.compile(
    rf"(?P<start>{_DATE})\s*(?:-|–|—|to|until|through)\s*(?P<end>{_DATE}|present|current|now|ongoing)",
    re.IGNORECASE,
)
_SINGLE_DATE_RE = re.compile(rf"(?<![\w/])(?P<date>{_DATE})(?![\w/])", re.IGNORECASE)

_URL_RE = re.compile(r"(?:https?://|www\.)[^\s|,;<>]+", re.IGNORECASE)
_BARE_URL_RE = re.compile(
    r"\b(?:[a-z0-9-]+\.)+(?:com|in|io|dev|net|org|me|co|ai|app|xyz|tech|site|"
    r"design|portfolio|codes|blog|page)(?:/[^\s|,;<>]*)?",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.-]{6,16}\d(?![\w.])")

_TITLE_WORDS = (
    "engineer", "developer", "manager", "analyst", "designer", "consultant",
    "director", "specialist", "intern", "lead", "architect", "scientist",
    "administrator", "coordinator", "officer", "assistant", "associate", "head",
    "president", "writer", "editor", "accountant", "nurse", "teacher",
    "professor", "researcher", "tester", "devops", "marketer", "strategist",
    "advisor", "owner", "founder", "cto", "ceo", "cfo", "coo", "engineer,",
    "executive", "supervisor", "technician", "representative", "recruiter",
)

_COMPANY_WORDS = (
    "inc", "llc", "l.l.c", "ltd", "limited", "corp", "corporation", "company",
    "group", "technologies", "technology", "solutions", "systems", "labs",
    "lab", "studio", "studios", "consulting", "services", "bank", "university",
    "college", "institute", "foundation", "agency", "media", "software",
    "pvt", "llp", "gmbh", "plc", "holdings", "ventures", "partners",
)

_DEGREE_WORDS = (
    "bachelor", "master", "doctor", "phd", "ph.d", "b.tech", "btech", "b.e.",
    "be ", "b.sc", "bsc", "b.a", "ba ", "m.tech", "mtech", "m.sc", "msc",
    "mba", "m.a", "b.com", "m.com", "diploma", "associate", "high school",
    "secondary", "higher secondary", "hsc", "ssc", "12th", "10th", "degree",
    "b.s", "m.s", "beng", "meng", "bs ", "ms ",
)

_INSTITUTION_WORDS = (
    "university", "college", "institute", "school", "academy", "polytechnic",
    "iit", "nit", "seminary", "conservatory",
)


def _normalise(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _clean(value: str) -> str:
    return _normalise(value).strip(" ,;|·•–—-:")


def _is_bullet(line: str) -> bool:
    stripped = line.lstrip()
    return bool(_BULLET_RE.match(stripped) or _DASH_BULLET_RE.match(stripped))


def _strip_bullet(line: str) -> str:
    stripped = line.lstrip()
    return _DASH_BULLET_RE.sub("", _BULLET_RE.sub("", stripped)).strip()


def _looks_like_title(value: str) -> bool:
    lowered = value.lower()
    return any(word in lowered for word in _TITLE_WORDS)


def _looks_like_company(value: str) -> bool:
    lowered = value.lower()
    if any(word in lowered for word in _COMPANY_WORDS):
        return True
    # An acronym in an otherwise mixed-case name ("Acme AI Labs") reads like a
    # company. In an all-caps line every word looks like an acronym, so the
    # test would call a person's name one.
    return (
        value != value.upper()
        and len(value.split()) <= 4
        and bool(re.search(r"\b[A-Z]{2,6}\b", value))
    )


def _looks_like_degree(value: str) -> bool:
    lowered = f" {value.lower()} "
    return any(word in lowered for word in _DEGREE_WORDS)


def _looks_like_institution(value: str) -> bool:
    lowered = value.lower()
    return any(word in lowered for word in _INSTITUTION_WORDS)


def _looks_like_person_name(line: str) -> bool:
    text = _normalise(line).strip(" ,")
    if not text or len(text) > 60 or re.search(r"[\d@|/]", text):
        return False
    words = text.split()
    if not 2 <= len(words) <= 5:
        return False
    if not all(re.fullmatch(r"[A-Za-z][A-Za-z.'-]*", word) for word in words):
        return False
    if _looks_like_title(text) or _looks_like_company(text):
        return False
    return text.lower().rstrip(":") not in _ALIAS_KIND


def _split_parts(line: str) -> list[str]:
    """Break an entry header into its labelled fragments.

    Resumes separate position, employer, place and dates with a bar, a spaced
    dash or a bullet. Hyphens inside words ("Full-Stack") are left alone
    because only spaced dashes are separators here.
    """
    text = re.sub(r"\s*[|•·]\s*", " | ", line)
    text = re.sub(r"\s+[–—]\s+|\s+-\s+", " | ", text)
    text = re.sub(r"\t+", " | ", text)
    return [_clean(part) for part in text.split("|") if _clean(part)]


def _clean_date(value: str) -> str:
    text = _normalise(value).strip(" .,-")
    if not text:
        return ""
    if text[0].islower() and re.match(rf"^{_MONTHS}", text, re.IGNORECASE):
        text = text[0].upper() + text[1:]
    return text


def _dates(line: str) -> tuple[dict, str]:
    """Pull a date range (or a lone date at an edge) out of a line."""
    found = {"startDate": "", "endDate": "", "current": False}
    match = _RANGE_RE.search(line)
    if match:
        end = _clean_date(match.group("end"))
        found["startDate"] = _clean_date(match.group("start"))
        found["endDate"] = end
        found["current"] = end.lower().startswith(("present", "current", "now", "ongoing"))
        rest = f"{line[: match.start()]} {line[match.end():]}"
        return found, _clean(rest)

    for single in reversed(list(_SINGLE_DATE_RE.finditer(line))):
        before = _clean(line[: single.start()])
        after = _clean(line[single.end():])
        # A date only counts when it sits at one end of the line; a year in the
        # middle of a sentence is usually prose ("5 years of experience").
        if not after and before:
            found["endDate"] = _clean_date(single.group("date"))
            return found, before
        if not before and after:
            found["startDate"] = _clean_date(single.group("date"))
            return found, after
    return found, _clean(line)


def _looks_like_heading(line: str) -> tuple[str, str] | None:
    raw = _clean(line).rstrip(":：").strip()
    if not raw or len(raw) > 48:
        return None
    key = _normalise(raw).lower().strip(":")
    key = re.sub(r"^\d+[.)]\s*", "", key)
    if key in _ALIAS_KIND:
        kind = _ALIAS_KIND[key]
        title = _title_case(raw) if kind.startswith("custom:") else CANONICAL_TITLES[kind]
        return kind, _normalise(str(title))
    letters = [character for character in raw if character.isalpha()]
    if (
        len(letters) >= 3
        and raw == raw.upper()
        and 2 <= len(raw.split()) <= 4
        and not _looks_like_title(raw)
        and not _looks_like_company(raw)
        and not _SINGLE_DATE_RE.search(raw)
    ):
        return f"custom:{_title_case(raw)}", _title_case(raw)
    return None


def _title_case(value: str) -> str:
    small = {"and", "or", "of", "the", "in", "at", "to", "for", "a", "an"}
    words = value.split()
    out = []
    for index, word in enumerate(words):
        lowered = word.lower()
        if index > 0 and lowered in small:
            out.append(lowered)
        elif word.isupper() and len(word) <= 4:
            out.append(word)
        else:
            out.append(word.capitalize())
    return " ".join(out)


# --------------------------------------------------------------------------
# Header: name, title, contact details
# --------------------------------------------------------------------------

_LOCATION_RE = re.compile(
    r"^(?:[A-Z][\w.'-]*(?:\s+[\w.'-]+){0,2})"
    r"(?:,\s*[A-Z][\w.'-]*(?:\s+[\w.'-]+){0,2}){1,3}$"
)
_LABEL_RE = re.compile(
    r"^\s*(?P<label>e-?mail|phone|mobile|tel|telephone|location|address|city|website|"
    r"portfolio|linkedin|github|blog|url)\s*[:\-–]\s*(?P<value>.+)$",
    re.IGNORECASE,
)


def _blank_basics() -> dict:
    return {
        "fullName": "",
        "headline": "",
        "email": "",
        "phone": "",
        "location": "",
        "website": "",
        "links": [],
    }


def _find_phone(line: str) -> str:
    for match in _PHONE_RE.finditer(line):
        candidate = _normalise(match.group())
        digits = re.sub(r"\D", "", candidate)
        if 8 <= len(digits) <= 15 and not re.fullmatch(r"(?:19|20)\d{2}(?:[\s.-]?(?:19|20)\d{2})?", candidate):
            return candidate
    return ""


def _social_label(url: str) -> str:
    lowered = url.lower()
    if "linkedin" in lowered:
        return "LinkedIn"
    if "github" in lowered:
        return "GitHub"
    if "gitlab" in lowered:
        return "GitLab"
    if "twitter" in lowered or "x.com" in lowered:
        return "X"
    if "behance" in lowered:
        return "Behance"
    if "dribbble" in lowered:
        return "Dribbble"
    return "Website"


def _add_link(basics: dict, url: str, label: str | None = None) -> None:
    url = url.strip().rstrip(".,;")
    if not url:
        return
    if url.lower().startswith("www."):
        url = f"https://{url}"
    key = url.lower().rstrip("/")
    existing = {link["url"].lower().rstrip("/") for link in basics["links"]}
    if key in existing or basics["website"].lower().rstrip("/") == key:
        return
    name = label or _social_label(url)
    if name == "Website" and not basics["website"]:
        basics["website"] = url
        return
    basics["links"].append({"label": name, "url": url})


def _parse_header(lines: list[str]) -> dict:
    basics = _blank_basics()
    remaining: list[str] = []

    for raw in lines:
        line = _normalise(raw)
        if not line:
            continue

        labelled = _LABEL_RE.match(line)
        if labelled:
            label = labelled.group("label").lower()
            value = labelled.group("value").strip()
            if label in ("email", "e-mail"):
                basics["email"] = basics["email"] or value
            elif label in ("phone", "mobile", "tel", "telephone"):
                basics["phone"] = basics["phone"] or _find_phone(value) or value
            elif label in ("location", "address", "city"):
                basics["location"] = basics["location"] or _clean(value)
            elif label in ("linkedin", "github", "blog", "url", "portfolio", "website"):
                _add_link(basics, value if not value.startswith("/") else value, _social_label(f"{label} {value}"))
            continue

        # Split a one-line contact row into its parts before interpretation:
        # "John Doe | john@x.com | +91 98765 43210 | Bengaluru" is common.
        parts = _split_parts(line) if ("|" in line or "•" in line) else [line]
        for part in parts:
            remainder = part

            email = _EMAIL_RE.search(remainder)
            if email and not basics["email"]:
                basics["email"] = email.group().strip()
                remainder = remainder.replace(email.group(), " ")

            for url in list(_URL_RE.finditer(remainder)):
                _add_link(basics, url.group(), None)
                remainder = remainder.replace(url.group(), " ")

            for url in list(_BARE_URL_RE.finditer(remainder)):
                candidate = url.group()
                if "@" in candidate:
                    continue
                _add_link(basics, candidate, None)
                remainder = remainder.replace(candidate, " ")

            phone = _find_phone(remainder)
            if phone and not basics["phone"]:
                basics["phone"] = phone
                remainder = remainder.replace(phone, " ")

            remainder = _clean(remainder)
            if remainder:
                remaining.append(remainder)

    # Name: the first line short enough to be a person, with no heading or
    # prose behind it.
    name_index = -1
    for index, line in enumerate(remaining):
        if _looks_like_person_name(line):
            basics["fullName"] = _title_case(line) if line.isupper() else line
            name_index = index
            break
        if _looks_like_heading(line):
            break

    for index, line in enumerate(remaining):
        if index == name_index:
            continue
        if not basics["headline"] and _looks_like_title(line) and len(line) <= 90:
            basics["headline"] = line.strip(" -–—|")
            continue
        if not basics["location"] and _LOCATION_RE.match(line):
            basics["location"] = _clean(line)
            continue
        if not basics["headline"] and len(line) <= 90 and not _looks_like_company(line):
            # The line directly under the name is the professional title even
            # when its wording is unusual ("Full-Stack Builder").
            if name_index != -1 and index == name_index + 1 and not basics["headline"]:
                basics["headline"] = line.strip(" -–—|")
            elif not basics["location"] and "," in line and len(line.split()) <= 5:
                basics["location"] = _clean(line)
            continue

    if basics["fullName"].isupper():
        basics["fullName"] = _title_case(basics["fullName"])
    return basics


# --------------------------------------------------------------------------
# Section readers
# --------------------------------------------------------------------------


def _new_experience() -> dict:
    return {"parts": [], "bullets": [], "startDate": "", "endDate": "", "current": False}


def _finish_experience(work: dict) -> dict | None:
    parts = list(work["parts"])
    position = company = location = ""

    if len(parts) == 1:
        single = parts[0]
        at_split = re.split(r"\s+at\s+", single, maxsplit=1, flags=re.IGNORECASE)
        if len(at_split) == 2:
            parts = [_clean(at_split[0]), _clean(at_split[1])]
        elif "," in single:
            head, tail = _clean(single).split(",", 1)
            if _looks_like_company(tail) or _looks_like_title(head):
                parts = [_clean(head), _clean(tail)]

    if len(parts) >= 2:
        first, second = parts[0], parts[1]
        rest = parts[2:]
        if _looks_like_title(first) and not _looks_like_title(second):
            position, company = first, second
        elif _looks_like_title(second) and not _looks_like_title(first):
            position, company = second, first
        elif _looks_like_company(first) and not _looks_like_company(second):
            company, position = first, second
        else:
            position, company = first, second
        if rest:
            location = rest[-1]
        if company and "," in company and not location:
            head, tail = company.split(",", 1)
            if _looks_like_company(head) or len(head.split()) <= 2:
                company, location = _clean(head), _clean(tail)
    elif parts:
        position = parts[0]

    bullets = [b for b in work["bullets"] if b]
    if not any([position, company, location, bullets]):
        return None
    return {
        "position": position,
        "company": company,
        "location": location,
        "startDate": work["startDate"],
        "endDate": work["endDate"],
        "current": work["current"],
        "bullets": bullets,
    }


def _parse_experience(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    work: dict | None = None

    for raw in lines:
        if not raw:
            continue
        bullet = _is_bullet(raw)
        line = _strip_bullet(raw) if bullet else _normalise(raw)
        if not line:
            continue

        dates, rest = _dates(line)
        dated = bool(dates["startDate"] or dates["endDate"])

        if bullet:
            if work is None:
                work = _new_experience()
            work["bullets"].append(line)
            continue

        if dated and work is not None and not work["startDate"] and not work["endDate"] and not work["bullets"] and len(work["parts"]) <= 1:
            # Second half of a two-line header: "Software Engineer" then
            # "Google | Bengaluru | Jan 2020 - Present".
            work.update({k: v for k, v in dates.items() if v})
            work["parts"].extend(_split_parts(rest) or ([rest] if rest else []))
            continue

        if dated:
            if work is not None and (work["parts"] or work["bullets"]):
                finished = _finish_experience(work)
                if finished:
                    entries.append(finished)
            work = _new_experience()
            work.update({k: v for k, v in dates.items() if v})
            work["parts"].extend(_split_parts(rest) or ([rest] if rest else []))
            continue

        if work is None:
            work = _new_experience()
            work["parts"].extend(_split_parts(line))
            continue

        if not work["bullets"] and len(work["parts"]) < 3:
            # Still in the header block: a location line, a department line.
            work["parts"].extend(_split_parts(line))
        elif work["bullets"]:
            # A wrapped bullet: PDF text extraction breaks long lines.
            work["bullets"][-1] = f"{work['bullets'][-1]} {line}".strip()
        else:
            work["bullets"].append(line)

    if work is not None:
        finished = _finish_experience(work)
        if finished:
            entries.append(finished)
    return entries


def _new_education() -> dict:
    return {"parts": [], "bullets": [], "startDate": "", "endDate": "", "grade": ""}


def _finish_education(work: dict) -> dict | None:
    parts = list(work["parts"])
    degree = institution = location = ""
    for index, part in enumerate(parts):
        if not degree and _looks_like_degree(part):
            degree = part
            parts.pop(index)
            break
    for index, part in enumerate(parts):
        if not institution and _looks_like_institution(part):
            institution = part
            parts.pop(index)
            break
    leftovers = [p for p in parts if p not in (degree, institution)]
    if not degree and leftovers:
        degree = leftovers.pop(0)
    if not institution and leftovers:
        institution = leftovers.pop(0)
    if leftovers:
        location = leftovers[-1]

    if institution and "," in institution and not location:
        head, tail = institution.split(",", 1)
        if _looks_like_institution(head) or len(head.split()) <= 4:
            institution, location = _clean(head), _clean(tail)

    bullets = [b for b in work["bullets"] if b]
    if not any([degree, institution, work["grade"], bullets]):
        return None
    return {
        "degree": degree,
        "institution": institution,
        "location": location,
        "startDate": work["startDate"],
        "endDate": work["endDate"],
        "grade": work["grade"],
        "bullets": bullets,
    }


_GRADE_RE = re.compile(
    r"(?:gpa|cgpa|grade|percentage|score|marks)\s*[:\-–]?\s*([\d.]+\s*(?:(?:/|out of)\s*[\d.]+|%)?)",
    re.IGNORECASE,
)


def _parse_education(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    work: dict | None = None

    for raw in lines:
        if not raw:
            continue
        bullet = _is_bullet(raw)
        line = _strip_bullet(raw) if bullet else _normalise(raw)
        if not line:
            continue

        grade = _GRADE_RE.search(line)
        dates, rest = _dates(line)
        dated = bool(dates["startDate"] or dates["endDate"])

        if bullet:
            if work is None:
                work = _new_education()
            work["bullets"].append(line)
            continue

        # A grade line ("CGPA: 8.6") describes the entry above it; it is never
        # a new entry of its own.
        if grade and not dated:
            if work is None:
                work = _new_education()
            work["grade"] = work["grade"] or _clean(grade.group(1))
            rest = _clean(rest.replace(grade.group(), " "))
            if not rest:
                continue

        if work is None:
            work = _new_education()

        header_open = not work["bullets"] and not work["startDate"] and not work["endDate"]
        existing_degree = any(_looks_like_degree(part) for part in work["parts"])
        if header_open and work["parts"] and not (_looks_like_degree(rest) and existing_degree):
            # The second line of a two-line education header: the institution
            # and its dates belong to the degree above them.
            if dated:
                work.update({k: v for k, v in dates.items() if v})
            if grade:
                work["grade"] = work["grade"] or _clean(grade.group(1))
                rest = _clean(rest.replace(grade.group(), " "))
            work["parts"].extend(_split_parts(rest) or ([rest] if rest else []))
            continue

        starts_new = dated or _looks_like_degree(line) or (
            bool(work["bullets"]) or len(work["parts"]) >= 2
        )
        if starts_new and (work["parts"] or work["bullets"]):
            finished = _finish_education(work)
            if finished:
                entries.append(finished)
            work = _new_education()

        if dated:
            work.update({k: v for k, v in dates.items() if v})
        if grade:
            work["grade"] = work["grade"] or _clean(grade.group(1))
            rest = _clean(rest.replace(grade.group(), " "))
        parts = _split_parts(rest) or ([rest] if rest else [])
        work["parts"].extend(parts)

    if work is not None:
        finished = _finish_education(work)
        if finished:
            entries.append(finished)
    return entries


def _parse_summary(lines: list[str]) -> list[str]:
    paragraphs: list[str] = []
    current: list[str] = []

    def flush() -> None:
        nonlocal current
        paragraph = _clean(" ".join(current))
        if paragraph:
            paragraphs.append(paragraph)
        current = []

    for raw in lines:
        if not raw:
            flush()
            continue
        current.append(_strip_bullet(raw) if _is_bullet(raw) else raw)
    flush()
    return paragraphs


def _split_list(text: str) -> list[str]:
    parts = re.split(r"[,;•·|]|\s+/\s+", text)
    return [_clean(part) for part in parts if _clean(part)]


def _parse_skills(lines: list[str]) -> list[dict]:
    groups: list[dict] = []
    loose: list[str] = []

    def group_for(category: str) -> dict | None:
        for group in groups:
            if group["category"].lower() == category.lower():
                return group
        return None

    for raw in lines:
        if not raw:
            continue
        line = _strip_bullet(raw)
        if not line:
            continue
        label = re.match(r"^([\w &/+.'-]{1,40})\s*[:：]\s*(.+)$", line)
        if label and not _looks_like_heading(line):
            category = _clean(label.group(1))
            skills = _split_list(label.group(2))
            if skills:
                existing = group_for(category)
                if existing:
                    existing["skills"].extend(s for s in skills if s not in existing["skills"])
                else:
                    groups.append({"category": category, "skills": skills})
        elif ":" in line and len(line.split(":", 1)[0]) <= 40:
            # A colon inside a sentence is not a category; leave it as prose.
            loose.append(line)
        else:
            loose.extend(_split_list(line))

    if loose:
        existing = group_for("")
        if existing:
            existing["skills"].extend(s for s in loose if s not in existing["skills"])
        else:
            groups.insert(0, {"category": "", "skills": loose})
    return [g for g in groups if g["skills"]]


def _parse_projects(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    work: dict | None = None

    def start() -> dict:
        return {"parts": [], "bullets": [], "startDate": "", "endDate": "", "url": ""}

    def finish(item: dict) -> dict | None:
        parts = list(item["parts"])
        name = parts[0] if parts else ""
        role = parts[1] if len(parts) > 1 else ""
        url = item["url"]
        if url:
            role = role.replace(url, "").strip(" |,–—-")
        if name and url and url in name:
            name = name.replace(url, "").strip(" |,–—-")
        if not any([name, role, item["bullets"]]):
            return None
        return {
            "name": name,
            "role": role,
            "url": url,
            "startDate": item["startDate"],
            "endDate": item["endDate"],
            "bullets": [b for b in item["bullets"] if b],
        }

    for raw in lines:
        if not raw:
            continue
        bullet = _is_bullet(raw)
        line = _strip_bullet(raw) if bullet else _normalise(raw)
        if not line:
            continue

        dates, rest = _dates(line)
        dated = bool(dates["startDate"] or dates["endDate"])
        url = ""
        url_match = _URL_RE.search(rest) or _BARE_URL_RE.search(rest)
        if url_match:
            url = url_match.group()
            rest = _clean(rest.replace(url, " "))

        if bullet:
            if work is None:
                work = start()
            work["bullets"].append(line)
            continue

        starts_new = dated or work is None
        if work is not None and not starts_new and work["bullets"]:
            # A short line after bullets opens the next project; a sentence
            # continues the one before it.
            starts_new = len(rest) <= 72 and not rest.endswith(".") and not rest[:1].islower()

        if starts_new:
            if work is not None:
                finished = finish(work)
                if finished:
                    entries.append(finished)
            work = start()
            work.update({k: v for k, v in dates.items() if v})
            work["url"] = url
            work["parts"].extend(_split_parts(rest) or ([rest] if rest else []))
        else:
            if rest:
                work["parts"].extend(_split_parts(rest))
            if url:
                work["url"] = url

    if work is not None:
        finished = finish(work)
        if finished:
            entries.append(finished)
    return entries


def _parse_certifications(lines: list[str]) -> list[dict]:
    items: list[dict] = []
    for raw in lines:
        if not raw:
            continue
        line = _strip_bullet(raw)
        if not line or _PAGE_NUMBER_RE.match(line):
            continue
        dates, rest = _dates(line)
        parts = _split_parts(rest) or ([rest] if rest else [])
        name = parts[0] if parts else ""
        issuer = " | ".join(parts[1:]) if len(parts) > 1 else ""
        if not name:
            continue
        items.append(
            {
                "name": name,
                "issuer": issuer,
                "date": dates["endDate"] or dates["startDate"],
                "url": "",
            }
        )
    return items


def _parse_languages(lines: list[str]) -> list[dict]:
    items: list[dict] = []
    for raw in lines:
        if not raw:
            continue
        line = _strip_bullet(raw)
        if not line:
            continue
        for token in re.split(r"[,;•·|]|\s+/\s+", line):
            token = _clean(token)
            if not token:
                continue
            match = re.match(r"^(.+?)\s*[\(\-–—:]\s*([^)\]]+?)\s*[\)\]]?$", token)
            if match:
                name, proficiency = _clean(match.group(1)), _clean(match.group(2))
            else:
                name, proficiency = token, ""
            if name:
                items.append({"name": name, "proficiency": proficiency})
    return items


def _parse_custom(lines: list[str]) -> list[dict]:
    items: list[dict] = []
    for raw in lines:
        if not raw:
            continue
        bullet = _is_bullet(raw)
        text = _strip_bullet(raw) if bullet else _normalise(raw)
        if not text:
            continue
        if bullet and items:
            items[-1]["bullets"].append(text)
            continue
        dates, rest = _dates(text)
        parts = _split_parts(rest) or ([rest] if rest else [])
        title = parts[0] if parts else ""
        subtitle = " | ".join(parts[1:]) if len(parts) > 1 else ""
        items.append(
            {
                "title": title,
                "subtitle": subtitle,
                "date": dates["endDate"] or dates["startDate"],
                "bullets": [],
            }
        )
    return [item for item in items if item["title"] or item["bullets"]]


# --------------------------------------------------------------------------
# The document reader
# --------------------------------------------------------------------------


def _lines(text: str) -> list[str]:
    normalised = (
        text.replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\u00a0", " ")
        .replace("\t", " ")
    )
    out: list[str] = []
    for raw in normalised.split("\n"):
        line = _normalise(raw)
        if _PAGE_NUMBER_RE.match(line):
            # Footers repeat on every page; they are not content.
            continue
        out.append(line)
        if len(out) >= MAX_LINES:
            break
    # Trim leading and trailing blanks so the head reader starts at the name.
    while out and not out[0]:
        out.pop(0)
    while out and not out[-1]:
        out.pop()
    return out


def parse_resume(text: str) -> dict:
    """Read plain resume text into the document's neutral shape."""
    lines = _lines(text)
    if not lines:
        raise UnreadableFile("No text could be read from this file.")

    header: list[str] = []
    buckets: dict[str, list[str]] = {}
    titles: dict[str, str] = {}
    current: str | None = None
    saw_heading = False

    for index, line in enumerate(lines):
        heading = _looks_like_heading(line) if line else None
        # A resume starts with the person's name. An all-caps name would
        # otherwise read as an unknown section heading -- the one place where
        # the first line is unambiguous.
        if heading and index == 0 and _looks_like_person_name(line):
            heading = None
        if heading:
            kind, title = heading
            saw_heading = True
            if kind == "skip":
                current = None
                continue
            if kind not in buckets:
                buckets[kind] = []
                titles[kind] = title
            current = kind
            continue
        if current is None:
            header.append(line)
        else:
            buckets[current].append(line)

    basics = _parse_header(header)
    # The order the sections appeared in is the author's own outline. Keeping
    # it means an imported resume reads in the sequence it was written, not in
    # this module's dictionary order.
    order = [
        f"custom:{titles[kind]}" if kind.startswith("custom:") else kind
        for kind in buckets
    ]
    document = {
        "basics": basics,
        "summary": _parse_summary(buckets.get("summary", [])),
        "experience": _parse_experience(buckets.get("experience", [])),
        "education": _parse_education(buckets.get("education", [])),
        "skills": _parse_skills(buckets.get("skills", [])),
        "projects": _parse_projects(buckets.get("projects", [])),
        "certifications": _parse_certifications(buckets.get("certifications", [])),
        "languages": _parse_languages(buckets.get("languages", [])),
        "custom": [
            {"title": titles[kind], "items": _parse_custom(body)}
            for kind, body in buckets.items()
            if kind.startswith("custom:") and any(body)
        ],
        "warnings": [],
        "order": order,
    }

    # A file with no headings at all still has content. Everything after the
    # header becomes one general section rather than vanishing.
    if not saw_heading:
        body = [
            line for line in lines[len(header):]
            if line and not _PAGE_NUMBER_RE.match(line)
        ]
        if any(body):
            items = _parse_custom(body)
            document["custom"].append({"title": "Imported content", "items": items})
            document["order"].append("custom:Imported content")
            document["warnings"].append(
                "No section headings were recognised, so the content was collected "
                "into one section for you to sort."
            )

    _add_warnings(document, buckets)
    return document


def _add_warnings(document: dict, buckets: dict[str, list[str]]) -> None:
    warnings: list[str] = document["warnings"]
    basics = document["basics"]

    if not basics["fullName"]:
        warnings.append("The name was not recognised. Add it in the review step.")
    if not basics["email"] and not basics["phone"]:
        warnings.append("No email or phone number was found. Add them in the review step.")
    if buckets.get("experience") and not document["experience"]:
        warnings.append("The experience section was found but no entries could be read from it.")
    if buckets.get("education") and not document["education"]:
        warnings.append("The education section was found but no entries could be read from it.")
    filled = any(
        document[key]
        for key in ("summary", "experience", "education", "skills", "projects", "certifications", "languages", "custom")
    )
    if not filled:
        warnings.append(
            "Only contact details were recognised. Add the rest of the content in the review step."
        )
