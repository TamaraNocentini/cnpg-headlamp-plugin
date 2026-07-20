import { Icon } from '@iconify/react';
import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { Backup, BackupMethod, BackupTarget } from '../../resources/backup';
import { Cluster } from '../../resources/cluster';
import { YamlPreview } from '../common/YamlPreview';

interface BackupFormState {
  namespace: string;
  name: string;
  clusterName: string;
  method: BackupMethod;
  pluginName: string;
  target: BackupTarget | '';
}

// Builds the Backup manifest from form state — shared by the YAML preview and the actual submit
// so the two can never drift apart.
function buildBackupManifest(state: BackupFormState) {
  const spec: Record<string, any> = {
    cluster: { name: state.clusterName },
    method: state.method,
  };

  if (state.method === 'plugin' && state.pluginName) {
    spec.pluginConfiguration = { name: state.pluginName };
  }

  if (state.target) {
    spec.target = state.target;
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Backup',
    metadata: { name: state.name, namespace: state.namespace },
    spec,
  };
}

function BackupCreateForm({ onClose }: { onClose: () => void }) {
  const [clusters] = Cluster.useList();
  const [clusterKey, setClusterKey] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState<BackupMethod>('plugin');
  const [pluginName, setPluginName] = useState('');
  const [target, setTarget] = useState<BackupTarget | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedCluster = clusters?.find(
    cluster => `${cluster.getNamespace()}/${cluster.getName()}` === clusterKey
  );

  const clusterPlugins = selectedCluster?.spec.plugins ?? [];
  const hasPlugins = clusterPlugins.length > 0;
  const hasVolumeSnapshot = !!selectedCluster?.volumeSnapshotClassName;
  const hasAnyMethod = hasPlugins || hasVolumeSnapshot;

  // Keep the selected method/plugin valid as the selected cluster changes — e.g. switching to a
  // cluster with no volume-snapshot class configured while "volumeSnapshot" was selected.
  useEffect(() => {
    if (!selectedCluster) {
      return;
    }
    if (method === 'plugin' && !hasPlugins && hasVolumeSnapshot) {
      setMethod('volumeSnapshot');
    } else if (method === 'volumeSnapshot' && !hasVolumeSnapshot && hasPlugins) {
      setMethod('plugin');
    }
    if (method === 'plugin' && !clusterPlugins.some(plugin => plugin.name === pluginName)) {
      setPluginName(clusterPlugins[0]?.name ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCluster, hasPlugins, hasVolumeSnapshot]);

  const manifest = useMemo(
    () =>
      buildBackupManifest({
        namespace: selectedCluster?.getNamespace() ?? '',
        name,
        clusterName: selectedCluster?.getName() ?? '',
        method,
        pluginName,
        target,
      }),
    [selectedCluster, name, method, pluginName, target]
  );

  const canSubmit =
    !!selectedCluster &&
    !!name &&
    hasAnyMethod &&
    (method !== 'plugin' || !!pluginName) &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Backup.apiEndpoint.post(manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Backup">
      <FormControl fullWidth margin="normal">
        <InputLabel id="backup-cluster-label">Cluster</InputLabel>
        <Select
          labelId="backup-cluster-label"
          label="Cluster"
          value={clusterKey}
          onChange={e => setClusterKey(e.target.value)}
        >
          {(clusters ?? []).map(cluster => {
            const key = `${cluster.getNamespace()}/${cluster.getName()}`;
            return (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={selectedCluster ? `backup-${selectedCluster.getName()}` : undefined}
      />

      {selectedCluster && !hasAnyMethod && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          This cluster has no backup method configured — enable backups or volume snapshots when
          creating/editing the cluster first.
        </Alert>
      )}

      <FormControl fullWidth margin="normal" disabled={!hasAnyMethod}>
        <InputLabel id="backup-method-label">Method</InputLabel>
        <Select
          labelId="backup-method-label"
          label="Method"
          value={method}
          onChange={e => setMethod(e.target.value as BackupMethod)}
        >
          <MenuItem value="plugin" disabled={!hasPlugins}>
            Barman Cloud plugin
          </MenuItem>
          <MenuItem value="volumeSnapshot" disabled={!hasVolumeSnapshot}>
            Volume snapshot
          </MenuItem>
        </Select>
      </FormControl>

      {method === 'plugin' && (
        <FormControl fullWidth margin="normal" disabled={!hasPlugins}>
          <InputLabel id="backup-plugin-label">Plugin</InputLabel>
          <Select
            labelId="backup-plugin-label"
            label="Plugin"
            value={pluginName}
            onChange={e => setPluginName(e.target.value)}
          >
            {clusterPlugins.map(plugin => (
              <MenuItem key={plugin.name} value={plugin.name}>
                {plugin.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl fullWidth margin="normal">
        <InputLabel id="backup-target-label">Target</InputLabel>
        <Select
          labelId="backup-target-label"
          label="Target"
          value={target}
          onChange={e => setTarget(e.target.value as BackupTarget | '')}
        >
          <MenuItem value="">Cluster default</MenuItem>
          <MenuItem value="primary">primary</MenuItem>
          <MenuItem value="prefer-standby">prefer-standby</MenuItem>
        </Select>
      </FormControl>

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
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        Create
      </Button>
    </SectionBox>
  );
}

// Opens the create form in an overlay, same convention as launchPoolerCreate /
// launchObjectStoreCreate / launchClusterCreate.
export function launchBackupCreate() {
  const activityId = 'cnpg-backup-create';
  Activity.launch({
    id: activityId,
    title: 'Create Backup',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <BackupCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
