import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronRight,
  Edit2,
  Check,
  Mic,
  Sparkles,
  Quote,
} from 'lucide-react';
import { TaskItem, UserProfile } from '../types';
import { AssistantAura, AuraState } from './AssistantAura';

interface TodayViewProps {
  userProfile: UserProfile;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onNavigateToTab: (tab: 'assistant' | 'tasks') => void;
  onUpdateDailyFocus: (newFocus: string) => void;
  onStartConversation: (initialMessage: string) => void;
  onStartVoiceConversation?: () => void;
  voiceState?: AuraState;
}

export const TodayView: React.FC<TodayViewProps> = ({
  userProfile,
  tasks,
  onToggleTask,
  onNavigateToTab,
  onUpdateDailyFocus,
  onStartConversation,
  onStartVoiceConversation,
  voiceState = 'idle',
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [isEditingFocus, setIsEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState(userProfile.dailyFocus);

  // Günün vaktine göre nazik ve doğal karşılama
  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  // Bugünün en öncelikli görevi
  const upcomingTask =
    tasks.find((t) => !t.isCompleted && (t.category === 'today' || t.dueDate === 'Bugün')) ||
    tasks.find((t) => !t.isCompleted);

  const handleSaveFocus = () => {
    if (focusDraft.trim()) {
      onUpdateDailyFocus(focusDraft.trim());
    }
    setIsEditingFocus(false);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onStartConversation(quickInput.trim());
    setQuickInput('');
  };

  // Sesli komut veya aura tıklandığında doğrudan mikrofonu açarak asistana geç
  const handleStartVoice = () => {
    if (onStartVoiceConversation) {
      onStartVoiceConversation();
    } else {
      onNavigateToTab('assistant');
    }
  };

  return (
    <div className="space-y-7 pb-28 pt-1">
      {/* 1. ÜST KARŞILAMA VE GİRİŞ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center sm:text-left space-y-1"
      >
        <span className="text-xs font-semibold tracking-wider text-amber-800/90 uppercase">
          {getGreetingTime()}{userProfile.name ? `, ${userProfile.name}` : ''}
        </span>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 leading-tight">
          Bugün nasıl gidiyor?
        </h1>
        <p className="text-sm text-stone-600 max-w-md">
          Senin ritmine uyum sağlayan, zihnini sakinleştiren kişisel alanındasın.
        </p>
      </motion.div>

      {/* 2. ETKİLEYİCİ ASİSTAN VARLIĞI ALANI (ORGANİK IŞIK & AURA) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="relative flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-gradient-to-b from-amber-50/40 via-white/80 to-transparent border border-amber-100/60 shadow-[0_4px_24px_rgba(245,158,11,0.03)]"
      >
        {/* Canlı Organik Işık Varlığı */}
        <AssistantAura
          size="lg"
          state={voiceState}
          onClick={handleStartVoice}
          showStatusLabel={false}
        />

        {/* Hızlı Konuşma ve Sesli Eylem İpucu */}
        <div className="mt-4 flex flex-col items-center text-center max-w-xs">
          <p className="text-sm font-medium text-stone-800 leading-snug">
            “Neler düşünüyorsun? Birlikte bakalım.”
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              id="today-talk-aura-btn"
              onClick={handleStartVoice}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="h-3.5 w-3.5 text-amber-400" />
              <span>Konuşmaya Başla</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 3. BUGÜNÜN ODAĞI (Düz kart içine hapsetmeden, akıcı ve zarif tipografi) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="relative border-l-2 border-amber-600/70 pl-4 py-1"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-amber-900 uppercase">
            Bugünün Ana Odağı
          </span>

          {!isEditingFocus ? (
            <button
              id="today-edit-focus-btn"
              onClick={() => {
                setFocusDraft(userProfile.dailyFocus);
                setIsEditingFocus(true);
              }}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors cursor-pointer py-0.5"
            >
              <Edit2 className="h-3 w-3" />
              <span className="text-[11px]">Düzenle</span>
            </button>
          ) : (
            <button
              id="today-save-focus-btn"
              onClick={handleSaveFocus}
              className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Kaydet</span>
            </button>
          )}
        </div>

        {isEditingFocus ? (
          <div className="mt-2">
            <input
              type="text"
              value={focusDraft}
              onChange={(e) => setFocusDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveFocus()}
              placeholder="Bugün için zihnindeki en önemli niyet nedir?"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none"
              autoFocus
            />
          </div>
        ) : (
          <p className="mt-1 text-base sm:text-lg font-medium text-stone-900 leading-snug">
            {userProfile.dailyFocus || 'Günü dengeli ve telaşsız tamamlamak.'}
          </p>
        )}
      </motion.div>

      {/* 4. YAKLAŞAN GÖREV / PLAN (Sadece gerçekten gerekli bilgiyi kart olarak sun) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-[0_2px_12px_rgba(28,25,23,0.03)]"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-stone-400" />
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Sırada Ne Var?
            </span>
          </div>

          <button
            id="today-all-tasks-link"
            onClick={() => onNavigateToTab('tasks')}
            className="flex items-center gap-0.5 text-xs font-medium text-amber-800 hover:text-amber-900 transition-colors cursor-pointer"
          >
            <span>Görevler</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {upcomingTask ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF8F5] p-3 border border-stone-100">
            <div className="flex items-center gap-3 min-w-0">
              <button
                id={`today-task-toggle-${upcomingTask.id}`}
                onClick={() => onToggleTask(upcomingTask.id)}
                className="text-stone-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
              >
                {upcomingTask.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {upcomingTask.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                  <span>{upcomingTask.dueDate}</span>
                  {upcomingTask.time && (
                    <>
                      <span>•</span>
                      <span>{upcomingTask.time}</span>
                    </>
                  )}
                  {upcomingTask.priority === 'high' && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                      Öncelikli
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500 py-1 font-normal">
            Şu an bekleyen acil bir görev yok. Ritmini koruyorsun.
          </p>
        )}
      </motion.div>

      {/* 5. ASİSTANIN SAKİN BİR DÜŞÜNCESİ (Doğal akış) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="flex items-start gap-3 rounded-2xl bg-amber-50/40 border border-amber-100/70 p-3.5 text-xs text-stone-700"
      >
        <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-stone-900">Küçük bir hatırlatma: </strong>
          Günün ortasında derin bir nefes alıp zihnini dinlendirmek sonraki saatleri çok daha verimli kılar.
        </p>
      </motion.div>

      {/* 6. HIZLI SES & MESAJ DİYALOG GİRİŞİ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-2xl border border-stone-200/90 bg-white p-2 shadow-[0_2px_12px_rgba(28,25,23,0.04)]"
      >
        <form onSubmit={handleQuickSubmit} className="flex items-center gap-1.5">
          <input
            id="today-quick-chat-input"
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="Asistanına bir şey sor veya planla..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />

          <button
            id="today-voice-trigger-btn"
            type="button"
            onClick={handleStartVoice}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
            title="Konuşmaya Başla (Sesli Komut)"
          >
            <Mic className="h-4 w-4" />
          </button>

          <button
            id="today-quick-chat-send-btn"
            type="submit"
            disabled={!quickInput.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white disabled:opacity-20 hover:bg-stone-800 transition-all cursor-pointer shrink-0"
            title="Gönder"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
