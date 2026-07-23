import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import { CatalogImage } from '../../resources/imageCatalog';

export interface CatalogImageRow extends CatalogImage {
  id: string;
}

interface CatalogImagesEditorProps {
  idPrefix: string;
  rows: CatalogImageRow[];
  onChange: (rows: CatalogImageRow[]) => void;
}

// The repeated {major, image} list shared by the ImageCatalog and ClusterImageCatalog create
// forms — same "add/remove row" pattern as the Tablespaces editor in clusters/Create.tsx.
export function CatalogImagesEditor({ idPrefix, rows, onChange }: CatalogImagesEditorProps) {
  function updateRow(id: string, changes: Partial<CatalogImageRow>) {
    onChange(rows.map(row => (row.id === id ? { ...row, ...changes } : row)));
  }

  function removeRow(id: string) {
    onChange(rows.filter(row => row.id !== id));
  }

  function addRow() {
    onChange([...rows, { id: `${idPrefix}-${Date.now()}-${rows.length}`, major: 0, image: '' }]);
  }

  return (
    <>
      {rows.map(row => (
        <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
          <TextField
            margin="normal"
            label="Major Version"
            type="number"
            inputProps={{ min: 1 }}
            sx={{ width: 160 }}
            value={row.major || ''}
            onChange={e => updateRow(row.id, { major: Number(e.target.value) })}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Image"
            placeholder="ghcr.io/cloudnative-pg/postgresql:17.0"
            value={row.image}
            onChange={e => updateRow(row.id, { image: e.target.value })}
          />
          <IconButton aria-label="Remove image" onClick={() => removeRow(row.id)}>
            <Icon icon="mdi:delete" />
          </IconButton>
        </Box>
      ))}
      <Button variant="outlined" onClick={addRow} sx={{ mt: 1 }}>
        Add Image
      </Button>
    </>
  );
}
