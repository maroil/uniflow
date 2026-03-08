import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as path from 'path';
import { Construct } from 'constructs';

export interface IngestionConstructProps {
  eventStream: kinesis.Stream;
}

export class IngestionConstruct extends Construct {
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: IngestionConstructProps) {
    super(scope, id);

    // Ingest Lambda
    const ingestFn = new lambda.Function(this, 'IngestFn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../../../services/ingest/dist')
      ),
      environment: {
        KINESIS_STREAM_NAME: props.eventStream.streamName,
        LOG_LEVEL: 'info',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    props.eventStream.grantWrite(ingestFn);

    // HTTP API Gateway
    const api = new apigwv2.HttpApi(this, 'IngestApi', {
      apiName: 'uniflow-ingest',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const integration = new integrations.HttpLambdaIntegration('IngestIntegration', ingestFn);

    // Segment-compatible routes
    api.addRoutes({ path: '/v1/track', methods: [apigwv2.HttpMethod.POST], integration });
    api.addRoutes({ path: '/v1/identify', methods: [apigwv2.HttpMethod.POST], integration });
    api.addRoutes({ path: '/v1/page', methods: [apigwv2.HttpMethod.POST], integration });
    api.addRoutes({ path: '/v1/group', methods: [apigwv2.HttpMethod.POST], integration });
    api.addRoutes({ path: '/v1/batch', methods: [apigwv2.HttpMethod.POST], integration });

    this.apiEndpoint = api.apiEndpoint;
  }
}
