import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_CLIP_BYTES } from "#/lib/constants";

const inputSchema = z.object({
	apiToken: z.string().min(1, "Informe o API token do AudD."),
	clip: z
		.instanceof(File)
		.refine((clip) => clip.size > 0, "Trecho de áudio vazio.")
		.refine(
			(clip) => clip.size <= MAX_CLIP_BYTES,
			"Trecho grande demais para o AudD (máx 10MB).",
		),
});

export const recognizeTrack = createServerFn({ method: "POST" })
	.validator((formData: FormData) => {
		const parsed = inputSchema.safeParse({
			apiToken: formData.get("apiToken"),
			clip: formData.get("clip"),
		});

		// Sem isso o toast mostraria o JSON cru de issues do Zod.
		if (!parsed.success) {
			throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
		}

		return parsed.data;
	})
	.handler(async ({ data }) => {
		// Import dinâmico mantém o cliente do AudD (axios + env de servidor) fora
		// do bundle do browser.
		const { recognize } = await import("#/lib/audd");
		return recognize(data.clip, data.apiToken);
	});
