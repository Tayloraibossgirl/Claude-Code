/**
 * Configuration validator - validates node and workflow configurations
 */

import { N8nWorkflow, N8nNode } from '../types/workflow.js';
import { AuditIssue } from '../types/audit.js';
import { WorkflowParser } from '../utils/workflow-parser.js';

export class ConfigValidator {
  private parser: WorkflowParser;

  constructor() {
    this.parser = new WorkflowParser();
  }

  /**
   * Validate entire workflow configuration
   */
  async validate(workflow: N8nWorkflow): Promise<AuditIssue[]> {
    const issues: AuditIssue[] = [];

    // Validate workflow-level settings
    issues.push(...this.validateWorkflowSettings(workflow));

    // Validate each node
    workflow.nodes.forEach(node => {
      issues.push(...this.validateNode(workflow, node));
    });

    // Validate connections
    issues.push(...this.validateConnections(workflow));

    // Validate execution flow
    issues.push(...this.validateExecutionFlow(workflow));

    return issues;
  }

  /**
   * Validate workflow-level settings
   */
  private validateWorkflowSettings(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Check if workflow has a name
    if (!workflow.name || workflow.name.trim() === '') {
      issues.push({
        id: 'workflow-no-name',
        severity: 'medium',
        category: 'configuration',
        title: 'Workflow has no name',
        description: 'The workflow does not have a meaningful name',
        recommendation: 'Add a descriptive name to help identify the workflow purpose',
      });
    }

    // Check if workflow has any nodes
    if (workflow.nodes.length === 0) {
      issues.push({
        id: 'workflow-no-nodes',
        severity: 'critical',
        category: 'configuration',
        title: 'Workflow has no nodes',
        description: 'The workflow contains no nodes and cannot execute',
        recommendation: 'Add nodes to the workflow to define its functionality',
      });
    }

    // Check for trigger nodes
    const triggers = this.parser.getTriggerNodes(workflow);
    if (triggers.length === 0 && this.parser.getWebhookNodes(workflow).length === 0) {
      issues.push({
        id: 'workflow-no-trigger',
        severity: 'high',
        category: 'configuration',
        title: 'No trigger or webhook found',
        description: 'Workflow has no way to be triggered automatically',
        recommendation: 'Add a trigger node (cron, webhook, etc.) or ensure manual execution is intended',
      });
    }

    // Check if error workflow is configured but exists
    if (workflow.settings?.errorWorkflow) {
      issues.push({
        id: 'error-workflow-configured',
        severity: 'info',
        category: 'error-handling',
        title: 'Error workflow configured',
        description: `Error workflow ID: ${workflow.settings.errorWorkflow}`,
        recommendation: 'Ensure the referenced error workflow exists and is properly configured',
      });
    }

    // Check execution order setting
    if (!workflow.settings?.executionOrder) {
      issues.push({
        id: 'execution-order-not-set',
        severity: 'low',
        category: 'configuration',
        title: 'Execution order not explicitly set',
        description: 'The workflow execution order is using default settings',
        recommendation: 'Explicitly set executionOrder to "v1" for predictable behavior',
      });
    }

    return issues;
  }

