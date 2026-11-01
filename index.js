const { Client } = require("pg");
const { MongoClient } = require("mongodb");

const pgClient = new Client(process.env.POSTGRESQL_URL);

const mongoUri = process.env.MONGO_URL;

async function migrateAllTables() {
  try {
    await pgClient.connect();
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const mongoDb = mongoClient.db();

    // Fetch all table names
    const tableRes = await pgClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tables = tableRes.rows.map((row) => row.table_name);

    for (const table of tables) {
      console.log(`Migrating table: ${table}`);
      const result = await pgClient.query(`SELECT * FROM ${table}`);
      const documents = result.rows.map((row) => ({
        ...row,
        _id: row.id || undefined, // Optional: Map primary key to `_id`
      }));

      if (documents.length) {
        const collection = mongoDb.collection(table);
        await collection.insertMany(documents);
        console.log(`✅ ${table} migrated successfully.`);
      } else {
        console.log(`⚠️ ${table} has no data.`);
      }
    }

    await pgClient.end();
    await mongoClient.close();
    console.log("🎉 Migration completed for all tables.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrateAllTables();
