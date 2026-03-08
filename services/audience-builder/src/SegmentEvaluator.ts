import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState,
} from '@aws-sdk/client-athena';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '@uniflow/logger';
import { AthenaQueryBuilder } from './AthenaQueryBuilder.js';
import type { Segment } from './types.js';

export class SegmentEvaluator {
  private readonly queryBuilder = new AthenaQueryBuilder();
  private readonly log = logger.child({ service: 'segment-evaluator' });

  constructor(
    private readonly athena: AthenaClient,
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly rawBucket: string,
    private readonly athenaOutputBucket: string,
    private readonly athenaDatabase: string = 'uniflow'
  ) {}

  async evaluateAll(): Promise<void> {
    // Load all segments from DynamoDB
    const segments = await this.loadSegments();
    this.log.info(`Evaluating ${segments.length} segments`);

    for (const segment of segments) {
      try {
        await this.evaluateSegment(segment);
      } catch (err) {
        this.log.error(`Failed to evaluate segment ${segment.id}`, { error: String(err) });
      }
    }
  }

  private async loadSegments(): Promise<Segment[]> {
    const result = await this.dynamo.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'begins_with(pk, :prefix) AND sk = :meta',
        ExpressionAttributeValues: { ':prefix': 'SEGMENT#', ':meta': 'META' },
      })
    );
    return (result.Items ?? []) as Segment[];
  }

  private async evaluateSegment(segment: Segment): Promise<void> {
    this.log.info(`Evaluating segment: ${segment.name}`, { segmentId: segment.id });

    if (!segment.rules || segment.rules.length === 0) {
      this.log.warn(`Segment ${segment.id} has no rules, skipping`);
      return;
    }

    const query = this.queryBuilder.buildQuery(
      segment.rules,
      this.rawBucket,
      this.athenaOutputBucket
    );

    // Execute Athena query
    const execution = await this.athena.send(
      new StartQueryExecutionCommand({
        QueryString: query,
        QueryExecutionContext: { Database: this.athenaDatabase },
        ResultConfiguration: {
          OutputLocation: `s3://${this.athenaOutputBucket}/athena-results/`,
        },
      })
    );

    const queryId = execution.QueryExecutionId!;
    await this.waitForQuery(queryId);

    const results = await this.athena.send(
      new GetQueryResultsCommand({ QueryExecutionId: queryId })
    );

    const userIds = (results.ResultSet?.Rows ?? [])
      .slice(1) // skip header row
      .map((row) => row.Data?.[0]?.VarCharValue)
      .filter((id): id is string => !!id);

    this.log.info(`Segment ${segment.id} has ${userIds.length} members`);

    // Update segment membership in DynamoDB
    await this.updateMembership(segment.id, userIds);
  }

  private async waitForQuery(queryId: string, maxWaitMs = 120_000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const status = await this.athena.send(
        new GetQueryExecutionCommand({ QueryExecutionId: queryId })
      );
      const state = status.QueryExecution?.Status?.State;

      if (state === QueryExecutionState.SUCCEEDED) return;
      if (state === QueryExecutionState.FAILED || state === QueryExecutionState.CANCELLED) {
        throw new Error(
          `Athena query ${queryId} ${state}: ${status.QueryExecution?.Status?.StateChangeReason}`
        );
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`Athena query ${queryId} timed out`);
  }

  private async updateMembership(segmentId: string, userIds: string[]): Promise<void> {
    const now = new Date().toISOString();

    // Add new members
    await Promise.all(
      userIds.map((userId) =>
        this.dynamo.send(
          new PutCommand({
            TableName: this.tableName,
            Item: {
              pk: `SEGMENT#${segmentId}`,
              sk: `MEMBER#${userId}`,
              userId,
              addedAt: now,
            },
          })
        )
      )
    );
  }
}
