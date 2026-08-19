import axios from "axios";
import { z } from "zod";
import { env } from "#/env";

export const auddClient = axios.create({
	baseURL: env.AUDD_API_URL,
	timeout: 30_000,
});

const appleMusicSchema = z.object({
	url: z.string().nullish(),
	previews: z.array(z.object({ url: z.string() })).nullish(),
	artwork: z.object({ url: z.string() }).nullish(),
	genreNames: z.array(z.string()).nullish(),
	albumName: z.string().nullish(),
	releaseDate: z.string().nullish(),
});

const spotifySchema = z.object({
	name: z.string().nullish(),
	preview_url: z.string().nullish(),
	popularity: z.number().nullish(),
	external_urls: z.object({ spotify: z.string().nullish() }).nullish(),
	artists: z.array(z.object({ name: z.string() })).nullish(),
	album: z
		.object({
			name: z.string().nullish(),
			release_date: z.string().nullish(),
			images: z.array(z.object({ url: z.string() })).nullish(),
		})
		.nullish(),
});

const resultSchema = z.object({
	artist: z.string().nullish(),
	title: z.string().nullish(),
	album: z.string().nullish(),
	release_date: z.string().nullish(),
	label: z.string().nullish(),
	timecode: z.string().nullish(),
	song_link: z.string().nullish(),
	apple_music: appleMusicSchema.nullish(),
	spotify: spotifySchema.nullish(),
});

export const auddResponseSchema = z.union([
	z.object({ status: z.literal("success"), result: resultSchema.nullable() }),
	z.object({
		status: z.literal("error"),
		error: z.object({
			error_code: z.number(),
			error_message: z.string(),
		}),
	}),
]);

export type AuddResult = z.infer<typeof resultSchema>;

export type PlatformInfo = {
	url: string | null;
	previewUrl: string | null;
	artworkUrl: string | null;
};

export type RecognitionDTO = {
	title: string;
	artist: string;
	album: string | null;
	releaseDate: string | null;
	label: string | null;
	songLink: string | null;
	genres: Array<string>;
	appleMusic: PlatformInfo | null;
	spotify: (PlatformInfo & { popularity: number | null }) | null;
};

const ERROR_MESSAGES: Record<number, string> = {
	300: "Não deu pra identificar o áudio. Escolha um trecho com música mais audível.",
	400: "O trecho enviado passou do limite de 10MB do AudD.",
	500: "Formato de áudio não suportado pelo AudD.",
	600: "URL de áudio inválida.",
	700: "O AudD não recebeu o arquivo.",
	900: "Token do AudD inválido.",
	901: "Sem requisições disponíveis nesse token do AudD.",
};

export function auddErrorMessage(code: number, fallback: string) {
	return ERROR_MESSAGES[code] ?? `AudD (#${code}): ${fallback}`;
}

/**
 * A URL de artwork da Apple vem com os placeholders {w} e {h} — sem substituir,
 * a imagem não carrega.
 */
function appleArtworkUrl(url: string | null | undefined, size = 500) {
	if (!url) return null;
	return url.replace("{w}", String(size)).replace("{h}", String(size));
}

export function toRecognitionDTO(result: AuddResult): RecognitionDTO {
	const apple = result.apple_music;
	const spotify = result.spotify;

	return {
		title: result.title ?? "Desconhecida",
		artist: result.artist ?? "Artista desconhecido",
		album: result.album ?? null,
		releaseDate: result.release_date ?? null,
		label: result.label ?? null,
		songLink: result.song_link ?? null,
		genres: apple?.genreNames ?? [],
		appleMusic: apple?.url
			? {
					url: apple.url,
					previewUrl: apple.previews?.[0]?.url ?? null,
					artworkUrl: appleArtworkUrl(apple.artwork?.url),
				}
			: null,
		spotify: spotify?.external_urls?.spotify
			? {
					url: spotify.external_urls.spotify,
					previewUrl: spotify.preview_url ?? null,
					artworkUrl: spotify.album?.images?.[0]?.url ?? null,
					popularity: spotify.popularity ?? null,
				}
			: null,
	};
}

export async function recognize(clip: Blob, apiToken: string) {
	const form = new FormData();
	form.append("file", clip, "clip.wav");
	form.append("return", "apple_music,spotify");
	form.append("api_token", apiToken);

	const response = await auddClient.post("/", form);
	const parsed = auddResponseSchema.parse(response.data);

	if (parsed.status === "error") {
		throw new Error(
			auddErrorMessage(parsed.error.error_code, parsed.error.error_message),
		);
	}

	return parsed.result ? toRecognitionDTO(parsed.result) : null;
}
