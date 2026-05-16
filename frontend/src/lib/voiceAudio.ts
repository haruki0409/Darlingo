/**
 * 음성 모드용 오디오 입출력.
 *
 * 백엔드(Gemini Live API) 스펙:
 *   - 마이크 → 모델: PCM16 / 16kHz / mono / base64
 *   - 모델 → 스피커: PCM16 / 24kHz / mono / base64
 *
 * 외부 워크렛 파일 없이 동작하도록 ScriptProcessorNode 를 쓴다(구식이지만
 * 별도 public 파일 불필요 + 전 브라우저 호환). 해커톤 안정성 우선.
 */

const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;

function arrayBufferToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(
      ...(bytes.subarray(i, i + CHUNK) as unknown as number[]),
    );
  }
  return btoa(bin);
}

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor {
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error("이 브라우저는 Web Audio 를 지원하지 않아요");
  return Ctor;
}

// ============================================================
//  마이크 캡처 → base64 PCM16 16kHz
// ============================================================

export class MicCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  async start(onChunk: (b64: string) => void): Promise<void> {
    const Ctor = getAudioContextCtor();
    // 생성자에 sampleRate 를 주면 브라우저가 마이크 입력을 16kHz 로 리샘플.
    this.ctx = new Ctor({ sampleRate: INPUT_RATE });
    if (this.ctx.state === "suspended") await this.ctx.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      onChunk(arrayBufferToB64(pcm.buffer));
    };

    this.source.connect(this.processor);
    // 출력에 아무것도 안 쓰므로 destination 연결돼도 무음(에코 없음).
    this.processor.connect(this.ctx.destination);
  }

  stop(): void {
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      this.stream?.getTracks().forEach((t) => t.stop());
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
  }
}

// ============================================================
//  스피커 재생 ← base64 PCM16 24kHz (끊김 없는 큐)
// ============================================================

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private nextTime = 0;
  private active = new Set<AudioBufferSourceNode>();

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = getAudioContextCtor();
      this.ctx = new Ctor({ sampleRate: OUTPUT_RATE });
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  enqueue(b64: string): void {
    const ctx = this.ensureCtx();
    const pcm = new Int16Array(b64ToArrayBuffer(b64));
    if (pcm.length === 0) return;

    const buffer = ctx.createBuffer(1, pcm.length, OUTPUT_RATE);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime + 0.04, this.nextTime);
    src.start(startAt);
    this.nextTime = startAt + buffer.duration;

    this.active.add(src);
    src.onended = () => this.active.delete(src);
  }

  /** 모델 발화가 끊겼을 때(interrupted) 예약된 버퍼 전부 폐기. */
  clear(): void {
    this.active.forEach((s) => {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    });
    this.active.clear();
    this.nextTime = this.ctx ? this.ctx.currentTime : 0;
  }

  close(): void {
    this.clear();
    try {
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}
