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
