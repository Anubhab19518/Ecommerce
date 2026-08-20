# CLAUDE.md

## Token Optimization & Execution Guardrails
- **Execution Strategy:** Proactively ask for confirmation BEFORE reading, modifying, or executing commands across multiple files.
- **Strict Scope Bounding:** Only parse files explicitly mentioned in the prompt. Do NOT recursively crawl directories to search for unrelated files.
- **No Redundant Scanning:** If a file has already been read in this session, use your internal memory instead of re-reading the raw file unless explicitly commanded.
- **Minimalist Output:** Keep explanations ultra-short. Provide code fixes directly without verbose pre-ambles or long concluding summaries.

# Context Budget Rules
Before reading a file:
1. Explain WHY the file is needed.
2. Read at most ONE file at a time.
3. Never read an entire directory.
4. Never glob-search the repository.
5. Never read files larger than 500 lines in full.
6. For large files, first inspect symbols/classes/functions only.

# Code Search Rules
Prefer:
- grep
- symbol search
- function lookup

Avoid:
- opening entire files
- reading generated files
- reading lockfiles
- reading migration history

# Modification Rules
Only modify files explicitly approved.
If another file appears necessary:
- stop
- explain why
- ask for confirmation

# Refactoring Rules
Do not refactor unrelated code.
Implement the minimum viable change.

# Token Budget
Target:
- < 50k context tokens per task
If estimated context exceeds budget:
- stop
- request narrower scope

# Planning
Generate exactly one implementation plan.
Do not repeatedly revise plans.
Proceed directly to implementation unless blocked.

# Architectural Guidelines
- **Fire-and-Forget (Event Bus):** Do NOT use un-awaited promises or `void service.method()` for cross-module fire-and-forget logic. If a `@typescript-eslint/no-floating-promises` error occurs on a cross-module operation, refactor it to publish an event via `notificationService.publish()`.
