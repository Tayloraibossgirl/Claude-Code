# Fallback & Error Handling Guide

This guide explains how the n8n Workflow Audit Agent analyzes and documents error handling and fallback mechanisms in your workflows.

## Why Error Handling Matters

n8n workflows often interact with external services that can fail:
- API rate limits
- Network timeouts
- Service outages
- Invalid data
- Authentication errors

**Without proper error handling, a single failure can:**
- Stop your entire workflow
- Lose important data
- Miss critical notifications
- Require manual intervention

## Error Handling Mechanisms

### 1. Error Workflow

A separate workflow that runs when the main workflow fails.

**Configuration:**
```json
{
  "settings": {
    "errorWorkflow": "workflow-id-here"
  }
}
```

**When to use:**
- Centralized error logging
- Send failure notifications
- Rollback operations
- Alert on-call engineers

**Example error workflow:**
```
Error Trigger
  → Log to Database
  → Send Slack Alert
  → Create Ticket
```

**Audit checks:**
- ✅ Error workflow ID is valid
- ✅ Error workflow exists
- ⚠️ Error workflow itself has error handling

### 2. Continue On Fail

Node continues to next node even if it fails.

**Configuration:**
```json
{
  "continueOnFail": true
}
```

**When to use:**
- Non-critical operations (analytics, logging)
- Optional enrichment
- Best-effort operations

**⚠️ Important:** Always add downstream error checking!

**Good pattern:**
```
API Call (continueOnFail: true)
  → IF Node (check for errors)
    ├─ Success path
    └─ Error path (handle failure)
```

**Bad pattern:**
```
API Call (continueOnFail: true)
  → Next Node (assumes success)
```

**Audit checks:**
- ✅ Downstream IF/Switch node exists
- ❌ No error checking after continue-on-fail
- ⚠️ Multiple nodes with continue-on-fail in sequence

### 3. Retry On Fail

Automatically retries the node if it fails.

**Configuration:**
```json
{
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}
```

**When to use:**
- Transient failures (network issues)
- Rate-limited APIs
- Eventually consistent systems
- Database operations

**Best practices:**

**✅ Good retry config:**
```json
{
  "retryOnFail": true,
  "maxTries": 3,          // 3-5 attempts
  "waitBetweenTries": 2000 // 2-5 seconds
}
```

**❌ Bad retry config:**
```json
{
  "retryOnFail": true,
  "maxTries": 20,         // Too many
  "waitBetweenTries": 100 // Too fast
}
```

**Audit checks:**
- ⚠️ More than 10 retry attempts (excessive)
- ⚠️ Less than 2 retry attempts (insufficient)
- ⚠️ Wait time less than 1000ms (too fast)
- ℹ️ Consider exponential backoff for HTTP requests

### 4. Error Output

Connect the error output to handle failures explicitly.

**How it works:**
```
API Call
  ├─ Success Output (index 0) → Success Path
  └─ Error Output (index 1) → Error Handler
```

**Configuration in JSON:**
```json
{
  "connections": {
    "API Call": {
      "main": [
        [{ "node": "Success Handler", "type": "main", "index": 0 }],
        [{ "node": "Error Handler", "type": "main", "index": 1 }]
      ]
    }
  }
}
```

**When to use:**
- Critical operations that need explicit error handling
- Operations requiring rollback
- When you need to transform error data

**Audit checks:**
- ✅ Error output is connected
- ⚠️ Critical node without error output
- ℹ️ Error output connected to logging node

## Fallback Analysis Matrix

The audit agent generates a comprehensive matrix for each node:

### Example Matrix

| Node | Error Workflow | Continue On Fail | Retry | Error Output | Status |
|------|----------------|------------------|-------|--------------|--------|
| Webhook | ✅ | ❌ | ❌ | ❌ | ✅ OK |
| Validate Data | ✅ | ❌ | ❌ | ✅ | ✅ OK |
| API Call | ✅ | ❌ | ✅ (3x, 2000ms) | ❌ | ✅ OK |
| Log Event | ✅ | ✅ | ❌ | ❌ | ✅ OK |
| Transform | ❌ | ❌ | ❌ | ❌ | ⚠️ No Handling |

