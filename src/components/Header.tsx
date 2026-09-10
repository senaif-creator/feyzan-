import React, { useState } from 'react';
import { User, Edit3, Check, Download, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import { isMobileAppEnvironment } from '../services/aiService';

interface HeaderProps {
  userProfile: UserProfile;
  onUpdateName: (newName: string) => void;
  onOpenSettings?: () => void;
  hasApiKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  onUpdateName,
  onOpenSettings,
  hasApiKey,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userProfile.name);

  // Günün tarihini Türkçe formatta alalım
  const todayFormatted = new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/60 bg-[#FAF8F5]/90 backdrop-blur-md px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {/* Sol: İnce Asistan Kimliği & Durum */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-100 to-orange-50 border border-amber-200/60 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-stone-900 leading-tight">
              Kişisel Asistan
            </span>
            <span className="text-[10px] text-stone-600 font-medium capitalize">
              {todayFormatted}
            </span>
          </div>
        </div>

        {/* Sağ: APK İndir Butonu, Ayarlar ve Kullanıcı İsim Alanı */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenSettings && (
            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                hasApiKey
                  ? 'border-stone-200/80 bg-white/90 text-stone-700 hover:border-stone-300 hover:bg-white'
                  : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
              title="Gemini API Anahtarı ve Ayarlar"
            >
              <Settings className="h-3 w-3 text-stone-500" />
              <span className="hidden xs:inline">Ayarlar</span>
              {!hasApiKey && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          )}

          {!isMobileAppEnvironment() && (
            <a
              id="download-apk-header-btn"
              href="/personal-ai-assistant-debug.apk"
              download="personal-ai-assistant-debug.apk"
              className="flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Android APK dosyasını indir (209 KB)"
            >
              <Download className="h-3 w-3 text-emerald-600" />
              <span className="hidden sm:inline">APK'yı İndir</span>
              <span className="sm:hidden">APK</span>
            </a>
          )}

          <div className="relative">
          {isEditingName ? (
            <div className="flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs shadow-xs">
              <input
                id="header-name-input"
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                className="w-20 bg-transparent text-xs font-medium text-stone-800 outline-none"
                autoFocus
              />
              <button
                id="header-save-name-btn"
                onClick={handleSaveName}
                className="text-emerald-700 hover:text-emerald-800 cursor-pointer"
                title="Kaydet"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-profile-btn"
              onClick={() => {
                setTempName(userProfile.name);
                setIsEditingName(true);
              }}
              className="flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/90 px-3 py-1 text-xs font-medium text-stone-700 hover:border-amber-300 hover:bg-white transition-all cursor-pointer shadow-2xs"
              title="İsmini düzenle"
            >
              <User className="h-3 w-3 text-stone-400" />
              <span>{userProfile.name || 'Ben'}</span>
              <Edit3 className="h-2.5 w-2.5 text-stone-400 opacity-60" />
            </button>
          )}
        </div>
        </div>
      </div>
    </header>
  );
};
