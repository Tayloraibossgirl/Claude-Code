# n8n Workflow Audit Agent

A comprehensive audit and testing agent for n8n workflows that ensures your automations are secure, reliable, and production-ready. Unlike n8n's built-in validation, this agent performs rigorous testing, security scanning, and provides detailed documentation on issues and fallbacks.

## Features

### 🔍 Comprehensive Auditing
- **Configuration Validation**: Checks node parameters, connections, and workflow settings
- **Security Analysis**: Detects hardcoded secrets, insecure HTTP, disabled SSL, dangerous code patterns
- **Error Handling Review**: Validates retry logic, continue-on-fail settings, and error workflows
- **Best Practices**: Identifies anti-patterns and suggests improvements

### 🧪 Rigorous Testing
- **Automated Test Generation**: Creates test cases for all execution paths
- **Mock Execution**: Simulates workflow execution without hitting real APIs
- **Data Flow Validation**: Traces data through the entire workflow
- **Edge Case Testing**: Tests with empty data, malformed inputs, and error scenarios

### 📊 Detailed Reporting
- **Markdown Reports**: Human-readable documentation of all findings
- **Severity Classification**: Critical, High, Medium, Low, and Info levels
- **Actionable Recommendations**: Specific steps to fix each issue
- **Test Results**: Pass/fail status for all automated tests
- **Audit Score**: Letter grade (A-F) with category breakdowns

### 🛡️ Fallback Documentation
- **Error Handling Matrix**: Shows which nodes have error handling configured
- **Retry Configuration**: Documents retry attempts and wait times
- **Error Workflow Tracking**: Validates error workflow references
- **Recovery Mechanisms**: Identifies all fallback strategies

## Installation

```bash
cd n8n-audit-agent
npm install
npm run build
```

## Usage

### Audit a Workflow

Run a comprehensive audit with full testing and report generation:

```bash
npm run audit examples/good-workflow.json
```

With custom output path:

```bash
npm run audit examples/good-workflow.json -- -o my-report.md
```

Generate and run automated tests:

```bash
npm run audit examples/good-workflow.json -- -t
```

### Quick Validation

Run configuration validation without tests:

```bash
node dist/index.js validate examples/good-workflow.json
```

### Run Tests Only

Run tests without full audit:

```bash
node dist/index.js test examples/good-workflow.json --generate
```

With custom test data:

```bash
node dist/index.js test workflow.json --test-data test-data.json
```

## CLI Commands

### `audit <workflow>`

Comprehensive audit with all checks and optional testing.

**Options:**
- `-o, --output <path>` - Output path for markdown report (default: audit-report.md)
- `-t, --test` - Generate and run automated tests
- `--skip-tests` - Skip all tests
- `--test-data <path>` - Path to JSON file with test data

**Exit Codes:**
- `0` - Audit successful, no critical issues
- `1` - Critical issues found or audit failed

### `validate <workflow>`

Quick validation of workflow configuration without tests.

### `test <workflow>`

Run tests on workflow without full audit.

**Options:**
- `-g, --generate` - Generate test cases automatically
- `--test-data <path>` - Path to JSON file with test data

## What Gets Audited

### Configuration Issues
- ✅ Missing required parameters
- ✅ Orphaned nodes (not connected)
- ✅ Broken connections
- ✅ Invalid credential references
- ✅ Disabled nodes
- ✅ Empty function code
- ✅ Circular references
- ✅ No trigger/webhook nodes

### Security Issues
- ✅ Hardcoded API keys, passwords, tokens
- ✅ Unauthenticated webhooks
- ✅ HTTP instead of HTTPS
- ✅ Disabled SSL verification
- ✅ Dangerous code patterns (eval, exec, etc.)
- ✅ Potential SQL injection
- ✅ Exposed secrets in parameters

### Error Handling
- ✅ Missing error handling on critical nodes
- ✅ Retry configuration analysis
- ✅ Continue-on-fail without downstream checks
- ✅ Error workflow validation
- ✅ Error output connections
- ✅ Execution data retention settings

### Testing
- ✅ Connectivity tests (entry points, paths)
- ✅ Node validation (all required params)
- ✅ Data flow simulation
- ✅ Error handling tests
- ✅ Edge case scenarios

## Report Structure

