import { env } from "#/env";

/**
 * `VITE_SITE_URL` é semeada no `vite.config.ts` a partir do domínio de produção
 * da Vercel. Sem ela (dev, preview local) as tags absolutas — canonical, og:url,
 * og:image — são omitidas em vez de apontarem para localhost.
 */
const siteUrl = env.VITE_SITE_URL?.replace(/\/$/, "");

export const SITE = {
	name: "melodex",
	tagline: "que música é essa?",
	description:
		"Descubra o nome de uma música a partir de um trecho de até 25 segundos. Suba um áudio ou vídeo, escolha o momento exato na forma de onda e receba título, artista, capa e links do Apple Music e do Spotify.",
	locale: "pt_BR",
	themeColor: "#6366f1",
	url: siteUrl,
	ogImagePath: "/og.png",
} as const;

export const SITE_TITLE = `${SITE.name} — ${SITE.tagline}`;

export function absoluteUrl(path: string) {
	return siteUrl ? `${siteUrl}${path}` : undefined;
}
