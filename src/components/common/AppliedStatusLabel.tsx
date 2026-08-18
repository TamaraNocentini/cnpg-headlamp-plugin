import { StatusLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { appliedSeverity } from '../../resources/status';

/**
 * The declarative CNPG CRDs — Database, DatabaseRole, Publication, Subscription — all report the
 * same way: `status.applied` plus a `status.message` explaining any failure. This renders that
 * shared shape so the four list/detail views cannot drift apart.
 *
 * `applied` is tri-state on purpose: absent means the operator has not reconciled the object yet,
 * which is not the same as `false` (tried and failed) and must not be coloured as an error.
 */
export function AppliedStatusLabel({
  applied,
  message,
}: {
  applied: boolean | undefined;
  message?: string;
}) {
  if (applied === true) {
    return <StatusLabel status={appliedSeverity(applied)}>Applied</StatusLabel>;
  }
  if (applied === false) {
    return <StatusLabel status={appliedSeverity(applied)}>{message ?? 'Not applied'}</StatusLabel>;
  }
  return <StatusLabel status={appliedSeverity(applied)}>Unknown</StatusLabel>;
}
