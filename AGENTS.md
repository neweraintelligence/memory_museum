# Agent guidelines

## GitHub / git

- **Do NOT use GitHub CLI (`gh`). It is not installed.** Never call `gh`, never
  run `gh auth`, and never assume it is available.
- Git is preconfigured to authenticate to GitHub over HTTPS automatically:
  - Global default identity: **`newera-cal`** (credential helper reads the
    `GITHUB_PERSONAL_ACCESS_TOKEN` env var).
  - This repo (`calwleung/memory_museum`) pushes as **`calwleung`** via a token
    embedded in its remote URL.
- Just use plain `git` commands (`git push`, `git pull`, `git clone`). Do not
  prompt for credentials, do not open browser sign-in, and do not embed new
  tokens in URLs.
- If a git operation fails, report the exact error — do not switch to `gh` or
  retry with interactive auth.
