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
)


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
