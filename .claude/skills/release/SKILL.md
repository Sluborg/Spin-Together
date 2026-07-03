---
name: release
description: Promote the dev branch to main (stable) and verify both GitHub Pages builds respond. Use to cut a stable release after a phase is done and approved.
---

# release

Promote `dev` → `main` and verify the live site. **Never claim deployed without verifying.**

## Checklist
1. Confirm `dev` is green: CI (lint + tests + build) passing on the latest `dev` commit.
2. Confirm `project-status.md` and `PLAN.md` reflect the phase being released.
3. Confirm `data/*.json` pass the referential-integrity validator (no dangling refs, valid enums,
   `chance ∈ [0,1]`).
4. Open a PR **`dev` → `main`** (do not push directly to `main`). Summarize what's shipping.
5. After merge, watch the Pages deploy Actions run to completion.
6. **Verify BOTH URLs respond (HTTP 200 + expected content):**
   - stable: `https://sluborg.github.io/Spin-Together/`
   - dev: `https://sluborg.github.io/Spin-Together/dev/`
   Use curl/WebFetch; check the built app actually loads, not just a 200 on an old cache.
7. Update `project-status.md` with the released phase, the verified URLs, and the next action.

## Guardrails
- If either URL fails, the release is **not** done — investigate the Pages workflow before
  reporting success.
- Stable (`main`) changes only ever land via this PR flow.