### Understanding the Matrix

**✅ OK Status:**
- At least one error handling mechanism configured
- Configuration is appropriate for node type
- No issues detected

**⚠️ No Handling Status:**
- No error handling configured
- Node can fail and stop workflow
- Requires attention

### Column Meanings

**Error Workflow:**
- ✅ = Workflow-level error workflow configured
- ❌ = No error workflow

**Continue On Fail:**
- ✅ = Enabled
- ❌ = Disabled

**Retry:**
- ✅ (Nx, Xms) = Enabled with N attempts, X milliseconds wait
- ❌ = Disabled

**Error Output:**
- ✅ = Error output connected to another node
- ❌ = Not connected

## Critical vs Non-Critical Nodes

The agent classifies nodes as critical or non-critical:

### Critical Nodes (Require Error Handling)

**Always Critical:**
- Webhooks (entry points)
- Triggers (workflow starters)
- Database operations (data integrity)
- Payment processing (financial)
- Email sending (notifications)

**Example:**
```json
{
  "name": "Process Payment",
  "type": "n8n-nodes-base.stripe",
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}
```

### Non-Critical Nodes (Optional Error Handling)

**Examples:**
- Analytics tracking
- Optional logging
- UI updates
- Cache warming

**Example:**
```json
{
  "name": "Track Analytics",
  "type": "n8n-nodes-base.httpRequest",
  "continueOnFail": true
}
```

## Error Handling Strategies

### Strategy 1: Retry with Fallback

**Use case:** API calls that might have transient failures

```
API Call
  - retryOnFail: true
  - maxTries: 3
  - waitBetweenTries: 2000
  - Error Output → Fallback API Call
```

**Benefits:**
- Handles transient failures automatically
- Falls back to alternative if all retries fail
- No data loss

### Strategy 2: Continue with Error Checking

**Use case:** Non-critical operations that shouldn't block workflow

```
Optional API Call
  - continueOnFail: true
    → IF Node (check for error)
      ├─ Success → Process Result
      └─ Error → Log and Continue
```

**Benefits:**
- Workflow continues regardless
- Errors are logged but don't block
- Downstream nodes handle both cases

### Strategy 3: Global Error Workflow

**Use case:** Centralized error handling for all failures

```
Workflow Settings:
  - errorWorkflow: "global-error-handler"

Global Error Handler:
  → Extract Error Info
  → Log to Database
  → Send Alert
  → Create Incident
```

**Benefits:**
- Consistent error handling
- Central monitoring
- Easy to update error logic

### Strategy 4: Hybrid Approach

**Use case:** Most production workflows

```
Critical API Call
  - retryOnFail: true (handle transient failures)
  - Error Output → Error Handler (explicit handling)
  - Error Workflow configured (last resort)

Error Handler:
  → Log Error
  → Attempt Rollback
  → Send Notification
```

**Benefits:**
- Multiple layers of protection
- Graceful degradation
- Comprehensive error coverage

## Common Patterns

### Pattern: API Call with Retry

```json
{
  "name": "Call External API",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com/data",
    "method": "POST"
  },
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 2000
}
```

**What the audit checks:**
- ✅ Retry is enabled
- ✅ Retry count is reasonable (3-5)
- ✅ Wait time is appropriate (1000-5000ms)
- ℹ️ Consider exponential backoff

### Pattern: Non-Critical Operation

```json
{
  "name": "Track Analytics",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://analytics.example.com/event"
  },
  "continueOnFail": true
}
```

**What the audit checks:**
- ⚠️ No downstream error checking
- 💡 Recommendation: Add IF node to verify success

### Pattern: Database Operation

```json
{
  "name": "Insert to Database",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "insert"
  },
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000,
  "continueOnFail": false
}
```

**What the audit checks:**
- ✅ Retry enabled for database reliability
- ✅ Continue-on-fail disabled (data integrity)
- ✅ Reasonable retry configuration

