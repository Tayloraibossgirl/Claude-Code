/**
 * Main Auditor - orchestrates all audit operations
 */

import { N8nWorkflow } from './types/workflow.js';
import { AuditResult, AuditSummary, AuditScore, AuditIssue, TestResult } from './types/audit.js';
import { WorkflowParser } from './utils/workflow-parser.js';
import { ConfigValidator } from './validators/config-validator.js';
import { SecurityAuditor } from './auditors/security-auditor.js';
import { ErrorHandlerAuditor } from './auditors/error-handler-auditor.js';
import { TestHarness, TestConfig } from './testers/test-harness.js';
import { MarkdownReporter } from './reporters/markdown-reporter.js';

export interface AuditOptions {
  workflowPath: string;
  generateTests?: boolean;
  testData?: Record<string, unknown>;
  skipTests?: boolean;
  outputPath?: string;
}

export class WorkflowAuditor {
  private parser: WorkflowParser;
  private configValidator: ConfigValidator;
  private securityAuditor: SecurityAuditor;
  private errorAuditor: ErrorHandlerAuditor;
  private testHarness: TestHarness;
  private reporter: MarkdownReporter;

  constructor() {
    this.parser = new WorkflowParser();
    this.configValidator = new ConfigValidator();
    this.securityAuditor = new SecurityAuditor();
    this.errorAuditor = new ErrorHandlerAuditor();
    this.testHarness = new TestHarness();
    this.reporter = new MarkdownReporter();
  }

