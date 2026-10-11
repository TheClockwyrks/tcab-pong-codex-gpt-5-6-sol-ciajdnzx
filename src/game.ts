import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
}
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export interface Snapshot extends Omit<CaromState, "ball"> {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
}
type Pose = (state: DeepReadonly<CaromState>) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  reset: Pose;
  reconcile: Pose;
  spawnObstacle(s: DeepReadonly<CaromState>, index: number): CaromState;
  setScreen(s: DeepReadonly<CaromState>, v: Screen): CaromState;
  setMode(s: DeepReadonly<CaromState>, v: Mode): CaromState;
  setMenuIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setTitleIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setResumeScreen(
    s: DeepReadonly<CaromState>,
    v: "countdown" | "playing",
  ): CaromState;
  setScore(s: DeepReadonly<CaromState>, p1: number, p2: number): CaromState;
  setWinner(s: DeepReadonly<CaromState>, v: Side | null): CaromState;
  setReceiver(s: DeepReadonly<CaromState>, v: Side): CaromState;
  setPaddleCy(s: DeepReadonly<CaromState>, side: Side, v: number): CaromState;
  setPaddleVy(s: DeepReadonly<CaromState>, side: Side, v: number): CaromState;
  setPaddleDriven(
    s: DeepReadonly<CaromState>,
    side: Side,
    v: boolean,
  ): CaromState;
  setBallPosition(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallVelocity(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallSpin(s: DeepReadonly<CaromState>, v: number): CaromState;
  setBallHeld(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setBallHoldTimer(s: DeepReadonly<CaromState>, v: number): CaromState;
  setBallServeSign(s: DeepReadonly<CaromState>, v: 1 | -1): CaromState;
  drawBallServeSign: Pose;
  setAiTracking(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setAiMovement(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  setMuted(s: DeepReadonly<CaromState>, v: boolean): CaromState;
  snapshot(s: DeepReadonly<CaromState>): Snapshot;
  menuItemRect(s: DeepReadonly<CaromState>, i: number): MenuRect | null;
}

export const BACKGROUND = "#071019";
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
const serveSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const ball = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: serveSign(),
  trail: [],
});
const paddle = (): PaddleState => ({
  cy: C.FIELD_CY,
  vy: 0,
  driven: false,
  drivenVy: 0,
});
const allObstacles = (): ObstacleState[] =>
  C.OBSTACLE_CENTERS.map((p, index) => ({ index, cx: p.x, cy: p.y }));
const initial = (muted = false): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: 0,
  titleIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: { left: paddle(), right: paddle() },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: ball(),
  obstacles: allObstacles(),
  simTime: 0,
  muted,
});
const copy = (s: DeepReadonly<CaromState>): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
    : null,
  obstacles: s.obstacles.map((o) => ({ ...o })),
});

