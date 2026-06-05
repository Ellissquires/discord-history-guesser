import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        blurple: '#5865F2',
        'discord-dark': '#1e1f22',
        'discord-darker': '#111214',
        'discord-card': '#2b2d31',
        'discord-text': '#dbdee1',
        'discord-muted': '#949ba4',
        'discord-green': '#57F287',
        'discord-red': '#ED4245',
        'discord-yellow': '#FEE75C',
      },
    },
  },
  plugins: [],
};

export default config;
