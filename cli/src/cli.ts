#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { statusCommand } from './commands/status.js';
import { upgradeCommand } from './commands/upgrade.js';
import { destroyCommand } from './commands/destroy.js';

const program = new Command();

program
  .name('uniflow')
  .description('Uniflow CDP — open-source Customer Data Platform for AWS')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(deployCommand);
program.addCommand(statusCommand);
program.addCommand(upgradeCommand);
program.addCommand(destroyCommand);

program.parse();
