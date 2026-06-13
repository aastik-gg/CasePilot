import { auth } from "@clerk/nextjs/server";

export interface Actor {
  userId: string;
  orgId: string;
}

/**
 * Resolves the current tenant + user from Clerk. Falls back to a personal workspace
 * (orgId = userId) when the user has no active organization. Returns null if unauthenticated.
 */
export async function currentActor(): Promise<Actor | null> {
  const { userId, orgId } = await auth();
  if (!userId) return null;
  return { userId, orgId: orgId ?? userId };
}
