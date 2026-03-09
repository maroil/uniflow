import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { loadConfig } from '../config.js';
import { runMigrations } from '../migrations/runner.js';

export const deployCommand = new Command('deploy')
  .description('Deploy Uniflow CDP to AWS (wraps CDK deploy)')
  .option('--skip-migrations', 'Skip running migrations before deploy')
  .action(async (options) => {
    const config = loadConfig();
    console.log(chalk.bold(`\nDeploying Uniflow to ${config.region}...\n`));

    // Check CDK bootstrap
    const cfn = new CloudFormationClient({ region: config.region });
    try {
      await cfn.send(new DescribeStacksCommand({ StackName: 'CDKToolkit' }));
    } catch (err: any) {
      if (err.name === 'ValidationError' || err.message?.includes('does not exist')) {
        const { shouldBootstrap } = await inquirer.prompt([{
          type: 'confirm', name: 'shouldBootstrap',
          message: `CDK not bootstrapped in ${config.region}. Run bootstrap now?`,
          default: true,
        }]);
        if (shouldBootstrap) {
          execSync('npx cdk bootstrap', { stdio: 'inherit' });
        }
      }
    }

    if (!options.skipMigrations) {
      const spinner = ora('Running migrations...').start();
      try {
        await runMigrations(config);
        spinner.succeed('Migrations complete');
      } catch (err) {
        spinner.fail(`Migration failed: ${err}`);
        process.exit(1);
      }
    }

    const spinner = ora('Running CDK deploy...').start();
    try {
      execSync(
        `npx cdk deploy ${config.stackName} --require-approval never ` +
          `--context adminEmail=${config.adminEmail} ` +
          `--context retentionDays=${config.retentionDays}`,
        { stdio: 'inherit' }
      );
      spinner.succeed(chalk.green('Deployment complete!'));
    } catch {
      spinner.fail('CDK deploy failed');
      process.exit(1);
    }
  });
