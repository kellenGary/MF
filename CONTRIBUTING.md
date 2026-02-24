# Contributing to Petal

## Branch Strategy

We use a **three-tier branching model** for fast development, safe testing, and stable releases.

```
feature/xyz ──► dev ──► staging ──► main
     ▲              ▲           ▲
  daily work    integration   release
```

### Branch Roles

| Branch | Purpose | Deploys To | Stability |
|--------|---------|-----------|-----------|
| `main` | Production releases | App Store / Play Store | 🟢 Always stable |
| `staging` | Pre-release testing | TestFlight / Internal Testing | 🟡 Should be stable |
| `dev` | Integration branch | Dev builds | 🟠 May have WIP features |
| `feature/*` | Individual features | Local only | 🔴 Anything goes |

---

## Day-to-Day Workflow

### 1. Start a New Feature

```bash
# Always branch off dev
git checkout dev
git pull origin dev
git checkout -b feature/issue-12-comments
```

**Naming convention**: `feature/issue-{number}-{short-description}`

Other prefixes:
- `bugfix/issue-{number}-{description}` — fixing a bug
- `hotfix/{description}` — urgent fix that goes straight to main
- `chore/{description}` — non-functional changes (CI, docs, deps)

### 2. Work on Your Feature

```bash
# Make commits with clear messages
git add .
git commit -m "feat: add comment input component"
git commit -m "feat: wire up comment API endpoints"
git commit -m "fix: handle empty comment edge case"
```

**Commit message format**: `type: short description`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `chore` | Build, CI, docs, dependencies |
| `style` | Formatting, whitespace |
| `test` | Adding or updating tests |

### 3. Push and Open a PR → `dev`

```bash
git push origin feature/issue-12-comments
```

Then open a Pull Request on GitHub:
- **Base**: `dev`
- **Head**: `feature/issue-12-comments`
- **Title**: `feat: Add comment system (#12)`
- Link the related issue in the PR description

### 4. Merge to Dev

After review (or self-review for solo development):
- **Squash and merge** into `dev` (keeps history clean)
- Delete the feature branch

### 5. Promote to Staging (Testing)

When `dev` has enough features ready for a release cycle:

```bash
git checkout staging
git pull origin staging
git merge dev --no-edit
git push origin staging
```

Or open a PR: `dev` → `staging` on GitHub.

This triggers a TestFlight / Internal Testing build (once CI is set up).

### 6. Release to Production

After testing on staging is complete:

```bash
git checkout main
git pull origin main
git merge staging --no-edit
git tag -a v1.0.0 -m "Release 1.0.0: Comments, Notifications, Bug fixes"
git push origin main --tags
```

Or open a PR: `staging` → `main` on GitHub.

---

## Hotfix Process (Emergency Fixes)

For critical bugs in production that can't wait for the normal cycle:

```bash
# Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/crash-on-login

# Fix the issue
git commit -m "fix: prevent crash on null user token"

# Merge to main
git checkout main
git merge hotfix/crash-on-login
git tag -a v1.0.1 -m "Hotfix: Login crash"
git push origin main --tags

# Back-merge to staging and dev so they have the fix too
git checkout staging && git merge main && git push origin staging
git checkout dev && git merge main && git push origin dev
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────┐
│                   WORKFLOW                       │
│                                                  │
│  feature/* ──PR──► dev ──PR──► staging ──PR──► main
│                     │                        │
│                     │    hotfix/* ────────────┘
│                     │         │
│                     ◄─────────┘  (back-merge)
│                                                  │
│  Branch off: dev        Merge to: dev            │
│  Naming: feature/issue-{N}-{desc}                │
│  Commits: type: description                      │
│  PRs: squash merge                               │
└─────────────────────────────────────────────────┘
```

## What NOT to Do

- ❌ Push directly to `main` or `staging`
- ❌ Merge feature branches directly to `main`
- ❌ Leave stale feature branches around (delete after merge)
- ❌ Use vague commit messages like "fix stuff" or "update"
- ❌ Forget to back-merge hotfixes into `dev`
