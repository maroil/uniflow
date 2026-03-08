const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Sources ---

export interface Source {
  id: string;
  name: string;
  type: string;
  writeKey?: string;
  createdAt: string;
  updatedAt: string;
}

export const sources = {
  list: (token?: string) =>
    request<{ items: Source[] }>('/api/sources', { token }),
  create: (data: { name: string }, token?: string) =>
    request<Source & { writeKey: string }>('/api/sources', { method: 'POST', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ success: boolean }>(`/api/sources/${id}`, { method: 'DELETE', token }),
};

// --- Destinations ---

export interface Destination {
  id: string;
  name: string;
  type: 'webhook' | 's3-export';
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const destinations = {
  list: (token?: string) =>
    request<{ items: Destination[] }>('/api/destinations', { token }),
  create: (data: Omit<Destination, 'id' | 'createdAt' | 'updatedAt'>, token?: string) =>
    request<Destination>('/api/destinations', { method: 'POST', body: data, token }),
  update: (id: string, data: Partial<Destination>, token?: string) =>
    request<Destination>(`/api/destinations/${id}`, { method: 'PUT', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ success: boolean }>(`/api/destinations/${id}`, { method: 'DELETE', token }),
};

// --- Segments ---

export interface SegmentRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists';
  value?: unknown;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  createdAt: string;
  updatedAt: string;
}

export const segments = {
  list: (token?: string) =>
    request<{ items: Segment[] }>('/api/segments', { token }),
  create: (data: { name: string; description?: string; rules: SegmentRule[] }, token?: string) =>
    request<Segment>('/api/segments', { method: 'POST', body: data, token }),
  update: (id: string, data: Partial<Segment>, token?: string) =>
    request<Segment>(`/api/segments/${id}`, { method: 'PUT', body: data, token }),
  delete: (id: string, token?: string) =>
    request<{ success: boolean }>(`/api/segments/${id}`, { method: 'DELETE', token }),
  members: (id: string, token?: string) =>
    request<{ members: string[] }>(`/api/segments/${id}/members`, { token }),
};

// --- Profiles ---

export interface Profile {
  pk: string;
  updatedAt?: string;
  lastSeen?: string;
  traits?: Record<string, unknown>;
}

export interface ProfileEvent {
  sk: string;
  type: string;
  event?: string;
  timestamp: string;
  properties?: Record<string, unknown>;
}

export const profiles = {
  get: (userId: string, token?: string) =>
    request<{ profile: Profile; events: ProfileEvent[] }>(`/api/profiles/${encodeURIComponent(userId)}`, { token }),
};
