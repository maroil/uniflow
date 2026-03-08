import { AthenaClient } from '@aws-sdk/client-athena';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '@uniflow/logger';
import { SegmentEvaluator } from './SegmentEvaluator.js';

const log = logger.child({ service: 'audience-builder' });

async function main(): Promise<void> {
  const tableName = process.env.PROFILE_TABLE_NAME;
  const rawBucket = process.env.RAW_BUCKET_NAME;
  const athenaOutputBucket = process.env.ATHENA_OUTPUT_BUCKET ?? rawBucket;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  if (!tableName || !rawBucket) {
    throw new Error('PROFILE_TABLE_NAME and RAW_BUCKET_NAME are required');
  }

  log.info('Audience builder starting', { tableName, rawBucket });

  const athena = new AthenaClient({ region });
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  const evaluator = new SegmentEvaluator(
    athena,
    dynamo,
    tableName,
    rawBucket,
    athenaOutputBucket!
  );

  await evaluator.evaluateAll();

  log.info('Audience builder complete');
}

main().catch((err) => {
  logger.error('Audience builder failed', { error: String(err) });
  process.exit(1);
});
