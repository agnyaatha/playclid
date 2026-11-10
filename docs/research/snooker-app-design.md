# Building a Snooker Teaching App: How Cue-Sport Simulators and Training Apps Are Built

The best-supported approach is an event-based physics engine in pure TypeScript, kept separate from React and the rendering code. It should model each ball's sliding, rolling and spinning phases with closed-form equations (Leckie & Greenspan), resolve cushion impacts with the Mathavan model, and use snooker-specific parameters. A 2D canvas view and a Three.js 3D view then both draw from the same recorded shot data.

## TL;DR
- **Physics:** use the established model. Balls slide until friction makes them roll, spin decays linearly, cushions are modelled with Mathavan et al. (2010), and balls collide with a little friction ("throw"). Run it event by event, as pooltool (Apache-2.0) and tailuge/billiards (GPL-3.0, TypeScript + three.js) do.
- **Architecture:** a headless engine module (Web Worker-friendly, deterministic, unit-tested against the 90° and 30° rules). The 2D canvas and 3D Three.js views replay its event log, and the per-frame data never passes through React state.
- **Teaching:** copy the structure of real training apps (drill libraries, scored attempts, progress dashboards, difficulty levels). Aim aids should start on and fade out, because motor-learning research suggests heavy guidance can become a crutch. That evidence is contested: McKay et al.'s 2022 meta-analysis (Psychology of Sport and Exercise) concluded that "robust evidence regarding feedback frequency and motor learning is lacking."

## 1. Physics of cue-sports simulation

### 1.1 Ball–cloth motion: four states
- **States:** a ball on the cloth is always stationary, spinning in place, sliding or rolling. Airborne is a fifth state for jumps. Each state has its own closed-form equations, according to Evan Kiefl's pooltool physics write-up.\[1\]
- **Rolling:** the contact point has zero velocity relative to the cloth. Speed falls linearly, v(t) = v₀ − μᵣ g t. Sidespin (ω_z) is decoupled and does not curve a rolling ball.\[1\]
- **Sliding:** the contact-point slip velocity shrinks linearly at a rate of (7/2) μₛ g until it reaches zero.\[1\] The ball then rolls. Friction acts against the slip, which produces stun, draw and follow, and curved paths when there is masse-type spin.
- **Spinning in place:** ω_z decays at 5 μₛₚ g / (2R). This "spinning friction" term is a fudge factor standing in for the real contact patch, as Kiefl openly says.\[1\]
- **Swerve:** a curved path needs spin about the direction of travel, which comes from an elevated cue. Plain sidespin with a level cue still gives a straight line once the ball is rolling.\[1\]

### 1.2 Cue strike: squirt, swerve, throw
- **Squirt (cue-ball deflection):** the ball leaves at an angle away from the cue line when struck off-centre. Per Alciatore, the angle is close to linear in tip offset and depends on the shaft's effective "endmass". It does not depend on ball speed.\[2\]\[3\]
- **Swerve:** the curve from sidespin plus cue elevation. It increases with elevation and varies with speed and cloth. Squirt and swerve together are "squerve", and with the right speed and elevation the two can cancel out.\[4\]
- **Throw:** the object ball is pushed off the line of centres by friction between the balls. Cut-induced throw (CIT) comes from the cut angle, and spin-induced throw (SIT) comes from sidespin.\[4\]\[5\]
- **Tip contact:** treat the tip offset as a point on the cue-ball face. Clamp it to about 0.5R, beyond which Alciatore says miscues become likely. Model the strike as an impulse with tip–ball friction around 0.6 and tip restitution around 0.71–0.75 for leather tips.\[6\]

### 1.3 Ball–ball collisions
- **Baseline:** an instantaneous collision between equal masses. The normal components of velocity exchange according to the restitution value.
- **Realism:** add ball–ball friction, which produces throw. Alciatore's worked example uses e = 0.94 and μ = 0.06 for a half-ball hit. The departure angle between the balls then shrinks from 90° to about 83.3°: inelasticity takes off about 3.0° on the cue-ball side and friction about 3.4° on the object-ball side.\[7\]
- **What the Alciatore model shows:** only inelasticity changes the cue ball's direction on a stun shot. Friction or throw changes only the object ball's direction.\[8\]

