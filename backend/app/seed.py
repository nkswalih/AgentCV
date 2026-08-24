"""The document a brand-new resume starts from.

A blank resume is a bad first experience -- there is nothing in the preview to
react to. This seeds the standard sections in the conventional order with empty
items, so the shape of the page is visible immediately.
"""

from __future__ import annotations

from .schemas import (
    Basics,
    EducationItem,
    EducationSection,
    ExperienceItem,
    ExperienceSection,
    ProjectsSection,
    ResumeDocument,
    Settings,
    SkillGroup,
    SkillsSection,
    SummaryItem,
    SummarySection,
    TemplateId,
)

# The face each design was drawn with. Creating a resume through the dialog
# stamps it so the preview the person chose is the document they get; they can
# still switch fonts afterwards like any other setting.
TEMPLATE_FONTS: dict[TemplateId, str] = {
    TemplateId.CLASSIC_PRO: "Georgia",
    TemplateId.MODERN_MIN: "Inter",
    TemplateId.TWO_COL: "Inter",
    TemplateId.SIDEBAR: "Inter",
    TemplateId.EDITORIAL: "Georgia",
    TemplateId.EXECUTIVE: "Garamond",
    TemplateId.COMPACT: "Arial",
    TemplateId.CREATIVE: "Lato",
    TemplateId.DEVTECH: "IBM Plex Sans",
    TemplateId.ACADEMIC: "Times New Roman",
    TemplateId.TIMELINE: "IBM Plex Sans",
    TemplateId.PHOTO_PRO: "Georgia",
    TemplateId.PORTAL_PRO: "Georgia",
    TemplateId.MODERN_DEEP: "Merriweather",
    TemplateId.SERIF_ATS: "Times New Roman",
    TemplateId.JAKE: "Times New Roman",
}


def starter_document() -> ResumeDocument:
    return ResumeDocument(
        basics=Basics(
            fullName="Your Name",
            headline="Your Job Title",
            email="you@example.com",
            phone="",
            location="City, Country",
        ),
        sections=[
            SummarySection(title="Summary", items=[SummaryItem()]),
            ExperienceSection(
                title="Work Experience",
                items=[ExperienceItem(bullets=[""])],
            ),
            EducationSection(
                title="Education",
                items=[EducationItem()],
            ),
            SkillsSection(
                title="Skills",
                items=[SkillGroup(category="", skills=[])],
            ),
            # Present but hidden -- one toggle away instead of one build away.
            ProjectsSection(title="Projects", visible=False, items=[]),
        ],
        settings=Settings(),
    )
