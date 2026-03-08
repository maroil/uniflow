import { z } from 'zod';
import {
  TrackEventSchema,
  IdentifyEventSchema,
  PageEventSchema,
  ScreenEventSchema,
  GroupEventSchema,
  AnyEventSchema,
} from './schemas';

export type TrackEvent = z.infer<typeof TrackEventSchema>;
export type IdentifyEvent = z.infer<typeof IdentifyEventSchema>;
export type PageEvent = z.infer<typeof PageEventSchema>;
export type ScreenEvent = z.infer<typeof ScreenEventSchema>;
export type GroupEvent = z.infer<typeof GroupEventSchema>;
export type AnyEvent = z.infer<typeof AnyEventSchema>;
export type EventType = 'track' | 'identify' | 'page' | 'screen' | 'group';
