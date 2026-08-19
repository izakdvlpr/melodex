import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "#/lib/site";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const origin = SITE.url ?? new URL(request.url).origin;

				const body = [
					"User-agent: *",
					"Allow: /",
					"Disallow: /_serverFn/",
					"",
					`Sitemap: ${origin}/sitemap.xml`,
					"",
				].join("\n");

				return new Response(body, {
					headers: {
						"content-type": "text/plain; charset=utf-8",
						"cache-control": "public, max-age=3600",
					},
				});
			},
		},
	},
});
