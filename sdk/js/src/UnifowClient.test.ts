import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifowClient } from './UnifowClient';

describe('UnifowClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  it('creates client with config', () => {
    const client = new UnifowClient({ writeKey: 'test_key', flushInterval: 99999 });
    expect(client).toBeDefined();
    client.destroy();
  });

  it('flushes queued events on flush()', async () => {
    const client = new UnifowClient({ writeKey: 'test_key', flushInterval: 99999, flushAt: 100 });
    client.track({ event: 'test', userId: 'u1' });
    client.track({ event: 'test2', userId: 'u1' });
    await client.flush();
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    client.destroy();
  });

  it('auto-flushes when queue hits flushAt', async () => {
    const client = new UnifowClient({ writeKey: 'test_key', flushInterval: 99999, flushAt: 2 });
    client.track({ event: 'e1', userId: 'u1' });
    client.track({ event: 'e2', userId: 'u1' }); // triggers flush
    await new Promise((r) => setTimeout(r, 10));
    expect(vi.mocked(fetch)).toHaveBeenCalled();
    client.destroy();
  });
});
