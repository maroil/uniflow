import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { AnyEventSchema } from '@uniflow/event-schema';
import { logger } from '@uniflow/logger';
import { randomUUID } from 'crypto';

const kinesis = new KinesisClient({});
const STREAM_NAME = process.env.KINESIS_STREAM_NAME!;

function response(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const log = logger.child({ requestId: event.requestContext.requestId });
  const sourceId = (event.requestContext as any).authorizer?.lambda?.sourceId as string | undefined;

  if (!event.body) {
    return response(400, { error: 'Missing request body' });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return response(400, { error: 'Invalid JSON body' });
  }

  // Determine event type from path or body
  const path = event.requestContext.http.path;
  const eventType = path.split('/').pop() as string;

  // For batch endpoint, handle array of events
  if (eventType === 'batch') {
    const batch = raw as { batch?: unknown[] };
    if (!Array.isArray(batch.batch)) {
      return response(400, { error: 'batch field must be an array' });
    }
    const results = await Promise.allSettled(
      batch.batch.map((e) => processEvent(e, log, { sourceId }))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    return response(200, { processed: results.length - failed, failed });
  }

  // Single event
  const singleRaw = raw as Record<string, unknown>;
  if (!singleRaw.type && eventType !== 'batch') {
    singleRaw.type = eventType;
  }

  try {
    await processEvent(singleRaw, log, { sourceId });
    return response(200, { success: true });
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return response(400, { error: 'Validation failed', details: err.message });
    }
    log.error('Failed to process event', { error: String(err) });
    return response(500, { error: 'Internal server error' });
  }
}

async function processEvent(raw: unknown, log: ReturnType<typeof logger.child>, context: { sourceId?: string }): Promise<void> {
  const rawObj = raw as Record<string, unknown>;

  // Enrich with messageId and timestamp if missing
  if (!rawObj.messageId) rawObj.messageId = randomUUID();
  if (!rawObj.timestamp) rawObj.timestamp = new Date().toISOString();

  // Enrich with sourceId and receivedAt
  rawObj.receivedAt = new Date().toISOString();
  if (context.sourceId) rawObj.sourceId = context.sourceId;

  const parsed = AnyEventSchema.parse(rawObj);

  log.info('Received event', { type: parsed.type, userId: parsed.userId });

  await kinesis.send(
    new PutRecordCommand({
      StreamName: STREAM_NAME,
      Data: Buffer.from(JSON.stringify(parsed)),
      PartitionKey: parsed.userId ?? parsed.anonymousId ?? 'unknown',
    })
  );
}
