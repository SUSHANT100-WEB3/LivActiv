import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';
import StripePaymentModal from './StripePaymentModal';

interface EventDetailScreenProps {
  eventId: string;
  onClose: () => void;
}

interface Event {
  id: string;
  title: string;
  type: string;
  description: string;
  price: string;
  maxCapacity: number;
  currentAttendees: number;
  latitude: number;
  longitude: number;
  location: string;
  date: Timestamp | null;
  organizer: string;
  organizerName: string;
  image: string;
  indoorOutdoor: 'indoor' | 'outdoor';
  autoApprove: boolean;
  status: string;
}

interface Booking {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: Timestamp;
  paid?: boolean;
}

const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ eventId, onClose }) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [userRole, setUserRole] = useState<'player' | 'trainer' | 'both'>('player');

  useEffect(() => {
    // Get user role from profile
    const getUserRole = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || 'player');
        }
      }
    };
    getUserRole();

    // Listen to event changes
    const unsubscribeEvent = onSnapshot(doc(db, 'events', eventId), (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() } as Event);
      }
      setLoading(false);
    });

    // Check if user has already booked this event
    if (auth.currentUser) {
      const bookingQuery = query(
        collection(db, 'bookings'),
        where('eventId', '==', eventId),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const unsubscribeBooking = onSnapshot(bookingQuery, (snapshot) => {
        if (!snapshot.empty) {
          const bookingDoc = snapshot.docs[0];
          setBooking({ id: bookingDoc.id, ...bookingDoc.data() } as Booking);
        } else {
          setBooking(null);
        }
      });

      return () => {
        unsubscribeEvent();
        unsubscribeBooking();
      };
    }

    return () => unsubscribeEvent();
  }, [eventId]);

  const handleJoinEvent = () => {
    if (!event || !auth.currentUser) return;
    
    if (event.price === 'Paid') {
      // Extract amount from price string (e.g., "Paid - $25" -> 2500 cents)
      const priceMatch = event.price.match(/\$(\d+(?:\.\d{2})?)/);
      const amount = priceMatch ? parseFloat(priceMatch[1]) * 100 : 2500; // Default to $25 if no amount found
      setShowPaymentModal(true);
    } else {
      setShowBookingModal(true);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentModal(false);
    // After successful payment, proceed with booking
    await handleConfirmBooking(paymentIntentId);
  };

  const handlePaymentFailure = (error: string) => {
    console.error('Payment failed:', error);
    // You can add additional error handling here
  };

  const handleConfirmBooking = async (paymentIntentId?: string) => {
    if (!event || !auth.currentUser) return;
    
    setLoading(true);
    try {
      const bookingData = {
        eventId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Unknown',
        status: event.autoApprove ? 'confirmed' : 'pending',
        createdAt: Timestamp.now(),
        paid: event.price === 'Paid',
        paymentIntentId: paymentIntentId || null,
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // Update event attendee count
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        currentAttendees: event.currentAttendees + 1
      });

      setShowBookingModal(false);
      Alert.alert(
        'Success', 
        event.autoApprove 
          ? 'You have successfully joined this event!' 
          : 'Your booking request has been sent. You will be notified when the organizer approves.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join event');
    } finally {
      setLoading(false);
    }
  };

  const getBookingButtonText = () => {
    if (!event) return '';
    
    if (booking) {
      switch (booking.status) {
        case 'pending':
          return 'Pending Approval';
        case 'confirmed':
          return 'Confirmed';
        case 'rejected':
          return 'Rejected';
        default:
          return 'Booked';
      }
    }
    
    if (event.currentAttendees >= event.maxCapacity) {
      return 'Event Full';
    }
    
    return event.price === 'Paid' ? 'Book & Pay' : 'Join Event';
  };

  const getBookingButtonStyle = () => {
    if (!event) return styles.joinButton;
    
    if (booking) {
      switch (booking.status) {
        case 'pending':
          return [styles.joinButton, styles.pendingButton];
        case 'confirmed':
          return [styles.joinButton, styles.confirmedButton];
        case 'rejected':
          return [styles.joinButton, styles.rejectedButton];
        default:
          return styles.joinButton;
      }
    }
    
    if (event.currentAttendees >= event.maxCapacity) {
      return [styles.joinButton, styles.disabledButton];
    }
    
    return styles.joinButton;
  };

  const isButtonDisabled = () => {
    if (!event) return true;
    if (booking) return true;
    if (event.currentAttendees >= event.maxCapacity) return true;
    if (event.organizer === auth.currentUser?.uid) return true; // Organizer can't book their own event
    return false;
  };

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) {
      return 'Date not available';
    }
    let date: Date;
    if (typeof (timestamp as any).toDate === 'function') {
      date = (timestamp as any).toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Not Found</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>This event could not be found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity onPress={() => setShowChatModal(true)}>
          <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        {event.image ? (
          <Image source={{ uri: event.image }} style={styles.eventImage} />
        ) : null}

        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="basketball-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{event.type}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{formatDate(event.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>
                {event.currentAttendees}/{event.maxCapacity} spots filled
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
              <Text style={styles.metaText}>{event.price}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons 
                name={event.indoorOutdoor === 'indoor' ? 'home-outline' : 'sunny-outline'} 
                size={16} 
                color={colors.muted} 
              />
              <Text style={styles.metaText}>
                {event.indoorOutdoor === 'indoor' ? 'Indoor' : 'Outdoor'}
              </Text>
            </View>
          </View>

          {/* Organizer Info */}
          <View style={styles.organizerSection}>
            <Text style={styles.sectionTitle}>Organized by</Text>
            <View style={styles.organizerInfo}>
              <View style={styles.organizerAvatar}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.organizerDetails}>
                <Text style={styles.organizerName}>{event.organizerName}</Text>
                <Text style={styles.organizerRole}>Trainer/Coach</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Booking Status */}
          {booking && (
            <View style={styles.bookingSection}>
              <Text style={styles.sectionTitle}>Your Booking</Text>
              <View style={styles.bookingStatus}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {booking.status === 'pending' && '⏳ Pending Approval'}
                    {booking.status === 'confirmed' && '✅ Confirmed'}
                    {booking.status === 'rejected' && '❌ Rejected'}
                  </Text>
                </View>
                {event.price === 'Paid' && (
                  <View style={styles.paymentStatus}>
                    <Text style={styles.paymentText}>
                      {booking.paid ? '💰 Payment Confirmed' : '💳 Payment Pending'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
      {userRole === 'player' && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={getBookingButtonStyle()}
            onPress={handleJoinEvent}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.joinButtonText}>
              {getBookingButtonText()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Booking Summary Modal */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Booking Summary</Text>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Event:</Text>
              <Text style={styles.summaryValue}>{event.title}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(event.date)}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Location:</Text>
              <Text style={styles.summaryValue}>{event.location}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Price:</Text>
              <Text style={styles.summaryValue}>{event.price}</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Status:</Text>
              <Text style={styles.summaryValue}>
                {event.autoApprove ? 'Auto-approved' : 'Pending approval'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => handleConfirmBooking()}
                disabled={loading}
              >
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Confirming...' : 'Confirm Booking'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <StripePaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        amount={(() => {
          // Extract amount from price string (e.g., "Paid - $25" -> 2500 cents)
          const priceMatch = event?.price.match(/\$(\d+(?:\.\d{2})?)/);
          return priceMatch ? parseFloat(priceMatch[1]) * 100 : 2500; // Default to $25 if no amount found
        })()}
        eventTitle={event?.title || 'Event'}
        eventId={eventId}
      />

      {/* Chat Modal */}
      <Modal visible={showChatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.modalTitle}>Chat with Organizer</Text>
              <TouchableOpacity onPress={() => setShowChatModal(false)}>
                <Ionicons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.chatPlaceholder}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
              <Text style={styles.chatPlaceholderText}>
                Chat functionality will be implemented here
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSizes.medium,
    color: colors.muted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSizes.medium,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  eventInfo: {
    padding: spacing.md,
  },
  eventTitle: {
    fontSize: fontSizes.xlarge,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  eventMeta: {
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: fontSizes.regular,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  organizerSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
    color: colors.text,
  },
  organizerRole: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
  },
  descriptionSection: {
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: fontSizes.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bookingSection: {
    marginBottom: spacing.lg,
  },
  bookingStatus: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  statusBadge: {
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
  },
  paymentStatus: {
    marginTop: spacing.sm,
  },
  paymentText: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
  },
  actionContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  pendingButton: {
    backgroundColor: colors.warning,
  },
  confirmedButton: {
    backgroundColor: colors.success,
  },
  rejectedButton: {
    backgroundColor: colors.error,
  },
  disabledButton: {
    backgroundColor: colors.muted,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: fontSizes.medium,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSizes.medium,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: fontSizes.medium,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: fontSizes.medium,
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginLeft: spacing.sm,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: fontSizes.medium,
    color: '#fff',
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  chatPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  chatPlaceholderText: {
    fontSize: fontSizes.medium,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default EventDetailScreen; 