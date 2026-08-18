import { describe, expect, it } from 'vitest';
import { appliedSeverity, backupPhaseSeverity } from './status';

describe('backupPhaseSeverity', () => {
  it('marks a completed backup as success', () => {
    expect(backupPhaseSeverity('completed')).toBe('success');
  });

  // These three are the phases an operator needs to notice; `walArchivingFailing` in particular is
  // easy to miss because the Backup object itself is otherwise unremarkable.
  it.each(['failed', 'walArchivingFailing', 'invalid backup definition'])(
    'marks %s as an error',
    phase => {
      expect(backupPhaseSeverity(phase)).toBe('error');
    }
  );

  it.each(['pending', 'started', 'running', 'finalizing'])('marks %s as in-progress', phase => {
    expect(backupPhaseSeverity(phase)).toBe('warning');
  });

  // A Backup has no status.phase between creation and the operator's first reconcile, and CNPG is
  // free to add phases we do not know about — neither should render as success or error.
  it('falls back to neutral for an unknown or absent phase', () => {
    expect(backupPhaseSeverity(undefined)).toBe('');
    expect(backupPhaseSeverity('some-future-cnpg-phase')).toBe('');
  });
});

describe('appliedSeverity', () => {
  it('distinguishes applied from not-applied', () => {
    expect(appliedSeverity(true)).toBe('success');
    expect(appliedSeverity(false)).toBe('error');
  });

  // status.applied is genuinely tri-state: absent until the operator reconciles the object. That
  // must not be conflated with `false`, which means the operator tried and failed.
  it('treats an unreconciled object as neutral, not failed', () => {
    expect(appliedSeverity(undefined)).toBe('');
  });
});
