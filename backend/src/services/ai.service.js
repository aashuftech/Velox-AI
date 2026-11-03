/**
 * AI Service supporting Gemini API with model failover and optional OpenAI fallback.
 */

const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];
const GEMINI_TIMEOUT_MS = 6000;

const providerError = (provider, message) => {
  const error = new Error(message);
  error.provider = provider;
  return error;
};

export const generateAIResponse = async (prompt, history = []) => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const startTime = Date.now();

  // 1. Google Gemini API Integration with Automatic Model Failover
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    // Sanitize and alternate turns strictly according to Gemini specification
    const sanitizedTurns = [];

    // Keep recent history to preserve context while keeping request payloads lightweight
    const recentHistory = history.slice(-8);

    for (const msg of recentHistory) {
      if (!msg.text || !msg.text.trim()) {
        continue;
      }
      const role = msg.sender === 'user' ? 'user' : 'model';

      if (sanitizedTurns.length === 0) {
        if (role === 'user') {
          sanitizedTurns.push({
            role: 'user',
            parts: [{ text: msg.text.trim() }],
          });
        }
      } else {
        const lastTurn = sanitizedTurns[sanitizedTurns.length - 1];
        if (lastTurn.role === role) {
          lastTurn.parts[0].text += `\n${msg.text.trim()}`;
        } else {
          sanitizedTurns.push({
            role,
            parts: [{ text: msg.text.trim() }],
          });
        }
      }
    }

    // Add current user prompt as the final turn
    if (
      sanitizedTurns.length > 0 &&
      sanitizedTurns[sanitizedTurns.length - 1].role === 'user'
    ) {
      sanitizedTurns[sanitizedTurns.length - 1].parts[0].text += `\n${prompt.trim()}`;
    } else {
      sanitizedTurns.push({
        role: 'user',
        parts: [{ text: prompt.trim() }],
      });
    }

    let lastGeminiError = null;

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({ contents: sanitizedTurns }),
        });

        if (response.ok) {
          const data = await response.json();
          const candidate = data?.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text?.trim();
          if (text) {
            const latencyMs = Date.now() - startTime;
            return {
              text,
              provider: `gemini (${model})`,
              latencyMs,
            };
          }
          if (candidate?.finishReason === 'SAFETY') {
            return {
              text: 'I cannot generate a response for this query due to safety guidelines.',
              provider: `gemini (${model})`,
              latencyMs: Date.now() - startTime,
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${response.status}`;
          console.warn(`[AIService] ${model} failed (${response.status}): ${errMsg}`);
          lastGeminiError = errMsg;
        }
      } catch (err) {
        const isTimeout = err.name === 'TimeoutError';
        const errMsg = isTimeout
          ? `Gemini (${model}) timed out after ${GEMINI_TIMEOUT_MS / 1000}s.`
          : err.message;
        console.warn(`[AIService] ${errMsg}`);
        lastGeminiError = errMsg;
      }
    }

    // Quick pause & retry on top resilient models if rate limited
    if (
      lastGeminiError &&
      (lastGeminiError.includes('429') ||
        lastGeminiError.includes('quota') ||
        lastGeminiError.includes('overloaded'))
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      for (const retryModel of ['gemini-3-flash-preview', 'gemini-flash-lite-latest']) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${retryModel}:generateContent`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiKey,
            },
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            body: JSON.stringify({ contents: sanitizedTurns }),
          });
          if (response.ok) {
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (text) {
              return {
                text,
                provider: `gemini (${retryModel})`,
                latencyMs: Date.now() - startTime,
              };
            }
          }
        } catch {
          // ignore retry failure
        }
      }
    }

    if (!openAiKey || openAiKey === 'your_openai_api_key_here') {
      throw providerError('gemini', lastGeminiError || 'Gemini request could not be completed.');
    }
  }

  // 2. OpenAI API integration (if configured)
  if (openAiKey && openAiKey !== 'your_openai_api_key_here') {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content:
                  'You are Velox AI, an advanced high-performance assistant. Provide concise, direct, helpful answers.',
              },
              ...history.slice(-8).map((msg) => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text,
              })),
              { role: 'user', content: prompt },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text =
          data?.choices?.[0]?.message?.content?.trim() ||
          'No response from OpenAI.';
        const latencyMs = Date.now() - startTime;
        return { text, provider: 'openai', latencyMs };
      }
    } catch (err) {
      console.warn(`[AIService] OpenAI request failed: ${err.message}`);
    }
  }

  throw providerError('ai', `AI providers unavailable after ${Date.now() - startTime} ms.`);
};
