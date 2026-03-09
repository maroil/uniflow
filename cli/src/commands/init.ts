import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { saveConfig, type Config } from '../config.js';

export const initCommand = new Command('init')
  .description('Interactive setup — generates uniflow.config.yaml')
  .action(async () => {
    console.log(chalk.bold('\n🚀 Uniflow CDP — Interactive Setup\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'region',
        message: 'AWS region:',
        default: 'us-east-1',
      },
      {
        type: 'input',
        name: 'adminEmail',
        message: 'Admin email address:',
        validate: (v: string) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Please enter a valid email',
      },
      {
        type: 'number',
        name: 'retentionDays',
        message: 'Data retention in days:',
        default: 90,
      },
      {
        type: 'checkbox',
        name: 'connectors',
        message: 'Select connectors to enable:',
        choices: [
          { name: 'Webhook (HTTP)', value: 'webhook', checked: true },
          { name: 'S3 Export', value: 's3-export', checked: true },
        ],
      },
      {
        type: 'input',
        name: 'stackName',
        message: 'CloudFormation stack name:',
        default: 'UnifowStack',
      },
    ]);

    const config: Config = {
      version: '0.1',
      region: answers.region,
      adminEmail: answers.adminEmail,
      retentionDays: answers.retentionDays,
      connectors: answers.connectors,
      stackName: answers.stackName,
    };

    saveConfig(config);

    // Non-blocking validation
    try {
      const sts = new STSClient({ region: config.region });
      const identity = await sts.send(new GetCallerIdentityCommand({}));
      console.log(chalk.green('✓ AWS credentials valid'));
      console.log(chalk.dim(`  Account: ${identity.Account}  Region: ${config.region}`));
    } catch {
      console.log(chalk.yellow('⚠  Could not validate AWS credentials. Configure before deploying.'));
    }

    console.log(chalk.green('\n✓ Created uniflow.config.yaml'));
    console.log('\nNext steps:');
    console.log('  ' + chalk.cyan('uniflow deploy') + '  — deploy to AWS');
    console.log('  ' + chalk.cyan('uniflow status') + '  — check deployment health\n');
  });
