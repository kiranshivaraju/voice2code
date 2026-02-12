---
description: Define product-level technical architecture and Speckit constitution
---

You are creating the product-level technical architecture documentation and Speckit constitution.

## Context

This is a PRODUCT-LEVEL technical document that defines HOW the entire system will be built. These are strategic, architectural decisions that apply across ALL sprints.

This command also creates the Speckit constitution, which provides defaults and guidelines that Speckit will use during development to minimize questions.

## Instructions

### Step 1: Read the PRD

Read `product/prd.md` to understand:
- What features the product will have
- The scale and complexity
- Any mentioned technical constraints

### Step 2: Gather Technical Requirements

Ask the user strategic technical questions:

a. **Tech Stack:**
   - Programming language? (Python, Node.js, Go, etc.)
   - Web framework? (FastAPI, Flask, Express, etc.)
   - Database? (PostgreSQL, MongoDB, MySQL, etc.)
   - Cache/Queue? (Redis, RabbitMQ, etc.)
   - Frontend? (React, Vue, Next.js, or API-only?)

b. **Architecture:**
   - Monolith or microservices?
   - Deployment target? (AWS, GCP, Azure, Docker, K8s, Heroku, etc.)
   - Authentication strategy? (JWT, OAuth, session-based, etc.)

c. **Development Standards:**
   - Code style guide? (PEP 8, ESLint, etc.)
   - Testing philosophy? (TDD, coverage targets, etc.)
   - API conventions? (REST, GraphQL, gRPC, etc.)

### Step 3: Create Product-Level Tech Docs

Create the following files in `product/tech-docs/`:

#### a. `architecture.md`

```markdown
# System Architecture

## Overview
[High-level description of the system architecture]

## Tech Stack

### Backend
- **Language:** [e.g., Python 3.11+]
- **Framework:** [e.g., FastAPI]
- **Database:** [e.g., PostgreSQL 15]
- **Cache:** [e.g., Redis]
- **Queue:** [e.g., Celery + Redis]

### Frontend (if applicable)
- **Framework:** [e.g., React + TypeScript]
- **Build Tool:** [e.g., Vite]

### Infrastructure
- **Hosting:** [e.g., AWS]
- **Container:** [e.g., Docker]
- **Orchestration:** [e.g., Kubernetes / ECS]
- **CI/CD:** [e.g., GitHub Actions]

## Architecture Diagram

[ASCII or description of system components]

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│  API Server │─────▶│  Database   │
└──────┬──────┘      └─────────────┘
       │
       ▼
┌─────────────┐
│    Cache    │
└─────────────┘
```

## Component Responsibilities

### API Server
[What it does]

### Database
[Schema strategy, migrations, etc.]

### Cache Layer
[What gets cached, invalidation strategy]

## Design Decisions

### Why [Database Choice]?
[Reasoning]

### Why [Framework Choice]?
[Reasoning]

## Scalability Considerations
[How the system will scale]

## Security Architecture
[High-level security approach]
```

#### b. `design-principles.md`

```markdown
# Design Principles & Coding Standards

## Code Organization

[Folder structure, module organization]

## Coding Standards

### Python (or your language)
- Follow PEP 8
- Use type hints
- Maximum line length: 100 characters
- Docstrings for all public functions

### Naming Conventions
- Functions: snake_case
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- Private methods: _leading_underscore

## Error Handling

- Use exceptions for exceptional cases
- Always log errors with context
- Return proper HTTP status codes

## Code Review Standards

- All code requires tests
- No commits directly to main
- All changes via Pull Requests
- At least 1 approval required

## DRY Principle

