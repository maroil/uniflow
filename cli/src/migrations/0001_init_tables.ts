import type { Migration } from './runner.js';
import type { Config } from '../config.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const migration0001: Migration = {
  id: '0001',
  description: 'Initialize DynamoDB table and verify S3 buckets exist',
  async up(_config: Config, _dynamo: DynamoDBDocumentClient): Promise<void> {
    // The DynamoDB table and S3 buckets are created by CDK.
    // This migration is a no-op placeholder that records successful first deployment.
    // Future migrations can add GSIs, seed data, etc.
  },
};
