---
description: Create detailed technical documentation for sprint features
---

You are creating detailed technical documentation for the features selected in the current sprint.

## Context

This is SPRINT-LEVEL technical documentation that provides TACTICAL implementation details for the specific features being built in this sprint.

Unlike product-level architecture (which is strategic), these docs are detailed and actionable, providing everything needed to implement the features.

**CRITICAL:** These docs must be EXTREMELY DETAILED to minimize questions during `/prodkit.dev` when Speckit runs. Include ALL edge cases, validation rules, error handling, and implementation specifics.

## Prerequisites

- `/prodkit.plan-sprint` must have been run (sprint plan exists)

## Instructions

### Step 1: Read Sprint Plan

Read `sprints/v{current_sprint}/sprint-plan.md` to understand:
- Which features are being built
- Sprint goal
- Success criteria

### Step 2: Read Product Architecture

Read `product/tech-docs/` to understand:
- System architecture
- Tech stack
- Design principles
- Security standards
- API conventions
- Testing strategy

These provide the framework; sprint docs provide the details.

### Step 3: Create Sprint Tech Docs Directory

```bash
mkdir -p sprints/v{current_sprint}/tech-docs
```

### Step 4: Create Technical Documentation Files

Create the following files with EXTREME DETAIL:

---

#### a. `data-models.md`

For each data model needed for the sprint features:

```markdown
# Data Models

## Overview

List of all database models/tables needed for this sprint's features.

---

## Model 1: User

### Purpose
[What this model represents and why it's needed]

### Table Name
`users`

### Fields

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, NOT NULL, DEFAULT gen_random_uuid() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| first_name | VARCHAR(100) | NULL | User's first name |
| last_name | VARCHAR(100) | NULL | User's last name |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Account active status |
| is_verified | BOOLEAN | NOT NULL, DEFAULT false | Email verified status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT now() | Record creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT now() | Last update time |
| deleted_at | TIMESTAMP | NULL | Soft delete timestamp |

### Indexes

- `idx_users_email` - Unique index on email (for fast lookup)
- `idx_users_created_at` - Index on created_at (for sorting)

### Validations

**Email:**
- Must match regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- Case-insensitive (store lowercase)
- Required field

**Password:**
- Minimum 8 characters
- Must contain at least 1 uppercase letter
- Must contain at least 1 lowercase letter
- Must contain at least 1 number
- Hash using bcrypt with cost factor 12
- Never store plain text

**Names:**
- Optional fields
- If provided, trim whitespace
- Maximum 100 characters each

### Relationships

- `User` has many `RefreshToken` (one-to-many)
- `User` has one `UserProfile` (one-to-one) - [if applicable]

### Business Rules

- Email must be unique across all users
- Deleted users (soft delete) keep their email reserved
- New users start with is_active=true, is_verified=false
- Password changes must invalidate all refresh tokens

### Migration SQL

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

---

## Model 2: RefreshToken

[Same level of detail for each model...]

---

[Repeat for ALL models needed in this sprint]
```

---

#### b. `api-endpoints.md`

For each API endpoint needed:

```markdown
# API Endpoints

## Overview

All API endpoints for Sprint v{N} features.

Base URL: `/api/v1`

---

## Endpoint 1: User Registration

### Route
`POST /auth/register`

### Description
Creates a new user account.

### Authentication
None required (public endpoint)

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "first_name": "string (optional)",
  "last_name": "string (optional)"
}
```

### Request Body Validation

**email:**
- Required
- Must be valid email format
- Must not already exist in database
- Converted to lowercase before saving

**password:**
- Required
- Minimum 8 characters
- Must contain 1 uppercase, 1 lowercase, 1 number
- Hashed with bcrypt (cost factor 12) before storing

**first_name, last_name:**
- Optional
- Max 100 characters
- Trim whitespace

### Success Response (201 Created)
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "is_verified": false,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Email already exists"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Implementation Notes

1. Hash password with bcrypt before saving
2. Convert email to lowercase
3. Set is_active=true, is_verified=false
4. Do NOT return password_hash in response
5. Log user creation event (for audit trail)
6. Future: Send verification email (Sprint v2)

### Test Cases

