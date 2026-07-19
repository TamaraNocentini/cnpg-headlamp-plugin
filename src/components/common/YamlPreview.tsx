import { Icon } from '@iconify/react';
import Editor from '@monaco-editor/react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import yaml from 'js-yaml';
import { useMemo } from 'react';

interface YamlPreviewProps {
  manifest: object;
  title?: string;
}

// A collapsed-by-default, read-only, syntax-highlighted preview of a manifest about to be
// submitted — lets users sanity-check exactly what a Create form is going to send before they
// click Create. Uses the same Monaco editor Headlamp's own YAML dialogs use.
export function YamlPreview({ manifest, title = 'Review YAML' }: YamlPreviewProps) {
  const theme = useTheme();
  const manifestYaml = useMemo(() => yaml.dump(manifest), [manifest]);

  return (
    <Accordion sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" />}>
        <Typography>{title}</Typography>
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
  );
}
