import type { UnifowConfig, TrackOptions, IdentifyOptions, PageOptions } from './types';

const DEFAULT_HOST = 'https://ingest.uniflow.io';
const DEFAULT_FLUSH_AT = 20;
const DEFAULT_FLUSH_INTERVAL = 10_000;

interface QueuedEvent {
  type: string;
  [key: string]: unknown;
}

export class UnifowClient {
  private readonly config: Required<UnifowConfig>;
  private queue: QueuedEvent[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private anonymousId: string;

  constructor(config: UnifowConfig) {
    this.config = {
      writeKey: config.writeKey,
      host: config.host ?? DEFAULT_HOST,
      flushAt: config.flushAt ?? DEFAULT_FLUSH_AT,
      flushInterval: config.flushInterval ?? DEFAULT_FLUSH_INTERVAL,
    };
    this.anonymousId = this.getOrCreateAnonymousId();
    this.startFlushTimer();
  }

  track(options: TrackOptions): void {
    this.enqueue({
      type: 'track',
      event: options.event,
      properties: options.properties,
      userId: options.userId,
      anonymousId: options.anonymousId ?? this.anonymousId,
      timestamp: options.timestamp ?? new Date().toISOString(),
      messageId: this.uuid(),
    });
  }

  identify(options: IdentifyOptions): void {
    this.enqueue({
      type: 'identify',
      userId: options.userId,
      traits: options.traits,
      anonymousId: options.anonymousId ?? this.anonymousId,
      timestamp: new Date().toISOString(),
      messageId: this.uuid(),
    });
  }

  page(options: PageOptions = {}): void {
    this.enqueue({
      type: 'page',
      name: options.name,
      properties: options.properties,
      userId: options.userId,
      anonymousId: options.anonymousId ?? this.anonymousId,
      timestamp: new Date().toISOString(),
      messageId: this.uuid(),
    });
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    await this.send(batch);
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush().catch(() => {});
  }

  private enqueue(event: QueuedEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.config.flushAt) {
      void this.flush();
    }
  }

  private async send(events: QueuedEvent[]): Promise<void> {
    try {
      await fetch(`${this.config.host}/v1/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(this.config.writeKey + ':')}`,
        },
        body: JSON.stringify({ batch: events, sentAt: new Date().toISOString() }),
      });
    } catch (err) {
      // Re-queue events on network failure (best-effort)
      this.queue.unshift(...events);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushInterval);
  }

  private getOrCreateAnonymousId(): string {
    try {
      const stored = localStorage.getItem('uniflow_anonymous_id');
      if (stored) return stored;
      const id = this.uuid();
      localStorage.setItem('uniflow_anonymous_id', id);
      return id;
    } catch {
      return this.uuid();
    }
  }

  private uuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
