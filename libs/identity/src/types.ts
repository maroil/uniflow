export interface IdentityRecord {
  anonymousId: string;
  userId: string;
  mergedAt: string;
}

export interface IdentityGraph {
  /** Look up the canonical userId for a given anonymousId */
  resolveUserId(anonymousId: string): Promise<string | null>;
  /** Link an anonymousId to a userId */
  link(anonymousId: string, userId: string): Promise<void>;
}
