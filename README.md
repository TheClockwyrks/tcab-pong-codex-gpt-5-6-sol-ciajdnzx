# Carom

Carom is a browser-native top-down paddle duel. Curve shots with paddle motion, ricochet the ball around two central blockers, and win the first-to-11 match by two points. Play against the reactive computer or share the keyboard for local versus play.

## Run it

Requires a current Node.js release.

```sh
npm ci
npm run dev
```

Vite prints the local development URL. To make the self-contained static site:

```sh
npm run build
```

The deployable site is written to `dist/`. `npm run preview` serves that build locally.

## Controls

- Solo: move with `W` / `S` or the arrow keys.
- Versus: player one uses `W` / `S`; player two uses `↑` / `↓`.
- Menus: either movement pair changes selection; `Enter` or `Space` confirms.
- `P` or `Escape` pauses and resumes. `M` toggles sound.
- Menus also support mouse and touch.

Move a paddle as it contacts the ball to add spin. The top and bottom walls and both gold obstacles support bank shots; the side edges are goals.

## Quality checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`.
