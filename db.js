const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.ATLAS_URL);


async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('grades'); 
    return db;
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