### 1.4 Cushion collisions and the cushion-height effect
- **Height:** the cushion nose touches the ball above its equator, at h = 7R/5 in both snooker and pool. This stops balls jumping and links spin to rebound behaviour.\[9\]\[10\]
- **Mathavan et al. 2010 (Proc. IMechE C):** a 3D impulse-with-friction model solved numerically through compression and restitution phases. It gives a ball–cushion coefficient of restitution (COR) of about 0.98 and sliding friction of about 0.14. The rigid-cushion assumption holds below about 2.5 m/s normal speed.\[9\]\[11\]
- **Effect of spin:** running side shortens the rebound angle and check side widens it, as tailuge's write-up on browser games that "feel wrong" explains.\[12\]
- **Simpler alternatives:** Han (2005) and Marlow (1994). Kiefl initially avoided Mathavan because of the cost of solving it numerically, but pooltool later fixed its numerical stability and made it the default.\[1\]\[13\]
- **Measured snooker rebound:** Mathavan, Jackson & Parkin (Am. J. Phys. 2009) measured an overall cushion COR of 0.818 on a 10 ft Riley table.\[14\] That is a different quantity from the 0.98 model parameter. Calibrate the rebound speed you actually see against about 0.8.

### 1.5 Typical parameter values

| Parameter | Snooker value | Source / note |
|---|---|---|
| Ball diameter | 52.5 mm ± 0.05 | WPBSA rules |
| Ball mass | ≈ 0.1406 kg (≈ 142 g) | Mathavan 2010; retailers quote 142 g. WPBSA sets only a 3 g max spread |
| Moment of inertia | 2/5 mR² | solid sphere |
| Sliding friction μₛ | 0.178–0.245 (avg ≈ 0.212) | Mathavan, snooker cloth |
| Rolling resistance μᵣ | 0.0127–0.0129 | Mathavan AJP 2009 (pool range 0.005–0.015) |
| Spin deceleration | 5–15 rad/s² | Alciatore (pool) |
| Ball–ball μ / e | 0.03–0.08 / 0.92–0.98 | Alciatore |
| Cushion contact height | 7R/5; ≈ 36 mm | Mathavan |
| Cushion e / μ | 0.98 / 0.14 (model); 0.818 measured rebound | Mathavan 2010 / 2009 |
| Tip–ball μ | ≈ 0.6 | Alciatore |

### 1.6 Integration: fixed timestep vs event-based
- **Fixed step:** advance by small dt, then detect and resolve overlaps. This is simple but suffers from tunnelling, energy drift, and results that depend on frame rate.\[15\]
- **Event-based (Leckie & Greenspan 2005–06):** the motion equations have closed forms, so the engine computes the exact time of every possible next event. Candidate events are ball–ball, ball–cushion, ball–pocket and state transitions such as slide→roll. It jumps to the earliest one, resolves it, and repeats.\[16\]\[17\]
- **Collision timing:** working out when two balls collide means solving a quartic polynomial.\[18\]
- **Why billiards suits it:** there is no tunnelling, accuracy is exact between events, and it is fast enough for AI search that simulates thousands of shots. Leckie and Greenspan built it for game-tree search and robotic pool.\[19\]
- **Determinism:** use a single event loop and seeded randomness for AI noise. Avoid frame-dependent dt. Break ties when events happen at the same moment in a set order.
- **The opening break needs a convention:** Avner Kantor's 2026 paper "One Shot, Twenty-One Balls" (arXiv:2607.12995) notes that the standard snooker opening position, "taken literally, does not even define a dynamical system", because the touching balls collide at the same instant. The paper's fix is to spread the reds by ε = 0.5 mm so every gap is positive. Do the same, or define a fixed resolution order.

### 1.7 Open-source simulators worth studying
- **tailuge/billiards:** TypeScript + three.js, played from behind the cue ball. It includes snooker, nine-ball and three-cushion rules, an Alciatore-based ball collision model with throw, Mathavan and Stronge cushion models, and break recording and replay. Licence is GPL-3.0.\[20\]
- **ekiefl/pooltool:** a Python package (JOSS 2024) with event-based evolution, swappable physics models, a Panda3D 3D interface, and numba JIT compilation. Its v0.3.3 release notes on Zenodo (May 2024) record the licence change: "This release marks the end of GPLv3 and the start of Apache 2.0."
- **jzitelli/PoolPhysics:** a Python event-based simulator implementing Leckie & Greenspan, split out of poolvr.\[21\]
- **Others:** FooBillard++ and GNU "Billiards" (Lua scripting) are full 3D games. 1j01/pool and manan30/billiards (react-three-fiber with a toy physics engine) are small web demos.\[22\]\[23\]
- **Lesson from a snooker fork:** the XTH-LOVE/snooker fork notes that upstream's default table is 9 ft pool proportions, "a pool table wearing snooker rules".\[24\] Set real 12 ft proportions from the start.

