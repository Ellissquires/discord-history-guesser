import { kv } from '@vercel/kv';
import type { GameState } from './game';

function gameKey(guildId: string) {
  return `game:${guildId}`;
}
function scoresKey(guildId: string) {
  return `scores:${guildId}`;
}
function channelsKey(guildId: string) {
  return `channels:${guildId}`;
}

export async function getGameState(guildId: string): Promise<GameState | null> {
  try {
    return await kv.get<GameState>(gameKey(guildId));
  } catch {
    return null;
  }
}

export async function setGameState(guildId: string, state: GameState): Promise<void> {
  await kv.set(gameKey(guildId), state);
}

export async function deleteGameState(guildId: string): Promise<void> {
  await kv.del(gameKey(guildId));
}

export async function addScore(guildId: string, userId: string, points: number): Promise<void> {
  await kv.hincrby(scoresKey(guildId), userId, points);
}

export async function getScores(guildId: string): Promise<Record<string, number>> {
  try {
    const result = await kv.hgetall<Record<string, number>>(scoresKey(guildId));
    return result ?? {};
  } catch {
    return {};
  }
}

export async function getAllowedChannels(guildId: string): Promise<string[]> {
  try {
    const result = await kv.get<string[]>(channelsKey(guildId));
    return result ?? [];
  } catch {
    return [];
  }
}

export async function setAllowedChannels(
  guildId: string,
  channels: string[],
): Promise<void> {
  await kv.set(channelsKey(guildId), channels);
}
