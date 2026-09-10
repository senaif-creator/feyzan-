import { GoogleGenAI, Type } from '@google/genai';
import { ChatMessage, TaskItem, MemoryItem, UserProfile } from '../types';
import { getStoredGeminiApiKey } from './apiKeyStorage';

export interface AssistantApiResponse {
  text: string;
  suggestedAction?: ChatMessage['suggestedAction'] | null;
  error?: string;
}

/**
 * Detects if running inside the packaged Android APK / Capacitor (file:// or capacitor://)
 */
export function isMobileAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'file:' ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' &&
      window.location.port !== '3000' &&
      window.location.port !== '5173')
  );
}

/**
 * Helper to call Gemini via Android native HttpsURLConnection bridge
 */
function callGeminiViaNativeBridge(
  apiKey: string,
  modelName: string,
  payload: any
): Promise<{ text?: string }> {
  return new Promise((resolve, reject) => {
    if (!window.AndroidGemini || typeof window.AndroidGemini.sendGeminiRequest !== 'function') {
      reject(new Error('AndroidGemini bridge not available'));
      return;
    }

    const callbackId = 'gemini_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const payloadJson = JSON.stringify(payload);

    const timeout = setTimeout(() => {
      delete (window as any)['__cb_' + callbackId];
      reject(new Error('TIMEOUT'));
    }, 45000);

    const prevHandler = window.onAndroidGeminiResponse;
    window.onAndroidGeminiResponse = (cbId: string, success: boolean, statusCode: number, bodyOrError: string) => {
      if (cbId !== callbackId) {
        if (typeof prevHandler === 'function') {
          prevHandler(cbId, success, statusCode, bodyOrError);
        }
        return;
      }

      clearTimeout(timeout);
      window.onAndroidGeminiResponse = prevHandler;

      if (!success) {
        let parsedErrorMsg = '';
        try {
          const errObj = JSON.parse(bodyOrError);
          parsedErrorMsg = errObj?.error?.message || errObj?.message || '';
        } catch {
          parsedErrorMsg = bodyOrError || '';
        }
        const err: any = new Error(parsedErrorMsg || `HTTP ${statusCode}`);
        err.status = statusCode;
        reject(err);
        return;
      }

      try {
        const json = JSON.parse(bodyOrError);
        const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        resolve({ text: candidateText });
      } catch (e: any) {
        reject(new Error('Failed to parse Gemini response: ' + (e?.message || 'JSON error')));
      }
    };

    try {
      window.AndroidGemini.sendGeminiRequest(apiKey, payloadJson, modelName, callbackId);
    } catch (e) {
      clearTimeout(timeout);
      window.onAndroidGeminiResponse = prevHandler;
      reject(e);
    }
  });
}

/**
 * Direct client-side Gemini AI caller (runs entirely in APK / browser without backend server).
 * API key is stored locally in the user's device localStorage.
 */
