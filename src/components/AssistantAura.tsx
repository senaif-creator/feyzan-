import React from 'react';
import { motion } from 'motion/react';

export type AuraState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AssistantAuraProps {
  state?: AuraState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showStatusLabel?: boolean;
}

export const AssistantAura: React.FC<AssistantAuraProps> = ({
  state = 'idle',
  size = 'lg',
  onClick,
  showStatusLabel = true,
}) => {
  const sizeMap = {
    sm: { container: 'h-10 w-10', core: 'h-6 w-6', blur: 'blur-md' },
    md: { container: 'h-20 w-20', core: 'h-12 w-12', blur: 'blur-lg' },
    lg: { container: 'h-44 w-44 sm:h-48 sm:w-48', core: 'h-24 w-24 sm:h-28 sm:w-28', blur: 'blur-xl' },
  };

  const currentSize = sizeMap[size];

  // Duruma göre metin
  const statusLabel =
    state === 'listening'
      ? 'Dinliyor...'
      : state === 'thinking'
      ? 'Düşünüyor...'
      : state === 'speaking'
      ? 'Konuşuyor...'
      : 'Konuşmaya hazır';

  // Animasyon ölçekleri
  const getOuterScale = () => {
    switch (state) {
      case 'listening':
        return [1, 1.3, 1.1];
      case 'thinking':
        return [1, 1.15, 0.98, 1];
      case 'speaking':
        return [1, 1.25, 1.05, 1.2, 1];
      default:
        return [1, 1.12, 1];
    }
  };

  const getOuterOpacity = () => {
    switch (state) {
      case 'listening':
        return [0.45, 0.85, 0.5];
      case 'thinking':
        return [0.3, 0.6, 0.3];
      case 'speaking':
        return [0.5, 0.9, 0.6];
      default:
        return [0.35, 0.55, 0.35];
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center select-none ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <div className={`relative flex items-center justify-center ${currentSize.container}`}>
        {/* Dış Halka 1: Yumuşak Işık Halesi (Ambient Warmth) */}
        <motion.div
          animate={{
            scale: getOuterScale(),
            opacity: getOuterOpacity(),
          }}
          transition={{
            duration: state === 'listening' ? 2 : state === 'speaking' ? 1.4 : 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-200/50 via-orange-100/40 to-stone-200/30 ${currentSize.blur}`}
        />

        {/* Dış Halka 2: İkincil Organik Titreşim Dalgası */}
        <motion.div
          animate={{
            scale: state === 'listening' ? [1.1, 1.35, 1.15] : [1.05, 1.2, 1.05],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0.2, 0.45, 0.2],
          }}
          transition={{
            scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
            opacity: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
          className={`absolute inset-1 rounded-full bg-radial from-amber-300/30 via-stone-200/20 to-transparent ${currentSize.blur}`}
        />

        {/* İnce Altın Yansıma Çemberi (Delicate Ring) */}
        <motion.div
          animate={{
            scale: state === 'listening' ? [0.95, 1.08, 0.98] : [0.98, 1.03, 0.98],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-4 rounded-full border border-amber-300/40 shadow-[0_0_24px_rgba(245,158,11,0.15)]"
        />

        {/* Işıltılı İç Çekirdek (Glowing Inner Core) */}
        <motion.div
          animate={{
            scale: state === 'listening' ? [1, 1.1, 1] : [1, 1.04, 1],
            boxShadow:
              state === 'listening'
                ? [
                    '0 0 30px rgba(245, 158, 11, 0.35)',
                    '0 0 50px rgba(245, 158, 11, 0.6)',
                    '0 0 30px rgba(245, 158, 11, 0.35)',
                  ]
                : [
                    '0 0 20px rgba(217, 119, 6, 0.18)',
                    '0 0 35px rgba(245, 158, 11, 0.28)',
                    '0 0 20px rgba(217, 119, 6, 0.18)',
                  ],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`${currentSize.core} relative flex items-center justify-center rounded-full bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E7] to-[#F2E5D0] border border-amber-100/90 shadow-sm transition-transform duration-300 group-hover:scale-105`}
        >
          {/* İç Işık Parıltısı */}
          <div className="h-2 w-2 rounded-full bg-amber-400/80 blur-[1px] animate-pulse" />
        </motion.div>

        {/* Mikrofon/Etkileşim Çağrısı Küçük Rozeti (Sadece büyük boyutta) */}
        {size === 'lg' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-1 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 shadow-sm border border-stone-200/70 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-[11px] font-medium text-stone-700 tracking-tight">
              {statusLabel}
            </span>
          </motion.div>
        )}
      </div>

      {/* Alt Açıklama (Opsiyonel) */}
      {showStatusLabel && size === 'lg' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-stone-500 font-normal tracking-wide text-center"
        >
          Dokunarak sohbete başla veya seslen
        </motion.p>
      )}
    </div>
  );
};
