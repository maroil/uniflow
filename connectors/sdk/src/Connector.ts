import { z, ZodSchema } from 'zod';
import type { ConnectorEvent, ConnectorResult } from './types';

export interface ConnectorMetadata {
  id: string;
  name: string;
  description: string;
  configSchema: ZodSchema;
}

export abstract class BaseConnector<TConfig = unknown> {
  abstract readonly metadata: ConnectorMetadata;

  /** Called for each event routed to this destination */
  abstract handle(event: ConnectorEvent, config: TConfig): Promise<ConnectorResult>;

  /** Validates and parses raw config from Admin UI */
  parseConfig(raw: unknown): TConfig {
    return this.metadata.configSchema.parse(raw) as TConfig;
  }
}
