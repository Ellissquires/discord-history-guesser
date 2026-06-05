export default function HomePage() {
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_APP_ID || 'YOUR_APP_ID'}&permissions=277025770560&scope=bot%20applications.commands`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">Guess the Author</span>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-blurple px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blurple/90"
          >
            Add to Discord
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Guess the <span className="text-blurple">Author</span>
          </h1>
          <p className="mt-4 text-lg text-discord-muted max-w-2xl mx-auto">
            A Discord bot that surfaces a random message from your server&apos;s history,
            hides who wrote it, and challenges everyone to guess.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-blurple px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blurple/90"
            >
              Add to Discord
            </a>
            <span className="text-sm text-discord-muted">Free • No tracking</span>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="mb-8 text-center text-2xl font-bold">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Start a Round',
                desc: 'Type <code class="text-blurple">/guess start</code> in any channel. The bot finds a random message from your server.',
              },
              {
                step: '2',
                title: 'Study the Clues',
                desc: 'The message appears with the author hidden. Use <code class="text-blurple">/guess hint</code> for extra clues.',
              },
              {
                step: '3',
                title: 'Guess &amp; Score',
                desc: 'Type <code class="text-blurple">/guess @user</code> or pick from the dropdown. Correct = points on the leaderboard!',
              },
            ].map((card) => (
              <div
                key={card.step}
                className="rounded-lg border border-white/10 bg-discord-card p-6"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blurple text-sm font-bold text-white">
                  {card.step}
                </span>
                <h3 className="mt-4 font-semibold text-lg">{card.title}</h3>
                <p
                  className="mt-2 text-sm text-discord-muted"
                  dangerouslySetInnerHTML={{ __html: card.desc }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <h2 className="mb-6 text-center text-2xl font-bold">Commands</h2>
          <div className="overflow-hidden rounded-lg border border-white/10">
            {[
              { cmd: '/guess start [#channel]', desc: 'Start a new round' },
              { cmd: '/guess @user', desc: 'Guess who wrote the message' },
              { cmd: '/guess hint', desc: 'Get a clue about the author' },
              { cmd: '/guess reveal', desc: 'Give up and reveal the author' },
              { cmd: '/guess leaderboard', desc: 'Show top scorers' },
              { cmd: '/guess config channels', desc: 'Set which channels to include' },
            ].map((row) => (
              <div
                key={row.cmd}
                className="flex items-center justify-between border-b border-white/10 px-6 py-3 last:border-0"
              >
                <code className="text-sm text-blurple">{row.cmd}</code>
                <span className="text-sm text-discord-muted">{row.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-discord-muted">
        Guess the Author &mdash; built for Discord
      </footer>
    </div>
  );
}
