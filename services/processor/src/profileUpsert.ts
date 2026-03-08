import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { AnyEvent } from '@uniflow/event-schema';

export async function upsertProfile(
  dynamo: DynamoDBDocumentClient,
  tableName: string,
  userId: string,
  event: AnyEvent
): Promise<void> {
  const now = new Date().toISOString();

  // Upsert profile meta
  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `PROFILE#${userId}`, sk: 'META' },
      UpdateExpression:
        'SET updatedAt = :now, lastSeen = :now, #type = if_not_exists(#type, :type)',
      ExpressionAttributeNames: { '#type': 'type' },
      ExpressionAttributeValues: {
        ':now': now,
        ':type': 'user',
      },
    })
  );

  // Merge traits from identify events
  if (event.type === 'identify' && event.traits) {
    const traits = event.traits as Record<string, unknown>;
    const setExpressions = Object.keys(traits).map((k) => `traits.#${k} = :${k}`);
    if (setExpressions.length > 0) {
      const attrNames: Record<string, string> = {};
      const attrValues: Record<string, unknown> = {};
      Object.entries(traits).forEach(([k, v]) => {
        attrNames[`#${k}`] = k;
        attrValues[`:${k}`] = v;
      });
      await dynamo.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `PROFILE#${userId}`, sk: 'META' },
          UpdateExpression: `SET ${setExpressions.join(', ')}`,
          ExpressionAttributeNames: attrNames,
          ExpressionAttributeValues: attrValues,
        })
      );
    }
  }

  // Append event to profile history
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `PROFILE#${userId}`,
        sk: `EVENT#${event.timestamp}#${event.messageId}`,
        type: event.type,
        event: 'event' in event ? event.event : undefined,
        properties: 'properties' in event ? event.properties : undefined,
        traits: 'traits' in event ? event.traits : undefined,
        timestamp: event.timestamp,
        messageId: event.messageId,
      },
    })
  );
}
