import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
    registerForPushNotificationsAsync,
    sendPushNotification,
    sendPushNotificationToMultipleUsers,
    setupForegroundMessageHandler,
} from '../constants/notifications';

export default function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [fcmToken, setFcmToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    registerForPushNotificationsAsync().then((tokens) => {
      setExpoPushToken(tokens?.expoToken || '');
      setFcmToken(tokens?.fcmToken || undefined);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    // Set up foreground message handler
    const foregroundHandler = setupForegroundMessageHandler();

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        console.log('App has come to foreground');
      }
      appState.current = nextAppState;
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (foregroundHandler) {
        foregroundHandler();
      }
      subscription?.remove();
    };
  }, []);

  const sendNotification = async (userId: string, title: string, body: string, data?: any) => {
    return await sendPushNotification(userId, title, body, data);
  };

  const sendNotificationToMultiple = async (userIds: string[], title: string, body: string, data?: any) => {
    return await sendPushNotificationToMultipleUsers(userIds, title, body, data);
  };

  const scheduleLocalNotification = async (
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput,
    data?: any
  ) => {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: trigger || { type: 'daily' } as Notifications.NotificationTriggerInput,
    });
  };

  const cancelAllNotifications = async () => {
    return await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const getBadgeCount = async () => {
    return await Notifications.getBadgeCountAsync();
  };

  const setBadgeCount = async (count: number) => {
    return await Notifications.setBadgeCountAsync(count);
  };

  return {
    expoPushToken,
    fcmToken,
    notification,
    sendNotification,
    sendNotificationToMultiple,
    scheduleLocalNotification,
    cancelAllNotifications,
    getBadgeCount,
    setBadgeCount,
  };
} 