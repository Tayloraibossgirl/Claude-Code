/**
 * Markdown reporter - generates comprehensive audit reports in Markdown format
 */

import { writeFile } from 'fs/promises';
import { AuditResult, AuditIssue, TestResult, FallbackCheck, SeverityLevel } from '../types/audit.js';

export class MarkdownReporter {
  /**
   * Generate and save markdown report
   */
  async generateReport(result: AuditResult, outputPath: string): Promise<void> {
    const markdown = this.buildMarkdown(result);
    await writeFile(outputPath, markdown, 'utf-8');
  }

  /**
   * Build markdown content
   */
  private buildMarkdown(result: AuditResult): string {
    const sections: string[] = [];

    // Title and metadata
    sections.push(this.buildHeader(result));

    // Executive summary
    sections.push(this.buildExecutiveSummary(result));

    // Audit score
    sections.push(this.buildScoreSection(result));

    // Summary statistics
    sections.push(this.buildSummarySection(result));

    // Issues by severity
    sections.push(this.buildIssuesSection(result));

    // Test results
    sections.push(this.buildTestResultsSection(result));

    // Recommendations
    sections.push(this.buildRecommendationsSection(result));

    // Fallback analysis (if available)
    if (result.metadata?.fallbackChecks) {
      sections.push(this.buildFallbackSection(result.metadata.fallbackChecks as FallbackCheck[]));
    }

    // Detailed findings
    sections.push(this.buildDetailedFindingsSection(result));

    // Footer
    sections.push(this.buildFooter(result));

    return sections.join('\n\n');
  }

  /**
   * Build report header
   */
  private buildHeader(result: AuditResult): string {
    return `# n8n Workflow Audit Report

**Workflow:** ${result.workflowName}
**Path:** \`${result.workflowPath}\`
**Date:** ${new Date(result.timestamp).toLocaleString()}
**Duration:** ${(result.duration / 1000).toFixed(2)}s

---`;
  }

  /**
   * Build executive summary
   */
  private buildExecutiveSummary(result: AuditResult): string {
    const { score, summary } = result;

    let healthStatus = '🔴 Critical Issues Found';
    if (score.grade === 'A') healthStatus = '✅ Excellent Health';
    else if (score.grade === 'B') healthStatus = '🟢 Good Health';
    else if (score.grade === 'C') healthStatus = '🟡 Fair Health';
    else if (score.grade === 'D') healthStatus = '🟠 Poor Health';

    return `## Executive Summary

${healthStatus}

This workflow has been comprehensively audited for configuration, security, error handling, and best practices.
The overall grade is **${score.grade}** with a score of **${score.overall}/100**.

**Key Findings:**
- ${summary.totalIssues} total issues identified
- ${summary.criticalIssues} critical issues requiring immediate attention
- ${summary.testsRun} tests executed (${summary.testsPassed} passed, ${summary.testsFailed} failed)
- ${summary.totalNodes} total nodes (${summary.activeNodes} active, ${summary.disabledNodes} disabled)`;
  }

  /**
   * Build score section
   */
  private buildScoreSection(result: AuditResult): string {
    const { score } = result;

    const gradeEmoji = {
      A: '🏆',
      B: '✅',
      C: '⚠️',
      D: '❌',
      F: '🚫',
    };

    return `## Audit Score

| Category | Score | Grade |
|----------|-------|-------|
| **Overall** | **${score.overall}/100** | **${gradeEmoji[score.grade]} ${score.grade}** |
| Configuration | ${score.configuration}/100 | ${this.getGradeForScore(score.configuration)} |
| Error Handling | ${score.errorHandling}/100 | ${this.getGradeForScore(score.errorHandling)} |
| Security | ${score.security}/100 | ${this.getGradeForScore(score.security)} |
| Testing | ${score.testing}/100 | ${this.getGradeForScore(score.testing)} |`;
  }

