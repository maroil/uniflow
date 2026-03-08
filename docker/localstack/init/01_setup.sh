#!/bin/bash
# NOTE: Make this script executable before use: chmod +x docker/localstack/init/01_setup.sh
set -e

echo "==> Initializing LocalStack resources for Uniflow CDP..."

# DynamoDB Table
awslocal dynamodb create-table \
  --table-name uniflow-profiles \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "gsi1",
      "KeySchema": [
        {"AttributeName":"gsi1pk","KeyType":"HASH"},
        {"AttributeName":"gsi1sk","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

echo "==> Created DynamoDB table: uniflow-profiles"

# S3 Buckets
awslocal s3 mb s3://uniflow-raw --region us-east-1
awslocal s3 mb s3://uniflow-processed --region us-east-1

echo "==> Created S3 buckets: uniflow-raw, uniflow-processed"

# Kinesis Stream
awslocal kinesis create-stream \
  --stream-name uniflow-events \
  --shard-count 1 \
  --region us-east-1

echo "==> Created Kinesis stream: uniflow-events"

# SQS Queue
awslocal sqs create-queue \
  --queue-name uniflow-destinations \
  --region us-east-1

awslocal sqs create-queue \
  --queue-name uniflow-dlq \
  --region us-east-1

echo "==> Created SQS queues"

echo "==> LocalStack initialization complete!"
