---
description: Generate sprint retrospective and review documentation
---

You are generating a comprehensive sprint review and retrospective.

## Context

This command creates documentation that reviews everything accomplished in the sprint, providing a walkthrough of the code, metrics, and learnings.

## Prerequisites

- Sprint must have completed issues
- Code must have been written

## Instructions

### Step 1: Read Configuration

Read `.prodkit/config.yml` to get:
- Current sprint number
- GitHub repo name

### Step 2: Gather Sprint Data

Collect information from multiple sources:

#### a. Read Sprint Plan

Read `sprints/v{N}/sprint-plan.md` to understand:
- Original sprint goal
- Features that were planned
- Success criteria

#### b. Query Closed Issues

Get all closed issues for this sprint:

```bash
gh issue list \
  --milestone "Sprint v{N}" \
  --state closed \
  --json number,title,closedAt,labels \
  --limit 100
```

#### c. Query Merged PRs

Get all merged PRs for this sprint:

```bash
gh pr list \
  --search "milestone:\"Sprint v{N}\" is:merged" \
  --json number,title,mergedAt,additions,deletions \
  --limit 100
```

#### d. Get Code Statistics

Analyze the codebase:

```bash
# Count lines of code added
git log --since="sprint-start-date" --until="sprint-end-date" --numstat --pretty="%H" | \
  awk 'NF==3 {plus+=$1; minus+=$2} END {printf("+%d -%d\n", plus, minus)}'

# Count commits
git log --since="sprint-start-date" --until="sprint-end-date" --oneline | wc -l

# Count files changed
git log --since="sprint-start-date" --until="sprint-end-date" --name-only --pretty=format: | \
  sort -u | grep -v '^$' | wc -l
```

#### e. Get Test Coverage

Run tests with coverage:

```bash
pytest --cov=src --cov-report=json
# Or for other languages: npm run test:coverage, etc.
```

Read the coverage report to get percentages.

### Step 3: Analyze Code

Read the actual code that was written to provide a meaningful walkthrough.

Look at:
- New files in `src/`
- New tests in `tests/`
- Key components and their purposes

### Step 4: Create Sprint Review Document

Create `sprints/v{N}/sprint-review.md`:

