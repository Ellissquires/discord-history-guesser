import { NextRequest } from 'next/server';
import nacl from 'tweetnacl';
import { createApi, interactionResponse, fetchAllMembers } from '@/lib/discord';
import {
  pickMessage,
  checkGuess,
  nextRoundOrEnd,
  getHintText,
  buildGameEmbed,
  buildRevealEmbed,
  buildLeaderboardEmbed,
  buildSessionSummaryEmbed,
  configChannelsFromString,
} from '@/lib/game';
import {
  getGameState,
  getScores,
  setGameState,
  deleteGameState,
  addScore,
  setAllowedChannels,
  getAllowedChannels,
} from '@/lib/store';
import type { GameState } from '@/lib/game';

function hex(buf: string): Uint8Array {
  const bytes = buf.match(/.{1,2}/g);
  if (!bytes) return new Uint8Array();
  return new Uint8Array(bytes.map((b) => parseInt(b, 16)));
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function buildRoundComponents(api: ReturnType<typeof createApi>, guildId: string, game: GameState) {
  const allMembers = await fetchAllMembers(api, guildId);
  const humanMembers = allMembers.filter((m: any) => !m.user?.bot);

  const authorMember = humanMembers.find((m: any) => m.user?.id === game.authorId);
  const otherMembers = humanMembers.filter((m: any) => m.user?.id !== game.authorId);
  const randomOthers = otherMembers
    .sort(() => Math.random() - 0.5)
    .slice(0, 24);

  const finalMembers = [...randomOthers];
  if (authorMember) {
    finalMembers.push(authorMember);
  }
  finalMembers.sort(() => Math.random() - 0.5);

  const selectOptions = finalMembers.map((m: any) => ({
    label: (
      m.nick || m.user?.global_name || m.user?.username || 'Unknown'
    ).slice(0, 100),
    value: m.user?.id ?? '',
    description: `@${(m.user?.username || 'unknown').slice(0, 100)}`,
  }));

  const embed = buildGameEmbed(game);
  const components = selectOptions.length
    ? [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'guess_select',
              placeholder: 'Who wrote this?',
              options: selectOptions,
            },
          ],
        },
      ]
    : undefined;

  return { embed, components };
}