## Recommendations by Severity

### 🔴 Critical Issues

**"Critical node without error handling"**
```
Node: Process Payment
Severity: Critical
Recommendation: Add retry logic and error workflow
```

**Action:** Fix immediately before deploying to production.

### 🟠 High Issues

**"No error handling configured"**
```
Node: Send Email
Severity: High
Recommendation: Enable retry or configure error workflow
```

**Action:** Fix before next deployment.

### 🟡 Medium Issues

**"Continue on fail without error checking"**
```
Node: Update Cache
Severity: Medium
Recommendation: Add IF node downstream to check for errors
```

**Action:** Fix in next maintenance window.

### 🔵 Low Issues

**"Short wait between retries"**
```
Node: API Call
Severity: Low
Current: 100ms
Recommendation: Increase to 1000-2000ms
```

**Action:** Improve when convenient.

## Testing Error Handling

### What the Agent Tests

1. **Retry Configuration Validation**
   ```
   ✅ Retry attempts: 3 (recommended: 3-5)
   ✅ Wait time: 2000ms (recommended: 1000-5000ms)
   ```

2. **Continue-on-Fail Validation**
   ```
   ⚠️ Continue-on-fail enabled but no downstream error check
   Recommendation: Add IF or Switch node after this node
   ```

3. **Error Workflow Validation**
   ```
   ℹ️ Error workflow configured: workflow-abc123
   Recommendation: Ensure error workflow is tested
   ```

4. **Error Output Validation**
   ```
   ✅ Error output connected to: Error Handler
   ```

## Best Practices Summary

### ✅ DO:

1. **Add retry to all API calls**
   ```json
   { "retryOnFail": true, "maxTries": 3, "waitBetweenTries": 2000 }
   ```

2. **Use error outputs for critical operations**
   ```
   Payment Processing → [Success] / [Error → Rollback]
   ```

3. **Configure global error workflow**
   ```json
   { "settings": { "errorWorkflow": "error-handler-id" } }
   ```

4. **Check errors after continue-on-fail**
   ```
   API Call (continueOnFail) → IF (check error) → Handle
   ```

5. **Save error execution data**
   ```json
   { "settings": { "saveDataErrorExecution": "all" } }
   ```

### ❌ DON'T:

1. **Don't use excessive retries**
   ```json
   { "maxTries": 20 } // Too many!
   ```

2. **Don't retry too quickly**
   ```json
   { "waitBetweenTries": 100 } // Too fast!
   ```

3. **Don't ignore critical node errors**
   ```json
   // Missing error handling on payment node
   ```

4. **Don't use continue-on-fail without checking**
   ```
   API Call (continueOnFail) → Next Node // No error check!
   ```

5. **Don't disable error data retention**
   ```json
   { "settings": { "saveDataErrorExecution": "none" } } // Can't debug!
   ```

## Report Interpretation

### Example Fallback Report Section

```markdown
## Error Handling & Fallback Analysis

| Node | Error Workflow | Continue On Fail | Retry | Error Output | Status |
|------|----------------|------------------|-------|--------------|--------|
| Webhook | ✅ | ❌ | ❌ | ❌ | ✅ OK |
| Process Data | ✅ | ✅ | ❌ | ❌ | ✅ OK |
| Send to API | ✅ | ❌ | ✅ (3x, 2000ms) | ✅ | ✅ OK |
| Transform | ❌ | ❌ | ❌ | ❌ | ⚠️ No Handling |

⚠️ **Nodes without error handling:**
- **Transform**: Add at least one error handling mechanism
```

**What this tells you:**
- 3/4 nodes have adequate error handling
- 1 node (Transform) needs attention
- Error workflow provides baseline protection
- Send to API has the most robust handling

## Next Steps

1. Review the fallback matrix in your audit report
2. Fix nodes with "⚠️ No Handling" status
3. Improve configurations with warnings
4. Test error scenarios
5. Re-run audit to verify improvements

---

**Remember:** Every production workflow should have error handling. Don't let n8n's "success" message fool you - test for failures!
