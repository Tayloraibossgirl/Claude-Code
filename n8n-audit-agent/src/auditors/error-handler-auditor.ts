/**
 * Error handler auditor - validates error handling and fallback mechanisms
 */

import { N8nWorkflow, N8nNode } from '../types/workflow.js';
import { AuditIssue, FallbackCheck } from '../types/audit.js';
import { WorkflowParser } from '../utils/workflow-parser.js';

export class ErrorHandlerAuditor {
  private parser: WorkflowParser;

  constructor() {
    this.parser = new WorkflowParser();
  }

  /**
   * Audit error handling across the workflow
   */
  async audit(workflow: N8nWorkflow): Promise<AuditIssue[]> {
    const issues: AuditIssue[] = [];

    // Check workflow-level error handling
    issues.push(...this.auditWorkflowErrorHandling(workflow));

    // Check each node's error handling
    workflow.nodes.forEach(node => {
      issues.push(...this.auditNodeErrorHandling(workflow, node));
    });

    // Check for error workflow configuration
    if (workflow.settings?.errorWorkflow) {
      issues.push(...this.auditErrorWorkflow(workflow));
    }

    return issues;
  }

  /**
   * Get comprehensive fallback check for each node
   */
  getFallbackChecks(workflow: N8nWorkflow): FallbackCheck[] {
    return workflow.nodes
      .filter(node => this.parser.getNodeMetadata(node).canFail)
      .map(node => this.analyzeFallbackMechanisms(workflow, node));
  }

  /**
   * Audit workflow-level error handling
   */
  private auditWorkflowErrorHandling(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check if any error handling is configured
    const hasErrorWorkflow = !!workflow.settings?.errorWorkflow;
    const hasNodeLevelHandling = workflow.nodes.some(
      node => node.continueOnFail || node.retryOnFail
    );

    if (!hasErrorWorkflow && !hasNodeLevelHandling) {
      issues.push({
        id: 'workflow-no-error-handling',
        severity: 'high',
        category: 'error-handling',
        title: 'No error handling configured',
        description: 'Workflow has no error handling at workflow or node level',
        recommendation: 'Configure an error workflow or add error handling to critical nodes',
      });
    }

    // Check execution data retention on error
    if (workflow.settings?.saveDataErrorExecution === 'none') {
      issues.push({
        id: 'workflow-no-error-data-retention',
        severity: 'medium',
        category: 'error-handling',
        title: 'Error execution data not saved',
        description: 'Failed executions will not save data, making debugging difficult',
        recommendation: 'Enable saveDataErrorExecution to retain error data for debugging',
      });
    }

    // Check if manual executions are saved
    if (workflow.settings?.saveManualExecutions === false) {
      issues.push({
        id: 'workflow-no-manual-execution-save',
        severity: 'low',
        category: 'best-practices',
        title: 'Manual executions not saved',
        description: 'Manual test executions will not be saved',
        recommendation: 'Enable saveManualExecutions for better testing and debugging',
      });
    }

    return issues;
  }

