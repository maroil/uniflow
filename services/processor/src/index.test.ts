import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const dynamoMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

beforeEach(() => {
  dynamoMock.reset();
  sqsMock.reset();
  process.env.PROFILE_TABLE_NAME = 'test-table';
  process.env.DESTINATION_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/test-queue';
});

function makeKinesisRecord(event: unknown): any {
  const data = Buffer.from(JSON.stringify(event)).toString('base64');
  return {
    kinesis: {
      data,
      sequenceNumber: 'seq_1',
      partitionKey: 'pk',
      approximateArrivalTimestamp: Date.now() / 1000,
    },
    eventSource: 'aws:kinesis',
    eventSourceARN: 'arn:aws:kinesis:us-east-1:123:stream/test',
  };
}

describe('processor handler', () => {
  it('processes a track event and upserts profile', async () => {
    // Mock identity graph lookup (no existing link)
    dynamoMock.on(GetCommand).resolves({ Item: undefined });
    dynamoMock.on(PutCommand).resolves({});
    dynamoMock.on(UpdateCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const { handler } = await import('./index');

    await handler({
      Records: [
        makeKinesisRecord({
          type: 'track',
          event: 'Button Clicked',
          userId: 'user_1',
          messageId: 'msg_1',
          timestamp: '2024-01-01T00:00:00.000Z',
          properties: { button: 'signup' },
        }),
      ],
    } as any);

    // Should have sent to SQS
    expect(sqsMock.calls()).toHaveLength(1);
    // Should have called DynamoDB for profile upsert
    expect(dynamoMock.calls().length).toBeGreaterThanOrEqual(2);
  });

  it('processes an identify event and links identity', async () => {
    dynamoMock.on(GetCommand).resolves({ Item: undefined });
    dynamoMock.on(PutCommand).resolves({});
    dynamoMock.on(UpdateCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({});

    const { handler } = await import('./index');

    await handler({
      Records: [
        makeKinesisRecord({
          type: 'identify',
          userId: 'user_1',
          anonymousId: 'anon_1',
          messageId: 'msg_2',
          timestamp: '2024-01-01T00:00:00.000Z',
          traits: { email: 'test@example.com' },
        }),
      ],
    } as any);

    // Should link identity (PutCommand for ANON# record)
    const putCalls = dynamoMock.commandCalls(PutCommand);
    const identityPut = putCalls.find(
      (c) => c.args[0].input.Item?.pk?.startsWith('ANON#')
    );
    expect(identityPut).toBeDefined();
  });

  it('throws on invalid event to trigger DLQ', async () => {
    const { handler } = await import('./index');

    await expect(
      handler({
        Records: [makeKinesisRecord({ invalid: true })],
      } as any)
    ).rejects.toThrow();
  });
});