function count(screen: Screen): number {
  return screen === "title"
    ? 3
    : screen === "howto"
      ? 1
      : screen === "paused"
        ? 3
        : screen === "matchover"
          ? 2
          : 0;
}
function rect(screen: Screen, i: number): MenuRect | null {
  const n = count(screen);
  if (i < 0 || i >= n) return null;
  return {
    x: 440,
    y: (screen === "title" ? 385 : screen === "howto" ? 590 : 405) + i * 68,
    w: 400,
    h: 52,
  };
}
function start(s: CaromState, mode = s.mode): CaromState {
  return {
    ...s,
    mode,
    screen: "countdown",
    resumeScreen: "playing",
    menuIndex: 0,
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: ball(),
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
  };
}
function title(s: CaromState): CaromState {
  return {
    ...initial(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function confirm(s: CaromState): CaromState {
  if (s.screen === "title") {
    const n = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s)
        : title(s);
  if (s.screen === "matchover") return s.menuIndex === 0 ? start(s) : title(s);
  return s;
}
function move(p: PaddleState, vy: number, dt: number): PaddleState {
  const cy = clamp(p.cy + vy * dt, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt > 0 ? (cy - p.cy) / dt : vy };
}

type Hit = "paddle" | "wall" | null;
function collide(
  b: BallState,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  side?: Side,
): [BallState, Hit] {
  if (!(
    b.x > x0 - C.BALL_R &&
    b.x < x1 + C.BALL_R &&
    b.y > y0 - C.BALL_R &&
    b.y < y1 + C.BALL_R
  ))
    return [b, null];
  const d = [
    b.x - (x0 - C.BALL_R),
    x1 + C.BALL_R - b.x,
    b.y - (y0 - C.BALL_R),
    y1 + C.BALL_R - b.y,
  ];
  let f = 0;
  for (let i = 1; i < 4; i += 1) if (d[i] < d[f]) f = i;
  if (f === 0) b = { ...b, x: x0 - C.BALL_R, vx: b.vx > 0 ? -b.vx : b.vx };
  if (f === 1) b = { ...b, x: x1 + C.BALL_R, vx: b.vx < 0 ? -b.vx : b.vx };
  if (f === 2) b = { ...b, y: y0 - C.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy };
  if (f === 3) b = { ...b, y: y1 + C.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy };
  return [b, side && f < 2 ? "paddle" : "wall"];
}
function bounce(b: BallState, p: PaddleState, side: Side): BallState {
  const angle = clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
  const speed = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
  return {
    ...b,
    x: side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R,
    vx: (side === "left" ? 1 : -1) * speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
    spin: clamp(
      b.spin + p.vy * C.SPIN_FROM_PADDLE,
      -C.SPIN_CLAMP,
      C.SPIN_CLAMP,
    ),
  };
}
interface Events {
  wall: boolean;
  paddle: boolean;
  obstacle: boolean;
}
function physics(
  ballState: BallState,
  s: CaromState,
  dt: number,
): [BallState, Events] {
  let b = ballState;
  const events = { wall: false, paddle: false, obstacle: false };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
  );
  const h = dt / n;
  for (let k = 0; k < n; k += 1) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 0) {
      const a = (b.spin / speed) * h,
        co = Math.cos(a),
        si = Math.sin(a);
      b = { ...b, vx: b.vx * co - b.vy * si, vy: b.vx * si + b.vy * co };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / C.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: C.BALL_R, vy: -b.vy };
      events.wall = true;
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b = { ...b, y: C.FIELD_H - C.BALL_R, vy: -b.vy };
      events.wall = true;
    }
    for (const side of ["left", "right"] as const) {
      const p = s.paddles[side],
        x0 = side === "left" ? C.P1_X0 : C.P2_X0,
        x1 = side === "left" ? C.P1_X1 : C.P2_X1;
      const result = collide(
        b,
        x0,
        p.cy - C.PADDLE_HALF,
        x1,
        p.cy + C.PADDLE_HALF,
        side,
      );
      b = result[1] === "paddle" ? bounce(result[0], p, side) : result[0];
      if (result[1] === "paddle") events.paddle = true;
      else if (result[1]) events.wall = true;
    }
    for (const o of s.obstacles) {
      const result = collide(
        b,
        o.cx - C.OBSTACLE_HW,
        o.cy - C.OBSTACLE_HH,
        o.cx + C.OBSTACLE_HW,
        o.cy + C.OBSTACLE_HH,
      );
      b = result[0];
      if (result[1]) events.obstacle = true;
    }
  }
  return [b, events];
}

function debug(): CaromDebugApi {
  const withBall = (
    s: DeepReadonly<CaromState>,
    fn: (b: BallState) => BallState,
  ): CaromState => {
    const n = copy(s);
    if (!n.ball) throw new Error("Carom: no ball is present");
    return { ...n, ball: fn(n.ball) };
  };
  const withPaddle = (
    s: DeepReadonly<CaromState>,
    side: Side,
    change: Partial<PaddleState>,
  ): CaromState => {
    const n = copy(s);
    return {
      ...n,
      paddles: { ...n.paddles, [side]: { ...n.paddles[side], ...change } },
    };
  };
  return {
    version: C.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...copy(s), ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...copy(s), ball: ball() }),
    reset: (s) => initial(s.muted),
    reconcile: copy,
    spawnObstacle: (s, i) => {
      const p = C.OBSTACLE_CENTERS[i];
      if (!p) throw new RangeError(`Carom: invalid obstacle ${i}`);
      const n = copy(s);
      return {
        ...n,
        obstacles: [
          ...n.obstacles.filter((o) => o.index !== i),
          { index: i, cx: p.x, cy: p.y },
        ].sort((a, b) => a.index - b.index),
      };
    },
    setScreen: (s, screen) => ({ ...copy(s), screen }),
    setMode: (s, mode) => ({ ...copy(s), mode }),
    setMenuIndex: (s, menuIndex) => ({ ...copy(s), menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...copy(s), titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...copy(s), resumeScreen }),
    setScore: (s, p1, p2) => ({ ...copy(s), score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...copy(s), winner }),
    setReceiver: (s, receiver) => ({ ...copy(s), receiver }),
    setPaddleCy: (s, side, cy) => withPaddle(s, side, { cy }),
    setPaddleVy: (s, side, drivenVy) => withPaddle(s, side, { drivenVy }),
    setPaddleDriven: (s, side, driven) => withPaddle(s, side, { driven }),
    setBallPosition: (s, x, y) => withBall(s, (b) => ({ ...b, x, y })),
    setBallVelocity: (s, vx, vy) => withBall(s, (b) => ({ ...b, vx, vy })),
    setBallSpin: (s, spin) => withBall(s, (b) => ({ ...b, spin })),
    setBallHeld: (s, held) => withBall(s, (b) => ({ ...b, held })),
    setBallHoldTimer: (s, holdTimer) =>
      withBall(s, (b) => ({ ...b, holdTimer })),
    setBallServeSign: (s, serveSign) =>
      withBall(s, (b) => ({ ...b, serveSign })),
    drawBallServeSign: (s) =>
      withBall(s, (b) => ({ ...b, serveSign: serveSign() })),
    setAiTracking: (s, tracking) => ({ ...copy(s), ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...copy(s), ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...copy(s), muted }),
    snapshot: (s) => {
      const n = copy(s);
      return {
        ...n,
        version: C.CAROM_DEBUG_VERSION,
        ball: n.ball
          ? { ...n.ball, speed: Math.hypot(n.ball.vx, n.ball.vy) }
          : null,
      };
    },
    menuItemRect: (s, i) => rect(s.screen, i),
  };
}

