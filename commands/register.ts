import { defineCommands } from '../lib/commands';

const { DISCORD_APP_ID, DISCORD_BOT_TOKEN } = process.env;

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  console.error('Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in environment');
  process.exit(1);
}

const commands = defineCommands();

async function main() {
  console.log('Registering slash commands…');

  const res = await fetch(
    `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    },
  );

  const body = await res.json();

  if (!res.ok) {
    console.error('Failed to register commands:', JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`Registered ${body.length} command(s) successfully:`);
  for (const cmd of body) {
    console.log(`  /${cmd.name} — ${cmd.description}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
