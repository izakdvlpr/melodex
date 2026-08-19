export const MAX_CLIP_SECONDS = 25;

/** Limite de sanidade do arquivo escolhido — ele nem sai do browser. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Teto de arquivo da API do AudD. */
export const MAX_CLIP_BYTES = 10 * 1024 * 1024;

/**
 * Vídeo entra junto: o browser decodifica só a trilha de áudio do container e
 * é ela que vira o trecho enviado.
 */
export const ACCEPTED_MEDIA_MIME_TYPES = [
	"audio/mpeg",
	"audio/mp3",
	"audio/mp4",
	"audio/x-m4a",
	"audio/aac",
	"audio/wav",
	"audio/x-wav",
	"audio/ogg",
	"audio/webm",
	"audio/flac",
	"audio/x-flac",
	"video/mp4",
	"video/quicktime",
	"video/x-matroska",
	"video/webm",
	"video/x-msvideo",
];

export const MEDIA_INPUT_ACCEPT =
	".mp3,.m4a,.wav,.ogg,.flac,.mp4,.mov,.mkv,.webm,.avi,audio/*,video/*";

export const API_TOKEN_STORAGE_KEY = "melodex:audd-api-token";

const ACCEPTED_EXTENSIONS = [
	".mp3",
	".m4a",
	".wav",
	".ogg",
	".flac",
	".aac",
	".mp4",
	".mov",
	".mkv",
	".webm",
	".avi",
];

/**
 * Alguns navegadores/sistemas entregam o arquivo com `type` vazio ou genérico
 * (`application/octet-stream`), então a extensão serve de segunda chance.
 */
export function isAcceptedMedia(file: File) {
	if (ACCEPTED_MEDIA_MIME_TYPES.includes(file.type)) return true;

	const name = file.name.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}
