import handler from "vinext/server/fetch-handler";

/**
 * Worker entrypoint for the Cloudflare Worker build.
 *
 * `wrangler.json` owns the runtime bindings (D1) so the same configuration
 * drives local development, migrations, and deployment.
 */
const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
