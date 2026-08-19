import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "#/lib/site";

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const origin = SITE.url ?? new URL(request.url).origin;

				const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url>
		<loc>${origin}/</loc>
		<changefreq>weekly</changefreq>
		<priority>1.0</priority>
	</url>
</urlset>
`;

				return new Response(body, {
					headers: {
						"content-type": "application/xml; charset=utf-8",
						"cache-control": "public, max-age=3600",
					},
				});
			},
		},
	},
});
