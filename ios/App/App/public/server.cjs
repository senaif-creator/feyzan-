var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "5mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var geminiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}
app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    model: "gemini-3.8-flash",
    hasApiKey: hasKey
  });
});
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { message, history, userProfile, currentTasks, memories } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        text: "L\xFCtfen bir mesaj belirtin.",
        suggestedAction: null
      });
    }
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
      return res.status(503).json({
        error: "API_KEY_MISSING",
        text: "Gemini API anahtar\u0131 sisteme tan\u0131mlanmam\u0131\u015F. L\xFCtfen Ayarlar > Secrets b\xF6l\xFCm\xFCnden GEMINI_API_KEY ekleyin.",
        suggestedAction: null
      });
    }
    const userName = userProfile?.name?.trim() || "Kullan\u0131c\u0131";
    const dailyFocus = userProfile?.dailyFocus?.trim() || "Hen\xFCz belirlenmedi";
    const tasksContext = Array.isArray(currentTasks) && currentTasks.length > 0 ? currentTasks.map(
      (t) => `\u2022 [${t.isCompleted ? "Tamamland\u0131" : "Bekliyor"}] ${t.title} (${t.dueDate || "Tarih belirtilmedi"}${t.time ? ` saat ${t.time}` : ""})`
    ).join("\n") : "Kay\u0131tl\u0131 herhangi bir g\xF6rev bulunmuyor.";
    const memoryContext = Array.isArray(memories) && memories.length > 0 ? memories.map((m) => `\u2022 [${m.category}] ${m.title}: ${m.content}`).join("\n") : "Hen\xFCz kay\u0131tl\u0131 bir haf\u0131za detay\u0131 yok.";
    const systemInstruction = `Sen kullan\u0131c\u0131n\u0131n cep telefonunda kulland\u0131\u011F\u0131 ki\u015Fisel yapay zeka asistan\u0131s\u0131n.
Kullan\u0131c\u0131n\u0131n hitap ismi: ${userName}
G\xFCn\xFCn oda\u011F\u0131 / niyeti: ${dailyFocus}

MEVCUT G\xD6REVLER:
${tasksContext}

KAYITLI HAFIZA B\u0130LG\u0130LER\u0130 (Z\u0130H\u0130N):
${memoryContext}

\u0130LET\u0130\u015E\u0130M VE \xDCSLUP KURALLARI:
1. T\xFCrk\xE7e konu\u015F. S\u0131cak, sakin, do\u011Fal, sayg\u0131l\u0131 ve yard\u0131msever ol. Kullan\u0131c\u0131 ba\u015Fka dilde konu\u015Fursa o dille cevap ver.
2. Kendini asla 'yapay zeka', 'dil modeli', 'AI asistan\u0131 olarak' gibi kli\u015Felerle tan\u0131tma. Robotik konu\u015Fma.
3. Her c\xFCmlede emoji kullanma. \xC7ok gerekmedik\xE7e emoji kullanmaktan ka\xE7\u0131n.
4. Cevaplar\u0131n k\u0131sa, ak\u0131c\u0131 ve do\u011Frudan amaca y\xF6nelik olsun (telefonda okunmas\u0131 kolay olmal\u0131).
5. Kullan\u0131c\u0131 hakk\u0131nda bilmedi\u011Fin \u015Feyleri asla uydurma.

G\xD6REV ALGILAMA (Task Candidate):
- Kullan\u0131c\u0131 gelece\u011Fe y\xF6nelik bir i\u015F, randevu, \xF6deme veya plan belirtti\u011Finde (\xD6rn: "Yar\u0131n saat 10'da annemi aramam laz\u0131m", "Ak\u015Fam s\xFCt al", "Pazartesi raporu haz\u0131rla"):
  - G\xF6revi asla sessizce veya otomatik kaydetme!
  - Cevap metninde kibarca onay sor (\xD6rn: "Yar\u0131n saat 10:00 i\xE7in 'Annemi ara' g\xF6revini ekleyeyim mi?").
  - 'suggestedAction' alan\u0131n\u0131 doldur: type="create_task", task={ title: "Annemi ara", dueDate: "Yar\u0131n", time: "10:00", priority: "medium" }.
  - Tarih veya saat belirtilmemi\u015Fse mant\u0131kl\u0131 bir varsay\u0131m yap veya sadece tarihi belirt (\xD6rn: "Bug\xFCn" veya "Yar\u0131n").

G\xD6REV SORGULAMA:
- Kullan\u0131c\u0131 "Bug\xFCn ne yapmam gerekiyor?", "Hangi g\xF6revlerim var?", "Planlar\u0131m neler?" gibi sorular sordu\u011Funda MEVCUT G\xD6REVLER listesini kullanarak samimi ve net \u015Fekilde \xF6zetle. Yeni g\xF6rev kart\u0131 a\xE7ma (suggestedAction null olsun).

HAFIZA ADAYI ALGILAMA (Memory Candidate):
- Kullan\u0131c\u0131 kendisiyle ilgili \xF6nemli bir ki\u015Fisel al\u0131\u015Fkanl\u0131k, tercih, ili\u015Fki, hedef payla\u015Ft\u0131\u011F\u0131nda (\xD6rn: "Sabahlar\u0131 erken kalkmay\u0131 seviyorum", "Karde\u015Fimin ad\u0131 Can", "\u015Eekerli kahve i\xE7mem"):
  - Bilgiyi asla otomatik kaydetme!
  - \u015Eifreler, kredi kart\u0131, banka bilgileri, sa\u011Fl\u0131k/ila\xE7 gibi hassas ki\u015Fisel verileri KES\u0130NL\u0130KLE haf\u0131zaya alma!
  - Cevap metninde nazik\xE7e sor: "Bunu akl\u0131mda tutmam\u0131 ister misin?"
  - 'suggestedAction' alan\u0131n\u0131 doldur: type="save_memory", memory={ category: "preferences"|"people"|"goals"|"notes", title: "\xD6rn: Sabah Rutini", detail: "Sabahlar\u0131 erken kalkmay\u0131 seviyor" }.

HAFIZA SORGULAMA:
- Kullan\u0131c\u0131 daha \xF6nce payla\u015Ft\u0131\u011F\u0131 bir \u015Feyi sordu\u011Funda KAYITLI HAFIZA B\u0130LG\u0130LER\u0130'ne ba\u015Fvurarak do\u011Fru cevap ver.

E\u011Fer kullan\u0131c\u0131n\u0131n mesaj\u0131 bir g\xF6rev veya haf\u0131za aday\u0131 i\xE7ermiyorsa, 'suggestedAction' de\u011Feri MUTLAKA null olmal\u0131d\u0131r.`;
    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (!item || !item.text) continue;
        if (item.sender === "user") {
          formattedContents.push({
            role: "user",
            parts: [{ text: item.text }]
          });
        } else if (item.sender === "assistant") {
          formattedContents.push({
            role: "model",
            parts: [{ text: item.text }]
          });
        }
      }
    }
    formattedContents.push({
      role: "user",
      parts: [{ text: message.trim() }]
    });
    const genOptions = {
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            text: {
              type: import_genai.Type.STRING,
              description: "Asistan\u0131n kullan\u0131c\u0131ya verece\u011Fi samimi, duru ve do\u011Fal T\xFCrk\xE7e cevap."
            },
            suggestedAction: {
              type: import_genai.Type.OBJECT,
              nullable: true,
              description: "G\xF6rev veya haf\u0131za \xF6nerisi. E\u011Fer \xF6neri yoksa null.",
              properties: {
                type: {
                  type: import_genai.Type.STRING,
                  enum: ["create_task", "save_memory"]
                },
                task: {
                  type: import_genai.Type.OBJECT,
                  nullable: true,
                  properties: {
                    title: { type: import_genai.Type.STRING },
                    dueDate: { type: import_genai.Type.STRING },
                    time: { type: import_genai.Type.STRING, nullable: true },
                    priority: { type: import_genai.Type.STRING, enum: ["low", "medium", "high"] }
                  },
                  required: ["title", "dueDate"]
                },
                memory: {
                  type: import_genai.Type.OBJECT,
                  nullable: true,
                  properties: {
                    category: {
                      type: import_genai.Type.STRING,
                      enum: ["preferences", "people", "goals", "notes"]
                    },
                    title: { type: import_genai.Type.STRING },
                    detail: { type: import_genai.Type.STRING }
                  },
                  required: ["category", "title", "detail"]
                }
              },
              required: ["type"]
            }
          },
          required: ["text"]
        }
      }
    };
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        ...genOptions
      });
    } catch (err) {
      if (err?.message?.includes("503") || err?.status === 503 || err?.message?.includes("UNAVAILABLE")) {
        console.warn("Primary model busy (503), switching to gemini-3.1-flash-lite...");
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          ...genOptions
        });
      } else {
        throw err;
      }
    }
    const rawOutput = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (e) {
      console.error("Failed to parse Gemini JSON output:", rawOutput, e);
      parsed = { text: rawOutput, suggestedAction: null };
    }
    let finalSuggestedAction = null;
    if (parsed.suggestedAction) {
      if (parsed.suggestedAction.type === "create_task" && parsed.suggestedAction.task) {
        finalSuggestedAction = {
          type: "create_task",
          payload: {
            title: parsed.suggestedAction.task.title,
            dueDate: parsed.suggestedAction.task.dueDate || "Bug\xFCn",
            time: parsed.suggestedAction.task.time || void 0,
            priority: parsed.suggestedAction.task.priority || "medium"
          }
        };
      } else if (parsed.suggestedAction.type === "save_memory" && parsed.suggestedAction.memory) {
        finalSuggestedAction = {
          type: "save_memory",
          payload: {
            category: parsed.suggestedAction.memory.category || "notes",
            title: parsed.suggestedAction.memory.title,
            detail: parsed.suggestedAction.memory.detail
          }
        };
      }
    }
    return res.json({
      text: parsed.text || "Seni dinliyorum.",
      suggestedAction: finalSuggestedAction
    });
  } catch (error) {
    console.error("Gemini API call failed:", error);
    let errorMessage = "\u015Eu anda ba\u011Flant\u0131 kurulurken bir aksakl\u0131k ya\u015Fand\u0131. L\xFCtfen biraz sonra tekrar dener misin?";
    if (error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      errorMessage = "K\u0131sa s\xFCrede \xE7ok fazla istek al\u0131nd\u0131. L\xFCtfen bir an bekleyip tekrar yaz.";
    }
    return res.status(200).json({
      error: "AI_GENERATION_FAILED",
      text: errorMessage,
      details: process.env.NODE_ENV === "development" ? error?.message : void 0,
      suggestedAction: null
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
