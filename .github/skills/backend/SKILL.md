---
name: backend
description: "Use when building or reviewing backend logic, data models, API contracts, validation, auth/authorization, and Supabase/Postgres policies. Keywords: backend, api, database, rls, schema, migration, security, validation."
---

# Backend Skill

## Goal
Design, implement, and validate safe backend behavior that is correct, secure, and maintainable.

## Use When
- Adding or changing schema/tables/relations.
- Writing or updating RLS policies.
- Designing API or server-side behavior.
- Fixing backend data integrity or authorization bugs.

## Workflow
1. Clarify required data flow and access boundaries.
2. Check schema impact: constraints, indexes, and relationships.
3. Define authorization model before implementation.
4. Implement smallest safe change first.
5. Add idempotent SQL migrations where possible.
6. Verify with realistic read/write scenarios.

## Quality Checklist
- Constraints reflect business rules.
- Indexes support common query paths.
- Policies enforce least privilege.
- Errors are actionable and user-safe.
- Changes are backward compatible or documented.

## Output Format
- Summary of backend decisions.
- Files changed and why.
- Migration or policy notes.
- Verification steps run.
