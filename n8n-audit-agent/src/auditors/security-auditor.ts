/**
 * Security auditor - checks for security issues and credential problems
 */

import { N8nWorkflow, N8nNode } from '../types/workflow.js';
import { AuditIssue } from '../types/audit.js';

export class SecurityAuditor {
  /**
   * Perform security audit on workflow
   */
  async audit(workflow: N8nWorkflow): Promise<AuditIssue[]> {
    const issues: AuditIssue[] = [];

    // Check each node for security issues
    workflow.nodes.forEach(node => {
      issues.push(...this.auditNode(node));
    });

    // Check workflow-level security
    issues.push(...this.auditWorkflowSecurity(workflow));

    return issues;
  }

  /**
   * Audit individual node for security issues
   */
  private auditNode(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check for hardcoded credentials/secrets
    issues.push(...this.checkHardcodedSecrets(node));

    // Check webhook security
    if (node.type.includes('webhook')) {
      issues.push(...this.auditWebhookSecurity(node));
    }

    // Check HTTP request security
    if (node.type.includes('httpRequest')) {
      issues.push(...this.auditHttpRequestSecurity(node));
    }

    // Check function code security
    if (node.type.includes('function') || node.type.includes('code')) {
      issues.push(...this.auditCodeSecurity(node));
    }

    // Check credentials configuration
    issues.push(...this.auditCredentials(node));

    return issues;
  }

