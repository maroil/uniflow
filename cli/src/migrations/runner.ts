import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import chalk from 'chalk';
import type { Config } from '../config.js';

export interface Migration {
  id: string;
  description: string;
  up(config: Config, dynamo: DynamoDBDocumentClient): Promise<void>;
}

// Lazy import all migrations in order
async function loadMigrations(): Promise<Migration[]> {
  const { migration0001 } = await import('./0001_init_tables.js');
  return [migration0001];
}

export async function runMigrations(config: Config): Promise<void> {
  const dynamo = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: config.region })
  );

  const migrations = await loadMigrations();

  for (const migration of migrations) {
    const key = { pk: `MIGRATION#${migration.id}`, sk: 'META' };

    // Check if already run
    const existing = await dynamo.send(
      new GetCommand({ TableName: `${config.stackName}-profiles`, Key: key })
    ).catch(() => null);

    if (existing?.Item?.completedAt) {
      continue; // Already run, skip
    }

    console.log(`  Running migration ${chalk.cyan(migration.id)}: ${migration.description}`);
    await migration.up(config, dynamo);

    await dynamo.send(
      new PutCommand({
        TableName: `${config.stackName}-profiles`,
        Item: {
          ...key,
          description: migration.description,
          completedAt: new Date().toISOString(),
        },
      })
    );

    console.log(`  ${chalk.green('✓')} ${migration.id}`);
  }
}