## 2. Graphics and rendering

### 2.1 Scene
- **Proven stack:** three.js/WebGL, as used by tailuge. Panda3D in pooltool shows the same split between physics and the view.
- **Balls:** spheres with PBR materials. Rotate the mesh using the simulated angular velocity, so spin is visible on the ball.
- **Cloth and table:** a flat plane with a fine normal or roughness texture. Cushions are extruded profiles and pockets are modelled jaws.
- **Lighting:** a rectangular overhead light in the snooker style. Bake shadows for static parts and use a single dynamic shadow, or a cheap blob shadow under each ball.

### 2.2 Cameras and overlays
- **POV camera:** placed behind the cue ball on the aim line, with adjustable height and pitch. Animate it to an overhead view while balls roll.
- **2D view:** an orthographic top-down projection of the same state, drawn on Canvas2D or with an orthographic three.js camera.
- **Overlays:** an aim line, a ghost-ball circle at the contact point, the object ball's predicted direction, and the cue ball's tangent line.
- **Prediction lines:** these come from running the real engine on a scratch copy of the table, which is cheap with event-based simulation. You can therefore show the 90° and 30° reference lines and fade them out.

### 2.3 Performance
- **Fixed-step loop:** the classic model is Gaffer on Games' accumulator loop. Physics runs at a fixed rate and rendering interpolates between the previous and current states (alpha = accumulator/dt).\[25\]
- **With event-based physics:** simulate the whole shot up front, then evaluate the closed-form trajectory at any render time t. That gives interpolation-free, frame-rate-independent playback.
- **Web Workers:** run the AI and prediction in a Worker. tailuge's official README says its engine "performs ~500 rollouts/sec on 4 CPU cores in pure TypeScript, scaling across worker threads", in Web Workers or Node.
- **OffscreenCanvas:** Three.js can render inside a worker through `transferControlToOffscreen()`, according to the three.js manual and web.dev.\[26\]\[27\] Pointer and orbit-control events must then be proxied to the worker.\[28\]
- **React:** never call `setState` per frame. The react-three-fiber docs say to mutate refs inside `useFrame`, reuse vectors, and share geometries and materials, because creating three.js objects is expensive.\[29\]\[30\]
- **Mobile:** limit device pixel ratio, use one shadow-casting light, use instancing for the reds, and pause rendering when nothing is moving (r3f `frameloop="demand"`).\[31\]

### 2.4 react-three-fiber vs imperative Three.js
- **r3f:** declarative scene graph, the drei helpers, and easy React UI overlays. The cost is discipline: per-frame updates must bypass React, and each Canvas has its own reconciler.
- **Imperative three.js in a `useEffect`-owned class:** you control the loop completely, porting to an OffscreenCanvas worker is easy, and React only receives coarse events such as "shot ended".
- **Recommendation:** use r3f for the 3D view if the team knows React well. Keep table and ball updates imperative through refs, driven from the engine's playback clock.

## 3. Input and UX
- **Common mobile pattern (8 Ball Pool-style, from secondary reviews):**
  - drag to rotate the cue around the cue ball;
  - a fine-tune dial or nudge buttons for precise aim;
  - a vertical power slider on the side, pulled and released to shoot;
  - a small cue-ball icon you tap to set the spin contact point;
  - a trajectory guide line.\[32\]\[33\]\[34\]\[35\]
- **tailuge supports** keyboard, mouse and smartphone input on a view behind the cue ball.\[20\]\[36\]
- **For beginners:**
  - separate aim, then spin, then power into steps, each with large touch targets of 48 px or more;\[32\]
  - add an elevation slider only in advanced lessons;
  - show the spin dot on a large cue-ball face with a ring marking the miscue limit at about 0.5R;
  - provide undo and replay for practice shots.

## 4. Tutorial and learning design

