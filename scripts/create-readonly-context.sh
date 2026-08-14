#!/usr/bin/env bash
# Creates a cluster-wide read-only Kubernetes user (get/list/watch on every resource) against
# whatever cluster the current kubectl context points at, and adds a "readonly" kubectl context
# to connect as that user. Meant for exercising this plugin's RBAC-aware UI (disabled Create
# buttons, hidden Edit/Delete) against a local kind cluster without needing a second cluster.
#
# Usage:
#   scripts/create-readonly-context.sh            # create the user, RBAC, and context
#   scripts/create-readonly-context.sh --delete    # remove everything this script created
set -euo pipefail

USER_NAME="readonly-user"
CONTEXT_NAME="readonly"
CLUSTERROLE_NAME="readonly-viewer"
CLUSTERROLEBINDING_NAME="readonly-viewer-binding"

for cmd in kubectl openssl base64; do
  command -v "$cmd" >/dev/null || {
    echo "Required command not found: $cmd" >&2
    exit 1
  }
done

CURRENT_CONTEXT=$(kubectl config current-context)
CLUSTER_NAME=$(kubectl config view -o jsonpath="{.contexts[?(@.name==\"$CURRENT_CONTEXT\")].context.cluster}")

echo "Target cluster : $CLUSTER_NAME"
echo "Current context: $CURRENT_CONTEXT"
if [[ "$CURRENT_CONTEXT" != kind-* ]]; then
  echo "Warning: current context doesn't look like a kind cluster (expected a 'kind-*' name)." >&2
fi
echo

if [[ "${1:-}" == "--delete" ]]; then
  echo "==> Removing kubeconfig context and credentials"
  kubectl config delete-context "$CONTEXT_NAME" 2>/dev/null || true
  kubectl config unset "users.$USER_NAME" >/dev/null 2>&1 || true

  echo "==> Deleting ClusterRoleBinding, ClusterRole, and any leftover CSR"
  kubectl delete clusterrolebinding "$CLUSTERROLEBINDING_NAME" --ignore-not-found
  kubectl delete clusterrole "$CLUSTERROLE_NAME" --ignore-not-found
  kubectl delete csr "$USER_NAME" --ignore-not-found

  echo "Done."
  exit 0
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

echo "==> Generating client key + CSR for user '$USER_NAME'"
openssl genrsa -out "$WORKDIR/$USER_NAME.key" 2048 >/dev/null 2>&1
openssl req -new -key "$WORKDIR/$USER_NAME.key" -out "$WORKDIR/$USER_NAME.csr" -subj "/CN=$USER_NAME"

echo "==> Submitting and approving the CertificateSigningRequest"
kubectl delete csr "$USER_NAME" --ignore-not-found
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: $USER_NAME
spec:
  request: $(base64 <"$WORKDIR/$USER_NAME.csr" | tr -d '\n')
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000
  usages:
    - client auth
EOF
kubectl certificate approve "$USER_NAME"

echo "==> Waiting for the signed certificate"
CERT=""
for _ in $(seq 1 30); do
  CERT=$(kubectl get csr "$USER_NAME" -o jsonpath='{.status.certificate}')
  [[ -n "$CERT" ]] && break
  sleep 1
done
if [[ -z "$CERT" ]]; then
  echo "Timed out waiting for the CSR to be signed." >&2
  exit 1
fi
echo "$CERT" | base64 -d >"$WORKDIR/$USER_NAME.crt"

echo "==> Creating ClusterRole '$CLUSTERROLE_NAME' (get/list/watch on all resources)"
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: $CLUSTERROLE_NAME
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - nonResourceURLs: ["*"]
    verbs: ["get"]
EOF

echo "==> Binding '$USER_NAME' to '$CLUSTERROLE_NAME'"
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: $CLUSTERROLEBINDING_NAME
subjects:
  - kind: User
    name: $USER_NAME
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: $CLUSTERROLE_NAME
  apiGroup: rbac.authorization.k8s.io
EOF

echo "==> Adding '$USER_NAME' credentials and '$CONTEXT_NAME' context to kubeconfig"
kubectl config set-credentials "$USER_NAME" \
  --client-certificate="$WORKDIR/$USER_NAME.crt" \
  --client-key="$WORKDIR/$USER_NAME.key" \
  --embed-certs=true
kubectl config set-context "$CONTEXT_NAME" \
  --cluster="$CLUSTER_NAME" \
  --user="$USER_NAME"

echo
echo "Done. Switch to the read-only context with:"
echo "  kubectl config use-context $CONTEXT_NAME"
echo "Switch back with:"
echo "  kubectl config use-context $CURRENT_CONTEXT"
echo "Tear everything down with:"
echo "  $0 --delete"
