import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing for the browser's Web Speech API (not in the standard DOM lib).
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult extends ArrayLike<SpeechAlternative> {
  isFinal: boolean;
}
interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  processLocally: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}
interface OnDeviceOptions {
  langs: string[];
  processLocally?: boolean;
  quality?: "command" | "dictation" | "conversation";
}
interface RecognitionCtor {
  new (): Recognition;
  // On-device recognition (Chrome 138+): check availability + install a language pack, then run offline.
  // available() resolves to "available" | "downloadable" | "downloading" | "unavailable".
  available?: (opts: OnDeviceOptions) => Promise<string>;
  install?: (opts: OnDeviceOptions) => Promise<boolean>;
}

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Try to make recognition run on-device (offline, no audio sent to Google). Installs the
// language pack on first use. Returns true if the next recognition can run locally.
async function enableOnDevice(Ctor: RecognitionCtor, lang: string): Promise<boolean> {
  if (typeof Ctor.available !== "function") return false;
  try {
    const opts: OnDeviceOptions = { langs: [lang], processLocally: true };
    let status = await Ctor.available(opts);
    console.log("on-device status for", lang, "→", status);
    // "downloadable" → pack exists but isn't installed yet; fetch it once, then re-check.
    if (status === "downloadable" && typeof Ctor.install === "function") {
      await Ctor.install(opts);
      status = await Ctor.available(opts);
      console.log("on-device status after install →", status);
    }
    return status === "available";
  } catch (e) {
    console.log("enableOnDevice threw", e);
    return false;
  }
}

// ponytail: native Web Speech API. Prefers Chrome's on-device mode (processLocally) so speech
//           stays offline/private; falls back to cloud recognition when the pack isn't there.
//           This is why we don't need a transformers.js Whisper download for local speech.
export function useSpeechToText(onResult: (transcript: string) => void, lang = "en-IN") {
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const localRef = useRef(false); // on-device availability, resolved off the click path

  // Probe on-device (offline) availability in the BACKGROUND, never during the tap.
  // Mobile Chrome exposes available() too and throws "not-allowed" if start() runs after an
  // await ends the tap gesture — so we resolve it here and start() reads the cached result.
  // ponytail: a first tap before this resolves uses cloud; offline kicks in once ready.
  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (Ctor) enableOnDevice(Ctor, lang).then((ok) => (localRef.current = ok));
  }, [lang]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.processLocally = localRef.current; // true → offline; false → cloud fallback
    // Recognition streams several onresult events; collect the FINAL segments only...
    let finalTranscript = "";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
    };
    rec.onerror = (e: any) => {
      setListening(false);
      console.log("onerror", e.error, e.message);
    };
    // ...then hand the complete transcript back exactly once, when recognition ends.
    rec.onend = () => {
      setListening(false);
      const text = finalTranscript.trim();
      if (text) onResult(text);
      console.log("onend", text);
    };
    recRef.current = rec;
    setListening(true);
    rec.start(); // synchronous → stays inside the tap gesture (mobile requirement)
  }, [lang, onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, preparing: false, start, stop, supported: getRecognitionCtor() !== null };
}
