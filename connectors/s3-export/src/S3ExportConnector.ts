import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BaseConnector, type ConnectorMetadata } from '@uniflow/connector-sdk';
import type { ConnectorEvent, ConnectorResult } from '@uniflow/connector-sdk';

const S3ExportConfigSchema = z.object({
  bucketName: z.string().min(1),
  prefix: z.string().default('exports/'),
  region: z.string().default('us-east-1'),
});

type S3ExportConfig = z.infer<typeof S3ExportConfigSchema>;

export class S3ExportConnector extends BaseConnector<S3ExportConfig> {
  readonly metadata: ConnectorMetadata = {
    id: 's3-export',
    name: 'S3 Export',
    description: 'Export events to an S3 bucket as newline-delimited JSON',
    configSchema: S3ExportConfigSchema,
  };

  async handle(connectorEvent: ConnectorEvent, config: S3ExportConfig): Promise<ConnectorResult> {
    const s3 = new S3Client({ region: config.region });
    const { event, userId } = connectorEvent;
    const date = new Date(event.timestamp);
    const key = [
      config.prefix,
      `year=${date.getUTCFullYear()}`,
      `month=${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      `day=${String(date.getUTCDate()).padStart(2, '0')}`,
      `${userId}-${event.messageId}.json`,
    ].join('/');

    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: JSON.stringify({ event, userId, exportedAt: new Date().toISOString() }),
        ContentType: 'application/json',
      })
    );

    return { success: true };
  }
}
