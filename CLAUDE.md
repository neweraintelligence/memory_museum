# Memory Palace - Project Notes

## GitHub / git usage (read before any push)

- **GitHub CLI (`gh`) is NOT installed and must NOT be used.** Do not call `gh`,
  do not run `gh auth ...`, and do not assume it exists. Use plain `git` only.
- **Authentication is already configured at the git level.** GitHub HTTPS auth
  works non-interactively — never prompt for credentials, never open a browser
  sign-in, and never paste a token.
  - Global default GitHub identity is **`newera-cal`** (via a credential helper
    that reads the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable).
  - This is configured in global git config under
    `credential.https://github.com.helper`. Other hosts (e.g. Azure DevOps) are
    untouched and still use Git Credential Manager.

## This repo's remote

- Repo: https://github.com/calwleung/memory_palace
- This repo pushes as **`calwleung`** (not the global `newera-cal` default),
  because `newera-cal` has no write access to it. The `calwleung` token is
  embedded in the remote URL, so git uses it directly and ignores the global
  helper for this repo.
- To push, just run:
  ```
  git push origin main
  ```
- Do not "fix" auth by reaching for `gh` or by re-prompting — if a push fails,
  report the exact error instead.