function input(state: CaromState, api: UpdateApi): CaromState {
  let s = state;
  if (s.muted !== api.audio.muted()) api.audio.setMuted(s.muted);
  if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
  if (s.muted !== api.audio.muted()) s = { ...s, muted: api.audio.muted() };
  const screen = s.screen;
  if (
    (screen === "countdown" || screen === "playing") &&
    api.input.pressed("pause")
  )
    return { ...s, resumeScreen: screen, screen: "paused", menuIndex: 0 };
  if (
    screen === "paused" &&
    (api.input.pressed("pause") || api.input.pressed("back"))
  )
    return { ...s, screen: s.resumeScreen };
  if (screen === "howto" && api.input.pressed("back")) return title(s);
  if (screen === "matchover" && api.input.pressed("back")) return title(s);
  const n = count(screen);
  if (!n) return s;
  const up = api.input.pressed("p1-up") || api.input.pressed("p2-up");
  const down = api.input.pressed("p1-down") || api.input.pressed("p2-down");
  if (up || down)
    s = { ...s, menuIndex: (s.menuIndex + (up ? -1 : 1) + n) % n };
  else if (api.input.pressed("confirm")) return confirm(s);
  const p = api.input.pointer();
  const hovered = Array.from({ length: n }, (_, i) => i).find((i) => {
    const r = rect(screen, i)!;
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  });
  if (hovered !== undefined) {
    s = { ...s, menuIndex: hovered };
    // The runtime preserves the release position. Valid clicks and taps finish
    // over the same item they began on; accepting that release also supports a
    // press and release delivered in separate display frames.
    api.input.pointerPressed();
    if (api.input.pointerReleased()) return confirm(s);
  }
  return s;
}

