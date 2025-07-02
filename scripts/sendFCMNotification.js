const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'livactiv-c6c38'
});

/**
 * Send FCM notification to a specific user
 * @param {string} fcmToken - The FCM token of the target user
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 */
async function sendFCMNotification(fcmToken, title, body, data = {}) {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      android: {
        notification: {
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Send FCM notification to multiple users
 * @param {Array} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 */
async function sendFCMNotificationToMultipleUsers(fcmTokens, title, body, data = {}) {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data,
      android: {
        notification: {
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent messages:', response);
    return response;
  } catch (error) {
    console.error('Error sending messages:', error);
    throw error;
  }
}

/**
 * Send FCM notification to a topic
 * @param {string} topic - Topic name
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data to send with notification
 */
async function sendFCMNotificationToTopic(topic, title, body, data = {}) {
  try {
    const message = {
      topic: topic,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      android: {
        notification: {
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message to topic:', response);
    return response;
  } catch (error) {
    console.error('Error sending message to topic:', error);
    throw error;
  }
}

/**
 * Subscribe a user to a topic
 * @param {string} fcmToken - The FCM token of the user
 * @param {string} topic - Topic name
 */
async function subscribeToTopic(fcmToken, topic) {
  try {
    const response = await admin.messaging().subscribeToTopic(fcmToken, topic);
    console.log('Successfully subscribed to topic:', response);
    return response;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    throw error;
  }
}

/**
 * Unsubscribe a user from a topic
 * @param {string} fcmToken - The FCM token of the user
 * @param {string} topic - Topic name
 */
async function unsubscribeFromTopic(fcmToken, topic) {
  try {
    const response = await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
    console.log('Successfully unsubscribed from topic:', response);
    return response;
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    throw error;
  }
}

// Example usage
async function example() {
  // Send to single user
  await sendFCMNotification(
    'user-fcm-token-here',
    'New Event Created',
    'A new sports event has been created in your area!',
    { eventId: '123', eventTitle: 'Basketball Game' }
  );

  // Send to multiple users
  await sendFCMNotificationToMultipleUsers(
    ['token1', 'token2', 'token3'],
    'Event Reminder',
    'Your event starts in 30 minutes!',
    { eventId: '456', eventTitle: 'Soccer Match' }
  );

  // Send to topic
  await sendFCMNotificationToTopic(
    'basketball_events',
    'Basketball Tournament',
    'Registration for the basketball tournament is now open!',
    { tournamentId: '789', registrationUrl: 'https://example.com/register' }
  );
}

module.exports = {
  sendFCMNotification,
  sendFCMNotificationToMultipleUsers,
  sendFCMNotificationToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
};

// Uncomment to run example
// example().catch(console.error); 