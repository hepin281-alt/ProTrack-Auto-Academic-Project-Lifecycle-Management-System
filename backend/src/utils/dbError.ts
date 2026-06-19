import { Response } from 'express';

/**
 * Postgres error codes we handle gracefully instead of returning 500.
 *
 * 42P01 — undefined_table   : table not created yet (migration pending)
 * 42703 — undefined_column  : column not added yet (migration pending)
 * 23505 — unique_violation   : duplicate key — caller handles this as 409
 */
const SAFE_EMPTY_CODES = new Set(['42P01', '42703']);

/**
 * handleDbError — call inside every controller catch block.
 *
 * • If the error is a "table/column does not exist" error it returns the
 *   supplied `emptyFallback` value with HTTP 200 so the frontend stays
 *   functional while migrations are pending.
 * • All other errors return HTTP 500 with a structured JSON body.
 *
 * @param error      The caught error object
 * @param res        Express Response
 * @param label      Short description used in console.error (e.g. 'getTasks')
 * @param emptyFallback  Value to return when the table is missing ([] or {})
 */
export function handleDbError(
    error: any,
    res: Response,
    label: string,
    emptyFallback: unknown = []
): void {
    if (SAFE_EMPTY_CODES.has(error?.code)) {
        console.warn(`[${label}] Table/column not yet migrated (${error.code}): ${error.message}`);
        res.status(200).json(emptyFallback);
        return;
    }
    console.error(`[${label}] DB error:`, error);
    res.status(500).json({
        error: `Failed to ${label}`,
        message: error?.message || 'Database error',
        timestamp: new Date().toISOString(),
    });
}
