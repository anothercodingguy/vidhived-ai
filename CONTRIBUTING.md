# Contributing to Vidhived.ai

Thank you for your interest in contributing! Vidhived.ai is an open project and contributions of all kinds are welcome.

## Ways to Contribute

- **Bug Reports** — Open an issue with steps to reproduce, expected vs actual behavior
- **Feature Requests** — Suggest improvements via GitHub Issues
- **Code Contributions** — Fix bugs, add features, improve performance
- **Documentation** — Improve README, add examples, fix typos
- **Tests** — Extend the test suite in `backend/tests/`

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [Groq API key](https://console.groq.com/)

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/vidhived-ai.git
cd vidhived-ai
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your GROQ_API_KEY
python wsgi.py
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:5001
npm run dev
```

## Pull Request Process

1. **Branch naming**: `feat/your-feature`, `fix/your-fix`, `docs/your-docs`
2. **Commit style**: Use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add multi-document comparison`
   - `fix: resolve TTS timeout on long clauses`
   - `docs: update deployment instructions`
3. **Tests**: All PRs must include or update tests in `backend/tests/`
4. **Lint**: Ensure your Python code passes `flake8` and frontend passes `eslint`
5. **PR Description**: Explain *what* changed and *why*, include screenshots for UI changes

## Running Tests

```bash
# Backend
cd backend
pytest tests/ -v --cov=. --cov-report=term-missing

# Frontend
cd frontend
npm run lint
```

## Code Style

- **Python**: PEP 8, type hints encouraged, docstrings on all functions
- **TypeScript**: ESLint + Prettier, functional components, no `any` types
- **Commits**: Conventional Commits format

## Reporting Security Issues

Do **not** open public issues for security vulnerabilities. Email `suyash.strive@gmail.com` directly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
