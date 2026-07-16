import 'dotenv/config';
import { db, schema } from '../db/index.js';

async function main() {
  try {
    const allUsers = await db.select().from(schema.users);
    console.log('--- USERS IN DATABASE ---');
    console.log(JSON.stringify(allUsers, null, 2));

    const allProfiles = await db.select().from(schema.profiles);
    console.log('\n--- PROFILES (USER LINKS) IN DATABASE ---');
    console.log(JSON.stringify(allProfiles, null, 2));

    const studentProfs = await db.select().from(schema.studentProfiles);
    console.log('\n--- STUDENT PROFILES IN DATABASE ---');
    console.log(JSON.stringify(studentProfs, null, 2));

    const teacherProfs = await db.select().from(schema.teacherProfiles);
    console.log('\n--- TEACHER PROFILES IN DATABASE ---');
    console.log(JSON.stringify(teacherProfs, null, 2));
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

main();
