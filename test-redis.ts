import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function test() {
  console.log('Testing Redis connection...');

  // Test write
  await redis.set('test', 'Hello from Discord History Guesser!');
  console.log('✅ Write OK');

  // Test read
  const value = await redis.get('test');
  console.log('✅ Read OK:', value);

  // Test hash operations (used for scores)
  await redis.hset('test:scores', { user123: 5 });
  const scores = await redis.hgetall('test:scores');
  console.log('✅ Hash OK:', scores);

  // Cleanup
  await redis.del('test');
  await redis.del('test:scores');
  console.log('✅ Cleanup OK');

  console.log('\n🎉 All Redis tests passed!');
}

test().catch((err) => {
  console.error('❌ Redis test failed:', err);
  process.exit(1);
});
