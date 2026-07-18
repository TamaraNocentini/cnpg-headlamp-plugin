import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface CnpgPooler extends KubeObjectInterface {
  spec: {
    cluster: {
      name: string;
    };
    instances?: number;
    type: 'rw' | 'ro' | 'r';
    pgbouncer: {
      poolMode?: 'session' | 'transaction' | 'statement';
      paused?: boolean;
      parameters?: Record<string, string>;
      [otherProps: string]: any;
    };
    [otherProps: string]: any;
  };
  status?: {
    phase?: string;
    image?: string;
    instances?: number;
    [otherProps: string]: any;
  };
}

export class Pooler extends KubeObject<CnpgPooler> {
  static kind = 'Pooler';
  static apiName = 'poolers';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Pooler',
      metadata: {
        name: '',
      },
      spec: {
        cluster: {
          name: '',
        },
        instances: 1,
        type: 'rw',
        pgbouncer: {
          poolMode: 'session',
        },
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/poolers/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/poolers';
  }

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status ?? {};
  }

  // Poolers are typically created via `kubectl apply`, which stamps a
  // kubectl.kubernetes.io/last-applied-configuration annotation containing the whole object as
  // JSON — Headlamp's DetailsGrid always renders an Annotations row when any are present, with no
  // way to opt out, so we drop them here rather than showing that noisy blob on every page.
  get metadata() {
    const metadata = { ...super.metadata };
    delete metadata.annotations;
    return metadata;
  }

  get clusterName(): string {
    return this.spec.cluster.name;
  }

  get type(): string {
    return this.spec.type;
  }

  get poolMode(): string | undefined {
    return this.spec.pgbouncer?.poolMode;
  }

  get isPaused(): boolean {
    return !!this.spec.pgbouncer?.paused;
  }

  get phase(): string | undefined {
    return this.status.phase;
  }

  get instances(): number {
    return this.status.instances ?? this.spec.instances ?? 0;
  }

  get image(): string | undefined {
    return this.status.image;
  }

  get parameters(): Record<string, string> {
    return this.spec.pgbouncer?.parameters ?? {};
  }
}
