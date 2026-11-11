# Deploying and search

The site is a standard Next.js app and is deployed on **Vercel**, which builds it straight from GitHub. No GitHub Actions workflow is needed.

## Deploying on Vercel

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account and choose **Add New → Project**.
2. Import the `playclid` repository.
3. Leave the detected settings alone: framework Next.js, build command `npm run build`.
4. Add the environment variables below under **Settings → Environment Variables**, then deploy.

From then on:
- Every push to `master` deploys to production.
- Every other branch and pull request gets its own preview address.
- Preview deployments are kept out of search results (`robots.txt` disallows everything and pages say `noindex`).

The free Hobby plan is for non-commercial projects. A site that earns money needs the Pro plan.

## Environment variables

All are optional. Each is read at **build** time, so redeploy after changing one.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_GA_ID` | Google Analytics measurement ID. Without it no analytics load. See [analytics](analytics.md) |
| `NEXT_PUBLIC_SITE_URL` | The public address, such as `https://playclid.app`. Set it once a custom domain is live. Without it, Vercel's production domain is used |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | The code from Google Search Console's "HTML tag" verification method |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shown on the privacy page as the contact for data questions |

## What helps the site get found

All of it comes from `src/core/site.ts` and the metadata files in `src/app/`:

| Piece | Where |
|---|---|
| Title, description and keywords for the whole site | `src/app/layout.tsx` (`SITE_DESCRIPTION`, `SITE_KEYWORDS`) |
| A title, description and canonical address for every page | `generateMetadata` in each page, through `pageMetadata` |
| Link previews (Open Graph and X cards), one image per game drawn from its real starting layout | `src/app/opengraph-image.tsx`, `src/app/[game]/opengraph-image.tsx`, `src/ui/og/ShareCard.tsx` |
| Home-screen icon for iPhone and iPad | `src/app/apple-icon.png` |
| Browser-tab icons | `src/app/icon.svg` (the mark on a rounded tile) and `src/app/favicon.ico` (16, 32 and 48 px) |
| App icons for the manifest | `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png` |
| Sitemap of every game, lesson and challenge | `src/app/sitemap.ts`, served at `/sitemap.xml` |
| Crawl rules | `src/app/robots.ts`, served at `/robots.txt` |
| Structured data: the app, the list of games, the FAQ, a course per game, breadcrumbs | `JsonLd` in the home page, game hubs and lessons |
| A footer linking every game | `src/ui/SiteFooter.tsx`, hidden on the full-screen table pages |
| A share button: the phone's share sheet, or copy link | `src/ui/ShareButton.tsx` |

Personal stats pages are marked `noindex` and left out of the sitemap, since they only show the visitor's own progress.

## After the first deploy

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)):
   - Add the site. Verify it by DNS for a custom domain, or by setting `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and redeploying.
   - Submit `https://<your-domain>/sitemap.xml`.
2. **Bing Webmaster Tools**: import the site from Search Console. Bing also feeds DuckDuckGo and Yahoo.
3. **Check the link previews**:
   - Paste a page address into the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) or the [LinkedIn post inspector](https://www.linkedin.com/post-inspector/).
   - A shared link on WhatsApp or X should show the game's table image.
4. **Check the structured data** with Google's [Rich Results Test](https://search.google.com/test/rich-results).

Search engines take days to weeks to index a new site. Links from elsewhere help most: snooker, pool and carrom forums, clubs, Reddit communities and the share button.
