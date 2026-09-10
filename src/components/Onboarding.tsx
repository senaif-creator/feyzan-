import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AssistantAura } from './AssistantAura';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      const finalName = name.trim() || 'Dostum';
      onComplete(finalName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FAF8F5] px-4 py-8">
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-[0_8px_32px_rgba(28,25,23,0.06)] text-center flex flex-col items-center"
            >
              {/* Canlı Asistan Varlığı (Aura) */}
              <div className="my-3">
                <AssistantAura size="md" state="idle" showStatusLabel={false} />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mt-2 mb-2">
                Merhaba
              </h1>
              <p className="text-sm font-medium text-stone-700 mb-2">
                Ben senin kişisel asistanınım.
              </p>
              <p className="text-stone-500 text-xs sm:text-sm leading-relaxed mb-6 max-w-xs">
                Günün ritmini korumana, yapılacakları organize etmene ve zihnini hafifletmene yardımcı olmaya hazırım.
              </p>

              <button
                id="onboarding-continue-btn"
                onClick={handleNext}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-medium text-white transition-all hover:bg-stone-800 active:scale-95 cursor-pointer shadow-xs"
              >
                <span>Tanışalım</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-[0_8px_32px_rgba(28,25,23,0.06)] text-center flex flex-col items-center"
            >
              <div className="my-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60">
                <Sparkles className="h-6 w-6" />
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-stone-900 mb-1.5">
                Nasıl Hitap Edeyim?
              </h2>
              <p className="text-stone-500 text-xs sm:text-sm mb-5">
                Seni sana en samimi gelen isminle hatırlayayım.
              </p>

              <div className="w-full mb-6">
                <input
                  id="onboarding-name-input"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="İsmin veya takma adın..."
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-center text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <button
                id="onboarding-start-btn"
                onClick={handleNext}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-3.5 text-sm font-medium text-white transition-all hover:bg-stone-800 active:scale-95 cursor-pointer shadow-xs"
              >
                <span>Güne Başla</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
