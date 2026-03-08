import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { handler } from './index';

const kinesisMock = mockClient(KinesisClient);

beforeEach(() => {
  kinesisMock.reset();
  process.env.KINESIS_STREAM_NAME = 'test-stream';
});

function mockEvent(path: string, body: unknown) {
  return {
    body: JSON.stringify(body),
    requestContext: {
      requestId: 'req_123',
      http: { path },
    },
  } as any;
}

describe('ingest handler', () => {
  it('returns 400 for missing body', async () => {
    const result = await handler({ requestContext: { requestId: 'r', http: { path: '/v1/track' } } } as any);
    expect(result.statusCode).toBe(400);
  });

  it('validates and forwards track event to Kinesis', async () => {
    kinesisMock.on(PutRecordCommand).resolves({ ShardId: 'shard-0', SequenceNumber: '1' });

    const result = await handler(
      mockEvent('/v1/track', {
        type: 'track',
        event: 'Button Clicked',
        userId: 'user_123',
        messageId: 'msg_abc',
        timestamp: '2024-01-01T00:00:00.000Z',
      })
    );

    expect(result.statusCode).toBe(200);
    expect(kinesisMock.calls()).toHaveLength(1);
  });

  it('returns 400 for invalid event', async () => {
    const result = await handler(
      mockEvent('/v1/track', {
        type: 'track',
        // missing event field and userId/anonymousId
      })
    );
    expect(result.statusCode).toBe(400);
  });
});
