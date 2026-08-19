import { Loader2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
	type Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Button } from "#/components/ui/button";

export type Selection = { start: number; duration: number };

type WaveformPickerProps = {
	file: File;
	maxSeconds: number;
	onChange: (selection: Selection) => void;
	/**
	 * O PCM decodificado pelo wavesurfer é reaproveitado para recortar o trecho —
	 * decodificar o arquivo de novo na hora do submit dobraria tempo e memória.
	 */
	onDecoded: (buffer: AudioBuffer | null) => void;
};

function formatTime(seconds: number) {
	const total = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(total / 60);
	return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export function WaveformPicker({
	file,
	maxSeconds,
	onChange,
	onDecoded,
}: WaveformPickerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const waveSurferRef = useRef<WaveSurfer | null>(null);
	const regionRef = useRef<Region | null>(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onDecodedRef = useRef(onDecoded);
	onDecodedRef.current = onDecoded;

	const [isReady, setIsReady] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [range, setRange] = useState({ start: 0, end: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		setIsReady(false);
		setIsPlaying(false);

		const objectUrl = URL.createObjectURL(file);
		const regions = RegionsPlugin.create();
		const waveSurfer = WaveSurfer.create({
			container,
			height: 128,
			// Default do wavesurfer é 8kHz — bom pra desenhar, péssimo pro
			// fingerprint do AudD, que recebe esse mesmo PCM decodificado.
			sampleRate: 44100,
			waveColor: "#a1a1aa",
			progressColor: "#6366f1",
			cursorColor: "#e4e4e7",
			cursorWidth: 2,
			barWidth: 2,
			barGap: 1,
			barRadius: 2,
			// Sem normalizar, gravação baixa vira uma linha reta na tela.
			normalize: true,
			plugins: [regions],
			url: objectUrl,
		});

		waveSurferRef.current = waveSurfer;

		waveSurfer.on("ready", (duration) => {
			const end = Math.min(maxSeconds, duration);
			const region = regions.addRegion({
				start: 0,
				end,
				drag: true,
				resize: true,
				maxLength: maxSeconds,
				minLength: 1,
				color: "rgba(99, 102, 241, 0.2)",
			});

			regionRef.current = region;
			setRange({ start: region.start, end: region.end });
			setIsReady(true);
			onDecodedRef.current(waveSurfer.getDecodedData());
			onChangeRef.current({
				start: region.start,
				duration: region.end - region.start,
			});
		});

		// `maxLength` já segura o resize; esse clamp cobre o caso de a região ser
		// arrastada/atualizada por outro caminho.
		regions.on("region-updated", (region) => {
			if (region.end - region.start > maxSeconds) {
				region.setOptions({
					start: region.start,
					end: region.start + maxSeconds,
				});
				return;
			}
			setRange({ start: region.start, end: region.end });
			onChangeRef.current({
				start: region.start,
				duration: region.end - region.start,
			});
		});

		waveSurfer.on("play", () => setIsPlaying(true));
		waveSurfer.on("pause", () => setIsPlaying(false));
		waveSurfer.on("finish", () => setIsPlaying(false));

		return () => {
			onDecodedRef.current(null);
			waveSurfer.destroy();
			waveSurferRef.current = null;
			regionRef.current = null;
			URL.revokeObjectURL(objectUrl);
		};
	}, [file, maxSeconds]);

	const togglePlay = useCallback(() => {
		const waveSurfer = waveSurferRef.current;
		const region = regionRef.current;
		if (!waveSurfer || !region) return;

		if (waveSurfer.isPlaying()) {
			waveSurfer.pause();
			return;
		}

		region.play(true);
	}, []);

	const duration = range.end - range.start;

	return (
		<div className="space-y-3">
			<div className="relative rounded-lg border bg-muted/30 p-3">
				<div ref={containerRef} />
				{!isReady && (
					<div className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground text-sm">
						<Loader2 className="size-4 animate-spin" />
						Carregando forma de onda…
					</div>
				)}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<Button
					type="button"
					variant="secondary"
					onClick={togglePlay}
					disabled={!isReady}
				>
					{isPlaying ? (
						<>
							<Pause className="size-4" /> Pausar
						</>
					) : (
						<>
							<Play className="size-4" /> Tocar trecho
						</>
					)}
				</Button>

				<p className="text-muted-foreground text-sm tabular-nums">
					{formatTime(range.start)} → {formatTime(range.end)}{" "}
					<span className="text-foreground">({duration.toFixed(1)}s)</span> ·
					máx {maxSeconds}s
				</p>
			</div>

			<p className="text-muted-foreground text-xs">
				Arraste a área destacada para mover o trecho e as bordas para
				redimensionar.
			</p>
		</div>
	);
}