### 4.1 What real apps do
- **DrillRoom (pool, iOS):** uses the camera to track drills grouped into speed control, shotmaking and position play. It gives real-time audio feedback and has a progress dashboard and a custom drill editor that can capture layouts with live detection.\[37\]\[38\]\[39\]\[40\]\[41\] It also offers challenges such as the Billiard University Exam I skills assessment.\[42\]\[43\]
- **Snooker Coach 147:** projects practice routines onto the real table with augmented reality (AR) and logs results day by day.\[44\]
- **Cuestars Snooker Academy:** seven levels, each with standard drills for players breaking under 50 and advanced drills for those over 50, led by a World Snooker-qualified coach.\[45\]
- **SnookerSync and Snooker Practice Tracker:** more than 40 drills including the line-up, clearing the colours, long blues and the T-drill. They track pot success rate, streaks, highest break and completion rate.\[46\]\[47\]\[48\]
- **Open-source Snooker-Practise-App:** scores each attempt by the drill's own metric (break points, balls in a row, or pots out of N). It records cue-ball-position drills without scoring them, which is a good data model to copy.\[49\]

### 4.2 Beginner curriculum (snooker coaching conventions)
1. **Straight pots and stun:** the cue ball stops dead or "stuns" on a straight shot, and the 90° rule applies on cut stun shots.\[50\]
2. **Ghost-ball aiming and cut angles:** a half-ball hit gives about a 30° cut.\[51\]
3. **Follow and draw:** the 30° rule covers rolling cue balls between a ¼-ball and ¾-ball hit. The trisect system covers draw shots.\[50\]\[52\]
4. **Speed control:** lag and weight drills.
5. **Position play:** blacks off the spot, then the colours clearance (yellow→black).
6. **Line-up:** reds in a line with the colours on their spots, scored by break.
7. **Safety and escaping snookers.**
8. **Sidespin, throw, squirt:** advanced material.

### 4.3 Learning science and feedback design
- **Guidance hypothesis:** Salmoni et al. 1984 and Winstein & Schmidt 1990 found that feedback on every trial helps practice performance but can hurt retention. Faded feedback schedules helped retention in those studies.\[53\]\[54\]
- **Caveat:** McKay, Hussien, Vinh, Mir-Orefice, Brooks & Ste-Marie (2022, Psychology of Sport and Exercise 61:102165) pooled 75 effects from 61 papers (N = 2,228). They concluded that "the guidance hypothesis is not supported by the extant research" and that the studies "appear to be severely underpowered." Wulf's work found that frequent feedback can help when it directs attention externally.\[55\]
- **Practical upshot:**
  - fade aim lines and prediction lines across a lesson;
  - add "no-aid" test attempts to measure retention;
  - give immediate post-shot replays that overlay the intended and actual paths;
  - track results and do not assume fading works for every learner.

### 4.4 AI opponents
- **PickPocket (Smith, AAAI 2006; Artificial Intelligence 2007):** won the computational 8-ball tournaments at the 10th and 11th Computer Olympiads. It generates shots class by class, starting with straight-in pots and moving on to banks and combinations. It precomputes shot-difficulty tables of 30×30×30×30 entries, filling each entry by simulating the shot s = 200 times in the poolfiz simulator. It then runs Monte Carlo search with num_samples = 15 per shot (Smith, Artificial Intelligence 171, 2007).
- **Others:** CueCard, JPool and Leckie & Greenspan's Monte Carlo game-tree work use the same pattern of generator, noise sampling and evaluation function.\[56\]\[57\]
- **Snooker version:**
  - enumerate legal pots on the ball on;
  - add perturbations to angle and power that match the skill level;
  - simulate each candidate;
  - score by pot probability, the value of the cue ball's next position, and a safety fallback.

## 5. Snooker reference data (WPBSA Official Rules, May 2022)
- **Playing area:** 3569 × 1778 mm (11 ft 8½ in × 5 ft 10 in), ± 13 mm.\[58\]
- **Table height:** 864 mm ± 13 mm, floor to cushion rail top.\[58\]
- **Baulk line:** 737 mm (29 in) from the bottom cushion face. **D:** a semicircle of radius 292 mm (11½ in) centred on the baulk line.\[58\]
- **Spots:**
  - Yellow is at the right corner of the D and Green at the left, viewed from baulk. Brown is mid-baulk-line.
  - Blue is at the table centre.
  - Pink is midway between Blue and the top cushion.
  - Black is 324 mm (12¾ in) from the top cushion.\[58\]