  /**
   * Validate individual node configuration
   */
  private validateNode(workflow: N8nWorkflow, node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const metadata = this.parser.getNodeMetadata(node);

    // Check for disabled nodes
    if (node.disabled) {
      issues.push({
        id: `node-${node.id}-disabled`,
        severity: 'info',
        category: 'configuration',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Node is disabled',
        description: `Node "${node.name}" is disabled and will not execute`,
        recommendation: 'Enable the node or remove it if no longer needed',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check for missing required parameters
    metadata.requiredParams.forEach(param => {
      if (!(param in node.parameters) || node.parameters[param] === '' || node.parameters[param] === null) {
        issues.push({
          id: `node-${node.id}-missing-${param}`,
          severity: 'critical',
          category: 'configuration',
          nodeId: node.id,
          nodeName: node.name,
          title: 'Missing required parameter',
          description: `Node "${node.name}" is missing required parameter: ${param}`,
          recommendation: `Configure the "${param}" parameter for this node`,
          location: `${node.name} (${node.type})`,
        });
      }
    });

    // Check for missing credentials when required
    if (metadata.requiresCredentials && (!node.credentials || Object.keys(node.credentials).length === 0)) {
      issues.push({
        id: `node-${node.id}-no-credentials`,
        severity: 'critical',
        category: 'credentials',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Missing credentials',
        description: `Node "${node.name}" requires credentials but none are configured`,
        recommendation: 'Configure the required credentials for this node',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check for nodes without error handling
    if (metadata.canFail && !node.continueOnFail && !node.retryOnFail && !workflow.settings?.errorWorkflow) {
      issues.push({
        id: `node-${node.id}-no-error-handling`,
        severity: 'medium',
        category: 'error-handling',
        nodeId: node.id,
        nodeName: node.name,
        title: 'No error handling configured',
        description: `Node "${node.name}" can fail but has no error handling`,
        recommendation: 'Enable "Continue On Fail", "Retry On Fail", or configure an error workflow',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check HTTP Request nodes for hardcoded URLs
    if (node.type.includes('httpRequest') || node.type.includes('webhook')) {
      const url = node.parameters.url as string;
      if (url && url.includes('localhost')) {
        issues.push({
          id: `node-${node.id}-localhost-url`,
          severity: 'high',
          category: 'configuration',
          nodeId: node.id,
          nodeName: node.name,
          title: 'Localhost URL detected',
          description: `Node "${node.name}" uses localhost URL which may not work in production`,
          recommendation: 'Use environment variables or workflow variables for URLs',
          location: `${node.name} (${node.type})`,
        });
      }
    }

    // Check Function nodes for potential issues
    if (node.type.includes('function') || node.type.includes('code')) {
      issues.push(...this.validateFunctionNode(node));
    }

    return issues;
  }

  /**
   * Validate Function/Code nodes
   */
  private validateFunctionNode(node: N8nNode): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const code = node.parameters.functionCode as string || node.parameters.code as string;

    if (!code || code.trim() === '') {
      issues.push({
        id: `node-${node.id}-empty-code`,
        severity: 'critical',
        category: 'configuration',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Empty function code',
        description: `Function node "${node.name}" has no code`,
        recommendation: 'Add function code or remove the node',
        location: `${node.name} (${node.type})`,
      });
    }

    // Check for console.log (should use workflow logging)
    if (code && code.includes('console.log')) {
      issues.push({
        id: `node-${node.id}-console-log`,
        severity: 'low',
        category: 'best-practices',
        nodeId: node.id,
        nodeName: node.name,
        title: 'Console.log detected in function',
        description: `Function node "${node.name}" uses console.log`,
        recommendation: 'Use $node or $workflow logging methods instead',
        location: `${node.name} (${node.type})`,
      });
    }

    return issues;
  }

  /**
   * Validate workflow connections
   */
  private validateConnections(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const nodeNames = new Set(workflow.nodes.map(n => n.name));

    // Check for orphaned nodes (no inputs or outputs)
    workflow.nodes.forEach(node => {
      const hasInputs = this.parser.getUpstreamNodes(workflow, node.name).length > 0;
      const hasOutputs = this.parser.getDownstreamNodes(workflow, node.id).length > 0;
      const isTrigger = this.parser.getNodeType(node) === 'trigger' || this.parser.getNodeType(node) === 'webhook';

      if (!hasInputs && !isTrigger && !hasOutputs) {
        issues.push({
          id: `node-${node.id}-orphaned`,
          severity: 'high',
          category: 'configuration',
          nodeId: node.id,
          nodeName: node.name,
          title: 'Orphaned node',
          description: `Node "${node.name}" has no connections`,
          recommendation: 'Connect this node to the workflow or remove it',
          location: `${node.name} (${node.type})`,
        });
      }

      if (!hasOutputs && this.parser.getNodeType(node) !== 'error') {
        issues.push({
          id: `node-${node.id}-no-outputs`,
          severity: 'medium',
          category: 'configuration',
          nodeId: node.id,
          nodeName: node.name,
          title: 'Node has no outputs',
          description: `Node "${node.name}" is not connected to any downstream nodes`,
          recommendation: 'Ensure this is intentional or connect to downstream nodes',
          location: `${node.name} (${node.type})`,
        });
      }
    });

    // Check for broken connections
    Object.entries(workflow.connections).forEach(([sourceNode, outputs]) => {
      if (!nodeNames.has(sourceNode)) {
        issues.push({
          id: `connection-broken-source-${sourceNode}`,
          severity: 'critical',
          category: 'configuration',
          title: 'Broken connection - source node missing',
          description: `Connection references non-existent source node: ${sourceNode}`,
          recommendation: 'Remove the broken connection or add the missing node',
        });
      }

      Object.values(outputs).forEach(connections => {
        connections.forEach(connList => {
          connList.forEach(conn => {
            if (!nodeNames.has(conn.node)) {
              issues.push({
                id: `connection-broken-target-${conn.node}`,
                severity: 'critical',
                category: 'configuration',
                title: 'Broken connection - target node missing',
                description: `Connection from "${sourceNode}" references non-existent target: ${conn.node}`,
                recommendation: 'Remove the broken connection or add the missing node',
              });
            }
          });
        });
      });
    });

    return issues;
  }

  /**
   * Validate execution flow
   */
  private validateExecutionFlow(workflow: N8nWorkflow): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const paths = this.parser.getExecutionPaths(workflow);

    if (paths.length === 0) {
      issues.push({
        id: 'workflow-no-execution-path',
        severity: 'critical',
        category: 'configuration',
        title: 'No execution paths found',
        description: 'The workflow has no valid execution paths from trigger to completion',
        recommendation: 'Ensure nodes are properly connected from trigger to end',
      });
    }

    // Check for very long paths (potential performance issue)
    paths.forEach((path, index) => {
      if (path.length > 20) {
        issues.push({
          id: `execution-path-${index}-too-long`,
          severity: 'medium',
          category: 'performance',
          title: 'Very long execution path',
          description: `Execution path ${index + 1} has ${path.length} nodes`,
          recommendation: 'Consider breaking this workflow into sub-workflows for better maintainability',
        });
      }
    });

    // Check for circular references
    if (this.hasCircularReferences(workflow)) {
      issues.push({
        id: 'workflow-circular-reference',
        severity: 'high',
        category: 'configuration',
        title: 'Circular reference detected',
        description: 'The workflow may contain circular references that could cause infinite loops',
        recommendation: 'Review workflow connections to remove circular dependencies',
      });
    }

    return issues;
  }

  /**
   * Check for circular references in workflow
   */
  private hasCircularReferences(workflow: N8nWorkflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeName: string): boolean => {
      visited.add(nodeName);
      recursionStack.add(nodeName);

      const connections = workflow.connections[nodeName];
      if (connections) {
        for (const outputs of Object.values(connections)) {
          for (const connList of outputs) {
            for (const conn of connList) {
              if (!visited.has(conn.node)) {
                if (hasCycle(conn.node)) return true;
              } else if (recursionStack.has(conn.node)) {
                return true;
              }
            }
          }
        }
      }

      recursionStack.delete(nodeName);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.name)) {
        if (hasCycle(node.name)) return true;
      }
    }

    return false;
  }
}
