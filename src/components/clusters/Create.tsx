import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Editor from '@monaco-editor/react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import yaml from 'js-yaml';
import { useMemo, useRef, useState } from 'react';
import { Cluster, StorageConfiguration } from '../../resources/cluster';
import { ObjectStore } from '../../resources/objectStore';
import { VolumeSnapshotClass } from '../../resources/volumeSnapshotClass';
import { StorageSizeClassFields } from '../common/StorageSizeClassFields';

const BARMAN_CLOUD_PLUGIN_NAME = 'barman-cloud.cloudnative-pg.io';
const RECOVERY_EXTERNAL_CLUSTER_NAME = 'recovery-source';

type BootstrapMethod = 'initdb' | 'recovery';

interface TablespaceRow {
  id: string;
  name: string;
  storage: StorageConfiguration;
  temporary: boolean;
}

interface ClusterFormState {
  namespace: string;
  name: string;
  instances: string;
  storage: StorageConfiguration;
  useWalStorage: boolean;
  walStorage: StorageConfiguration;
  tablespaces: TablespaceRow[];
  backupEnabled: boolean;
  backupObjectStoreName: string;
  backupServerName: string;
  volumeSnapshotEnabled: boolean;
  volumeSnapshotClassName: string;
  bootstrapMethod: BootstrapMethod;
  recoveryServerName: string;
  recoveryObjectStoreName: string;
}

// Builds the Cluster manifest from form state — shared by the YAML preview and the actual submit
// so the two can never drift apart.
function buildClusterManifest(state: ClusterFormState) {
  const instances = Number(state.instances) || 0;

  const spec: Record<string, any> = {
    instances,
    storage: { ...state.storage },
  };

  if (instances > 1) {
    spec.postgresql = {
      synchronous: { method: 'any', number: 1, dataDurability: 'required' },
    };
  }

  if (state.useWalStorage) {
    spec.walStorage = { ...state.walStorage };
  }

  if (state.tablespaces.length > 0) {
    spec.tablespaces = state.tablespaces.map(t => ({
      name: t.name,
      storage: { ...t.storage },
      ...(t.temporary && { temporary: true }),
    }));
  }

  if (state.backupEnabled && state.backupObjectStoreName) {
    spec.plugins = [
      {
        name: BARMAN_CLOUD_PLUGIN_NAME,
        isWALArchiver: true,
        parameters: {
          barmanObjectName: state.backupObjectStoreName,
          ...(state.backupServerName && { serverName: state.backupServerName }),
        },
      },
    ];

    if (state.volumeSnapshotEnabled && state.volumeSnapshotClassName) {
      spec.backup = {
        volumeSnapshot: { className: state.volumeSnapshotClassName },
      };
    }
  }

  if (
    state.bootstrapMethod === 'recovery' &&
    state.recoveryServerName &&
    state.recoveryObjectStoreName
  ) {
    spec.bootstrap = { recovery: { source: RECOVERY_EXTERNAL_CLUSTER_NAME } };
    spec.externalClusters = [
      {
        name: RECOVERY_EXTERNAL_CLUSTER_NAME,
        plugin: {
          name: BARMAN_CLOUD_PLUGIN_NAME,
          parameters: {
            barmanObjectName: state.recoveryObjectStoreName,
            serverName: state.recoveryServerName,
          },
        },
      },
    ];
  }

  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'Cluster',
    metadata: { name: state.name, namespace: state.namespace },
    spec,
  };
}

