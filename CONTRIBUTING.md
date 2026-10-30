# Contributing

Thanks for contributing to `bpronin90/tennis-shot-game`. This guide covers the contributor-facing process:
how work is tracked, how changes are scoped and reviewed, and what must be verified
before a change lands.

## Issue And PR Workflow

| Work | Contract | Branch |
| --- | --- | --- |
| Substantive change: behavior, interfaces, data, security, CI, dependencies | GitHub issue with **Goal, Allowed Files, Acceptance Criteria, Verification** | `issue/<n>-<scope>` |
| Doc correction or small maintenance with no behavior change | PR body with `Issue: none` and the same four headings (one line each is fine) | `chore/<scope>` or `docs/<scope>` |

If you are unsure whether work is substantive, treat it as substantive.

- Branch off `main` and open the pull request against `main`. Never commit or
  push to `main` directly, and never force-push a shared branch.
- One issue has one PR. Every non-Dependabot PR body contains exactly one standalone
  line `Issue: #<n>` or `Issue: none`.
- Change only the issue's Allowed Files, plus docs your change makes untrue. If necessary
  work falls outside them, ask for a scope amendment first.
- No adjacent refactors, cleanup, renames, dependency upgrades, or redesigns. Never
  silently change requirements; raise the conflict in the issue instead.
- Stage explicit paths only (no `git add -A`, `git add .`, or `git commit -a`), and keep
  commits focused.
- In the PR, summarize what changed, why, and exactly how it was verified.

## Testing And Verification

- `npm ci`, then `npm test` (deterministic engine tests) and, for build-affecting
  changes, `npm run build`.
- Visual or interactive changes: render the affected screen or game state in a real
  browser. Start `npm run dev`, then run `python3 tests/browser_smoke.py [url] [artifact-dir]`
  or drive it with Playwright. Check desktop and phone widths. Green unit tests do not
  prove visual correctness.
- Pull requests run `.github/workflows/ci.yml`; report local and CI results at the exact head.
- Test failure modes, not only happy paths.
- Report exactly which checks ran and which did not. If you cannot run a check that
  would normally apply, say so in the PR and explain why. Never describe unexecuted
  integration, deployment, or live/native validation as proven.

## Review And Merge

- Substantive changes need an independent review of the exact PR head before merge;
  the author of a head cannot approve it. For issue-free doc or maintenance PRs, review
  is at the owner's discretion.
- Review findings cite `file:line` and a concrete failing input or state, and separate
  blocking defects from optional suggestions. A new commit makes earlier reviews stale.
- An agent may merge a PR only when CI passes on the exact head; for substantive changes,
  an independent reviewer who is not the head's author has posted `VERDICT=APPROVE` on
  that exact head with no unresolved blocking findings; and the PR does not deploy,
  release, migrate data, touch credentials, secrets, or repository settings, or cause
  external side effects. Green CI alone is not permission to merge.
- Only the owner merges Dependabot PRs, merges with `--admin`, or closes issues other
  than through a merged PR's `Closes #n`.
- Only the owner authorizes deploys and releases; production data, migrations, and
  schedules; credentials, secrets, and access; repository settings and branch
  protection; new paid services; and external side effects. Ambiguous
  approval such as "looks good" is not authorization.

## Project Rules

- Keep it a simple, self-contained game. No backend, accounts, analytics, external
  requests, or new infrastructure.
- `src/engine.js` is deterministic (seeded RNG) and independent of React. Never import
  React or the DOM into it. `src/App.jsx` presents state; it does not own game rules.
- Gameplay, scoring, difficulty, or challenge changes need deterministic tests with
  fixed seeds in `src/engine.test.js`, covering the changed rule and its edge cases.
- Visual or interactive changes need browser-rendered evidence of the affected screen
  or game state. Do not commit screenshots unless asked.
- Preserve mouse, touch, and keyboard controls (1/2/3, arrows, Enter/Space), focus
  handling and labels, reduced motion, responsive layout, and play that continues when
  browser storage fails.
