# Release Checklist

Use this checklist before publishing SkillPreflight.

## Local Verification

```bash
npm install
npm test
npm pack --dry-run
node dist/index.js scan examples/risky-skill
```

## npm Publish

1. Confirm `package.json` name, version, license, and repository fields.
2. Log in:

```bash
npm login
```

3. Publish:

```bash
npm publish --access public
```

After publishing, users can run:

```bash
npx skill-preflight scan ./my-skill
```

## GitHub Repository

1. Create a public GitHub repository.
2. Add the remote:

```bash
git remote add origin https://github.com/agent-contracts/skill-preflight.git
```

3. Commit and push:

```bash
git add .
git commit -m "Initial SkillPreflight MVP"
git branch -M main
git push -u origin main
```

## First Milestones

- Add a public score badge for README files.
- Add a website or hosted report viewer.
- Add npm provenance and signed release workflow.