- **Reds:** a tight triangle with the apex as close to the Pink as possible without touching it, and the base parallel to the top cushion.\[58\]
- **Balls:** 15 reds plus six colours plus the white. Each is 52.5 mm ± 0.05 mm, with no more than 3 g difference between the heaviest and lightest in a set. **Cue:** at least 914 mm long.\[58\]
- **Pockets:** openings must match the WPBSA's proprietary templates, and the rules give no widths. Forum-reported working values are about 89 mm (3.5 in) for corners and about 102 mm (4 in) for middles at the cushion nose, narrower at the fall.\[59\]\[60\] These are unofficial, so make them configurable.
- **Scoring:** a red is worth 1. Yellow 2, Green 3, Brown 4, Blue 5, Pink 6, Black 7. Players pot reds and colours alternately, with colours re-spotted, then clear the colours in ascending order.\[58\]
- **Re-spotting rules:** if a colour's own spot is occupied, it goes on the highest-value free spot. If all spots are occupied, it goes as near its own spot as possible towards the top cushion.\[58\]
- **Fouls:** a minimum of 4 points, or the value of the ball on or the ball concerned if higher, up to 7. Examples are missing all balls, potting the white, hitting a ball not on first, potting a ball not on, a push stroke or a jump shot.\[58\]
- **After a foul:** the opponent may ask the offender to play again. A free ball is awarded if the player is snookered after a foul. Foul-and-a-miss applies, and a Black-only finish ends the frame with a re-spotted Black if the scores are tied.\[58\]

## 6. Practical build guidance

### 6.1 Architecture
```
src/
  engine/        # pure TS, no DOM: vec3, ball state, events, models, solver
    models/      # cloth.ts, ballBall.ts, cushion.ts, cueStrike.ts, pocket.ts
    simulate.ts  # event loop -> ShotResult {events[], trajectories}
  rules/         # snooker.ts: ball on, fouls, scoring, re-spot
  ai/            # shot generation, Monte Carlo evaluation (Worker)
  views/2d/      # Canvas2D renderer
  views/3d/      # three.js / r3f renderer, cameras, overlays
  lessons/       # JSON lesson/drill definitions, scoring metrics
  ui/            # React components + SCSS modules
  workers/       # engine.worker.ts (Comlink-style API)
```
- **Ball state:** {id, r: Vec3, v: Vec3, ω: Vec3, motionState, t0}. Store it in a struct-of-arrays Float64Array for speed and easy transfer to workers.
- **Engine output:** an ordered event log, which serves replays, rules adjudication (first contact, pots, cushions) and feedback ("you hit 3 mm thick").

### 6.2 Physics test suite
- **Straight stun shot:** the cue ball stops dead.
- **Cut stun shot:** the two balls part at about 90°, minus the inelasticity effect.\[7\]
- **Rolling cue ball:** a half-ball hit deflects about 30°, and the result holds for hit fractions from ¼ to ¾.\[50\]
- **Sliding to rolling:** a ball struck at centre with no spin should roll at 5/7 of its initial speed, after a time of 2v₀/(7μₛg).
- **Cushion:** check that rebound angles with running versus check side match the published Mathavan figures, as tailuge does.\[20\]
- **Conservation and determinism:** momentum is conserved in ball–ball collisions, and the same input always gives the same event log (snapshot tests).

### 6.3 Common pitfalls
- Getting the table scale wrong (pool proportions).
- Ill-defined simultaneous contacts in the rack.
- Numerical instability in the Mathavan solver (pooltool had to fix this).\[13\]
- Mirror-like cushion reflection, which "feels wrong".
- Per-frame React re-renders.
- Leaking GPU resources: call `dispose()` on geometries, materials and textures when unmounting.

### 6.4 Licensing and IP
- **tailuge (GPL-3.0):** copying its code makes your app GPL. Read it for ideas, or reimplement from the papers.
- **pooltool (Apache-2.0):** porting its algorithms is permissive, but keep the notices.\[61\]
- **PoolPhysics:** no licence found, so treat it as all rights reserved.
- **WPBSA rulebook:** it is copyrighted, so paraphrase the rules and do not reproduce them.\[58\]
- **Names and assets:** avoid commercial game names and trademarks (e.g., "8 Ball Pool", tour or brand names) and copied UI art. Use CC0 or your own textures and models.

