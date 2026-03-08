import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { loadConfig } from '../config.js';

export const destroyCommand = new Command('destroy')
  .description('Tear down the Uniflow stack (with confirmation)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    const config = loadConfig();

    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: chalk.red(
            `Are you sure you want to destroy ${config.stackName} in ${config.region}? ` +
            'This will delete all resources (S3 buckets with RETAIN policy will be kept).'
          ),
          default: false,
        },
      ]);

      if (!confirm) {
        console.log('Aborted.');
        return;
      }
    }

    console.log(chalk.bold('\nDestroying Uniflow stack...\n'));
    try {
      execSync(
        `npx cdk destroy ${config.stackName} --force`,
        { stdio: 'inherit' }
      );
      console.log(chalk.green('\n✓ Stack destroyed successfully.'));
    } catch (err) {
      console.error(chalk.red('CDK destroy failed'), err);
      process.exit(1);
    }
  });
