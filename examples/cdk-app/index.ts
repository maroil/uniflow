/**
 * Example CDK app showing how to deploy Uniflow to your AWS account
 * using the @uniflow/cdk package.
 */
import * as cdk from 'aws-cdk-lib';
import { UnifowStack } from '@uniflow/cdk';

const app = new cdk.App();

new UnifowStack(app, 'UnifowStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  adminEmail: app.node.tryGetContext('adminEmail') ?? 'admin@example.com',
  retentionDays: Number(app.node.tryGetContext('retentionDays') ?? 90),
  connectors: ['webhook', 's3-export'],
});

app.synth();
