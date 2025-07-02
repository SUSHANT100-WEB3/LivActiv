console.log('Starting Firebase Admin test script...');

let admin, serviceAccount;
try {
  admin = require('firebase-admin');
  serviceAccount = require('../serviceAccountKey.json');
} catch (initError) {
  console.error('Initialization error:', initError);
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (initAppError) {
  console.error('Error initializing Firebase Admin SDK:', initAppError);
  process.exit(1);
}

const db = admin.firestore();

async function testConnection() {
  try {
    const snapshot = await db.collection('test').get();
    console.log('Successfully connected to Firestore. Document count:', snapshot.size);
  } catch (error) {
    console.error('Error connecting to Firestore:', error);
  } finally {
    console.log('Test script finished.');
  }
}

async function insertMockEvents() {
  const mockEvents = [
    {
      title: 'Morning Yoga in Phoenix',
      type: 'Yoga',
      description: 'Start your day with a relaxing yoga session in Phoenix.',
      price: 'Free',
      maxCapacity: 20,
      currentAttendees: 0,
      latitude: 33.4484,
      longitude: -112.0740,
      location: 'Phoenix, AZ',
      date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)), // 1 day from now
      organizer: 'mock-organizer-1',
      organizerName: 'Alice Smith',
      image: '',
      indoorOutdoor: 'outdoor',
      autoApprove: true,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
    },
    {
      title: 'Evening Basketball Game',
      type: 'Basketball',
      description: 'Join us for a friendly basketball match in Phoenix. All skill levels welcome!',
      price: '$5',
      maxCapacity: 10,
      currentAttendees: 0,
      latitude: 33.4484,
      longitude: -112.0740,
      location: 'Phoenix, AZ',
      date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 86400000)), // 2 days from now
      organizer: 'mock-organizer-2',
      organizerName: 'Bob Johnson',
      image: '',
      indoorOutdoor: 'outdoor',
      autoApprove: false,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 86400000)),
    },
    {
      title: 'Indoor Volleyball Tournament',
      type: 'Volleyball',
      description: 'Compete in our indoor volleyball tournament in Phoenix. Prizes for winners!',
      price: '$10',
      maxCapacity: 16,
      currentAttendees: 0,
      latitude: 33.4484,
      longitude: -112.0740,
      location: 'Phoenix, AZ',
      date: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 86400000)), // 3 days from now
      organizer: 'mock-organizer-3',
      organizerName: 'Carol Lee',
      image: '',
      indoorOutdoor: 'indoor',
      autoApprove: true,
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 3 * 86400000)),
    },
  ];

  for (const event of mockEvents) {
    try {
      const docRef = await db.collection('events').add(event);
      console.log(`Inserted mock event with ID: ${docRef.id}`);
    } catch (error) {
      console.error('Error inserting mock event:', error);
    }
  }
  console.log('Mock event insertion complete.');
}

insertMockEvents().then(testConnection); 