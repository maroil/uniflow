import { AnyEvent } from '@uniflow/event-schema';
import { IdentityGraph } from './types';

export interface ResolvedIdentity {
  userId: string | null;
  anonymousId: string | null;
  isNewLink: boolean;
}

/**
 * Resolves the canonical identity for an event.
 * When a userId + anonymousId are both present, creates/updates the link.
 */
export class IdentityResolver {
  constructor(private readonly graph: IdentityGraph) {}

  async resolve(event: AnyEvent): Promise<ResolvedIdentity> {
    const { userId, anonymousId } = event;

    // Both present: create or update link
    if (userId && anonymousId) {
      const existing = await this.graph.resolveUserId(anonymousId);
      if (!existing || existing !== userId) {
        await this.graph.link(anonymousId, userId);
        return { userId, anonymousId, isNewLink: true };
      }
      return { userId, anonymousId, isNewLink: false };
    }

    // Only anonymousId: look up in graph
    if (anonymousId && !userId) {
      const resolvedUserId = await this.graph.resolveUserId(anonymousId);
      return { userId: resolvedUserId, anonymousId, isNewLink: false };
    }

    // Only userId (or neither)
    return { userId: userId ?? null, anonymousId: anonymousId ?? null, isNewLink: false };
  }
}
