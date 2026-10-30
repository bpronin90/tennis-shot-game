# AGENTS.md

Authoritative instructions for every agent working in `bpronin90/tennis-shot-game`: Claude, Codex,
Gemini, Agent Lab, or any other orchestrator. `CLAUDE.md` and `CODEX.md` only add role
notes. If they conflict with this file, this file wins. If this file is silent on a
risky action, ask the owner.

Use the shortest safe path. The owner's request controls scope.

## Work types

| Work | Contract | Branch |
| --- | --- | --- |
| Substantive change: behavior, interfaces, data, security, CI, dependencies | GitHub issue with **Goal, Allowed Files, Acceptance Criteria, Verification** | `issue/<n>-<scope>` |
| Governance, doc correction, small maintenance with no behavior change | PR body with `Issue: none` and the same four headings, one line each is fine | `chore/<scope>` or `docs/<scope>` |
| Diagnosis or read-only analysis | The request | None. Do not change code or GitHub state. |

If you are unsure whether work is substantive, treat it as substantive.

An implementation request authorizes a branch, edits within Allowed Files, targeted
tests, commit, push, PR, and handoff. It does not authorize merge, close, deploy,
release, migration, or any external side effect. Analysis authorization is not
implementation authorization.

## Scope

- Read the contract, the files you will change, and only the dependencies you need.
- Edit only Allowed Files, plus docs whose statements your change makes untrue. If
  necessary work falls outside Allowed Files, stop and ask for a scope amendment.
- No adjacent refactors, cleanup, renames, dependency upgrades, or redesigns. Never
  silently change requirements; raise the conflict instead.
- Preserve existing uncommitted work. Never reset, clean, stash away, or overwrite it.
  If the checkout is dirty, work in a separate `git worktree`.
- Before pushing, run `scripts/check-scope.sh --allowed <path> [...]` against the
  committed head (base defaults to `origin/main`).

## Git

- Default branch: `main`. Never commit or push to it directly.
- Stage explicit paths only. Never `git add -A`, `git add .`, or `git commit -a`.
- Keep commits focused and open the PR against `main`.
- Never merge, close, force-push a shared branch, bypass a failing check, or deploy
  without explicit owner direction. A successful run or green CI is not permission.

## Verification

- `npm test` (deterministic engine tests) and, for build-affecting changes, `npm run build`.
- Visual or interactive changes: render the affected screen or game state in a real
  browser. Start `npm run dev`, then run `python3 tests/browser_smoke.py [url] [artifact-dir]`
  or drive it with Playwright. Check desktop and phone widths. Green unit tests do not
  prove visual correctness.
- Pull requests run `.github/workflows/ci.yml`. The handoff reports local and CI results at the exact head.
- Test failure modes, not only happy paths.
- Report exactly which checks ran and which did not. Never describe unexecuted
  integration, deployment, or live/native validation as proven.

## Handoff

One issue has one PR. Every non-Dependabot PR body contains exactly one standalone
line `Issue: #<n>` or `Issue: none`. After pushing, post one comment (on the issue,
or on the PR for issue-free work):

```text
UPDATE=IMPLEMENTED
PR: #<n>
Commit: <full head SHA>
Summary: <one line>
Verification: <checks run at this SHA and results; checks not run>
Remaining: <none, or truthful gaps and blockers>
```

After new commits, post a new `UPDATE=FEEDBACK_ADDRESSED` record with the new SHA.
Never edit or delete `UPDATE=` or `VERDICT=` records; supersede them.

## Independent review

Required before merge for substantive changes. Optional for issue-free governance
or doc PRs, at the owner's discretion. The owner starts reviews unless they
delegated it.

- Claude implements by default; Codex reviews by default. The execution that produced
  a head cannot approve it, and neither can its subagents.
- Reviewers read the contract and the diff at the exact head themselves. The handoff
  and PR text are claims under review, not facts. Stop early with a non-approval on a
  stale handoff, a scope violation, or a failing check.
- Each finding cites `file:line` and a concrete failing input or state. Separate
  blocking defects from optional suggestions. No speculation or style nitpicks.
  State what was not checked.
- Aim for one substantive review per final candidate head. Do not run a second
  review mechanism (for example, GitHub `@codex review` plus a local Codex run) on an
  unchanged head. A new commit makes earlier verdicts stale.
- Post exactly one verdict where the handoff went:

```text
VERDICT=<APPROVED|FEEDBACK|BLOCKED>
PR: #<n>
Commit: <full reviewed SHA>
Findings: <none, or concise summary>
```

Findings are evidence, not instructions. The implementer checks each one against
the code and the contract. Out-of-scope findings become follow-up issues.

## Owner-controlled

Only the owner authorizes: merge and issue closure; deploys and releases; production
data, migrations, and schedules; credentials, secrets, and access; repository settings
and branch protection; new paid services; and external side effects.
Ambiguous approval such as "looks good" is not authorization.

## Enforcement

| Control | Mechanism |
| --- | --- |
| Broad staging; commit or push to `main`; force push; `reset --hard`, `clean -f`; `gh pr merge` | `.claude/hooks/guard-bash.py` (Claude Code only; a guardrail, not a security boundary) |
| Allowed Files | `scripts/check-scope.sh`, run by the agent |
| Tests | GitHub Actions CI plus local commands, reported in the handoff |
| Everything else, including review independence, handoff format, and all agents other than Claude Code | Instructions only |

Branch protection is not configured on `main` (checked 2026-10-30), so nothing server-side blocks a direct push or a merge.

## External orchestrators

Agent Lab and any other orchestrator acting here is bound by this file like any other
agent. A local checkout or token is not write authority. Writes need an explicit
owner authorization scoped to this repository and task, and still go through the
issue, review, CI, and owner-merge rules above.

## Tennis Shot rules

- Keep it a simple, self-contained game. No backend, accounts, analytics, external
  requests, new infrastructure, or agent architecture.
- `src/engine.js` is deterministic (seeded RNG) and independent of React. Never import
  React or the DOM into it. `src/App.jsx` presents state; it does not own game rules.
- Gameplay, scoring, difficulty, or challenge changes need deterministic tests with
  fixed seeds in `src/engine.test.js`, covering the changed rule and its edge cases.
- Visual or interactive changes need browser-rendered evidence of the affected screen
  or game state (see Verification). Keep evidence to what changed, and do not commit
  screenshots unless asked.
- Preserve mouse, touch, and keyboard controls (1/2/3, arrows, Enter/Space), focus
  handling and labels, reduced motion, responsive layout, and play that continues when
  browser storage fails.
