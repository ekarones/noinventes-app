import { apiRequest } from './client';

// Structured payload the assistant can attach for widget rendering. We currently
// render only `answer` (natural-language text); these types are here for when we
// add widgets (stat tiles / tables / lists) under the bubble.
export type ChatData =
  | { type: 'summary'; [k: string]: unknown }
  | { type: 'table'; columns: string[]; rows: unknown[][]; [k: string]: unknown }
  | { type: 'list'; items: { title: string; subtitle?: string; value?: string }[]; [k: string]: unknown }
  | { type: 'scalar'; value: string | number; label: string; [k: string]: unknown }
  | { type: 'empty' };

// What the assistant did with the message: ran a handler, asked for a missing
// detail, chatted, or didn't understand.
export type ChatMode = 'intent' | 'smalltalk' | 'clarify' | 'unknown';

// One prior turn sent back as context so the assistant resolves follow-ups like
// "¿y la semana pasada?".
export type ChatHistoryItem = { role: 'user' | 'assistant'; content: string };

export type ChatReply = {
  // Natural-language answer in Spanish, may contain **bold** markdown.
  answer: string;
  // Classified intent name, or null if not recognized.
  intent: string | null;
  data: ChatData | null;
  mode: ChatMode;
  tookMs: number;
};

// POST /api/mobile/chat — the assistant. Under mobile-api (seller + admin); the
// server returns only the intents the role is allowed to see. `history` carries
// recent turns (oldest first) for follow-up context. apiRequest attaches the
// Bearer + X-Tenant and turns a 401 into a global sign-out; a 429/503 comes back
// as an ApiError the caller maps to a friendly bubble.
export async function sendChatMessage(
  message: string,
  history: ChatHistoryItem[] = []
): Promise<ChatReply> {
  const res = await apiRequest<{
    answer: string;
    intent: string | null;
    data: ChatData | null;
    mode?: ChatMode;
    took_ms: number;
  }>('/chat', {
    method: 'POST',
    // Cap at the last 10 turns (server limit) to keep the request light.
    body: { message, history: history.slice(-10) },
  });
  return {
    answer: res.answer,
    intent: res.intent ?? null,
    data: res.data ?? null,
    mode: res.mode ?? 'intent',
    tookMs: res.took_ms,
  };
}