  /**
   * Run comprehensive audit on workflow
   */
  async audit(options: AuditOptions): Promise<AuditResult> {
    const startTime = Date.now();

    console.log(`🔍 Loading workflow from: ${options.workflowPath}`);
    const workflow = await this.parser.loadWorkflow(options.workflowPath);

    console.log(`📋 Auditing workflow: ${workflow.name}`);
    console.log(`   Nodes: ${workflow.nodes.length}`);
    console.log(`   Active: ${workflow.active ? 'Yes' : 'No'}`);

    // Collect all issues
    const allIssues: AuditIssue[] = [];

    // Run configuration validation
    console.log('\n⚙️  Validating configuration...');
    const configIssues = await this.configValidator.validate(workflow);
    allIssues.push(...configIssues);
    console.log(`   Found ${configIssues.length} configuration issues`);

    // Run security audit
    console.log('\n🔒 Auditing security...');
    const securityIssues = await this.securityAuditor.audit(workflow);
    allIssues.push(...securityIssues);
    console.log(`   Found ${securityIssues.length} security issues`);

    // Run error handling audit
    console.log('\n🛡️  Auditing error handling...');
    const errorIssues = await this.errorAuditor.audit(workflow);
    allIssues.push(...errorIssues);
    console.log(`   Found ${errorIssues.length} error handling issues`);

    // Get fallback checks
    const fallbackChecks = this.errorAuditor.getFallbackChecks(workflow);

    // Run tests
    let testResults: TestResult[] = [];
    if (!options.skipTests) {
      console.log('\n🧪 Running tests...');
      const testConfig: TestConfig = {
        generateTests: options.generateTests,
        testData: options.testData,
      };
      testResults = await this.testHarness.runTests(workflow, testConfig);
      console.log(`   Ran ${testResults.length} tests`);
      console.log(`   Passed: ${testResults.filter(t => t.status === 'passed').length}`);
      console.log(`   Failed: ${testResults.filter(t => t.status === 'failed').length}`);
    }

    // Calculate summary
    const summary = this.calculateSummary(workflow, allIssues, testResults);

    // Calculate score
    const score = this.calculateScore(workflow, allIssues, testResults);

    // Generate recommendations
    const recommendations = this.generateRecommendations(workflow, allIssues, testResults);

    // Build result
    const result: AuditResult = {
      workflowName: workflow.name,
      workflowPath: options.workflowPath,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary,
      issues: allIssues,
      tests: testResults,
      recommendations,
      score,
      metadata: {
        fallbackChecks,
      },
    };

    // Generate report if output path provided
    if (options.outputPath) {
      console.log(`\n📝 Generating report: ${options.outputPath}`);
      await this.reporter.generateReport(result, options.outputPath);
    }

    // Print summary
    this.printSummary(result);

    return result;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    workflow: N8nWorkflow,
    issues: AuditIssue[],
    tests: TestResult[]
  ): AuditSummary {
    const activeNodes = workflow.nodes.filter(n => !n.disabled).length;
    const disabledNodes = workflow.nodes.filter(n => n.disabled).length;

    return {
      totalNodes: workflow.nodes.length,
      activeNodes,
      disabledNodes,
      triggersFound: this.parser.getTriggerNodes(workflow).length,
      webhooksFound: this.parser.getWebhookNodes(workflow).length,
      credentialsUsed: this.countCredentials(workflow),
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      highIssues: issues.filter(i => i.severity === 'high').length,
      mediumIssues: issues.filter(i => i.severity === 'medium').length,
      lowIssues: issues.filter(i => i.severity === 'low').length,
      testsRun: tests.length,
      testsPassed: tests.filter(t => t.status === 'passed').length,
      testsFailed: tests.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * Calculate audit score
   */
  private calculateScore(
    workflow: N8nWorkflow,
    issues: AuditIssue[],
    tests: TestResult[]
  ): AuditScore {
    // Configuration score
    const configIssues = issues.filter(i => i.category === 'configuration');
    const configScore = this.calculateCategoryScore(configIssues, workflow.nodes.length);

    // Error handling score
    const errorIssues = issues.filter(i => i.category === 'error-handling');
    const errorScore = this.calculateCategoryScore(errorIssues, workflow.nodes.length);

    // Security score
    const securityIssues = issues.filter(i => i.category === 'security');
    const securityScore = this.calculateCategoryScore(securityIssues, workflow.nodes.length);

    // Testing score
    const testScore = tests.length > 0
      ? Math.round((tests.filter(t => t.status === 'passed').length / tests.length) * 100)
      : 50; // Default if no tests run

    // Overall score (weighted average)
    const overall = Math.round(
      configScore * 0.3 +
      errorScore * 0.3 +
      securityScore * 0.3 +
      testScore * 0.1
    );

    const grade = this.getGrade(overall);

    return {
      overall,
      configuration: configScore,
      errorHandling: errorScore,
      security: securityScore,
      testing: testScore,
      grade,
    };
  }

  /**
   * Calculate score for a category
   */
  private calculateCategoryScore(issues: AuditIssue[], nodeCount: number): number {
    const weights = {
      critical: 20,
      high: 10,
      medium: 5,
      low: 2,
      info: 0,
    };

    const penalty = issues.reduce((sum, issue) => {
      return sum + weights[issue.severity];
    }, 0);

    // Start with 100, deduct penalties
    const score = Math.max(0, 100 - penalty);
    return Math.round(score);
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    workflow: N8nWorkflow,
    issues: AuditIssue[],
    tests: TestResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical issues first
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(
        `Address ${criticalCount} critical issue(s) immediately - these prevent proper workflow execution`
      );
    }

    // Error handling
    if (!this.parser.hasErrorHandling(workflow)) {
      recommendations.push(
        'Add error handling mechanisms (error workflow, retry logic, or continue on fail) to improve reliability'
      );
    }

    // Testing
    const failedTests = tests.filter(t => t.status === 'failed').length;
    if (failedTests > 0) {
      recommendations.push(
        `Fix ${failedTests} failing test(s) to ensure workflow correctness`
      );
    }

    // Security
    const securityIssues = issues.filter(i => i.category === 'security');
    if (securityIssues.length > 0) {
      recommendations.push(
        'Review and address security issues to protect sensitive data and prevent unauthorized access'
      );
    }

    // Disabled nodes
    const disabledNodes = workflow.nodes.filter(n => n.disabled);
    if (disabledNodes.length > 0) {
      recommendations.push(
        `Review ${disabledNodes.length} disabled node(s) - remove if no longer needed`
      );
    }

    // Execution data retention
    if (workflow.settings?.saveDataErrorExecution === 'none') {
      recommendations.push(
        'Enable error execution data retention for better debugging capabilities'
      );
    }

    return recommendations;
  }

  /**
   * Count unique credentials used
   */
  private countCredentials(workflow: N8nWorkflow): number {
    const credentialIds = new Set<string>();

    workflow.nodes.forEach(node => {
      if (node.credentials) {
        Object.values(node.credentials).forEach(cred => {
          credentialIds.add(cred.id);
        });
      }
    });

    return credentialIds.size;
  }

  /**
   * Print summary to console
   */
  private printSummary(result: AuditResult): void {
    const gradeEmoji = {
      A: '🏆',
      B: '✅',
      C: '⚠️',
      D: '❌',
      F: '🚫',
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n${gradeEmoji[result.score.grade]} Overall Grade: ${result.score.grade} (${result.score.overall}/100)`);
    console.log(`\n📈 Category Scores:`);
    console.log(`   Configuration:   ${result.score.configuration}/100`);
    console.log(`   Error Handling:  ${result.score.errorHandling}/100`);
    console.log(`   Security:        ${result.score.security}/100`);
    console.log(`   Testing:         ${result.score.testing}/100`);

    console.log(`\n🐛 Issues:`);
    console.log(`   🔴 Critical: ${result.summary.criticalIssues}`);
    console.log(`   🟠 High:     ${result.summary.highIssues}`);
    console.log(`   🟡 Medium:   ${result.summary.mediumIssues}`);
    console.log(`   🔵 Low:      ${result.summary.lowIssues}`);
    console.log(`   Total:       ${result.summary.totalIssues}`);

    console.log(`\n✅ Tests:`);
    console.log(`   Passed:  ${result.summary.testsPassed}`);
    console.log(`   Failed:  ${result.summary.testsFailed}`);
    console.log(`   Total:   ${result.summary.testsRun}`);

    if (result.recommendations.length > 0) {
      console.log(`\n💡 Top Recommendations:`);
      result.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}
