import { z } from 'zod';

// Base fields present on all events (Segment-compatible schema)
const BaseEventSchema = z.object({
  anonymousId: z.string().optional(),
  userId: z.string().optional(),
  messageId: z.string(),
  timestamp: z.string().datetime(),
  sentAt: z.string().datetime().optional(),
  context: z
    .object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      locale: z.string().optional(),
      page: z
        .object({
          url: z.string().optional(),
          title: z.string().optional(),
          referrer: z.string().optional(),
        })
        .optional(),
      campaign: z
        .object({
          name: z.string().optional(),
          source: z.string().optional(),
          medium: z.string().optional(),
          content: z.string().optional(),
          term: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  writeKey: z.string().optional(),
}).refine((data) => data.anonymousId || data.userId, {
  message: 'Either anonymousId or userId must be provided',
});

export const TrackEventSchema = BaseEventSchema.extend({
  type: z.literal('track'),
  event: z.string().min(1),
  properties: z.record(z.unknown()).optional(),
});

export const IdentifyEventSchema = BaseEventSchema.extend({
  type: z.literal('identify'),
  traits: z.record(z.unknown()).optional(),
});

export const PageEventSchema = BaseEventSchema.extend({
  type: z.literal('page'),
  name: z.string().optional(),
  properties: z
    .object({
      url: z.string().optional(),
      title: z.string().optional(),
      referrer: z.string().optional(),
      search: z.string().optional(),
      path: z.string().optional(),
    })
    .optional(),
});

export const ScreenEventSchema = BaseEventSchema.extend({
  type: z.literal('screen'),
  name: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

export const GroupEventSchema = BaseEventSchema.extend({
  type: z.literal('group'),
  groupId: z.string(),
  traits: z.record(z.unknown()).optional(),
});

export const AnyEventSchema = z.discriminatedUnion('type', [
  TrackEventSchema,
  IdentifyEventSchema,
  PageEventSchema,
  ScreenEventSchema,
  GroupEventSchema,
]);
