import { jsonLd } from "@/core/site";

/** Structured data for search engines (schema.org), rendered as a script tag in the page. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
