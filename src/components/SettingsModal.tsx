import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Check,
  RotateCcw,
  X,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import {
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  removeStoredGeminiApiKey,
  hasStoredGeminiApiKey,
} from '../services/apiKeyStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKeyExists, setSavedKeyExists] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentKey = getStoredGeminiApiKey();
      setApiKeyInput(currentKey);
      setSavedKeyExists(Boolean(currentKey));
      setSuccessMessage(null);
      setErrorMessage(null);
      setShowKey(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      removeStoredGeminiApiKey();
      setSavedKeyExists(false);
      setSuccessMessage('API anahtarı temizlendi.');
      setErrorMessage(null);
      if (onKeyUpdated) onKeyUpdated();
      return;
    }

    setStoredGeminiApiKey(trimmed);
    setSavedKeyExists(true);
    setSuccessMessage('Gemini API anahtarınız bu cihaza kaydedildi.');
    setErrorMessage(null);
    if (onKeyUpdated) onKeyUpdated();
  };

  const handleReset = () => {
    removeStoredGeminiApiKey();
    setApiKeyInput('');
    setSavedKeyExists(false);
    setSuccessMessage('API anahtarı kaldırıldı.');
    setErrorMessage(null);
    if (onKeyUpdated) onKeyUpdated();
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim() || getStoredGeminiApiKey();
    if (!keyToTest) {
      setErrorMessage('Lütfen önce test edilecek API anahtarını girin.');
      return;
    }

    setIsTesting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (!navigator.onLine) {
        setErrorMessage('İnternet bağlantısı yok.');
        setIsTesting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Selam, tek kelimelik Türkçe bir selam ver.',
      });

      if (response?.text) {
        setStoredGeminiApiKey(keyToTest);
        setSavedKeyExists(true);
        setSuccessMessage('✓ Harika! Gemini API anahtarı doğrulandı ve başarıyla yanıt verdi.');
        setErrorMessage(null);
        if (onKeyUpdated) onKeyUpdated();
      } else {
        setErrorMessage('Yanıt alınamadı. Anahtarınızı kontrol edin.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
        setErrorMessage('Geçersiz API anahtarı. Lütfen Google AI Studio anahtarınızı kontrol edin.');
      } else if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        setErrorMessage('İstek kotası aşımı (429). Lütfen biraz bekleyin.');
      } else {
        setErrorMessage('Bağlantı hatası: ' + (msg.length > 80 ? msg.substring(0, 80) + '...' : msg));
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    Gemini API Anahtarı
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Cihazınız üzerinden doğrudan bağlantı
                  </p>
                </div>
              </div>
              <button
                id="close-settings-modal-btn"
                onClick={onClose}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-stone-50 border border-stone-200/70 p-3 text-xs text-stone-600 space-y-1.5">
                <p className="font-medium text-stone-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Doğrudan Cihazdan Bağlantı
                </p>
                <p className="leading-relaxed">
                  Asistanınız hiçbir aracı sunucuya ihtiyaç duymadan doğrudan Google Gemini API ile konuşur.
                  Anahtarınız yalnızca bu cihazın yerel hafızasında (localStorage) saklanır.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-2 w-2 rounded-full ${
                      savedKeyExists ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="font-medium text-stone-800">
                    {savedKeyExists
                      ? 'API Anahtarı Tanımlı'
                      : 'API Anahtarı Henüz Girilmedi'}
                  </span>
                </div>
                {savedKeyExists && (
                  <button
                    id="reset-api-key-btn"
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 cursor-pointer"
                    title="Anahtarı sil"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Sil</span>
                  </button>
                )}
              </div>

              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  Google AI Studio Gemini API Anahtarı
                </label>
                <div className="relative flex items-center">
                  <input
                    id="gemini-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 pr-10 text-xs font-mono text-stone-800 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
                    title={showKey ? 'Gizle' : 'Göster'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-400">
                  Ücretsiz anahtarınızı aistudio.google.com adresinden alabilirsiniz.
                </p>
              </div>

              {/* Feedback messages */}
              {successMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Security note */}
              <div className="flex items-start gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="h-3.5 w-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>
                  Gizlilik Güvencesi: Anahtarınız başka hiçbir sunucuya iletilmez, yalnızca cihazınızda tutulur.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
              <button
                id="test-api-key-btn"
                type="button"
                onClick={handleTestKey}
                disabled={isTesting || !apiKeyInput.trim()}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isTesting ? 'Test Ediliyor...' : 'Anahtarı Test Et'}
              </button>

              <button
                id="save-api-key-btn"
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
