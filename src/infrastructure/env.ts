/**
 * Centralized env access. Read lazily (not at import) so the app builds without secrets;
 * a missing var fails loudly at first use with a clear message.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),

  r2: () => ({
    accountId: required("R2_ACCOUNT_ID"),
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    bucket: required("R2_BUCKET"),
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  }),

  qstash: () => ({
    token: optional("QSTASH_TOKEN"),
    signingKeys: {
      current: optional("QSTASH_CURRENT_SIGNING_KEY"),
      next: optional("QSTASH_NEXT_SIGNING_KEY"),
    },
  }),

  redis: () => ({
    url: optional("UPSTASH_REDIS_REST_URL"),
    token: optional("UPSTASH_REDIS_REST_TOKEN"),
  }),

  appUrl: () => optional("APP_URL") ?? "http://localhost:3000",
  /** When false (no QSTASH_TOKEN), the pipeline dispatches stages inline for local dev. */
  hasQueue: () => Boolean(optional("QSTASH_TOKEN")),
  hasRedis: () => Boolean(optional("UPSTASH_REDIS_REST_URL")),
} as const;
