// MongoDB initialization script
db = db.getSiblingDB('finsense');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'passwordHash'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        passwordHash: {
          bsonType: 'string'
        },
        profile: {
          bsonType: 'object',
          properties: {
            firstName: { bsonType: 'string' },
            lastName: { bsonType: 'string' },
            preferences: {
              bsonType: 'object',
              properties: {
                currency: { bsonType: 'string' },
                alertThreshold: { bsonType: 'number' }
              }
            }
          }
        }
      }
    }
  }
});

db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'date', 'amount', 'description'],
      properties: {
        userId: { bsonType: 'objectId' },
        date: { bsonType: 'date' },
        amount: { bsonType: 'number' },
        description: { bsonType: 'string' },
        category: {
          bsonType: 'object',
          properties: {
            name: { bsonType: 'string' },
            confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
            isUserVerified: { bsonType: 'bool' }
          }
        }
      }
    }
  }
});

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.transactions.createIndex({ userId: 1, date: -1 });
db.transactions.createIndex({ userId: 1, 'category.name': 1 });

print('Database initialized successfully');