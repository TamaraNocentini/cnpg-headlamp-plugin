import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

/** A single PostgreSQL major-version entry, shared by ImageCatalog and ClusterImageCatalog. */
export interface CatalogImage {
  major: number;
  image: string;
}

export interface CnpgImageCatalog extends KubeObjectInterface {
  spec: {
    images: CatalogImage[];
  };
}

// ImageCatalog (namespaced) and ClusterImageCatalog (cluster-scoped) have an identical spec —
// both just map a PostgreSQL major version to a container image, referenced from
// Cluster.spec.imageCatalogRef. There's no status subresource on either kind.
export class ImageCatalog extends KubeObject<CnpgImageCatalog> {
  static kind = 'ImageCatalog';
  static apiName = 'imagecatalogs';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = true;

  // Seeds the "Create" YAML editor with a minimal working example instead of an empty object.
  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'ImageCatalog',
      metadata: {
        name: '',
      },
      spec: {
        images: [{ major: 17, image: '' }],
      },
    };
  }

  // See the equivalent comment on Cluster.detailsRoute in cluster.ts — same workaround.
  static get detailsRoute() {
    return '/cnpg/imagecatalogs/:namespace/:name';
  }

  static get listRoute() {
    return '/cnpg/imagecatalogs';
  }

  get spec() {
    return this.jsonData.spec;
  }

  get images(): CatalogImage[] {
    return this.spec.images ?? [];
  }

  getImageForMajor(major: number): string | undefined {
    return this.images.find(entry => entry.major === major)?.image;
  }
}

export class ClusterImageCatalog extends KubeObject<CnpgImageCatalog> {
  static kind = 'ClusterImageCatalog';
  static apiName = 'clusterimagecatalogs';
  static apiVersion = 'postgresql.cnpg.io/v1';
  static isNamespaced = false;

  static getBaseObject() {
    return {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'ClusterImageCatalog',
      metadata: {
        name: '',
      },
      spec: {
        images: [{ major: 17, image: '' }],
      },
    };
  }

  // Cluster-scoped, so the route has no :namespace segment — see ClusterIssuer in the official
  // cert-manager plugin (node_modules/@kinvolk/headlamp-plugin/official-plugins/cert-manager) for
  // the same pattern on another cluster-scoped CRD.
  static get detailsRoute() {
    return '/cnpg/clusterimagecatalogs/:name';
  }

  static get listRoute() {
    return '/cnpg/clusterimagecatalogs';
  }

  get spec() {
    return this.jsonData.spec;
  }

  get images(): CatalogImage[] {
    return this.spec.images ?? [];
  }

  getImageForMajor(major: number): string | undefined {
    return this.images.find(entry => entry.major === major)?.image;
  }
}
