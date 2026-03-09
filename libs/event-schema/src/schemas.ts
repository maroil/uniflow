import { z } from 'zod';

const requireActor = (data: { anonymousId?: string; userId?: string }) =>
  Boolean(data.anonymousId || data.userId);

const requireActorMessage = 'Either anonymousId or userId must be provided';

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
  sourceId: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
});

const TrackEventObjectSchema = BaseEventSchema.extend({
  type: z.literal('track'),
  event: z.string().min(1),
  properties: z.record(z.unknown()).optional(),
});

const IdentifyEventObjectSchema = BaseEventSchema.extend({
  type: z.literal('identify'),
  traits: z.record(z.unknown()).optional(),
});

const PageEventObjectSchema = BaseEventSchema.extend({
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

const ScreenEventObjectSchema = BaseEventSchema.extend({
  type: z.literal('screen'),
  name: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

const GroupEventObjectSchema = BaseEventSchema.extend({
  type: z.literal('group'),
  groupId: z.string(),
  traits: z.record(z.unknown()).optional(),
});

export const TrackEventSchema = TrackEventObjectSchema.refine(requireActor, {
  message: requireActorMessage,
});

export const IdentifyEventSchema = IdentifyEventObjectSchema.refine(requireActor, {
  message: requireActorMessage,
});

export const PageEventSchema = PageEventObjectSchema.refine(requireActor, {
  message: requireActorMessage,
});

export const ScreenEventSchema = ScreenEventObjectSchema.refine(requireActor, {
  message: requireActorMessage,
});

export const GroupEventSchema = GroupEventObjectSchema.refine(requireActor, {
  message: requireActorMessage,
});

export const AnyEventSchema = z
  .discriminatedUnion('type', [
    TrackEventObjectSchema,
    IdentifyEventObjectSchema,
    PageEventObjectSchema,
    ScreenEventObjectSchema,
    GroupEventObjectSchema,
  ])
  .refine(requireActor, {
    message: requireActorMessage,
  });
