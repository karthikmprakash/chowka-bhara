"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Check,
  Users,
  Monitor,
  Bot,
  Volume2,
  VolumeX,
  X,
  Link2,
  Flag,
  RotateCcw,
  Route,
  Wifi,
  WifiOff,
  Flower,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  DoorOpen,
  Sparkles,
  Moon,
  Sun,
  Languages,
  Maximize,
  Minimize,
} from "lucide-react";
import { Avatar, AvatarPicker, portraitOf } from "./avatar";
import { ThrowButton } from "./throw-button";
import { useGameAudio } from "./use-game-audio";
import { usePawnTravel } from "./use-pawn-travel";
import { RouteExplanation } from "./route-guide";
import { ExperiencePicker } from "./experience-picker";
import { Board } from "./board";
import { Cowries } from "./cowries";
import { usePlayView } from "./use-play-view";
import { useIsCompact } from "@/hooks/use-mobile";
import { latestThrow, type ThrowSnapshot } from "@/lib/presentation";
import { setKeepAwake } from "@/lib/native";
import { PreferencesProvider, usePreferences } from "./preferences";
import {
  COLORS,
  newGame,
  rollGame,
  moveGame,
  chooseBotMove,
  randomShells,
  playerPath,
  legalMoves,
  shellCount,
  type BoardSize,
  type Mode,
  type Game,
} from "@/lib/game";
interface RoomResponse {
  code: string;
  token: string;
  playerId: string;
  game: Game;
  error?: string;
}
interface Session {
  code: string;
  token: string;
  playerId: string;
}
type Modal = "rules" | "join" | "leave" | "about" | "profile" | null;
const LOCAL_KEY = "chowka-bara:saved:v1",
  ROOM_KEY = "chowka-bara:room:v1";
