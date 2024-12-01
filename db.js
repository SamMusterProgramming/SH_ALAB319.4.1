const { MongoClient } = require('mongodb');
require('dotenv').config();

const client = new MongoClient(process.env.ATLAS_URL);

const validationRules = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['student_id', 'class_id'],
    properties: {
      student_id: {
        bsonType: 'int',
        description: 'must be integer and is required'
      },
      class_id: {
        bsonType: 'int',
        minimum: 0, 
        maximum:300,
        description: 'must be an integer and is required'
      }
    }
  }
};
    
async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('sample_training'); 
    return db;
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
}

module.exports = connectDB;
