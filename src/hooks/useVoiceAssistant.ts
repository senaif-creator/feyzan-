import { useState, useEffect, useRef, useCallback } from 'react';

// Declaration for Web Speech API and Android Speech Bridge
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    AndroidSpeech?: {
      isAvailable: () => boolean;
      startListening: (lang?: string) => void;
      stopListening: () => void;
      cancel: () => void;
    };
    onAndroidSpeechResult?: (transcript: string, isFinal: boolean) => void;
    onAndroidSpeechError?: (errorCode: number, errorName: string) => void;
    onAndroidSpeechState?: (state: string) => void;
  }
}

export type AssistantVoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface UseVoiceAssistantReturn {
  voiceState: AssistantVoiceState;
  setVoiceState: (state: AssistantVoiceState) => void;
  voiceError: string | null;
  clearVoiceError: () => void;
  isSpeechRecognitionSupported: boolean;
  isSpeechSynthesisSupported: boolean;
  startListening: (onResult?: (transcript: string, isFinal: boolean) => void) => void;
  stopListening: () => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  autoSpeak: boolean;
  setAutoSpeak: (val: boolean) => void;
}

export function useVoiceAssistant(): UseVoiceAssistantReturn {
  const [voiceState, setVoiceState] = useState<AssistantVoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isListeningRef = useRef(false);
  const isUserStoppingRef = useRef(false);

  const hasAndroidSpeech =
    typeof window !== 'undefined' &&
    Boolean(window.AndroidSpeech && typeof window.AndroidSpeech.startListening === 'function');

  const isSpeechRecognitionSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window.AndroidSpeech && typeof window.AndroidSpeech.startListening === 'function') ||
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

  const isSpeechSynthesisSupported =
    typeof window !== 'undefined' && Boolean(window.speechSynthesis);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (isSpeechSynthesisSupported) {
      synthRef.current = window.speechSynthesis;
    }
  }, [isSpeechSynthesisSupported]);

  // Clean speech text before feeding to TTS (strip markdown asterisks, emojis or urls)
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/\*(.*?)\*/g, '$1') // remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove markdown links
      .replace(/[•\-\*]/g, '') // remove bullets
      .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}]/gu, '') // strip emojis
      .trim();
  };

  // Speak assistant response in Turkish
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSpeechSynthesisSupported || !synthRef.current) {
        return;
      }

      // Cancel any ongoing speech
      try {
        synthRef.current.cancel();
      } catch (e) {
        console.warn('SpeechSynthesis cancel error:', e);
      }

      const cleanText = cleanTextForSpeech(text);
      if (!cleanText) {
        setVoiceState('idle');
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'tr-TR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Find a Turkish voice if available
      const voices = synthRef.current.getVoices();
      const turkishVoice = voices.find(
        (v) => v.lang === 'tr-TR' || v.lang.startsWith('tr')
      );
      if (turkishVoice) {
        utterance.voice = turkishVoice;
      }

      utterance.onstart = () => {
        setVoiceState('speaking');
      };

      utterance.onend = () => {
        setVoiceState('idle');
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis utterance error:', e);
        setVoiceState('idle');
        if (onEnd) onEnd();
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [isSpeechSynthesisSupported]
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (e) {
        console.warn(e);
      }
    }
    setVoiceState('idle');
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isUserStoppingRef.current = true;
    if (hasAndroidSpeech) {
      try {
        window.AndroidSpeech?.stopListening();
      } catch (e) {
        console.warn('AndroidSpeech stop error:', e);
      }
      setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('SpeechRecognition stop error:', e);
      }
      recognitionRef.current = null;
    }
    setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
  }, [hasAndroidSpeech]);

  // Start listening with microphone
  const startListening = useCallback(
    (onResult?: (transcript: string, isFinal: boolean) => void) => {
      setVoiceError(null);
      isUserStoppingRef.current = false;

      // Stop any active TTS before listening
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch (e) {
          console.warn(e);
        }
      }

      if (!isSpeechRecognitionSupported) {
        setVoiceError(
          'Cihazınız veya tarayıcınız ses tanıma özelliğini desteklemiyor. Metin girişiyle sohbete devam edebilirsiniz.'
        );
        return;
      }

      // Android Native Speech Recognizer bridge (Android WebView)
      if (hasAndroidSpeech) {
        try {
          console.log('[SPEECH_START] Başlatılıyor (tr-TR)...');

          window.onAndroidSpeechResult = (transcript: string, isFinal: boolean) => {
            const text = (transcript || '').trim();
            if (isFinal) {
              console.log('[SPEECH_RESULT]', text ? `"${text.substring(0, 30)}..."` : '[EMPTY]');
            } else {
              console.log('[SPEECH_PARTIAL]', text ? `"${text.substring(0, 30)}..."` : '[EMPTY]');
            }
            if (text && onResult) {
              console.log('[TRANSCRIPT_RECEIVED]', isFinal ? '(final)' : '(interim)');
              onResult(text, isFinal);
            }
          };

          window.onAndroidSpeechState = (state: string) => {
            if (state === 'listening') {
              console.log('[SPEECH_READY]');
              isListeningRef.current = true;
              setVoiceState('listening');
            } else if (state === 'idle') {
              isListeningRef.current = false;
              setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
            }
          };

          window.onAndroidSpeechError = (errorCode: number, errorName: string) => {
            console.log('[SPEECH_ERROR]', errorCode, errorName, 'isUserStopping:', isUserStoppingRef.current);
            isListeningRef.current = false;
            setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));

            // Kullanıcı kendisi mikrofonu kapattıysa veya konuşmayı durdurduysa hata bandı gösterme
            if (isUserStoppingRef.current) {
              return;
            }

            switch (errorCode) {
              case 7: // ERROR_NO_MATCH: No speech recognized
                setVoiceError(
                  'Ses algılanamadı. Lütfen mikrofona biraz daha yakın konuşarak tekrar deneyin.'
                );
                break;
              case 6: // ERROR_SPEECH_TIMEOUT: No speech detected before timeout
                setVoiceError(
                  'Ses duyulmadı veya süre doldu. Lütfen tekrar deneyin.'
                );
                break;
              case 5: // ERROR_CLIENT: Client side error
                setVoiceError(
                  'Ses tanıma servisiyle bağlantı kurulamadı. Lütfen tekrar deneyin.'
                );
                break;
              case 15: // ERROR_RECOGNITION_SERVICE_NOT_AVAILABLE
                setVoiceError(
                  'Cihazınızda Google Sesli Yazma servisi aktif değil veya bulunamadı. Cihaz ayarlarınızı kontrol edin.'
                );
                break;
              case 9: // ERROR_INSUFFICIENT_PERMISSIONS
                setVoiceError(
                  'Mikrofon izni verilmemiş. Lütfen cihaz/uygulama ayarlarından mikrofon iznini aktif hale getirin.'
                );
                break;
              case 3: // ERROR_AUDIO
                setVoiceError(
                  'Mikrofon/ses giriş problemi. Başka bir uygulamanın mikrofonu kullanmadığından emin olun.'
                );
                break;
              case 1: // ERROR_NETWORK_TIMEOUT
              case 2: // ERROR_NETWORK
                setVoiceError(
                  'Ses tanıma servisine ağ bağlantısı problemi. Lütfen internet bağlantınızı kontrol edin.'
                );
                break;
              case 8: // ERROR_RECOGNIZER_BUSY
                setVoiceError(
                  'Önceki ses tanıma işlemi hâlâ çalışıyor (Meşgul). Lütfen tekrar deneyin.'
                );
                break;
              default:
                setVoiceError(
                  `Ses algılanamadı (${errorName || errorCode}). Lütfen tekrar deneyin.`
                );
                break;
            }
          };

          window.AndroidSpeech?.startListening('tr-TR');
          return;
        } catch (androidErr) {
          console.error('Failed to start AndroidSpeech:', androidErr);
          setVoiceError('Mikrofon başlatılamadı. Lütfen tekrar deneyin.');
          setVoiceState('idle');
          return;
        }
      }

      // Safely abort and detach listeners from any previous instance to prevent ERROR_RECOGNIZER_BUSY or false 'aborted' errors
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {
          console.warn('Recognition abort error:', e);
        }
        recognitionRef.current = null;
      }

      try {
        const SpeechRecognitionClass =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.lang = 'tr-TR';
        recognition.continuous = false; // Single utterance per turn is reliable across mobile WebViews
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListeningRef.current = true;
          setVoiceState('listening');
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentText = (finalTranscript || interimTranscript).trim();
          if (currentText && onResult) {
            onResult(currentText, Boolean(finalTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          const errorCode = event?.error || 'unknown';
          console.warn('SpeechRecognition error:', errorCode);
          isListeningRef.current = false;

          switch (errorCode) {
            case 'aborted':
              // Kullanıcı işlemi iptal etti veya yeni oturum başlatıldı; hata mesajı gösterilmez
              break;

            case 'not-allowed':
            case 'service-not-allowed':
              // Android: ERROR_INSUFFICIENT_PERMISSIONS
              setVoiceError(
                'Mikrofon izni verilmemiş. Lütfen cihaz/uygulama ayarlarından mikrofon iznini aktif hale getirin.'
              );
              break;

            case 'no-speech':
              // Android: ERROR_SPEECH_TIMEOUT / ERROR_NO_MATCH
              // Kullanıcı konuşmadan süre doldu; sessizce dinlemeyi kapatıyoruz, gereksiz hata uyarısı üretmiyoruz
              break;

            case 'audio-capture':
              // Android: ERROR_AUDIO
              setVoiceError(
                'Mikrofon/ses giriş problemi. Başka bir uygulamanın mikrofonu kullanmadığından emin olun.'
              );
              break;

            case 'network':
              // Android: ERROR_NETWORK / ERROR_NETWORK_TIMEOUT
              setVoiceError(
                'Ses tanıma servisine ağ bağlantısı problemi. Lütfen internet bağlantınızı kontrol edin.'
              );
              break;

            case 'language-not-supported':
              setVoiceError(
                'Türkçe (tr-TR) ses tanıma dili bu cihazda desteklenmiyor.'
              );
              break;

            default:
              setVoiceError(
                `Ses algılanamadı (${errorCode}). Lütfen tekrar deneyin.`
              );
              break;
          }

          setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
        };

        recognition.onend = () => {
          isListeningRef.current = false;
          setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
          recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start SpeechRecognition:', err);
        if (err?.name === 'InvalidStateError') {
          // Android: ERROR_RECOGNIZER_BUSY
          setVoiceError(
            'Önceki ses tanıma işlemi hâlâ çalışıyor (Meşgul). Lütfen tekrar deneyin.'
          );
        } else {
          setVoiceError('Mikrofon başlatılamadı. Lütfen tekrar deneyin.');
        }
        setVoiceState('idle');
      }
    },
    [isSpeechRecognitionSupported, hasAndroidSpeech]
  );

  const clearVoiceError = () => {
    setVoiceError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasAndroidSpeech) {
        try {
          window.AndroidSpeech?.cancel();
        } catch (e) {}
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.warn(e);
        }
      }
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch (e) {
          console.warn(e);
        }
      }
    };
  }, [hasAndroidSpeech]);

  return {
    voiceState,
    setVoiceState,
    voiceError,
    clearVoiceError,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    autoSpeak,
    setAutoSpeak,
  };
}
