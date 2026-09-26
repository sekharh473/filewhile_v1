
# User Workflow & Verification Rules

- **Do NOT check or browse every page when changes are made**:
  - Implement the requested changes directly, cleanly, and accurately in the code.
  - Do NOT launch browser subagents, browser recordings, or manual page inspection scripts to test every page/state after code modifications.
  - Validate code correctness through TypeScript compilation (`npx tsc --noEmit`) or static analysis w 
  - The user will test and verify the behavior on their own screen/device and will let you know if it is working or if any adjustments are needed.


# Execution & Collaboration Rules

- **Strict Confirmation Before Any Edit**:
  - Never make changes to files or code until the user explicitly requests and confirms the proposed solution.
  - Always discuss the problem and align on the approach first.
- **Precision Scope**:
  - Modify only what is asked—nothing more, nothing less.
  - Do NOT touch or alter the UI unless explicitly instructed.

