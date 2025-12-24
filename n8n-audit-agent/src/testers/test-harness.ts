/**
 * Test harness - simulates workflow execution and validates results
 */

import { N8nWorkflow, N8nNode } from '../types/workflow.js';
import { TestResult, TestCase, TestAssertion } from '../types/audit.js';
import { WorkflowParser } from '../utils/workflow-parser.js';

export interface TestConfig {
  generateTests?: boolean;
  testData?: Record<string, unknown>;
  skipNodes?: string[];
  timeout?: number;
}

export class TestHarness {
  private parser: WorkflowParser;

  constructor() {
    this.parser = new WorkflowParser();
  }

  /**
   * Run tests on the workflow
   */
  async runTests(workflow: N8nWorkflow, config: TestConfig = {}): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Generate test cases if requested
    const testCases = config.generateTests
      ? this.generateTestCases(workflow)
      : [];

    // Run connectivity tests
    results.push(...await this.runConnectivityTests(workflow));

    // Run node validation tests
    results.push(...await this.runNodeValidationTests(workflow, config));

    // Run data flow tests
    results.push(...await this.runDataFlowTests(workflow, config));

    // Run generated test cases
    for (const testCase of testCases) {
      results.push(await this.runTestCase(workflow, testCase, config));
    }

    // Run error handling tests
    results.push(...await this.runErrorHandlingTests(workflow, config));

