import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		AUDD_API_URL: z.url().default("https://api.audd.io/"),
	},

	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
		VITE_SITE_URL: z.url().optional(),
	},

	/**
	 * Vars de servidor não aparecem em `import.meta.env` (só as com prefixo VITE_),
	 * por isso o merge com `process.env` — que só existe no bundle de servidor.
	 */
	runtimeEnv: {
		...(typeof process === "undefined" ? {} : process.env),
		...import.meta.env,
	},

	emptyStringAsUndefined: true,
});
