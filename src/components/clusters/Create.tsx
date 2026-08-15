import { Icon } from '@iconify/react';
import { Activity, K8s } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';
import { Cluster, StorageConfiguration } from '../../resources/cluster';
import { ClusterImageCatalog, ImageCatalog } from '../../resources/imageCatalog';
import { ObjectStore } from '../../resources/objectStore';
import { VolumeSnapshotClass } from '../../resources/volumeSnapshotClass';
import { RequiredLabel } from '../common/RequiredLabel';
import { StorageSizeClassFields } from '../common/StorageSizeClassFields';
import { YamlPreview } from '../common/YamlPreview';

const BARMAN_CLOUD_PLUGIN_NAME = 'barman-cloud.cloudnative-pg.io';
const RECOVERY_EXTERNAL_CLUSTER_NAME = 'recovery-source';

type BootstrapMethod = 'initdb' | 'recovery';

// The operator rejects a Cluster that sets both imageName and imageCatalogRef, so the form treats
// "how is the PostgreSQL image picked" as one mutually-exclusive choice rather than two
// independent optional fields.
type ImageSource = 'default' | 'imageName' | 'catalog';
type CatalogKind = 'ImageCatalog' | 'ClusterImageCatalog';

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
  imageSource: ImageSource;
  imageName: string;
  imageCatalogKind: CatalogKind;
  imageCatalogName: string;
  imageCatalogMajor: string;
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

  if (state.imageSource === 'imageName' && state.imageName) {
    spec.imageName = state.imageName;
  } else if (state.imageSource === 'catalog' && state.imageCatalogName && state.imageCatalogMajor) {
    spec.imageCatalogRef = {
      apiGroup: 'postgresql.cnpg.io',
      kind: state.imageCatalogKind,
      name: state.imageCatalogName,
      major: Number(state.imageCatalogMajor),
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
  const [namespaces] = K8s.ResourceClasses.Namespace.useList();

  const [namespace, setNamespace] = useState('');
  const [name, setName] = useState('');
  const [instances, setInstances] = useState('3');
  const [imageSource, setImageSource] = useState<ImageSource>('default');
  const [imageName, setImageName] = useState('');
  const [imageCatalogKind, setImageCatalogKind] = useState<CatalogKind>('ClusterImageCatalog');
  const [imageCatalogName, setImageCatalogName] = useState('');
  const [imageCatalogMajor, setImageCatalogMajor] = useState('');
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
  // Set while the YamlPreview's "Edit" switch is on — takes precedence over the form-derived
  // manifest below at submit time. See YamlPreview.tsx for why this is an override rather than
  // something synced back onto the form fields.
  const [manifestOverride, setManifestOverride] = useState<object | null>(null);

  const tablespaceIdCounter = useRef(0);

  const [objectStores] = ObjectStore.useList({ namespace });
  const [snapshotClasses] = VolumeSnapshotClass.useList();
  const [imageCatalogs] = ImageCatalog.useList({ namespace });
  const [clusterImageCatalogs] = ClusterImageCatalog.useList();
  const imageCatalogChoices =
    imageCatalogKind === 'ImageCatalog' ? imageCatalogs : clusterImageCatalogs;
  const selectedImageCatalog = imageCatalogChoices?.find(
    catalog => catalog.getName() === imageCatalogName
  );

  const instancesNumber = Number(instances) || 0;

  const formState: ClusterFormState = {
    namespace,
    name,
    instances,
    imageSource,
    imageName,
    imageCatalogKind,
    imageCatalogName,
    imageCatalogMajor,
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
      imageSource,
      imageName,
      imageCatalogKind,
      imageCatalogName,
      imageCatalogMajor,
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

  const tablespacesValid = tablespaces.every(t => t.name && t.storage.size);
  const imageValid =
    imageSource === 'default' ||
    (imageSource === 'imageName' && !!imageName) ||
    (imageSource === 'catalog' && !!imageCatalogName && !!imageCatalogMajor);
  const canSubmit =
    !!namespace &&
    !!name &&
    instancesNumber >= 1 &&
    imageValid &&
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
      await Cluster.apiEndpoint.post(manifestOverride ?? manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create Cluster">
      <FormControl fullWidth margin="normal">
        <InputLabel id="cluster-namespace-label">
          <RequiredLabel label="Namespace" required />
        </InputLabel>
        <Select
          labelId="cluster-namespace-label"
          label={<RequiredLabel label="Namespace" required />}
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
        label={<RequiredLabel label="Name" required />}
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        <RequiredLabel label="Instances" required />
      </Typography>

      <TextField
        fullWidth
        margin="normal"
        aria-label="Instances"
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
        PostgreSQL Image (optional)
      </Typography>

      <FormControl fullWidth margin="normal">
        <InputLabel id="cluster-imagesource-label">Image Source</InputLabel>
        <Select
          labelId="cluster-imagesource-label"
          label="Image Source"
          value={imageSource}
          onChange={e => setImageSource(e.target.value as ImageSource)}
        >
          <MenuItem value="default">Operator default</MenuItem>
          <MenuItem value="catalog">Image Catalog</MenuItem>
          <MenuItem value="imageName">Image Name</MenuItem>
        </Select>
      </FormControl>

      {imageSource === 'imageName' && (
        <TextField
          fullWidth
          margin="normal"
          label={<RequiredLabel label="Image Name" required />}
          placeholder="ghcr.io/cloudnative-pg/postgresql:17.0"
          value={imageName}
          onChange={e => setImageName(e.target.value)}
        />
      )}

      {imageSource === 'catalog' && (
        <>
          <FormControl fullWidth margin="normal">
            <InputLabel id="cluster-imagecatalogkind-label">
              <RequiredLabel label="Catalog Kind" required />
            </InputLabel>
            <Select
              labelId="cluster-imagecatalogkind-label"
              label={<RequiredLabel label="Catalog Kind" required />}
              value={imageCatalogKind}
              onChange={e => {
                setImageCatalogKind(e.target.value as CatalogKind);
                setImageCatalogName('');
                setImageCatalogMajor('');
              }}
            >
              <MenuItem value="ClusterImageCatalog">ClusterImageCatalog (cluster-wide)</MenuItem>
              <MenuItem value="ImageCatalog">ImageCatalog (this namespace)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="cluster-imagecatalogname-label">
              <RequiredLabel label="Catalog" required />
            </InputLabel>
            <Select
              labelId="cluster-imagecatalogname-label"
              label={<RequiredLabel label="Catalog" required />}
              value={imageCatalogName}
              onChange={e => {
                setImageCatalogName(e.target.value);
                setImageCatalogMajor('');
              }}
            >
              {(imageCatalogChoices ?? []).map(catalog => (
                <MenuItem key={catalog.getName()} value={catalog.getName()}>
                  {catalog.getName()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel id="cluster-imagecatalogmajor-label">
              <RequiredLabel label="Major Version" required />
            </InputLabel>
            <Select
              labelId="cluster-imagecatalogmajor-label"
              label={<RequiredLabel label="Major Version" required />}
              value={imageCatalogMajor}
              disabled={!selectedImageCatalog}
              onChange={e => setImageCatalogMajor(e.target.value)}
            >
              {(selectedImageCatalog?.images ?? []).map(entry => (
                <MenuItem key={entry.major} value={String(entry.major)}>
                  {entry.major} ({entry.image})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        <RequiredLabel label="Storage" required />
      </Typography>

      <StorageSizeClassFields
        idPrefix="cluster-storage"
        sizeLabel="PGData Size"
        sizeRequired={false}
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
              label={<RequiredLabel label="Tablespace Name" required />}
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
          <InputLabel id="cluster-backup-objectstore-label">
            <RequiredLabel label="Object Store" required />
          </InputLabel>
          <Select
            labelId="cluster-backup-objectstore-label"
            label={<RequiredLabel label="Object Store" required />}
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
          label="Server Name"
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
          <InputLabel id="cluster-volumesnapshotclass-label">
            <RequiredLabel label="Volume Snapshot Class" required />
          </InputLabel>
          <Select
            labelId="cluster-volumesnapshotclass-label"
            label={<RequiredLabel label="Volume Snapshot Class" required />}
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
        <RequiredLabel label="Bootstrap" required />
      </Typography>

      <FormControl fullWidth margin="normal">
        <Select
          aria-label="Bootstrap Method"
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
              <RequiredLabel label="Recovery Source Object Store" required />
            </InputLabel>
            <Select
              labelId="cluster-recovery-objectstore-label"
              label={<RequiredLabel label="Recovery Source Object Store" required />}
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
            label={<RequiredLabel label="Source Server Name" required />}
            placeholder="cluster-example"
            helperText="The name of the original cluster whose backups are being restored (the server name it archived WALs/backups under)."
            value={recoveryServerName}
            onChange={e => setRecoveryServerName(e.target.value)}
          />
        </>
      )}

      <YamlPreview manifest={manifest} onOverrideChange={setManifestOverride} />

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