export async function sendChatMessageToAssistant(params: {
  message: string;
  history: ChatMessage[];
  userProfile: UserProfile;
  currentTasks: TaskItem[];
  memories: MemoryItem[];
}): Promise<AssistantApiResponse> {
  const { message, history, userProfile, currentTasks, memories } = params;

  if (!message || !message.trim()) {
    return {
      text: 'Lütfen bir mesaj belirtin.',
      suggestedAction: null,
      error: 'EMPTY_MESSAGE',
    };
  }

  const apiKey = getStoredGeminiApiKey();
  if (!apiKey) {
    return {
      text: 'Gemini ile konuşabilmek için lütfen sağ üstteki Ayarlar simgesine dokunup ücretsiz Gemini API anahtarınızı girin.',
      suggestedAction: null,
      error: 'NO_API_KEY',
    };
  }

  const userName = userProfile?.name?.trim() || 'Kullanıcı';
  const dailyFocus = userProfile?.dailyFocus?.trim() || 'Henüz belirlenmedi';

  // Format tasks for context
  const tasksContext =
    Array.isArray(currentTasks) && currentTasks.length > 0
      ? currentTasks
          .map(
            (t) =>
              `• [${t.isCompleted ? 'Tamamlandı' : 'Bekliyor'}] ${t.title} (${
                t.dueDate || 'Tarih belirtilmedi'
              }${t.time ? ` saat ${t.time}` : ''})`
          )
          .join('\n')
      : 'Kayıtlı herhangi bir görev bulunmuyor.';

  // Format memories for context
  const memoryContext =
    Array.isArray(memories) && memories.length > 0
      ? memories.map((m) => `• [${m.category}] ${m.title}: ${m.content}`).join('\n')
      : 'Henüz kayıtlı bir hafıza detayı yok.';

  const systemInstruction = `Sen kullanıcının cep telefonunda kullandığı kişisel yapay zeka asistanısın.
Kullanıcının hitap ismi: ${userName}
Günün odağı / niyeti: ${dailyFocus}

MEVCUT GÖREVLER:
${tasksContext}

KAYITLI HAFIZA BİLGİLERİ (ZİHİN):
${memoryContext}

İLETİŞİM VE ÜSLUP KURALLARI:
1. Türkçe konuş. Sıcak, sakin, doğal, saygılı ve yardımsever ol. Kullanıcı başka dilde konuşursa o dille cevap ver.
2. Kendini asla 'yapay zeka', 'dil modeli', 'AI asistanı olarak' gibi klişelerle tanıtma. Robotik konuşma.
3. Her cümlede emoji kullanma. Çok gerekmedikçe emoji kullanmaktan kaçın.
4. Cevapların kısa, akıcı ve doğrudan amaca yönelik olsun (telefonda okunması ve dinlenmesi kolay olmalı).
5. Kullanıcı hakkında bilmediğin şeyleri asla uydurma.

GÖREV ALGILAMA (Task Candidate):
- Kullanıcı geleceğe yönelik bir iş, randevu, ödeme veya plan belirttiğinde (Örn: "Yarın saat 10'da annemi aramam lazım", "Akşam süt al", "Pazartesi raporu hazırla"):
  - Görevi asla sessizce veya otomatik kaydetme!
  - Cevap metninde kibarca onay sor (Örn: "Yarın saat 10:00 için 'Annemi ara' görevini ekleyeyim mi?").
  - 'suggestedAction' alanını doldur: type="create_task", task={ title: "Annemi ara", dueDate: "Yarın", time: "10:00", priority: "medium" }.
  - Tarih veya saat belirtilmemişse mantıklı bir varsayım yap veya sadece tarihi belirt (Örn: "Bugün" veya "Yarın").

GÖREV SORGULAMA:
- Kullanıcı "Bugün ne yapmam gerekiyor?", "Hangi görevlerim var?", "Planlarım neler?" gibi sorular sorduğunda MEVCUT GÖREVLER listesini kullanarak samimi ve net şekilde özetle. Yeni görev kartı açma (suggestedAction null olsun).

HAFIZA ADAYI ALGILAMA (Memory Candidate):
- Kullanıcı kendisiyle ilgili önemli bir kişisel alışkanlık, tercih, ilişki, hedef paylaştığında (Örn: "Sabahları erken kalkmayı seviyorum", "Kardeşimin adı Can", "Şekerli kahve içmem"):
  - Bilgiyi asla otomatik kaydetme!
  - Şifreler, kredi kartı, banka bilgileri, sağlık/ilaç gibi hassas kişisel verileri KESİNLİKLE hafızaya alma!
  - Cevap metninde nazikçe sor: "Bunu aklımda tutmamı ister misin?"
  - 'suggestedAction' alanını doldur: type="save_memory", memory={ category: "preferences"|"people"|"goals"|"notes", title: "Örn: Sabah Rutini", detail: "Sabahları erken kalkmayı seviyor" }.

HAFIZA SORGULAMA:
- Kullanıcı daha önce paylaştığı bir şeyi sorduğunda KAYITLI HAFIZA BİLGİLERİ'ne başvurarak doğru cevap ver.

Eğer kullanıcının mesajı bir görev veya hafıza adayı içermiyorsa, 'suggestedAction' değeri MUTLAKA null olmalıdır.`;

  // Only include recent history (max 6 messages)
  const formattedContents: any[] = [];
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    for (const item of recentHistory) {
      if (!item || !item.text) continue;
      if (item.sender === 'user') {
        formattedContents.push({
          role: 'user',
          parts: [{ text: item.text }],
        });
      } else if (item.sender === 'assistant') {
        formattedContents.push({
          role: 'model',
          parts: [{ text: item.text }],
        });
      }
    }
  }

  formattedContents.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });

  try {
    const ai = new GoogleGenAI({ apiKey });

    const genOptions = {
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: 'Asistanın kullanıcıya vereceği samimi, duru ve doğal Türkçe cevap.',
            },
            suggestedAction: {
              type: Type.OBJECT,
              nullable: true,
              description: 'Görev veya hafıza önerisi. Eğer öneri yoksa null.',
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ['create_task', 'save_memory'],
                },
                task: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    title: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    time: { type: Type.STRING, nullable: true },
                    priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                  },
                  required: ['title', 'dueDate'],
                },
                memory: {
                  type: Type.OBJECT,
                  nullable: true,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: ['preferences', 'people', 'goals', 'notes'],
                    },
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['category', 'title', 'detail'],
                },
              },
              required: ['type'],
            },
          },
          required: ['text'],
        },
      },
    };

    let response: any;
    // Android APK Native Bridge check: If running in Android APK with window.AndroidGemini available,
    // route HTTPS request through native HttpsURLConnection to bypass WebView null-origin CORS restrictions.
    if (typeof window !== 'undefined' && window.AndroidGemini && typeof window.AndroidGemini.sendGeminiRequest === 'function') {
      const restPayload = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.6,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              text: {
                type: 'STRING',
                description: 'Asistanın kullanıcıya vereceği samimi, duru ve doğal Türkçe cevap.',
              },
              suggestedAction: {
                type: 'OBJECT',
                nullable: true,
                description: 'Görev veya hafıza önerisi. Eğer öneri yoksa null.',
                properties: {
                  type: {
                    type: 'STRING',
                    enum: ['create_task', 'save_memory'],
                  },
                  task: {
                    type: 'OBJECT',
                    nullable: true,
                    properties: {
                      title: { type: 'STRING' },
                      dueDate: { type: 'STRING' },
                      time: { type: 'STRING', nullable: true },
                      priority: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                    },
                    required: ['title', 'dueDate'],
                  },
                  memory: {
                    type: 'OBJECT',
                    nullable: true,
                    properties: {
                      category: {
                        type: 'STRING',
                        enum: ['preferences', 'people', 'goals', 'notes'],
                      },
                      title: { type: 'STRING' },
                      detail: { type: 'STRING' },
                    },
                    required: ['category', 'title', 'detail'],
                  },
                },
                required: ['type'],
              },
            },
            required: ['text'],
          },
        },
      };

      try {
        response = await callGeminiViaNativeBridge(apiKey, 'gemini-3.8-flash', restPayload);
      } catch (nativeErr: any) {
        if (
          nativeErr?.message?.includes('503') ||
          nativeErr?.status === 503 ||
          nativeErr?.message?.includes('UNAVAILABLE')
        ) {
          response = await callGeminiViaNativeBridge(apiKey, 'gemini-3.1-flash-lite', restPayload);
        } else {
          throw nativeErr;
        }
      }
    } else {
      // Standard Web fallback: Use @google/genai SDK
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          ...genOptions,
        });
      } catch (err: any) {
        if (
          err?.message?.includes('503') ||
          err?.status === 503 ||
          err?.message?.includes('UNAVAILABLE')
        ) {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            ...genOptions,
          });
        } else {
          throw err;
        }
      }
    }

    const rawOutput = response.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      parsed = { text: rawOutput, suggestedAction: null };
    }

    let finalSuggestedAction = null;
    if (parsed.suggestedAction) {
      if (parsed.suggestedAction.type === 'create_task' && parsed.suggestedAction.task) {
        finalSuggestedAction = {
          type: 'create_task' as const,
          payload: {
            title: parsed.suggestedAction.task.title,
            dueDate: parsed.suggestedAction.task.dueDate || 'Bugün',
            time: parsed.suggestedAction.task.time || undefined,
            priority: parsed.suggestedAction.task.priority || 'medium',
          },
        };
      } else if (parsed.suggestedAction.type === 'save_memory' && parsed.suggestedAction.memory) {
        finalSuggestedAction = {
          type: 'save_memory' as const,
          payload: {
            category: parsed.suggestedAction.memory.category || 'notes',
            title: parsed.suggestedAction.memory.title,
            detail: parsed.suggestedAction.memory.detail,
          },
        };
      }
    }

    return {
      text: parsed.text || 'Seni dinliyorum.',
      suggestedAction: finalSuggestedAction,
    };
  } catch (error: any) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        text: 'İnternet bağlantısı yok.',
        suggestedAction: null,
        error: 'OFFLINE',
      };
    }

    const msg = error?.message || '';
    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('401') ||
      msg.includes('403') ||
      msg.includes('invalid api key')
    ) {
      return {
        text: 'Gemini API anahtarı geçersiz görünüyor. Lütfen Ayarlar bölümünden anahtarınızı kontrol edin.',
        suggestedAction: null,
        error: 'INVALID_API_KEY',
      };
    }

    if (error?.status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      return {
        text: 'Kısa sürede çok fazla istek gönderildi. Lütfen bir süre bekleyip tekrar deneyin.',
        suggestedAction: null,
        error: 'RATE_LIMIT',
      };
    }

    return {
      text: 'Gemini servisine bağlanırken bir aksaklık yaşandı. Lütfen internetinizi veya anahtarınızı kontrol edin.',
      suggestedAction: null,
      error: 'AI_ERROR',
    };
  }
}
