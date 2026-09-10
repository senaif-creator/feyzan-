export type TabType = 'today' | 'assistant' | 'memory' | 'tasks';

export type MemoryCategory = 'preferences' | 'people' | 'goals' | 'notes';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  savedAt: string;
  source?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string; // 'Bugün', 'Yarın', 'Pazartesi', '12 Ekim' vb.
  time?: string;
  category?: 'today' | 'upcoming';
  priority?: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  source?: 'manual' | 'assistant';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'create_task' | 'save_memory';
    payload: {
      title: string;
      dueDate?: string;
      time?: string;
      category?: MemoryCategory;
      detail?: string;
      priority?: 'low' | 'medium' | 'high';
    };
    isAccepted?: boolean;
    isDeclined?: boolean;
  };
}

export interface UserProfile {
  name: string;
  isOnboarded: boolean;
  dailyFocus: string;
}

declare global {
  interface Window {
    AndroidSpeech?: {
      isAvailable: () => boolean;
      startListening: (language?: string) => void;
      stopListening: () => void;
      cancel: () => void;
    };
    AndroidGemini?: {
      sendGeminiRequest: (
        apiKey: string,
        payloadJson: string,
        modelName?: string,
        callbackId?: string
      ) => void;
    };
    onAndroidGeminiResponse?: (
      callbackId: string,
      success: boolean,
      statusCode: number,
      bodyOrError: string
    ) => void;
    onAndroidSpeechResult?: (transcript: string, isFinal: boolean) => void;
    onAndroidSpeechError?: (code: number, message: string) => void;
    onAndroidSpeechState?: (state: string) => void;
  }
}
