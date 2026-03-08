import type { AnyEvent } from '@uniflow/event-schema';

export interface ConnectorEvent {
  event: AnyEvent;
  userId: string;
  destinationId: string;
  destinationConfig: unknown;
}

export interface ConnectorResult {
  success: boolean;
  error?: string;
}
