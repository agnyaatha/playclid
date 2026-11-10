# Collisions

`src/core/sim/collisions.ts`.

## Ball to ball

Along the line of centres `n`, with closing speed `vn` and reduced mass `m* = m₁m₂/(m₁+m₂)`:

```text
Jn = m* · ( vn + max(e·vn, MIN_SEPARATION) )
```

Tangentially, Coulomb friction acts in the table plane, capped so the surfaces cannot slip past sticking:

```text
Jt = min( μ·Jn,  |slip| / (3.5·(1/m₁ + 1/m₂)) )
```

This friction is what produces **throw**: the object ball leaves a few degrees off the line of centres, towards the direction the cue ball was moving. It is why the Cut readout, which uses the geometric line of centres, can differ slightly from where the ball actually goes.

## The separation floor

`MIN_SEPARATION` is 1 mm/s. Every contact must leave the pair separating at least that fast. Without it, a near-zero closing speed produces a velocity too small to register, and the same contact fires forever. It is the reason shots can no longer stall at the event cap.

## Cushion: Mathavan model

Used by cue games. Based on Mathavan, Jackson & Parkin (2010). The cushion nose touches the ball **above its equator**, at `contactHeight` of 7/5 radius, so the impact also presses the ball into the cloth.

The impact is integrated in 120 small normal-impulse steps through the compression phase. At each step:

1. Work out the slip at the cushion contact and at the cloth contact.
2. Apply Coulomb friction against each slip.
3. Have the cloth reaction balance the downward push of the cushion, so the ball stays on the table.

Compression ends when the ball stops moving into the cushion. Restitution then continues until its work reaches `e²` times the compression work.

Forces are applied as vectors at their contact points, rather than through the paper's expanded component equations.

**What this gives you:** rebound angles depend on spin and on the approach, running side widens the angle, and check side narrows it.

**The coefficient.** `cushion.restitution` here is the energetic `e`. The measured head-on rebound ratio on a snooker table is 0.818 (Mathavan, Jackson & Parkin 2009). The paper's `e = 0.98` gives too lively a rebound in this implementation, so snooker uses 0.88, calibrated to a head-on rebound of about 0.825. The tests hold it between 0.78 and 0.86.

## Cushion: impulse model

Used by disc games, and by the Mathavan path for extremely slow contacts. A single normal impulse with restitution, then Coulomb friction at the contact point, with a torque if the contact is off the equator.

```text
Jn = m · ( vn + max(e·vn, MIN_SEPARATION) )
```

Disc games use `contactHeight` of 1, meaning contact at the disc's centre height.

## Discs are modelled as spheres

Collision inertia uses the solid-sphere value `0.4·m·R²` for every body, including flat discs. For discs, the "rolling" state is a modelling device: sliding and rolling friction are set equal, so a disc slows at the same rate in either state. In 3D a disc only turns about the vertical.
