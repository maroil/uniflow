import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StorageConstruct } from '../constructs/StorageConstruct';
import { IngestionConstruct } from '../constructs/IngestionConstruct';
import { ProcessingConstruct } from '../constructs/ProcessingConstruct';
import { AudienceConstruct } from '../constructs/AudienceConstruct';
import { AdminConstruct } from '../constructs/AdminConstruct';

export interface UnifowStackProps extends cdk.StackProps {
  /** Admin email for Cognito user pool */
  adminEmail: string;
  /** S3/DynamoDB retention in days */
  retentionDays?: number;
  /** Connectors to enable */
  connectors?: string[];
}

export class UnifowStack extends cdk.Stack {
  public readonly storage: StorageConstruct;
  public readonly ingestion: IngestionConstruct;
  public readonly processing: ProcessingConstruct;
  public readonly audience: AudienceConstruct;
  public readonly admin: AdminConstruct;

  constructor(scope: Construct, id: string, props: UnifowStackProps) {
    super(scope, id, props);

    this.storage = new StorageConstruct(this, 'Storage', {
      retentionDays: props.retentionDays ?? 90,
    });

    this.ingestion = new IngestionConstruct(this, 'Ingestion', {
      eventStream: this.storage.eventStream,
    });

    this.processing = new ProcessingConstruct(this, 'Processing', {
      eventStream: this.storage.eventStream,
      profileTable: this.storage.profileTable,
    });

    this.audience = new AudienceConstruct(this, 'Audience', {
      profileTable: this.storage.profileTable,
      rawBucket: this.storage.rawBucket,
    });

    this.admin = new AdminConstruct(this, 'Admin', {
      adminEmail: props.adminEmail,
      profileTable: this.storage.profileTable,
    });

    // Outputs
    new cdk.CfnOutput(this, 'IngestEndpoint', {
      value: this.ingestion.apiEndpoint,
      description: 'HTTP endpoint for sending events',
    });

    new cdk.CfnOutput(this, 'AdminUrl', {
      value: this.admin.cloudFrontUrl,
      description: 'Admin dashboard URL',
    });
  }
}