```markdown
# Sprint v{N} Review

**Sprint Period:** {Start Date} - {End Date}

**Sprint Goal:** {Original goal from sprint plan}

**Status:** ✅ Completed / ⚠️ Partially Completed / ❌ Not Completed

---

## Executive Summary

{2-3 paragraph summary of what was accomplished}

---

## Metrics

### Issues

- **Total Planned:** {X}
- **Completed:** {Y}
- **Completion Rate:** {Y/X * 100}%

Breakdown by priority:
- P0: {completed}/{total}
- P1: {completed}/{total}
- P2: {completed}/{total}

### Pull Requests

- **Total PRs:** {X}
- **Merged:** {Y}
- **Lines Added:** +{X}
- **Lines Removed:** -{Y}
- **Net Change:** {X-Y}
- **Files Changed:** {Z}
- **Commits:** {N}

### Test Coverage

- **Overall Coverage:** {X}%
- **Unit Tests:** {Y} tests
- **Contract Tests:** {Z} tests
- **Integration Tests:** {W} tests

---

## Features Completed

### Feature 1: {Name}

**Status:** ✅ Completed

**Issues:**
- #1: {Issue title}
- #2: {Issue title}

**PRs:**
- #3: {PR title}
- #4: {PR title}

**What Was Built:**

{Detailed description of what was implemented}

**Key Components:**

- `src/models/user.py` - User data model with validations
- `src/services/auth_service.py` - Authentication business logic
- `src/routes/auth.py` - Authentication API endpoints

**Testing:**
- {X} unit tests covering {Y}% of code
- {Z} contract tests for API endpoints
- {W} integration tests for end-to-end flows

**Success Criteria:**
- [x] {Criterion 1 from sprint plan}
- [x] {Criterion 2}
- [x] {Criterion 3}

---

### Feature 2: {Name}

[Same structure]

---

## Code Walkthrough

This section provides a detailed walkthrough of the major components built in this sprint.

### Component 1: User Model (`src/models/user.py`)

**Purpose:** Represents user accounts in the system

**Key Fields:**
- `id` (UUID): Unique identifier
- `email` (String): User email, unique and validated
- `password_hash` (String): Bcrypt-hashed password
- `created_at`, `updated_at`: Timestamps

**Validations:**
- Email must match valid format
- Email is unique across all users
- Password must be hashed before storage (never plain text)

**Relationships:**
- Has many RefreshTokens (for authentication)

**Business Logic:**
- New users start as active but unverified
- Soft deletes preserve email for data integrity
- Password changes invalidate all tokens

**Testing:** {X} unit tests covering validation logic, password hashing, and edge cases

---

### Component 2: AuthService (`src/services/auth_service.py`)

**Purpose:** Handles all authentication operations

**Key Methods:**

#### `register_user(email, password, ...)`
- Validates email format and uniqueness
- Validates password strength (min 8 chars, 1 upper, 1 lower, 1 number)
- Hashes password with bcrypt (cost factor 12)
- Creates user in database
- Returns user object (without password hash)

#### `login(email, password)`
- Finds user by email (case-insensitive)
- Verifies password with bcrypt
- Generates JWT access token (15min expiry)
- Generates JWT refresh token (7 day expiry)
- Stores refresh token in database
- Returns tokens + user info

#### `refresh_access_token(refresh_token)`
- Validates refresh token
- Checks if token exists in database
- Generates new access token
- Returns new access token

**Security Considerations:**
- Constant-time password comparison
- Doesn't reveal if email exists (generic error messages)
- Tokens stored securely with expiry

**Testing:** {X} unit tests with mocked repositories, covering all methods and error cases

---

### Component 3: Authentication API (`src/routes/auth.py`)

**Purpose:** Exposes authentication functionality via REST API

**Endpoints:**

#### `POST /api/v1/auth/register`
- Creates new user account
- Returns 201 Created on success
- Returns 400 for validation errors
- Calls AuthService.register_user()

#### `POST /api/v1/auth/login`
- Authenticates user
- Returns access + refresh tokens
- Returns 401 for invalid credentials
- Returns 400 for validation errors
- Calls AuthService.login()

**Request/Response Format:**
- All endpoints accept/return JSON
- Errors follow standard format: `{ "error": { "code": str, "message": str } }`
- Success responses wrap data: `{ "data": { ... } }`

**Testing:**
- Contract tests validate request/response schemas
- Integration tests verify end-to-end flows

---

[Continue for all major components]

---

## Test Summary

### Unit Tests ({X} tests)

**Models:**
- `tests/unit/test_user.py` - User model validations
- `tests/unit/test_refresh_token.py` - RefreshToken model

**Services:**
- `tests/unit/test_auth_service.py` - Authentication logic
- `tests/unit/test_password_utils.py` - Password hashing utilities
- `tests/unit/test_jwt_utils.py` - JWT generation/validation

**Coverage:** {X}% overall

### Contract Tests ({Y} tests)

**API Endpoints:**
- `tests/contract/test_auth_endpoints.py` - Auth API contract validation

**What's Tested:**
- Request/response format matches specification
- All status codes (200, 201, 400, 401, 500)
- Error response format
- Input validation

### Integration Tests ({Z} tests)

**User Flows:**
- `tests/integration/test_auth_flow.py` - Complete registration and login flow

**What's Tested:**
- Registration → Login → Token Refresh (end-to-end)
- Database persistence
- Token validation
- Error handling in realistic scenarios

---

## Technical Decisions Made

### Decision 1: JWT vs Session-Based Auth

**Decision:** Use JWT with short-lived access tokens and long-lived refresh tokens

**Reasoning:**
- Stateless authentication (no server-side session storage)
- Scalable across multiple servers
- Short access token expiry (15min) limits damage from token theft
- Refresh tokens in database allow revocation

**Trade-offs:**
- Slightly more complex implementation
- Requires database storage for refresh tokens
- Cannot invalidate access tokens before expiry

---

### Decision 2: Bcrypt Cost Factor 12

**Decision:** Use bcrypt with cost factor 12 for password hashing

**Reasoning:**
- Industry standard for password security
- Cost factor 12 balances security and performance
- ~300ms hash time is acceptable for auth operations
- Future-proof (can increase cost factor as hardware improves)

---

[Document other significant technical decisions]

---

## Challenges & Solutions

### Challenge 1: {Description}

**Problem:** {What went wrong or was difficult}

**Solution:** {How it was resolved}

**Learning:** {What was learned}

---

### Challenge 2: {Description}

[Same structure]

---

## What Went Well ✅

- {Thing 1}
- {Thing 2}
- {Thing 3}

## What Could Be Improved ⚠️

- {Thing 1}
- {Thing 2}
- {Thing 3}

## Blockers Encountered 🚧

- {Blocker 1 and how it was resolved}
- {Blocker 2 and how it was resolved}

---

## Sprint Goal Assessment

**Original Goal:** {Goal from sprint plan}

**Assessment:**

{Was the goal achieved? To what extent? What was the outcome?}

---

## Incomplete Items

### Issues Not Completed

{If any issues were not completed, list them here}

- #X: {Title} - Reason: {Why it wasn't completed}

### Technical Debt Created

{Any shortcuts taken or tech debt introduced}

- {Item 1}
- {Item 2}

---

## Next Sprint Recommendations

Based on this sprint's learnings:

1. {Recommendation 1}
2. {Recommendation 2}
3. {Recommendation 3}

### Features to Prioritize

- {Feature from backlog}
- {Feature from backlog}

### Technical Improvements

- {Tech improvement needed}
- {Tech improvement needed}

---

## Closed Issues

{Complete list of all closed issues}

- #1: [{Labels}] {Title} - Closed on {Date}
- #2: [{Labels}] {Title} - Closed on {Date}
...

---

## Merged Pull Requests

{Complete list of all merged PRs}

- #1: {Title} - Merged on {Date} (+{additions} -{deletions})
- #2: {Title} - Merged on {Date} (+{additions} -{deletions})
...

---

## Summary

{Final 1-2 paragraph summary of the sprint}

**Sprint v{N} is complete.** Ready to move to Sprint v{N+1}.

---

Generated with ProdKit on {Date}
```

