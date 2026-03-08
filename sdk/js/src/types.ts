export interface UnifowConfig {
  writeKey: string;
  host?: string;
  flushAt?: number;
  flushInterval?: number;
}

export interface TrackOptions {
  event: string;
  properties?: Record<string, unknown>;
  userId?: string;
  anonymousId?: string;
  timestamp?: string;
}

export interface IdentifyOptions {
  userId: string;
  traits?: Record<string, unknown>;
  anonymousId?: string;
}

export interface PageOptions {
  name?: string;
  properties?: Record<string, unknown>;
  userId?: string;
  anonymousId?: string;
}
