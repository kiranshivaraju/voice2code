---
description: Initialize GitHub repository with proper structure
---

You are initializing the GitHub repository with proper project structure, CI/CD, and tooling.

## Context

This command sets up the foundational repository structure based on the product architecture defined in the previous step.

## Prerequisites

Ensure these commands have been run first:
- `/prodkit.prd` - PRD must exist
- `/prodkit.product-arch` - Architecture docs must exist

## Instructions

### Step 1: Read Configuration

Read `.prodkit/config.yml` to understand:
- Project name and type
- Testing framework
- Directory structure preferences

Read `product/tech-docs/architecture.md` to understand:
- Tech stack
- Language and framework

### Step 2: Check GitHub Personal Access Token

Ask the user if they have a GitHub Personal Access Token (PAT):

If not, guide them to create one:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name (e.g., "ProdKit")
4. Select scopes:
   - `repo` (all repository permissions)
   - `workflow` (if using GitHub Actions)
5. Click "Generate token"
6. Copy the token (you won't see it again!)

Store the token securely - we'll use it for GitHub API calls.

### Step 3: Initialize Git Repository

If not already a git repository:

```bash
git init
```

### Step 4: Create Project Structure

Based on the project type from config, create the appropriate structure:

#### For Python Projects:

```bash
mkdir -p src tests/unit tests/contract tests/integration docs
touch src/__init__.py
touch tests/__init__.py tests/unit/__init__.py tests/contract/__init__.py tests/integration/__init__.py
```

Create `.gitignore`:
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Virtual Environment
venv/
ENV/
env/

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# ProdKit
.prodkit/cache/
```

Create `requirements.txt` or `pyproject.toml` based on testing framework:
```
pytest>=7.0.0
pytest-cov>=4.0.0
python-dotenv>=1.0.0
```

Create `pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --cov=src
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
```

#### For Node.js Projects:

```bash
mkdir -p src tests/unit tests/contract tests/integration docs
```

Create `.gitignore`:
```
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Build
dist/
build/

# Environment
.env
.env.local

# IDEs
.vscode/
.idea/
*.swp

# OS
.DS_Store

# ProdKit
.prodkit/cache/
```

Create `package.json`:
```json
{
  "name": "project-name",
  "version": "1.0.0",
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

### Step 5: Create CI/CD Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python 3.11  # or Node.js, adjust based on project type
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt

    - name: Run linter
      run: |
        pip install flake8
        flake8 src tests --max-line-length=100

    - name: Run tests
      run: |
        pytest

    - name: Check coverage
      run: |
        pytest --cov=src --cov-fail-under=80

  security:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Run security scan
      run: |
        pip install safety
        safety check
```

### Step 6: Create README

Create `README.md`:

```markdown
# [Project Name]

[Brief description from PRD]

## Tech Stack

[Copy from architecture.md]

## Getting Started

### Prerequisites

- Python 3.11+ (or your language/version)
- [Other requirements]

### Installation

```bash
# Clone the repository
git clone https://github.com/username/repo-name.git
cd repo-name

# Create virtual environment (Python)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test type
pytest tests/unit
pytest tests/integration
```

### Development

This project uses ProdKit for development workflow. See `.prodkit/` for commands.

Sprint documentation is in `sprints/v{N}/`.

## Project Structure

```
.
├── src/              # Source code
├── tests/
│   ├── unit/         # Unit tests
│   ├── contract/     # Contract tests
│   └── integration/  # Integration tests
├── product/          # Product-level documentation
├── sprints/          # Sprint-level documentation
└── .prodkit/         # ProdKit framework
```

## Contributing

All code changes require:
1. Tests (unit + integration)
2. Passing CI/CD
3. Code review approval
4. 80% test coverage minimum

## License

[Your license]
```

### Step 7: Install Speckit

Check if Speckit is installed (if using it for development):

```bash
# This depends on how Speckit is installed
# For now, create a placeholder to install it later
```

If not available, create a note in `docs/setup-speckit.md`:

```markdown
# Installing Speckit

Speckit is required for the `/prodkit.dev` workflow.

Follow installation instructions at: https://github.com/github/spec-kit

After installation, run:
```bash
speckit init . --here --ai claude
```

This will set up Speckit in the current directory.
```

### Step 8: Create GitHub Repository

Ask the user:
- What should the GitHub repository name be? (suggest using project name from config)
- What is their GitHub username?
- Should it be public or private?
- Do they want to create it now or do it manually later?

If they want to create it now, ask for their Personal Access Token.

**Create the repository using GitHub API:**

```bash
# Get inputs from user
GITHUB_USERNAME="[username]"
REPO_NAME="[repo-name]"
GITHUB_TOKEN="[their-PAT]"
PRIVATE="false"  # or "true" for private

# Create repository via GitHub API
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"private\":$PRIVATE,\"description\":\"[Description from PRD]\"}"

# Add remote
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
```

Check if creation was successful by verifying the response contains the repository URL.

### Step 9: Initial Commit

Create initial commit:

```bash
git add .
git commit -m "chore: initialize project structure with ProdKit

- Set up project directories (src, tests, docs)
- Add CI/CD pipeline with GitHub Actions
- Configure testing framework
- Add .gitignore and README
- Initialize ProdKit framework

🤖 Generated with ProdKit
"
```

### Step 10: Set Up Branch Protection (Optional)

Ask the user if they want to set up branch protection for `main`:

If yes, use GitHub API:

```bash
# Set up branch protection
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/branches/main/protection" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["test"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1
    },
    "restrictions": null
  }'
```

### Step 11: Create Milestones

Create the first sprint milestone using GitHub API:

```bash
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/milestones" \
  -d '{
    "title": "Sprint v1",
    "description": "First sprint",
    "state": "open"
  }'
```

### Step 12: Update Configuration

Update `.prodkit/config.yml`:
- Set `github.repo` to the created repository
- Confirm `structure` paths are correct

### Step 13: Commit Configuration Updates

```bash
git add .prodkit/config.yml
git commit -m "chore: update ProdKit config with GitHub repo"
```

### Step 14: Push to GitHub (Optional)

Ask the user if they want to push now:

If yes:
```bash
git branch -M main
git push -u origin main
```

### Step 15: Confirm Completion

Inform the user:
- ✓ Project structure created
- ✓ CI/CD pipeline configured
- ✓ GitHub repository created (if chosen)
- ✓ Branch protection enabled (if chosen)
- ✓ Sprint v1 milestone created
- Next step: Run `/prodkit.plan-sprint` to plan the first sprint

## Important Notes

- Adjust structure based on project type (Python, Node.js, Go, etc.)
- Ensure all paths match the config file
- Don't push sensitive data (check .gitignore)
- Verify GitHub CLI is authenticated before creating repo

## Output

After this command, the user should have:
- Complete project structure with src/, tests/, docs/
- `.gitignore` appropriate for their language
- CI/CD pipeline in `.github/workflows/ci.yml`
- `README.md` with setup instructions
- GitHub repository created (optional)
- Sprint v1 milestone in GitHub
- Ready to start sprint planning
