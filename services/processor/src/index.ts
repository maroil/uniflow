import type { KinesisStreamEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AnyEventSchema } from '@uniflow/event-schema';
import { IdentityResolver } from '@uniflow/identity';
import { logger } from '@uniflow/logger';
import { DynamoIdentityGraph } from './DynamoIdentityGraph';
import { upsertProfile } from './profileUpsert';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

const TABLE_NAME = process.env.PROFILE_TABLE_NAME!;
const DEST_QUEUE_URL = process.env.DESTINATION_QUEUE_URL!;

const identityGraph = new DynamoIdentityGraph(dynamo, TABLE_NAME);
const resolver = new IdentityResolver(identityGraph);

export async function handler(event: KinesisStreamEvent): Promise<void> {
  const log = logger.child({ fn: 'processor' });

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        const payload = JSON.parse(
          Buffer.from(record.kinesis.data, 'base64').toString('utf-8')
        );

        const parsed = AnyEventSchema.parse(payload);
        const identity = await resolver.resolve(parsed);

        const userId = identity.userId ?? parsed.anonymousId ?? 'unknown';

        // Upsert profile and event history
        await upsertProfile(dynamo, TABLE_NAME, userId, parsed);

        if (identity.isNewLink) {
          log.info('Identity linked', {
            anonymousId: parsed.anonymousId,
            userId: identity.userId,
          });
        }

        // Fan-out to destinations
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: DEST_QUEUE_URL,
            MessageBody: JSON.stringify({ event: parsed, userId }),
          })
        );
      } catch (err) {
        log.error('Failed to process record', {
          sequenceNumber: record.kinesis.sequenceNumber,
          error: String(err),
        });
        throw err; // Rethrow to trigger DLQ
      }
    })
  );
}
