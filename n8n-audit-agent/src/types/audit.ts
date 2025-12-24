/**
 * Type definitions for audit results and reporting
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AuditIssue {
  id: string;
  severity: SeverityLevel;
  category: AuditCategory;
  nodeId?: string;
  nodeName?: string;
  title: string;
  description: string;
  recommendation: string;
  location?: string;
  metadata?: Record<string, unknown>;
}

export type AuditCategory =
  | 'configuration'
  | 'credentials'
  | 'error-handling'
  | 'security'
  | 'performance'
  | 'data-validation'
  | 'best-practices'
  | 'testing';

export interface AuditResult {
  workflowName: string;
  workflowPath: string;
  timestamp: string;
  duration: number;
  summary: AuditSummary;
  issues: AuditIssue[];
  tests: TestResult[];
  recommendations: string[];
  score: AuditScore;
}

export interface AuditSummary {
  totalNodes: number;
  activeNodes: number;
  disabledNodes: number;
  triggersFound: number;
  webhooksFound: number;
  credentialsUsed: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

export interface AuditScore {
  overall: number; // 0-100
  configuration: number;
  errorHandling: number;
  security: number;
  testing: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  nodeId?: string;
  nodeName?: string;
  message?: string;
  error?: string;
  expectedOutput?: unknown;
  actualOutput?: unknown;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  nodeId: string;
  inputData: unknown;
  expectedOutput?: unknown;
  assertions?: TestAssertion[];
}

export interface TestAssertion {
  type: 'exists' | 'equals' | 'contains' | 'matches' | 'type';
  path: string;
  expected: unknown;
}

export interface FallbackCheck {
  nodeId: string;
  nodeName: string;
  hasErrorWorkflow: boolean;
  hasContinueOnFail: boolean;
  hasRetry: boolean;
  retryConfig?: {
    maxTries: number;
    waitBetweenTries: number;
  };
  errorOutputConnected: boolean;
  recommendations: string[];
}
