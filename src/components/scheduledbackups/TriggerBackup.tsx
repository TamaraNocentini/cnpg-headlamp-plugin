import { Icon } from '@iconify/react';
import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { Backup } from '../../resources/backup';
import { ScheduledBackup } from '../../resources/scheduledbackup';
import { YamlPreview } from '../common/YamlPreview';

// Builds a one-off Backup manifest from a ScheduledBackup's spec — same cluster/method/target/
// pluginConfiguration, just without the schedule, mirroring what buildBackupManifest in
// components/backups/Create.tsx builds from form state. The generated name just needs to be
// unique per trigger; it has no other significance.
export function buildBackupManifestFromScheduledBackup(scheduledBackup: ScheduledBackup) {
  const spec: Record<string, any> = {
    cluster: { name: scheduledBackup.clusterName },
    method: scheduledBackup.method ?? 'plugin',
  };

  if (scheduledBackup.spec.pluginConfiguration) {
    spec.pluginConfiguration = scheduledBackup.spec.pluginConfiguration;
  }

  if (scheduledBackup.target) {
    spec.target = scheduledBackup.target;
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Backup',
    metadata: {
      name: `${scheduledBackup.getName()}-${Date.now()}`,
      namespace: scheduledBackup.getNamespace(),
    },
    spec,
  };
}

function TriggerBackupForm({
  scheduledBackup,
  onClose,
}: {
  scheduledBackup: ScheduledBackup;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const manifest = buildBackupManifestFromScheduledBackup(scheduledBackup);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await Backup.apiEndpoint.post(manifest);
      enqueueSnackbar(`Created Backup "${manifest.metadata.name}"`, { variant: 'success' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger backup');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title={`Trigger Backup for ${scheduledBackup.getName()}`}>
      <Typography sx={{ mt: 1 }}>
        This creates a one-off Backup using this ScheduledBackup&apos;s cluster, method and target —
        the schedule itself is left untouched.
      </Typography>

      <YamlPreview manifest={manifest} />

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        disabled={submitting}
        onClick={handleSubmit}
      >
        Trigger Backup
      </Button>
    </SectionBox>
  );
}

// Opens the trigger-backup confirmation in an overlay, same convention as launchBackupCreate /
// launchScheduledBackupCreate. Keyed by the ScheduledBackup so triggering two different schedules
// opens two separate activities instead of colliding.
export function launchTriggerBackup(scheduledBackup: ScheduledBackup) {
  const activityId = `cnpg-trigger-backup-${scheduledBackup.getNamespace()}-${scheduledBackup.getName()}`;
  Activity.launch({
    id: activityId,
    title: 'Trigger Backup',
    icon: <Icon icon="mdi:play-circle-outline" width="100%" height="100%" />,
    location: 'split-right',
    content: (
      <TriggerBackupForm
        scheduledBackup={scheduledBackup}
        onClose={() => Activity.close(activityId)}
      />
    ),
  });
}
