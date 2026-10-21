import handler from "vinext/server/fetch-handler";
import policy from "../public/privacy.html?raw";

export { Room } from "../lib/room-object";

/**
 * Worker entrypoint for the Cloudflare Worker build.
 *
 * Live tables are a Durable Object per room code. Everything else (pages,
 * assets, room creation and joining) is rendered by the app handler.
 */
const ROOM_SOCKET = /^\/api\/rooms\/([A-Z2-9]{6})\/socket$/;
const POLICY = /\/(privacy|privacy\.html)$/;

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (POLICY.test(url.pathname))
      return new Response(policy, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    const match = url.pathname.match(ROOM_SOCKET);
    if (match) {
      if (request.headers.get("Upgrade") !== "websocket")
        return new Response("Expected a WebSocket upgrade.", { status: 426 });
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin)
        return new Response("Forbidden", { status: 403 });
      return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