function ClusterCreateForm({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();

  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [instances, setInstances] = useState('3');
  const [storage, setStorage] = useState<StorageConfiguration>({ size: '1Gi' });
  const [useWalStorage, setUseWalStorage] = useState(false);
  const [walStorage, setWalStorage] = useState<StorageConfiguration>({ size: '1Gi' });
  const [tablespaces, setTablespaces] = useState<TablespaceRow[]>([]);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupObjectStoreName, setBackupObjectStoreName] = useState('');
  const [backupServerName, setBackupServerName] = useState('');
  const [volumeSnapshotEnabled, setVolumeSnapshotEnabled] = useState(false);
  const [volumeSnapshotClassName, setVolumeSnapshotClassName] = useState('');
  const [bootstrapMethod, setBootstrapMethod] = useState<BootstrapMethod>('initdb');
  const [recoveryServerName, setRecoveryServerName] = useState('');
  const [recoveryObjectStoreName, setRecoveryObjectStoreName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tablespaceIdCounter = useRef(0);

  const [objectStores] = ObjectStore.useList({ namespace });
  const [snapshotClasses] = VolumeSnapshotClass.useList();

  const instancesNumber = Number(instances) || 0;

  const formState: ClusterFormState = {
    namespace,
    name,
    instances,
    storage,
    useWalStorage,
    walStorage,
    tablespaces,
    backupEnabled,
    backupObjectStoreName,
    backupServerName,
    volumeSnapshotEnabled,
    volumeSnapshotClassName,
    bootstrapMethod,
    recoveryServerName,
    recoveryObjectStoreName,
  };

  const manifest = useMemo(
    () => buildClusterManifest(formState),
    [
      namespace,
      name,
      instances,
      storage,
      useWalStorage,
      walStorage,
      tablespaces,
      backupEnabled,
      backupObjectStoreName,
      backupServerName,
      volumeSnapshotEnabled,
      volumeSnapshotClassName,
      bootstrapMethod,
      recoveryServerName,
      recoveryObjectStoreName,
    ]
  );

  const manifestYaml = useMemo(() => yaml.dump(manifest), [manifest]);

  const tablespacesValid = tablespaces.every(t => t.name && t.storage.size);
  const canSubmit =
    !!namespace &&
    !!name &&
    instancesNumber >= 1 &&
    !!storage.size &&
    (!useWalStorage || !!walStorage.size) &&
    tablespacesValid &&
    (!backupEnabled || !!backupObjectStoreName) &&
    (!volumeSnapshotEnabled || (backupEnabled && !!volumeSnapshotClassName)) &&
    (bootstrapMethod !== 'recovery' || (!!recoveryServerName && !!recoveryObjectStoreName)) &&
    !submitting;

  function addTablespace() {
    tablespaceIdCounter.current += 1;
    setTablespaces([
      ...tablespaces,
      {
        id: `ts-${tablespaceIdCounter.current}`,
        name: '',
        storage: { size: '1Gi' },
        temporary: false,
      },
    ]);
  }

  function updateTablespace(id: string, changes: Partial<TablespaceRow>) {
    setTablespaces(tablespaces.map(t => (t.id === id ? { ...t, ...changes } : t)));
  }

  function removeTablespace(id: string) {
    setTablespaces(tablespaces.filter(t => t.id !== id));
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await Cluster.apiEndpoint.post(manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Cluster">
      <FormControl fullWidth margin="normal">
        <InputLabel id="cluster-namespace-label">Namespace</InputLabel>
        <Select
          labelId="cluster-namespace-label"
          label="Namespace"
          value={namespace}
          onChange={e => setNamespace(e.target.value)}
        >
          {(namespaces ?? []).map(ns => (
            <MenuItem key={ns.getName()} value={ns.getName()}>
              {ns.getName()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        margin="normal"
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Instances
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        label="Instances"
        type="number"
        inputProps={{ min: 1 }}
        value={instances}
        onChange={e => setInstances(e.target.value)}
      />

      {instancesNumber === 2 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          With 2 instances, if the primary goes down there is no synchronous replica available to
          take over for read/write traffic until the second instance catches up. Consider 1 (no HA)
          or 3+ (HA) instead.
        </Alert>
      )}
      {instancesNumber > 1 && (
        <Alert severity="info" sx={{ mt: 1 }}>
          Synchronous replication will be enabled automatically for this instance count.
        </Alert>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Storage
      </Typography>

      <StorageSizeClassFields
        idPrefix="cluster-storage"
        sizeLabel="PGData Size"
        value={storage}
        onChange={setStorage}
      />

      <FormControlLabel
        control={
          <Checkbox checked={useWalStorage} onChange={e => setUseWalStorage(e.target.checked)} />
        }
        label="Separate WAL storage"
      />
      {useWalStorage && (
        <StorageSizeClassFields
          idPrefix="cluster-walstorage"
          sizeLabel="WAL Storage Size"
          value={walStorage}
          onChange={setWalStorage}
        />
      )}

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Tablespaces (optional)
      </Typography>

      {tablespaces.map(t => (
        <Box
          key={t.id}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mt: 1, mb: 1 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Tablespace Name"
              value={t.name}
              onChange={e => updateTablespace(t.id, { name: e.target.value })}
            />
            <IconButton aria-label="Remove tablespace" onClick={() => removeTablespace(t.id)}>
              <Icon icon="mdi:delete" />
            </IconButton>
          </Box>
          <StorageSizeClassFields
            idPrefix={`cluster-tablespace-${t.id}`}
            value={t.storage}
            onChange={newStorage => updateTablespace(t.id, { storage: newStorage })}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={t.temporary}
                onChange={e => updateTablespace(t.id, { temporary: e.target.checked })}
              />
            }
            label="Temporary tablespace (used for temp_tablespaces)"
          />
        </Box>
      ))}
      <Button variant="outlined" onClick={addTablespace} sx={{ mt: 1 }}>
        Add Tablespace
      </Button>

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Backup
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={backupEnabled}
            onChange={e => {
              setBackupEnabled(e.target.checked);
              if (!e.target.checked) {
                setVolumeSnapshotEnabled(false);
              }
            }}
          />
        }
        label="Enable backups via the Barman Cloud plugin"
      />
      {backupEnabled && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="cluster-backup-objectstore-label">Object Store</InputLabel>
          <Select
            labelId="cluster-backup-objectstore-label"
            label="Object Store"
            value={backupObjectStoreName}
            onChange={e => setBackupObjectStoreName(e.target.value)}
          >
            {(objectStores ?? []).map(os => (
              <MenuItem key={os.getName()} value={os.getName()}>
                {os.getName()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {backupEnabled && (
        <TextField
          fullWidth
          margin="normal"
          label="Server Name (optional)"
          placeholder={name || 'cluster-example'}
          helperText="The name backups are filed under in the object store. Defaults to this cluster's name if left empty."
          value={backupServerName}
          onChange={e => setBackupServerName(e.target.value)}
        />
      )}

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Volume Snapshots (optional)
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={volumeSnapshotEnabled}
            disabled={!backupEnabled}
            onChange={e => setVolumeSnapshotEnabled(e.target.checked)}
          />
        }
        label={
          backupEnabled
            ? 'Enable volume-snapshot backups'
            : 'Enable volume-snapshot backups (requires backups to be enabled above, since it needs WAL archiving)'
        }
      />
      {volumeSnapshotEnabled && (
        <FormControl fullWidth margin="normal">
          <InputLabel id="cluster-volumesnapshotclass-label">Volume Snapshot Class</InputLabel>
          <Select
            labelId="cluster-volumesnapshotclass-label"
            label="Volume Snapshot Class"
            value={volumeSnapshotClassName}
            onChange={e => setVolumeSnapshotClassName(e.target.value)}
          >
            {(snapshotClasses ?? []).map(vsc => (
              <MenuItem key={vsc.getName()} value={vsc.getName()}>
                {vsc.getName()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Bootstrap
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel id="cluster-bootstrap-label">Bootstrap Method</InputLabel>
        <Select
          labelId="cluster-bootstrap-label"
          label="Bootstrap Method"
          value={bootstrapMethod}
          onChange={e => setBootstrapMethod(e.target.value as BootstrapMethod)}
        >
          <MenuItem value="initdb">initdb — new, empty cluster</MenuItem>
          <MenuItem value="recovery">recovery — restore from an object store</MenuItem>
        </Select>
      </FormControl>

      {bootstrapMethod === 'recovery' && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cluster-recovery-objectstore-label">
              Recovery Source Object Store
            </InputLabel>
            <Select
              labelId="cluster-recovery-objectstore-label"
              label="Recovery Source Object Store"
              value={recoveryObjectStoreName}
              onChange={e => setRecoveryObjectStoreName(e.target.value)}
            >
              {(objectStores ?? []).map(os => (
                <MenuItem key={os.getName()} value={os.getName()}>
                  {os.getName()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Source Server Name"
            placeholder="cluster-example"
            helperText="The name of the original cluster whose backups are being restored (the server name it archived WALs/backups under)."
            value={recoveryServerName}
            onChange={e => setRecoveryServerName(e.target.value)}
          />
        </>
      )}

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" />}>
          <Typography>Review YAML</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Editor
            height="400px"
            language="yaml"
            theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
            value={manifestYaml}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              automaticLayout: true,
            }}
          />
        </AccordionDetails>
      </Accordion>

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
// launchObjectStoreCreate.
export function launchClusterCreate() {
  const activityId = 'cnpg-cluster-create';
  Activity.launch({
    id: activityId,
    title: 'Create Cluster',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <ClusterCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
