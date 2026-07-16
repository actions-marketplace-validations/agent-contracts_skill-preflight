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

## Version And Publish

1. Choose a patch, minor, or major version according to semantic versioning:

```bash
npm version patch --no-git-tag-version
```

2. Run the local verification commands again.
3. Commit and push the release changes, then wait for CI to pass.
4. Confirm npm authentication and publish:

```bash
npm whoami --registry https://registry.npmjs.org/
npm publish --access public
```

5. Create and push the immutable release tag, then move the stable `v1` Action tag:

```bash
git tag vX.Y.Z
git tag -f v1 vX.Y.Z
git push origin vX.Y.Z
git push origin v1 --force
```

6. Create a GitHub Release from `vX.Y.Z` with a concise change and verification summary.
7. Verify the public package from a clean temporary directory:

npx -y skill-preflight@latest --version
npx -y skill-preflight@latest scan ./my-skill
```

## Credential Hygiene

- Never commit `.npmrc`, access tokens, or registry credentials.
- Prefer short-lived, package-scoped publishing tokens.
- Revoke and rotate any token that has been exposed in logs or chat.
