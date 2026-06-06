export function defineCommands() {
  return [
    {
      name: 'guess',
      description: 'Start or play a round of Guess the Author',
      options: [
        {
          type: 1,
          name: 'start',
          description: 'Start a new round — picks a random message from the server',
          options: [
            {
              type: 7,
              name: 'channel',
              description: 'Pick a message from a specific channel (optional)',
              required: false,
              channel_types: [0],
            },
            {
              type: 4,
              name: 'rounds',
              description: 'Number of rounds to play in a row (default: 1)',
              required: false,
              min_value: 1,
              max_value: 10,
            },
          ],
        },
        {
          type: 1,
          name: 'target',
          description: 'Guess who wrote the current message',
          options: [
            {
              type: 6,
              name: 'user',
              description: 'The user you think wrote it',
              required: true,
            },
          ],
        },
        {
          type: 1,
          name: 'hint',
          description: 'Get a clue about the author',
        },
        {
          type: 1,
          name: 'reveal',
          description: 'Give up and reveal the author',
        },
        {
          type: 1,
          name: 'leaderboard',
          description: 'Show the top guessers',
        },
        {
          type: 1,
          name: 'config',
          description: 'Configure allowed channels for this server',
          options: [
            {
              type: 3,
              name: 'channels',
              description: 'Channel mentions or IDs, comma-separated',
              required: false,
            },
            {
              type: 5,
              name: 'reset',
              description: 'Reset to allow all channels',
              required: false,
            },
          ],
        },
      ],
    },
  ];
}
