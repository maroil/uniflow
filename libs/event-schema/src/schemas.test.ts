import { describe, it, expect } from 'vitest';
import { AnyEventSchema, TrackEventSchema } from './schemas';

describe('TrackEventSchema', () => {
  it('validates a valid track event', () => {
    const event = {
      type: 'track' as const,
      event: 'Button Clicked',
      userId: 'user_123',
      messageId: 'msg_abc',
      timestamp: '2024-01-01T00:00:00.000Z',
      properties: { buttonName: 'signup' },
    };
    expect(() => TrackEventSchema.parse(event)).not.toThrow();
  });

  it('rejects event without userId or anonymousId', () => {
    const event = {
      type: 'track' as const,
      event: 'Button Clicked',
      messageId: 'msg_abc',
      timestamp: '2024-01-01T00:00:00.000Z',
    };
    expect(() => TrackEventSchema.parse(event)).toThrow();
  });
});

describe('Event enrichment fields', () => {
  it('accepts events with sourceId and receivedAt', () => {
    const event = {
      type: 'track' as const,
      event: 'Page Loaded',
      userId: 'user_456',
      messageId: 'msg_xyz',
      timestamp: '2024-01-01T00:00:00.000Z',
      sourceId: 'src_abc',
      receivedAt: '2024-01-01T00:00:01.000Z',
    };
    expect(() => TrackEventSchema.parse(event)).not.toThrow();
    const result = AnyEventSchema.parse(event);
    expect(result.sourceId).toBe('src_abc');
    expect(result.receivedAt).toBe('2024-01-01T00:00:01.000Z');
  });
});

describe('AnyEventSchema', () => {
  it('discriminates event types correctly', () => {
    const identify = {
      type: 'identify' as const,
      userId: 'user_123',
      messageId: 'msg_abc',
      timestamp: '2024-01-01T00:00:00.000Z',
      traits: { email: 'user@example.com', name: 'Alice' },
    };
    const result = AnyEventSchema.parse(identify);
    expect(result.type).toBe('identify');
  });
});
