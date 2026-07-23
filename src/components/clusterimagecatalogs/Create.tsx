import { Icon } from '@iconify/react';
import { Activity } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { ClusterImageCatalog } from '../../resources/imageCatalog';
import { CatalogImageRow, CatalogImagesEditor } from '../common/CatalogImagesEditor';
import { YamlPreview } from '../common/YamlPreview';

interface ClusterImageCatalogFormState {
  name: string;
  images: CatalogImageRow[];
}

function buildClusterImageCatalogManifest(state: ClusterImageCatalogFormState) {
  return {
    apiVersion: 'postgresql.cnpg.io/v1',
    kind: 'ClusterImageCatalog',
    metadata: { name: state.name },
    spec: {
      images: state.images.map(({ major, image }) => ({ major, image })),
    },
  };
}

function ClusterImageCatalogCreateForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [images, setImages] = useState<CatalogImageRow[]>([
    { id: 'clusterimagecatalog-image-0', major: 17, image: '' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const imagesValid = images.length > 0 && images.every(row => row.major > 0 && !!row.image);
  const canSubmit = !!name && imagesValid && !submitting;

  const manifest = useMemo(
    () => buildClusterImageCatalogManifest({ name, images }),
    [name, images]
  );

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await ClusterImageCatalog.apiEndpoint.post(manifest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster image catalog');
      setSubmitting(false);
    }
  }

  return (
    <SectionBox title="Create ClusterImageCatalog">
      <TextField
        fullWidth
        margin="normal"
        label="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Images
      </Typography>
      <CatalogImagesEditor
        idPrefix="clusterimagecatalog-image"
        rows={images}
        onChange={setImages}
      />

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

export function launchClusterImageCatalogCreate() {
  const activityId = 'cnpg-clusterimagecatalog-create';
  Activity.launch({
    id: activityId,
    title: 'Create ClusterImageCatalog',
    icon: <Icon icon="mdi:plus-circle" width="100%" height="100%" />,
    location: 'split-right',
    content: <ClusterImageCatalogCreateForm onClose={() => Activity.close(activityId)} />,
  });
}
