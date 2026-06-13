/**
 * Result/Either — explicit, typed error flow. Use-cases return Result instead of throwing.
 * (TECH_SPEC §2.2 "Result/Either", §2.1 SOLID)
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type AppErrorCode =
  | "not_found"
  | "unauthorized"
  | "validation"
  | "parse_failed"
  | "storage_failed"
  | "queue_failed"
  | "pipeline_failed"
  | "internal";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