function GridGlyph({ size }: { size: number }) {
  return (
    <span
      className="grid-glyph"
      style={{ gridTemplateColumns: `repeat(${size},1fr)` }}
    >
      {Array.from({ length: size * size }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
export default function GameApp() {
  return (
    <PreferencesProvider>
      <GameScreen />
    </PreferencesProvider>
  );
}
function GameScreen() {
  const { t, language, setLanguage, theme, setTheme, advanced } =
    usePreferences();
  const [size, setSize] = useState<BoardSize>(5),
    [mode, setMode] = useState<Mode>("online"),
    [count, setCount] = useState(2),
    [capture] = useState(true),
    [name, setName] = useState(""),
    [avatar, setAvatar] = useState(0),
    [game, setGame] = useState<Game | null>(null),
    [session, setSession] = useState<Session | null>(null);
  const { visualGame, moving: pawnMoving, travel } = usePawnTravel(game);
  const movingRef = useRef(pawnMoving);
  movingRef.current = pawnMoving;
  const [modal, setModal] = useState<Modal>(null),
    [roomCode, setRoomCode] = useState(""),
    [busy, setBusy] = useState(false),
    [rolling, setRolling] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [sound, setSound] = useState(false),
    [showPath, setShowPath] = useState(false),
    [connected, setConnected] = useState(true),
    [copied, setCopied] = useState(false),
    [resume, setResume] = useState<Game | null>(null),
    [hydrated, setHydrated] = useState(false);
  // On a phone the app is a series of single screens: welcome, set the
  // table, take your seat, the table, and the game. The wide layout keeps
  // its one long page.
  const compact = useIsCompact();
  const [screen, setScreen] = useState<"home" | "setup" | "seat">("home");
  useEffect(() => {
    // The native shell asks for the previous screen when the hardware back
    // button is pressed.
    const back = () => {
      if (game) {
        setModal("leave");
        return;
      }
      setScreen((current) => (current === "seat" ? "setup" : "home"));
    };
    document.addEventListener("chowka:back", back);
    return () => document.removeEventListener("chowka:back", back);
  }, [game]);
  const {
    rootRef,
    focused,
    toggleFocus,
    exitFocus,
    canImmerse,
    immersive,
    immerse,
  } = usePlayView(game);
  const [shot, setShot] = useState<ThrowSnapshot | null>(null),
    [showShot, setShowShot] = useState(false),
    [stillThrow, setStillThrow] = useState(false);
  const seenGame = useRef(""),
    seenThrow = useRef(""),
    throwTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shotKey = latestThrow(game)?.key;
  useEffect(() => {
    const identity = game?.players[0]?.id || "";
    const next = latestThrow(game);
    if (identity !== seenGame.current) {
      seenGame.current = identity;
      seenThrow.current = next?.key || "";
      setShot(next);
      setShowShot(false);
      return;
    }
    if (!next) {
      seenThrow.current = "";
      setShot(null);
      setShowShot(false);
      return;
    }
    if (seenThrow.current === next.key) return;
    seenThrow.current = next.key;
    setShot(next);
    setShowShot(true);
    const timer = setTimeout(() => setShowShot(false), 1400);
    return () => clearTimeout(timer);
  }, [shotKey, game?.players[0]?.id]);
  useEffect(
    () => () => {
      if (throwTimer.current) clearTimeout(throwTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (!focused) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modal) exitFocus();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [focused, modal, exitFocus]);
  const gameRef = useRef(game),
    sessionRef = useRef(session),
    inFlight = useRef(false),
    restored = useRef(false);
  gameRef.current = game;
  sessionRef.current = session;
  const demo = useMemo(
    () =>
      newGame(
        size,
        mode === "online" ? "local" : mode,
        count,
        capture,
        name.trim() || "You",
        avatar,
      ),
    [size, mode, count, capture, name, avatar],
  );
  const boardGame = visualGame || game || demo;
  const me =
    session && game
      ? game.players.findIndex((p) => p.id === session.playerId)
      : 0;
  const myTurn =
    !!game &&
    game.phase === "playing" &&
    (game.mode === "local" ||
      (game.mode === "solo" && !game.players[game.turn].bot) ||
      (game.mode === "online" && !!session && game.turn === me));
  const playable = myTurn && !busy && !rolling && !pawnMoving;
  const say = (text: string) => {
    setNotice(text);
  };
  const { play: chime, unlock: unlockAudio } = useGameAudio(sound);
  // Hold the screen awake on a phone while a game is underway.
  useEffect(() => {
    setKeepAwake(game?.phase === "playing");
  }, [game?.phase]);
  const toggleSound = () => {
    if (!sound) unlockAudio();
    setSound(!sound);
  };
  const chooseAvatar = (value: number) => {
    setAvatar(value);
    try {
      localStorage.setItem("chowka-bara:avatar", String(value));
    } catch {}
    if (game) {
      if (session) void onlineAction("profile", { avatar: value });
      else
        setGame((old) =>
          old
            ? {
                ...old,
                players: old.players.map((p, i) =>
                  i === 0 ? { ...p, avatar: value } : p,
                ),
              }
            : old,
        );
    }
  };
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    setHydrated(true);
    try {
      const n = localStorage.getItem("chowka-bara:name");
      if (n) setName(n);
      const a = Number(localStorage.getItem("chowka-bara:avatar"));
      if (Number.isInteger(a) && a >= 0 && a < 8) setAvatar(a);
      const saved = localStorage.getItem(LOCAL_KEY);
      if (saved) {
        const g = JSON.parse(saved);
        if (
          (g.size === 5 || g.size === 7) &&
          g.mode !== "online" &&
          g.phase !== "finished" &&
          Array.isArray(g.players)
        )
          setResume(g);
      }
      const query = new URLSearchParams(location.search).get("room");
      const s = localStorage.getItem(ROOM_KEY);
      if (s) {
        const v = JSON.parse(s);
        if (v.code && v.token && v.playerId && (!query || query === v.code)) {
          setSession(v);
          setBusy(true);
          fetch(`/api/rooms/${v.code}`, {
            headers: { Authorization: `Bearer ${v.token}` },
          })
            .then(async (r) => {
              const data = (await r.json()) as RoomResponse;
              if (!r.ok) throw new Error(data.error);
              setGame(data.game);
              setConnected(true);
            })
            .catch((e) => {
              setError(e.message);
              setSession(null);
              localStorage.removeItem(ROOM_KEY);
            })
            .finally(() => setBusy(false));
        }
      }
      if (query) {
        setRoomCode(query.toUpperCase());
        if (!s || JSON.parse(s).code !== query) setModal("join");
      }
    } catch {
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(ROOM_KEY);
    }
  }, []);
  useEffect(() => {
    if (!game || game.mode === "online") return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(game));
    } catch {}
  }, [game]);
  useEffect(() => {
    try {
      localStorage.setItem("chowka-bara:name", name);
    } catch {}
  }, [name]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  // Poll a single room in sequence; revision checks prevent stale reads overwriting a move.
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!disposed && !inFlight.current) {
        try {
          const r = await fetch(`/api/rooms/${session.code}`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          const data = (await r.json()) as RoomResponse;
          if (r.status === 401 || r.status === 404) {
            if (!disposed) {
              setError(data.error || "Could not connect to the room.");
              setSession(null);
              setGame(null);
              localStorage.removeItem(ROOM_KEY);
            }
            return;
          }
          if (!r.ok) throw new Error(data.error);
          if (!disposed) {
            setConnected(true);
            setGame((old) =>
              !old || data.game.revision > old.revision ? data.game : old,
            );
          }
        } catch {
          if (!disposed) setConnected(false);
        }
      }
      if (!disposed) timer = setTimeout(poll, document.hidden ? 5000 : 1000);
    };
    timer = setTimeout(poll, 1000);
    const wake = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", wake);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [session]);
  const onlineAction = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const s = sessionRef.current,
        g = gameRef.current;
      if (!s || !g || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError("");
      try {
        const r = await fetch(`/api/rooms/${s.code}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s.token}`,
          },
          body: JSON.stringify({ action, revision: g.revision, ...extra }),
        });
        const data = (await r.json()) as RoomResponse;
        if (data.game)
          setGame((old) =>
            !old || data.game.revision >= old.revision ? data.game : old,
          );
        if (!r.ok) throw new Error(data.error);
        setConnected(true);
        return true;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Connection lost. Please try again.",
        );
        return false;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [],
  );
  const roll = useCallback(
    async (instant = false) => {
      if (inFlight.current || rolling || movingRef.current || !gameRef.current)
        return;
      setStillThrow(instant);
      setShowShot(false);
      setRolling(true);
      chime();
      const frame = rootRef.current?.querySelector(".board-frame");
      if (frame && !focused) {
        const rect = frame.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > innerHeight - 90)
          frame.scrollIntoView({ block: "center", behavior: "instant" });
      }
      const duration =
        instant || matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 300;
      if (sessionRef.current) {
        const start = performance.now();
        await onlineAction("roll");
        throwTimer.current = setTimeout(
          () => setRolling(false),
          Math.max(0, duration - (performance.now() - start)),
        );
      } else {
        const expected = gameRef.current;
        throwTimer.current = setTimeout(() => {
          setGame((g) =>
            g === expected ? rollGame(g, randomShells(g.size)) : g,
          );
          setRolling(false);
        }, duration);
      }
    },
    [rolling, chime, onlineAction, focused, rootRef],
  );
  const move = useCallback(
    async (pawn: number) => {
      if (inFlight.current || movingRef.current) return;
      const g = gameRef.current;
      if (!g) return;
      setShowShot(false);
      setError("");
      if (sessionRef.current) {
        if (await onlineAction("move", { pawn })) chime("move");
      } else {
        try {
          const next = moveGame(g, pawn);
          setGame(next);
          chime("move");
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Choose one of your pawns.",
          );
        }
      }
    },
    [onlineAction, chime],
  );
  useEffect(() => {
    if (
      !game ||
      game.mode !== "solo" ||
      game.phase !== "playing" ||
      !game.players[game.turn].bot ||
      pawnMoving ||
      rolling
    )
      return;
    const timer = setTimeout(
      () => {
        if (game.roll === null) void roll();
        else void move(chooseBotMove(game));
      },
      game.roll === null ? 750 : 650,
    );
    return () => clearTimeout(timer);
  }, [game, rolling, pawnMoving, roll, move]);
  async function start() {
    setError("");
    if (mode !== "online") {
      setResume(null);
      setGame(
        newGame(
          size,
          mode,
          count,
          capture,
          name.trim() || (mode === "local" ? "Player 1" : "You"),
          avatar,
        ),
      );
      return;
    }
    if (!name.trim()) {
      setError("Add your name to take a seat.");
      document.getElementById("player-name")?.focus();
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatar,
          size,
          captureRequired: capture,
        }),
      });
      const data = (await r.json()) as RoomResponse;
      if (!r.ok) throw new Error(data.error);
      const s = { code: data.code, token: data.token, playerId: data.playerId };
      localStorage.setItem(ROOM_KEY, JSON.stringify(s));
      setSession(s);
      setGame(data.game);
      setConnected(true);
      history.replaceState(null, "", `?room=${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a room.");
    } finally {
      setBusy(false);
    }
  }
  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const code = roomCode.trim().toUpperCase();
      const r = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name: name.trim(), avatar }),
      });
      const data = (await r.json()) as RoomResponse;
      if (!r.ok) throw new Error(data.error);
      const s = { code: data.code, token: data.token, playerId: data.playerId };
      localStorage.setItem(ROOM_KEY, JSON.stringify(s));
      setSession(s);
      setGame(data.game);
      setModal(null);
      history.replaceState(null, "", `?room=${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join.");
    } finally {
      setBusy(false);
    }
  }
  function clearTable() {
    exitFocus();
    setShowShot(false);
    if (throwTimer.current) clearTimeout(throwTimer.current);
    setGame(null);
    setSession(null);
    setRolling(false);
    setError("");
    setShowPath(false);
    setModal(null);
    localStorage.removeItem(ROOM_KEY);
    localStorage.removeItem(LOCAL_KEY);
    setResume(null);
    setScreen("home");
    history.replaceState(null, "", location.pathname);
  }
  async function leave() {
    if (session && game) {
      if (game.phase === "lobby") {
        if (!(await onlineAction("leave"))) return;
      } else if (game.phase === "playing" && !game.players[me]?.resigned) {
        if (!(await onlineAction("resign"))) return;
      }
    }
    clearTable();
  }
  async function copyInvite() {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${location.pathname}?room=${session.code}`,
      );
      setCopied(true);
      say("Invite link copied. Send it to your friends.");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      say(`Your room code is ${session.code}`);
    }
  }
  function rematch() {
    if (session) void onlineAction("rematch");
    else if (game)
      setGame(
        newGame(
          game.size,
          game.mode,
          game.players.length,
          game.captureRequired,
          name.trim() || (game.mode === "local" ? "Player 1" : "You"),
          avatar,
        ),
      );
  }
  const title = !game
    ? "Some games never grow old."
    : game.phase === "lobby"
      ? "Good company. Great game."
      : game.phase === "finished"
        ? "A game well played."
        : "Every move tells a story.";
  // The set up panel is split into parts so a phone can show them a screen at
  // a time, while the wide layout keeps them together in one panel.
  const modeBlock = (
    <>
      <div className="mode-tabs" role="tablist" aria-label={t("Game mode")}>
        {(
          [
            { key: "online", label: "Online", icon: Users },
            { key: "local", label: "Together", icon: Monitor },
            { key: "solo", label: "Practice", icon: Bot },
          ] as const
        ).map((m) => (
          <button
            role="tab"
            aria-selected={mode === m.key}
            key={m.key}
            onClick={() => {
              setMode(m.key);
              setError("");
            }}
            className={mode === m.key ? "active" : ""}
          >
            <m.icon size={17} />
            {t(m.label)}
          </button>
        ))}
      </div>
      <p className="mode-description">
        {t(
          mode === "online"
            ? "Different places. The same table."
            : mode === "local"
              ? "One screen. Everyone around the table."
              : "Find your rhythm against the computer.",
        )}
      </p>
    </>
  );
  const boardBlock = (
    <>
      <div className="setting-heading">
        <label>{t("Choose your board")}</label>
        <span>01</span>
      </div>
      <div className="board-options">
        {([5, 7] as const).map((n) => (
          <button
            key={n}
            className={`board-option ${size === n ? "active" : ""}`}
            onClick={() => setSize(n)}
            aria-pressed={size === n}
          >
            <GridGlyph size={n} />
            <span>
              <strong>
                {n} × {n}
              </strong>
              <small>{t(n === 5 ? "The classic" : "The grand")}</small>
            </span>
            <span className="radio-dot" />
          </button>
        ))}
      </div>
    </>
  );
  const playersBlock = (
    <div className="players-picker">
      <label>{t("Players")}</label>
      <div>
        {[2, 3, 4].map((v) => (
          <button
            key={v}
            className={count === v ? "active" : ""}
            onClick={() => setCount(v)}
            aria-label={t(`${v} players`)}
            aria-pressed={count === v}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
  const nameBlock = (
    <div className="name-field">
      <label htmlFor="player-name">
        {t(mode === "local" ? "First player’s name" : "Your name")}
      </label>
      <input
        id="player-name"
        autoComplete="nickname"
        maxLength={20}
        placeholder={t(mode === "online" ? "What should we call you?" : "You")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
  const rulesBlock = (
    <div className="traditional-rules">
      <ShieldCheck size={18} />
      <p>
        <strong>{t("Capture to enter")}</strong>
        <span>{t("Make a capture to enter the inner ring.")}</span>
        <span>
          {t("One pawn per player in each house. Start and finish can be shared.")}
        </span>
      </p>
    </div>
  );
  const actionBlock = (
    <>
      <button
        className="primary-button"
        disabled={busy || !hydrated}
        onClick={start}
      >
        {busy ? (
          <Loader2 className="spinner" size={18} />
        ) : mode === "online" ? (
          <Users size={18} />
        ) : (
          <ArrowRight size={18} />
        )}
        <span>
          {t(
            busy
              ? "Opening your table…"
              : mode === "online"
                ? "Create a room"
                : mode === "local"
                  ? "Gather & play"
                  : "Let’s play",
          )}
        </span>
        {!busy && <ArrowUpRight size={18} />}
      </button>
      {mode === "online" ? (
        <button
          className="join-link"
          onClick={() => {
            setModal("join");
            setError("");
          }}
        >
          {t("Have a room code?")}
          {t(" ")}
          <strong>
            {t("Join a table ")}
            <ArrowRight size={13} />
          </strong>
        </button>
      ) : (
        <p className="panel-footnote">
          {t(
            mode === "solo"
              ? "You + " +
                  (count - 1) +
                  " computer opponent" +
                  (count > 2 ? "s" : "") +
                  " · No account needed"
              : "2–4 players · Pass the device each turn",
          )}
        </p>
      )}
    </>
  );
  const resumeBlock = resume ? (
    <button
      className="resume-button"
      onClick={() => {
        setGame(resume);
        setResume(null);
      }}
    >
      <RotateCcw size={14} /> {t("Continue your last game")}
      {t(" ")}
      <ChevronRight size={14} />
    </button>
  ) : null;
  const errorBlock = error ? (
    <p className="error-message" role="alert">
      {t(error)}
    </p>
  ) : null;
  return (
    <div
      ref={rootRef}
      className={`app-shell ${focused ? "is-focused" : ""} ${game?.phase === "playing" ? "is-playing" : ""} ${stillThrow ? "still-throw" : ""}`}
      data-screen={
        compact && !focused
          ? game
            ? game.phase === "finished"
              ? "result"
              : "lobby"
            : screen
          : undefined
      }
    >
      {focused && game && (
        <div className="focus-topbar">
          <div className="focus-game-name">
            <button
              className="profile-button"
              onClick={() => setModal("profile")}
              aria-label={t("Player settings")}
            >
              <Avatar value={portraitOf(game.players[me] || game.players[0])} />
            </button>
            <Flower size={20} />
            <span>
              {t("chowka bara")}
              <small>
                {game.size} × {game.size} · {t("Capture to enter")}
              </small>
            </span>
          </div>
          <div>
            {canImmerse && !immersive && (
              <button
                className="icon-button immersive-button"
                onClick={immerse}
                aria-label={t("Hide browser controls")}
                title={t("Hide browser controls")}
              >
                <Maximize size={17} />
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => setModal("rules")}
              aria-label={t("Rules")}
            >
              <CircleHelp size={18} />
            </button>
            <button
              className="icon-button"
              onClick={toggleSound}
              aria-label={t(sound ? "Mute sound" : "Enable sound")}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              className="icon-button"
              onClick={toggleFocus}
              aria-label={t("Exit full screen")}
              title={t("Exit full screen")}
            >
              <Minimize size={18} />
            </button>
          </div>
        </div>
      )}
      {focused && error && (
        <div className="play-error-banner" role="alert">
          <CircleHelp size={16} />
          <span>{t(error)}</span>
          <button
            className="icon-button"
            onClick={() => setError("")}
            aria-label={t("Close dialog")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <header className="site-header">
        {compact && screen !== "home" && !game && (
          <button
            className="icon-button screen-back"
            onClick={() =>
              setScreen(screen === "seat" ? "setup" : "home")
            }
            aria-label={t("Back")}
            title={t("Back")}
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            if (game) setModal("leave");
            else if (compact && screen !== "home")
              setScreen(screen === "seat" ? "setup" : "home");
            else clearTable();
          }}
          aria-label={t("Chowka Bara home")}
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            {t("chowka bara")}
            <span className="brand-period">.</span>
            <small>{t("THE INDIAN GAME TABLE")}</small>
          </span>
        </a>
        <nav aria-label={t("Main navigation")}>
          <button
            className="nav-link nav-active"
            onClick={() => {
              if (game) setModal("leave");
            }}
          >
            {t("The game ")}
            <span>01</span>
          </button>
          <button className="nav-link" onClick={() => setModal("rules")}>
            {t("How to play ")}
            <ArrowUpRight size={14} />
          </button>
          <button
            className="nav-link about-link"
            onClick={() => setModal("about")}
          >
            {t("Our roots ")}
            <ArrowUpRight size={14} />
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="language-button"
            onClick={() => setLanguage(language === "en" ? "kn" : "en")}
            aria-label={
              language === "en" ? "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ" : "Switch to English"
            }
            title={language === "en" ? "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ" : "Switch to English"}
          >
            <Languages size={16} />
            <span>{language === "en" ? "ಕನ್ನಡ" : "English"}</span>
          </button>
          <button
            className="icon-button theme-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={
              language === "kn"
                ? theme === "light"
                  ? "ಕತ್ತಲೆ ವಿನ್ಯಾಸ ಬಳಸಿ"
                  : "ಬೆಳಕಿನ ವಿನ್ಯಾಸ ಬಳಸಿ"
                : theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
            }
            title={
              language === "kn"
                ? theme === "light"
                  ? "ಕತ್ತಲೆ ವಿನ್ಯಾಸ"
                  : "ಬೆಳಕಿನ ವಿನ್ಯಾಸ"
                : theme === "light"
                  ? "Dark mode"
                  : "Light mode"
            }
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>
          <span className="header-note">
            <i /> {t("Made for togetherness ")}
          </span>
          <button
            className="profile-button"
            onClick={() => setModal("profile")}
            aria-label={t("Player settings")}
          >
            <Avatar
              value={
                game ? portraitOf(game.players[me] || game.players[0]) : avatar
              }
            />
          </button>
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label={t(sound ? "Mute sound" : "Enable sound")}
            title={t(sound ? "Mute sound" : "Enable sound")}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-star">✳</span>{" "}
              {t("A CLASSIC, BACK AT THE TABLE ")}
            </div>
            <h1>{t(title)}</h1>
            <p>
              {t(
                !game
                  ? "A handful of shells. Four little pawns. Endless reasons to play again."
                  : game.phase === "lobby"
                    ? "Pull up a chair. Invite your people. The courtyard is yours."
                    : game.phase === "finished"
                      ? "A little luck, a little strategy. Ready for another round?"
                      : `${game.size} × ${game.size} ${game.size === 5 ? "Classic" : "Grand"} · ${"Capture to enter"} · ${game.mode === "online" ? "Online table" : game.mode === "solo" ? "Practice with the computer" : "Pass & play"}`,
              )}
            </p>
            {compact && screen === "home" && !game && (
              <div className="home-actions">
                <button
                  className="primary-button home-cta"
                  onClick={() => setScreen("setup")}
                >
                  <span>{t("Play")}</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  className="subtle-button home-rules"
                  onClick={() => setModal("rules")}
                >
                  <CircleHelp size={15} />
                  {t("How to play")}
                </button>
                {resumeBlock}
              </div>
            )}
          </div>
          <div className="heritage-stamp">
            <Flower size={24} strokeWidth={1} />
            <span>
              {t("ROOTED IN INDIA ")}
              <br />
              {t("OPEN TO EVERYONE ")}
            </span>
          </div>
        </section>
        <div className="game-layout">
          <section className="table-section" aria-label={t("Game table")}>
            <div className="table-toolbar">
              <div>
                <span className="table-status-dot" />
                {t(" ")}
                {t(
                  game?.phase === "lobby"
                    ? "YOUR PRIVATE TABLE"
                    : game
                      ? "THE GAME IS ON"
                      : "THE COURTYARD",
                )}
                <span className="toolbar-separator">/</span>
                <span className="board-label">
                  {boardGame.size} × {boardGame.size}
                  {t(" ")}
                  {t(boardGame.size === 5 ? "CLASSIC" : "GRAND")}
                </span>
              </div>
              <div className="table-view-actions">
                {game && game.phase !== "lobby" && (
                  <button
                    className="focus-button"
                    onClick={toggleFocus}
                    aria-label={t(focused ? "Exit full screen" : "Full screen")}
                    title={t(focused ? "Exit full screen" : "Full screen")}
                    aria-pressed={focused}
                  >
                    {focused ? <Minimize size={15} /> : <Maximize size={15} />}
                    <span>
                      {t(focused ? "Exit full screen" : "Full screen")}
                    </span>
                  </button>
                )}
                {!advanced && (
                  <button
                    className={`path-button ${showPath ? "selected" : ""}`}
                    onClick={() => setShowPath(!showPath)}
                    aria-pressed={showPath}
                  >
                    <Route size={14} />
                    <span>{t(showPath ? "Hide path" : "Show path")}</span>
                  </button>
                )}
              </div>
            </div>
            {showPath && !advanced && <RouteExplanation game={boardGame} />}
            <Board
              game={boardGame}
              travel={travel}
              canPlay={playable}
              preview={!game || game.phase === "lobby"}
              showPath={showPath && !advanced}
              onMove={move}
              throwOverlay={
                game?.phase === "playing" && (rolling || showShot) ? (
                  <div
                    className={`board-throw-layer ${rolling ? "is-tossing" : "is-result"}`}
                  >
                    <div
                      className="board-throw-card"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="overline">
                        {rolling
                          ? t(
                              game.players[game.turn].name === "You"
                                ? "Your turn"
                                : `${game.players[game.turn].name}’s turn`,
                            )
                          : t(
                              (shot?.name || game.players[game.turn].name) ===
                                "You"
                                ? "Your turn"
                                : `${shot?.name || game.players[game.turn].name}’s turn`,
                            )}
                      </span>
                      <Cowries
                        count={shellCount(game.size)}
                        shells={rolling ? [] : shot?.shells || game.shells}
                        rolling={rolling}
                      />
                      <div className="board-throw-score">
                        {rolling ? (
                          <span>{t("Tossing…")}</span>
                        ) : (
                          <>
                            <strong>{shot?.score}</strong>
                            <span>
                              {t(
                                shot?.bonus
                                  ? "BONUS THROW EARNED"
                                  : "SPACES TO MOVE",
                              )}
                            </span>
                          </>
                        )}
                      </div>
                      {!rolling && (
                        <span className="throw-card-hint">
                          {t(
                            myTurn && game.roll !== null
                              ? "Choose your pawn"
                              : "The game is on",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null
              }
            />
            {game?.phase === "playing" && (
              <div className="board-turn-caption" role="status">
                <span
                  className="result-dot"
                  style={{ background: COLORS[game.players[game.turn].color] }}
                />
                <strong>
                  {t(
                    myTurn
                      ? "Your turn"
                      : `${game.players[game.turn].name}’s turn`,
                  )}
                </strong>
                <span>
                  {t(
                    pawnMoving
                      ? "Moving pawn…"
                      : rolling
                        ? "Tossing…"
                        : game.roll !== null
                          ? `Move ${game.roll} spaces`
                          : game.bonus
                            ? "A bonus throw. Make it count."
                            : myTurn
                              ? "Throw the cowries"
                              : "Waiting for their next throw.",
                  )}
                </span>
              </div>
            )}
            <div className="table-bottom">
              <span className="small-flower">✳</span>
              <span>
                {t(
                  !game
                    ? "Where a familiar game finds a new home."
                    : game.lastAction,
                )}
              </span>
              <span className="table-bottom-number">
                {t(
                  game
                    ? `MOVE ${String(game.revision).padStart(2, "0")}`
                    : "EST. IN TRADITION",
                )}
              </span>
            </div>
          </section>
          <aside className="game-panel">
            {!game ? (
              compact ? (
                screen === "setup" ? (
                  <>
                    <div className="panel-title">
                      <span className="overline">{t("THE TABLE")}</span>
                      <h2>{t("Set the table.")}</h2>
                      <p>
                        {t(
                          "Choose your game, your board, and the house rules.",
                        )}
                      </p>
                    </div>
                    {modeBlock}
                    {boardBlock}
                    {mode !== "online" && playersBlock}
                    {rulesBlock}
                    <button
                      className="primary-button"
                      onClick={() => setScreen("seat")}
                    >
                      <span>{t("Next")}</span>
                      <ArrowRight size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="panel-title">
                      <span className="overline">{t("YOUR SEAT")}</span>
                      <h2>{t("Take your seat.")}</h2>
                      <p>
                        {t("Pick a face, a name, and how much help you want.")}
                      </p>
                    </div>
                    <AvatarPicker value={avatar} onChange={chooseAvatar} />
                    {nameBlock}
                    <ExperiencePicker />
                    {errorBlock}
                    {actionBlock}
                  </>
                )
              ) : (
                <>
                  <div className="panel-title">
                    <span className="overline">{t("A SEAT FOR EVERYONE")}</span>
                    <h2>{t("Play your way.")}</h2>
                    <p>{t("Your people, your board, your next game.")}</p>
                  </div>
                  {modeBlock}
                  {boardBlock}
                  <AvatarPicker value={avatar} onChange={chooseAvatar} />
                  <div className="settings-row">
                    {nameBlock}
                    {mode !== "online" && playersBlock}
                  </div>
                  <ExperiencePicker />
                  {rulesBlock}
                  {errorBlock}
                  {actionBlock}
                  {resumeBlock}
                </>
              )
            ) : game.phase === "lobby" ? (
              <>
                <div className="panel-title">
                  <span className="overline">{t("THE MORE, THE MERRIER")}</span>
                  <h2>{t("Your table is open.")}</h2>
                  <p>{t("Share the code. Make room for a rivalry.")}</p>
                </div>
                <div className="room-code-box">
                  <span>{t("ROOM CODE")}</span>
                  <strong>{session?.code}</strong>
                  <button onClick={copyInvite}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {t(" ")}
                    {t(copied ? "Copied" : "Copy invite link")}
                  </button>
                </div>
                <div className="setting-heading">
                  <label>{t("At the table")}</label>
                  <span>{game.players.length}/4</span>
                </div>
                <div className="lobby-seats">
                  {Array.from({ length: 4 }, (_, i) => {
                    const p = game.players[i];
                    return (
                      <div key={p?.id || i} className={p ? "filled" : ""}>
                        {p ? (
                          <>
                            <Avatar
                              className="lobby-avatar"
                              value={portraitOf(p)}
                            />
                            <strong>
                              {p.name}
                              {t(p.id === session?.playerId ? " (you)" : "")}
                            </strong>
                            <small>{t(i === 0 ? "Host" : "Joined")}</small>
                          </>
                        ) : (
                          <>
                            <span className="empty-avatar">
                              <Users size={16} />
                            </span>
                            <span>{t("A seat for a friend")}</span>
                            <span className="waiting-dots">···</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {error && (
                  <p className="error-message" role="alert">
                    {t(error)}
                  </p>
                )}
                {me === 0 ? (
                  <button
                    className="primary-button"
                    disabled={busy || game.players.length < 2}
                    onClick={() => void onlineAction("start")}
                  >
                    <span>
                      {t(
                        game.players.length < 2
                          ? "Waiting for a friend…"
                          : "Start the game",
                      )}
                    </span>
                    {busy ? (
                      <Loader2 size={18} className="spinner" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                ) : (
                  <div className="waiting-host">
                    <Loader2 className="spinner" size={16} />{" "}
                    {t("Your host will start the game. ")}
                  </div>
                )}
                <p className="panel-footnote">
                  {t("2–4 players · ")}
                  {game.size} × {game.size} ·{t(" ")}
                  {t("Capture to enter")}
                </p>
                <button
                  className="subtle-button"
                  onClick={() => setModal("leave")}
                >
                  <DoorOpen size={14} /> {t("Leave table ")}
                </button>
              </>
            ) : game.phase === "finished" ? (
              <>
                <div className="winner-medallion">
                  <Flag size={34} strokeWidth={1.3} />
                </div>
                <div className="panel-title winner-title">
                  <span className="overline">
                    {t("THE COURTYARD CHAMPION")}
                  </span>
                  <h2>{game.players[game.winner!].name}</h2>
                  <p>{t("All roads led home. This one led to victory.")}</p>
                </div>
                <div className="finish-results">
                  {game.players.map((p, i) => (
                    <div key={p.id}>
                      <span
                        className="result-dot"
                        style={{ background: COLORS[p.color] }}
                      />
                      <strong>{p.name}</strong>
                      <span>
                        {t(
                          i === game.winner
                            ? "Winner"
                            : p.resigned
                              ? "Resigned"
                              : `${p.pawns.filter((v) => v === playerPath(game.size, p.color).length - 1).length}/4 home`,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {!session || me === 0 ? (
                  <button
                    className="primary-button"
                    onClick={rematch}
                    disabled={busy}
                  >
                    <RotateCcw size={17} />
                    <span>{t("One more round")}</span>
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <p className="panel-footnote">
                    {t("Your host can open a rematch. ")}
                  </p>
                )}
                <button className="subtle-button" onClick={clearTable}>
                  {t("Back to the courtyard ")}
                  <ArrowUpRight size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="turn-heading">
                  <span className="overline">
                    {t(
                      myTurn
                        ? "YOUR MOMENT"
                        : game.players[game.turn].bot
                          ? "THINKING IT THROUGH"
                          : "ACROSS THE TABLE",
                    )}
                  </span>
                  <h2>
                    <span
                      className="turn-color"
                      style={{
                        background: COLORS[game.players[game.turn].color],
                      }}
                    />
                    {t(
                      myTurn
                        ? game.mode === "local"
                          ? `${game.players[game.turn].name}’s turn`
                          : "Your move."
                        : `${game.players[game.turn].name}’s turn`,
                    )}
                  </h2>
                  <p>
                    {t(
                      rolling
                        ? "A little luck is on its way…"
                        : game.roll !== null
                          ? myTurn
                            ? advanced
                              ? "Select a pawn on the board."
                              : "Choose a glowing pawn to move."
                            : "Choosing a pawn to move…"
                          : game.bonus
                            ? "A bonus throw. Make it count."
                            : myTurn
                              ? "Give the cowries a throw."
                              : "Waiting for their next throw.",
                    )}
                  </p>
                </div>
                <div className="throw-tray">
                  <Cowries
                    count={shellCount(game.size)}
                    shells={game.shells}
                    rolling={rolling}
                  />
                  <div className="throw-result">
                    {rolling ? (
                      <span className="result-wait">
                        {t("TOSSING THE COWRIES")}
                      </span>
                    ) : game.roll !== null ? (
                      <>
                        <strong>{game.roll}</strong>
                        <span>
                          {t(
                            game.bonus
                              ? "BONUS THROW EARNED"
                              : "SPACES TO MOVE",
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="result-wait">
                        {t(
                          game.shells.length
                            ? `LAST THROW · ${game.shells.filter(Boolean).length || shellCount(game.size) * 2}`
                            : `${shellCount(game.size)} COWRIES · COUNTLESS POSSIBILITIES`,
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <ThrowButton
                  className="roll-button"
                  disabled={!playable || game.roll !== null}
                  rolling={rolling}
                  onClick={() => void roll()}
                  label={
                    pawnMoving
                      ? "Moving pawn…"
                      : rolling
                        ? "Shells in the air…"
                        : game.roll !== null
                          ? "Choose your pawn"
                          : myTurn
                            ? "Throw the cowries"
                            : "Their turn to throw"
                  }
                />
                {game.roll !== null && myTurn && !advanced && (
                  <div className="pawn-picker">
                    {legalMoves(game).map((p) => (
                      <button
                        key={p}
                        onClick={() => void move(p)}
                        disabled={!playable}
                      >
                        <span
                          style={{
                            background: COLORS[game.players[game.turn].color],
                          }}
                        >
                          {p + 1}
                        </span>
                        {t("Pawn ")}
                        {p + 1}
                        <ArrowRight size={12} />
                      </button>
                    ))}
                  </div>
                )}
                {error && (
                  <p className="error-message" role="alert">
                    {t(error)}
                  </p>
                )}
                <div className="game-progress">
                  <div className="setting-heading">
                    <label>{t("The race home")}</label>
                    <span>
                      <Flag size={13} />
                    </span>
                  </div>
                  {game.players.map((p, i) => {
                    const end = playerPath(game.size, p.color).length - 1;
                    return (
                      <div
                        className={`progress-player ${i === game.turn ? "current" : ""}`}
                        key={p.id}
                      >
                        <div>
                          <span
                            className="result-dot"
                            style={{ background: COLORS[p.color] }}
                          />
                          <strong>
                            {p.name}
                            {t(p.id === session?.playerId ? " (you)" : "")}
                          </strong>
                          <small>
                            {t(
                              p.resigned
                                ? "Resigned"
                                : `${p.pawns.filter((v) => v === end).length}/4`,
                            )}
                          </small>
                        </div>
                        <div className="progress-track">
                          <i
                            style={{
                              width: `${(p.pawns.reduce((a, v) => a + v, 0) / (end * 4)) * 100}%`,
                              background: COLORS[p.color],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="activity">
                  <span className="overline">{t("AROUND THE TABLE")}</span>
                  <div aria-live="polite">
                    {game.logs
                      .slice(-3)
                      .reverse()
                      .map((l, i) => (
                        <p
                          key={`${l.id}-${i}`}
                          className={i === 0 ? "latest" : ""}
                        >
                          <i
                            style={{
                              background:
                                COLORS[game.players[l.player]?.color || 0],
                            }}
                          />
                          {t(l.text)}
                        </p>
                      ))}
                  </div>
                </div>
                <div className="playing-actions">
                  <button onClick={() => setModal("rules")}>
                    <CircleHelp size={14} /> {t("Rules ")}
                  </button>
                  {session && (
                    <button onClick={copyInvite}>
                      <Link2 size={14} /> {t("Invite ")}
                    </button>
                  )}
                  <button onClick={() => setModal("leave")}>
                    <DoorOpen size={14} /> {t("Leave ")}
                  </button>
                </div>
              </>
            )}
            {session && (
              <div
                className={`connection-status ${!connected ? "offline" : ""}`}
              >
                {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {t(" ")}
                {t(
                  connected
                    ? "Connected to your table"
                    : "Reconnecting automatically…",
                )}
                <span>{session.code}</span>
              </div>
            )}
          </aside>
        </div>
        <section
          className="how-strip"
          aria-label={t("The game in three steps")}
        >
          <div className="how-intro">
            <span className="small-flower">✳</span>
            <span>
              {t("Simple to learn. ")}
              <br />
              <strong>{t("Hard to leave.")}</strong>
            </span>
          </div>
          <button onClick={() => setModal("rules")}>
            <span className="step-number">01</span>
            <span>
              <strong>{t("Throw a little luck.")}</strong>
              <small>{t("Toss the cowries. Find your number.")}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <button onClick={() => setModal("rules")}>
            <span className="step-number">02</span>
            <span>
              <strong>{t("Make your move.")}</strong>
              <small>{t("Race, capture, and take the safe road.")}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <button onClick={() => setModal("rules")}>
            <span className="step-number">03</span>
            <span>
              <strong>{t("Bring it all home.")}</strong>
              <small>{t("Four pawns. One center. Your victory.")}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        </section>
      </main>
      <footer>
        <span>{t("From Indian courtyards to wherever you are.")}</span>
        <button onClick={() => setModal("about")}>
          {t("Tradition, with a new connection. ")}
          <ArrowUpRight size={12} />
        </button>
        <span className="footer-word">
          ಆಡೋಣ ಬನ್ನಿ <Flower size={14} />
        </span>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {t(notice)}
        </div>
      )}
      {modal && (
        <ModalDialog
          onClose={() => {
            setModal(null);
            setError("");
          }}
          title={t(
            modal === "profile"
              ? "Player settings"
              : modal === "rules"
                ? "A small guide to a great game."
                : modal === "join"
                  ? "There’s a seat for you."
                  : modal === "leave"
                    ? "Step away from the table?"
                    : "Old roots. New connections.",
          )}
        >
          {modal === "profile" ? (
            <>
              <AvatarPicker
                value={game?.players[me]?.avatar ?? avatar}
                onChange={chooseAvatar}
              />
              <ExperiencePicker />
            </>
          ) : modal === "join" ? (
            <form onSubmit={join}>
              <p className="modal-lead">
                {t(
                  "A familiar name and a six-character code. That’s all you need. ",
                )}
              </p>
              <label className="field-label" htmlFor="join-name">
                {t("Your name ")}
              </label>
              <input
                id="join-name"
                required
                maxLength={20}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("What should we call you?")}
              />
              <AvatarPicker value={avatar} onChange={chooseAvatar} />
              <label className="field-label" htmlFor="room-code">
                {t("Room code ")}
              </label>
              <input
                id="room-code"
                className="code-input"
                required
                minLength={6}
                maxLength={6}
                pattern="[a-zA-Z2-9]{6}"
                autoCapitalize="characters"
                autoComplete="off"
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(
                    e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""),
                  )
                }
                placeholder={t("ABC234")}
              />
              {error && (
                <p className="error-message" role="alert">
                  {t(error)}
                </p>
              )}
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <Users size={18} />
                )}
                <span>
                  {t(busy ? "Finding your table…" : "Join the table")}
                </span>
                <ArrowRight size={17} />
              </button>
            </form>
          ) : modal === "leave" ? (
            <>
              <p className="modal-lead">
                {t(
                  session && game?.phase === "playing"
                    ? "Leaving resigns your seat in this game. Your friends can keep playing."
                    : session
                      ? "You’ll leave this room. The next player becomes host if you opened it."
                      : "Your local game is saved automatically. You can continue it from the courtyard.",
                )}
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  {t("Stay & play ")}
                </button>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => {
                    if (!session) {
                      setGame(null);
                      setModal(null);
                      setResume(game);
                    } else void leave();
                  }}
                >
                  {t("Leave table ")}
                  <ArrowRight size={16} />
                </button>
              </div>
              {error && (
                <p className="error-message" role="alert">
                  {t(error)}
                </p>
              )}
            </>
          ) : modal === "about" ? (
            <div className="about-content">
              <Flower size={58} strokeWidth={0.8} />
              <p>
                {t(
                  "Before screens, there were courtyards. A board drawn on the floor, a handful of cowries, and a few people who always had time for one more game. ",
                )}
              </p>
              <p>
                {t(
                  "Chowka Bara carries that spirit from Karnataka. Related traditions are known as Ashta Chamma, Katte Mane, and other names across India. Each family brings its own little rules. ",
                )}
              </p>
              <p>
                {t(
                  "This is our invitation to keep playing. Familiar at heart, made for friends near and far. ",
                )}
              </p>
              <a
                href="https://rollthedice.in/pages/how-to-play-chowka-bara-7-house"
                target="_blank"
                rel="noreferrer"
              >
                {t("Explore the traditional game ")}
                <ArrowUpRight size={14} />
              </a>
              <small>
                {t(
                  "Local and practice games stay on your device. Online rooms store names and game state and expire after 24 hours. No account is required by the game; hosting access rules may still apply. ",
                )}
              </small>
            </div>
          ) : (
            <RulesGuide size={game?.size || size} />
          )}
        </ModalDialog>
      )}
      {game &&
        (game.phase === "playing" || (focused && game.phase === "finished")) &&
        !modal && (
          <div className="mobile-turn-bar">
            <div>
              <span
                className="result-dot"
                style={{ background: COLORS[game.players[game.turn].color] }}
              />
              <strong>
                {t(
                  game.phase === "finished"
                    ? "A game well played."
                    : myTurn
                      ? "Your turn"
                      : `${game.players[game.turn].name}’s turn`,
                )}
              </strong>
              <small>
                {t(
                  pawnMoving
                    ? "Moving pawn…"
                    : rolling
                      ? "Tossing…"
                      : game.roll !== null
                        ? `Move ${game.roll} spaces`
                        : "Throw the cowries",
                )}
              </small>
            </div>
            {game.phase === "finished" ? (
              <button
                className="primary-button"
                disabled={pawnMoving}
                onClick={() => {
                  exitFocus();
                  requestAnimationFrame(() =>
                    rootRef.current
                      ?.querySelector(".game-panel")
                      ?.scrollIntoView({ block: "start", behavior: "instant" }),
                  );
                }}
              >
                {t("View results")}
                <ArrowRight size={16} />
              </button>
            ) : myTurn && game.roll !== null && advanced ? (
              <div className="advanced-turn">
                <span className="roll-value" aria-label={t("Your throw")}>
                  {game.roll}
                </span>
                <strong>{t("Select a pawn on the board.")}</strong>
              </div>
            ) : myTurn && game.roll !== null ? (
              <div className="mobile-pawns">
                {legalMoves(game).map((p) => (
                  <button
                    key={p}
                    disabled={!playable}
                    onClick={() => void move(p)}
                    aria-label={t(`Move pawn ${p + 1}`)}
                  >
                    <span
                      style={{
                        background: COLORS[game.players[game.turn].color],
                      }}
                    >
                      {p + 1}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <ThrowButton
                disabled={!playable || game.roll !== null}
                rolling={rolling}
                onClick={() => void roll()}
                label={
                  pawnMoving
                    ? "Moving pawn…"
                    : rolling
                      ? "Tossing…"
                      : myTurn
                        ? "Throw cowries"
                        : "Waiting…"
                }
              />
            )}
          </div>
        )}
      <KeyboardThrow
        enabled={playable && game?.roll === null && !modal}
        onThrow={() => void roll(true)}
      />
    </div>
  );
}
function KeyboardThrow({
  enabled,
  onThrow,
}: {
  enabled: boolean;
  onThrow: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        enabled &&
        e.key === "Enter" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        onThrow();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onThrow]);
  return null;
}
function ModalDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = usePreferences();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <span className="overline">{t("CHOWKA BARA · THE GAME TABLE")}</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label={t("Close dialog")}
        >
          <X size={20} />
        </button>
      </div>
      <h2>{t(title)}</h2>
      {children}
    </dialog>
  );
}
function RulesGuide({ size }: { size: BoardSize }) {
  const { t } = usePreferences();
  const [board, setBoard] = useState<BoardSize>(size);
  const shells = shellCount(board);
  return (
    <div className="rules-guide">
      <div className="rules-board-tabs">
        {([5, 7] as const).map((n) => (
          <button
            className={board === n ? "active" : ""}
            onClick={() => setBoard(n)}
            key={n}
          >
            {n} × {n} {t(n === 5 ? "Classic" : "Grand")}
          </button>
        ))}
      </div>
      <p className="modal-lead">
        {t(
          "2–4 players. Four pawns each. Race around the board and spiral into the center. ",
        )}
      </p>
      <ol>
        <li>
          <strong>{t("Throw the cowries")}</strong>
          <p>
            {t(
              `${shells} shells for this board. Each open mouth scores 1. All open scores ${shells}; all closed scores ${shells * 2}. Both earn another throw after your move.`,
            )}
          </p>
        </li>
        <li>
          <strong>{t("Choose one pawn")}</strong>
          <p>
            {t(
              "Every pawn begins on your colored home square. Move any one pawn by the full throw. Follow the numbered path: around the outside, then spiral inward. Use “Show path” at the table. ",
            )}
          </p>
        </li>
        <li>
          <strong>{t("Capture & find shelter")}</strong>
          <p>
            {t(
              "Land exactly on a rival to send their pawn back to the start and earn a bonus throw. Crossed squares and the center are safe. One pawn per player in each house; your start and the finish can hold all four. ",
            )}
          </p>
        </li>
        <li>
          <strong>{t("Earn your way inward")}</strong>
          <p>
            {t(
              "Every player must capture an opponent before entering the inner circle. Beginner mode shows available moves. Advanced mode leaves you to choose a pawn without hints. ",
            )}
          </p>
        </li>
        <li>
          <strong>{t("Bring all four home")}</strong>
          <p>
            {t(
              "Reach the center by exact count. Bringing a pawn home earns a throw. If you cannot move, your throw is skipped; a bonus throw is kept. The first player with all four home wins. ",
            )}
          </p>
        </li>
      </ol>
      <div className="rules-note">
        <ShieldCheck size={21} />
        <p>
          {t(
            board === 5
              ? "The 5-house board has four safe houses at the outer midpoints. The center is the finish. Inner squares allow captures."
              : "The 7-house board has eight safe houses plus the center. Crossed squares protect your pawns.",
          )}
          {t(
            " Throws resolve individually, with no pairing, blockades, or three-bonus penalty.",
          )}
        </p>
      </div>
      <a
        className="rules-source"
        href="https://rollthedice.in/pages/how-to-play-chowka-bara-7-house"
        target="_blank"
        rel="noreferrer"
      >
        {t("Based on Karnataka’s cowrie game tradition ")}
        <ArrowUpRight size={13} />
      </a>
    </div>
  );
}
