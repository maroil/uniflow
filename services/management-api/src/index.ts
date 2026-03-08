import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '@uniflow/logger';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.PROFILE_TABLE_NAME!;

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

const SourceSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('http'),
});

const DestinationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['webhook', 's3-export']),
  config: z.record(z.unknown()),
  enabled: z.boolean().default(true),
});

const SegmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(
    z.object({
      field: z.string(),
      operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains', 'exists']),
      value: z.unknown().optional(),
    })
  ),
});

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const log = logger.child({ path: event.requestContext.http.path });
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    // Sources
    if (path === '/api/sources' && method === 'GET') {
      return await listEntities('SOURCE');
    }
    if (path === '/api/sources' && method === 'POST') {
      return await createEntity('SOURCE', SourceSchema, event.body);
    }
    if (path.match(/^\/api\/sources\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!;
      return await deleteEntity('SOURCE', id);
    }

    // Destinations
    if (path === '/api/destinations' && method === 'GET') {
      return await listEntities('DEST');
    }
    if (path === '/api/destinations' && method === 'POST') {
      return await createEntity('DEST', DestinationSchema, event.body);
    }
    if (path.match(/^\/api\/destinations\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!;
      return await deleteEntity('DEST', id);
    }

    // Segments
    if (path === '/api/segments' && method === 'GET') {
      return await listEntities('SEGMENT');
    }
    if (path === '/api/segments' && method === 'POST') {
      return await createEntity('SEGMENT', SegmentSchema, event.body);
    }
    if (path.match(/^\/api\/segments\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop()!;
      return await deleteEntity('SEGMENT', id);
    }

    // Profile explorer
    if (path.match(/^\/api\/profiles\/[^/]+$/) && method === 'GET') {
      const userId = path.split('/').pop()!;
      return await getProfile(userId);
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    log.error('Unhandled error', { error: String(err) });
    return json(500, { error: 'Internal server error' });
  }
}

async function listEntities(prefix: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'begins_with(pk, :prefix) AND sk = :meta',
      ExpressionAttributeValues: { ':prefix': `${prefix}#`, ':meta': 'META' },
    })
  );
  return json(200, { items: result.Items ?? [] });
}

async function createEntity(
  prefix: string,
  schema: z.ZodSchema,
  body: string | undefined
): Promise<APIGatewayProxyResultV2> {
  if (!body) return json(400, { error: 'Missing body' });

  const parsed = schema.parse(JSON.parse(body));
  const id = randomUUID();
  const now = new Date().toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `${prefix}#${id}`,
        sk: 'META',
        id,
        ...parsed,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  return json(201, { id, ...parsed });
}

async function deleteEntity(
  prefix: string,
  id: string
): Promise<APIGatewayProxyResultV2> {
  await dynamo.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: `${prefix}#${id}`, sk: 'META' },
    })
  );
  return json(200, { success: true });
}

async function getProfile(userId: string): Promise<APIGatewayProxyResultV2> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `PROFILE#${userId}` },
      Limit: 100,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return json(404, { error: 'Profile not found' });
  }

  const meta = result.Items.find((i) => i.sk === 'META');
  const events = result.Items.filter((i) => i.sk.startsWith('EVENT#'));

  return json(200, { profile: meta, events });
}
