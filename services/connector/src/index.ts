import type { SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { AnyEventSchema } from '@uniflow/event-schema';
import { logger } from '@uniflow/logger';
import { getConnector } from './registry';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.PROFILE_TABLE_NAME!;

const log = logger.child({ service: 'connector' });

interface QueueMessage {
  event: unknown;
  userId: string;
}

interface Destination {
  id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

// Cache destinations for 60s
let destCache: { items: Destination[]; expiresAt: number } | null = null;

async function getEnabledDestinations(): Promise<Destination[]> {
  if (destCache && destCache.expiresAt > Date.now()) {
    return destCache.items;
  }

  const result = await dynamo.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(pk, :prefix) AND sk = :meta',
      ExpressionAttributeValues: { ':prefix': 'DEST#', ':meta': 'META' },
    })
  );

  const items = (result.Items ?? []) as Destination[];
  const enabled = items.filter((d) => d.enabled !== false);
  destCache = { items: enabled, expiresAt: Date.now() + 60_000 };
  return enabled;
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const failures: SQSBatchItemFailure[] = [];
  const destinations = await getEnabledDestinations();

  for (const record of event.Records) {
    try {
      const message: QueueMessage = JSON.parse(record.body);
      const parsed = AnyEventSchema.parse(message.event);

      for (const dest of destinations) {
        const connector = getConnector(dest.type);
        if (!connector) {
          log.warn('No connector for type', { type: dest.type, destId: dest.id });
          continue;
        }

        try {
          const validatedConfig = connector.parseConfig(dest.config);
          const result = await connector.handle(
            {
              event: parsed,
              userId: message.userId,
              destinationId: dest.id,
              destinationConfig: dest.config,
            },
            validatedConfig
          );

          if (!result.success) {
            log.error('Delivery failed', {
              connector: dest.type,
              destId: dest.id,
              error: result.error,
            });
          } else {
            log.info('Delivered', { connector: dest.type, destId: dest.id });
          }
        } catch (err) {
          log.error('Connector error', { destId: dest.id, error: String(err) });
        }
      }
    } catch (err) {
      log.error('SQS record processing failed', {
        messageId: record.messageId,
        error: String(err),
      });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
