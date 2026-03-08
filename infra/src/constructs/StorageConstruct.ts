import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface StorageConstructProps {
  retentionDays: number;
}

export class StorageConstruct extends Construct {
  public readonly profileTable: dynamodb.Table;
  public readonly eventStream: kinesis.Stream;
  public readonly rawBucket: s3.Bucket;
  public readonly processedBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    // DynamoDB single-table design
    this.profileTable = new dynamodb.Table(this, 'ProfileTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // GSI for segment membership queries
    this.profileTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
    });

    // Kinesis Data Stream (7-day retention)
    this.eventStream = new kinesis.Stream(this, 'EventStream', {
      retentionPeriod: cdk.Duration.days(7),
      shardCount: 2,
      encryption: kinesis.StreamEncryption.MANAGED,
    });

    // S3 raw bucket (immutable Parquet archive)
    this.rawBucket = new s3.Bucket(this, 'RawBucket', {
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(props.retentionDays),
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // S3 processed bucket (for Athena queries)
    this.processedBucket = new s3.Bucket(this, 'ProcessedBucket', {
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Kinesis Firehose → S3 (raw events in Parquet-like JSON)
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });
    this.rawBucket.grantWrite(firehoseRole);
    this.eventStream.grantRead(firehoseRole);

    new firehose.CfnDeliveryStream(this, 'EventFirehose', {
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: this.eventStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      s3DestinationConfiguration: {
        bucketArn: this.rawBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        prefix: 'raw/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/',
        errorOutputPrefix: 'errors/',
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 64,
        },
        compressionFormat: 'GZIP',
      },
    });
  }
}