| Project / reference | Link | Language | What it offers | Licence |
|---|---|---|---|---|
| tailuge/billiards | github.com/tailuge/billiards | TypeScript, three.js | Browser 3D snooker/pool, Mathavan cushions, throw, replays | GPL-3.0 |
| pooltool | github.com/ekiefl/pooltool | Python, Panda3D | Event-based research simulator, pluggable physics | Apache-2.0 |
| PoolPhysics | github.com/jzitelli/PoolPhysics | Python | Leckie–Greenspan event-based implementation | Not found |
| manan30/billiards | github.com/manan30/billiards | React, r3f | Small React + r3f pool table demo | Not checked |
| Kiefl blog series | ekiefl.github.io | Docs | Readable equations and algorithm walkthrough | Blog |
| Leckie & Greenspan 2006 | doi:10.1007/11922155_19 | Paper | Event-based algorithm | Paper |
| Mathavan et al. 2010 | doi:10.1243/09544062JMES1964 | Paper | Cushion impact model, snooker values | Paper |
| Dr. Dave (Alciatore) | drdavepoolinfo.com | Articles | Constants, squirt/throw, 90°/30° rules | Free articles |
| PickPocket (Smith) | AAAI 2006 / AIJ 2007 | Paper | Computer-billiards AI | Paper |
| WPBSA rules | wpbsa.com | PDF | Official dimensions and rules | © WPBSA |

## Recommended approach for our app
1. **Engine first (weeks 1–3):** write a pure-TS event-based solver covering sliding, rolling and spinning states, ball–ball collisions with throw, and a simple cushion model, then upgrade to Mathavan. Use WPBSA geometry and snooker parameters. Write Vitest suites for the 90° rule, the 30° rule and the 5/7 rolling speed.
2. **2D view:** a Canvas2D top-down view that replays the event log, plus aim, ghost-ball and prediction overlays. This is the fastest way to validate the physics.
3. **3D POV view:** r3f or imperative three.js reading the same trajectories, with the camera behind the cue ball and a transition to overhead. Never use React state per frame.
4. **Rules module:** ball on, scoring, fouls, re-spotting, and free ball later.
5. **Lessons:** JSON lessons covering layout, goal, enabled aids, a metric and star thresholds. Follow the curriculum in 4.2, fade aids within each lesson, add no-aid test shots, and show replays with the ideal path overlaid.
6. **AI and hints:** a Worker-based Monte Carlo shot finder used for both the opponent and a "suggest a shot" coach.
7. **Polish:** mobile controls, performance budgets, accessibility and analytics.

## Caveats
- Coefficients vary with cloth, humidity and ball condition. Calibrate against video and allow per-table presets.
- Pocket widths and some UX patterns come from forums or reviews, not primary sources.
- The evidence for fading aids is mixed, so A/B test it.\[62\]
- The licence for tailuge appears as both GPL-3.0 (repo) and LGPL (itch.io page).\[20\]\[36\] Treat the repo's GPL-3.0 as binding.

## Sources

