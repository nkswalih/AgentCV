# Contributing to AgentCV

Thanks for helping improve AgentCV.

## Before you start

- Search existing issues and pull requests to avoid duplicate work.
- Open an issue before a large feature or architectural change so the direction can be agreed first.
- Never commit real resumes, exported documents, profile photos, databases, API keys, or other personal data.
- Keep AgentCV's current single-user, local-first security boundary in mind.

## Development setup

Follow the installation and development instructions in [README.md](README.md). Use a feature branch created from the latest `main`.

## Quality checks

Run these checks before opening a pull request:

```bash
cd frontend
npm run build

cd ..
python -m unittest discover -s backend/tests -v
python -m compileall -q backend/app
```

When changing a user flow or template, also run the relevant browser checks in `frontend/e2e/` and include screenshots when they make the review easier.

## Pull requests

- Keep each pull request focused on one coherent outcome.
- Explain the user-visible behavior, implementation choices, and verification performed.
- Add or update tests for parsing, persistence, and other behavior that can regress silently.
- Preserve existing document compatibility when changing schemas or template settings.
- Do not overwrite or delete unfamiliar data files during testing. Create disposable fixtures and clean them up afterward.

By contributing, you agree that your contributions will be licensed under the repository's MIT License.