    return results;
  }

  /**
   * Generate test cases for workflow
   */
  generateTestCases(workflow: N8nWorkflow): TestCase[] {
    const testCases: TestCase[] = [];
    const paths = this.parser.getExecutionPaths(workflow);

    // Generate tests for each execution path
    paths.forEach((path, index) => {
      testCases.push({
        id: `path-test-${index}`,
        name: `Test execution path ${index + 1}`,
        description: `Tests the execution path: ${path.join(' → ')}`,
        nodeId: path[0],
        inputData: this.generateMockData(workflow, path[0]),
        assertions: this.generateAssertions(workflow, path),
      });
    });

    // Generate edge case tests
    testCases.push(...this.generateEdgeCaseTests(workflow));

    return testCases;
  }

  /**
   * Run connectivity tests
   */
  private async runConnectivityTests(workflow: N8nWorkflow): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Check if workflow has valid entry points
    const triggers = this.parser.getTriggerNodes(workflow);
    const webhooks = this.parser.getWebhookNodes(workflow);

    results.push({
      id: 'connectivity-entry-points',
      name: 'Workflow has valid entry points',
      status: triggers.length > 0 || webhooks.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      message: `Found ${triggers.length} trigger(s) and ${webhooks.length} webhook(s)`,
    });

    // Test 2: Check if all nodes are connected
    const orphanedNodes = workflow.nodes.filter(node => {
      const hasInputs = this.parser.getUpstreamNodes(workflow, node.name).length > 0;
      const hasOutputs = this.parser.getDownstreamNodes(workflow, node.id).length > 0;
      const isTrigger = this.parser.getNodeType(node) === 'trigger' || this.parser.getNodeType(node) === 'webhook';
      return !hasInputs && !isTrigger && !hasOutputs;
    });

    results.push({
      id: 'connectivity-orphaned-nodes',
      name: 'No orphaned nodes',
      status: orphanedNodes.length === 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      message: orphanedNodes.length > 0
        ? `Found ${orphanedNodes.length} orphaned node(s): ${orphanedNodes.map(n => n.name).join(', ')}`
        : 'All nodes are properly connected',
    });

    // Test 3: Check for execution paths
    const paths = this.parser.getExecutionPaths(workflow);

    results.push({
      id: 'connectivity-execution-paths',
      name: 'Valid execution paths exist',
      status: paths.length > 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      message: `Found ${paths.length} execution path(s)`,
    });

    return results;
  }

  /**
   * Run node validation tests
   */
  private async runNodeValidationTests(workflow: N8nWorkflow, config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const node of workflow.nodes) {
      if (config.skipNodes?.includes(node.id)) {
        results.push({
          id: `node-validation-${node.id}`,
          name: `Validate node: ${node.name}`,
          status: 'skipped',
          duration: 0,
          nodeId: node.id,
          nodeName: node.name,
        });
        continue;
      }

      const startTime = Date.now();
      const validationResult = this.validateNode(workflow, node);

      results.push({
        id: `node-validation-${node.id}`,
        name: `Validate node: ${node.name}`,
        status: validationResult.valid ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        nodeId: node.id,
        nodeName: node.name,
        message: validationResult.message,
        error: validationResult.error,
      });
    }

    return results;
  }

  /**
   * Validate individual node
   */
  private validateNode(workflow: N8nWorkflow, node: N8nNode): { valid: boolean; message?: string; error?: string } {
    const metadata = this.parser.getNodeMetadata(node);

    // Check required parameters
    const missingParams = metadata.requiredParams.filter(
      param => !(param in node.parameters) || node.parameters[param] === '' || node.parameters[param] === null
    );

    if (missingParams.length > 0) {
      return {
        valid: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
      };
    }

    // Check credentials
    if (metadata.requiresCredentials && (!node.credentials || Object.keys(node.credentials).length === 0)) {
      return {
        valid: false,
        error: 'Node requires credentials but none are configured',
      };
    }

    return {
      valid: true,
      message: 'Node configuration is valid',
    };
  }

  /**
   * Run data flow tests
   */
  private async runDataFlowTests(workflow: N8nWorkflow, config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const paths = this.parser.getExecutionPaths(workflow);

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const startTime = Date.now();

      try {
        const mockData = config.testData || this.generateMockData(workflow, path[0]);
        const simulationResult = this.simulateDataFlow(workflow, path, mockData);

        results.push({
          id: `data-flow-path-${i}`,
          name: `Data flow test: Path ${i + 1}`,
          status: simulationResult.success ? 'passed' : 'failed',
          duration: Date.now() - startTime,
          message: simulationResult.message,
          error: simulationResult.error,
        });
      } catch (error) {
        results.push({
          id: `data-flow-path-${i}`,
          name: `Data flow test: Path ${i + 1}`,
          status: 'error',
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Simulate data flow through a path
   */
  private simulateDataFlow(
    workflow: N8nWorkflow,
    path: string[],
    initialData: unknown
  ): { success: boolean; message?: string; error?: string } {
    let currentData = initialData;

    for (const nodeName of path) {
      const node = workflow.nodes.find(n => n.name === nodeName);
      if (!node) {
        return {
          success: false,
          error: `Node not found: ${nodeName}`,
        };
      }

      // Simulate data transformation
      try {
        currentData = this.simulateNodeExecution(node, currentData);
      } catch (error) {
        return {
          success: false,
          error: `Error simulating node ${nodeName}: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    return {
      success: true,
      message: `Data successfully flowed through ${path.length} nodes`,
    };
  }

  /**
   * Simulate execution of a single node
   */
  private simulateNodeExecution(node: N8nNode, inputData: unknown): unknown {
    // This is a simplified simulation
    // In a real implementation, this would use node-specific logic

    if (node.disabled) {
      return inputData; // Disabled nodes pass data through
    }

    const nodeType = this.parser.getNodeType(node);

    switch (nodeType) {
      case 'transform':
        // Transform nodes modify data
        return { ...inputData as object, transformed: true, by: node.name };

      case 'conditional':
        // Conditional nodes evaluate conditions
        return inputData;

      case 'action':
        // Action nodes typically add data
        return {
          ...inputData as object,
          actionResult: { node: node.name, executed: true },
        };

      default:
        return inputData;
    }
  }

  /**
   * Run error handling tests
   */
  private async runErrorHandlingTests(workflow: N8nWorkflow, config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test nodes with retry configuration
    const nodesWithRetry = workflow.nodes.filter(n => n.retryOnFail);

    for (const node of nodesWithRetry) {
      const startTime = Date.now();

      results.push({
        id: `error-handling-retry-${node.id}`,
        name: `Error handling: ${node.name} retry config`,
        status: 'passed',
        duration: Date.now() - startTime,
        nodeId: node.id,
        nodeName: node.name,
        message: `Retry configured: ${node.maxTries || 3} attempts, ${node.waitBetweenTries || 1000}ms wait`,
      });
    }

    // Test nodes with continue on fail
    const nodesWithContinueOnFail = workflow.nodes.filter(n => n.continueOnFail);

    for (const node of nodesWithContinueOnFail) {
      const startTime = Date.now();
      const downstreamNodes = this.parser.getDownstreamNodes(workflow, node.id);
      const hasErrorChecking = downstreamNodes.some(
        n => n.type.includes('if') || n.type.includes('switch')
      );

      results.push({
        id: `error-handling-continue-${node.id}`,
        name: `Error handling: ${node.name} continue on fail`,
        status: hasErrorChecking || downstreamNodes.length === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        nodeId: node.id,
        nodeName: node.name,
        message: hasErrorChecking
          ? 'Downstream error checking found'
          : 'Warning: No downstream error checking',
      });
    }

    return results;
  }

  /**
   * Run a specific test case
   */
  private async runTestCase(workflow: N8nWorkflow, testCase: TestCase, config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const node = workflow.nodes.find(n => n.id === testCase.nodeId);
      if (!node) {
        return {
          id: testCase.id,
          name: testCase.name,
          status: 'error',
          duration: Date.now() - startTime,
          error: `Node ${testCase.nodeId} not found`,
        };
      }

      // Simulate execution with test data
      const actualOutput = this.simulateNodeExecution(node, testCase.inputData);

      // Run assertions if provided
      if (testCase.assertions) {
        const assertionResults = this.runAssertions(actualOutput, testCase.assertions);
        const allPassed = assertionResults.every(r => r.passed);

        return {
          id: testCase.id,
          name: testCase.name,
          status: allPassed ? 'passed' : 'failed',
          duration: Date.now() - startTime,
          nodeId: testCase.nodeId,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          message: allPassed
            ? 'All assertions passed'
            : `${assertionResults.filter(r => !r.passed).length} assertion(s) failed`,
        };
      }

      return {
        id: testCase.id,
        name: testCase.name,
        status: 'passed',
        duration: Date.now() - startTime,
        nodeId: testCase.nodeId,
        actualOutput,
      };
    } catch (error) {
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'error',
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run assertions on output
   */
  private runAssertions(output: unknown, assertions: TestAssertion[]): Array<{ passed: boolean; message: string }> {
    return assertions.map(assertion => {
      try {
        const value = this.getValueAtPath(output, assertion.path);

        switch (assertion.type) {
          case 'exists':
            return {
              passed: value !== undefined && value !== null,
              message: `${assertion.path} exists`,
            };

          case 'equals':
            return {
              passed: value === assertion.expected,
              message: `${assertion.path} equals ${assertion.expected}`,
            };

          case 'contains':
            return {
              passed: JSON.stringify(value).includes(String(assertion.expected)),
              message: `${assertion.path} contains ${assertion.expected}`,
            };

          case 'type':
            return {
              passed: typeof value === assertion.expected,
              message: `${assertion.path} is of type ${assertion.expected}`,
            };

          default:
            return {
              passed: false,
              message: `Unknown assertion type: ${assertion.type}`,
            };
        }
      } catch (error) {
        return {
          passed: false,
          message: `Assertion error: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });
  }

  /**
   * Get value at path in object
   */
  private getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: any = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Generate mock data for a node
   */
  private generateMockData(workflow: N8nWorkflow, nodeId: string): unknown {
    const node = workflow.nodes.find(n => n.id === nodeId || n.name === nodeId);
    if (!node) {
      return { mock: true };
    }

    const nodeType = this.parser.getNodeType(node);

    switch (nodeType) {
      case 'webhook':
        return {
          body: { test: true, timestamp: new Date().toISOString() },
          headers: { 'content-type': 'application/json' },
          query: {},
        };

      case 'trigger':
        return {
          triggered: true,
          timestamp: new Date().toISOString(),
        };

      default:
        return {
          json: { test: true, data: 'mock-data' },
        };
    }
  }

  /**
   * Generate assertions for execution path
   */
  private generateAssertions(workflow: N8nWorkflow, path: string[]): TestAssertion[] {
    const assertions: TestAssertion[] = [];

    // Basic assertions
    assertions.push({
      type: 'exists',
      path: 'json',
      expected: true,
    });

    return assertions;
  }

  /**
   * Generate edge case tests
   */
  private generateEdgeCaseTests(workflow: N8nWorkflow): TestCase[] {
    const tests: TestCase[] = [];

    // Test with empty data
    const triggers = this.parser.getTriggerNodes(workflow);
    if (triggers.length > 0) {
      tests.push({
        id: 'edge-case-empty-data',
        name: 'Test with empty input data',
        description: 'Validates workflow behavior with empty input',
        nodeId: triggers[0].id,
        inputData: {},
      });
    }

    return tests;
  }
}
