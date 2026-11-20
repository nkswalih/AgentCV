from __future__ import annotations

import sys
import unittest
from pathlib import Path


BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app import importer  # noqa: E402


class ImporterTests(unittest.TestCase):
    def test_project_headers_after_bullets_open_new_entries(self) -> None:
        lines = [
            "Kraivor - Developer Intelligence GitHub https://github.com/example/kraivor",
            "FastAPI, Django, PostgreSQL",
            "- Built a developer analysis platform.",
            "Skyrict - Business OS | GitHub | Live https://skyrict.example/",
            "FastAPI, Python, Azure",
            "- Provisioned infrastructure with Bicep.",
            "EchOo - E-Commerce Platform GitHub | Live https://echoo.example/",
            "Django REST Framework, React",
            "- Built a storefront with a Django API.",
        ]

        projects = importer._parse_projects(lines)

        self.assertEqual([item["name"] for item in projects], ["Kraivor", "Skyrict", "EchOo"])
        self.assertEqual(
            [item["url"] for item in projects],
            [
                "https://github.com/example/kraivor",
                "https://skyrict.example/",
                "https://echoo.example/",
            ],
        )

    def test_live_site_is_preferred_over_repository(self) -> None:
        urls = ["https://github.com/example/project", "https://project.example/"]
        self.assertEqual(importer._preferred_url(urls), "https://project.example/")

    def test_link_labels_are_not_part_of_project_name(self) -> None:
        self.assertEqual(importer._strip_link_label("Project Name | GitHub | Live"), "Project Name")

    def test_glued_experience_header_is_split_without_losing_location(self) -> None:
        work = {
            "parts": ["Full Stack DeveloperExample Systems LLC", "Kozhikode, India"],
            "bullets": [],
            "startDate": "Sep 2025",
            "endDate": "Present",
            "current": True,
        }

        experience = importer._finish_experience(work)

        self.assertIsNotNone(experience)
        assert experience is not None
        self.assertEqual(experience["position"], "Full Stack Developer")
        self.assertEqual(experience["company"], "Example Systems LLC")
        self.assertEqual(experience["location"], "Kozhikode, India")

    def test_text_import_decodes_utf8_bom(self) -> None:
        data = "Name\r\nDeveloper\r\n".encode("utf-8-sig")
        self.assertEqual(importer.extract_text("txt", data), "Name\r\nDeveloper\r\n")


if __name__ == "__main__":
    unittest.main()
