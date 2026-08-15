import Box from '@mui/material/Box';

// Styled "cannot be changed afterwards" note for helperText on fields the CRD treats as
// immutable after creation — set apart from the rest of the helper text via color/weight so it
// doesn't get lost in a full sentence of muted grey.
export function ImmutableNote() {
  return (
    <Box component="span" sx={{ fontWeight: 600, color: 'warning.main' }}>
      Cannot be changed afterwards.
    </Box>
  );
}
