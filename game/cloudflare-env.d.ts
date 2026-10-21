declare namespace Cloudflare {
  interface Env {
    ROOMS: DurableObjectNamespace;
    BUCKET?: R2Bucket;
  }
}
