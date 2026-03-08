import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { IdentityGraph } from '@uniflow/identity';

export class DynamoIdentityGraph implements IdentityGraph {
  constructor(
    private readonly dynamo: DynamoDBDocumentClient,
    private readonly tableName: string
  ) {}

  async resolveUserId(anonymousId: string): Promise<string | null> {
    const result = await this.dynamo.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: `ANON#${anonymousId}`, sk: 'IDENTITY' },
      })
    );
    return (result.Item?.userId as string) ?? null;
  }

  async link(anonymousId: string, userId: string): Promise<void> {
    await this.dynamo.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `ANON#${anonymousId}`,
          sk: 'IDENTITY',
          userId,
          mergedAt: new Date().toISOString(),
        },
      })
    );
  }
}