export function updateCarom(
  current: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = input(copy(current), api);
  s = { ...s, simTime: s.simTime + dt };
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  const leftAxis =
    (api.input.value("p1-down") ||
      (s.mode === "solo" ? api.input.value("p2-down") : 0)) -
    (api.input.value("p1-up") ||
      (s.mode === "solo" ? api.input.value("p2-up") : 0));
  const lp = s.paddles.left;
  const left = move(
    lp,
    lp.driven ? lp.drivenVy : leftAxis * C.PADDLE_SPEED,
    dt,
  );
  const rp = s.paddles.right;
  let rightVy = rp.drivenVy;
  if (!rp.driven) {
    if (s.mode === "versus")
      rightVy =
        (api.input.value("p2-down") - api.input.value("p2-up")) *
        C.PADDLE_SPEED;
    else if (!s.ai.movement) rightVy = 0;
    else {
      let target = C.AI_HOME_Y,
        zone = C.AI_HOME_DEADZONE;
      if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
        target = s.ball.y - s.ball.vy * C.AI_REACT;
        zone = C.AI_DEADZONE;
      }
      const d = target - rp.cy;
      rightVy =
        Math.abs(d) <= zone
          ? 0
          : Math.sign(d) * Math.min(C.AI_SPEED, dt > 0 ? Math.abs(d) / dt : 0);
    }
  }
  s = { ...s, paddles: { left, right: move(rp, rightVy, dt) } };
  if (!s.ball) return s;
  let b: BallState = { ...s.ball, trail: [...s.ball.trail] };
  if (s.screen === "countdown") {
    const holdTimer = b.holdTimer - dt;
    if (holdTimer <= 0) {
      const dir = s.receiver === "left" ? -1 : 1;
      b = {
        ...b,
        holdTimer: 0,
        held: false,
        trail: [],
        vx: dir * C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
        vy: b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
      };
      s = { ...s, screen: "playing" };
    } else b = { ...b, holdTimer };
  } else {
    const result = physics(b, s, dt);
    b = result[0];
    if (result[1].wall) api.audio.play(C.CUES.wallBounce);
    if (result[1].paddle) api.audio.play(C.CUES.paddleHit);
    if (result[1].obstacle) api.audio.play(C.CUES.obstacleBounce);
    const scorer: Side | null =
      b.x - C.BALL_R > C.FIELD_W ? "left" : b.x + C.BALL_R < 0 ? "right" : null;
    if (scorer) {
      api.audio.play(C.CUES.score);
      const score = {
        p1: s.score.p1 + (scorer === "left" ? 1 : 0),
        p2: s.score.p2 + (scorer === "right" ? 1 : 0),
      };
      const won =
        (score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD) ||
        (score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD);
      if (won)
        s = { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 };
      else {
        b = ball();
        s = {
          ...s,
          score,
          receiver: scorer === "left" ? "right" : "left",
          screen: "countdown",
        };
      }
    }
  }
  if (s.screen === "countdown" || s.screen === "playing")
    b = {
      ...b,
      trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
        (p) => p.t >= s.simTime - C.TRAIL_TIME,
      ),
    };
  return { ...s, ball: b };
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function label(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color = "#edfaff",
  align: CanvasTextAlign = "center",
): void {
  ctx.font = `700 ${size}px system-ui,sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}
function field(
  s: DeepReadonly<CaromState>,
  ctx: CanvasRenderingContext2D,
  dim = false,
): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.strokeStyle = "rgba(100,220,255,.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, C.FIELD_W - 40, C.FIELD_H - 40);
  ctx.setLineDash([12, 18]);
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.moveTo(C.NET_X, 32);
  ctx.lineTo(C.NET_X, C.FIELD_H - 32);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const o of s.obstacles) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ffd166";
    ctx.fillStyle = "#ffd166";
    rounded(
      ctx,
      o.cx - C.OBSTACLE_W / 2,
      o.cy - C.OBSTACLE_H / 2,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      10,
    );
  }
  for (const [side, x, color] of [
    ["left", C.P1_X0, "#33e6ff"],
    ["right", C.P2_X0, "#ff4fa3"],
  ] as const) {
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    rounded(
      ctx,
      x,
      s.paddles[side].cy - C.PADDLE_HALF,
      C.PADDLE_W,
      C.PADDLE_H,
      8,
    );
  }
  if (s.ball) {
    s.ball.trail.forEach((p, i) => {
      ctx.globalAlpha = ((i + 1) / s.ball!.trail.length) * 0.4;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, C.BALL_R * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#fff";
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, C.BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  if (s.screen !== "title" && s.screen !== "howto") {
    label(ctx, String(s.score.p1), 530, 70, 54, "#33e6ff");
    label(ctx, String(s.score.p2), 750, 70, 54, "#ff4fa3");
    label(
      ctx,
      s.mode === "solo" ? "SOLO CIRCUIT" : "LOCAL VERSUS",
      C.FIELD_CX,
      48,
      16,
      "#8299aa",
    );
  }
  if (dim) {
    ctx.fillStyle = "rgba(3,9,15,.72)";
    ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  }
}
function menu(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  items: readonly string[],
  selected: number,
): void {
  items.forEach((item, i) => {
    const r = rect(screen, i)!;
    if (i === selected) {
      ctx.fillStyle = "rgba(51,230,255,.16)";
      rounded(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.strokeStyle = "#33e6ff";
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    label(
      ctx,
      item,
      C.FIELD_CX,
      r.y + r.h / 2,
      23,
      i === selected ? "#fff" : "#7890a0",
    );
  });
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>) {
    for (const name of C.ACTIONS)
      api.input.register(name, { keys: [...C.BINDINGS[name]] });
    api.audio.define(C.CUES.paddleHit, {
      wave: "square",
      freq: 260,
      freqTo: 520,
      gain: 0.16,
      durationMs: 70,
    });
    api.audio.define(C.CUES.wallBounce, {
      wave: "triangle",
      freq: 190,
      gain: 0.12,
      durationMs: 55,
    });
    api.audio.define(C.CUES.obstacleBounce, {
      freq: 720,
      freqTo: 430,
      gain: 0.14,
      durationMs: 85,
    });
    api.audio.define(C.CUES.score, {
      wave: "sawtooth",
      freq: 320,
      freqTo: 760,
      gain: 0.12,
      durationMs: 190,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score", (s) => `${s.score.p1}-${s.score.p2}`);
    api.diagnostics.register("ball", (s) =>
      s.ball
        ? `${s.ball.x.toFixed(1)},${s.ball.y.toFixed(1)} v ${s.ball.vx.toFixed(1)},${s.ball.vy.toFixed(1)} speed ${Math.hypot(s.ball.vx, s.ball.vy).toFixed(1)} spin ${s.ball.spin.toFixed(1)}`
        : "absent",
    );
    api.diagnostics.register(
      "paddles",
      (s) =>
        `L ${s.paddles.left.cy.toFixed(1)} @ ${s.paddles.left.vy.toFixed(1)} | R ${s.paddles.right.cy.toFixed(1)} @ ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [initial(false), debug()];
  },
  update: updateCarom,
  render(s, api: RenderApi) {
    const ctx = api.ctx;
    if (s.screen === "title") {
      field(s, ctx, true);
      label(ctx, C.TITLE_TEXT, C.FIELD_CX, 205, 106);
      label(ctx, "SPIN  •  BANK  •  BREAK", C.FIELD_CX, 286, 17, "#33e6ff");
      menu(ctx, "title", C.TITLE_ITEMS, s.menuIndex);
      label(
        ctx,
        "W/S or ↑/↓  •  ENTER to select  •  M to mute",
        C.FIELD_CX,
        652,
        15,
        "#5e7686",
      );
    } else if (s.screen === "howto") {
      field(s, ctx, true);
      label(ctx, "HOW TO PLAY", C.FIELD_CX, 105, 48);
      label(
        ctx,
        "SOLO: W/S or arrows     VERSUS: W/S + arrows",
        C.FIELD_CX,
        215,
        22,
        "#a9c0cf",
      );
      label(
        ctx,
        "Move as you strike to bend the ball with spin.",
        C.FIELD_CX,
        292,
        27,
        "#33e6ff",
      );
      label(
        ctx,
        "Bank off the central bars to wrong-foot your rival.",
        C.FIELD_CX,
        346,
        21,
        "#ffd166",
      );
      label(
        ctx,
        "First to 11, win by 2.  P / ESC pauses.  M mutes.",
        C.FIELD_CX,
        414,
        20,
        "#a9c0cf",
      );
      menu(ctx, "howto", ["BACK TO MENU"], s.menuIndex);
    } else {
      field(s, ctx, s.screen === "paused" || s.screen === "matchover");
      if (s.screen === "countdown" && s.ball) {
        label(
          ctx,
          s.ball.holdTimer > 0.66 ? "3" : s.ball.holdTimer > 0.33 ? "2" : "1",
          C.FIELD_CX,
          C.FIELD_CY,
          78,
        );
        label(ctx, "GET READY", C.FIELD_CX, C.FIELD_CY + 76, 17, "#8ea5b4");
      }
      if (s.screen === "paused") {
        label(ctx, "PAUSED", C.FIELD_CX, 265, 54);
        menu(ctx, "paused", C.PAUSE_ITEMS, s.menuIndex);
      }
      if (s.screen === "matchover") {
        label(
          ctx,
          s.winner === "left"
            ? "PLAYER ONE WINS"
            : s.mode === "solo"
              ? "THE CIRCUIT WINS"
              : "PLAYER TWO WINS",
          C.FIELD_CX,
          242,
          48,
          s.winner === "left" ? "#33e6ff" : "#ff4fa3",
        );
        label(ctx, `${s.score.p1} — ${s.score.p2}`, C.FIELD_CX, 316, 32);
        menu(ctx, "matchover", C.MATCHOVER_ITEMS, s.menuIndex);
      }
    }
    if (s.muted)
      label(ctx, "MUTED", C.FIELD_W - 28, 28, 13, "#6f8492", "right");
  },
};