1. [The physics of pool/billiards](https://ekiefl.github.io/2020/04/24/pooltool-theory/)
2. [http://billiards.colostate.edu/physics/Alciatore\_pool\_physics\_article.pdf](https://drdavepoolinfo.com/physics_articles/Alciatore_pool_physics_article.pdf)
3. [Causes for Squirt and Cue Ball Deflection - Dr. Dave Pool Info](https://drdavepoolinfo.com/faq/squirt/cause/)
4. [Billiards Digest September, 2018 “Got English?” ILLUSTRATED PRINCIPLES](https://drdavepoolinfo.com/bd_articles/2018/sept18.pdf)
5. [David Alciatore (“Dr. Dave”) ILLUSTRATED PRINCIPLES](https://drdavepoolinfo.com/bd_articles/2007/june07.pdf)
6. [GoPlayPool 101 - Dr Dave's Frequently asked questions, Physics of Pool and Billiards - GoPlayPool 101](http://howto.goplaypool.com/dr-dave-physics-of-pool-and-billiards.html)
7. [TP A.5 The effects of ball inelasticity and friction on the 90° rule](https://drdavepoolinfo.com/technical_proofs/new/TP_A-5.pdf)
8. [30° and 90° Rule Ball Condition Effects - Dr. Dave Pool Info](https://drdavepoolinfo.com/faq/30-90-rules/conditions/)
9. [1863 A theoretical analysis of billiard ball dynamics under cushion impacts](https://drdavepoolinfo.com/physics_articles/Mathavan_IMechE_2010.pdf)
10. [1863 A theoretical analysis of billiard ball dynamics under cushion impacts](https://www.researchgate.net/profile/Senthan-Mathavan/publication/245388279_A_theoretical_analysis_of_billiard_ball_dynamics_under_cushion_impacts/links/0deec52fbcc84ca039000000/A-theoretical-analysis-of-billiard-ball-dynamics-under-cushion-impacts.pdf)
11. [A theoretical analysis of billiard ball dynamics under cushion impacts - S Mathavan, M R Jackson, R M Parkin, 2010](https://journals.sagepub.com/doi/10.1243/09544062JMES1964)
12. [Why Most Pool Games Feel Wrong — And What Realistic Cushion Physics Actually Looks Like](https://tailuge.github.io/billiards/dist/blog1.html)
13. [Pooltool: A Python package for realistic billiards simulation](https://zenodo.org/records/15034204)
14. <https://drdavepoolinfo.com//physics_articles/ajp_09_hsv_article.pdf>
15. [game-mechanics-optimizations/06\_fixed\_timestep.md at main · raduacg/game-mechanics-optimizations · GitHub](https://github.com/raduacg/game-mechanics-optimizations/blob/main/06_fixed_timestep.md)
16. [The algorithmic theory behind pool/billiards simulation](https://ekiefl.github.io/2020/12/20/pooltool-alg/)
17. [\[PDF\] An Event-Based Pool Physics Simulator](https://www.semanticscholar.org/paper/An-Event-Based-Pool-Physics-Simulator-Leckie-Greenspan/5908665cdb204fd3bd9027fd123b5df68a727dd3)
18. [Creating a billiards simulator: the transition from equations to code](https://ekiefl.github.io/2021/03/25/pooltool-start/)
19. [POOL PHYSICS SIMULATION BY EVENT PREDICTION 2: COLLISIONS - Will Leckie, Michael Greenspan, 2006](https://journals.sagepub.com/doi/10.3233/ICG-2006-29103)
20. [GitHub - tailuge/billiards: billiards physics in the browser · GitHub](https://github.com/tailuge/billiards)
21. [GitHub - jzitelli/PoolPhysics: Event-based billiards physics simulator · GitHub](https://github.com/jzitelli/PoolPhysics/)
22. [Pooltool Submission · Issue #173 · pyOpenSci/software-submission · GitHub](https://github.com/pyOpenSci/software-submission/issues/173)
23. [billiards · GitHub Topics · GitHub](https://github.com/topics/billiards)
24. [GitHub - XTH-LOVE/snooker: 斯诺克游戏 — 基于 tailuge/billiards 的 GPL-3.0 派生作品 · GitHub](https://github.com/XTH-LOVE/snooker)
25. [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)
26. [OffscreenCanvas—speed up your canvas operations with a web worker | Articles | web.dev](https://web.dev/articles/offscreen-canvas)
27. [neofixer.arizona.edu](https://neofixer.arizona.edu/css/CSSOrbit/asteroidJS/three/manual/en/offscreencanvas.html)
28. [English | 简体中文](https://github.com/puxiao/using-orbitcontrols-in-worker)
29. [Performance pitfalls - React Three Fiber](https://r3f.docs.pmnd.rs/advanced/pitfalls)
30. [github.com](https://github.com/yarnauy/react-three-fiber/blob/master/pitfalls.md)
31. [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
32. [8 Ball Pool - Free Online Pool Game](https://www.seeles.ai/games/sports/8-ball-pool-free-online-pool-game)
33. [8 Ball Pool - Multiplayer Billiards Game](https://www.seeles.ai/games/sports/8-ball-pool-multiplayer-billiards-game)
34. [Download 8 Ball Pool App Now.](https://findapps.net/app/8-ball-pool)
35. [Play 8 Ball Pool Online Free — Multiplayer, Unblocked & Download at Gamulo](https://gamulo.com/game/8-ball-pool-online/)
36. [Three cushion billiards by tailuge](https://tailuge.itch.io/three-cushion-billiards)
37. [DrillRoom: AI Pool Trainer - Sports App](https://mwm.ai/apps/drillroom-ai-pool-trainer/1539827505)
38. [DrillRoom](https://orangeloops.com/drillroom-ai-app-development.html)
39. [Announcing DrillRoom v2.0 and v2.1: Harness the Power of AI for Your Cue Sports Training](https://orangeloops.com/2023/06/announcing-drillroom-v2-0-and-v2-1-harness-the-power-of-ai-for-your-cue-sports-training/)
40. [DrillRoom: AI-powered Billiard Training iOS App](https://orangeloops.com/2021/02/drillroom-ai-powered-billiard-training-ios-app/)
41. [DrillRoom: AI Pool Trainer 3.1.1 Free Download](https://drillroom-billiard-training-ios.soft112.com/)
42. [DrillRoom: AI Pool Trainer App - App Store](https://apps.apple.com/bb/app/drillroom-ai-pool-trainer/id1539827505)
43. [DrillRoom: AI Pool Trainer - App Store - Apple](https://apps.apple.com/mx/app/drillroom-ai-pool-trainer/id1539827505?l=en-GB)
44. [Snooker Coach 147 App](https://snookercoaches.com/)
45. [Best Snooker Practice Apps: For iPhone and Android](https://snookerme.com/reviews/best-snooker-training-apps/)
46. [Snooker Practice Tracker - Apps on Google Play](https://play.google.com/store/apps/details?id=com.unicornio.app.routini&amp%3Bhl=en_US&amp%3Bgl=US)
47. [Snooker Scoreboard & Practice - Apps on Google Play](https://play.google.com/store/apps/details?id=com.Stozer.CueStats)
48. [SnookerSync - Snooker Scoring App & Stats Tracker for iOS and Android](https://snookersync-support.pages.dev/)
49. [Camera tracking in training sessions, free play match, and an Android APK by alastair32 · Pull Request #1 · alastair32/Snooker-Practise-App · GitHub](https://github.com/alastair32/Snooker-Practise-App/pull/1)
50. [Cue Ball Direction for All Types of Shots - Dr. Dave Pool Info](https://drdavepoolinfo.com/faq/cue-ball-control/where-cb-goes/)
51. [Billiards Digest January, 2020 “CB CONTROL … Everything You Need to Know”](https://drdavepoolinfo.com/bd_articles/2020/jan20.pdf)
52. [Cue Ball Control - Dr. Dave Pool Info](https://drdavepoolinfo.com/tutorial/cue-ball-control/)
53. [(PDF) Meta-analysis of reduced relative feedback frequency effect on motor learning and performance](https://www.researchgate.net/publication/355263800_Meta-analysis_of_reduced_relative_feedback_frequency_effect_on_motor_learning_and_performance)
54. [Psychological Knowledge of Results: Feedback, the Guidance Hypothesis, and Motor Learning](https://en.cognitivepsychology.com/Psychological_Knowledge_of_Results)
55. [www.frontiersin.org](https://www.frontiersin.org/articles/10.3389/fpsyg.2010.00190/pdf)
56. [MiniPool: Real-time artiﬁcial player for a 8-Ball video game David Silva](https://fenix.tecnico.ulisboa.pt/downloadFile/563345090414009/MEIC-66392-David-Silva-extAbst.pdf)
57. [(will be inserted by the editor) AI Optimization of a billiard player⋆](https://www.researchgate.net/profile/Jean-Francois-Landry-2/publication/225328639_AI_Optimization_of_a_Billiard_Player/links/09e4150eaee366bb58000000/AI-Optimization-of-a-Billiard-Player.pdf)
58. <https://wpbsa.com/wp-content/uploads/Rulebook-Website-Updated-May-2022-2.pdf>
59. [Official Pocket Size - The Snooker Forum](https://www.thesnookerforum.co.uk/board/forum/snooker-forums/snooker-questions/6003-official-pocket-size)
60. [OFFICIAL RULES OF THE GAMES OF SNOOKER AND ENGLISH BILLIARDS](https://world-billiards.com/wp-content/uploads/2014/02/official_rules.pdf)
61. [ekiefl/pooltool: v0.4.0](https://zenodo.org/records/13119651)
62. [Effect of Reduced Feedback Frequencies on Motor Learning in a Postural Control Task in Young Adults](https://www.mdpi.com/1424-8220/24/5/1404)
