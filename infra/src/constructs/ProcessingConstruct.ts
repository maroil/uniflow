import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ProcessingConstructProps {
  eventStream: kinesis.Stream;
  profileTable: dynamodb.Table;
}

export class ProcessingConstruct extends Construct {
  public readonly destinationQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: ProcessingConstructProps) {
    super(scope, id);

    // Dead-letter queue for failed events
    const dlq = new sqs.Queue(this, 'ProcessorDlq', {
      retentionPeriod: cdk.Duration.days(14),
    });

    // Destination fan-out queue
    this.destinationQueue = new sqs.Queue(this, 'DestinationQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 3 },
    });

    // Stream processor Lambda
    const processorFn = new lambda.Function(this, 'ProcessorFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../services/processor/dist')
      ),
      environment: {
        PROFILE_TABLE_NAME: props.profileTable.tableName,
        DESTINATION_QUEUE_URL: this.destinationQueue.queueUrl,
        LOG_LEVEL: 'info',
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    props.profileTable.grantReadWriteData(processorFn);
    this.destinationQueue.grantSendMessages(processorFn);

    // Kinesis event source
    processorFn.addEventSource(
      new lambdaEventSources.KinesisEventSource(props.eventStream, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 100,
        bisectBatchOnError: true,
        retryAttempts: 3,
        onFailure: new lambdaEventSources.SqsDlq(dlq),
      })
    );
  }
}
