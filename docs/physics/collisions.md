# Collisions

`src/core/sim/collisions.ts`.

## Ball to ball

Along the line of centres `n`, with closing speed `vn` and reduced mass `m* = m₁m₂/(m₁+m₂)`:

```text
Jn = m* · ( vn + max(e·vn, MIN_SEPARATION) )
```

Tangentially, Coulomb friction acts against the slip of the two surfaces at the contact, capped so they cannot slip past sticking:

```text
Jt = min( μ·Jn,  |slip| / ((1/m₁ + 1/m₂)·|t_h|² + R₁²/I₁ + R₂²/I₂) )
```

`t_h` is the horizontal part of the slip direction. This friction is what produces **throw**: the object ball leaves a few degrees off the line of centres, towards the direction the cue ball was moving. It is why the Cut readout, which uses the geometric line of centres, can differ slightly from where the ball actually goes.

**The slip keeps its vertical part.** Topspin or backspin makes the two surfaces slip up or down past each other. That takes a share of the friction, so a rolling cue ball throws far less than a stun shot. The balls stay on the cloth, so only the horizontal part of the impulse changes their velocity; all of it changes their spin.

**Friction falls with speed.** Cue games set `ballBall.frictionCurve`, Alciatore's fit to measured throw (TP A.14 / A.28):

```text
μ = 0.00995 + 0.108 · exp(-1.088 · |slip|)
```

For a half-ball stun cut this gives about 4.8° of throw at 0.3 m/s and 1.8° at 3 m/s. A rolling cue ball throws about a third as much. Without a curve, the constant `ballBall.friction` is used.

**Discs** set `ballBall.planar`: their "roll" is only bookkeeping (see below), so friction there stays in the table plane.

## The separation floor

`MIN_SEPARATION` is 1 mm/s. Every contact must leave the pair separating at least that fast. Without it, a near-zero closing speed produces a velocity too small to register, and the same contact fires forever. It is the reason shots can no longer stall at the event cap.

## Cushion: Mathavan model

Used by cue games. Based on Mathavan, Jackson & Parkin (2010). The cushion nose touches the ball **above its equator**, at `contactHeight` times the radius (7/5 for snooker, 1.27 for pool), so the impact also presses the ball into the cloth.

The impact is integrated in 120 small normal-impulse steps through the compression phase. At each step:

1. Work out the slip at the cushion contact and at the cloth contact.
2. Apply Coulomb friction against each slip.
3. Have the cloth reaction balance the downward push of the cushion, so the ball stays on the table.

Compression ends when the ball stops moving into the cushion. Restitution then continues until its work reaches `e²` times the compression work.

Forces are applied as vectors at their contact points, rather than through the paper's expanded component equations.

**What this gives you:** rebound angles depend on spin and on the approach, running side widens the angle, and check side narrows it.

**The coefficient.** `cushion.restitution` here is the energetic `e`. The measured head-on rebound ratio on a snooker table is 0.818 (Mathavan, Jackson & Parkin 2009). The paper's `e = 0.98` gives too lively a rebound in this implementation, so snooker uses 0.88, calibrated to a head-on rebound of about 0.825. The tests hold it between 0.78 and 0.86.

**Hard impacts.** The paper treats the cushion as rigid, which it says holds below about 2.5 m/s of normal speed; beyond that the rubber deforms and loses more energy. `cushion.falloff` lowers `e` by `perMps` for each m/s above `above`, down to `min`. The cue games use 0.04 per m/s above 2.5 m/s, with a floor of 0.7. That slope is an **estimate**: no published curve was found to calibrate it against.

## Cushion: impulse model

Used by disc games, and by the Mathavan path for extremely slow contacts. A single normal impulse with restitution, then Coulomb friction at the contact point, with a torque if the contact is off the equator.

```text
Jn = m · ( vn + max(e·vn, MIN_SEPARATION) )
```

Disc games use `contactHeight` of 1, meaning contact at the disc's centre height.

## Discs are modelled as spheres

Collision inertia uses the solid-sphere value `0.4·m·R²` for every body, including flat discs. For discs, the "rolling" state is a modelling device: sliding and rolling friction are set equal, so a disc slows at the same rate in either state. In 3D a disc only turns about the vertical.
