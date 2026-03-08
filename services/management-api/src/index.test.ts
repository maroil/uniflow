import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  dynamoMock.reset();
  process.env.PROFILE_TABLE_NAME = 'test-table';
  process.env.USER_POOL_ID = 'us-east-1_test';
  process.env.USER_POOL_CLIENT_ID = 'client_test';
});

function mockEvent(method: string, path: string, body?: unknown): any {
  return {
    requestContext: {
      requestId: 'req_1',
      http: { method, path },
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}

describe('management-api', () => {
  it('lists sources', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [{ id: 's1', name: 'Web' }] });
    const { handler } = await import('./index');
    const result = await handler(mockEvent('GET', '/api/sources'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.items).toHaveLength(1);
  });

  it('creates a source with writeKey', async () => {
    dynamoMock.on(PutCommand).resolves({});
    const { handler } = await import('./index');
    const result = await handler(mockEvent('POST', '/api/sources', { name: 'Mobile App' }));
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body as string);
    expect(body.writeKey).toBeDefined();
    expect(body.writeKey.startsWith('wk_')).toBe(true);
  });

  it('deletes a source', async () => {
    dynamoMock.on(DeleteCommand).resolves({});
    const { handler } = await import('./index');
    const result = await handler(mockEvent('DELETE', '/api/sources/src_123'));
    expect(result.statusCode).toBe(200);
  });

  it('creates a destination', async () => {
    dynamoMock.on(PutCommand).resolves({});
    const { handler } = await import('./index');
    const result = await handler(
      mockEvent('POST', '/api/destinations', {
        name: 'My Webhook',
        type: 'webhook',
        config: { url: 'https://example.com/hook' },
      })
    );
    expect(result.statusCode).toBe(201);
  });

  it('creates a segment', async () => {
    dynamoMock.on(PutCommand).resolves({});
    const { handler } = await import('./index');
    const result = await handler(
      mockEvent('POST', '/api/segments', {
        name: 'Power Users',
        rules: [{ field: 'traits.plan', operator: 'eq', value: 'pro' }],
      })
    );
    expect(result.statusCode).toBe(201);
  });

  it('gets a profile with events', async () => {
    dynamoMock.on(QueryCommand).resolves({
      Items: [
        { pk: 'PROFILE#user_1', sk: 'META', updatedAt: '2024-01-01T00:00:00Z' },
        { pk: 'PROFILE#user_1', sk: 'EVENT#2024-01-01T00:00:00Z#msg_1', type: 'track', event: 'Click', timestamp: '2024-01-01T00:00:00Z' },
      ],
    });
    const { handler } = await import('./index');
    const result = await handler(mockEvent('GET', '/api/profiles/user_1'));
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body.profile).toBeDefined();
    expect(body.events).toHaveLength(1);
  });

  it('returns 404 for unknown profile', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    const { handler } = await import('./index');
    const result = await handler(mockEvent('GET', '/api/profiles/unknown'));
    expect(result.statusCode).toBe(404);
  });

  it('returns 404 for unknown route', async () => {
    const { handler } = await import('./index');
    const result = await handler(mockEvent('GET', '/api/nonexistent'));
    expect(result.statusCode).toBe(404);
  });
});