  /**
   * Check for hardcoded secrets in node parameters
   */
  private checkHardcodedSecrets(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const suspiciousPatterns = [
      { pattern: /api[_-]?key/i, name: 'API key' },
      { pattern: /secret/i, name: 'secret' },
      { pattern: /password/i, name: 'password' },
      { pattern: /token/i, name: 'token' },
      { pattern: /auth/i, name: 'auth' },
      { pattern: /bearer/i, name: 'bearer token' },
      { pattern: /sk-[a-zA-Z0-9]{20,}/i, name: 'OpenAI API key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/i, name: 'GitHub token' },
      { pattern: /xox[baprs]-[a-zA-Z0-9-]+/i, name: 'Slack token' },
    ];

    const paramString = JSON.stringify(node.parameters);

    suspiciousPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(paramString)) {
        // Check if it's in a parameter name or value
        Object.entries(node.parameters).forEach(([key, value]) => {
          const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

          if (pattern.test(key) || pattern.test(valueStr)) {
            // Check if it looks like an actual secret (not just the word "password")
            if (this.looksLikeSecret(key, valueStr)) {
              issues.push({
                id: `node-${node.id}-hardcoded-${name.replace(/\s/g, '-')}`,
                severity: 'critical',
                category: 'security',
                nodeId: node.id,
                nodeName: node.name,
                title: `Potential hardcoded ${name}`,
                description: `Node "${node.name}" may contain a hardcoded ${name} in parameter "${key}"`,
                recommendation: 'Use credentials or environment variables instead of hardcoding secrets',
                location: `${node.name} (${node.type})`,
              });
            }
          }
        });
      }
    });

    return issues;
  }

  /**
   * Check if a value looks like an actual secret
   */
  private looksLikeSecret(key: string, value: string): boolean {
    // If the value is an expression ({{...}}), it's probably safe
    if (value.includes('{{') && value.includes('}}')) {
      return false;
    }

    // If it's too short, probably not a secret
    if (value.length < 8) {
      return false;
    }

    // If it contains spaces, probably not a secret
    if (value.includes(' ')) {
      return false;
    }

    // If it's just the word "password", "token", etc., not a secret
    if (/^(password|token|secret|apikey|auth)$/i.test(value)) {
      return false;
    }

    // If it has mixed case and numbers/special chars, likely a secret
    const hasMixedCase = /[a-z]/.test(value) && /[A-Z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z0-9]/.test(value);

    return hasMixedCase || (hasNumbers && value.length > 16) || hasSpecial;
  }

  /**
   * Audit webhook security
   */
  private auditWebhookSecurity(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check authentication method
    const authMethod = node.parameters.authentication || node.parameters.webhookAuth;

    if (!authMethod || authMethod === 'none') {
      issues.push({
        id: `node-${node.id}-webhook-no-auth`,
        severity: 'high',
        category: 'security',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Webhook without authentication',
        description: `Webhook "${node.name}" has no authentication configured`,
        recommendation: 'Configure webhook authentication (header auth, basic auth, etc.) to prevent unauthorized access',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check for HTTPS requirement
    const responseMode = node.parameters.responseMode;
    if (responseMode === 'onReceived') {
      issues.push({
        id: `node-${node.id}-webhook-response-mode`,
        severity: 'low',
        category: 'security',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Webhook responds immediately',
        description: `Webhook "${node.name}" responds before workflow completion`,
        recommendation: 'Consider security implications of immediate response vs waiting for workflow completion',
        location: `${node.name} (${node.type})`,
      });
    }

    return issues;
  }

  /**
   * Audit HTTP request security
   */
  private auditHttpRequestSecurity(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    const url = node.parameters.url as string;

    // Check for HTTP instead of HTTPS
    if (url && url.startsWith('http://') && !url.includes('localhost')) {
      issues.push({
        id: `node-${node.id}-http-not-https`,
        severity: 'medium',
        category: 'security',
        nodeId: node.id,
        nodeName: node.name,
        title: 'HTTP instead of HTTPS',
        description: `HTTP Request "${node.name}" uses insecure HTTP protocol`,
        recommendation: 'Use HTTPS for secure communication',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check SSL verification
    const ignoreSSL = node.parameters.ignoreSSLIssues;
    if (ignoreSSL) {
      issues.push({
        id: `node-${node.id}-ignore-ssl`,
        severity: 'high',
        category: 'security',
        nodeId: node.id,
        nodeName: node.name,
        title: 'SSL verification disabled',
        description: `HTTP Request "${node.name}" ignores SSL certificate errors`,
        recommendation: 'Enable SSL verification to prevent man-in-the-middle attacks',
        location: `${node.name} (${node.type})`,
      });
    }

    return issues;
  }

  /**
   * Audit code/function node security
   */
  private auditCodeSecurity(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const code = node.parameters.functionCode as string || node.parameters.code as string || '';

    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /eval\(/i, name: 'eval()' },
      { pattern: /Function\(/i, name: 'Function constructor' },
      { pattern: /exec\(/i, name: 'exec()' },
      { pattern: /require\(['"]child_process['"]\)/i, name: 'child_process' },
      { pattern: /process\.env/i, name: 'process.env access' },
      { pattern: /fs\./i, name: 'filesystem access' },
    ];

    dangerousPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(code)) {
        const severity = ['eval()', 'Function constructor', 'exec()'].includes(name) ? 'high' : 'medium';

        issues.push({
          id: `node-${node.id}-dangerous-${name.replace(/[^a-z0-9]/gi, '-')}`,
          severity: severity as 'high' | 'medium',
          category: 'security',
          nodeId: node.id,
          nodeName: node.name,
          title: `Potentially dangerous code: ${name}`,
          description: `Function node "${node.name}" uses potentially dangerous operation: ${name}`,
          recommendation: 'Review the code for security implications and consider safer alternatives',
          location: `${node.name} (${node.type})`,
        });
      }
    });

    // Check for SQL-like operations without parameterization
    if (/SELECT|INSERT|UPDATE|DELETE/i.test(code) && code.includes('+')) {
      issues.push({
        id: `node-${node.id}-potential-sql-injection`,
        severity: 'high',
        category: 'security',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Potential SQL injection risk',
        description: `Function node "${node.name}" may be vulnerable to SQL injection`,
        recommendation: 'Use parameterized queries instead of string concatenation',
        location: `${node.name} (${node.type})`,
      });
    }

    return issues;
  }

  /**
   * Audit credential configuration
   */
  private auditCredentials(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    if (node.credentials) {
      Object.entries(node.credentials).forEach(([credType, credInfo]) => {
        // Check if credential ID looks valid
        if (!credInfo.id || credInfo.id === '') {
          issues.push({
            id: `node-${node.id}-invalid-credential-${credType}`,
            severity: 'critical',
            category: 'credentials',
            nodeId: node.id,
            nodeName: node.name,
            title: 'Invalid credential reference',
            description: `Node "${node.name}" has invalid ${credType} credential reference`,
            recommendation: 'Configure valid credentials for this node',
            location: `${node.name} (${node.type})`,
          });
        }
      });
    }

    return issues;
  }

  /**
   * Audit workflow-level security
   */
  private auditWorkflowSecurity(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check if workflow is active with webhooks but no auth
    if (workflow.active) {
      const webhooks = workflow.nodes.filter(n => n.type.includes('webhook'));
      const unauthenticatedWebhooks = webhooks.filter(w => {
        const auth = w.parameters.authentication || w.parameters.webhookAuth;
        return !auth || auth === 'none';
      });

      if (unauthenticatedWebhooks.length > 0) {
        issues.push({
          id: 'workflow-active-unauthenticated-webhooks',
          severity: 'high',
          category: 'security',
          title: 'Active workflow with unauthenticated webhooks',
          description: 'Workflow is active and contains webhooks without authentication',
          recommendation: 'Add authentication to all webhooks or deactivate the workflow',
        });
      }
    }

    // Check for credential sharing between different services
    const credentialUsage = new Map<string, string[]>();
    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(cred => {
          if (!credentialUsage.has(cred.id)) {
            credentialUsage.set(cred.id, []);
          }
          credentialUsage.get(cred.id)!.push(node.type);
        });
      }
    });

    credentialUsage.forEach((nodeTypes, credId) => {
      const uniqueTypes = new Set(nodeTypes);
      if (uniqueTypes.size > 1) {
        issues.push({
          id: `credential-${credId}-shared`,
          severity: 'medium',
          category: 'security',
          title: 'Credential shared across different node types',
          description: `Credential ${credId} is used by multiple node types: ${Array.from(uniqueTypes).join(', ')}`,
          recommendation: 'Review if this credential sharing is intentional',
        });
      }
    });

    return issues;
  }
}
