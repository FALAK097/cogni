# Cloudflare Workers Git Integration (Workers Builds)

This document provides a guide and analysis for migrating the **widget** repository from manual GitHub Actions deployment (`cloudflare.yml`) to Cloudflare's native **Git Integration (Workers Builds)**.

---

## 1. How It Works

Cloudflare Workers Builds allows you to connect your repository directly to Cloudflare.

- **On Push to `main` (Production)**: Cloudflare runs the build script and deploys to the production environment.
- **On Pull Request / Branch Pushes (Preview)**: Cloudflare builds the branch, deploys a preview version, and automatically posts the preview URL as a comment in the GitHub PR.

---

## 2. Resource Isolation (D1, R2, AI Search, etc.)

> [!IMPORTANT]
> **This migration does NOT remove your separate preview database (D1), preview storage (R2), or preview search (AI Search).**
> Isolation remains critical so that PR code changes do not modify production data.

### How Isolation is Maintained in Workers Builds

Although Cloudflare Workers Builds runs from a single Git connection, it respects your `wrangler.jsonc` environment overrides by utilizing different deploy commands:

1. **Production Branch (`main`)**:
   - Runs the default deploy command: `pnpm cf:build && wrangler deploy --env="" --keep-vars`
   - Binds to the production database: D1 `widget-prod`, R2 `widget-prod-uploads`, etc.

2. **Preview/Non-Production Branches**:
   - In the Cloudflare dashboard, you configure the **"Non-production branch deploy command"** to use: `pnpm cf:build && wrangler deploy --env preview --keep-vars`
   - This deploys to the `widget-preview` Worker and binds to the preview resources: D1 `widget-preview`, R2 `widget-preview-uploads`, etc.

---

## 3. What Can Be Cleaned Up and Removed

If you migrate to native Workers Builds:

### 1. Files to Delete

- **Delete** [.github/workflows/cloudflare.yml](file:///Users/falakgala/projects/widget/.github/workflows/cloudflare.yml): The entire manual deployment job runner is no longer needed.
- _Note: Keep [ci.yml](file:///Users/falakgala/projects/widget/.github/workflows/ci.yml) so GitHub Actions continues to run code linting and type-checking on PRs._

### 2. GitHub Secrets to Delete

You no longer need to manage Cloudflare credentials in GitHub. You can safely delete these secrets from your GitHub repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_PREVIEW_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## 4. Setup Guide

To configure this in the Cloudflare dashboard:

1. Go to **Cloudflare Dashboard** -> **Workers & Pages** -> select your `widget-prod` worker.
2. Navigate to **Settings** -> **Builds & Git** -> click **Connect to Git** (connect your GitHub repository).
3. Set the build parameters:
   - **Build command**: `pnpm cf:build`
   - **Output directory**: `.open-next`
4. Under **Wrangler Environments / Branches**:
   - Ensure the default production build runs without `--env`.
   - Set the custom deploy command for **non-production branches** to:
     ```bash
     pnpm cf:build && wrangler deploy --env preview --keep-vars
     ```
5. Configure your build environment variables (e.g., `SKIP_ENV_VALIDATION=true`) in the Workers variables panel.
