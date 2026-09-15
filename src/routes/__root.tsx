import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { absoluteUrl, SITE, SITE_TITLE } from "#/lib/site";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: SITE_TITLE },
			{ name: "description", content: SITE.description },
			{ name: "application-name", content: SITE.name },
			{ name: "theme-color", content: SITE.themeColor },
			{ name: "robots", content: "index, follow, max-image-preview:large" },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE.name },
			{ property: "og:locale", content: SITE.locale },
			{ property: "og:title", content: SITE_TITLE },
			{ property: "og:description", content: SITE.description },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SITE_TITLE },
			{ name: "twitter:description", content: SITE.description },
			// Fora da Vercel `SITE.url` some, e URL absoluta é obrigatória em og:image.
			...(SITE.url
				? [
						{ property: "og:url", content: SITE.url },
						{ property: "og:image", content: absoluteUrl(SITE.ogImagePath) },
						{ property: "og:image:width", content: "1200" },
						{ property: "og:image:height", content: "630" },
						{
							property: "og:image:alt",
							content: `${SITE.name} — ${SITE.tagline}`,
						},
						{ name: "twitter:image", content: absoluteUrl(SITE.ogImagePath) },
					]
				: []),
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
			...(SITE.url ? [{ rel: "canonical", href: SITE.url }] : []),
		],
	}),
	shellComponent: RootDocument,
});

const structuredData = {
	"@context": "https://schema.org",
	"@type": "WebApplication",
	name: SITE.name,
	description: SITE.description,
	applicationCategory: "MultimediaApplication",
	operatingSystem: "Web",
	inLanguage: "pt-BR",
	...(SITE.url ? { url: SITE.url } : {}),
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "BRL",
	},
};

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pt-BR">
			<head>
				<HeadContent />

				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD só existe como texto de script
					dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
				/>

				<script
					defer
					src="https://dataxamas.izakdvlpr.com/dataxamas.js"
					data-api-key="dx_live_lthMc2o-3SY5xhraaiQxHo4-KjzXL-VGITRfjjotIRo"
					data-allow-localhost="true"
				/>
			</head>

			<body>
				{children}

				<Toaster richColors position="top-center" />

				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
