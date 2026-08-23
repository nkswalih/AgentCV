"""Pydantic schemas defining the AgentCV resume document.

The whole document is stored as a single JSON blob in SQLite (see models.py).
That keeps the schema easy to evolve -- resume documents are small, and the
alternative is a dozen join tables for what is really one nested document.
Validation happens here instead of in the database.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated, Literal, Union
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


def _new_id() -> str:
    return uuid4().hex[:12]


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)


# --------------------------------------------------------------------------
# Basics (the header block: name, contact details)
# --------------------------------------------------------------------------


class Link(Base):
    id: str = Field(default_factory=_new_id)
    label: str = ""
    url: str = ""


class Basics(Base):
    full_name: str = Field("", alias="fullName")
    headline: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    photo_url: str | None = Field(None, alias="photoUrl")
    # Legacy: old documents kept the summary here. Migration lifts it into a
    # SummarySection on load; nothing renders from this field anymore.
    summary: str = ""
    links: list[Link] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Section item types
#
# Every item carries an `id` so React keys and drag-and-drop stay stable
# across reorders, and `visible` so a row can be hidden without deleting it.
# --------------------------------------------------------------------------


class ItemBase(Base):
    id: str = Field(default_factory=_new_id)
    visible: bool = True


class ExperienceItem(ItemBase):
    position: str = ""
    company: str = ""
    location: str = ""
    start_date: str = Field("", alias="startDate")
    end_date: str = Field("", alias="endDate")
    current: bool = False
    bullets: list[str] = Field(default_factory=list)


class EducationItem(ItemBase):
    degree: str = ""
    institution: str = ""
    location: str = ""
    start_date: str = Field("", alias="startDate")
    end_date: str = Field("", alias="endDate")
    grade: str = ""
    bullets: list[str] = Field(default_factory=list)


class SkillGroup(ItemBase):
    """Skills are grouped ("Languages: Python, Go") rather than a flat list --
    grouping is what makes a skills block readable on a one-page resume."""

    category: str = ""
    skills: list[str] = Field(default_factory=list)


class ProjectItem(ItemBase):
    name: str = ""
    role: str = ""
    url: str = ""
    start_date: str = Field("", alias="startDate")
    end_date: str = Field("", alias="endDate")
    bullets: list[str] = Field(default_factory=list)


class CertificationItem(ItemBase):
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: str = ""


class LanguageItem(ItemBase):
    name: str = ""
    proficiency: str = ""


class CustomItem(ItemBase):
    title: str = ""
    subtitle: str = ""
    date: str = ""
    bullets: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Sections
#
# `sections` is an ordered list, so drag-and-drop reordering is just a list
# move -- no separate `order` column to keep in sync.
# --------------------------------------------------------------------------


class SectionType(str, Enum):
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    SKILLS = "skills"
    PROJECTS = "projects"
    CERTIFICATIONS = "certifications"
    LANGUAGES = "languages"
    CUSTOM = "custom"


class SectionBase(Base):
    id: str = Field(default_factory=_new_id)
    title: str = ""
    visible: bool = True


class SummaryItem(ItemBase):
    """One paragraph of the summary; several items read as several paragraphs."""

    summary: str = ""


class SummarySection(SectionBase):
    """An editable heading (the title) plus one paragraph per item."""

    type: Literal[SectionType.SUMMARY] = SectionType.SUMMARY
    items: list[SummaryItem] = Field(default_factory=list)


class ExperienceSection(SectionBase):
    type: Literal[SectionType.EXPERIENCE] = SectionType.EXPERIENCE
    items: list[ExperienceItem] = Field(default_factory=list)


class EducationSection(SectionBase):
    type: Literal[SectionType.EDUCATION] = SectionType.EDUCATION
    items: list[EducationItem] = Field(default_factory=list)


class SkillsLayout(str, Enum):
    """How a skills section prints: one line per category, or a column grid."""

    INLINE = "inline"
    BULLETS = "bullets"


class SkillMarker(str, Enum):
    """The glyph before each skill in the column layout. FLAT renders none."""

    BULLET = "bullet"
    DASH = "dash"
    FLAT = "flat"


class SkillsSection(SectionBase):
    type: Literal[SectionType.SKILLS] = SectionType.SKILLS
    items: list[SkillGroup] = Field(default_factory=list)
    layout: SkillsLayout = SkillsLayout.INLINE
    marker: SkillMarker = SkillMarker.BULLET
    columns: int = Field(2, ge=1, le=4)


class ProjectsSection(SectionBase):
    type: Literal[SectionType.PROJECTS] = SectionType.PROJECTS
    items: list[ProjectItem] = Field(default_factory=list)


class CertificationsSection(SectionBase):
    type: Literal[SectionType.CERTIFICATIONS] = SectionType.CERTIFICATIONS
    items: list[CertificationItem] = Field(default_factory=list)


class LanguagesSection(SectionBase):
    type: Literal[SectionType.LANGUAGES] = SectionType.LANGUAGES
    items: list[LanguageItem] = Field(default_factory=list)


class CustomSection(SectionBase):
    type: Literal[SectionType.CUSTOM] = SectionType.CUSTOM
    items: list[CustomItem] = Field(default_factory=list)


Section = Annotated[
    Union[
        SummarySection,
        ExperienceSection,
        EducationSection,
        SkillsSection,
        ProjectsSection,
        CertificationsSection,
        LanguagesSection,
        CustomSection,
    ],
    Field(discriminator="type"),
]


# --------------------------------------------------------------------------
# Appearance settings
# --------------------------------------------------------------------------


class TemplateId(str, Enum):
    # Named for how a parser sees them, not for how they look -- ATS-safety is
    # the choice that actually decides whether a resume survives screening.
    ATS_CLASSIC = "ats-classic"
    ATS_MODERN = "ats-modern"
    COMPACT = "compact"
    SIDEBAR = "sidebar"
    BANNER = "banner"


class PaperSize(str, Enum):
    A4 = "A4"
    LETTER = "Letter"


class Settings(Base):
    template: TemplateId = TemplateId.ATS_MODERN
    accent_color: str = Field("#2563eb", alias="accentColor")
    font_family: str = Field("Inter", alias="fontFamily")
    font_size: float = Field(10.5, alias="fontSize", ge=7, le=16)
    line_height: float = Field(1.4, alias="lineHeight", ge=1.0, le=2.2)
    section_spacing: float = Field(1.0, alias="sectionSpacing", ge=0.4, le=2.5)
    # Page margins in millimetres, because the output is a real sheet of paper
    # and this is the one setting people already think about in real units. The
    # bounds are wider than the editor's sliders so the UI can be retuned
    # without invalidating documents that are already saved.
    margin_x: float = Field(15.0, alias="marginX", ge=5, le=35)
    margin_y: float = Field(14.0, alias="marginY", ge=5, le=35)
    paper_size: PaperSize = Field(PaperSize.A4, alias="paperSize")
    show_photo: bool = Field(False, alias="showPhoto")
    # Icons in front of the contact line entries; off prints plain text.
    show_icons: bool = Field(True, alias="showIcons")
    # Per-element font size overrides in pt. None follows the template default,
    # which differs per template -- bounds are wider than the editor sliders so
    # the UI can be retuned without invalidating saved documents.
    name_size: float | None = Field(None, alias="nameSize", ge=10, le=40)
    title_size: float | None = Field(None, alias="titleSize", ge=8, le=24)
    heading_size: float | None = Field(None, alias="headingSize", ge=7, le=20)
    entry_size: float | None = Field(None, alias="entrySize", ge=7, le=20)


# --------------------------------------------------------------------------
# The document, plus API request/response shapes
# --------------------------------------------------------------------------


class ResumeDocument(Base):
    basics: Basics = Field(default_factory=Basics)
    sections: list[Section] = Field(default_factory=list)
    settings: Settings = Field(default_factory=Settings)


class ResumeSummary(Base):
    """Lightweight shape for the dashboard list -- no document body."""

    model_config = ConfigDict(extra="ignore", populate_by_name=True, from_attributes=True)

    id: str
    name: str
    template: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class Resume(ResumeSummary):
    document: ResumeDocument


class ResumeCreate(Base):
    name: str = "Untitled Resume"
    document: ResumeDocument | None = None


class ResumeUpdate(Base):
    name: str | None = None
    document: ResumeDocument | None = None


class ExportRequest(Base):
    """Options for a PDF render. Defaults come from the document's settings."""

    paper_size: PaperSize | None = Field(None, alias="paperSize")
