import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { PixelRatio, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const BookingStatusScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation<any>();
  const status = route?.params?.status || 'Confirmed';
  const event = route?.params?.event || { title: 'Morning Yoga', date: 'Jan 15, 7:00 AM', price: 'Free' };
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(400));
  const styles = getStyles({ scaleSize, scaleFont });

  const getStatusIcon = () => {
    switch (status) {
      case 'Confirmed':
        return <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />;
      case 'Pending':
        return <Ionicons name="time" size={64} color="#FF9800" />;
      case 'Rejected':
        return <Ionicons name="close-circle" size={64} color="#F44336" />;
      default:
        return <Ionicons name="information-circle" size={64} color="#1877F2" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'Confirmed':
        return event.price === 'Free' 
          ? 'You\'re all set! Your spot is confirmed.'
          : 'Payment successful! Your spot is confirmed.';
      case 'Pending':
        return event.price === 'Free'
          ? 'Your request is pending approval from the organizer.'
          : 'Payment received! Waiting for organizer approval.';
      case 'Rejected':
        return 'Your booking request was not approved.';
      default:
        return 'Your booking status is being processed.';
    }
  };

  const getNextSteps = () => {
    switch (status) {
      case 'Confirmed':
        return [
          'Check the event details and location',
          'Message the organizer if you have questions',
          'Set a reminder for the event date'
        ];
      case 'Pending':
        return [
          'The organizer will review your request',
          'You\'ll receive a notification when approved',
          'Check back here for status updates'
        ];
      case 'Rejected':
        return [
          'You can try booking other events',
          'Contact the organizer if you have questions',
          'Check for similar events in your area'
        ];
      default:
        return [
          'Check back here for status updates',
          'Contact support if you have questions'
        ];
    }
  };

  const handleAction = () => {
    if (status === 'Confirmed') {
      navigation.navigate('ChatRoom', { event });
    } else if (status === 'Rejected') {
      navigation.navigate('Home');
    } else {
      navigation.navigate('activities');
    }
  };

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const getActionButtonText = () => {
    switch (status) {
      case 'Confirmed':
        return 'Message Organizer';
      case 'Pending':
        return 'View My Activities';
      case 'Rejected':
        return 'Find Other Events';
      default:
        return 'Back to Events';
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA' }}>
      <View style={[styles.card, { maxWidth: maxCardWidth, width: '100%' }]}> 
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          {getStatusIcon()}
        </View>

        {/* Status Title */}
        <Text style={styles.title}>Booking {status}</Text>
        
        {/* Status Message */}
        <Text style={styles.message}>{getStatusMessage()}</Text>

        {/* Event Details */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>{event.date}</Text>
          <Text style={styles.eventPrice}>{event.price}</Text>
        </View>

        {/* Next Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Next Steps:</Text>
          {getNextSteps().map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Ionicons name="checkmark" size={16} color="#1877F2" style={styles.stepIcon} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.button} onPress={handleAction}>
          <Text style={styles.buttonText}>{getActionButtonText()}</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number }) => StyleSheet.create({
  card: { 
    backgroundColor: '#fff', 
    padding: scaleSize(24), 
    borderRadius: scaleSize(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(4) },
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(8),
    elevation: 5
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: scaleSize(16)
  },
  title: { 
    fontSize: scaleFont(28), 
    fontWeight: 'bold', 
    textAlign: 'center',
    color: '#1877F2',
    marginBottom: scaleSize(12)
  },
  message: {
    fontSize: scaleFont(16),
    textAlign: 'center',
    color: '#666',
    marginBottom: scaleSize(24),
    lineHeight: scaleFont(22)
  },
  eventCard: {
    backgroundColor: '#F7F8FA',
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
    marginBottom: scaleSize(24),
    borderLeftWidth: scaleSize(4),
    borderLeftColor: '#1877F2'
  },
  eventTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#1877F2',
    marginBottom: scaleSize(4)
  },
  eventDate: {
    fontSize: scaleFont(14),
    color: '#666',
    marginBottom: scaleSize(2)
  },
  eventPrice: {
    fontSize: scaleFont(14),
    color: '#4CAF50',
    fontWeight: '600'
  },
  stepsContainer: {
    marginBottom: scaleSize(24)
  },
  stepsTitle: {
    fontSize: scaleFont(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scaleSize(12)
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(8)
  },
  stepIcon: {
    marginRight: scaleSize(8)
  },
  stepText: {
    fontSize: scaleFont(14),
    color: '#666',
    flex: 1
  },
  button: { 
    backgroundColor: '#1877F2', 
    padding: scaleSize(16), 
    borderRadius: scaleSize(12), 
    alignItems: 'center',
    marginBottom: scaleSize(12)
  },
  buttonText: { 
    color: '#fff', 
    fontSize: scaleFont(16), 
    fontWeight: 'bold' 
  },
  backButton: { 
    padding: scaleSize(12), 
    alignItems: 'center' 
  },
  backButtonText: { 
    color: '#1877F2', 
    fontSize: scaleFont(16), 
    fontWeight: '600' 
  }
});

export default BookingStatusScreen; 