# Usage analytics

Table Craft can count visitors and see which games and sections they use, through Google Analytics 4 (GA4). It is off until you configure it, and then sends nothing until each visitor agrees.

## Turning it on

1. In Google Analytics, create a GA4 property and a **Web** data stream for the site. Copy its measurement ID (`G-XXXXXXXXXX`).
2. Set it as an environment variable where the site is built. Locally that means `.env.local`, which git ignores:

   ```text
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

   On Vercel, add it under the project's **Settings → Environment Variables** (see [deploying](deploy-and-seo.md)). It is read at **build** time, so redeploy after setting it.
3. In the data stream settings, keep **Enhanced measurement** on. Its "page changes based on browser history events" option is what records page views as people move around the app.
4. So the event parameters below appear in reports, register each one under **Admin → Custom definitions → Create custom dimension** (scope: Event): `game`, `section`, `kind`, `activity_id`, `view`, `method`. Register `potted` and `stars` as **custom metrics**. Only data collected after you register them shows up.

Without a valid ID nothing is loaded and `track` does nothing, so development and forks send no data.

## Consent

- On the first visit a banner asks whether usage stats may be collected. Google's script is only loaded after **Allow**.
- The banner links to the [privacy page](../../src/app/privacy/page.tsx) at `/privacy`, which says what is stored and collected.
- The choice is kept in the device's preferences (`analytics` in `sim-pool:prefs`). It can be changed at any time on the privacy page or under **Settings → Privacy** on any table page. Switching it off stops sending at once and deletes the `_ga` cookies.
- Ads features are disabled: no Google signals and no ad personalisation.

Because nothing is sent before consent, visitors who ignore or decline the banner are not counted. Treat the numbers as a lower bound.

## What is recorded

**Page views**, recorded by GA itself. The path tells you the game and section: `/snooker/practice`, `/pool/lessons/<id>`, `/carrom/challenges/<id>`, `/nineball/stats`, and so on. See **Reports → Engagement → Pages and screens**.

**Events**, sent by `track()` in `src/core/analytics/track.ts`. Every event carries `game` and `section`, taken from the current path.

| Event | When | Extra parameters |
|---|---|---|
| `shot` | A shot has been played and judged (practice, drills, breaks, challenges) | `potted` (balls potted), `foul` |
| `activity_complete` | A lesson, drill, break or challenge is finished and saved | `kind` (`drill`, `break`, `watch`), `activity_id`, `stars` |
| `view_change` | The table is switched between 2D and 3D | `view` |
| `share` | The Share button was used | `method` (`native` share sheet or `copy_link`), `content_type` |

No names, emails, or anything typed into the app is sent.

## Adding an event

Add its name to `EventName` in `track.ts`, call `track(name, params)` where it happens, add it to the table above, and register any new parameter as a custom dimension in GA.
