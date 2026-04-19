---
name: architecture
description: "Use when defining system structure, module boundaries, role model strategy, data flow, scalability choices, and deployment architecture. Keywords: architecture, design, system, module, boundary, scalability, maintainability, deployment."
---

# Architecture Skill

## Goal
Make structural decisions that keep the system understandable, scalable, and easier to evolve.

## Use When
- Adding major features that cross multiple modules.
- Changing role/permission strategy.
- Reorganizing app layers or ownership boundaries.
- Preparing technical defense of design decisions.

## Workflow
1. State the problem and non-functional constraints.
2. Define boundaries: UI, domain logic, data, auth.
3. Compare at least two viable approaches.
4. Choose with explicit trade-offs.
5. Plan migration path and compatibility.
6. Document decisions and risks.

## Quality Checklist
- Responsibilities are clearly separated.
- Security model is consistent across layers.
- Future changes do not require broad rewrites.
- Operational concerns are addressed.
- Decision rationale is presentation-ready.

## Output Format
- Context and constraints.
- Options considered.
- Selected architecture and trade-offs.
- Incremental rollout plan.
