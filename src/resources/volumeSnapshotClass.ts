import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface CnpgVolumeSnapshotClass extends KubeObjectInterface {
  driver: string;
  deletionPolicy?: 'Delete' | 'Retain';
  [otherProps: string]: any;
}

// Not part of core Kubernetes — provided by the external-snapshotter CRDs, cluster-scoped. Used
// here purely as a picker data source for Cluster.spec.backup.volumeSnapshot.className, so it has
// no detailsRoute/listRoute (no list/detail view registered for it).
export class VolumeSnapshotClass extends KubeObject<CnpgVolumeSnapshotClass> {
  static kind = 'VolumeSnapshotClass';
  static apiName = 'volumesnapshotclasses';
  static apiVersion = 'snapshot.storage.k8s.io/v1';
  static isNamespaced = false;
}
