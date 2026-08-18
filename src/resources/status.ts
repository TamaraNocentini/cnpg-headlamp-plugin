/**
 * Status → severity mappings, kept free of any `@kinvolk/headlamp-plugin` import on purpose.
 *
 * Resource classes import `KubeObject` from `@kinvolk/headlamp-plugin/lib/k8s/cluster`, a path the
 * build resolves to a Headlamp runtime global rather than to a real file on disk (the actual module
 * sits at `lib/lib/k8s/...`). That works at build time but cannot be resolved by vitest, so nothing
 * that imports a resource class can be unit-tested. Keeping these mappings here — plain values in,
 * plain values out — makes the triage logic testable, and matches the "one status→severity mapping
 * per CRD, reused by list and detail" convention.
 */

/** Severity values accepted by CommonComponents' `StatusLabel`. */
export type StatusSeverity = 'success' | 'error' | 'warning' | '';

/** Phases CNPG reports on `Backup.status.phase`. */
export function backupPhaseSeverity(phase: string | undefined): StatusSeverity {
  switch (phase) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'walArchivingFailing':
    case 'invalid backup definition':
      return 'error';
    case 'pending':
    case 'started':
    case 'running':
    case 'finalizing':
      return 'warning';
    default:
      return '';
  }
}

/**
 * The declarative CRDs (Database, DatabaseRole, Publication, Subscription) all report progress the
 * same way: a tri-state `status.applied` plus a `status.message` explaining a failure.
 */
export function appliedSeverity(applied: boolean | undefined): StatusSeverity {
  if (applied === true) {
    return 'success';
  }
  if (applied === false) {
    return 'error';
  }
  return '';
}
