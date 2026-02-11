---
description: Create GitHub Issues from sprint technical documentation
---

You are converting sprint technical documentation into detailed GitHub Issues.

## Context

This command parses the sprint tech docs and creates comprehensive GitHub Issues for each implementation task. Each issue should contain ALL the information needed from the tech docs so that during `/prodkit.dev`, Speckit has complete context.

## Prerequisites

- `/prodkit.sprint-tech` must have been run (tech docs exist)
- GitHub repository must exist
- `gh` CLI must be authenticated

## Instructions

### Step 1: Read Configuration

Read `.prodkit/config.yml` to get:
- Current sprint number
- GitHub repo name
- Label definitions

### Step 2: Get GitHub Credentials

Read `.prodkit/config.yml` to get the GitHub repository information.

Ask the user for their GitHub Personal Access Token (PAT) if not already stored.

The token needs the `repo` scope to create issues.

### Step 3: Read Sprint Tech Docs

Read all tech documentation files from `sprints/v{N}/tech-docs/`:
- `data-models.md`
- `api-endpoints.md`
- `implementation-plan.md`
- `component-design.md`

### Step 4: Parse Implementation Plan

The `implementation-plan.md` provides the structure. Extract:
- All phases
- All steps within each phase
- Dependencies between steps
- Estimated timeline

This gives you the task breakdown.

### Step 5: Create Issues from Implementation Plan

For each step in the implementation plan, create corresponding GitHub Issues.

#### Issue Naming Convention

Format: `[Priority][Type] Description`

Examples:
- `[P0][infrastructure] Create database migrations for User table`
- `[P0][feature] Implement User model with validations`
- `[P0][unit-test] Unit tests for User model`
- `[P0][feature] Implement AuthService.register_user()`
- `[P1][contract-test] Contract tests for POST /auth/register`
- `[P1][integration-test] Integration tests for registration flow`

#### Issue Template

For each issue, use this structure:

```markdown
## Description

[Clear description of what needs to be implemented]

## Context

Sprint: v{N}
Feature: [Feature name from sprint plan]
Phase: [Phase from implementation plan]

## Detailed Requirements

[Copy ALL relevant details from tech docs]

### [If it's a data model task:]

**Model:** {ModelName}

**Fields:**
[Copy field definitions from data-models.md]

**Validations:**
[Copy validation rules]

**Indexes:**
[List indexes]

**Business Rules:**
[List business rules]

**Migration SQL:**
```sql
[Copy migration SQL]
```

### [If it's an API endpoint task:]

**Endpoint:** {METHOD} {PATH}

**Request:**
```json
[Copy request format]
```

**Response:**
```json
[Copy response format]
```

**Validations:**
[Copy validation rules]

**Error Cases:**
[List all error cases with status codes]

**Security:**
[Copy security considerations]

### [If it's a component task:]

**Component:** {ComponentName}

**Responsibilities:**
[What this component does]

**Methods:**
[Copy method signatures and descriptions from component-design.md]

**Dependencies:**
[List dependencies]

## Implementation Notes

[Copy implementation notes from tech docs]

## Testing Requirements

### Unit Tests Required:
- [ ] [Specific test case 1]
- [ ] [Specific test case 2]
- [ ] [Specific test case 3]

### Contract Tests Required: (if applicable)
- [ ] [Test case 1]
- [ ] [Test case 2]

### Integration Tests Required: (if applicable)
- [ ] [Test case 1]
- [ ] [Test case 2]

## Acceptance Criteria

- [ ] Code implemented according to spec
- [ ] All unit tests written and passing
- [ ] [Contract tests written and passing] (if applicable)
- [ ] [Integration tests written and passing] (if applicable)
- [ ] Code follows design principles from product/tech-docs/design-principles.md
- [ ] No security vulnerabilities
- [ ] Test coverage >= 80%
- [ ] Code reviewed

## Dependencies

[List which other issues must be completed first]

## References

- Sprint Plan: `sprints/v{N}/sprint-plan.md`
- Data Models: `sprints/v{N}/tech-docs/data-models.md`
- API Endpoints: `sprints/v{N}/tech-docs/api-endpoints.md`
- Component Design: `sprints/v{N}/tech-docs/component-design.md`
- Product Architecture: `product/tech-docs/architecture.md`
- Speckit Constitution: `.speckit/constitution.md`

---

Related PRD Feature: [{Feature name and link}]
```

### Step 6: Assign Priority and Labels

Based on the implementation plan:

**Priority (P0/P1/P2):**
- P0: Critical, must be done first (foundation, dependencies)
- P1: High priority, core features
- P2: Medium priority, enhancements

**Type Labels:**
- `infrastructure` - Database migrations, setup tasks
- `feature` - Business logic, API endpoints, models
- `unit-test` - Unit testing tasks
- `contract-test` - API contract testing
- `integration-test` - Integration testing
- `refactor` - Code improvements
- `documentation` - Documentation updates

### Step 7: Create Issues via GitHub API

For each issue, use the GitHub REST API:

```bash
# Get the milestone number for "Sprint v{N}"
MILESTONE_RESPONSE=$(curl -s \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/milestones")

MILESTONE_NUMBER=$(echo "$MILESTONE_RESPONSE" | jq -r '.[] | select(.title == "Sprint v{N}") | .number')

# Create the issue
ISSUE_BODY="[Full issue description from template]"

curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/issues" \
  -d "{
    \"title\": \"[P0][infrastructure] Create database migrations for User table\",
    \"body\": \"$ISSUE_BODY\",
    \"labels\": [\"P0\", \"infrastructure\"],
    \"milestone\": $MILESTONE_NUMBER
  }"
```

