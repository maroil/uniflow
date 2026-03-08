import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { UnifowStack } from './UnifowStack';

function createTemplate(): Template {
  const app = new cdk.App();
  const stack = new UnifowStack(app, 'TestStack', {
    adminEmail: 'test@example.com',
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('UnifowStack', () => {
  it('synthesizes without errors', () => {
    expect(createTemplate()).toBeDefined();
  });
});

describe('StorageConstruct', () => {
  const template = createTemplate();

  it('creates a DynamoDB table with PAY_PER_REQUEST billing', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
    });
  });

  it('creates DynamoDB table with GSI', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'gsi1' }),
      ]),
    });
  });

  it('creates a Kinesis stream with 7-day retention', () => {
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      RetentionPeriodHours: 168,
      ShardCount: 2,
    });
  });

  it('creates raw and processed S3 buckets', () => {
    const buckets = template.findResources('AWS::S3::Bucket');
    expect(Object.keys(buckets).length).toBeGreaterThanOrEqual(2);
  });

  it('creates a Firehose delivery stream', () => {
    template.resourceCountIs('AWS::KinesisFirehose::DeliveryStream', 1);
  });

  it('creates a Glue database', () => {
    template.hasResourceProperties('AWS::Glue::Database', {
      CatalogId: '123456789012',
      DatabaseInput: Match.objectLike({ Name: 'uniflow' }),
    });
  });

  it('creates a Glue table for raw events', () => {
    template.hasResourceProperties('AWS::Glue::Table', {
      TableInput: Match.objectLike({ Name: 'uniflow_raw_events' }),
    });
  });

  it('creates a KMS key with rotation enabled', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });
});

describe('IngestionConstruct', () => {
  const template = createTemplate();

  it('creates an HTTP API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'uniflow-ingest',
      ProtocolType: 'HTTP',
    });
  });

  it('creates ingest Lambda with Kinesis env var', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs20.x',
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          KINESIS_STREAM_NAME: Match.anyValue(),
        }),
      }),
    });
  });

  it('creates API routes for track/identify/page/group/batch', () => {
    const routes = template.findResources('AWS::ApiGatewayV2::Route');
    const routeKeys = Object.values(routes).map(
      (r: any) => r.Properties.RouteKey
    );
    expect(routeKeys).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/v1/track'),
        expect.stringContaining('/v1/identify'),
        expect.stringContaining('/v1/page'),
        expect.stringContaining('/v1/group'),
        expect.stringContaining('/v1/batch'),
      ])
    );
  });
});

describe('ProcessingConstruct', () => {
  const template = createTemplate();

  it('creates processor Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          DESTINATION_QUEUE_URL: Match.anyValue(),
        }),
      }),
    });
  });

  it('creates SQS destination queue with DLQ', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 300,
    });
  });

  it('creates Kinesis event source mapping', () => {
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 100,
      BisectBatchOnError: true,
    });
  });
});

describe('AudienceConstruct', () => {
  const template = createTemplate();

  it('creates an ECS cluster', () => {
    template.resourceCountIs('AWS::ECS::Cluster', 1);
  });

  it('creates a Fargate task definition', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      RequiresCompatibilities: ['FARGATE'],
      Cpu: '512',
      Memory: '2048',
    });
  });

  it('creates an EventBridge schedule', () => {
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      ScheduleExpression: 'rate(1 hour)',
    });
  });
});

describe('AdminConstruct', () => {
  const template = createTemplate();

  it('creates a Cognito User Pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Policies: Match.objectLike({
        PasswordPolicy: Match.objectLike({ MinimumLength: 12 }),
      }),
    });
  });

  it('creates a CloudFront distribution', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  it('creates admin user in user pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
      Username: 'test@example.com',
    });
  });

  it('creates management API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'uniflow-management',
    });
  });
});

describe('ActivationConstruct', () => {
  const template = createTemplate();

  it('creates connector Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          SECRETS_PREFIX: 'uniflow/destinations',
        }),
      }),
    });
  });

  it('creates connector DLQ', () => {
    // At least 2 DLQs: one in Processing, one in Activation
    const queues = template.findResources('AWS::SQS::Queue');
    expect(Object.keys(queues).length).toBeGreaterThanOrEqual(3);
  });
});

describe('Stack outputs', () => {
  const template = createTemplate();

  it('exports IngestEndpoint', () => {
    template.hasOutput('IngestEndpoint', {});
  });

  it('exports AdminUrl', () => {
    template.hasOutput('AdminUrl', {});
  });
});
