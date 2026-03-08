import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './index';

const dynamoMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  dynamoMock.reset();
  process.env.PROFILE_TABLE_NAME = 'test-table';
});

function mockEvent(authHeader?: string): any {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    requestContext: { http: { method: 'POST', path: '/v1/track' } },
  };
}

describe('authorizer', () => {
  it('rejects missing auth header', async () => {
    const result = await handler(mockEvent());
    expect(result.isAuthorized).toBe(false);
  });

  it('authorizes valid Basic auth write key', async () => {
    const writeKey = 'wk_test_123';
    const authHeader = `Basic ${Buffer.from(writeKey + ':').toString('base64')}`;

    dynamoMock.on(QueryCommand).resolves({
      Items: [{ id: 'src_abc', writeKeyHash: 'xxx' }],
    });

    const result = await handler(mockEvent(authHeader));
    expect(result.isAuthorized).toBe(true);
    expect(result.context.sourceId).toBe('src_abc');
  });

  it('authorizes valid Bearer token', async () => {
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ id: 'src_def' }],
    });

    const result = await handler(mockEvent('Bearer wk_test_456'));
    expect(result.isAuthorized).toBe(true);
    expect(result.context.sourceId).toBe('src_def');
  });

  it('rejects unknown write key', async () => {
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    const result = await handler(mockEvent('Bearer wk_bad'));
    expect(result.isAuthorized).toBe(false);
  });
});
