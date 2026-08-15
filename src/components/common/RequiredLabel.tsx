// Renders a field label for TextField/InputLabel, marking required fields in bold with a
// trailing "*" so mandatory vs. optional is visible at a glance across the Create forms.
export function RequiredLabel({ label, required }: { label: string; required?: boolean }) {
  if (!required) {
    return <>{label}</>;
  }
  return <strong>{label} *</strong>;
}
