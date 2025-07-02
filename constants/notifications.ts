import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';
import { auth, db, messaging } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  
  // Set up notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    // Create specific channels for different notification types
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Events',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1877F2',
    });

    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bookings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    });

    await Notifications.setNotificationChannelAsync('chat', {
      name: 'Chat',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
    });
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  // Get Expo push token
  const expoToken = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Get FCM token if messaging is supported
  let fcmToken = null;
  if (messaging) {
    try {
      // For React Native, we don't need VAPID key - it's only for web
      fcmToken = await getToken(messaging);
      console.log('FCM Token obtained successfully:', fcmToken ? 'Yes' : 'No');
    } catch (error) {
      console.log('FCM token error:', error);
      console.log('This is normal in development/simulator. FCM tokens only work on physical devices.');
    }
  } else {
    console.log('Messaging not supported or not initialized');
  }

  // Save tokens to Firestore
  const user = auth.currentUser;
  if (user) {
    await setDoc(doc(db, 'users', user.uid), { 
      expoPushToken: expoToken,
      fcmToken: fcmToken,
      lastTokenUpdate: new Date().toISOString()
    }, { merge: true });
  }

  return { expoToken, fcmToken };
}

// Handle foreground messages
export function setupForegroundMessageHandler() {
  if (messaging) {
    return onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // Show local notification
      Notifications.scheduleNotificationAsync({
        content: {
          title: payload.notification?.title || 'New Message',
          body: payload.notification?.body || 'You have a new message',
          data: payload.data,
        },
        trigger: null, // Show immediately
      });
    });
  }
  return null;
}

// Send push notification to specific user
export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    // Get user's tokens from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('User not found');
      return;
    }

    const userData = userDoc.data();
    const expoToken = userData.expoPushToken;
    const fcmToken = userData.fcmToken;

    // Send via Expo push service
    if (expoToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoToken,
          title,
          body,
          data,
          sound: 'default',
        }),
      });
    }

    // Send via FCM (you'll need to implement server-side FCM sending)
    if (fcmToken) {
      // This would typically be done from your backend
      console.log('FCM token available for user:', userId);
    }

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// Send notification to multiple users
export async function sendPushNotificationToMultipleUsers(userIds: string[], title: string, body: string, data?: any) {
  for (const userId of userIds) {
    await sendPushNotification(userId, title, body, data);
  }
}

// Notification Types for different scenarios
export const NotificationTypes = {
  EVENT_REMINDER: 'event_reminder',
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_REQUEST: 'booking_request',
  CHAT_MESSAGE: 'chat_message',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  NEW_ATTENDEE: 'new_attendee',
  ATTENDEE_LEFT: 'attendee_left',
};

// Send event reminder notification
export async function sendEventReminder(userId: string, event: any) {
  const title = 'Event Reminder';
  const body = `Your event "${event.title}" starts in 1 hour!`;
  const data = {
    type: NotificationTypes.EVENT_REMINDER,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotification(userId, title, body, data);
}

// Send booking confirmation notification
export async function sendBookingConfirmation(userId: string, event: any) {
  const title = 'Booking Confirmed!';
  const body = `Your booking for "${event.title}" has been confirmed.`;
  const data = {
    type: NotificationTypes.BOOKING_CONFIRMATION,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotification(userId, title, body, data);
}

// Send booking request notification to organizer
export async function sendBookingRequest(organizerId: string, event: any, attendeeName: string) {
  const title = 'New Booking Request';
  const body = `${attendeeName} wants to join "${event.title}"`;
  const data = {
    type: NotificationTypes.BOOKING_REQUEST,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotification(organizerId, title, body, data);
}

// Send chat message notification
export async function sendChatNotification(userId: string, event: any, senderName: string, message: string) {
  const title = `New message in ${event.title}`;
  const body = `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`;
  const data = {
    type: NotificationTypes.CHAT_MESSAGE,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotification(userId, title, body, data);
}

// Send event update notification
export async function sendEventUpdate(userIds: string[], event: any, updateType: string) {
  const title = 'Event Updated';
  const body = `"${event.title}" has been updated: ${updateType}`;
  const data = {
    type: NotificationTypes.EVENT_UPDATE,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotificationToMultipleUsers(userIds, title, body, data);
}

// Send event cancellation notification
export async function sendEventCancellation(userIds: string[], event: any) {
  const title = 'Event Cancelled';
  const body = `"${event.title}" has been cancelled.`;
  const data = {
    type: NotificationTypes.EVENT_CANCELLED,
    eventId: event.id,
    eventTitle: event.title,
  };
  
  await sendPushNotificationToMultipleUsers(userIds, title, body, data);
}

// Schedule event reminder (1 hour before event)
export async function scheduleEventReminder(event: any, attendeeIds: string[]) {
  const eventDate = new Date(event.date);
  const reminderDate = new Date(eventDate.getTime() - 60 * 60 * 1000); // 1 hour before
  
  if (reminderDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event Reminder',
        body: `Your event "${event.title}" starts in 1 hour!`,
        data: {
          type: NotificationTypes.EVENT_REMINDER,
          eventId: event.id,
          eventTitle: event.title,
        },
      },
      trigger: {
        date: reminderDate,
      },
    });
  }
}

// Get notification badge count
export async function getNotificationBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

// Set notification badge count
export async function setNotificationBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// Clear all scheduled notifications
export async function clearAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
} 