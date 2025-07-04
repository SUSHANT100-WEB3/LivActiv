import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, PixelRatio, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface AttendeeListModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

interface Attendee {
  id: string;
  userId: string;
  userName: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
  paid?: boolean;
}

interface Event {
  id: string;
  title: string;
  price: string;
  organizer: string;
  autoApprove: boolean;
}

const AttendeeListModal: React.FC<AttendeeListModalProps> = ({ visible, onClose, eventId }) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont });

  useEffect(() => {
    if (!visible || !eventId) return;

    // Get event details
    const unsubscribeEvent = onSnapshot(doc(db, 'events', eventId), (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() } as Event);
      }
    });

    // Get attendees
    const attendeesQuery = query(
      collection(db, 'bookings'),
      where('eventId', '==', eventId)
    );

    const unsubscribeAttendees = onSnapshot(attendeesQuery, (snapshot) => {
      const attendeesList: Attendee[] = [];
      snapshot.forEach((doc) => {
        attendeesList.push({ id: doc.id, ...doc.data() } as Attendee);
      });
      
      // Sort by status: confirmed, pending, rejected
      attendeesList.sort((a, b) => {
        const statusOrder = { confirmed: 0, pending: 1, rejected: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      
      setAttendees(attendeesList);
      setLoading(false);
    });

    return () => {
      unsubscribeEvent();
      unsubscribeAttendees();
    };
  }, [visible, eventId]);

  const handleApprove = async (attendeeId: string) => {
    if (!event) return;
    
    setProcessingAction(attendeeId);
    try {
      await updateDoc(doc(db, 'bookings', attendeeId), {
        status: 'confirmed',
        updatedAt: new Date()
      });
      
      Alert.alert('Success', 'Attendee approved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve attendee');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (attendeeId: string) => {
    if (!event) return;
    
    Alert.alert(
      'Reject Attendee',
      'Are you sure you want to reject this attendee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingAction(attendeeId);
            try {
              await updateDoc(doc(db, 'bookings', attendeeId), {
                status: 'rejected',
                updatedAt: new Date()
              });
              
              Alert.alert('Success', 'Attendee rejected successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject attendee');
            } finally {
              setProcessingAction(null);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAttendee = ({ item }: { item: Attendee }) => (
    <View style={styles.attendeeCard}>
      <View style={styles.attendeeInfo}>
        <View style={styles.attendeeAvatar}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={styles.attendeeDetails}>
          <Text style={styles.attendeeName}>{item.userName}</Text>
          <Text style={styles.attendeeDate}>
            Joined {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
      
      <View style={styles.attendeeStatus}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
        
        {event?.price === 'Paid' && (
          <View style={styles.paymentStatus}>
            <Text style={styles.paymentText}>
              {item.paid ? '💰 Paid' : '💳 Pending'}
            </Text>
          </View>
        )}
      </View>
      
      {item.status === 'pending' && !event?.autoApprove && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={processingAction === item.id}
          >
            <Text style={styles.actionButtonText}>
              {processingAction === item.id ? 'Approving...' : 'Approve'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={processingAction === item.id}
          >
            <Text style={styles.actionButtonText}>
              {processingAction === item.id ? 'Rejecting...' : 'Reject'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const getStats = () => {
    const safeAttendees = Array.isArray(attendees) ? attendees : [];
    const confirmed = safeAttendees.filter(a => a.status === 'confirmed').length;
    const pending = safeAttendees.filter(a => a.status === 'pending').length;
    const rejected = safeAttendees.filter(a => a.status === 'rejected').length;
    const paid = safeAttendees.filter(a => a.paid).length;
    
    return { confirmed, pending, rejected, paid };
  };

  const stats = getStats();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Attendees</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading attendees...</Text>
          </View>
        ) : (
          <>
            {/* Event Info */}
            {event && (
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventPrice}>{event.price}</Text>
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.confirmed}</Text>
                <Text style={styles.statLabel}>Confirmed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.rejected}</Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </View>
              {event?.price === 'Paid' && (
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.paid}</Text>
                  <Text style={styles.statLabel}>Paid</Text>
                </View>
              )}
            </View>

            {/* Auto-approve notice */}
            {event?.autoApprove && (
              <View style={styles.autoApproveNotice}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.autoApproveText}>
                  Auto-approve is enabled. New bookings are automatically confirmed.
                </Text>
              </View>
            )}

            {/* Attendees List */}
            <FlatList
              data={attendees}
              renderItem={renderAttendee}
              keyExtractor={(item) => item.id}
              style={styles.attendeesList}
              contentContainerStyle={styles.attendeesContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.muted} />
                  <Text style={styles.emptyText}>No attendees yet</Text>
                  <Text style={styles.emptySubtext}>
                    When people join your event, they'll appear here
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </Modal>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scaleSize(spacing.md),
    paddingTop: scaleSize(spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.muted,
  },
  eventInfo: {
    padding: scaleSize(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaleSize(spacing.xs),
  },
  eventPrice: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: scaleSize(spacing.md),
    backgroundColor: colors.card,
    margin: scaleSize(spacing.md),
    borderRadius: scaleSize(radii.md),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: scaleFont(fontSizes.xlarge),
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginTop: scaleSize(spacing.xs),
  },
  autoApproveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: scaleSize(spacing.md),
    marginHorizontal: scaleSize(spacing.md),
    borderRadius: scaleSize(radii.md),
    marginBottom: scaleSize(spacing.md),
  },
  autoApproveText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.success,
    marginLeft: scaleSize(spacing.sm),
    flex: 1,
  },
  attendeesList: {
    flex: 1,
  },
  attendeesContent: {
    padding: scaleSize(spacing.md),
  },
  attendeeCard: {
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(spacing.md),
  },
  attendeeAvatar: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(spacing.md),
  },
  attendeeDetails: {
    flex: 1,
  },
  attendeeName: {
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: '600',
    color: colors.text,
  },
  attendeeDate: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginTop: scaleSize(spacing.xs),
  },
  attendeeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(spacing.md),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(spacing.sm),
    paddingVertical: scaleSize(spacing.xs),
    borderRadius: scaleSize(radii.sm),
  },
  statusText: {
    fontSize: scaleFont(fontSizes.small),
    color: '#fff',
    fontWeight: '600',
    marginLeft: scaleSize(spacing.xs),
  },
  paymentStatus: {
    marginLeft: scaleSize(spacing.sm),
  },
  paymentText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: scaleSize(spacing.sm),
  },
  actionButton: {
    flex: 1,
    paddingVertical: scaleSize(spacing.sm),
    borderRadius: scaleSize(radii.sm),
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: scaleFont(fontSizes.small),
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: scaleSize(spacing.xl),
  },
  emptyText: {
    fontSize: scaleFont(fontSizes.large),
    color: colors.text,
    marginTop: scaleSize(spacing.md),
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: scaleSize(spacing.sm),
  },
});

export default AttendeeListModal; 