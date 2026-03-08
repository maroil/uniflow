import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { loadConfig } from '../config.js';

export const statusCommand = new Command('status')
  .description('Check the health of your deployed Uniflow stack')
  .action(async () => {
    const config = loadConfig();
    const cfn = new CloudFormationClient({ region: config.region });
    const spinner = ora(`Checking ${config.stackName}...`).start();

    try {
      const result = await cfn.send(
        new DescribeStacksCommand({ StackName: config.stackName })
      );

      const stack = result.Stacks?.[0];
      if (!stack) {
        spinner.fail('Stack not found. Run `uniflow deploy` first.');
        return;
      }

      spinner.stop();
      const statusColor =
        stack.StackStatus?.includes('COMPLETE') ? chalk.green :
        stack.StackStatus?.includes('FAILED') ? chalk.red :
        chalk.yellow;

      console.log('\n' + chalk.bold('Uniflow Stack Status'));
      console.log('─'.repeat(40));
      console.log(`Status:  ${statusColor(stack.StackStatus ?? 'Unknown')}`);
      console.log(`Region:  ${config.region}`);
      console.log(`Updated: ${stack.LastUpdatedTime?.toISOString() ?? 'N/A'}`);

      if (stack.Outputs) {
        console.log('\nOutputs:');
        for (const output of stack.Outputs) {
          console.log(`  ${chalk.cyan(output.OutputKey ?? '')}: ${output.OutputValue}`);
        }
      }
      console.log();
    } catch (err) {
      spinner.fail(`Failed to get status: ${err}`);
      process.exit(1);
    }
  });
