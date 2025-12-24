# Testing Guide

This guide explains how the n8n Workflow Audit Agent tests your workflows and how to interpret the results.

## Overview

The audit agent performs rigorous testing that goes beyond n8n's built-in validation. While n8n checks if nodes are configured, our agent tests if they'll actually work correctly in production.

## Types of Tests

### 1. Connectivity Tests

**What they check:**
- Workflow has valid entry points (triggers/webhooks)
- All nodes are connected properly
- No orphaned nodes exist
- Valid execution paths exist from trigger to completion

**Example output:**
```
✅ Workflow has valid entry points - Found 1 trigger(s) and 1 webhook(s)
✅ No orphaned nodes - All nodes are properly connected
✅ Valid execution paths exist - Found 3 execution path(s)
```

**Common failures:**
- No trigger nodes (workflow can't start automatically)
- Orphaned nodes (nodes not connected to anything)
- Broken connections (references to deleted nodes)

### 2. Node Validation Tests

**What they check:**
- All required parameters are configured
- Credentials are properly set up
- Parameter values are valid
- Node-specific requirements are met

**Example output:**
```
✅ Validate node: Webhook - Node configuration is valid
❌ Validate node: HTTP Request - Missing required parameters: url
✅ Validate node: Process Data - Node configuration is valid
```

**Common failures:**
- Missing URL in HTTP Request nodes
- Missing credentials in API nodes
- Empty function code in Function nodes
- Invalid condition logic in IF nodes

### 3. Data Flow Tests

**What they check:**
- Data can flow through all execution paths
- Nodes properly transform data
- No data loss occurs
- Type transformations are valid

**Example output:**
```
✅ Data flow test: Path 1 - Data successfully flowed through 5 nodes
✅ Data flow test: Path 2 - Data successfully flowed through 3 nodes
❌ Data flow test: Path 3 - Error simulating node Transform: Missing required field
```

**How it works:**
The agent simulates data flowing through your workflow:
1. Generates mock data appropriate for your trigger type
2. Passes it through each node in sequence
3. Validates that each node can process the data
4. Ensures data reaches the end of the path

### 4. Error Handling Tests

**What they check:**
- Retry configuration is reasonable
- Continue-on-fail has downstream error checking
- Error outputs are connected
- Error workflows are referenced correctly

**Example output:**
```
✅ Error handling: Send to API retry config - Retry configured: 3 attempts, 2000ms wait
⚠️  Error handling: Process Data continue on fail - Warning: No downstream error checking
✅ Error handling: Webhook error workflow - Error workflow configured
```

**What makes good error handling:**
- 3-5 retry attempts for API calls
- 1000-5000ms wait between retries
- Downstream IF/Switch nodes when using continue-on-fail
- Error outputs connected or error workflow configured

### 5. Edge Case Tests

**What they check:**
- Workflow handles empty input data
- Workflow handles malformed data
- Workflow handles missing fields
- Workflow handles extreme values

**Example scenarios:**
```json
// Empty data
{}

// Minimal data
{ "json": {} }

// Missing expected fields
{ "json": { "id": 123 } }  // Expected "name" field missing
```

## Automated Test Generation

### How It Works

When you run with the `--test` flag, the agent:

1. **Analyzes Workflow Structure**
   - Maps all execution paths
   - Identifies node types
   - Determines data flow

2. **Generates Test Cases**
   - One test per execution path
   - Edge cases for triggers
   - Error scenarios for critical nodes

3. **Creates Assertions**
   - Data existence checks
   - Type validation
   - Expected output verification

### Example Generated Test

```typescript
{
  id: "path-test-0",
  name: "Test execution path 1",
  description: "Tests the execution path: Webhook → Process Data → Check Result → Send to API",
  nodeId: "webhook-1",
  inputData: {
    body: { test: true, timestamp: "2024-01-01T00:00:00.000Z" },
    headers: { "content-type": "application/json" },
    query: {}
  },
  assertions: [
    { type: "exists", path: "json", expected: true },
    { type: "type", path: "json.processed", expected: "boolean" }
  ]
}
```

## Custom Test Data

### Providing Test Data

Create a JSON file with test data matching your workflow's input:

**test-data.json:**
```json
{
  "json": {
    "userId": "test-123",
    "action": "process",
    "payload": {
      "name": "Test User",
      "email": "test@example.com",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  },
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer test-token"
  }
}
```

**Run with custom data:**
```bash
node dist/index.js test workflow.json --test-data test-data.json
```

### Test Data Patterns

**For Webhook Triggers:**
```json
{
  "body": { /* request body */ },
  "headers": { /* HTTP headers */ },
  "query": { /* query parameters */ }
}
```

**For Manual Triggers:**
```json
{
  "json": { /* your data */ }
}
```

**For Cron/Schedule Triggers:**
```json
{
  "triggered": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Understanding Test Results

### Test Status Codes

- **✅ passed** - Test completed successfully
- **❌ failed** - Test failed, issue found
- **⏭️ skipped** - Test was skipped (configuration)
- **🚫 error** - Test couldn't run due to error

### Reading Test Output

```
| Test | Status | Duration | Message |
|------|--------|----------|---------|
| Validate node: Webhook | ✅ passed | 2ms | Node configuration is valid |
| Data flow test: Path 1 | ✅ passed | 15ms | Data successfully flowed through 5 nodes |
| Error handling: API retry config | ✅ passed | 1ms | Retry configured: 3 attempts, 2000ms wait |
| Validate node: HTTP Request | ❌ failed | 3ms | Missing required parameters: url |
```

**Interpreting results:**
- **Duration**: How long the test took (ms)
- **Message**: Details about what passed or failed
- **Failed tests**: Indicate issues that need fixing

## Test Coverage

### What Gets Tested

✅ **Always Tested:**
- Node configuration validity
- Connection integrity
- Required parameters
- Credential references
- Execution path existence

✅ **When Applicable:**
- Retry configurations
- Continue-on-fail logic
- Error workflow references
- Data transformations
- Security patterns

❌ **Not Tested:**
- Actual API calls (mocked)
- Real credential validation
- External service availability
- Production data

### Coverage Report

After running tests, you'll see:

```
📊 Test Coverage:
   Total Tests: 27
   ✅ Passed: 24
   ❌ Failed: 2
   ⏭️ Skipped: 1
   Coverage: 89%
```

## Fallback Testing

### Fallback Matrix

The agent generates a matrix showing error handling for each node:

| Node | Error Workflow | Continue On Fail | Retry | Error Output | Status |
|------|----------------|------------------|-------|--------------|--------|
| Webhook | ❌ | ✅ | ❌ | ✅ | ✅ OK |
| Process Data | ✅ | ❌ | ❌ | ❌ | ✅ OK |
| Send to API | ❌ | ❌ | ✅ (3x, 2000ms) | ❌ | ✅ OK |
| Transform | ❌ | ❌ | ❌ | ❌ | ⚠️ No Handling |

### Fallback Recommendations

For each node without proper error handling:

```
⚠️ Nodes without error handling:
- Transform: Add at least one error handling mechanism
- Database Insert: Enable retry for database operations
- Send Email: Configure error workflow for notification failures
```

## Best Practices

### Writing Testable Workflows

1. **Use Consistent Data Structures**
   ```javascript
   // Good - consistent structure
   return [{ json: { status: 'success', data: result } }];

   // Bad - inconsistent structure
   return [{ json: result }]; // Sometimes result is object, sometimes string
   ```

2. **Add Error Handling Early**
   - Don't wait for production failures
   - Test error paths during development
   - Configure retries on all API calls

3. **Use Descriptive Node Names**
   ```
   Good: "Fetch User from Database"
   Bad: "HTTP Request"
   ```

4. **Validate Data Between Nodes**
   ```javascript
   // Add IF nodes to check data validity
   if (!items[0]?.json?.userId) {
     throw new Error('Missing userId');
   }
   ```

### Testing Workflow Changes

**Before deploying changes:**

1. Run full audit:
   ```bash
   npm run audit workflow.json -- -t -o before-report.md
   ```

2. Make changes

3. Run audit again:
   ```bash
   npm run audit workflow.json -- -t -o after-report.md
   ```

4. Compare reports:
   - Check if new issues were introduced
   - Verify old issues were fixed
   - Ensure tests still pass

### Continuous Testing

**In CI/CD pipelines:**

```yaml
# Example GitHub Actions
- name: Audit n8n Workflow
  run: |
    cd n8n-audit-agent
    npm install
    npm run build
    node dist/index.js audit ../workflow.json --test
  # Fails build if critical issues found
```

## Troubleshooting

### Common Test Failures

**"Node has no connections"**
- Fix: Connect the node or remove it

**"Missing required parameters"**
- Fix: Configure all required node parameters

**"No trigger or webhook found"**
- Fix: Add a trigger node or ensure manual execution is intended

**"No downstream error checking"**
- Fix: Add an IF node after nodes with continue-on-fail enabled

### Debug Tips

1. **Check Individual Nodes**
   ```bash
   node dist/index.js validate workflow.json
   ```

2. **Run Tests Only**
   ```bash
   node dist/index.js test workflow.json
   ```

3. **Review Detailed Report**
   - Open the generated markdown report
   - Look for "Detailed Findings" section
   - Follow recommendations

## Advanced Testing

### Custom Assertions

While the agent generates assertions automatically, understanding them helps:

```typescript
// Existence check
{ type: "exists", path: "json.userId", expected: true }

// Value check
{ type: "equals", path: "json.status", expected: "success" }

// Type check
{ type: "type", path: "json.timestamp", expected: "string" }

// Contains check
{ type: "contains", path: "json.message", expected: "processed" }
```

### Multi-Path Testing

For workflows with branches:

```
Webhook
  ├─ IF (condition 1) → Path A → ...
  └─ ELSE (condition 2) → Path B → ...
```

The agent tests **both** paths independently.

## Summary

The testing system ensures:

- ✅ All nodes are properly configured
- ✅ Data can flow through all paths
- ✅ Error handling is adequate
- ✅ Security issues are caught
- ✅ Edge cases are considered

**Remember:** Passing tests means your workflow is correctly configured, but always test with real data in a staging environment before production deployment.
