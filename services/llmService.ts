
// Cliente LLM genérico contra cualquier endpoint OpenAI-compatible
// (Gemini, Groq, OpenRouter, Cerebras, MiniMax, Ollama...).
import { AIConfig, getPreset } from "./config";

/**
 * Llama al LLM configurado y devuelve el JSON parseado de la respuesta.
 * El prompt debe pedir explícitamente JSON; aquí se añade json_mode si el proveedor lo soporta.
 */
export const chatJSON = async (prompt: string, config: AIConfig): Promise<any> => {
  if (!config.llmApiKey) {
    throw new Error("NO_LLM_KEY");
  }

  const preset = getPreset(config.llmPreset);
  const body: any = {
    model: config.llmModel || preset.defaultModel,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  };
  if (preset.supportsJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${config.llmBaseUrl || preset.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llmApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content || '';
  return extractJSON(content);
};

// Los modelos sin json_mode a veces envuelven la respuesta en ```json ... ``` o añaden texto.
const extractJSON = (text: string): any => {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error(`Respuesta LLM no es JSON válido: ${text.slice(0, 200)}`);
  }
};
