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

Read `.prodkit/config.yml` to get:
- GitHub username: `github.username`
- GitHub repository: `github.repo` (format: username/repo-name)

Read GitHub Personal Access Token from `.prodkit/.github-token`:

```bash
if [ -f ".prodkit/.github-token" ]; then
    GITHUB_TOKEN=$(cat .prodkit/.github-token | tr -d '[:space:]')
else
    echo "❌ Error: GitHub token not found"
    echo ""
    echo "Please run /prodkit.init-repo first to set up your GitHub token."
    echo "Or manually create .prodkit/.github-token with your GitHub PAT."
    exit 1
fi
```

Extract username and repo name from config:

```bash
# Parse from github.repo (format: username/repo-name)
GITHUB_USERNAME=$(echo "$REPO" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO" | cut -d'/' -f2)
```

The token needs the `repo` scope to create issues. If the command fails with authentication errors, the user may need to regenerate their token with proper scopes.

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

### Step 7: Generate Issue Descriptions and Save Preview

Before creating issues in GitHub, generate all issue descriptions and save them to a preview file for user review.

Create `sprints/v{N}/issues-preview.md` with all the issue details:

```markdown
# GitHub Issues Preview - Sprint v{N}

**Generated:** {Date}
**Total Issues:** {X}

---

## Issue 1: [P0][infrastructure] Create database migrations for User table

**Labels:** P0, infrastructure
**Milestone:** Sprint v{N}

### Description

[Full issue description]

### Context

Sprint: v{N}
Feature: [Feature name]
Phase: [Phase name]

### Detailed Requirements

[All requirements copied from tech docs]

### Testing Requirements

[All test requirements]

### Acceptance Criteria

[All criteria]

### Dependencies

[Any dependencies]

---

## Issue 2: [P0][feature] Implement User model

[Same structure as above]

---

[... Continue for all issues]
```

