import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useEffect, useState } from 'react';
import { BackupMethod, BackupTarget } from '../../resources/backup';
import { Cluster } from '../../resources/cluster';
import { RequiredLabel } from './RequiredLabel';

/**
 * Shared method/plugin/target sub-form state for Backup and ScheduledBackup create forms — both
 * resources expose the same spec.method/spec.pluginConfiguration/spec.target fields, gated on
 * what the selected Cluster actually has configured.
 */
export function useBackupMethodState(selectedCluster: Cluster | undefined) {
  const [method, setMethod] = useState<BackupMethod>('plugin');
  const [pluginName, setPluginName] = useState('');
  const [target, setTarget] = useState<BackupTarget | ''>('');

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

  return {
    method,
    setMethod,
    pluginName,
    setPluginName,
    target,
    setTarget,
    clusterPlugins,
    hasPlugins,
    hasVolumeSnapshot,
    hasAnyMethod,
  };
}

export type BackupMethodState = ReturnType<typeof useBackupMethodState>;

export function BackupMethodFields({
  idPrefix,
  selectedCluster,
  state,
}: {
  idPrefix: string;
  selectedCluster: Cluster | undefined;
  state: BackupMethodState;
}) {
  const {
    method,
    setMethod,
    pluginName,
    setPluginName,
    target,
    setTarget,
    clusterPlugins,
    hasPlugins,
    hasVolumeSnapshot,
    hasAnyMethod,
  } = state;

  return (
    <>
      {selectedCluster && !hasAnyMethod && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          This cluster has no backup method configured — enable backups or volume snapshots when
          creating/editing the cluster first.
        </Alert>
      )}

      <FormControl fullWidth margin="normal" disabled={!hasAnyMethod}>
        <InputLabel id={`${idPrefix}-method-label`}>
          <RequiredLabel label="Method" required />
        </InputLabel>
        <Select
          labelId={`${idPrefix}-method-label`}
          label={<RequiredLabel label="Method" required />}
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
          <InputLabel id={`${idPrefix}-plugin-label`}>
            <RequiredLabel label="Plugin" required />
          </InputLabel>
          <Select
            labelId={`${idPrefix}-plugin-label`}
            label={<RequiredLabel label="Plugin" required />}
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
        <InputLabel id={`${idPrefix}-target-label`}>Target</InputLabel>
        <Select
          labelId={`${idPrefix}-target-label`}
          label="Target"
          value={target}
          onChange={e => setTarget(e.target.value as BackupTarget | '')}
        >
          <MenuItem value="">Cluster default</MenuItem>
          <MenuItem value="primary">primary</MenuItem>
          <MenuItem value="prefer-standby">prefer-standby</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}
