# GitHub Repository Migration Plan

**Requirement:** REQ-0062  
**Audit date:** 2026-11-09  
**Status:** Local preparation complete; destination supplied; staged review awaiting confirmation

## Audit findings

- **Project root:** This workspace root. Source and project files are present in the existing `backend/`, `frontend/`, `shared/`, `e2e-tests/`, `data/`, and `docs/` layout.
- **Git status:** The worktree already contains extensive staged and unstaged restructuring changes. These pre-existing changes must be preserved; do not reset, restore, or stage them as part of this migration.
- **Git metadata:** There is one root `.git` directory and no nested repositories. The current branch is `refactor/project-structure`; local branch `master` points at the same commit (`8d11a07`). The inspected history contains one commit. No remote is configured, so the checkout is already disconnected from any configured GitHub remote.
- **New destination:** The user supplied `https://github.com/Akshatgupta000/HotelManagement.git` and requested publication. `git ls-remote --heads --tags` completed successfully with no refs, so the destination appears empty and has no existing branch/tag to overwrite.
- **Original repository references:** The package READMEs contained `https://github.com/arnobt78/MERN-Hotel-Booking--React-FullStack.git` and inconsistent old repository names, and had Diploi badges tied to `arnobt78/Hotel-Booking-Management-System--React-MERN-FullStack`. These are README references only; no configured remote established that either URL was the actual source remote. Clone instructions now use placeholders and the old-owner-specific package badges have been removed. The root README also uses a clear username/repository placeholder.
- **Other identity links:** The MIT license's copyright, portfolio, and GitHub profile links identify the original author and are intentionally retained. The security contact, live frontend/backend endpoints, deployment configuration, and screenshot attachments are not old Git remotes and are retained.
- **Automation:** No `.github/workflows` files or `.github` directory were found.
- **Project metadata:** Root and package manifests identify the existing project/packages; their package names and dependencies are left unchanged.
- **License and attribution:** The existing MIT `LICENSE` is retained unchanged. Existing author, security-contact, and third-party notices must remain.
- **Environment files and secrets:** Root/backend/frontend example environment files already exist. Local `backend/.env` and `frontend/.env.local` are ignored/untracked and must not be staged. Targeted scans of tracked history did not find obvious private-key, common API-token, or embedded MongoDB credential material; tracked MongoDB URI examples are placeholder-shaped. The project intentionally documents demo/test account credentials: verify those accounts are demo-only and rotate credentials if reused in any live environment. Secret values were not printed.

## Preparation completed

1. Added REQ-0062 for traceability.
2. Replaced README clone URLs with `<YOUR-USERNAME>/<YOUR-REPOSITORY>` placeholders and corrected the package paths.
3. Removed the old-owner-specific Diploi launch badges from the package READMEs.
4. Kept the root README title and feature/setup/API documentation because they describe the existing project; no unconfirmed repository identity was invented.
5. Extended the root `.gitignore` for `.env.*`, temporary files, common build/test outputs, and local deployment/cache output while explicitly allowing `.env.example` and `.env.*.example`. Existing lockfiles, source files, and docs remain trackable.

## Approved local Git cleanup — complete

The user approved backing up and removing only the root `.git` directory.

1. Confirmed project files and the existing staged/unstaged changes before cleanup.
2. Created the full backup at `../.Hotel-Booking-Management-System--React-MERN-FullStack-main.git-backup-20261109` (23 MB). It reads the original commit and refs; `git fsck` returned successfully and reported dangling blobs that are preserved in the backup.
3. Removed only the root `.git`. No nested Git metadata exists, and the project source, license, and configuration remain present.
4. No remote was configured before cleanup. The replacement repository has not been initialized; that requires later approval after reviewing the migration changes.

## Publication status

The user supplied the repository URL and explicitly requested a push. The local repository is initialized on `main` and 296 files are staged. No commit, remote configuration, or push has occurred. The staged content must be confirmed before the initial commit. The repo exists already, so no GitHub repository creation method or visibility decision is needed for this push.

After the user confirms the staged contents:

1. Create the initial commit.
2. Add and verify `origin`; recheck destination refs before pushing. Do not force-push or overwrite a non-empty remote.
3. Push `main` to the confirmed destination. If authentication fails, explain safe authentication.
4. Write `docs/GITHUB_MIGRATION_REPORT.md` with verified connection, history, README, ignore/security, commit, push, and remaining-action results. Do not claim a push succeeded unless verified.

## Remaining unknowns

- Confirmation that the exact staged file set is appropriate for the initial commit.
- GitHub write authentication, to be verified when the push is attempted.
