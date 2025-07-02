# Firebase Cloud Messaging (FCM) Setup Guide

This guide explains how to set up and use Firebase Cloud Messaging for push notifications in your LivActiv React Native app.

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. Service account key for server-side operations
3. VAPID key for web push notifications

## Setup Steps

### 1. Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`livactiv-c6c38`)
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Generate a new **Web Push certificate** (VAPID key)
5. Copy the VAPID key and update it in `constants/notifications.ts`

### 2. Update VAPID Key

In `constants/notifications.ts`, replace `'YOUR_VAPID_KEY_HERE'` with your actual VAPID key:

```typescript
fcmToken = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE',
});
```

### 3. Server-Side Setup

1. Install Firebase Admin SDK:
```bash
npm install firebase-admin
```

2. Download your service account key from Firebase Console:
   - Go to **Project Settings** > **Service Accounts**
   - Click **Generate new private key**
   - Save the JSON file securely

3. Update the path in `scripts/sendFCMNotification.js`:
```javascript
const serviceAccount = require('./path-to-your-service-account-key.json');
```

### 4. App Configuration

The app is already configured with:
- ✅ Firebase initialization with messaging
- ✅ Notification permission handling
- ✅ Token registration and storage
- ✅ Foreground message handling
- ✅ Background message handling
- ✅ Notification response handling

## Usage

### Client-Side (React Native)

#### Using the Hook

```typescript
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const { 
    expoPushToken, 
    fcmToken, 
    sendNotification, 
    scheduleLocalNotification 
  } = useNotifications();

  const handleSendNotification = async () => {
    await sendNotification(
      'user-id',
      'Event Reminder',
      'Your event starts in 30 minutes!',
      { eventId: '123', eventTitle: 'Basketball Game' }
    );
  };

  const handleScheduleNotification = async () => {
    await scheduleLocalNotification(
      'Scheduled Reminder',
      'Don\'t forget your event!',
      { seconds: 300 }, // 5 minutes
      { eventId: '123' }
    );
  };
}
```

#### Test Component

Use the `NotificationTest` component to test notifications:

```typescript
import NotificationTest from '../components/NotificationTest';

// Add to your screen
<NotificationTest />
```

### Server-Side (Node.js)

#### Send to Single User

```javascript
const { sendFCMNotification } = require('./scripts/sendFCMNotification');

await sendFCMNotification(
  'user-fcm-token',
  'New Event',
  'A new event has been created!',
  { eventId: '123', eventTitle: 'Basketball Game' }
);
```

#### Send to Multiple Users

```javascript
const { sendFCMNotificationToMultipleUsers } = require('./scripts/sendFCMNotification');

await sendFCMNotificationToMultipleUsers(
  ['token1', 'token2', 'token3'],
  'Event Reminder',
  'Your event starts soon!',
  { eventId: '456', eventTitle: 'Soccer Match' }
);
```

#### Send to Topic

```javascript
const { sendFCMNotificationToTopic } = require('./scripts/sendFCMNotification');

await sendFCMNotificationToTopic(
  'basketball_events',
  'Tournament Registration',
  'Registration is now open!',
  { tournamentId: '789' }
);
```

## Features

### ✅ Implemented Features

1. **Dual Token System**: Both Expo Push Tokens and FCM Tokens
2. **Permission Handling**: Automatic permission requests
3. **Token Storage**: Tokens saved to Firestore
4. **Foreground Messages**: Handle messages when app is open
5. **Background Messages**: Handle messages when app is closed
6. **Notification Responses**: Handle user taps on notifications
7. **Badge Management**: App icon badge count management
8. **Local Notifications**: Schedule local notifications
9. **Multiple Recipients**: Send to multiple users
10. **Topic Subscriptions**: Subscribe/unsubscribe to topics

### 🔧 Configuration Options

- **Android Channel**: Custom notification channel with high priority
- **iOS Badge**: Automatic badge count management
- **Sound**: Default notification sounds
- **Vibration**: Custom vibration patterns
- **Data Payload**: Custom data with notifications

## Testing

### 1. Test Local Notifications

Use the `NotificationTest` component to test:
- Local notification scheduling
- Badge count management
- Token retrieval

### 2. Test Push Notifications

1. Get a user's FCM token from the test component
2. Use the server-side script to send a test notification
3. Verify the notification appears on the device

### 3. Test Background Messages

1. Send a notification while the app is in background
2. Tap the notification to open the app
3. Verify the notification data is handled correctly

## Troubleshooting

### Common Issues

1. **"FCM token not available"**
   - Check if VAPID key is correct
   - Verify Firebase configuration
   - Check browser/device compatibility

2. **"Permission denied"**
   - Ensure notification permissions are granted
   - Check device notification settings

3. **"Token not saved to Firestore"**
   - Verify user authentication
   - Check Firestore security rules
   - Ensure proper Firebase initialization

### Debug Tips

1. Check console logs for token registration
2. Verify tokens in Firebase Console
3. Test with Expo Push Tool
4. Use Firebase Console to send test messages

## Security Considerations

1. **VAPID Key**: Keep your VAPID key secure
2. **Service Account**: Never commit service account keys to version control
3. **Token Storage**: Tokens are stored securely in Firestore
4. **Permission**: Always request user permission before sending notifications

## Next Steps

1. Implement server-side notification triggers
2. Add notification preferences per user
3. Implement notification history
4. Add rich notifications with images
5. Implement notification analytics

## Support

For issues or questions:
1. Check Firebase documentation
2. Review Expo notifications documentation
3. Check console logs for error messages
4. Test with different devices/platforms 