import { AuthVisible } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { KubeObject, KubeObjectClass } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import Tooltip from '@mui/material/Tooltip';
import { cloneElement, ReactElement, useState } from 'react';

interface AuthDisabledButtonProps {
  /** The resource, or resource class for a "create" check, to verify authVerb against. */
  item: KubeObject | KubeObjectClass | null;
  authVerb: string;
  namespace?: string;
  /** Shown in the tooltip when the check comes back denied — Kubernetes' SelfSubjectAccessReview
   *  usually returns an empty reason for a plain RBAC deny, so this is what carries the actual
   *  explanation. */
  deniedMessage: string;
  /** A single button-like element, cloned with disabled set once we know the user isn't
   *  authorized. */
  children: ReactElement<{ disabled?: boolean }>;
}

// Wraps a single action button so it's disabled (with an explanatory tooltip) instead of hidden
// when the user lacks the given RBAC verb — unlike AuthVisible's own default of hiding the
// button entirely, which doesn't tell a read-only user the action exists at all.
//
// Defaults to allowed/enabled until the permission check resolves (and stays that way if the
// check itself errors) — this only ever gates the button's clickability as a UX nicety, so
// failing open here is fine: the underlying API call still enforces RBAC server-side either way.
export function AuthDisabledButton({
  item,
  authVerb,
  namespace,
  deniedMessage,
  children,
}: AuthDisabledButtonProps) {
  const [allowed, setAllowed] = useState(true);

  const button = allowed ? children : cloneElement(children, { disabled: true });

  return (
    <>
      {/* Renders nothing itself — used only for its permission check and onAuthResult callback. */}
      <AuthVisible
        item={item}
        authVerb={authVerb}
        namespace={namespace}
        onAuthResult={({ allowed: result }) => setAllowed(result)}
      >
        {null}
      </AuthVisible>
      {allowed ? (
        button
      ) : (
        <Tooltip title={deniedMessage}>
          <span>{button}</span>
        </Tooltip>
      )}
    </>
  );
}
