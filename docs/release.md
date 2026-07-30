# Release Checklist

Use this checklist before publishing SkillPreflight.

## Local Verification

```bash
npm ci
npm test
npm pack --dry-run
node dist/index.js --version
node dist/index.js scan examples --summary --top 1
npm audit --omit=dev --registry https://registry.npmjs.org/
```

## One-Time Trusted Publisher Setup

SkillPreflight publishes from GitHub Actions with npm trusted publishing. Configure the npm package once with:

- Provider: GitHub Actions
- Organization or user: `agent-contracts`
- Repository: `skill-preflight`
- Workflow filename: `publish.yml`
- Allowed action: `npm publish`

The workflow uses GitHub OIDC, so no npm access token or repository secret is required.

## Version And Publish

1. Choose a patch, minor, or major version according to semantic versioning:

```bash
npm version patch --no-git-tag-version
```

2. Run the local verification commands again.
3. Commit and push the release changes, then wait for CI to pass.
4. Create and push the immutable release tag. The tag triggers `.github/workflows/publish.yml`, which tests and publishes the package through OIDC:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

5. After the publish workflow passes, move the stable `v1` Action tag:

```bash
git tag -f v1 vX.Y.Z
git push origin v1 --force
```

6. Create a GitHub Release from `vX.Y.Z` with a concise change and verification summary.
7. Verify the public package from a clean temporary directory:

```bash
npx -y skill-preflight@latest --version
npx -y skill-preflight@latest scan ./my-skill
```

## Credential Hygiene

- Never commit `.npmrc`, access tokens, or registry credentials.
- Keep the trusted publisher limited to `agent-contracts/skill-preflight` and `publish.yml`.
- Revoke old publishing tokens after trusted publishing is verified.
