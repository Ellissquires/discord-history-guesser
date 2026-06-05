import { createApi } from './discord';
import {
  getGameState,
  setGameState,
  deleteGameState,
  addScore as kvAddScore,
  getAllowedChannels,
} from './store';

export interface GameState {
  content: string;
  authorId: string;
  authorName: string;
  channelId: string;
  messageId: string;
  startedBy: string;
  startedAt: number;
  gameChannelId: string;
  guesserIds: string[];
  hintLevel: number;
}

const MAX_CONTENT_LENGTH = 1000;

function truncate(text: string): string {
  if (text.length <= MAX_CONTENT_LENGTH) return text;
  return text.slice(0, MAX_CONTENT_LENGTH - 1) + '…';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchMessages(api: ReturnType<typeof createApi>, channelId: string) {
  return api.get<any[]>(`/channels/${channelId}/messages?limit=100`);
}

async function fetchMembers(api: ReturnType<typeof createApi>, guildId: string) {
  return api.get<any[]>(`/guilds/${guildId}/members?limit=100`);
}

async function fetchChannel(api: ReturnType<typeof createApi>, channelId: string) {
  return api.get<any>(`/channels/${channelId}`);
}

function isBotMessage(msg: any): boolean {
  return msg.author?.bot === true;
}

export async function pickMessage(
  guildId: string,
  specificChannelId?: string,
) {
  const api = createApi();
  let channelIds: string[] = [];

  if (specificChannelId) {
    channelIds = [specificChannelId];
  } else {
    const stored = await getAllowedChannels(guildId);
    if (stored.length > 0) {
      channelIds = stored;
    } else {
      const envChannels = process.env.ALLOWED_CHANNELS?.split(',').map((c) => c.trim()).filter(Boolean);
      channelIds = envChannels ?? [];
    }
  }

  if (channelIds.length === 0 && !specificChannelId) {
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const channelId = pickRandom(channelIds);
    const messages = await fetchMessages(api, channelId);
    if (!messages || messages.length === 0) continue;

    const filtered = messages.filter((m) => !isBotMessage(m) && m.content?.length > 0);
    if (filtered.length === 0) continue;

    const msg = pickRandom(filtered);
    const authorName = msg.author?.global_name ?? msg.author?.username ?? 'Unknown';

    return {
      content: truncate(msg.content),
      authorId: msg.author.id,
      authorName,
      channelId,
      messageId: msg.id,
    };
  }

  return null;
}

export async function startGame(
  guildId: string,
  gameChannelId: string,
  specificChannelId: string | undefined,
  userId: string,
) {
  const existing = await getGameState(guildId);
  if (existing) {
    return null;
  }

  const picked = await pickMessage(guildId, specificChannelId);
  if (!picked) return null;

  const state: GameState = {
    content: picked.content,
    authorId: picked.authorId,
    authorName: picked.authorName,
    channelId: picked.channelId,
    messageId: picked.messageId,
    startedBy: userId,
    startedAt: Date.now(),
    gameChannelId,
    guesserIds: [],
    hintLevel: 0,
  };

  await setGameState(guildId, state);
  return state;
}

export async function checkGuess(guildId: string, userId: string) {
  const game = await getGameState(guildId);
  if (!game) return { correct: false, points: 0 };

  if (game.guesserIds.includes(userId)) {
    return { correct: false, points: 0, alreadyGuessed: true };
  }

  if (userId === game.authorId) {
    const attemptNumber = game.guesserIds.length;
    const points = attemptNumber === 0 ? 3 : attemptNumber === 1 ? 2 : 1;
    await kvAddScore(guildId, userId, points);
    await deleteGameState(guildId);
    return { correct: true, points, authorName: game.authorName, content: game.content };
  }

  game.guesserIds.push(userId);
  await setGameState(guildId, game);
  return { correct: false, points: 0 };
}

export function getHintText(game: GameState): string {
  const { hintLevel, authorName, channelId, startedAt } = game;
  const hints: string[] = [];

  if (hintLevel >= 0) {
    hints.push(`Name starts with **${authorName[0]}**`);
  }
  if (hintLevel >= 1) {
    hints.push(`Name has **${authorName.length}** characters`);
  }
  if (hintLevel >= 2) {
    hints.push(`Posted in <#${channelId}>`);
  }
  if (hintLevel >= 3) {
    const date = new Date(startedAt);
    hints.push(`Message posted around <t:${Math.floor(date.getTime() / 1000)}:R>`);
  }

  return hints.join(' • ');
}

export function buildGameEmbed(game: GameState) {
  const hints = game.hintLevel > 0 ? getHintText(game) : 'None yet — use `/guess hint`';

  return {
    title: 'Guess the Author',
    description: game.content,
    color: 0x5865f2,
    fields: [
      { name: 'Channel', value: `<#${game.channelId}>`, inline: true },
      { name: 'Hints', value: hints, inline: false },
    ],
    footer: {
      text: `Guess with /guess @user or the dropdown`,
    },
    timestamp: new Date().toISOString(),
  };
}

export function buildRevealEmbed(
  authorId: string,
  authorName: string,
  content: string,
  guesserName?: string,
) {
  return {
    title: 'Answer Revealed',
    description: content,
    color: 0x57f287,
    fields: [
      { name: 'Author', value: `<@${authorId}> (${authorName})`, inline: true },
      ...(guesserName
        ? [{ name: 'Guessed by', value: guesserName, inline: true }]
        : []),
    ],
  };
}

export function buildLeaderboardEmbed(scores: Record<string, number>) {
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const description =
    sorted.length === 0
      ? 'No scores yet! Start a round with `/guess start`.'
      : sorted
          .map(
            ([userId, score], i) =>
              `${i + 1}. <@${userId}> — **${score}** point${score === 1 ? '' : 's'}`,
          )
          .join('\n');

  return {
    title: 'Leaderboard',
    description,
    color: 0xfee75c,
    footer: { text: 'Top 10' },
  };
}

export function configChannelsFromString(input: string): string[] {
  const matches = input.matchAll(/<#(\d+)>/g);
  const mentions = [...matches].map((m) => m[1]);
  const ids = input.split(/[\s,]+/).filter((s) => /^\d+$/.test(s));
  return [...new Set([...mentions, ...ids])];
}
