# Motion

`src/core/sim/motion.ts`. Each body is always in one of five states, and between events its path has an exact formula.

| State | Meaning |
|---|---|
| `sliding` | The contact point is slipping on the cloth |
| `rolling` | No slip: spin matches speed |
| `spinning` | Stopped, but still turning about the vertical |
| `stationary` | At rest |
| `pocketed` | Out of play |

## Slip

For a ball of radius `R`, velocity `v` and spin `ω`, the contact point slips at:

```text
u = ( vx − R·ωy,  vy + R·ωx )
```

A ball rolls exactly when `u` is zero.

## Sliding

Friction acts against the slip direction `û`, with `a = μs·g`:

```text
v(t)   = v₀ − a·û·t
p(t)   = p₀ + v₀·t − ½·a·û·t²
ω̇      = 5a / (2R), rotated from û
```

Both the linear and angular parts reduce the slip, so it falls at `3.5·μs·g`. Sliding ends after:

```text
t = |u| / (3.5·μs·g)
```

Because `û` stays fixed throughout, a sliding ball follows a parabola. That is how spin curves a path.

## Rolling

The ball decelerates in a straight line with `a = μr·g`, stopping after `t = |v| / (μr·g)`. At each step, spin is set from speed so the no-slip condition holds exactly.

## Spin about the vertical

Sidespin decays at a constant rate in every moving state, at `kz = 5·μsp·g / (2R)`, independently of the other motion. A ball that stops rolling with spin left goes to `spinning`, and then to `stationary`.

## After an impact

`reclassify` works out a body's new state from its velocities. If there is effectively no slip, it snaps the spin to exact rolling, so numerical noise does not create a false sliding phase.