Create issues in dependency order (foundational issues first).

**Note:** Store each created issue number for later reference.

### Step 8: Track Created Issues

Keep a list of created issues with their numbers and titles.

Example:
```
✓ Created Issue #1: [P0][infrastructure] Set up database migrations
✓ Created Issue #2: [P0][feature] Implement User model
✓ Created Issue #3: [P0][unit-test] Unit tests for User model
✓ Created Issue #4: [P0][feature] Implement RefreshToken model
✓ Created Issue #5: [P0][unit-test] Unit tests for RefreshToken model
✓ Created Issue #6: [P0][feature] Implement PasswordUtils
✓ Created Issue #7: [P0][unit-test] Unit tests for PasswordUtils
✓ Created Issue #8: [P0][feature] Implement JWTUtils
✓ Created Issue #9: [P0][unit-test] Unit tests for JWTUtils
✓ Created Issue #10: [P0][feature] Implement AuthService
✓ Created Issue #11: [P0][unit-test] Unit tests for AuthService
✓ Created Issue #12: [P0][feature] Create POST /auth/register endpoint
✓ Created Issue #13: [P1][contract-test] Contract tests for registration endpoint
✓ Created Issue #14: [P0][feature] Create POST /auth/login endpoint
✓ Created Issue #15: [P1][contract-test] Contract tests for login endpoint
✓ Created Issue #16: [P1][integration-test] Integration tests for auth flow
✓ Created Issue #17: [P1][feature] Add rate limiting middleware
✓ Created Issue #18: [P2][feature] Add security headers middleware
```

### Step 9: Link Dependencies

For issues with dependencies, add comments linking them using GitHub API:

```bash
ISSUE_NUMBER="[issue number]"
COMMENT_BODY="⚠️ **Depends on:** #1, #2"

curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/issues/$ISSUE_NUMBER/comments" \
  -d "{\"body\": \"$COMMENT_BODY\"}"
```

### Step 10: Save Issue Summary

Create `sprints/v{N}/issues-summary.md`:

```markdown
# GitHub Issues for Sprint v{N}

**Created:** {Date}

**Total Issues:** {X}

## Issue Breakdown

### P0 (Critical): {X} issues
- #1: [infrastructure] Set up database migrations
- #2: [feature] Implement User model
- ...

### P1 (High): {Y} issues
- #13: [contract-test] Contract tests for registration
- ...

### P2 (Medium): {Z} issues
- #18: [feature] Add security headers
- ...

## Implementation Order

Based on dependencies:

1. Infrastructure (#1)
2. Models (#2, #4)
3. Model Tests (#3, #5)
4. Utilities (#6, #8)
5. Utility Tests (#7, #9)
6. Services (#10)
7. Service Tests (#11)
8. API Endpoints (#12, #14)
9. Contract Tests (#13, #15)
10. Integration Tests (#16)
11. Middleware (#17, #18)

## GitHub Milestone

All issues assigned to: **Sprint v{N}**

View issues:
```bash
# List all issues in the milestone
curl -s \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/issues?milestone=$MILESTONE_NUMBER&state=all"
```
```

### Step 11: Confirm Completion

Inform the user:
- ✓ Created {X} GitHub Issues
- ✓ All issues assigned to Sprint v{N} milestone
- ✓ Issues labeled with priority and type
- ✓ Dependencies documented
- Summary saved to `sprints/v{N}/issues-summary.md`
- Next step: Run `/prodkit.dev` to start implementing issues

Display the issue summary. Users can view issues on GitHub or via API:
```bash
# View open issues in Sprint v{N}
curl -s \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME/issues?milestone=$MILESTONE_NUMBER&state=open" \
  | jq '.[] | {number, title, labels: [.labels[].name]}'
```

## Important Guidelines

### Issue Quality Checklist

Each issue MUST have:
- [ ] Clear, descriptive title
- [ ] Complete description with context
- [ ] ALL details from tech docs copied in
- [ ] Specific testing requirements
- [ ] Acceptance criteria
- [ ] Dependencies noted
- [ ] References to tech docs
- [ ] Priority label (P0/P1/P2)
- [ ] Type label (feature/test/infrastructure)
- [ ] Assigned to sprint milestone

### Common Issue Patterns

**For Database Migrations:**
- Include complete SQL
- List all tables, indexes, constraints
- Include rollback SQL
- Testing: verify schema exists

**For Models:**
- Include all fields with types
- List all validations
- Include business rules
- Testing: unit tests for validations

**For API Endpoints:**
- Complete request/response examples
- All error cases with codes
- Security considerations
- Testing: contract + integration tests

**For Services:**
- Method signatures
- Input/output specifications
- Error handling
- Testing: unit tests with mocks

**For Tests:**
- List specific test cases
- What to test
- What to mock
- Expected coverage

### Dependencies

Issues should be created in logical order:
1. Infrastructure (migrations, setup)
2. Foundation (models, utilities)
3. Business logic (services)
4. API layer (endpoints)
5. Testing (contract, integration)
6. Enhancements (middleware, features)

## Output

After this command, the user should have:
- {X} GitHub Issues created
- All issues in Sprint v{N} milestone
- Issues properly labeled and prioritized
- `sprints/v{N}/issues-summary.md` with overview
- Ready to start development with `/prodkit.dev`
