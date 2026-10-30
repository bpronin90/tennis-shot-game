@AGENTS.md

# CLAUDE.md

Claude is the default implementation agent here. `AGENTS.md` is authoritative; this
file adds only Claude-specific notes.

- Do not review or approve a head you produced, and do not use a Claude subagent as
  the independent reviewer. Codex reviews.
- `.claude/hooks/guard-bash.py` blocks broad staging, commits or pushes to `main`,
  force pushes, `reset --hard`, `clean -f`, and `gh pr merge`. If it blocks a command,
  fix the command. Never route around it.
- Stop after the handoff unless the owner asked for more.
- For browser verification you may use the Playwright tools against `npm run dev`.
