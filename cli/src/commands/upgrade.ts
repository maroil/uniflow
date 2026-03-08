import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { loadConfig } from '../config.js';
import { runMigrations } from '../migrations/runner.js';

export const upgradeCommand = new Command('upgrade')
  .description('Upgrade Uniflow to the latest version and run migrations')
  .action(async () => {
    const config = loadConfig();
    console.log(chalk.bold('\nUpgrading Uniflow CDP...\n'));

    let spinner = ora('Pulling latest CDK constructs...').start();
    try {
      execSync('npm install @uniflow/cdk@latest --save-exact', { stdio: 'pipe' });
      spinner.succeed('Updated @uniflow/cdk');
    } catch {
      spinner.warn('Could not update @uniflow/cdk (continuing)');
    }

    spinner = ora('Running migrations...').start();
    try {
      await runMigrations(config);
      spinner.succeed('Migrations complete');
    } catch (err) {
      spinner.fail(`Migration failed: ${err}`);
      process.exit(1);
    }

    spinner = ora('Deploying updated stack...').start();
    try {
      execSync(
        `npx cdk deploy ${config.stackName} --require-approval never`,
        { stdio: 'inherit' }
      );
      spinner.succeed(chalk.green('Upgrade complete!'));
    } catch {
      spinner.fail('CDK deploy failed during upgrade');
      process.exit(1);
    }
  });
