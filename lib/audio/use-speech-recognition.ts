'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Minimal on-device speech-to-text via the Web Speech API (Chrome/Safari).
 * Used when the project's voiceInput slot is set to 'browser' — no provider
 * call, no audio leaves the device. Firefox lacks SpeechRecognition, so
 * `supported` is false there and the caller falls back / shows a toast.
 *
 * The Web Speech API transcribes the live mic, not a recorded blob, so this is
 * a separate path from the MediaRecorder-based useAudioRecorder.
 */

interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const supported = getCtor() !== null;

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
    finalRef.current = '';
    setInterim('');
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = res[0]?.transcript ?? '';
        if (res.isFinal) finalRef.current += txt;
        else interimText += txt;
      }
      setInterim(interimText);
    };
    rec.onerror = () => { /* errors surface as an empty final transcript */ };
    rec.onend = () => {
      setIsListening(false);
      setInterim('');
      const text = finalRef.current.trim();
      resolveRef.current?.(text);
      resolveRef.current = null;
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, []);

  // Stop and resolve with the accumulated final transcript (via onend).
  const stop = useCallback((): Promise<string> => {
    const rec = recRef.current;
    if (!rec) return Promise.resolve('');
    return new Promise<string>((resolve) => {
      resolveRef.current = resolve;
      try {
        rec.stop();
      } catch {
        resolve(finalRef.current.trim());
      }
    });
  }, []);

  // Abort without resolving the transcript (discard).
  const cancel = useCallback(() => {
    const rec = recRef.current;
    resolveRef.current = null;
    if (rec) {
      rec.onend = null;
      try { rec.abort(); } catch { /* ignore */ }
    }
    recRef.current = null;
    setIsListening(false);
    setInterim('');
  }, []);

  return { supported, isListening, interim, start, stop, cancel };
}