**Unit Tests:**
- Test password hashing works correctly
- Test email validation
- Test duplicate email rejection

**Contract Tests:**
- Test request/response format matches spec
- Test all status codes

**Integration Tests:**
- Test user is actually created in database
- Test password can be used to login

---

## Endpoint 2: User Login

### Route
`POST /auth/login`

### Description
Authenticates user and returns access + refresh tokens.

### Authentication
None required (public endpoint)

### Request Body
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

### Request Body Validation

**email:**
- Required
- Must be valid email format

**password:**
- Required
- Not empty

### Success Response (200 OK)
```json
{
  "data": {
    "access_token": "jwt-token-string",
    "refresh_token": "jwt-token-string",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

### Token Specifications

**Access Token:**
- Type: JWT
- Expiry: 15 minutes (900 seconds)
- Payload: { "user_id": "uuid", "email": "string", "type": "access" }
- Signature: HS256 with secret from environment

**Refresh Token:**
- Type: JWT
- Expiry: 7 days
- Payload: { "user_id": "uuid", "type": "refresh" }
- Stored in database (refresh_tokens table)

### Error Responses

**401 Unauthorized - Invalid Credentials:**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

**400 Bad Request:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Email is required"]
    }
  }
}
```

### Implementation Notes

1. Find user by email (case-insensitive)
2. If not found, return 401 (don't reveal which field was wrong)
3. Compare password with bcrypt.compare()
4. If wrong password, return 401
5. Generate access token (15min expiry)
6. Generate refresh token (7 day expiry)
7. Save refresh token to database
8. Return both tokens

### Security Considerations

- Use constant-time comparison for passwords
- Don't reveal whether email exists
- Rate limit this endpoint (max 5 attempts per minute per IP)
- Log failed login attempts

### Test Cases

**Unit Tests:**
- Test JWT generation
- Test password comparison
- Test token expiry times

**Contract Tests:**
- Test request/response format
- Test all status codes

**Integration Tests:**
- Test successful login with valid credentials
- Test failed login with wrong password
- Test failed login with non-existent email
- Test tokens work for authenticated endpoints

---

[Repeat for ALL endpoints in this sprint]
```

---

#### c. `implementation-plan.md`

Step-by-step breakdown:

```markdown
# Implementation Plan

## Overview

Detailed step-by-step plan for implementing Sprint v{N} features.

---

## Phase 1: Foundation (Dependencies First)

### Step 1: Database Setup
- Create migration files for all models
- Run migrations to create tables
- Verify schema in database

**Files to create:**
- `migrations/001_create_users_table.sql`
- `migrations/002_create_refresh_tokens_table.sql`

**Testing:**
- Verify tables exist
- Verify indexes are created
- Verify constraints work

---

### Step 2: Create Data Models
- Implement User model class
- Implement RefreshToken model class
- Add model validations

**Files to create:**
- `src/models/user.py`
- `src/models/refresh_token.py`

**Testing:**
- Unit tests for User model validations
- Unit tests for RefreshToken model

---

## Phase 2: Business Logic

### Step 3: Implement AuthService
- Password hashing utilities
- JWT generation/validation
- User registration logic
- User login logic

**Files to create:**
- `src/services/auth_service.py`
- `src/utils/jwt.py`
- `src/utils/password.py`

**Testing:**
- Unit tests for password hashing
- Unit tests for JWT generation/validation
- Unit tests for registration logic
- Unit tests for login logic

---

### Step 4: Create API Endpoints
- POST /auth/register endpoint
- POST /auth/login endpoint
- POST /auth/refresh endpoint (if needed)

**Files to create:**
- `src/routes/auth.py`
- `src/middleware/validation.py`

**Testing:**
- Contract tests for each endpoint
- Integration tests for registration flow
- Integration tests for login flow

---

## Phase 3: Testing & Refinement

### Step 5: Integration Testing
- Test complete registration → login flow
- Test token refresh flow
- Test error cases

**Files to create:**
- `tests/integration/test_auth_flow.py`

---

### Step 6: Security Hardening
- Add rate limiting
- Add input sanitization
- Add security headers
- Audit logging

**Files to create:**
- `src/middleware/rate_limit.py`
- `src/middleware/security_headers.py`

---

## Dependencies

- Step 2 depends on Step 1 (models need database schema)
- Step 3 depends on Step 2 (services need models)
- Step 4 depends on Step 3 (endpoints need services)
- Step 5 depends on Step 4 (integration tests need endpoints)

---

## Estimated Timeline

- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 2 days

**Total: 7-9 days**

---

## Risks

- bcrypt performance on high load (mitigation: use appropriate cost factor)
- JWT secret management (mitigation: use environment variables)
- Token storage security (mitigation: httpOnly cookies or secure storage)
```

---

#### d. `component-design.md`

Detailed class/module design:

```markdown
# Component Design

## Overview

Detailed design of classes, modules, and their responsibilities for this sprint.

---

## Component 1: AuthService

### Purpose
Handles all authentication-related business logic.

### Location
`src/services/auth_service.py`

### Class Definition

```python
class AuthService:
    """
    Service for handling user authentication operations.
    """

    def __init__(self, user_repository, token_repository):
        """
        Args:
            user_repository: Repository for user database operations
            token_repository: Repository for refresh token operations
        """
        self.user_repo = user_repository
        self.token_repo = token_repository

    def register_user(self, email: str, password: str,
                     first_name: str = None, last_name: str = None) -> User:
        """
        Register a new user.

        Args:
            email: User email (will be lowercased)
            password: Plain text password (will be hashed)
            first_name: Optional first name
            last_name: Optional last name

        Returns:
            Created User object

        Raises:
            ValidationError: If email/password invalid
            DuplicateEmailError: If email already exists
        """
        # Implementation steps:
        # 1. Validate email format
        # 2. Validate password strength
        # 3. Check if email already exists
        # 4. Hash password with bcrypt
        # 5. Create user in database
        # 6. Return user (without password_hash)

    def login(self, email: str, password: str) -> dict:
        """
        Authenticate user and generate tokens.

        Args:
            email: User email
            password: Plain text password

        Returns:
            dict: {
                "access_token": str,
                "refresh_token": str,
                "expires_in": int,
                "user": User
            }

        Raises:
            InvalidCredentialsError: If email/password wrong
        """
        # Implementation steps:
        # 1. Find user by email (case-insensitive)
        # 2. If not found, raise InvalidCredentialsError
        # 3. Compare password with bcrypt
        # 4. If wrong, raise InvalidCredentialsError
        # 5. Generate access token (15min)
        # 6. Generate refresh token (7 days)
        # 7. Save refresh token to database
        # 8. Return tokens + user info

    def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Generate new access token from refresh token.

        Args:
            refresh_token: Valid refresh token

        Returns:
            dict: { "access_token": str, "expires_in": int }

        Raises:
            InvalidTokenError: If refresh token invalid/expired
        """
        # Implementation details...
```

### Dependencies

- `src/repositories/user_repository.py`
- `src/repositories/token_repository.py`
- `src/utils/password.py`
- `src/utils/jwt.py`

### Test Coverage

**Unit Tests:**
- Mock repositories
- Test registration with valid data
- Test registration with duplicate email
- Test registration with invalid password
- Test login with valid credentials
- Test login with wrong password
- Test login with non-existent email
- Test token refresh with valid token
- Test token refresh with expired token

---

## Component 2: PasswordUtils

### Purpose
Password hashing and verification utilities.

### Location
`src/utils/password.py`

### Functions

```python
def hash_password(password: str, cost_factor: int = 12) -> str:
    """
    Hash password using bcrypt.

    Args:
        password: Plain text password
        cost_factor: Bcrypt cost factor (default 12)

    Returns:
        Hashed password string

    Raises:
        ValueError: If password empty or cost_factor invalid
    """
    pass

def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify password against hash.

    Args:
        password: Plain text password
        password_hash: Bcrypt hash

    Returns:
        True if password matches, False otherwise
    """
    pass

def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password meets strength requirements.

    Requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number

    Args:
        password: Password to validate

    Returns:
        (is_valid: bool, errors: list[str])

    Example:
        valid, errors = validate_password_strength("weak")
        # Returns: (False, ["Password must be at least 8 characters", ...])
    """
    pass
```

---

[Repeat for ALL components in this sprint]
```

---

### Step 5: Create Environment Variables Template

Create `sprints/v{current_sprint}/tech-docs/.env.example`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT Secrets
JWT_ACCESS_SECRET=your-access-token-secret-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Application
ENVIRONMENT=development
DEBUG=true

# Security
BCRYPT_COST_FACTOR=12
RATE_LIMIT_PER_MINUTE=60
```

---

### Step 6: Validate Tech Docs Created

**Run validation checks to ensure all documentation was created:**

Display validation in progress:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VALIDATING TECH DOCS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Check 1: Sprint Tech Docs Directory**
```bash
SPRINT_NUM=$(grep "current:" .prodkit/config.yml | sed 's/.*current: //')
TECH_DOCS_DIR="sprints/v${SPRINT_NUM}/tech-docs"

if [ ! -d "$TECH_DOCS_DIR" ]; then
    echo "❌ Validation failed: Tech docs directory not found"
    echo "Expected: $TECH_DOCS_DIR"
    exit 1
fi

echo "✓ Tech docs directory exists"
```

**Check 2: All Required Docs Created**
```bash
REQUIRED_DOCS=(
    "data-models.md"
    "api-endpoints.md"
    "implementation-plan.md"
    "component-design.md"
)

MISSING_DOCS=()

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$TECH_DOCS_DIR/$doc" ]; then
        MISSING_DOCS+=("$doc")
    fi
done

if [ ${#MISSING_DOCS[@]} -gt 0 ]; then
    echo "❌ Validation failed: Missing tech docs: ${MISSING_DOCS[*]}"
    exit 1
fi

echo "✓ All 4 required docs created"
```

**Check 3: Docs Have Content**
```bash
EMPTY_DOCS=()

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -s "$TECH_DOCS_DIR/$doc" ]; then
        EMPTY_DOCS+=("$doc")
    fi
done

if [ ${#EMPTY_DOCS[@]} -gt 0 ]; then
    echo "❌ Validation failed: Empty docs: ${EMPTY_DOCS[*]}"
    echo "All docs must have content"
    exit 1
fi

echo "✓ All docs have content"
```

**Check 4: Sprint Plan Exists (prerequisite)**
```bash
SPRINT_PLAN="sprints/v${SPRINT_NUM}/sprint-plan.md"

if [ ! -f "$SPRINT_PLAN" ]; then
    echo "⚠️  Warning: Sprint plan not found"
    echo "Expected: $SPRINT_PLAN"
    echo "Run /prodkit.plan-sprint first"
else
    echo "✓ Sprint plan exists"
fi
```

**Check 5: Product Architecture Exists (prerequisite)**
```bash
if [ ! -d "product/tech-docs" ]; then
    echo "⚠️  Warning: Product architecture not found"
    echo "Run /prodkit.product-arch first"
else
    echo "✓ Product architecture exists"
fi
```

Display validation complete:
```
✓ All validation checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 7: Confirm Completion

Inform the user:
- ✓ Sprint technical documentation created in `sprints/v{N}/tech-docs/`
- Files created:
  - `data-models.md` - [{X} models defined]
  - `api-endpoints.md` - [{Y} endpoints defined]
  - `implementation-plan.md` - [Step-by-step plan]
  - `component-design.md` - [{Z} components designed]
  - `.env.example` - [Environment variables template]
- Next step: Run `/prodkit.create-issues` to convert these into GitHub Issues

## CRITICAL REMINDERS

1. **BE EXTREMELY DETAILED:** Every field, every validation rule, every error case must be documented
2. **Include ALL edge cases:** What happens if email is null? What if password is empty?
3. **Specify exact error messages:** Don't say "return error", say exactly what the error should be
4. **Include test cases:** For every component, specify what tests are needed
5. **Show examples:** Include JSON examples, code snippets, SQL queries
6. **Think about dependencies:** What order must things be built in?

The more detailed these docs are, the fewer questions Speckit will ask during `/prodkit.dev`.

## Output

After this command, the user should have:
- Complete, detailed technical specs for all sprint features
- Clear implementation plan
- Detailed API contracts
- Database schemas
- Component designs
- Everything needed to create GitHub Issues
