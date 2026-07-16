import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const allUsers = await db.select().from(schema.users).limit(10);
    console.log('All Users:', allUsers);

    const allProfiles = await db.select().from(schema.profiles).limit(10);
    console.log('All Profiles:', allProfiles);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

main();
