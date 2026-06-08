# Dependency Security & Updates

## Current Status

### Last Audit: 2025-05-04

| Package | Current | Latest | Vulnerability |
|---------|---------|--------|---|
| `xlsx` | 0.19.3 | 0.19.3 | ✅ Fixed (prototype pollution) |
| `@sentry/react` | 7.99.0 | 7.99.0 | ✅ Latest |
| `@sentry/tracing` | 7.99.0 | 7.99.0 | ✅ Latest |
| All others | Current | Current | ✅ Monitored |

---

## Vulnerability History

### Fixed Vulnerabilities

1. **XLSX prototype pollution** (CVE-2023-XXXXX)
   - **Severity**: High
   - **Affected versions**: < 0.19.3
   - **Fix**: Updated to 0.19.3
   - **Date fixed**: 2025-05-04
   - **Details**: The `xlsx` library had a prototype pollution vulnerability that could lead to code execution when importing malicious CSV files

2. **serialize-javascript** (if used transitively)
   - **Severity**: High (build-time RCE)
   - **Note**: Not directly used, but monitor in transitive dependencies
   - **Mitigation**: Run `npm audit` regularly

---

## Monitoring Strategy

### Weekly Checks

```bash
# Check for updates
npm outdated

# Check for vulnerabilities
npm audit

# Show audit levels:
# - low: Should be fixed but not critical
# - moderate: Fix at next version release
# - high: Fix as soon as possible
# - critical: Stop and fix immediately
```

### Automated Checks

1. **Pre-commit hook** (`.husky/pre-commit`):
   ```bash
   npm audit --audit-level=moderate
   ```
   - Blocks commits if moderate/high/critical vulns found
   - Can be bypassed with `git commit --no-verify` (not recommended)

2. **GitHub Dependabot** (if on GitHub):
   - Enable in: Settings → Code security and analysis → Dependabot alerts
   - Auto-generates PRs for security updates

3. **Vercel deployment checks**:
   - Vercel runs `npm audit` during build
   - Build fails if critical vulnerabilities found

---

## Update Process

### Minor/Patch Updates (Weekly)

```bash
# Check what would be updated
npm outdated

# Safe update (respects semver in package.json)
npm update

# For specific package
npm update [package-name]
```

### Major Version Updates (Quarterly)

⚠️ **Requires testing!**

```bash
# Check what needs upgrading
npm outdated

# Upgrade specific package to latest
npm install [package-name]@latest

# Test everything works
npm run build
npm run dev
# ... manual testing ...
```

### React-related Updates (Careful!)

```bash
# Never auto-update React across major versions
# Always test thoroughly:

npm update react@latest react-dom@latest

# If issues:
npm update react@^18.2.0 react-dom@^18.2.0  # Revert to previous major
```

---

## Known Transitive Vulnerabilities

### serialize-javascript

- **Status**: Monitor (not directly used)
- **Reason**: May appear in Vite or build tool dependencies
- **Action**: If found in audit, upgrade the parent package
- **Example**:
  ```bash
  npm ls serialize-javascript
  npm audit fix
  ```

---

## Quarterly Audit Report

### Q2 2025 (March-May)

- **Date completed**: 2025-05-04
- **Total dependencies**: 17 direct, ~200 transitive
- **Critical vulns**: 0
- **High vulns**: 0 (fixed xlsx)
- **Moderate vulns**: 0
- **Low vulns**: 0
- **Action required**: None
- **Next review**: August 4, 2025

### Update Recommendations

- ✅ `xlsx`: 0.19.3 (latest, secure)
- ✅ `react`: 18.2.0 (LTS, secure)
- ✅ `vite`: 5.1.5 (current, no critical updates)
- ✅ `typescript`: 5.2.2 (latest)
- ℹ️ Monitor: `serialize-javascript` in transitive deps

---

## Emergency Response

**If a critical vulnerability is discovered:**

1. **Immediate** (< 1 hour):
   ```bash
   npm audit
   npm update [vulnerable-package]
   npm run build  # Verify it compiles
   ```

2. **Deploy** (< 4 hours):
   ```bash
   git add package.json package-lock.json
   git commit -m "security: update [package] to patch CVE-XXXX"
   git push origin main
   # Vercel auto-deploys
   ```

3. **Communicate**:
   - Slack: `#security-incidents`
   - Email to team
   - Document in incident log

---

## Dependency Upgrade Checklist

- [ ] Run `npm outdated` to see what's available
- [ ] Update package.json manually or use `npm update`
- [ ] Run `npm run build` to check for breaking changes
- [ ] Run `npm run dev` and test manually
- [ ] Check console for deprecation warnings
- [ ] Run `npm audit` to ensure no new vulns
- [ ] If issues, revert and investigate
- [ ] Commit with message: `chore: update dependencies`
- [ ] Push and let Vercel test in preview
- [ ] Merge to main once verified

---

## References

- [npm audit docs](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk vulnerability database](https://snyk.io/vuln/)
- [GitHub Advisory Database](https://github.com/advisories)

---

## Notes for Team

- **Do not ignore audit warnings** — they accumulate over time
- **Update before major security incidents** — patch Tuesday is the second Tuesday of each month
- **Test updates thoroughly** — especially for React, Firebase, and Vite
- **Pin critical dependencies** — but still update regularly
- **Monitor GitHub alerts** — set email notifications for security advisories
