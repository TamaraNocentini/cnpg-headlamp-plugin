/**
 * CNPG instance-manager logs are structured JSON (see
 * https://cloudnative-pg.io/docs/1.30/logging). The top-level `level` field is set by the zap
 * logger doing the relaying and is essentially always "info" for forwarded Postgres output —
 * the actual Postgres severity (LOG/ERROR/FATAL/...) only shows up nested in `record.error_severity`
 * when `logger` is "postgres" and `msg` is the literal string "record". Everything else (raw
 * pre-collector Postgres lines, instance-manager's own logs, webhook/cluster-resource logs) just
 * uses the top-level `level` and `msg` directly.
 */
export interface ParsedLogLine {
  raw: string;
  ts?: string;
  /** Effective severity: record.error_severity for wrapped Postgres records, else top-level level. */
  severity: string;
  logger?: string;
  message: string;
  /**
   * Structured fields beyond ts/level/logger/msg (or record.message/error_severity for wrapped
   * Postgres records) — e.g. a CNPG-i plugin's walName/startTime/elapsedWalTime, or a Postgres
   * record's query/detail/hint. These carry real diagnostic content and shouldn't be silently
   * dropped just because they're not part of the small set of fields we specifically model.
   */
  extra: Record<string, unknown>;
}

/** Top-level fields already surfaced as their own ParsedLogLine property. */
const KNOWN_TOP_LEVEL_KEYS = new Set(['level', 'ts', 'msg', 'logger', 'record', 'logging_pod']);
const KNOWN_RECORD_KEYS = new Set(['message', 'error_severity']);

export function parseCnpgLogLine(raw: string): ParsedLogLine {
  try {
    const parsed = JSON.parse(raw);
    const record = parsed.record;
    const severity = (record?.error_severity ?? parsed.level ?? '').toString().toUpperCase();
    const message = record?.message ?? parsed.msg ?? raw;

    const extraEntries = Object.entries(
      record && typeof record === 'object' ? record : parsed
    ).filter(([key]) =>
      record && typeof record === 'object'
        ? !KNOWN_RECORD_KEYS.has(key)
        : !KNOWN_TOP_LEVEL_KEYS.has(key)
    );

    return {
      raw,
      ts: parsed.ts,
      severity,
      logger: parsed.logger,
      message,
      extra: Object.fromEntries(extraEntries),
    };
  } catch {
    return { raw, severity: '', message: raw, extra: {} };
  }
}

const ANSI_RESET = '\x1b[0m';

/** ANSI color codes, keyed by Postgres/zap severity — rendered natively by LogViewer's xterm.js. */
const SEVERITY_COLORS: Record<string, string> = {
  PANIC: '\x1b[31m', // red
  FATAL: '\x1b[31m',
  ERROR: '\x1b[31m',
  WARNING: '\x1b[33m', // yellow
  NOTICE: '\x1b[36m', // cyan
  LOG: '\x1b[36m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[2m', // dim
};

function formatExtraFields(extra: Record<string, unknown>): string {
  const entries = Object.entries(extra);
  if (entries.length === 0) {
    return '';
  }
  return (
    ' ' +
    entries
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' ')
  );
}

export function formatCnpgLogLine(entry: ParsedLogLine): string {
  const color = SEVERITY_COLORS[entry.severity] ?? '';
  const line = `${entry.ts ?? ''} [${entry.severity || '-'}] (${entry.logger ?? '-'}) ${
    entry.message
  }${formatExtraFields(entry.extra)}`;
  return color ? `${color}${line}${ANSI_RESET}\n` : `${line}\n`;
}
