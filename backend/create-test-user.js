const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/finsense?authSource=admin');
    console.log('Connected to MongoDB');

    // Check if test user already exists by email
    let testUser = await User.findOne({ email: 'test@example.com' });
    
    if (testUser) {
      console.log('Test user already exists');
      console.log('User ID:', testUser._id);
      console.log('Email:', testUser.email);
      
      // Update the auth middleware to use this existing user ID
      console.log('Use this ObjectId in auth middleware:', testUser._id.toString());
      process.exit(0);
    }

    // Create test user
    testUser = new User({
      email: 'test@example.com',
      passwordHash: 'Test@1234', // This will be hashed by the pre-save middleware
      profile: {
        firstName: 'Test',
        lastName: 'User',
        preferences: {
          currency: 'USD',
          alertThreshold: 0.8
        }
      },
      isActive: true,
      emailVerified: true
    });

    await testUser.save();
    console.log('Test user created successfully');
    console.log('User ID:', testUser._id);
    console.log('Email:', testUser.email);

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Load environment variables
require('dotenv').config();

createTestUser();