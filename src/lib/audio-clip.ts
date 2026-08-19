/**
 * O corte acontece no browser (não no servidor) por dois motivos de deploy:
 * runtime serverless não tem ffmpeg, e o corpo de request da Vercel para em
 * 4,5MB — mandar o arquivo inteiro nunca funcionaria. O trecho vira WAV PCM
 * 16-bit mono, que o AudD aceita e cabe folgado no limite de 10MB deles.
 */

const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;

function writeAscii(view: DataView, offset: number, text: string) {
	for (let index = 0; index < text.length; index += 1) {
		view.setUint8(offset + index, text.charCodeAt(index));
	}
}

/** Mixdown dos canais em mono, já convertido para PCM 16-bit com clipping. */
function writeSamples(
	view: DataView,
	buffer: AudioBuffer,
	startFrame: number,
	frameCount: number,
) {
	const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
		buffer.getChannelData(index),
	);

	for (let frame = 0; frame < frameCount; frame += 1) {
		let sum = 0;
		for (const channel of channels) {
			sum += channel[startFrame + frame] ?? 0;
		}

		const mono = Math.max(-1, Math.min(1, sum / channels.length));
		view.setInt16(
			WAV_HEADER_BYTES + frame * BYTES_PER_SAMPLE,
			mono < 0 ? mono * 0x8000 : mono * 0x7fff,
			true,
		);
	}
}

export function encodeClipToWav(
	buffer: AudioBuffer,
	start: number,
	duration: number,
): Blob {
	const sampleRate = buffer.sampleRate;
	const startFrame = Math.min(
		buffer.length,
		Math.max(0, Math.floor(start * sampleRate)),
	);
	const frameCount = Math.max(
		0,
		Math.min(Math.floor(duration * sampleRate), buffer.length - startFrame),
	);

	const dataBytes = frameCount * BYTES_PER_SAMPLE;
	const output = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
	const view = new DataView(output);
	const byteRate = sampleRate * BYTES_PER_SAMPLE;

	writeAscii(view, 0, "RIFF");
	view.setUint32(4, 36 + dataBytes, true);
	writeAscii(view, 8, "WAVE");
	writeAscii(view, 12, "fmt ");
	view.setUint32(16, 16, true); // tamanho do bloco fmt
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // canais
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
	view.setUint16(34, 8 * BYTES_PER_SAMPLE, true);
	writeAscii(view, 36, "data");
	view.setUint32(40, dataBytes, true);

	writeSamples(view, buffer, startFrame, frameCount);

	return new Blob([output], { type: "audio/wav" });
}