export async function POST(request: NextRequest) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return new Response('Not configured', { status: 500 });

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) return new Response('Bad request', { status: 401 });

  const raw = await request.text();

  const verified = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + raw),
    hex(signature),
    hex(publicKey),
  );
  if (!verified) return new Response('Invalid signature', { status: 401 });

  const i = JSON.parse(raw);

  // ── PING ──
  if (i.type === 1) return json({ type: 1 });

  if (!i.guild_id) {
    return json(interactionResponse(4, { content: 'This bot only works in servers.', flags: 64 }));
  }

  const api = createApi();

  // ── SLASH COMMANDS ──
  if (i.type === 2) {
    const { data, guild_id, channel_id, member } = i;
    const userId = member?.user?.id;
    const sub = data.options?.[0];
    const cmd = sub?.name;

    // /guess start
    if (cmd === 'start') {
      const channelOpt = sub.options?.find((o: any) => o.name === 'channel');
      const specificId = channelOpt?.value;
      const roundsOpt = sub.options?.find((o: any) => o.name === 'rounds');
      const totalRounds = roundsOpt?.value ?? 1;

      const picked = await pickMessage(guild_id, specificId);

      if (!picked) {
        const existing = await getGameState(guild_id);
        if (existing) {
          return json(
            interactionResponse(4, {
              content: 'A game is already running. End it with `/guess reveal`.',
              flags: 64,
            }),
          );
        }
        return json(
          interactionResponse(4, {
            content:
              'No messages found. Make sure the bot has access to channels with messages, or configure allowed channels with `/guess config channels`.',
            flags: 64,
          }),
        );
      }

      const game: GameState = {
        content: picked.content,
        authorId: picked.authorId,
        authorName: picked.authorName,
        channelId: picked.channelId,
        messageId: picked.messageId,
        messageTimestamp: picked.messageTimestamp,
        startedBy: userId,
        startedAt: Date.now(),
        gameChannelId: channel_id,
        guesserIds: [],
        hintLevel: 0,
        round: 1,
        totalRounds,
        sessionScores: {},
      };

      await setGameState(guild_id, game);

      const { embed, components } = await buildRoundComponents(api, guild_id, game);
      const roundInfo = totalRounds > 1 ? `\n*Round 1 of ${totalRounds}*` : '';

      return json(interactionResponse(4, { content: roundInfo, embeds: [embed], components }));
    }

    // /guess target @user
    if (cmd === 'target') {
      const target = sub.options?.find((o: any) => o.name === 'user')?.value;
      if (!target)
        return json(interactionResponse(4, { content: 'Please mention a user.', flags: 64 }));

      const game = await getGameState(guild_id);
      if (!game)
        return json(
          interactionResponse(4, {
            content: 'No active game! Start one with `/guess start`.',
            flags: 64,
          }),
        );

      const result = await checkGuess(guild_id, userId, target);

      if (result.correct) {
        const advance = await nextRoundOrEnd(guild_id, game, userId, result.points);

        if (!advance.ended && advance.nextGame) {
          const { embed, components } = await buildRoundComponents(api, guild_id, advance.nextGame);
          const roundInfo = `*Round ${advance.nextGame.round} of ${advance.nextGame.totalRounds}*`;
          return json(
            interactionResponse(4, {
              content: `🎉 <@${userId}> guessed correctly! **+${result.points}** point${result.points === 1 ? '' : 's'} 🏆 (Round ${game.round}/${game.totalRounds})\n${roundInfo}`,
              embeds: [embed],
              components,
            }),
          );
        }

        const ts = Math.floor(new Date(result.messageTimestamp!).getTime() / 1000);
        const dateDisplay = isNaN(ts) ? result.messageTimestamp! : `<t:${ts}:D>`;
        const embeds: any[] = [
          buildRevealEmbed(game.authorId, result.authorName!, result.content!, result.messageTimestamp!, `<@${userId}>`),
        ];
        if (game.totalRounds > 1) {
          embeds.push(buildSessionSummaryEmbed(advance.sessionScores, game.totalRounds));
        }
        return json(
          interactionResponse(4, {
            content: `🎉 <@${userId}> guessed correctly! **+${result.points}** point${result.points === 1 ? '' : 's'} 🏆\nOriginal message sent: ${dateDisplay}`,
            embeds,
          }),
        );
      }

      return json(interactionResponse(4, { content: '❌ Wrong! Try again.', flags: 64 }));
    }

    // /guess hint
    if (cmd === 'hint') {
      const game = await getGameState(guild_id);
      if (!game)
        return json(interactionResponse(4, { content: 'No active game!', flags: 64 }));

      game.hintLevel += 1;
      const hint = getHintText(game);
      await setGameState(guild_id, game);

      return json(interactionResponse(4, { content: `🔍 **Hint:** ${hint}` }));
    }

    // /guess reveal
    if (cmd === 'reveal') {
      const game = await getGameState(guild_id);
      if (!game)
        return json(interactionResponse(4, { content: 'No active game!', flags: 64 }));

      const canReveal = userId === game.startedBy || Date.now() - game.startedAt > 5 * 60 * 1000;
      if (!canReveal) {
        return json(
          interactionResponse(4, {
            content:
              'Only the person who started the round can reveal. Wait 5 minutes or ask them to use `/guess reveal`.',
            flags: 64,
          }),
        );
      }

      if (game.totalRounds > 1 && Object.keys(game.sessionScores).length > 0) {
        for (const [uid, pts] of Object.entries(game.sessionScores)) {
          await addScore(guild_id, uid, pts);
        }
      }
      await deleteGameState(guild_id);

      const embeds: any[] = [
        buildRevealEmbed(game.authorId, game.authorName, game.content, game.messageTimestamp),
      ];
      if (game.totalRounds > 1) {
        embeds.push(buildSessionSummaryEmbed(game.sessionScores, game.totalRounds));
      }

      return json(
        interactionResponse(4, {
          content: `The author was <@${game.authorId}> (${game.authorName})\n\nOriginal message:\n${game.content}`,
          embeds,
        }),
      );
    }

    // /guess leaderboard
    if (cmd === 'leaderboard') {
      const scores = await getScores(guild_id);
      const embed = buildLeaderboardEmbed(scores);
      return json(interactionResponse(4, { embeds: [embed] }));
    }

    // /guess config
    if (cmd === 'config') {
      const channelsOpt = sub.options?.find((o: any) => o.name === 'channels');
      const resetOpt = sub.options?.find((o: any) => o.name === 'reset');

      if (resetOpt?.value === true) {
        await setAllowedChannels(guild_id, []);
        return json(
          interactionResponse(4, {
            content: '✅ Channel allowlist cleared. Bot will read all accessible channels.',
          }),
        );
      }

      if (channelsOpt?.value) {
        const ids = configChannelsFromString(channelsOpt.value);
        if (!ids.length) {
          return json(
            interactionResponse(4, {
              content:
                'No valid channel IDs found. Use channel mentions like `#general` or paste IDs.',
              flags: 64,
            }),
          );
        }
        await setAllowedChannels(guild_id, ids);
        return json(
          interactionResponse(4, {
            content: `✅ Allowed channels set to ${ids.map((id: string) => `<#${id}>`).join(', ')}`,
          }),
        );
      }

      const current = await getAllowedChannels(guild_id);
      if (!current.length) {
        return json(
          interactionResponse(4, {
            content: 'No channel restrictions. The bot reads all accessible channels.',
          }),
        );
      }
      return json(
        interactionResponse(4, {
          content: `Allowed channels: ${current.map((id: string) => `<#${id}>`).join(', ')}`,
        }),
      );
    }

    return json(interactionResponse(4, { content: 'Unknown subcommand.', flags: 64 }));
  }

  // ── MESSAGE COMPONENT (select menu) ──
  if (i.type === 3) {
    const { guild_id, member, data, message: msg } = i;
    const userId = member?.user?.id;
    const selected = data.values?.[0];

    if (data.custom_id === 'guess_select') {
      if (!selected) {
        return json(interactionResponse(4, { content: 'No user selected.', flags: 64 }));
      }

      const game = await getGameState(guild_id);
      if (!game) {
        return json(interactionResponse(4, { content: 'This game has already ended.', flags: 64 }));
      }

      const result = await checkGuess(guild_id, userId, selected);

      if (result.correct) {
        const advance = await nextRoundOrEnd(guild_id, game, userId, result.points);

        if (!advance.ended && advance.nextGame) {
          const { embed, components } = await buildRoundComponents(api, guild_id, advance.nextGame);
          const roundInfo = `*Round ${advance.nextGame.round} of ${advance.nextGame.totalRounds}*`;
          return json(
            interactionResponse(7, {
              content: `🎉 <@${userId}> guessed correctly! **+${result.points}** point${result.points === 1 ? '' : 's'} 🏆 (Round ${game.round}/${game.totalRounds})\n${roundInfo}`,
              embeds: [embed],
              components,
            }),
          );
        }

        const embeds: any[] = [
          buildRevealEmbed(game.authorId, result.authorName!, result.content!, result.messageTimestamp!, `<@${userId}>`),
        ];
        if (game.totalRounds > 1) {
          embeds.push(buildSessionSummaryEmbed(advance.sessionScores, game.totalRounds));
        }
        return json(
          interactionResponse(7, {
            content: `🎉 <@${userId}> guessed correctly! **+${result.points}** point${result.points === 1 ? '' : 's'} 🏆 (Final round!)`,
            embeds,
            components: [],
          }),
        );
      }

      return json(interactionResponse(4, { content: '❌ Wrong! Try again.', flags: 64 }));
    }

    return json(interactionResponse(4, { content: 'Unknown component.', flags: 64 }));
  }

  return json({ type: 1 });
}