The generated markdown report includes:

1. **Executive Summary** - Overall health and grade
2. **Audit Score** - Breakdown by category (Configuration, Error Handling, Security, Testing)
3. **Workflow Summary** - Node counts, triggers, credentials
4. **Issues by Severity** - Detailed findings with recommendations
5. **Test Results** - All test outcomes organized by category
6. **Error Handling Analysis** - Fallback matrix for each node
7. **Recommendations** - Prioritized action items
8. **Detailed Findings** - In-depth analysis by category

## Example Report Excerpt

```markdown
## Executive Summary

✅ Good Health

This workflow has been comprehensively audited for configuration, security, error handling, and best practices.
The overall grade is **B** with a score of **85/100**.

**Key Findings:**
- 3 total issues identified
- 0 critical issues requiring immediate attention
- 15 tests executed (14 passed, 1 failed)
- 5 total nodes (5 active, 0 disabled)

## Audit Score

| Category | Score | Grade |
|----------|-------|-------|
| **Overall** | **85/100** | **✅ B** |
| Configuration | 90/100 | A |
| Error Handling | 85/100 | B |
| Security | 80/100 | B |
| Testing | 93/100 | A |
```

## Testing Documentation

### Automated Test Generation

The agent automatically generates tests for:

- **Execution Paths**: Tests each possible path through the workflow
- **Node Validation**: Validates all node configurations
- **Data Flow**: Traces data transformation through nodes
- **Error Scenarios**: Tests error handling mechanisms
- **Edge Cases**: Empty data, malformed inputs

### Custom Test Data

Provide custom test data in JSON format:

```json
{
  "json": {
    "userId": "123",
    "action": "create",
    "data": {
      "name": "Test User"
    }
  }
}
```

Then run with:

```bash
node dist/index.js test workflow.json --test-data test-data.json
```

### Test Assertions

Tests automatically check for:
- Data existence at expected paths
- Correct data types
- Expected values
- Proper error handling
- Connection validity

## Fallback Analysis

The agent provides comprehensive fallback documentation:

| Node | Error Workflow | Continue On Fail | Retry | Error Output | Status |
|------|----------------|------------------|-------|--------------|--------|
| Send to API | ❌ | ✅ | ✅ (3x, 2000ms) | ✅ | ✅ OK |
| Process Data | ✅ | ❌ | ❌ | ❌ | ✅ OK |

This shows at a glance which error handling mechanisms are configured for each node.

## Best Practices

### What the Agent Checks

✅ **DO:**
- Use HTTPS for all external requests
- Configure authentication on webhooks
- Enable retry logic on API calls
- Use continue-on-fail with downstream error checking
- Store credentials properly (not hardcoded)
- Enable error execution data retention
- Add meaningful node names
- Connect all nodes properly

❌ **DON'T:**
- Hardcode API keys or secrets
- Use HTTP for sensitive data
- Disable SSL verification
- Use eval() or exec() in function nodes
- Leave nodes orphaned
- Ignore error handling on critical nodes
- Use localhost URLs in production workflows

## Architecture

```
n8n-audit-agent/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   ├── workflow.ts     # n8n workflow types
│   │   └── audit.ts        # Audit result types
│   ├── utils/
│   │   └── workflow-parser.ts  # Workflow loading and parsing
│   ├── validators/
│   │   └── config-validator.ts # Configuration validation
│   ├── auditors/
│   │   ├── security-auditor.ts      # Security checks
│   │   └── error-handler-auditor.ts # Error handling analysis
│   ├── testers/
│   │   └── test-harness.ts # Test execution engine
│   ├── reporters/
│   │   └── markdown-reporter.ts # Report generation
│   ├── auditor.ts          # Main orchestrator
│   └── index.ts            # CLI entry point
├── examples/               # Example workflows
├── docs/                   # Additional documentation
└── tests/                  # Test suites
```

## Contributing

This agent is designed to be:
- **Comprehensive**: Checks everything n8n doesn't
- **Rigorous**: Never trusts that a job is "done"
- **Documented**: Provides detailed explanations and recommendations
- **Automated**: Runs tests without manual intervention

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

**Remember**: Just because n8n says your workflow works doesn't mean it's production-ready. Use this agent to ensure your workflows are secure, reliable, and maintainable.