### Step 5: Generate Metrics Visualization (Optional)

If helpful, create a simple ASCII chart of progress:

```markdown
## Progress Chart

Issues Completion:
P0: ████████████████████ 100% (8/8)
P1: ████████████░░░░░░░░ 66% (4/6)
P2: ████░░░░░░░░░░░░░░░░ 25% (1/4)

Overall: ██████████████░░░░░░ 72% (13/18)
```

### Step 6: Update Sprint Status

In `sprints/v{N}/sprint-plan.md`, add a status marker at the top:

```markdown
**STATUS: ✅ COMPLETED** - Reviewed on {Date}
```

### Step 7: Suggest Next Steps

Based on the sprint review, suggest to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SPRINT v{N} COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Sprint review generated at sprints/v{N}/sprint-review.md

Summary:
- {X}/{Y} issues completed ({Z}%)
- {A} PRs merged
- {B}% test coverage
- {C} features delivered

Next steps:
1. Review the sprint-review.md document
2. Run /prodkit.plan-sprint to start Sprint v{N+1}
3. Or take a break and celebrate! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Notes

### What Makes a Good Review

- **Comprehensive:** Cover all aspects of the sprint
- **Honest:** Include what went well AND what didn't
- **Actionable:** Provide specific recommendations for next sprint
- **Educational:** Explain the code so it can be understood later
- **Metrics-driven:** Use actual numbers and data

### Code Walkthrough Quality

The code walkthrough should:
- Explain WHAT each component does
- Explain WHY it was built that way
- Explain HOW it works (high-level, not line-by-line)
- Note any important design decisions
- Mention testing coverage

### Retrospective Elements

Include:
- ✅ What went well
- ⚠️ What could be improved
- 🚧 Blockers encountered
- 💡 Learnings and insights
- 🔮 Recommendations for future

## Output

After this command, the user should have:
- `sprints/v{N}/sprint-review.md` - Complete sprint review
- Understanding of what was accomplished
- Metrics and statistics
- Code walkthrough for future reference
- Recommendations for next sprint
- Closure on Sprint v{N}, ready to move to v{N+1}
