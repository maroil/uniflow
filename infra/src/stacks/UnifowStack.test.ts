import { describe, it, expect } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UnifowStack } from './UnifowStack';

describe('UnifowStack', () => {
  it('synthesizes without errors', () => {
    const app = new cdk.App();
    const stack = new UnifowStack(app, 'TestStack', {
      adminEmail: 'test@example.com',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const template = Template.fromStack(stack);
    expect(template).toBeDefined();
  });

  it('creates a DynamoDB table', () => {
    const app = new cdk.App();
    const stack = new UnifowStack(app, 'TestStack', {
      adminEmail: 'test@example.com',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
  });

  it('creates a Kinesis stream', () => {
    const app = new cdk.App();
    const stack = new UnifowStack(app, 'TestStack', {
      adminEmail: 'test@example.com',
      env: { account: '123456789012', region: 'us-east-1' },
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Kinesis::Stream', 1);
  });
});
