import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Music4, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { type Selection, WaveformPicker } from "#/components/waveform-picker";
import type { RecognitionDTO } from "#/lib/audd";
import { encodeClipToWav } from "#/lib/audio-clip";
import {
	API_TOKEN_STORAGE_KEY,
	isAcceptedMedia,
	MAX_CLIP_SECONDS,
	MAX_UPLOAD_BYTES,
	MEDIA_INPUT_ACCEPT,
} from "#/lib/constants";
import { dayjs } from "#/lib/dayjs";
import { SITE } from "#/lib/site";
import { recognizeTrack } from "#/server/recognize";

export const Route = createFileRoute("/")({ component: Home });

const formSchema = z.object({
	apiToken: z.string().min(1, "Informe o API token do AudD."),
	file: z
		.instanceof(File, { message: "Escolha um arquivo de áudio ou vídeo." })
		.refine(isAcceptedMedia, "Formato não suportado.")
		.refine(
			(file) => file.size <= MAX_UPLOAD_BYTES,
			"Arquivo grande demais (máx 100MB).",
		),
	start: z.number().min(0),
	duration: z.number().gt(0).max(MAX_CLIP_SECONDS),
});

type FormValues = z.infer<typeof formSchema>;

function formatReleaseDate(value: string | null) {
	if (!value) return null;
	const date = dayjs(value);
	return date.isValid() ? date.format("DD/MM/YYYY") : value;
}

