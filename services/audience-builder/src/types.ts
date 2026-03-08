import { z } from 'zod';

export const SegmentRuleSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains', 'exists']),
  value: z.unknown().optional(),
});

export const SegmentSchema = z.object({
  pk: z.string(),
  sk: z.literal('META'),
  id: z.string(),
  name: z.string(),
  rules: z.array(SegmentRuleSchema),
});

export type SegmentRule = z.infer<typeof SegmentRuleSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
