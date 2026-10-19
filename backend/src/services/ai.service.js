/**
 * AI Service supporting Gemini API and optional OpenAI fallback.
 */

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_TIMEOUT_MS = 15000;

const providerError = (provider, message) => {
  const error = new Error(message);
  error.provider = provider;
  return error;
};

export const generateAIResponse = async (prompt, history = []) => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const startTime = Date.now();

  // 1. Google Gemini API Integration
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

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
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
        if (!text) {
          throw providerError('gemini', 'Gemini returned no response text.');
        }
        const latencyMs = Date.now() - startTime;
        return {
          text,
          provider: `gemini (${GEMINI_MODEL})`,
          latencyMs,
        };
      }

      console.warn(`[AIService] Gemini HTTP ${response.status}.`);
      throw providerError('gemini', `Gemini request failed with HTTP ${response.status}.`);
    } catch (err) {
      const message =
        err.name === 'TimeoutError'
          ? `Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds.`
          : err.provider
            ? err.message
            : 'Gemini request could not be completed.';
      console.warn(`[AIService] ${message}`);
      if (!openAiKey || openAiKey === 'your_openai_api_key_here') {
        throw providerError('gemini', message);
      }
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
