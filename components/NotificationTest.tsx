import { User } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../constants/firebase';
import useNotifications from '../hooks/useNotifications';

export default function NotificationTest() {
  const { 
    expoPushToken, 
    fcmToken, 
    sendNotification, 
    scheduleLocalNotification,
    getBadgeCount,
    setBadgeCount 
  } = useNotifications();
  const [badgeCount, setBadgeCountState] = useState(0);

  const handleSendTestNotification = async () => {
    try {
      const currentUser: User | null = auth?.currentUser || null;
      if (!currentUser) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      await sendNotification(
        currentUser.uid,
        'Test Notification',
        'This is a test push notification from FCM!',
        { type: 'test', timestamp: new Date().toISOString() }
      );
      
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification');
      console.error('Notification error:', error);
    }
  };

  const handleScheduleLocalNotification = async () => {
    try {
      await scheduleLocalNotification(
        'Scheduled Notification',
        'This notification was scheduled for 5 seconds from now',
        undefined
      );
      
      Alert.alert('Success', 'Local notification scheduled for 5 seconds!');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule notification');
      console.error('Schedule error:', error);
    }
  };

  const handleGetBadgeCount = async () => {
    try {
      const count = await getBadgeCount();
      setBadgeCountState(count);
      Alert.alert('Badge Count', `Current badge count: ${count}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to get badge count');
    }
  };

  const handleSetBadgeCount = async () => {
    try {
      const newCount = badgeCount + 1;
      await setBadgeCount(newCount);
      setBadgeCountState(newCount);
      Alert.alert('Success', `Badge count set to: ${newCount}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set badge count');
    }
  };

  const getFCMStatus = () => {
    if (fcmToken) {
      return { status: 'Available', color: '#4CAF50', message: 'FCM token is working!' };
    } else {
      return { 
        status: 'Not Available', 
        color: '#FF9800', 
        message: 'This is normal in development/simulator. FCM tokens only work on physical devices.' 
      };
    }
  };

  const fcmStatus = getFCMStatus();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Cloud Messaging Test</Text>
      
      <View style={styles.tokenContainer}>
        <Text style={styles.label}>Expo Push Token:</Text>
        <Text style={styles.token} numberOfLines={2}>
          {expoPushToken || 'Loading...'}
        </Text>
        
        <Text style={styles.label}>FCM Token Status:</Text>
        <Text style={[styles.status, { color: fcmStatus.color }]}>
          {fcmStatus.status}
        </Text>
        <Text style={styles.statusMessage}>
          {fcmStatus.message}
        </Text>
        
        {fcmToken && (
          <Text style={styles.token} numberOfLines={2}>
            {fcmToken}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSendTestNotification}
        >
          <Text style={styles.buttonText}>Send Test Push Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleScheduleLocalNotification}
        >
          <Text style={styles.buttonText}>Schedule Local Notification (5s)</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleGetBadgeCount}
        >
          <Text style={styles.buttonText}>Get Badge Count</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSetBadgeCount}
        >
          <Text style={styles.buttonText}>Increment Badge Count</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.badgeText}>Current Badge Count: {badgeCount}</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Testing Information:</Text>
        <Text style={styles.infoText}>• Expo Push Tokens work in all environments</Text>
        <Text style={styles.infoText}>• FCM Tokens only work on physical devices</Text>
        <Text style={styles.infoText}>• Local notifications work everywhere</Text>
        <Text style={styles.infoText}>• Check console logs for detailed FCM status</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7F8FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1877F2',
  },
  tokenContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  token: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
    color: '#666',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1877F2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  badgeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1877F2',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1877F2',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
}); 