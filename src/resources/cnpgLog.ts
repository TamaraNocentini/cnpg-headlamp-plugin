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
}

export function parseCnpgLogLine(raw: string): ParsedLogLine {
  try {
    const parsed = JSON.parse(raw);
    const record = parsed.record;
    const severity = (record?.error_severity ?? parsed.level ?? '').toString().toUpperCase();
    const message = record?.message ?? parsed.msg ?? raw;
    return {
      raw,
      ts: parsed.ts,
      severity,
      logger: parsed.logger,
      message,
    };
  } catch {
    return { raw, severity: '', message: raw };
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

export function formatCnpgLogLine(entry: ParsedLogLine): string {
  const color = SEVERITY_COLORS[entry.severity] ?? '';
  const line = `${entry.ts ?? ''} [${entry.severity || '-'}] (${entry.logger ?? '-'}) ${
    entry.message
  }`;
  return color ? `${color}${line}${ANSI_RESET}\n` : `${line}\n`;
}