  /**
   * Audit individual node error handling
   */
  private auditNodeErrorHandling(workflow: N8nWorkflow, node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const metadata = this.parser.getNodeMetadata(node);

    // Only check nodes that can fail
    if (!metadata.canFail) {
      return issues;
    }

    const hasContinueOnFail = node.continueOnFail === true;
    const hasRetry = node.retryOnFail === true;
    const hasErrorWorkflow = !!workflow.settings?.errorWorkflow;

    // Critical nodes should have some form of error handling
    const isCritical = this.isCriticalNode(node);

    if (isCritical && !hasContinueOnFail && !hasRetry && !hasErrorWorkflow) {
      issues.push({
        id: `node-${node.id}-critical-no-error-handling`,
        severity: 'high',
        category: 'error-handling',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Critical node without error handling',
        description: `Critical node "${node.name}" has no error handling configured`,
        recommendation: 'Add error handling: enable Continue On Fail, Retry On Fail, or configure an error workflow',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check retry configuration
    if (hasRetry) {
      issues.push(...this.auditRetryConfiguration(node));
    }

    // Check if Continue On Fail is used without proper downstream handling
    if (hasContinueOnFail) {
      issues.push(...this.auditContinueOnFailUsage(workflow, node));
    }

    // Check for missing error outputs
    if (!hasContinueOnFail && !hasErrorWorkflow) {
      const hasErrorOutput = this.hasErrorOutputConnection(workflow, node);
      if (!hasErrorOutput && isCritical) {
        issues.push({
          id: `node-${node.id}-no-error-output`,
          severity: 'medium',
          category: 'error-handling',
          nodeId: node.id,
          nodeName: node.name,
          title: 'No error output handling',
          description: `Node "${node.name}" has no error output connected`,
          recommendation: 'Connect error output to handle failures, or enable Continue On Fail',
          location: `${node.name} (${node.type})`,
        });
      }
    }

    return issues;
  }

  /**
   * Audit retry configuration
   */
  private auditRetryConfiguration(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    const maxTries = node.maxTries || 3;
    const waitBetween = node.waitBetweenTries || 1000;

    // Check if retry count is reasonable
    if (maxTries > 10) {
      issues.push({
        id: `node-${node.id}-excessive-retries`,
        severity: 'medium',
        category: 'error-handling',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Excessive retry attempts',
        description: `Node "${node.name}" configured with ${maxTries} retry attempts`,
        recommendation: 'Reduce retry attempts to avoid long-running failures (recommended: 3-5)',
        location: `${node.name} (${node.type})`,
      });
    }

    if (maxTries < 2) {
      issues.push({
        id: `node-${node.id}-insufficient-retries`,
        severity: 'low',
        category: 'error-handling',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Very few retry attempts',
        description: `Node "${node.name}" only retries ${maxTries} time(s)`,
        recommendation: 'Consider increasing retry attempts for transient failures (recommended: 3-5)',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check wait time between retries
    if (waitBetween < 1000) {
      issues.push({
        id: `node-${node.id}-short-retry-wait`,
        severity: 'low',
        category: 'error-handling',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Short wait between retries',
        description: `Node "${node.name}" waits only ${waitBetween}ms between retries`,
        recommendation: 'Increase wait time to avoid overwhelming the service (recommended: 1000-5000ms)',
        location: `${node.name} (${node.type})`,
      });
    }

    // Recommend exponential backoff for HTTP requests
    if (node.type.includes('httpRequest')) {
      issues.push({
        id: `node-${node.id}-no-exponential-backoff`,
        severity: 'info',
        category: 'best-practices',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Consider exponential backoff',
        description: `HTTP request node "${node.name}" uses fixed retry intervals`,
        recommendation: 'Consider implementing exponential backoff for better rate limit handling',
        location: `${node.name} (${node.type})`,
      });
    }

    return issues;
  }

  /**
   * Audit Continue On Fail usage
   */
  private auditContinueOnFailUsage(workflow: N8nWorkflow, node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check if downstream nodes handle the error case
    const downstreamNodes = this.parser.getDownstreamNodes(workflow, node.id);

    if (downstreamNodes.length > 0) {
      const hasErrorChecking = downstreamNodes.some(
        downNode =>
          downNode.type.includes('if') ||
          downNode.type.includes('switch') ||
          downNode.type.includes('function')
      );

      if (!hasErrorChecking) {
        issues.push({
          id: `node-${node.id}-continue-on-fail-no-check`,
          severity: 'medium',
          category: 'error-handling',
          nodeId: node.id,
          nodeName: node.name,
          title: 'Continue On Fail without error checking',
          description: `Node "${node.name}" uses Continue On Fail but downstream nodes don't check for errors`,
          recommendation: 'Add an IF or Switch node downstream to handle error cases',
          location: `${node.name} (${node.type})`,
        });
      }
    }

    return issues;
  }

  /**
   * Audit error workflow configuration
   */
  private auditErrorWorkflow(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];

    issues.push({
      id: 'workflow-has-error-workflow',
      severity: 'info',
      category: 'error-handling',
      title: 'Error workflow configured',
      description: `Error workflow ID: ${workflow.settings?.errorWorkflow}`,
      recommendation: 'Ensure the error workflow is properly tested and handles all error scenarios',
    });

    return issues;
  }

  /**
   * Analyze all fallback mechanisms for a node
   */
  private analyzeFallbackMechanisms(workflow: N8nWorkflow, node: N8nNode): FallbackCheck {
    const hasErrorWorkflow = !!workflow.settings?.errorWorkflow;
    const hasContinueOnFail = node.continueOnFail === true;
    const hasRetry = node.retryOnFail === true;
    const errorOutputConnected = this.hasErrorOutputConnection(workflow, node);

    const recommendations: string[] = [];

    if (!hasErrorWorkflow && !hasContinueOnFail && !hasRetry) {
      recommendations.push('Add at least one error handling mechanism');
    }

    if (hasRetry && (node.maxTries || 3) > 5) {
      recommendations.push('Consider reducing retry attempts to avoid long failures');
    }

    if (hasContinueOnFail && !errorOutputConnected) {
      recommendations.push('Add downstream error checking when using Continue On Fail');
    }

    if (!errorOutputConnected && this.isCriticalNode(node)) {
      recommendations.push('Connect error output for critical nodes');
    }

    return {
      nodeId: node.id,
      nodeName: node.name,
      hasErrorWorkflow,
      hasContinueOnFail,
      hasRetry,
      retryConfig: hasRetry
        ? {
            maxTries: node.maxTries || 3,
            waitBetweenTries: node.waitBetweenTries || 1000,
          }
        : undefined,
      errorOutputConnected,
      recommendations,
    };
  }

  /**
   * Check if node has error output connections
   */
  private hasErrorOutputConnection(workflow: N8nWorkflow, node: N8nNode): boolean {
    const connections = workflow.connections[node.name];
    if (!connections) return false;

    // Check if there's a connection from the error output (usually index 1)
    const outputs = connections['main'];
    if (!outputs) return false;

    // Error output is typically at index 1 (index 0 is success)
    return outputs.length > 1 && outputs[1] && outputs[1].length > 0;
  }

  /**
   * Determine if a node is critical (should have robust error handling)
   */
  private isCriticalNode(node: N8nNode): boolean {
    // Webhook and trigger nodes are critical
    if (node.type.includes('webhook') || node.type.includes('trigger')) {
      return true;
    }

    // Database operations are critical
    if (node.type.includes('postgres') || node.type.includes('mysql') || node.type.includes('mongo')) {
      return true;
    }

    // Payment and financial nodes are critical
    if (node.type.includes('stripe') || node.type.includes('paypal')) {
      return true;
    }

    // Email nodes are often critical
    if (node.type.includes('email') || node.type.includes('gmail') || node.type.includes('smtp')) {
      return true;
    }

    return false;
  }
}