  /**
   * Build summary section
   */
  private buildSummarySection(result: AuditResult): string {
    const { summary } = result;

    return `## Workflow Summary

### Nodes
- **Total Nodes:** ${summary.totalNodes}
- **Active Nodes:** ${summary.activeNodes}
- **Disabled Nodes:** ${summary.disabledNodes}
- **Triggers:** ${summary.triggersFound}
- **Webhooks:** ${summary.webhooksFound}
- **Credentials Used:** ${summary.credentialsUsed}

### Issues
- **Total:** ${summary.totalIssues}
- **🔴 Critical:** ${summary.criticalIssues}
- **🟠 High:** ${summary.highIssues}
- **🟡 Medium:** ${summary.mediumIssues}
- **🔵 Low:** ${summary.lowIssues}

### Tests
- **Total Tests:** ${summary.testsRun}
- **✅ Passed:** ${summary.testsPassed}
- **❌ Failed:** ${summary.testsFailed}
- **⏭️ Skipped:** ${summary.testsRun - summary.testsPassed - summary.testsFailed}`;
  }

  /**
   * Build issues section
   */
  private buildIssuesSection(result: AuditResult): string {
    const sections: string[] = ['## Issues by Severity'];

    const severities: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

    severities.forEach(severity => {
      const issues = result.issues.filter(i => i.severity === severity);
      if (issues.length > 0) {
        sections.push(this.buildSeveritySection(severity, issues));
      }
    });

    if (result.issues.length === 0) {
      sections.push('✅ No issues found! This workflow is in excellent shape.');
    }

    return sections.join('\n\n');
  }

  /**
   * Build section for specific severity
   */
  private buildSeveritySection(severity: SeverityLevel, issues: AuditIssue[]): string {
    const icon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: 'ℹ️',
    };

    const lines: string[] = [`### ${icon[severity]} ${severity.toUpperCase()} (${issues.length})`];

    issues.forEach((issue, index) => {
      lines.push(`#### ${index + 1}. ${issue.title}`);

      if (issue.nodeName) {
        lines.push(`**Node:** ${issue.nodeName} ${issue.location ? `(${issue.location})` : ''}`);
      }

      lines.push(`**Category:** ${issue.category}`);
      lines.push(`**Description:** ${issue.description}`);
      lines.push(`**Recommendation:** ${issue.recommendation}`);

      if (index < issues.length - 1) {
        lines.push('---');
      }
    });

