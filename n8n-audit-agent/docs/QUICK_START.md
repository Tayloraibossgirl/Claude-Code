# Quick Start Guide

Get started with the n8n Workflow Audit Agent in 5 minutes.

## Installation

```bash
# Navigate to the audit agent directory
cd n8n-audit-agent

# Install dependencies
npm install

# Build the project
npm run build
```

## Your First Audit

### 1. Try the Example Workflows

**Audit a good workflow:**
```bash
npm run audit examples/good-workflow.json
```

Expected output:
```
🚀 n8n Workflow Audit Agent

🔍 Loading workflow from: examples/good-workflow.json
📋 Auditing workflow: Good Workflow Example
   Nodes: 5
   Active: Yes

⚙️  Validating configuration...
   Found 0 configuration issues

🔒 Auditing security...
   Found 0 security issues

🛡️  Auditing error handling...
   Found 1 error handling issues

🧪 Running tests...
   Ran 12 tests
   Passed: 12
   Failed: 0

📝 Generating report: audit-report.md

✅ Audit complete!
📄 Report saved to: audit-report.md
```

**Audit a problematic workflow:**
```bash
npm run audit examples/problematic-workflow.json -- -o problematic-report.md
```

Expected output:
```
🚀 n8n Workflow Audit Agent

...

⚠️  WARNING: 3 critical issue(s) found!
```

### 2. Review the Report

Open `audit-report.md` in your favorite markdown viewer or editor:

```bash
# On macOS
open audit-report.md

# On Linux
xdg-open audit-report.md

# Or just cat it
cat audit-report.md
```

You'll see:
- Executive summary with overall grade
- Issues categorized by severity
- Test results
- Detailed recommendations
- Fallback analysis

### 3. Audit Your Own Workflow

Export a workflow from n8n:
1. Open your workflow in n8n
2. Click the menu (3 dots)
3. Select "Download"
4. Save as `my-workflow.json`

Run the audit:
```bash
npm run audit /path/to/my-workflow.json -- -o my-workflow-report.md
```

### 4. Fix Issues

The report will show issues like:

```markdown
#### 1. Missing credentials
**Node:** HTTP Request (n8n-nodes-base.httpRequest)
**Category:** credentials
**Description:** Node "HTTP Request" requires credentials but none are configured
**Recommendation:** Configure the required credentials for this node
```

Fix in n8n:
1. Open the workflow
2. Click the "HTTP Request" node
3. Add credentials
4. Save

### 5. Run with Tests

Generate and run automated tests:

```bash
npm run audit my-workflow.json -- -t -o my-workflow-report.md
```

This will:
- ✅ Validate configuration
- ✅ Check security
- ✅ Analyze error handling
- ✅ Generate test cases
- ✅ Run all tests
- ✅ Create comprehensive report

## Common Commands

### Quick Validation (No Tests)

```bash
node dist/index.js validate workflow.json
```

Fast check for configuration issues only.

### Run Tests Only

```bash
node dist/index.js test workflow.json --generate
```

Skip audit, just run tests.

### Custom Output Path

```bash
npm run audit workflow.json -- -o reports/audit-$(date +%Y%m%d).md
```

Save report with timestamp.

### With Custom Test Data

```bash
node dist/index.js test workflow.json --test-data test-data.json
```

## Understanding the Results

### Audit Score

```
Overall Grade: B (85/100)
```

- **A (90-100)**: Excellent - Production ready
- **B (80-89)**: Good - Minor improvements needed
- **C (70-79)**: Fair - Some issues to fix
- **D (60-69)**: Poor - Significant issues
- **F (0-59)**: Critical - Not production ready

### Issue Severity

- 🔴 **Critical**: Fix immediately (workflow may fail)
- 🟠 **High**: Fix before production (security/reliability risk)
- 🟡 **Medium**: Fix soon (best practices, maintainability)
- 🔵 **Low**: Nice to have (minor improvements)
- ℹ️ **Info**: Informational (awareness)

### Test Results

```
✅ Tests: Passed 24, Failed 2
```

- **Passed**: Working correctly
- **Failed**: Issues found that need fixing
- **Skipped**: Not applicable to this workflow
- **Error**: Test couldn't run (usually due to config issues)

## Next Steps

### 1. Learn More

- Read [TESTING_GUIDE.md](TESTING_GUIDE.md) for testing details
- Read [FALLBACK_GUIDE.md](FALLBACK_GUIDE.md) for error handling
- Check the main [README.md](../README.md) for full documentation

### 2. Integrate into Workflow

Add to your development process:

```bash
# Before committing workflow changes
npm run audit workflow.json -- -t

# If audit passes (exit code 0), commit
git add workflow.json
git commit -m "Update workflow"
```

### 3. Continuous Integration

Add to CI/CD (example for GitHub Actions):

```yaml
name: Audit n8n Workflow

on:
  pull_request:
    paths:
      - '**.json'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install Dependencies
        run: |
          cd n8n-audit-agent
          npm install
          npm run build

      - name: Audit Workflow
        run: |
          cd n8n-audit-agent
          node dist/index.js audit ../workflow.json --test
```

## Troubleshooting

### "Cannot find module"

Make sure you built the project:
```bash
npm run build
```

### "Invalid JSON in workflow file"

Your workflow JSON is malformed. Check:
```bash
cat workflow.json | jq .
```

### "No trigger or webhook found"

This is expected for:
- Workflows meant to be called by other workflows
- Workflows that run manually only

If intentional, you can ignore this warning.

### Exit Code 1

The audit found critical issues. Check the report for details:

```bash
npm run audit workflow.json
echo "Exit code: $?"
```

Exit codes:
- `0` = Success, no critical issues
- `1` = Critical issues found or audit failed

## Tips

### Compare Before/After

```bash
# Before changes
npm run audit workflow.json -- -o before-audit.md

# Make changes in n8n

# After changes
npm run audit workflow.json -- -o after-audit.md

# Compare
diff before-audit.md after-audit.md
```

### Batch Audit Multiple Workflows

```bash
for workflow in workflows/*.json; do
  echo "Auditing $workflow"
  node dist/index.js audit "$workflow" -o "reports/$(basename $workflow .json)-report.md"
done
```

### Check Specific Workflow Elements

```bash
# Just validate, no full audit
node dist/index.js validate workflow.json

# Just test, no audit
node dist/index.js test workflow.json
```

## Examples of What Gets Caught

### Security Issues

```
🔴 Critical: Potential hardcoded API key
Node: HTTP Request
Description: Node "HTTP Request" may contain a hardcoded token
Recommendation: Use credentials or environment variables
```

### Configuration Issues

```
🔴 Critical: Missing required parameter
Node: Webhook
Description: Node "Webhook" is missing required parameter: path
Recommendation: Configure the "path" parameter
```

### Error Handling Issues

```
🟡 Medium: No error handling configured
Node: Send Email
Description: Node can fail but has no error handling
Recommendation: Enable "Retry On Fail" or configure error workflow
```

## Getting Help

- Check [README.md](../README.md) for full documentation
- Review example workflows in `examples/`
- Read detailed guides in `docs/`

---

**You're ready!** Start auditing your workflows and make them production-ready. 🚀
