import { describe, expect, it, vi } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_W,
  HOLD_TIME,
  SERVE_SPEED,
} from "./constants";
import { game, updateCarom, type CaromDebugApi, type CaromState } from "./game";

function setup(): [CaromState, ReturnType<typeof makeApi>, CaromDebugApi] {
  const registered: string[] = [];
  const init = {
    input: {
      register: (name: string) => registered.push(name),
      layout: () => null,
    },
    audio: { define: vi.fn(), load: vi.fn() },
    diagnostics: { register: vi.fn() },
  } as unknown as InitApi<CaromState>;
  const result = game.initialize(init) as [CaromState, CaromDebugApi];
  expect(registered).toHaveLength(8);
  return [result[0], makeApi(), result[1]];
}

function makeApi() {
  const values = new Map<string, number>();
  const edges = new Set<string>();
  let muted = false;
  const played: string[] = [];
  const api = {
    input: {
      value: (name: string) => values.get(name) ?? 0,
      pressed: (name: string) => edges.delete(name),
      pointer: () => ({
        x: -1,
        y: -1,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      pointerSamples: () => [],
      pointerContacts: () => [],
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play: (cue: string) => played.push(cue),
      loop: vi.fn(),
      stop: vi.fn(),
      looping: () => false,
      setMuted: (value: boolean) => {
        muted = value;
      },
      muted: () => muted,
    },
    frame: () => ({ count: 0, timeMs: 0, lastDeltaMs: 0 }),
    viewport: vi.fn(),
  } as unknown as UpdateApi;
  return { api, values, edges, played };
}

describe("Carom simulation", () => {
  it("initializes the complete title world and debug surface", () => {
    const [state, , debug] = setup();
    const shot = debug.snapshot(state);
    expect(state.screen).toBe("title");
    expect(state.ball).toMatchObject({
      x: FIELD_CX,
      y: FIELD_CY,
      holdTimer: HOLD_TIME,
      held: true,
    });
    expect(shot).toMatchObject({ version: 1 });
    expect(shot.ball?.speed).toBe(0);
    expect(shot.obstacles).toHaveLength(2);
  });

  it("serves toward the receiver after the hold without advancing immediately", () => {
    const [base, controls, debug] = setup();
    let state = debug.setBallServeSign(debug.setScreen(base, "countdown"), 1);
    state = updateCarom(state, controls.api, HOLD_TIME);
    expect(state.screen).toBe("playing");
    expect(state.ball).toMatchObject({ x: FIELD_CX, y: FIELD_CY, held: false });
    expect(Math.hypot(state.ball!.vx, state.ball!.vy)).toBeCloseTo(SERVE_SPEED);
    expect(state.ball!.vx).toBeLessThan(0);
  });

  it("scores, parks a fresh ball, and targets the player scored on", () => {
    const [base, controls, debug] = setup();
    let state = debug.setScreen(base, "playing");
    state = debug.setBallHeld(state, false);
    state = debug.setBallPosition(state, FIELD_W + BALL_R + 1, FIELD_CY);
    state = debug.setBallVelocity(state, 1, 0);
    state = updateCarom(state, controls.api, 0);
    expect(state.score.p1).toBe(1);
    expect(state.receiver).toBe("right");
    expect(state.screen).toBe("countdown");
    expect(state.ball).toMatchObject({ held: true, x: FIELD_CX, y: FIELD_CY });
  });

  it("moves a driven paddle, clamps it, and curves a spinning ball", () => {
    const [base, controls, debug] = setup();
    let state = debug.setScreen(base, "playing");
    state = debug.setPaddleDriven(state, "left", true);
    state = debug.setPaddleVy(state, "left", -1000);
    state = debug.setBallHeld(state, false);
    state = debug.setBallVelocity(state, 500, 0);
    state = debug.setBallSpin(state, 500);
    state = updateCarom(state, controls.api, 0.1);
    expect(state.paddles.left.cy).toBe(260);
    expect(state.ball!.vy).toBeGreaterThan(0);
    state = updateCarom(state, controls.api, 1);
    expect(state.paddles.left.cy).toBe(55);
    expect(state.paddles.left.vy).toBeGreaterThan(-1000);
  });
});