function Home() {
	const [showToken, setShowToken] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const audioBufferRef = useRef<AudioBuffer | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { apiToken: "", start: 0, duration: 0 },
	});

	const file = watch("file");

	useEffect(() => {
		const stored = localStorage.getItem(API_TOKEN_STORAGE_KEY);
		if (stored) setValue("apiToken", stored);
	}, [setValue]);

	const mutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const buffer = audioBufferRef.current;
			if (!buffer) {
				throw new Error("Espere a forma de onda terminar de carregar.");
			}

			const clip = encodeClipToWav(buffer, values.start, values.duration);

			const formData = new FormData();
			formData.append("apiToken", values.apiToken);
			formData.append("clip", clip, "clip.wav");

			return recognizeTrack({ data: formData });
		},
		onSuccess: (result, values) => {
			localStorage.setItem(API_TOKEN_STORAGE_KEY, values.apiToken);
			if (result) {
				toast.success(`${result.title} — ${result.artist}`);
			} else {
				toast.info("Nenhuma música reconhecida nesse trecho.");
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Falha ao reconhecer o trecho.");
		},
	});

	function handleSelection(selection: Selection) {
		setValue("start", selection.start, { shouldValidate: true });
		setValue("duration", selection.duration, { shouldValidate: true });
	}

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const selected = event.target.files?.[0];
		if (!selected) return;

		mutation.reset();
		audioBufferRef.current = null;
		setValue("file", selected, { shouldValidate: true });
		setValue("start", 0);
		setValue("duration", 0);
	}

	const result = mutation.data;

	return (
		<main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
			<header className="space-y-2">
				<h1 className="flex items-center gap-2 font-bold text-3xl tracking-tight">
					<Music4 className="size-7 text-indigo-500" />
					melodex
				</h1>
				<p className="font-medium text-lg">
					Descubra o nome de uma música a partir de um trecho de até{" "}
					{MAX_CLIP_SECONDS} segundos.
				</p>
				<p className="text-muted-foreground">
					Suba um áudio ou vídeo, marque o momento exato na forma de onda e
					receba título, artista, capa e links do Apple Music e do Spotify.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Reconhecer trecho</CardTitle>
					<CardDescription>
						O token é guardado só no seu navegador. O arquivo não sai do seu
						computador — só o trecho selecionado é enviado.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<form
						className="space-y-6"
						onSubmit={handleSubmit((values) => mutation.mutate(values))}
					>
						<div className="space-y-2">
							<Label htmlFor="apiToken">API token do AudD</Label>
							<div className="flex gap-2">
								<Input
									id="apiToken"
									type={showToken ? "text" : "password"}
									autoComplete="off"
									placeholder="cole seu token do dashboard do AudD"
									{...register("apiToken")}
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label={showToken ? "Ocultar token" : "Mostrar token"}
									onClick={() => setShowToken((current) => !current)}
								>
									{showToken ? (
										<EyeOff className="size-4" />
									) : (
										<Eye className="size-4" />
									)}
								</Button>
							</div>
							{errors.apiToken && (
								<p className="text-destructive text-sm">
									{errors.apiToken.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="file">Arquivo de áudio ou vídeo</Label>
							<Input
								id="file"
								ref={fileInputRef}
								type="file"
								accept={MEDIA_INPUT_ACCEPT}
								onChange={handleFileChange}
							/>
							{file && (
								<p className="text-muted-foreground text-sm">
									{file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
								</p>
							)}
							{errors.file && (
								<p className="text-destructive text-sm">
									{errors.file.message}
								</p>
							)}
						</div>

						{file && (
							<WaveformPicker
								file={file}
								maxSeconds={MAX_CLIP_SECONDS}
								onChange={handleSelection}
								onDecoded={(buffer) => {
									audioBufferRef.current = buffer;
								}}
							/>
						)}

						{errors.duration && (
							<p className="text-destructive text-sm">
								Selecione um trecho de até {MAX_CLIP_SECONDS}s.
							</p>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={mutation.isPending || !file}
						>
							{mutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" /> Identificando…
								</>
							) : (
								<>
									<Upload className="size-4" /> Identificar música
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{mutation.isPending && <ResultSkeleton />}

			{!mutation.isPending && result === null && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						Nenhuma música reconhecida nesse trecho. Tente outro pedaço com a
						música mais audível.
					</CardContent>
				</Card>
			)}

			{!mutation.isPending && result && <ResultCard result={result} />}

			<HowItWorks />
			<Faq />
		</main>
	);
}

function ResultSkeleton() {
	return (
		<Card>
			<CardContent className="flex gap-6 py-6">
				<Skeleton className="size-40 shrink-0 rounded-lg" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-6 w-2/3" />
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-4 w-1/3" />
					<Skeleton className="h-10 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}

function PlatformBlock({
	name,
	url,
	previewUrl,
}: {
	name: string;
	url: string;
	previewUrl: string | null;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-3">
				<span className="font-medium">{name}</span>
				<Button asChild size="sm" variant="outline">
					<a href={url} target="_blank" rel="noreferrer">
						Abrir no {name}
					</a>
				</Button>
			</div>
			{previewUrl ? (
				// biome-ignore lint/a11y/useMediaCaption: preview de áudio não tem legenda
				<audio className="w-full" controls src={previewUrl} preload="none" />
			) : (
				<p className="text-muted-foreground text-sm">Preview indisponível.</p>
			)}
		</div>
	);
}

function ResultCard({ result }: { result: RecognitionDTO }) {
	const artwork = result.appleMusic?.artworkUrl ?? result.spotify?.artworkUrl;
	const releaseDate = formatReleaseDate(result.releaseDate);

	return (
		<Card>
			<CardContent className="space-y-6 py-6">
				<div className="flex flex-col gap-6 sm:flex-row">
					{artwork && (
						<img
							src={artwork}
							alt={`Capa de ${result.title}`}
							className="size-40 shrink-0 rounded-lg object-cover shadow"
						/>
					)}

					<div className="space-y-2">
						<h2 className="font-bold text-2xl leading-tight">{result.title}</h2>
						<p className="text-lg text-muted-foreground">{result.artist}</p>
						{result.album && <p className="text-sm">Álbum: {result.album}</p>}
						{releaseDate && (
							<p className="text-muted-foreground text-sm">
								Lançamento: {releaseDate}
							</p>
						)}
						{result.genres.length > 0 && (
							<div className="flex flex-wrap gap-1 pt-1">
								{result.genres.map((genre) => (
									<Badge key={genre} variant="secondary">
										{genre}
									</Badge>
								))}
							</div>
						)}
					</div>
				</div>

				{(result.appleMusic || result.spotify) && <Separator />}

				<div className="grid gap-6 sm:grid-cols-2">
					{result.appleMusic?.url && (
						<PlatformBlock
							name="Apple Music"
							url={result.appleMusic.url}
							previewUrl={result.appleMusic.previewUrl}
						/>
					)}
					{result.spotify?.url && (
						<PlatformBlock
							name="Spotify"
							url={result.spotify.url}
							previewUrl={result.spotify.previewUrl}
						/>
					)}
				</div>

				{result.songLink && (
					<a
						className="text-indigo-500 text-sm underline underline-offset-4"
						href={result.songLink}
						target="_blank"
						rel="noreferrer"
					>
						Ver todos os links da música
					</a>
				)}
			</CardContent>
		</Card>
	);
}

const STEPS = [
	{
		title: "Suba o arquivo",
		text: "Áudio ou vídeo, direto do seu computador. Nesse momento nada é enviado para lugar nenhum.",
	},
	{
		title: `Marque o trecho (até ${MAX_CLIP_SECONDS}s)`,
		text: "Arraste a região na forma de onda até o pedaço em que a música aparece mais limpa e ouça antes de enviar.",
	},
	{
		title: "Receba a identificação",
		text: "Título, artista, álbum, data de lançamento, capa e links com preview do Apple Music e do Spotify.",
	},
];

const FAQ = [
	{
		question: "Preciso de um token do AudD?",
		answer:
			"Sim. O reconhecimento roda na API do AudD, então é preciso um token do dashboard deles. Ele fica salvo apenas no seu navegador e é usado só no servidor, na hora da chamada.",
	},
	{
		question: "Quais formatos de arquivo funcionam?",
		answer:
			"Áudio em mp3, m4a, wav, ogg, aac e flac, e vídeo em mp4, mov, mkv, webm e avi. No caso de vídeo, o próprio navegador extrai a trilha de áudio.",
	},
	{
		question: "O arquivo inteiro é enviado para o servidor?",
		answer: `Não. O corte acontece no seu navegador e só o trecho selecionado, de no máximo ${MAX_CLIP_SECONDS} segundos, é enviado para o reconhecimento.`,
	},
	{
		question: `Por que o limite é de ${MAX_CLIP_SECONDS} segundos?`,
		answer:
			"É bem mais do que o necessário para gerar a impressão digital do áudio. Um trecho curto com a música audível funciona melhor do que um trecho longo cheio de fala ou ruído.",
	},
	{
		question: "Funciona com cover, versão ao vivo ou música tocando ao fundo?",
		answer:
			"O reconhecimento compara o trecho com gravações comerciais, então covers e versões ao vivo costumam não bater. Música ao fundo funciona se estiver alta o bastante em relação ao resto do áudio.",
	},
];

const faqStructuredData = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: FAQ.map((item) => ({
		"@type": "Question",
		name: item.question,
		acceptedAnswer: { "@type": "Answer", text: item.answer },
	})),
};

function HowItWorks() {
	return (
		<section aria-labelledby="como-funciona" className="space-y-4">
			<h2 id="como-funciona" className="font-semibold text-xl tracking-tight">
				Como funciona
			</h2>

			<ol className="grid gap-4 sm:grid-cols-3">
				{STEPS.map((step, index) => (
					<li key={step.title}>
						<Card className="h-full">
							<CardContent className="space-y-2 py-6">
								<span className="font-mono text-indigo-500 text-sm">
									{String(index + 1).padStart(2, "0")}
								</span>
								<h3 className="font-medium">{step.title}</h3>
								<p className="text-muted-foreground text-sm">{step.text}</p>
							</CardContent>
						</Card>
					</li>
				))}
			</ol>
		</section>
	);
}

function Faq() {
	return (
		<section aria-labelledby="faq" className="space-y-4">
			<h2 id="faq" className="font-semibold text-xl tracking-tight">
				Perguntas frequentes sobre o {SITE.name}
			</h2>

			<div className="space-y-4">
				{FAQ.map((item) => (
					<article key={item.question} className="space-y-1">
						<h3 className="font-medium">{item.question}</h3>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{item.answer}
						</p>
					</article>
				))}
			</div>

			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD só existe como texto de script
				dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
			/>
		</section>
	);
}
