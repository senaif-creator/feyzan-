/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { AssistantView } from './components/AssistantView';
import { MemoryBankView } from './components/MemoryBankView';
import { TasksView } from './components/TasksView';
import { Onboarding } from './components/Onboarding';
import {
  TabType,
  UserProfile,
  TaskItem,
  MemoryItem,
  ChatMessage,
} from './types';
import {
  INITIAL_MEMORIES,
  INITIAL_TASKS,
  INITIAL_MESSAGES,
} from './data/mockData';
import { sendChatMessageToAssistant } from './services/aiService';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { SettingsModal } from './components/SettingsModal';
import { hasStoredGeminiApiKey } from './services/apiKeyStorage';

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => hasStoredGeminiApiKey());

  // Kullanıcı Profili ve Onboarding durumu
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('personal_ai_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Kayıtlı profil okunamadı', e);
      }
    }
    return {
      name: '',
      isOnboarded: false,
      dailyFocus: 'Bugünkü işleri telaşsız ve odaklanarak tamamlamak.',
    };
  });

  // Navigasyon Sekmesi
  const [currentTab, setCurrentTab] = useState<TabType>('today');

  // Görevler
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('personal_ai_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Kayıtlı görevler okunamadı', e);
      }
    }
    return INITIAL_TASKS;
  });

  // Zihin Bankası (Hafıza)
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    const saved = localStorage.getItem('personal_ai_memories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Kayıtlı anılar okunamadı', e);
      }
    }
    return INITIAL_MEMORIES;
  });

  // Sohbet Mesajları
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('personal_ai_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Kayıtlı mesajlar okunamadı', e);
      }
    }
    return INITIAL_MESSAGES;
  });

  const [initialInputForAssistant, setInitialInputForAssistant] = useState('');
  const [autoStartVoice, setAutoStartVoice] = useState(false);

  // Sesli asistan kontrolcüsü
  const voice = useVoiceAssistant();

  // LocalStorage senkronizasyonu
  useEffect(() => {
    localStorage.setItem('personal_ai_user', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('personal_ai_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('personal_ai_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem('personal_ai_messages', JSON.stringify(messages));
  }, [messages]);

  // Onboarding tamamlama
  const handleCompleteOnboarding = (name: string) => {
    setUserProfile((prev) => ({
      ...prev,
      name,
      isOnboarded: true,
    }));
  };

  // İsim güncelleme
  const handleUpdateName = (newName: string) => {
    setUserProfile((prev) => ({ ...prev, name: newName }));
  };

  // Günlük odak güncelleme
  const handleUpdateDailyFocus = (newFocus: string) => {
    setUserProfile((prev) => ({ ...prev, dailyFocus: newFocus }));
  };

  // Görev tamamla / kaldır
  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  // Yeni görev ekleme
  const handleAddTask = (newTask: Omit<TaskItem, 'id'>) => {
    const task: TaskItem = {
      ...newTask,
      id: 'task-' + Date.now(),
    };
    setTasks((prev) => [task, ...prev]);
  };

  // Görev silme
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Hafıza ekleme
  const handleAddMemory = (newMemory: Omit<MemoryItem, 'id' | 'savedAt'>) => {
    const memory: MemoryItem = {
      ...newMemory,
      id: 'mem-' + Date.now(),
      savedAt: 'Az önce',
    };
    setMemories((prev) => [memory, ...prev]);
  };

  // Hafıza güncelleme
  const handleUpdateMemory = (id: string, updated: Partial<MemoryItem>) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
    );
  };

  // Hafıza silme
  const handleDeleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Önerilen eylemi reddetme (Vazgeç)
  const handleDeclineAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.suggestedAction
          ? {
              ...m,
              suggestedAction: {
                ...m.suggestedAction,
                isDeclined: true,
              },
            }
          : m
      )
    );
  };

  // Gerçek Gemini API destekli mesaj gönderme & akıllı asistan yanıtı
  const handleSendMessage = async (userText: string, fromVoice: boolean = false) => {
    if (!userText.trim()) return;

    const nowTime = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage: ChatMessage = {
      id: 'msg-user-' + Date.now(),
      sender: 'user',
      text: userText.trim(),
      timestamp: nowTime,
    };

    // Mesaj listesini güncelle
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    console.log('[GEMINI_REQUEST]', { fromVoice, textLength: userText.trim().length });

    // Asistan durumu: Düşünüyor
    voice.setVoiceState('thinking');

    try {
      const response = await sendChatMessageToAssistant({
        message: userText.trim(),
        history: updatedMessages,
        userProfile,
        currentTasks: tasks,
        memories,
      });

      const assistantMessage: ChatMessage = {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        suggestedAction: response.suggestedAction || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Sesli yanıt (Kullanıcı sesle sorduysa veya otomatik sesli okuma açıksa)
      if ((fromVoice || voice.autoSpeak) && response.text) {
        voice.speak(response.text);
      } else {
        voice.setVoiceState('idle');
      }
    } catch (err) {
      console.error('Asistan yanıtı alınırken hata:', err);
      const fallbackMessage: ChatMessage = {
        id: 'msg-asst-' + Date.now(),
        sender: 'assistant',
        text: 'Şu anda bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.',
        timestamp: new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      voice.setVoiceState('idle');
    }
  };

  // Bugün ekranından hızlı sohbete başlama
  const handleStartConversation = (text: string) => {
    setCurrentTab('assistant');
    setInitialInputForAssistant(text);
    handleSendMessage(text, false);
  };

  // Bugün ekranından "Konuşmaya Başla" butonuyla sesli sohbete başlama
  const handleStartVoiceConversation = () => {
    setAutoStartVoice(true);
    setCurrentTab('assistant');
  };

  const pendingTasksCount = tasks.filter((t) => !t.isCompleted).length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col justify-between">
      {/* 1. Onboarding Ekranı (İlk açılış kontrolü) */}
      {!userProfile.isOnboarded && (
        <Onboarding onComplete={handleCompleteOnboarding} />
      )}

      {/* 2. Üst Header */}
      <Header
        userProfile={userProfile}
        onUpdateName={handleUpdateName}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasApiKey={hasApiKey}
      />

      {/* 3. Ana İçerik Alanı (Mobil Odaklı Ölçeklendirme) */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-3">
        {currentTab === 'today' && (
          <TodayView
            userProfile={userProfile}
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
            onUpdateDailyFocus={handleUpdateDailyFocus}
            onStartConversation={handleStartConversation}
            onStartVoiceConversation={handleStartVoiceConversation}
            voiceState={voice.voiceState}
          />
        )}

        {currentTab === 'assistant' && (
          <AssistantView
            messages={messages}
            onSendMessage={handleSendMessage}
            onAddTask={handleAddTask}
            onAddMemory={handleAddMemory}
            onDeclineAction={handleDeclineAction}
            initialInput={initialInputForAssistant}
            autoStartVoice={autoStartVoice}
            onVoiceStarted={() => setAutoStartVoice(false)}
            voiceState={voice.voiceState}
            voiceError={voice.voiceError}
            onClearVoiceError={voice.clearVoiceError}
            isSpeechRecognitionSupported={voice.isSpeechRecognitionSupported}
            isSpeechSynthesisSupported={voice.isSpeechSynthesisSupported}
            onStartVoice={voice.startListening}
            onStopVoice={voice.stopListening}
            onStopSpeaking={voice.stopSpeaking}
            autoSpeak={voice.autoSpeak}
            onToggleAutoSpeak={() => voice.setAutoSpeak(!voice.autoSpeak)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            hasApiKey={hasApiKey}
          />
        )}

        {currentTab === 'memory' && (
          <MemoryBankView
            memories={memories}
            onAddMemory={handleAddMemory}
            onUpdateMemory={handleUpdateMemory}
            onDeleteMemory={handleDeleteMemory}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>

      {/* 4. Alt Gezinme Çubuğu */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        pendingTasksCount={pendingTasksCount}
        memoryCount={memories.length}
      />

      {/* 5. Uygulama & Gemini API Ayarları Modalı */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeyUpdated={() => setHasApiKey(hasStoredGeminiApiKey())}
      />
    </div>
  );
}
