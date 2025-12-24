/**
 * Workflow parser - loads and validates n8n workflow JSON files
 */

import { readFile } from 'fs/promises';
import { N8nWorkflow, N8nNode, NodeMetadata, NodeType } from '../types/workflow.js';

export class WorkflowParser {
  /**
   * Load workflow from JSON file
   */
  async loadWorkflow(filePath: string): Promise<N8nWorkflow> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content) as N8nWorkflow;

      // Basic validation
      if (!workflow.name) {
        throw new Error('Workflow must have a name');
      }
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        throw new Error('Workflow must have a nodes array');
      }
      if (!workflow.connections) {
        throw new Error('Workflow must have a connections object');
      }

      return workflow;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in workflow file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get node type classification
   */
  getNodeType(node: N8nNode): NodeType {
    const nodeType = node.type.toLowerCase();

    if (nodeType.includes('trigger') || nodeType.includes('cron')) {
      return 'trigger';
    }
    if (nodeType.includes('webhook')) {
      return 'webhook';
    }
    if (nodeType.includes('if') || nodeType.includes('switch') || nodeType.includes('merge')) {
      return 'conditional';
    }
    if (nodeType.includes('set') || nodeType.includes('function') || nodeType.includes('code')) {
      return 'transform';
    }
    if (nodeType.includes('error')) {
      return 'error';
    }

    return 'action';
  }

  /**
   * Get metadata about a node
   */
  getNodeMetadata(node: N8nNode): NodeMetadata {
    const nodeType = this.getNodeType(node);
    const isAsync = !['transform', 'conditional'].includes(nodeType);

    return {
      type: nodeType,
      requiredParams: this.getRequiredParams(node),
      optionalParams: this.getOptionalParams(node),
      requiresCredentials: this.requiresCredentials(node),
      canFail: isAsync,
      isAsync,
    };
  }

  /**
   * Extract required parameters for a node
   */
  private getRequiredParams(node: N8nNode): string[] {
    // This would be enhanced with actual n8n node definitions
    const requiredByType: Record<string, string[]> = {
      'n8n-nodes-base.webhook': ['path', 'httpMethod'],
      'n8n-nodes-base.httpRequest': ['url', 'method'],
      'n8n-nodes-base.set': ['values'],
      'n8n-nodes-base.if': ['conditions'],
      'n8n-nodes-base.function': ['functionCode'],
    };

    return requiredByType[node.type] || [];
  }

  /**
   * Extract optional parameters for a node
   */
  private getOptionalParams(node: N8nNode): string[] {
    return Object.keys(node.parameters).filter(
      key => !this.getRequiredParams(node).includes(key)
    );
  }

  /**
   * Check if node requires credentials
   */
  private requiresCredentials(node: N8nNode): boolean {
    const credentialFreeNodes = [
      'n8n-nodes-base.start',
      'n8n-nodes-base.set',
      'n8n-nodes-base.function',
      'n8n-nodes-base.if',
      'n8n-nodes-base.merge',
      'n8n-nodes-base.switch',
    ];

    return !credentialFreeNodes.includes(node.type);
  }

  /**
   * Get all trigger nodes
   */
  getTriggerNodes(workflow: N8nWorkflow): N8nNode[] {
    return workflow.nodes.filter(node => this.getNodeType(node) === 'trigger');
  }

  /**
   * Get all webhook nodes
   */
  getWebhookNodes(workflow: N8nWorkflow): N8nNode[] {
    return workflow.nodes.filter(node => this.getNodeType(node) === 'webhook');
  }

  /**
   * Get downstream nodes for a given node
   */
  getDownstreamNodes(workflow: N8nWorkflow, nodeId: string): N8nNode[] {
    const connections = workflow.connections[nodeId];
    if (!connections) return [];

    const downstreamIds = new Set<string>();
    Object.values(connections).forEach(outputs => {
      outputs.forEach(connections => {
        connections.forEach(conn => {
          downstreamIds.add(conn.node);
        });
      });
    });

    return workflow.nodes.filter(node => downstreamIds.has(node.name));
  }

  /**
   * Get upstream nodes for a given node
   */
  getUpstreamNodes(workflow: N8nWorkflow, nodeName: string): N8nNode[] {
    const upstreamIds = new Set<string>();

    Object.entries(workflow.connections).forEach(([sourceNode, outputs]) => {
      Object.values(outputs).forEach(connections => {
        connections.forEach(connList => {
          connList.forEach(conn => {
            if (conn.node === nodeName) {
              upstreamIds.add(sourceNode);
            }
          });
        });
      });
    });

    return workflow.nodes.filter(node => upstreamIds.has(node.name));
  }

  /**
   * Check if workflow has any error handling configured
   */
  hasErrorHandling(workflow: N8nWorkflow): boolean {
    return (
      !!workflow.settings?.errorWorkflow ||
      workflow.nodes.some(node => node.continueOnFail || node.retryOnFail)
    );
  }

  /**
   * Get execution paths through the workflow
   */
  getExecutionPaths(workflow: N8nWorkflow): string[][] {
    const paths: string[][] = [];
    const triggers = this.getTriggerNodes(workflow);

    triggers.forEach(trigger => {
      this.tracePaths(workflow, trigger.name, [], paths);
    });

    return paths;
  }

  private tracePaths(
    workflow: N8nWorkflow,
    currentNode: string,
    currentPath: string[],
    allPaths: string[][]
  ): void {
    const newPath = [...currentPath, currentNode];
    const connections = workflow.connections[currentNode];

    if (!connections || Object.keys(connections).length === 0) {
      allPaths.push(newPath);
      return;
    }

    Object.values(connections).forEach(outputs => {
      outputs.forEach(connList => {
        connList.forEach(conn => {
          // Avoid circular references
          if (!newPath.includes(conn.node)) {
            this.tracePaths(workflow, conn.node, newPath, allPaths);
          }
        });
      });
    });
  }
}
