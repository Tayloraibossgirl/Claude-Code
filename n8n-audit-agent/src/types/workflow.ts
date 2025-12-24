/**
 * Core type definitions for n8n workflows
 */

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active?: boolean;
  settings?: WorkflowSettings;
  staticData?: Record<string, unknown>;
  tags?: Array<{ id: string; name: string }>;
  pinData?: Record<string, unknown>;
  versionId?: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, NodeCredential>;
  disabled?: boolean;
  notesInFlow?: boolean;
  notes?: string;
  webhookId?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  onError?: 'continueErrorOutput' | 'continueRegularOutput' | 'stopWorkflow';
}

export interface NodeCredential {
  id: string;
  name: string;
}

export interface N8nConnections {
  [key: string]: {
    [key: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
}

export type NodeType =
  | 'trigger'
  | 'action'
  | 'webhook'
  | 'transform'
  | 'conditional'
  | 'error';

export interface NodeMetadata {
  type: NodeType;
  requiredParams: string[];
  optionalParams: string[];
  requiresCredentials: boolean;
  canFail: boolean;
  isAsync: boolean;
}
