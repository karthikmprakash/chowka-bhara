import { DurableObject } from "cloudflare:workers";
import {
  makePlayer,
  moveGame,
  newGame,
  randomShells,
  resignGame,
  rollGame,
  type BoardSize,
  type Game,
} from "./game";

/**
 * One Durable Object per room code.
 *
 * The object is the only authority for a table: it generates the throws, applies
 * the engine, and fans the new state out over hibernatable WebSockets. Nothing
 * touches D1 any more.
 *
 * Writes: the row is saved after every throw, move and seat change. A throw is
 * its own turn state, and a Durable Object can be evicted between two messages,
 * so leaving it in memory alone would drop the player's throw.
 */

const TTL = 24 * 60 * 60 * 1000;
const GRACE = 15 * 60 * 1000;
const SEAT_ORDER = [0, 2, 1, 3];

interface Stored {
  code: string;
  game: Game;
  members: Record<string, string>;
  expiresAt: number;
}

interface Incoming {
  t?: string;
  id?: string;
  token?: string;
  pawn?: number;
  avatar?: number;
}

interface CreateBody {
  code: string;
  name: string;
  avatar: number;
  size: BoardSize;
  captureRequired: boolean;
}

interface Seat {
  token: string;
  playerId: string;
  index: number;
}

const newToken = () => crypto.randomUUID() + crypto.randomUUID();

