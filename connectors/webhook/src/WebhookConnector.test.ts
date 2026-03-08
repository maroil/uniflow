import { describe, it, expect, vi } from 'vitest';
import { WebhookConnector } from './WebhookConnector';

describe('WebhookConnector', () => {
  const connector = new WebhookConnector();

  it('has correct metadata', () => {
    expect(connector.metadata.id).toBe('webhook');
  });

  it('sends POST request to webhook URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await connector.handle(
      {
        event: {
          type: 'track',
          event: 'Test Event',
          userId: 'user_1',
          messageId: 'msg_1',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        userId: 'user_1',
        destinationId: 'dest_1',
        destinationConfig: {},
      },
      { url: 'https://example.com/hook', method: 'POST', maxRetries: 3 }
    );

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/hook', expect.any(Object));
    vi.unstubAllGlobals();
  });

  it('returns error on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' }));

    const result = await connector.handle(
      {
        event: {
          type: 'track',
          event: 'Test',
          userId: 'u',
          messageId: 'm',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        userId: 'u',
        destinationId: 'd',
        destinationConfig: {},
      },
      { url: 'https://example.com/hook', method: 'POST', maxRetries: 0 }
    );

    expect(result.success).toBe(false);
    vi.unstubAllGlobals();
  });
});
