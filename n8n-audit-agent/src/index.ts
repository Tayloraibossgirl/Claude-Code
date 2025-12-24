#!/usr/bin/env node

/**
 * n8n Workflow Audit Agent - CLI Entry Point
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { WorkflowAuditor } from './auditor.js';

const program = new Command();

// Get version from package.json
async function getVersion(): Promise<string> {
  try {
    const pkgPath = resolve(new URL('.', import.meta.url).pathname, '../package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}

program
  .name('n8n-audit')
  .description('Comprehensive audit and testing agent for n8n workflows')
  .version(await getVersion());

program
  .command('audit')
  .description('Audit an n8n workflow')
  .argument('<workflow>', 'Path to n8n workflow JSON file')
  .option('-o, --output <path>', 'Output path for markdown report', 'audit-report.md')
  .option('-t, --test', 'Generate and run automated tests', false)
  .option('--skip-tests', 'Skip all tests', false)
  .option('--test-data <path>', 'Path to JSON file with test data')
  .action(async (workflowPath: string, options) => {
    try {
      console.log('🚀 n8n Workflow Audit Agent\n');

      // Load test data if provided
      let testData;
      if (options.testData) {
        const testDataContent = await readFile(options.testData, 'utf-8');
        testData = JSON.parse(testDataContent);
      }

      const auditor = new WorkflowAuditor();

      const result = await auditor.audit({
        workflowPath: resolve(workflowPath),
        generateTests: options.test,
        skipTests: options.skipTests,
        testData,
        outputPath: resolve(options.output),
      });

      console.log(`\n✅ Audit complete!`);
      console.log(`📄 Report saved to: ${options.output}`);

      // Exit with error code if critical issues found
      if (result.summary.criticalIssues > 0) {
        console.log(`\n⚠️  WARNING: ${result.summary.criticalIssues} critical issue(s) found!`);
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Quick validation of workflow configuration (no tests)')
  .argument('<workflow>', 'Path to n8n workflow JSON file')
  .action(async (workflowPath: string) => {
    try {
      console.log('🔍 Validating workflow...\n');

      const auditor = new WorkflowAuditor();

      await auditor.audit({
        workflowPath: resolve(workflowPath),
        skipTests: true,
      });

      console.log('\n✅ Validation complete!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run tests on workflow without full audit')
  .argument('<workflow>', 'Path to n8n workflow JSON file')
  .option('-g, --generate', 'Generate test cases automatically', false)
  .option('--test-data <path>', 'Path to JSON file with test data')
  .action(async (workflowPath: string, options) => {
    try {
      console.log('🧪 Running workflow tests...\n');

      let testData;
      if (options.testData) {
        const testDataContent = await readFile(options.testData, 'utf-8');
        testData = JSON.parse(testDataContent);
      }

      const auditor = new WorkflowAuditor();

      const result = await auditor.audit({
        workflowPath: resolve(workflowPath),
        generateTests: options.generate,
        testData,
        skipTests: false,
      });

      const passed = result.summary.testsPassed;
      const failed = result.summary.testsFailed;

      console.log(`\n✅ Tests complete: ${passed} passed, ${failed} failed`);

      if (failed > 0) {
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
