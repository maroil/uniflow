import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ActivationConstructProps {
  destinationQueue: sqs.Queue;
  profileTable: dynamodb.Table;
}

export class ActivationConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ActivationConstructProps) {
    super(scope, id);

    // Dead-letter queue for connector failures
    const connectorDlq = new sqs.Queue(this, 'ConnectorDlq', {
      retentionPeriod: cdk.Duration.days(14),
    });

    // Secrets Manager for destination credentials
    const secretsPrefix = 'uniflow/destinations';

    // Connector Lambda — generic handler that dispatches to the right connector
    const connectorFn = new lambda.Function(this, 'ConnectorFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../services/connector/dist')
      ),
      environment: {
        PROFILE_TABLE_NAME: props.profileTable.tableName,
        SECRETS_PREFIX: secretsPrefix,
        LOG_LEVEL: 'info',
      },
      timeout: cdk.Duration.minutes(2),
      memorySize: 256,
      deadLetterQueue: connectorDlq,
    });

    // Permissions
    props.profileTable.grantReadData(connectorFn);

    // Read secrets for destination credentials
    connectorFn.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          cdk.Arn.format(
            { service: 'secretsmanager', resource: 'secret', resourceName: `${secretsPrefix}/*` },
            cdk.Stack.of(this)
          ),
        ],
      })
    );

    // SQS event source (reads from the shared destination queue)
    connectorFn.addEventSource(
      new lambdaEventSources.SqsEventSource(props.destinationQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
      })
    );
  }
}
