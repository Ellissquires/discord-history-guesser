import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function clearScores() {
  console.log('Fetching all score keys...');
  
  // Upstash Redis supports KEYS command
  const keys = await redis.keys('scores:*');
  
  if (!keys || keys.length === 0) {
    console.log('No score keys found. Already clean!');
    return;
  }
  
  console.log(`Found ${keys.length} score key(s):`);
  for (const key of keys) {
    console.log(`  - ${key}`);
  }
  
  console.log('\nClearing...');
  for (const key of keys) {
    await redis.del(key);
    console.log(`  ✓ Cleared ${key}`);
  }
  
  console.log('\n🎉 All leaderboards cleared!');
}

clearScores().catch((err) => {
  console.error('❌ Failed to clear scores:', err);
  process.exit(1);
});
