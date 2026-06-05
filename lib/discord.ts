const BASE = 'https://discord.com/api/v10';

export function createApi() {
  const headers = {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    'Content-Type': 'application/json',
  };

  return {
    async get<T>(path: string): Promise<T | null> {
      const res = await fetch(`${BASE}${path}`, { headers });
      if (!res.ok) return null;
      return res.json();
    },

    async post<T>(path: string, body: unknown): Promise<T | null> {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return res.json();
    },

    async patch<T>(path: string, body: unknown): Promise<T | null> {
      const res = await fetch(`${BASE}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return res.json();
    },
  };
}

export function respond(type: number, data?: Record<string, unknown>) {
  return new Response(JSON.stringify({ type, data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function interactionResponse(type: number, data?: Record<string, unknown>) {
  return { type, data };
}
