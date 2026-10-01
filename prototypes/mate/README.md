# Mate — control room prototype

A conceptual internal tool: you stand in the wheelhouse of a boat, look around, and sit down at a CRT console to steer a project through **testing → dogfooding → public beta → launch** with your mate (the agent).

- The CRT shows the voyage (stages, gates, log) and a chat with the mate.
- The ten physical buttons around the screen are every answer the mate can ever ask for. They are always there and light up only when the mate needs that input.
- Free text in the chat works too; if it reads like a lit button, it presses it.

## Run it

It is a single self-contained file. three.js loads from a CDN, so there is no build step.

```sh
# from the repo root
python3 -m http.server 8123
# then open http://localhost:8123/prototypes/mate/
```

Opening `index.html` directly from the filesystem also works in most browsers.

## Controls

| Action | Input |
| --- | --- |
| Look around | drag |
| Sit down at the console | click the console, `Space`, or the SIT DOWN button |
| Stand up | `Esc` or STAND UP |
| Answer the mate | click a lit button, or type in the chat |
| Lean while seated | drag |

Nothing is persisted; reload to restart the voyage. The scenario is scripted in `voyage()` inside `index.html`.
