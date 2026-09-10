import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Check,
  PlusCircle,
  Calendar,
  Brain,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Square,
  AlertCircle,
  Key,
  Settings,
} from 'lucide-react';
import { ChatMessage, TaskItem, MemoryItem } from '../types';
import { QUICK_PROMPTS } from '../data/mockData';
import { AssistantAura } from './AssistantAura';
import { AssistantVoiceState } from '../hooks/useVoiceAssistant';
import { isMobileAppEnvironment } from '../services/aiService';

interface AssistantViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, fromVoice?: boolean) => void;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'savedAt'>) => void;
  onDeclineAction: (msgId: string) => void;
  initialInput?: string;
  autoStartVoice?: boolean;
  onVoiceStarted?: () => void;
  voiceState: AssistantVoiceState;
  voiceError: string | null;
  onClearVoiceError: () => void;
  isSpeechRecognitionSupported: boolean;
  isSpeechSynthesisSupported: boolean;
  onStartVoice: (onTranscript: (text: string, isFinal: boolean) => void) => void;
  onStopVoice: () => void;
  onStopSpeaking: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenSettings?: () => void;
  hasApiKey?: boolean;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  messages,
  onSendMessage,
  onAddTask,
  onAddMemory,
  onDeclineAction,
  initialInput = '',
  autoStartVoice,
  onVoiceStarted,
  voiceState,
  voiceError,
  onClearVoiceError,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  onStartVoice,
  onStopVoice,
  onStopSpeaking,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenSettings,
  hasApiKey,
}) => {
  const [inputText, setInputText] = useState(initialInput);
  const [actionStatus, setActionStatus] = useState<{ [msgId: string]: 'accepted' | 'declined' }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceState]);

  // Mobil klavye açıldığında veya ekran boyutu değiştiğinde son mesajı ve giriş alanını görünür tut
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleViewportResize = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  useEffect(() => {
    if (initialInput) {
      setInputText(initialInput);
    }
  }, [initialInput]);

  // Sesli komut dinlemeyi başlatma ve metne dönüştürme fonksiyonu
  const startVoiceInput = useCallback(() => {
    onStartVoice((transcript: string, isFinal: boolean) => {
      setInputText(transcript);
      if (isFinal && transcript.trim()) {
        onSendMessage(transcript.trim(), true);
        setInputText('');
      }
    });
  }, [onStartVoice, onSendMessage]);

  // "Konuşmaya Başla" butonuyla gelindiğinde mikrofonu ve dinlemeyi doğrudan ve güvenli başlat
  const autoStartHandledRef = useRef(false);

  useEffect(() => {
    if (autoStartVoice && !autoStartHandledRef.current) {
      autoStartHandledRef.current = true;
      // Mikrofonu gecikmesiz ve doğrudan başlat
      startVoiceInput();
      // Başlatıldıktan sonra üst bileşendeki autoStartVoice durumunu temizle
      if (onVoiceStarted) {
        onVoiceStarted();
      }
    }
  }, [autoStartVoice, onVoiceStarted, startVoiceInput]);

  useEffect(() => {
    if (!autoStartVoice) {
      autoStartHandledRef.current = false;
    }
  }, [autoStartVoice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || voiceState === 'thinking') return;
    onSendMessage(inputText.trim(), false);
    setInputText('');
  };

  const handleActionAccept = (msgId: string, action: NonNullable<ChatMessage['suggestedAction']>) => {
    if (action.type === 'create_task') {
      onAddTask({
        title: action.payload.title,
        dueDate: action.payload.dueDate || 'Yarın',
        time: action.payload.time,
        category: action.payload.dueDate === 'Bugün' ? 'today' : 'upcoming',
        priority: action.payload.priority || 'medium',
        isCompleted: false,
        source: 'assistant',
      });
    } else if (action.type === 'save_memory') {
      onAddMemory({
        category: action.payload.category || 'notes',
        title: action.payload.title,
        content: action.payload.detail || action.payload.title,
        source: 'Doğal sohbetten hatırlandı',
      });
    }

    setActionStatus((prev) => ({ ...prev, [msgId]: 'accepted' }));
  };

  const handleActionDecline = (msgId: string) => {
    setActionStatus((prev) => ({ ...prev, [msgId]: 'declined' }));
    onDeclineAction(msgId);
  };

  // Toggle voice interaction
  const handleVoiceToggle = () => {
    if (voiceState === 'speaking') {
      onStopSpeaking();
    } else if (voiceState === 'listening') {
      onStopVoice();
    } else {
      startVoiceInput();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] h-[calc(100dvh-130px)] max-h-[800px] pb-24 relative">
      {/* 1. Üst Asistan Varlık Başlığı */}
      <div className="mb-2 flex items-center justify-between border-b border-stone-200/60 pb-2.5 px-1">
        <div className="flex items-center gap-2.5">
          <AssistantAura
            size="sm"
            state={voiceState}
            showStatusLabel={false}
          />
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-stone-900 flex items-center gap-1.5">
              <span>Asistan</span>
              {autoSpeak && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-sm font-medium border border-amber-200/40">
                  Sesli Yanıt
                </span>
              )}
            </h2>
            <p className="text-[11px] text-stone-500">
              {voiceState === 'listening'
                ? 'Seni dinliyor...'
                : voiceState === 'thinking'
                ? 'Düşünüyor...'
                : voiceState === 'speaking'
                ? 'Konuşuyor...'
                : 'Her an dinlemeye ve hatırlamaya hazır'}
            </p>
          </div>
        </div>

        {/* Canlı Durum İndikatörü ve Sesli Okuma Butonu */}
        <div className="flex items-center gap-2">
          {/* Sesli Okuma Aç/Kapat Butonu */}
          {isSpeechSynthesisSupported && (
            <button
              id="toggle-voice-auto-speak"
              onClick={onToggleAutoSpeak}
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                autoSpeak
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-stone-200 bg-white text-stone-400 hover:text-stone-600'
              }`}
              title={autoSpeak ? 'Sesli yanıt açık (Kapat)' : 'Sesli yanıt kapalı (Aç)'}
            >
              {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 border ${
              voiceState === 'listening'
                ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                : voiceState === 'speaking'
                ? 'bg-orange-100/80 border-orange-300 text-orange-900'
                : voiceState === 'thinking'
                ? 'bg-stone-100 border-stone-300 text-stone-700'
                : 'bg-emerald-50/80 border-emerald-200/50 text-emerald-900'
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  voiceState === 'listening'
                    ? 'bg-amber-500'
                    : voiceState === 'speaking'
                    ? 'bg-orange-500'
                    : voiceState === 'thinking'
                    ? 'bg-stone-500'
                    : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  voiceState === 'listening'
                    ? 'bg-amber-600'
                    : voiceState === 'speaking'
                    ? 'bg-orange-600'
                    : voiceState === 'thinking'
                    ? 'bg-stone-700'
                    : 'bg-emerald-600'
                }`}
              />
            </span>
            <span className="text-[10px] font-medium tracking-tight">
              {voiceState === 'listening'
                ? 'Dinliyor'
                : voiceState === 'thinking'
                ? 'Düşünüyor'
                : voiceState === 'speaking'
                ? 'Konuşuyor'
                : 'Hazır'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ferah ve Doğal Mesaj Akışı */}
      <div className="flex-1 overflow-y-auto space-y-6 px-1 pr-1.5 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const currentStatus = actionStatus[msg.id];
          const isActionAccepted = currentStatus === 'accepted' || msg.suggestedAction?.isAccepted;
          const isActionDeclined = currentStatus === 'declined' || msg.suggestedAction?.isDeclined;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {isUser ? (
                /* Kullanıcı Mesajı */
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-stone-900 px-4 py-3 text-stone-50 text-sm shadow-xs">
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <span className="mt-1 block text-[10px] text-stone-400 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              ) : (
                /* Asistan Mesajı */
                <div className="max-w-[92%] sm:max-w-[85%] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100/80 text-amber-800">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-stone-800 leading-relaxed font-normal">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>

                      {/* API anahtarı uyarısı için hızlı Ayarlar butonu */}
                      {(msg.text.includes('Ayarlar') || msg.text.includes('API anahtar')) && onOpenSettings && (
                        <div className="mt-2.5">
                          <button
                            id="msg-open-settings-btn"
                            type="button"
                            onClick={onOpenSettings}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Settings className="h-3.5 w-3.5 text-amber-700" />
                            <span>Ayarları Aç ve API Anahtarını Gir</span>
                          </button>
                        </div>
                      )}

                      <span className="mt-1 block text-[10px] text-stone-400">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Önerilen Eylem Kartı (Onay veya Vazgeç Seçenekleri) */}
                  {msg.suggestedAction && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="ml-7 mt-1.5"
                    >
                      {msg.suggestedAction.type === 'create_task' ? (
                        <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900 shrink-0">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-amber-950 block truncate">
                                {msg.suggestedAction.payload.dueDate || 'Yarın'}
                                {msg.suggestedAction.payload.time ? ` ${msg.suggestedAction.payload.time}` : ''} — {msg.suggestedAction.payload.title}
                              </span>
                              <span className="text-[10px] text-amber-800">
                                Ajandana görev olarak kaydedilsin mi?
                              </span>
                            </div>
                          </div>

                          {/* Durum veya Onay / Vazgeç Butonları */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/40">
                            {isActionAccepted ? (
                              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/90 px-3 py-1 font-medium text-emerald-800 text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Görevin Eklendi</span>
                              </div>
                            ) : isActionDeclined ? (
                              <div className="rounded-lg bg-stone-100 px-3 py-1 text-stone-500 text-xs font-normal">
                                Vazgeçildi
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`decline-task-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleActionDecline(msg.id)}
                                  className="rounded-lg border border-stone-200/80 bg-white/80 px-2.5 py-1.5 text-stone-600 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer font-medium"
                                >
                                  Vazgeç
                                </button>
                                <button
                                  id={`accept-task-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleActionAccept(msg.id, msg.suggestedAction!)}
                                  className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer shadow-xs"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  <span>Görevi Ekle</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 shrink-0">
                              <Brain className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-emerald-950 block truncate">
                                {msg.suggestedAction.payload.title}
                              </span>
                              <span className="text-[10px] text-emerald-800 line-clamp-1">
                                {msg.suggestedAction.payload.detail || 'Zihin Bankası\'nda hatırlanabilir'}
                              </span>
                            </div>
                          </div>

                          {/* Durum veya Onay / Vazgeç Butonları */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200/40">
                            {isActionAccepted ? (
                              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/90 px-3 py-1 font-medium text-emerald-800 text-xs">
                                <Check className="h-3.5 w-3.5" />
                                <span>Zihne Kaydedildi</span>
                              </div>
                            ) : isActionDeclined ? (
                              <div className="rounded-lg bg-stone-100 px-3 py-1 text-stone-500 text-xs font-normal">
                                Vazgeçildi
                              </div>
                            ) : (
                              <>
                                <button
                                  id={`decline-memory-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleActionDecline(msg.id)}
                                  className="rounded-lg border border-stone-200/80 bg-white/80 px-2.5 py-1.5 text-stone-600 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer font-medium"
                                >
                                  Vazgeç
                                </button>
                                <button
                                  id={`accept-memory-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleActionAccept(msg.id, msg.suggestedAction!)}
                                  className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer shadow-xs"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Zihne Kaydet</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Asistan Düşünürken Gösterge */}
        {voiceState === 'thinking' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 text-stone-500 text-xs py-2 px-1"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100/80 text-amber-800">
              <Sparkles className="h-3 w-3 animate-spin" />
            </div>
            <span className="italic">Düşünüyor ve hazırlıyor...</span>
          </motion.div>
        )}

        {/* Sesli Dinleme Dalgası Görsel Durumu */}
        <AnimatePresence>
          {voiceState === 'listening' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-4 px-6 rounded-2xl bg-amber-50/90 border border-amber-200/70 text-center space-y-2"
            >
              <div className="flex items-center gap-1 h-6">
                {[35, 70, 95, 60, 90, 45, 80, 50].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ height: ['8px', `${h}%`, '8px'] }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: i * 0.07,
                      ease: 'easeInOut',
                    }}
                    className="w-1 rounded-full bg-amber-600"
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-stone-800">
                Seni dinliyorum... Konuşmayı bitirdiğinde otomatik iletilecektir.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Asistan Konuşurken Durdurma Çubuğu */}
        <AnimatePresence>
          {voiceState === 'speaking' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between py-2 px-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 animate-pulse text-orange-600" />
                <span className="font-medium">Sesli olarak yanıt veriyor...</span>
              </div>
              <button
                id="stop-speaking-btn"
                onClick={onStopSpeaking}
                className="flex items-center gap-1 rounded-md bg-white border border-orange-200 px-2 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                <Square className="h-3 w-3 fill-stone-600 text-stone-600" />
                <span>Sustur</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Ses Hatası Uyarısı (Mikrofon İzni vb.) */}
      {voiceError && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            onClick={onClearVoiceError}
            className="p-1 text-stone-500 hover:text-stone-800 cursor-pointer"
            title="Kapat"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3. Hızlı Sohbet İpuçları */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            id={`quick-prompt-${idx}`}
            onClick={() => {
              if (voiceState === 'thinking') return;
              onSendMessage(prompt, false);
            }}
            disabled={voiceState === 'thinking'}
            className="whitespace-nowrap rounded-full border border-stone-200/90 bg-white/95 px-3 py-1.5 text-xs text-stone-700 hover:border-amber-300 hover:bg-amber-50/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 4. PREMIUM MOBİL KONUŞMA ALANI & VURGULANMIŞ MİKROFON BUTONU */}
      <div className="mt-2">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-stone-200/90 bg-white p-1.5 shadow-[0_4px_16px_rgba(28,25,23,0.04)] focus-within:border-stone-400 focus-within:ring-2 focus-within:ring-amber-200/50 transition-all"
        >
          {/* Öne Çıkarılmış Sesli Konuşma / Mikrofon Butonu */}
          <button
            id="chat-voice-btn"
            type="button"
            onClick={handleVoiceToggle}
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${
              voiceState === 'listening'
                ? 'bg-amber-600 text-white ring-4 ring-amber-200 shadow-md scale-105'
                : voiceState === 'speaking'
                ? 'bg-orange-500 text-white ring-4 ring-orange-200'
                : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/70'
            }`}
            title={
              voiceState === 'listening'
                ? 'Dinlemeyi durdur'
                : voiceState === 'speaking'
                ? 'Sesi durdur'
                : isSpeechRecognitionSupported
                ? 'Sesli konuşma başlat'
                : 'Mikrofon desteklenmiyor'
            }
          >
            {voiceState === 'listening' ? (
              <MicOff className="h-5 w-5 animate-pulse" />
            ) : voiceState === 'speaking' ? (
              <Square className="h-4 w-4 fill-white" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          {/* Metin Giriş Alanı */}
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 250);
            }}
            disabled={voiceState === 'thinking'}
            placeholder={
              voiceState === 'listening'
                ? 'Sesini dinliyor... veya yazabilirsin'
                : voiceState === 'thinking'
                ? 'Asistan düşünüyor...'
                : 'Bir şeyler söyle, sor veya planla...'
            }
            className="flex-1 bg-transparent px-2.5 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:opacity-60"
          />

          {/* Gönder Butonu */}
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || voiceState === 'thinking'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-white disabled:opacity-20 hover:bg-stone-800 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Gönder"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
