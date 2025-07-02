import { Ionicons } from '@expo/vector-icons';
import { CardField, useConfirmPayment, useStripe } from '@stripe/stripe-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    formatAmount,
    getModeIndicators,
    PAYMENT_STATUS,
    STRIPE_MODE,
    TEST_CARDS,
    validatePaymentAmount,
    getStripePublishableKey,
    parseAmount,
    createPaymentIntent,
    confirmPaymentWithBackend,
    getStripeErrorMessage
} from '../constants/stripe';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface StripePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number; // Amount in cents
  eventTitle: string;
  eventId: string;
  onSuccess: (paymentIntentId: string) => void;
  onFailure?: (error: string) => void;
}

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({ 
  visible, 
  onClose, 
  amount, 
  eventTitle,
  eventId,
  onSuccess,
  onFailure 
}) => {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<keyof typeof PAYMENT_STATUS>('PENDING');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { confirmPayment } = useConfirmPayment();

  const modeIndicators = getModeIndicators();
  const isTestMode = STRIPE_MODE === 'test';
  const amountInDollars = formatAmount(amount);

  // Create PaymentIntent when modal opens
  React.useEffect(() => {
    if (visible && !clientSecret) {
      createPaymentIntentForEvent();
    }
  }, [visible]);

  const createPaymentIntentForEvent = async () => {
    setLoading(true);
    setPaymentStatus('PROCESSING');

    try {
      const paymentIntentData = await createPaymentIntent(amount, 'usd', {
        eventId,
        eventTitle,
        type: 'event_booking',
      });

      setClientSecret(paymentIntentData.clientSecret);
      setPaymentIntentId(paymentIntentData.paymentIntentId);
      setPaymentStatus('PENDING');
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      setPaymentStatus('FAILED');
      Alert.alert('Payment Error', error.message || 'Failed to initialize payment');
      onFailure?.(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Invalid Card', 'Please enter valid card details');
      return;
    }

    if (!validatePaymentAmount(amount)) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    if (!clientSecret) {
      Alert.alert('Payment Error', 'Payment not initialized. Please try again.');
      return;
    }

    setLoading(true);
    setPaymentStatus('PROCESSING');

    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            email: 'user@livactiv.com', // In production, get from user profile
            name: 'Event Attendee', // In production, get from user profile
          },
        },
      });

      if (error) {
        setPaymentStatus('FAILED');
        const errorMessage = getStripeErrorMessage(error.code) || error.message || 'Payment failed';
        Alert.alert('Payment Failed', errorMessage);
        onFailure?.(errorMessage);
      } else if (paymentIntent) {
        setPaymentStatus('SUCCEEDED');
        
        // Confirm payment with backend
        try {
          if (paymentIntentId) {
            await confirmPaymentWithBackend(paymentIntentId, eventId);
          }
        } catch (backendError: any) {
          console.error('Backend confirmation error:', backendError);
          // Payment succeeded on Stripe but backend confirmation failed
          // This should be handled by webhook, but we'll still show success
        }
        
        if (isTestMode) {
          Alert.alert(
            'Payment Successful (Test Mode)', 
            `Your test payment of $${amountInDollars} was successful!\n\nThis is a test transaction - no real money was charged.`,
            [{ text: 'OK', onPress: () => onSuccess(paymentIntent.id) }]
          );
        } else {
          Alert.alert(
            'Payment Successful', 
            `Your payment of $${amountInDollars} was successful!\n\nYou will receive a confirmation email shortly.`,
            [{ text: 'OK', onPress: () => onSuccess(paymentIntent.id) }]
          );
        }
      }
    } catch (e: any) {
      setPaymentStatus('FAILED');
      const errorMessage = e.message || 'An unexpected error occurred';
      Alert.alert('Payment Error', errorMessage);
      onFailure?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'PROCESSING':
        return <ActivityIndicator size="small" color={colors.primary} />;
      case 'SUCCEEDED':
        return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
      case 'FAILED':
        return <Ionicons name="close-circle" size={20} color={colors.error} />;
      default:
        return <Ionicons name="card" size={20} color={colors.primary} />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'PROCESSING':
        return 'Processing Payment...';
      case 'SUCCEEDED':
        return 'Payment Successful!';
      case 'FAILED':
        return 'Payment Failed';
      default:
        return 'Ready to Pay';
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setClientSecret(null);
    setPaymentIntentId(null);
    setPaymentStatus('PENDING');
    setCardDetails(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Test Mode Banner */}
          <View style={[styles.modeBanner, { backgroundColor: modeIndicators.banner.backgroundColor }]}>
            <Ionicons 
              name={isTestMode ? "flask" : "shield-checkmark"} 
              size={16} 
              color={modeIndicators.banner.textColor} 
            />
            <Text style={[styles.modeBannerText, { color: modeIndicators.banner.textColor }]}>
              {modeIndicators.banner.text}
            </Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Event Details */}
          <View style={styles.eventDetails}>
            <Text style={styles.eventTitle}>{eventTitle}</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Amount:</Text>
              <Text style={styles.amount}>${amountInDollars}</Text>
            </View>
          </View>

          {/* Payment Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              {getStatusIcon()}
            </View>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {/* Card Input */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardLabel}>Card Details</Text>
            <CardField
              postalCodeEnabled={false}
              placeholders={{
                number: isTestMode ? TEST_CARDS.success : 'Card number',
              }}
              cardStyle={styles.card}
              style={styles.cardField}
              onCardChange={setCardDetails}
            />
          </View>

          {/* Test Mode Info */}
          {isTestMode && (
            <View style={[styles.testInfoContainer, { backgroundColor: modeIndicators.info.backgroundColor }]}>
              <Ionicons name="information-circle" size={16} color={modeIndicators.info.textColor} />
              <Text style={[styles.testInfoText, { color: modeIndicators.info.textColor }]}>
                {modeIndicators.info.text}
              </Text>
            </View>
          )}

          {/* Pay Button */}
          <TouchableOpacity 
            style={[
              styles.payButton, 
              { 
                backgroundColor: modeIndicators.button.backgroundColor,
                opacity: loading || !cardDetails?.complete || !clientSecret ? 0.6 : 1
              }
            ]} 
            onPress={handlePay} 
            disabled={loading || !cardDetails?.complete || !clientSecret}
          >
            {loading ? (
              <ActivityIndicator color={modeIndicators.button.textColor} />
            ) : (
              <Text style={[styles.payButtonText, { color: modeIndicators.button.textColor }]}>
                {clientSecret ? modeIndicators.button.text : 'Initializing...'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="lock-closed" size={12} color={colors.muted} />
            <Text style={styles.securityText}>
              Your payment information is secure and encrypted
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  modeBannerText: {
    fontSize: fontSizes.small,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  eventDetails: {
    marginBottom: spacing.lg,
  },
  eventTitle: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSizes.medium,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.md,
  },
  statusIcon: {
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.medium,
    color: colors.text,
    fontWeight: '500',
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
  cardLabel: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  testInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },
  testInfoText: {
    fontSize: fontSizes.small,
    marginLeft: spacing.xs,
    flex: 1,
  },
  payButton: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  payButtonText: {
    fontSize: fontSizes.medium,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSizes.medium,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  securityText: {
    fontSize: fontSizes.small,
    color: colors.muted,
    marginLeft: spacing.xs,
  },
});

export default StripePaymentModal; 