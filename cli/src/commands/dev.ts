import { Command } from 'commander';
import chalk from 'chalk';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export const devCommand = new Command('dev')
  .description('Start local development environment (docker-compose + LocalStack)')
  .option('--full', 'Also start the audience-builder container')
  .action(async (options) => {
    const dockerComposePath = join(process.cwd(), 'docker', 'docker-compose.yml');
    if (!existsSync(dockerComposePath)) {
      console.error(
        chalk.red('docker/docker-compose.yml not found. Are you in the uniflow project root?')
      );
      process.exit(1);
    }

    console.log(chalk.bold('\nStarting Uniflow local dev environment...\n'));

    // Check Docker is running
    try {
      execSync('docker info', { stdio: 'pipe' });
    } catch {
      console.error(chalk.red('Docker is not running. Please start Docker first.'));
      process.exit(1);
    }

    // Start docker-compose
    const profile = options.full ? '--profile full' : '';
    const composeCmd = `docker compose -f docker/docker-compose.yml ${profile} up -d`;

    console.log(chalk.gray(`$ ${composeCmd}\n`));

    try {
      execSync(composeCmd, { stdio: 'inherit' });
    } catch {
      console.error(chalk.red('Failed to start docker-compose'));
      process.exit(1);
    }

    console.log();
    console.log(chalk.green('Local environment is ready!'));
    console.log();
    console.log('  LocalStack:  ' + chalk.cyan('http://localhost:4566'));
    console.log('  DynamoDB:    ' + chalk.cyan('uniflow-profiles'));
    console.log('  S3 Buckets:  ' + chalk.cyan('uniflow-raw, uniflow-processed'));
    console.log('  Kinesis:     ' + chalk.cyan('uniflow-events'));
    console.log('  SQS:         ' + chalk.cyan('uniflow-destinations'));
    console.log();
    console.log('Send test events:');
    console.log('  ' + chalk.cyan('npx ts-node examples/send-events.ts'));
    console.log();
    console.log('Stop with:');
    console.log('  ' + chalk.cyan('docker compose -f docker/docker-compose.yml down'));
    console.log();
  });