CRITICAL: Avoid duplication at all costs. DRY (Don't Repeat Yourself) is fundamental.
- Extract common logic into reusable functions
- Use inheritance/composition appropriately
- Share constants and configurations
```

#### c. `security.md`

```markdown
# Security Standards

## Authentication

**Strategy:** [e.g., JWT-based authentication]

- Access tokens: JWT, 15 minute expiry
- Refresh tokens: JWT, 7 day expiry
- Token storage: httpOnly cookies (web) or secure storage (mobile)
- Password hashing: bcrypt with cost factor 12

## Authorization

**Model:** [e.g., Role-Based Access Control (RBAC)]

- Roles: admin, user, guest
- Permissions checked on every endpoint
- Principle of least privilege

## Data Protection

- All passwords must be hashed (never store plain text)
- Sensitive data encrypted at rest
- HTTPS required for all connections
- API keys stored in environment variables (never in code)

## Input Validation

- Validate all user inputs
- Sanitize data before database queries (prevent SQL injection)
- Rate limiting on all endpoints
- CSRF protection for state-changing operations

## Security Headers

- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

## Dependency Management

- Regular security audits of dependencies
- Automated vulnerability scanning
```

#### d. `data-architecture.md`

```markdown
# Data Architecture

## Database Choice

**Primary Database:** [e.g., PostgreSQL]

**Reasoning:** [Why this choice]

## Data Modeling Principles

- Normalize to 3NF unless performance requires denormalization
- Use UUIDs for primary keys
- Always include created_at and updated_at timestamps
- Soft deletes (deleted_at) instead of hard deletes for user data

## Core Entities (High-Level)

### User
- Manages user accounts and authentication

### [Entity 2]
- [Purpose]

### [Entity 3]
- [Purpose]

[Note: Detailed schemas will be in sprint-level tech docs]

## Migrations

- Use [migration tool, e.g., Alembic]
- Never modify existing migrations
- All schema changes via migrations
- Migrations must be reversible

## Backup & Recovery

- Daily automated backups
- 30-day retention
- Test restore procedure monthly
```

#### e. `api-strategy.md`

```markdown
# API Design Strategy

## API Style

**Style:** REST

## Versioning

- Version in URL: `/api/v1/`
- Maintain backward compatibility within major versions
- Deprecation notices 3 months before removal

## Endpoint Conventions

- Resource-based URLs (nouns, not verbs)
- Use HTTP methods correctly:
  - GET: Read
  - POST: Create
  - PUT/PATCH: Update
  - DELETE: Delete

## Request/Response Format

**Content-Type:** `application/json`

### Success Response
```json
{
  "data": { ... }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

## HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (not authorized)
- 404: Not Found
- 500: Internal Server Error

## Pagination

```
GET /api/v1/users?page=1&limit=20
```

Response includes metadata:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## Authentication

- Bearer token in Authorization header
- `Authorization: Bearer <token>`
```

#### f. `testing-strategy.md`

```markdown
# Testing Strategy

## Testing Philosophy

- **Test-Driven Development (TDD):** Write tests BEFORE implementation
- **Coverage Target:** 80% minimum
- **Testing Pyramid:** More unit tests, fewer integration tests, minimal E2E tests

## Test Types

### Unit Tests
- Test individual functions/classes in isolation
- Mock external dependencies
- Fast execution (<1s for entire suite)
- Framework: [pytest / jest / etc.]

### Contract Tests
- Test API contracts (request/response formats)
- Ensure API endpoints match specifications
- Validate input/output schemas

### Integration Tests
- Test interactions between components
- Use test database
- Test actual database queries, API calls, etc.

### E2E Tests (Future)
- Test complete user workflows
- Browser automation (Playwright, Selenium)
- Run in CI before deployment

## Test Organization

```
tests/
├── unit/
│   ├── test_models.py
│   ├── test_services.py
│   └── test_utils.py
├── contract/
│   └── test_api_endpoints.py
└── integration/
    └── test_workflows.py
```

## Testing Standards

- All new code must have tests
- Tests must pass before PR approval
- No mocking in integration tests
- Use factories/fixtures for test data
- Tests must be deterministic (no flaky tests)

## CI/CD Testing

- Run all tests on every PR
- Block merge if tests fail
- Run security scans
- Check code coverage
```

### Step 4: Create Speckit Constitution

Create `.speckit/constitution.md` with defaults to minimize Speckit questions:

```markdown
# Speckit Constitution

This document provides guidelines and defaults for AI-assisted development using Speckit.

## Project Context

[Brief description from PRD]

## Technical Stack

[Copy from architecture.md]

## Coding Standards

[Copy key points from design-principles.md]

## Authentication Defaults

- Use JWT with 15min access tokens
- Use bcrypt for password hashing (cost factor 12)
- Password requirements: Min 8 characters, 1 uppercase, 1 lowercase, 1 number
- Social login: Defer unless explicitly specified in requirements

## API Defaults

- Always use REST conventions (from api-strategy.md)
- Always return JSON
- Error format: { "error": { "code": string, "message": string } }
- Always validate inputs
- Use standard HTTP status codes

## Database Defaults

- Use UUIDs for primary keys
- Include created_at and updated_at timestamps
- Use soft deletes (deleted_at) for user data
- Follow 3NF normalization

## Testing Defaults

- ALWAYS write tests BEFORE implementation (TDD)
- Unit test coverage: 80% minimum
- Mock external dependencies in unit tests
- Use actual database in integration tests
- Framework: [pytest/jest/etc.]

## Security Defaults

- Never store passwords in plain text
- Always hash with bcrypt
- Validate all inputs
- Sanitize SQL queries (use parameterized queries)
- Store secrets in environment variables

## Decision-Making Guidelines

When faced with multiple options:

1. **Choose simplicity over complexity**
2. **Choose security over convenience**
3. **Follow existing patterns in the codebase**
4. **Don't add features not in the specification**
5. **When truly uncertain, ASK the user**

## Features to Avoid (unless explicitly requested)

- Do NOT add social login unless specified
- Do NOT add email verification unless specified
- Do NOT add advanced features not in requirements
- Do NOT introduce new dependencies without justification

## What to Always Include

- Input validation
- Error handling
- Logging
- Type hints (Python) / Types (TypeScript)
- Docstrings / Comments for complex logic
- Tests (unit + integration)
```

### Step 5: Update Configuration

Update `.prodkit/config.yml`:
- Set `project.type` to the chosen language
- Set `testing.framework` to the chosen test framework

### Step 6: Validate Documentation Created

**Run validation checks to ensure all documentation was created:**

Display validation in progress:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VALIDATING DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Check 1: Product Tech Docs Directory**
```bash
if [ ! -d "product/tech-docs" ]; then
    echo "❌ Validation failed: product/tech-docs/ directory not found"
    exit 1
fi

echo "✓ Product tech docs directory exists"
```

**Check 2: All 6 Tech Docs Created**
```bash
REQUIRED_DOCS=(
    "architecture.md"
    "design-principles.md"
    "security.md"
    "data-architecture.md"
    "api-strategy.md"
    "testing-strategy.md"
)

MISSING_DOCS=()

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "product/tech-docs/$doc" ]; then
        MISSING_DOCS+=("$doc")
    fi
done

if [ ${#MISSING_DOCS[@]} -gt 0 ]; then
    echo "❌ Validation failed: Missing tech docs: ${MISSING_DOCS[*]}"
    exit 1
fi

echo "✓ All 6 tech docs created"
```

**Check 3: Docs Have Content (not empty)**
```bash
EMPTY_DOCS=()

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -s "product/tech-docs/$doc" ]; then
        EMPTY_DOCS+=("$doc")
    fi
done

if [ ${#EMPTY_DOCS[@]} -gt 0 ]; then
    echo "⚠️  Warning: Empty docs: ${EMPTY_DOCS[*]}"
else
    echo "✓ All docs have content"
fi
```

**Check 4: Speckit Constitution Created**
```bash
if [ ! -f ".speckit/constitution.md" ]; then
    echo "❌ Validation failed: Speckit constitution not found"
    echo "Expected: .speckit/constitution.md"
    exit 1
fi

if [ ! -s ".speckit/constitution.md" ]; then
    echo "⚠️  Warning: Speckit constitution is empty"
else
    echo "✓ Speckit constitution created"
fi
```

**Check 5: PRD Exists (prerequisite)**
```bash
if [ ! -f "product/prd.md" ] && [ ! -f "product/prodkit.prd.md" ]; then
    echo "⚠️  Warning: PRD not found"
    echo "Make sure /prodkit.prd was run first"
else
    echo "✓ PRD exists"
fi
```

**Check 6: Config Updated**
```bash
if [ ! -f ".prodkit/config.yml" ]; then
    echo "❌ Validation failed: Config file not found"
    exit 1
fi

echo "✓ Config file exists"
```

Display validation complete:
```
✓ All validation checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 7: Confirm Completion

Inform the user:
- Product architecture created in `product/tech-docs/`
- Speckit constitution created at `.speckit/constitution.md`
- Configuration updated
- Next step: Run `/prodkit.init-repo` to initialize the repository

## Important Notes

- These are STRATEGIC decisions that apply to the entire product
- Sprint-level tech docs will be more TACTICAL and detailed
- The Speckit constitution should answer 90% of common questions
- Focus on principles and standards, not specific implementations
- Keep architecture flexible enough for future changes

## Output

After this command, the user should have:
- `product/tech-docs/` with 6 documents
- `.speckit/constitution.md`
- Updated `.prodkit/config.yml`
- Clear technical foundation for the product