Display a summary to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ISSUES PREVIEW - SPRINT v{N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated {X} issues from technical documentation:

P0 (Critical): {X} issues
  1. [infrastructure] Create database migrations for User table
  2. [feature] Implement User model
  3. [unit-test] Unit tests for User model
  ...

P1 (High): {Y} issues
  13. [contract-test] Contract tests for registration endpoint
  ...

P2 (Medium): {Z} issues
  18. [feature] Add security headers middleware
  ...

Full details saved to: sprints/v{N}/issues-preview.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 8: Ask User for Confirmation

Use the AskUserQuestion tool to ask the user to review and confirm:

```
IMPORTANT: Please review the issues before creation.

Open: sprints/v{N}/issues-preview.md

Review all {X} issues to ensure:
- Issue descriptions are complete and accurate
- All technical details are included
- Priorities are correct
- Dependencies are properly noted

Once reviewed, confirm below to create these issues in GitHub.
```

**Question:**
- "Ready to create {X} GitHub issues?"
- Options:
  - "Yes, create all issues" - Proceed to Step 9
  - "No, I need to make changes" - Stop and inform user to edit the preview file or tech docs

If user selects "No":
```
To make changes:
1. Edit sprints/v{N}/issues-preview.md directly, OR
2. Update the tech docs in sprints/v{N}/tech-docs/ and run /prodkit.create-issues again

When ready, run /prodkit.create-issues again.
```

Exit the command.

If user selects "Yes", proceed to Step 9.

### Step 9: Create Issues via GitHub API

**ONLY execute this step if user confirmed in Step 8.**

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

### Step 10: Track Created Issues

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

### Step 11: Link Dependencies

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

### Step 12: Save Issue Summary

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

### Step 13: Validate Issues Created

**Run validation checks to ensure issues were created successfully:**

Display validation in progress:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VALIDATING ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Check 1: Preview File Created**
```bash
SPRINT_NUM=$(grep "current:" .prodkit/config.yml | sed 's/.*current: //')
PREVIEW_FILE="sprints/v${SPRINT_NUM}/issues-preview.md"

if [ ! -f "$PREVIEW_FILE" ]; then
    echo "❌ Validation failed: Issues preview file not found"
    echo "Expected: $PREVIEW_FILE"
    exit 1
fi

echo "✓ Issues preview file created"
```

**Check 2: Verify GitHub Token and Credentials**
```bash
if [ ! -f ".prodkit/.github-token" ]; then
    echo "❌ Validation failed: GitHub token not found"
    echo "Run /prodkit.init-repo first"
    exit 1
fi

GITHUB_TOKEN=$(cat .prodkit/.github-token | tr -d '[:space:]')
echo "✓ GitHub token loaded"
```

**Check 3: User Confirmed (if issues should be created)**
```bash
# This check only runs if user confirmed creation
# The confirmation happens in Step 8, so by this point either:
# - User confirmed and we're creating issues
# - User declined and command exited
# So if we reach here, user must have confirmed
echo "✓ User reviewed and confirmed"
```

**Check 4: Count Issues in GitHub**
```bash
# Get repo from config
REPO=$(grep "repo:" .prodkit/config.yml | sed 's/.*repo: "\(.*\)".*/\1/' | sed 's/.*repo: //' | tr -d '"' | tr -d ' ')

if [ -z "$REPO" ]; then
    echo "⚠️  Warning: GitHub repo not set in config"
else
    # Get milestone number
    MILESTONE_RESPONSE=$(curl -s \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer $GITHUB_TOKEN" \
      "https://api.github.com/repos/$REPO/milestones")

    MILESTONE_NUMBER=$(echo "$MILESTONE_RESPONSE" | jq -r ".[] | select(.title == \"Sprint v${SPRINT_NUM}\") | .number")

    if [ -z "$MILESTONE_NUMBER" ] || [ "$MILESTONE_NUMBER" == "null" ]; then
        echo "⚠️  Warning: Sprint v${SPRINT_NUM} milestone not found"
    else
        # Count issues in milestone
        ISSUES_RESPONSE=$(curl -s \
          -H "Accept: application/vnd.github+json" \
          -H "Authorization: Bearer $GITHUB_TOKEN" \
          "https://api.github.com/repos/$REPO/issues?milestone=$MILESTONE_NUMBER&state=all&per_page=100")

        ISSUE_COUNT=$(echo "$ISSUES_RESPONSE" | jq '. | length')

        if [ "$ISSUE_COUNT" -eq 0 ]; then
            echo "⚠️  Warning: No issues found in GitHub milestone"
            echo "Issues may not have been created yet"
        else
            echo "✓ Found $ISSUE_COUNT issues in Sprint v${SPRINT_NUM} milestone"
        fi
    fi
fi
```

**Check 5: Summary File Created**
```bash
SUMMARY_FILE="sprints/v${SPRINT_NUM}/issues-summary.md"

if [ ! -f "$SUMMARY_FILE" ]; then
    echo "⚠️  Warning: Issues summary file not created"
    echo "Expected: $SUMMARY_FILE"
else
    echo "✓ Issues summary file created"
fi
```

**Check 6: Tech Docs Exist (prerequisite)**
```bash
TECH_DOCS_DIR="sprints/v${SPRINT_NUM}/tech-docs"

if [ ! -d "$TECH_DOCS_DIR" ]; then
    echo "❌ Validation failed: Tech docs directory not found"
    echo "Expected: $TECH_DOCS_DIR"
    echo "Run /prodkit.sprint-tech first"
    exit 1
fi

MISSING_DOCS=()
if [ ! -f "$TECH_DOCS_DIR/data-models.md" ]; then MISSING_DOCS+=("data-models.md"); fi
if [ ! -f "$TECH_DOCS_DIR/api-endpoints.md" ]; then MISSING_DOCS+=("api-endpoints.md"); fi
if [ ! -f "$TECH_DOCS_DIR/implementation-plan.md" ]; then MISSING_DOCS+=("implementation-plan.md"); fi

if [ ${#MISSING_DOCS[@]} -gt 0 ]; then
    echo "❌ Validation failed: Missing tech docs: ${MISSING_DOCS[*]}"
    exit 1
fi

echo "✓ Tech docs verified"
```

Display validation complete:
```
✓ All validation checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 14: Confirm Completion

Inform the user:
- ✓ Preview generated: `sprints/v{N}/issues-preview.md`
- ✓ User reviewed and approved
- ✓ Created {X} GitHub Issues
- ✓ All issues assigned to Sprint v{N} milestone
- ✓ Issues labeled with priority and type
- ✓ Dependencies documented
- Summary saved to `sprints/v{N}/issues-summary.md`
- Next step: Run `/prodkit.dev` to start implementing issues

Display the issue summary and GitHub links:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ GITHUB ISSUES CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created {X} issues for Sprint v{N}

View on GitHub:
https://github.com/$GITHUB_USERNAME/$REPO_NAME/issues?milestone=$MILESTONE_NUMBER

Next step: /prodkit.dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Users can also view issues via API:
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
- `sprints/v{N}/issues-preview.md` - Preview file with all issue details (for review)
- {X} GitHub Issues created in the repository (after user confirmation)
- All issues assigned to Sprint v{N} milestone
- Issues properly labeled and prioritized
- Dependencies documented via comments
- `sprints/v{N}/issues-summary.md` - Overview of all created issues
- Ready to start development with `/prodkit.dev`

## Workflow Summary

1. Parse tech docs → Generate issue descriptions
2. Save preview file → Show summary to user
3. User reviews preview file
4. User confirms → Create issues in GitHub
5. Link dependencies → Save summary
6. Ready for `/prodkit.dev`
