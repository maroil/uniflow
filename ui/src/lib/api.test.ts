import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCurrentToken = vi.fn();

vi.mock('./auth', () => ({
  getCurrentToken: () => mockGetCurrentToken(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('api request — JWT auto-attach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com';
  });

  it('attaches JWT from getCurrentToken when no explicit token provided', async () => {
    mockGetCurrentToken.mockResolvedValue('auto-jwt-token');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const { sources } = await import('./api');
    await sources.list();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/api/sources',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer auto-jwt-token',
        }),
      }),
    );
  });

  it('uses explicit token over auto-token', async () => {
    mockGetCurrentToken.mockResolvedValue('auto-jwt');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const { sources } = await import('./api');
    await sources.list('explicit-jwt');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer explicit-jwt',
        }),
      }),
    );
  });

  it('sends no Authorization header when no token available', async () => {
    mockGetCurrentToken.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });

    const { sources } = await import('./api');
    await sources.list();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('throws ApiError on non-ok response', async () => {
    mockGetCurrentToken.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Invalid token' }),
    });

    const { sources, ApiError } = await import('./api');
    await expect(sources.list()).rejects.toThrow(ApiError);
  });
});
