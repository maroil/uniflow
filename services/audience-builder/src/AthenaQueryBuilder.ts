import type { SegmentRule } from './types.js';

/**
 * Converts segment rules to an Athena SQL WHERE clause.
 * Events are stored as JSON lines in S3 and queryable via Athena.
 */
export class AthenaQueryBuilder {
  buildQuery(rules: SegmentRule[], rawBucket: string, outputBucket: string): string {
    const conditions = rules.map((rule) => this.ruleToSql(rule)).join(' AND ');
    const whereClause = conditions ? `WHERE ${conditions}` : '';

    return `
      SELECT DISTINCT json_extract_scalar(data, '$.userId') AS user_id
      FROM uniflow_raw_events
      ${whereClause}
      AND json_extract_scalar(data, '$.userId') IS NOT NULL
    `.trim();
  }

  private ruleToSql(rule: SegmentRule): string {
    const field = `json_extract_scalar(data, '$.${rule.field}')`;
    switch (rule.operator) {
      case 'eq':
        return `${field} = '${this.escape(String(rule.value))}'`;
      case 'neq':
        return `${field} != '${this.escape(String(rule.value))}'`;
      case 'gt':
        return `CAST(${field} AS DOUBLE) > ${Number(rule.value)}`;
      case 'lt':
        return `CAST(${field} AS DOUBLE) < ${Number(rule.value)}`;
      case 'contains':
        return `${field} LIKE '%${this.escape(String(rule.value))}%'`;
      case 'exists':
        return `${field} IS NOT NULL`;
      default:
        throw new Error(`Unknown operator: ${rule.operator}`);
    }
  }

  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}