    return lines.join('\n\n');
  }

  /**
   * Build test results section
   */
  private buildTestResultsSection(result: AuditResult): string {
    const sections: string[] = ['## Test Results'];

    const grouped = this.groupTestsByCategory(result.tests);

    Object.entries(grouped).forEach(([category, tests]) => {
      sections.push(this.buildTestCategorySection(category, tests));
    });

    return sections.join('\n\n');
  }

  /**
   * Build test category section
   */
  private buildTestCategorySection(category: string, tests: TestResult[]): string {
    const lines: string[] = [`### ${category}`];

    const statusIcon = {
      passed: '✅',
      failed: '❌',
      skipped: '⏭️',
      error: '🚫',
    };

    lines.push('| Test | Status | Duration | Message |');
    lines.push('|------|--------|----------|---------|');

    tests.forEach(test => {
      const icon = statusIcon[test.status];
      const message = test.message || test.error || '-';
      const duration = `${test.duration}ms`;

      lines.push(`| ${test.name} | ${icon} ${test.status} | ${duration} | ${message} |`);
    });

    return lines.join('\n');
  }

  /**
   * Build recommendations section
   */
  private buildRecommendationsSection(result: AuditResult): string {
    const sections: string[] = ['## Recommendations'];

    if (result.recommendations.length === 0) {
      sections.push('No additional recommendations at this time.');
    } else {
      result.recommendations.forEach((rec, index) => {
        sections.push(`${index + 1}. ${rec}`);
      });
    }

    // Add priority recommendations based on critical issues
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      sections.push('\n### Priority Actions');
      sections.push('Address these critical issues immediately:');

      criticalIssues.forEach((issue, index) => {
        sections.push(`${index + 1}. **${issue.title}** - ${issue.recommendation}`);
      });
    }

    return sections.join('\n\n');
  }

  /**
   * Build fallback section
   */
  private buildFallbackSection(fallbackChecks: FallbackCheck[]): string {
    const sections: string[] = ['## Error Handling & Fallback Analysis'];

    if (fallbackChecks.length === 0) {
      sections.push('No nodes require error handling analysis.');
      return sections.join('\n\n');
    }

    sections.push('| Node | Error Workflow | Continue On Fail | Retry | Error Output | Status |');
    sections.push('|------|----------------|------------------|-------|--------------|--------|');

    fallbackChecks.forEach(check => {
      const errorWorkflow = check.hasErrorWorkflow ? '✅' : '❌';
      const continueOnFail = check.hasContinueOnFail ? '✅' : '❌';
      const retry = check.hasRetry
        ? `✅ (${check.retryConfig?.maxTries}x, ${check.retryConfig?.waitBetweenTries}ms)`
        : '❌';
      const errorOutput = check.errorOutputConnected ? '✅' : '❌';

      const hasAnyHandling =
        check.hasErrorWorkflow ||
        check.hasContinueOnFail ||
        check.hasRetry ||
        check.errorOutputConnected;

      const status = hasAnyHandling ? '✅ OK' : '⚠️ No Handling';

      sections.push(
        `| ${check.nodeName} | ${errorWorkflow} | ${continueOnFail} | ${retry} | ${errorOutput} | ${status} |`
      );
    });

    // Add recommendations
    const nodesWithoutHandling = fallbackChecks.filter(
      c => !c.hasErrorWorkflow && !c.hasContinueOnFail && !c.hasRetry && !c.errorOutputConnected
    );

    if (nodesWithoutHandling.length > 0) {
      sections.push('\n⚠️ **Nodes without error handling:**');
      nodesWithoutHandling.forEach(check => {
        sections.push(`- **${check.nodeName}**: ${check.recommendations.join(', ')}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Build detailed findings section
   */
  private buildDetailedFindingsSection(result: AuditResult): string {
    const sections: string[] = ['## Detailed Findings'];

    // Group issues by category
    const byCategory = this.groupIssuesByCategory(result.issues);

    Object.entries(byCategory).forEach(([category, issues]) => {
      sections.push(`### ${this.formatCategoryName(category)} (${issues.length} issues)`);

      if (issues.length > 0) {
        issues.forEach(issue => {
          sections.push(`- **${issue.title}**: ${issue.description}`);
        });
      }
    });

    return sections.join('\n\n');
  }

  /**
   * Build footer
   */
  private buildFooter(result: AuditResult): string {
    return `---

## Next Steps

1. **Address Critical Issues** - Fix all critical issues immediately
2. **Review High Priority Issues** - Plan fixes for high severity issues
3. **Test Changes** - Re-run audit after making changes
4. **Document Decisions** - Document any intentional configurations

---

*Report generated by n8n Workflow Audit Agent*
*Timestamp: ${result.timestamp}*`;
  }

  /**
   * Group tests by category
   */
  private groupTestsByCategory(tests: TestResult[]): Record<string, TestResult[]> {
    const grouped: Record<string, TestResult[]> = {};

    tests.forEach(test => {
      const category = test.id.split('-')[0] || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(test);
    });

    return grouped;
  }

  /**
   * Group issues by category
   */
  private groupIssuesByCategory(issues: AuditIssue[]): Record<string, AuditIssue[]> {
    const grouped: Record<string, AuditIssue[]> = {};

    issues.forEach(issue => {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    });

    return grouped;
  }

  /**
   * Get grade for a score
   */
  private getGradeForScore(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Format category name
   */
  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