function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export class Room extends DurableObject<Cloudflare.Env> {
  private code = "";
  private game: Game | null = null;
  private members: Record<string, string> = {};
  private expiresAt = 0;
  private ready: Promise<void>;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Stored>("room");
      if (!saved) return;
      this.code = saved.code;
      this.game = saved.game;
      this.members = saved.members;
      this.expiresAt = saved.expiresAt;
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname.endsWith("/socket")) {
      if (request.headers.get("Upgrade") !== "websocket")
        return reply({ error: "Expected a WebSocket upgrade." }, 426);
      return this.accept();
    }
    if (url.pathname.endsWith("/create"))
      return this.create((await request.json()) as CreateBody);
    if (url.pathname.endsWith("/join"))
      return this.join(
        (await request.json()) as { name: string; avatar: number },
      );
    return reply({ error: "Not found." }, 404);
  }

  private accept(): Response {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async create(body: CreateBody): Promise<Response> {
    if (this.game && this.expiresAt > Date.now())
      return reply({ error: "That code is in use." }, 409);
    const game = newGame(
      body.size,
      "online",
      2,
      body.captureRequired,
      body.name,
    );
    game.players = [{ ...makePlayer(body.name, 0), avatar: body.avatar }];
    const token = newToken();
    this.code = body.code;
    this.game = game;
    this.members = { [token]: game.players[0].id };
    this.expiresAt = Date.now() + TTL;
    await this.persist();
    await this.ctx.storage.setAlarm(this.expiresAt);
    return reply(
      {
        code: this.code,
        game,
        token,
        playerId: game.players[0].id,
        expiresAt: this.expiresAt,
      },
      201,
    );
  }

  private async join(body: {
    name: string;
    avatar: number;
  }): Promise<Response> {
    const game = this.game;
    if (!game)
      return reply(
        { error: "Room not found or expired. Rooms last 24 hours." },
        404,
      );
    if (game.phase !== "lobby")
      return reply({ error: "This game has already started." }, 409);
    if (game.players.length >= 4)
      return reply({ error: "This table is full." }, 409);
    const color = SEAT_ORDER.find(
      (c) => !game.players.some((p) => p.color === c),
    )!;
    const player = { ...makePlayer(body.name, color), avatar: body.avatar };
    game.players.push(player);
    game.revision++;
    const token = newToken();
    this.members[token] = player.id;
    await this.persist();
    this.broadcast();
    return reply({
      code: this.code,
      game,
      token,
      playerId: player.id,
      expiresAt: this.expiresAt,
    });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    await this.ready;
    let message: Incoming;
    try {
      message = JSON.parse(
        typeof raw === "string" ? raw : new TextDecoder().decode(raw),
      ) as Incoming;
    } catch {
      ws.send(
        JSON.stringify({ t: "ack", id: null, ok: false, error: "Invalid." }),
      );
      return;
    }
    if (message.t === "hello") {
      this.hello(ws, message.token);
      return;
    }
    const seat = this.seatOf(ws);
    if (!seat) {
      this.refuse(ws, "This seat is no longer at the table.");
      return;
    }
    try {
      await this.act(seat, message);
      ws.send(JSON.stringify({ t: "ack", id: message.id, ok: true }));
    } catch (error) {
      // Send the current table back so a client that drifted re-syncs.
      this.send(ws, seat.playerId);
      ws.send(
        JSON.stringify({
          t: "ack",
          id: message.id,
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Could not complete that action.",
        }),
      );
    }
  }

  async webSocketClose(ws: WebSocket) {
    try {
      ws.close(1000, "closed");
    } catch {}
    await this.ready;
    if (!this.game) return;
    // Nobody is watching: keep the table briefly so a refresh rejoins it.
    if (this.openSockets().length === 0)
      await this.arm(Math.min(this.expiresAt, Date.now() + GRACE));
  }

  async alarm() {
    await this.ready;
    if (this.openSockets().length > 0) {
      await this.arm(Math.max(this.expiresAt, Date.now() + GRACE));
      return;
    }
    await this.ctx.storage.deleteAll();
    this.code = "";
    this.game = null;
    this.members = {};
    this.expiresAt = 0;
  }

  private hello(ws: WebSocket, token: string | undefined) {
    const seat = this.seatOfToken(token);
    if (!seat || !token) {
      this.refuse(ws, "Room not found or expired. Rooms last 24 hours.");
      return;
    }
    ws.serializeAttachment({ token });
    this.send(ws, seat.playerId);
    this.arm(this.expiresAt).catch(() => {});
  }

  private async arm(at: number) {
    if (at <= 0) return;
    const current = await this.ctx.storage.getAlarm();
    if (current === null || Math.abs(current - at) > 60_000)
      await this.ctx.storage.setAlarm(at);
  }

  private async act(seat: Seat, message: Incoming) {
    const game = this.game;
    if (!game) throw new Error("Room not found or expired.");
    const player = game.players[seat.index];
    if (!player) throw new Error("You no longer have a seat.");

    switch (message.t) {
      case "start": {
        if (seat.index !== 0 || game.phase !== "lobby" || game.players.length < 2)
          throw new Error(
            "The host can start once at least two players have joined.",
          );
        game.phase = "playing";
        game.revision++;
        break;
      }
      case "roll": {
        if (game.turn !== seat.index || player.resigned)
          throw new Error("It is another player’s turn.");
        this.game = rollGame(game, randomShells(game.size));
        break;
      }
      case "move": {
        if (game.turn !== seat.index || player.resigned)
          throw new Error("It is another player’s turn.");
        if (typeof message.pawn !== "number")
          throw new Error("Choose one of your pawns.");
        this.game = moveGame(game, message.pawn);
        break;
      }
      case "profile": {
        if (typeof message.avatar !== "number")
          throw new Error("Choose a valid portrait.");
        player.avatar = message.avatar;
        game.revision++;
        break;
      }
      case "resign": {
        this.game = resignGame(game, seat.index);
        break;
      }
      case "rematch": {
        if (seat.index !== 0 || game.phase !== "finished")
          throw new Error("The host can start a rematch after this game.");
        this.game = {
          ...newGame(
            game.size,
            "online",
            game.players.length,
            game.captureRequired,
          ),
          players: game.players.map((p) => ({
            ...p,
            pawns: [0, 0, 0, 0],
            captures: 0,
            resigned: false,
          })),
          phase: "lobby",
          revision: game.revision + 1,
        };
        break;
      }
      case "leave": {
        if (game.phase !== "lobby")
          throw new Error("Resign to leave a game in progress.");
        game.players = game.players.filter((p) => p.id !== seat.playerId);
        delete this.members[seat.token];
        game.revision++;
        break;
      }
      default:
        throw new Error("Unknown action.");
    }

    if (!this.game) return;
    await this.persist();
    this.broadcast();
  }

  private seatOf(ws: WebSocket): Seat | null {
    const attachment = ws.deserializeAttachment() as {
      token?: string;
    } | null;
    return this.seatOfToken(attachment?.token);
  }

  private seatOfToken(token: string | undefined): Seat | null {
    if (!token || !this.game) return null;
    const playerId = this.members[token];
    if (!playerId) return null;
    const index = this.game.players.findIndex((p) => p.id === playerId);
    return index < 0 ? null : { token, playerId, index };
  }

  private openSockets() {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === 1);
  }

  private broadcast() {
    if (!this.game) return;
    for (const ws of this.openSockets()) {
      const seat = this.seatOf(ws);
      if (seat) this.send(ws, seat.playerId);
    }
  }

  private send(ws: WebSocket, playerId: string) {
    if (!this.game) return;
    try {
      ws.send(
        JSON.stringify({
          t: "state",
          code: this.code,
          game: this.game,
          playerId,
          expiresAt: this.expiresAt,
        }),
      );
    } catch {}
  }

  private refuse(ws: WebSocket, message: string) {
    try {
      ws.send(JSON.stringify({ t: "fatal", message }));
    } catch {}
    try {
      ws.close(4001, "closed");
    } catch {}
  }

  private async persist() {
    if (!this.game) return;
    const stored: Stored = {
      code: this.code,
      game: this.game,
      members: this.members,
      expiresAt: this.expiresAt,
    };
    await this.ctx.storage.put("room", stored);
  }
}
