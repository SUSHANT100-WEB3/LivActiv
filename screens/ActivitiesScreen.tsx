import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Modal, PixelRatio, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AuthContext } from '../constants/AuthContext';
import { db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';
import AttendeeListModal from './AttendeeListModal';
import EventCreateScreen from './EventCreateScreen';
import EventDetailScreen from './EventDetailScreen';

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
  date: any;
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
  createdAt: any;
  paid?: boolean;
}

interface BookingWithEvent extends Booking {
  event?: Event | null;
  userProfile?: {
    name: string;
    avatar?: string;
  };
}

const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState<'bookings' | 'hosted'>('bookings');
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [hostedEvents, setHostedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();

  // Responsive scaling helpers
  const guidelineBaseWidth = 375; // iPhone 11 Pro width
  const guidelineBaseHeight = 812;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);

  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(500));

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showAttendeeList, setShowAttendeeList] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time bookings updates
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
      const bookingsData: Booking[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      // Fetch event details for each booking
      const bookingsWithEvents = await Promise.all(
        bookingsData.map(async (booking) => {
          try {
            const eventDoc = await getDoc(doc(db, 'events', booking.eventId));
            const event = eventDoc.exists() ? { id: eventDoc.id, ...eventDoc.data() } as Event : null;
            
            // Fetch user profile for the booking
            const userDoc = await getDoc(doc(db, 'users', booking.userId));
            const userProfile = userDoc.exists() ? {
              name: userDoc.data().name || 'Unknown User',
              avatar: userDoc.data().avatar
            } : { name: 'Unknown User' };

            return {
              ...booking,
              event,
              userProfile
            } as BookingWithEvent;
          } catch (error) {
            console.error('Error fetching event details:', error);
            return { ...booking, event: null, userProfile: { name: 'Unknown User' } } as BookingWithEvent;
          }
        })
      );

      setBookings(bookingsWithEvents);
      setLastUpdate(new Date());
      setLoading(false);
      console.log(`🔄 Real-time bookings update: ${bookingsWithEvents.length} bookings loaded`);
    }, (error) => {
      console.error('❌ Error fetching bookings:', error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Real-time hosted events updates
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'events'), where('organizer', '==', user.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      
      // Fetch attendee counts for each event
      const eventsWithAttendees = await Promise.all(
        eventsData.map(async (event) => {
          try {
            const bookingsQuery = query(
              collection(db, 'bookings'), 
              where('eventId', '==', event.id),
              where('status', '==', 'confirmed')
            );
            const bookingsSnapshot = await getDocs(bookingsQuery);
            const attendeeCount = bookingsSnapshot.size;
            
            return {
              ...event,
              currentAttendees: attendeeCount
            };
          } catch (error) {
            console.error('Error fetching attendee count:', error);
            return event;
          }
        })
      );

      setHostedEvents(eventsWithAttendees);
      console.log(`🔄 Real-time hosted events update: ${eventsWithAttendees.length} events loaded`);
    }, (error) => {
      console.error('❌ Error fetching hosted events:', error);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchRole = async () => {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserRole(docSnap.data().role);
      };
      fetchRole();
    }
  }, [user]);

  const handleExploreEvents = () => {
    navigation.navigate('Home');
  };

  const handleCreateEvent = () => {
    setCreateModalVisible(true);
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleManageEvent = (event: Event) => {
    navigation.navigate('AttendeeListModal', { event });
  };

  const handleChat = (event: Event) => {
    navigation.navigate('ChatRoom', { event });
  };

  const handleViewAttendees = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowAttendeeList(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#888';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending Approval';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  const formatDate = (date: string | Timestamp | null) => {
    if (!date) {
      return 'Date not available';
    }
    
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate ? date.toDate() : new Date(date as any);
    } else {
      dateObj = new Date(date as any);
    }
    
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isTrainer = userRole === 'Trainer' || userRole === 'Both';

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = () => {
    if (!user) return;

    setLoading(true);

    if (userRole === 'player' || userRole === 'both') {
      // Load user's bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );

      const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
        const bookingsList: Booking[] = [];
        snapshot.forEach((doc) => {
          bookingsList.push({ id: doc.id, ...doc.data() } as Booking);
        });
        setBookings(bookingsList.map((b: Booking) => ({ ...b, event: events.find(e => e.id === b.eventId) } as BookingWithEvent)));
      });

      // Load events for bookings
      if (bookings.length > 0) {
        const eventIds = bookings.map((b: Booking) => b.eventId);
        const eventsQuery = query(
          collection(db, 'events'),
          where('__name__', 'in', eventIds)
        );

        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
          const eventsList: Event[] = [];
          snapshot.forEach((doc) => {
            eventsList.push({ id: doc.id, ...doc.data() } as Event);
          });
          setEvents(eventsList);
          setLoading(false);
        });

        return () => {
          unsubscribeBookings();
          unsubscribeEvents();
        };
      } else {
        setEvents([]);
        setLoading(false);
        return () => unsubscribeBookings();
      }
    } else {
      // Load events created by trainer
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer', '==', user.uid)
      );

      const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
        const eventsList: Event[] = [];
        snapshot.forEach((doc) => {
          eventsList.push({ id: doc.id, ...doc.data() } as Event);
        });
        setEvents(eventsList);
        setLoading(false);
      });

      return () => unsubscribeEvents();
    }
  };

  const getEventStatus = (event: Event, booking?: Booking) => {
    if (userRole === 'trainer') {
      return 'Posted';
    }

    if (!booking) return 'Unknown';

    switch (booking.status) {
      case 'pending':
        return 'Pending Approval';
      case 'confirmed':
        return 'Confirmed';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const getEventsByCategory = () => {
    if (userRole === 'trainer') {
      return {
        active: events.filter(e => !isEventPast(e)),
        past: events.filter(e => isEventPast(e))
      };
    } else {
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      const rejectedBookings = bookings.filter(b => b.status === 'rejected');

      const confirmedEvents = events.filter(e => 
        confirmedBookings.some(b => b.eventId === e.id)
      );
      const pendingEvents = events.filter(e => 
        pendingBookings.some(b => b.eventId === e.id)
      );
      const rejectedEvents = events.filter(e => 
        rejectedBookings.some(b => b.eventId === e.id)
      );

      return {
        upcoming: confirmedEvents.filter(e => !isEventPast(e)),
        pending: pendingEvents,
        past: confirmedEvents.filter(e => isEventPast(e)),
        rejected: rejectedEvents
      };
    }
  };

  const isEventPast = (event: Event) => {
    const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return eventDate < new Date();
  };

  const renderEventCard = ({ item: event }: { item: Event }) => {
    const booking = bookings.find(b => b.eventId === event.id);
    const status = getEventStatus(event, booking);
    const isPast = isEventPast(event);

    return (
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.pastEventCard]}
        onPress={() => handleEventPress(event)}
      >
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="basketball-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{event.type}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{formatDate(event.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{event.price}</Text>
          </View>
        </View>

        {userRole === 'trainer' && (
          <View style={styles.trainerActions}>
            <View style={styles.attendeeStats}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={styles.attendeeText}>
                {event.currentAttendees}/{event.maxCapacity} attendees
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAttendeesButton}
              onPress={() => handleViewAttendees(event.id)}
            >
              <Text style={styles.viewAttendeesText}>View Attendees</Text>
            </TouchableOpacity>
          </View>
        )}

        {userRole === 'player' && booking && (
          <View style={styles.playerInfo}>
            <Text style={styles.playerStatus}>
              {booking.status === 'confirmed' && '✅ You\'re confirmed for this event'}
              {booking.status === 'pending' && '⏳ Waiting for organizer approval'}
              {booking.status === 'rejected' && '❌ Your booking was not approved'}
            </Text>
            {event.price === 'Paid' && (
              <Text style={styles.paymentStatus}>
                {booking.paid ? '💰 Payment confirmed' : '💳 Payment pending'}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, events: Event[], emptyMessage: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {events.length > 0 ? (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsList}
        />
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="calendar-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );

  const categories = getEventsByCategory();

  // Pass scaleSize and scaleFont to styles
  const styles = getStyles({ scaleSize, scaleFont, width, maxCardWidth });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your activities...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { alignItems: 'center' }]}>
      {/* Header: Back arrow, title, settings icon */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Activities</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'bookings' && styles.tabActive]} onPress={() => setTab('bookings')}>
          <Text style={tab === 'bookings' ? styles.tabTextActive : styles.tabText}>My Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'hosted' && styles.tabActive]} onPress={() => setTab('hosted')}>
          <Text style={tab === 'hosted' ? styles.tabTextActive : styles.tabText}>Hosted Events</Text>
        </TouchableOpacity>
      </View>

      {/* Section Title */}
      {tab === 'bookings' && (
        <View style={styles.sectionTitleRow}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitleBold}>Upcoming (0)</Text>
        </View>
      )}

      {/* Content */}
      {tab === 'bookings' ? (
        bookings.length === 0 ? (
          <View style={[styles.emptyCard, { maxWidth: maxCardWidth, width: '100%' }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.muted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {isTrainer ? 'No upcoming bookings' : 'No upcoming activities'}
            </Text>
            <Text style={styles.emptyText}>
              {isTrainer ? 'Book your next fitness event to get started!' : 'Join your first fitness event to get started!'}
            </Text>
            <TouchableOpacity style={styles.exploreButton} onPress={handleExploreEvents}>
              <Text style={styles.exploreButtonText}>Explore Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              if (!item.event) return null;
              return (
                <TouchableOpacity onPress={() => handleEventPress(item.event!)}>
                  <View style={[styles.eventCard, { maxWidth: maxCardWidth, width: '100%' }]}>
                    <View style={styles.eventHeader}>
                      <Text style={styles.eventTitle}>{item.event.title}</Text>
                      <View style={styles.statusContainer}>
                        <Ionicons 
                          name={getStatusIcon(item.status) as any} 
                          size={16} 
                          color={getStatusColor(item.status)} 
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {getStatusText(item.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.eventMeta}>
                      {formatDate(item.event.date)} • {item.event.location} • {item.event.price}
                    </Text>
                    {item.paid && (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidText}>Paid</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.chatButton} 
                      onPress={() => handleChat(item.event!)}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.chatButtonText}>Message Organizer</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: spacing.lg, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        // Hosted Events Tab (for Trainers)
        hostedEvents.length === 0 ? (
            <View style={[styles.emptyCard, { maxWidth: maxCardWidth, width: '100%' }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.muted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No hosted sessions</Text>
            <Text style={styles.emptyText}>Create your first session to start training others!</Text>
            <TouchableOpacity style={styles.exploreButton} onPress={handleCreateEvent}>
              <Text style={styles.exploreButtonText}>Create Event</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={hostedEvents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                  <View style={[styles.eventCard, { maxWidth: maxCardWidth, width: '100%' }]}>
                <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                  <View style={styles.attendeeStats}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                    <Text style={styles.attendeeText}>
                      {item.currentAttendees}/{item.maxCapacity} attendees
                    </Text>
                  </View>
                </View>
                <Text style={styles.eventMeta}>
                  {formatDate(item.date)} • {item.location} • {item.price}
                </Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={() => handleManageEvent(item)}
                  >
                    <Ionicons name="settings-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.actionButtonText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.chatButton]} 
                    onPress={() => handleChat(item)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
                </View>
              </View>
              )}
              contentContainerStyle={{ paddingBottom: spacing.lg, alignItems: 'center' }}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Event Creation Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <EventCreateScreen onCreated={() => setCreateModalVisible(false)} />
      </Modal>

      {/* Event Detail Modal */}
      <Modal visible={showEventDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedEvent && (
          <EventDetailScreen
            eventId={selectedEvent.id}
            onClose={() => setShowEventDetail(false)}
          />
        )}
      </Modal>

      {/* Attendee List Modal */}
      <AttendeeListModal
        visible={showAttendeeList}
        onClose={() => setShowAttendeeList(false)}
        eventId={selectedEventId || ''}
      />
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width, maxCardWidth }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number, maxCardWidth: number }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scaleSize(16),
    paddingTop: scaleSize(24),
    paddingBottom: scaleSize(12),
    backgroundColor: '#fff',
  },
  headerIcon: { padding: scaleSize(4) },
  headerTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F0F1F5',
    borderRadius: scaleSize(10),
    marginTop: scaleSize(8),
    marginBottom: scaleSize(16),
    alignSelf: 'center',
    padding: scaleSize(4),
  },
  tab: {
    flex: 1,
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(8),
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleSize(16),
    marginBottom: scaleSize(8),
    alignSelf: 'flex-start',
    marginLeft: scaleSize(24),
  },
  sectionTitleBold: {
    fontWeight: 'bold',
    fontSize: scaleFont(18),
    color: colors.text,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: scaleSize(16),
    padding: scaleSize(32),
    alignItems: 'center',
    marginTop: scaleSize(32),
    marginHorizontal: scaleSize(24),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: scaleSize(8),
    elevation: 2,
  },
  emptyIcon: {
    marginBottom: scaleSize(16),
  },
  emptyTitle: {
    fontWeight: 'bold',
    fontSize: scaleFont(18),
    color: colors.text,
    marginBottom: scaleSize(8),
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: scaleFont(15),
    marginBottom: scaleSize(20),
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: colors.primary,
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(24),
    marginTop: scaleSize(8),
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
  },
  eventCard: { 
    backgroundColor: colors.card, 
    padding: scaleSize(spacing.md), 
    borderRadius: scaleSize(radii.lg), 
    marginBottom: scaleSize(spacing.md),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(4),
    elevation: 3
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(spacing.sm),
  },
  eventTitle: { 
    fontSize: scaleFont(fontSizes.large), 
    fontWeight: 'bold', 
    color: colors.primary,
    flex: 1,
    marginRight: scaleSize(spacing.sm)
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: { 
    fontSize: scaleFont(fontSizes.small), 
    fontWeight: '600',
    marginLeft: scaleSize(4)
  },
  attendeeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.primary,
    fontWeight: '600',
    marginLeft: scaleSize(4),
  },
  eventMeta: { 
    fontSize: scaleFont(fontSizes.regular), 
    color: colors.textSecondary, 
    marginBottom: scaleSize(spacing.sm) 
  },
  paidBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: scaleSize(spacing.sm),
    paddingVertical: scaleSize(2),
    borderRadius: scaleSize(radii.sm),
    alignSelf: 'flex-start',
    marginBottom: scaleSize(spacing.sm),
  },
  paidText: { 
    fontSize: scaleFont(fontSizes.small), 
    color: '#4CAF50', 
    fontWeight: 'bold'
  },
  chatButton: { 
    backgroundColor: colors.primary, 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(spacing.md), 
    paddingVertical: scaleSize(spacing.sm), 
    borderRadius: scaleSize(radii.md),
    alignSelf: 'flex-start'
  },
  chatButtonText: { 
    color: '#fff', 
    fontSize: scaleFont(fontSizes.medium), 
    fontWeight: '600' 
  },
  actionRow: {
    flexDirection: 'row',
    gap: scaleSize(spacing.sm)
  },
  actionButton: { 
    backgroundColor: colors.primary, 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(spacing.md), 
    paddingVertical: scaleSize(spacing.sm), 
    borderRadius: scaleSize(radii.md),
    flex: 1,
    justifyContent: 'center'
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: scaleFont(fontSizes.medium), 
    fontWeight: '600' 
  },
  pastEventCard: {
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: scaleSize(spacing.sm),
    paddingVertical: scaleSize(spacing.xs),
    borderRadius: scaleSize(radii.sm),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(spacing.xs),
  },
  metaText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginLeft: scaleSize(spacing.xs),
  },
  trainerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scaleSize(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewAttendeesButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaleSize(spacing.sm),
    paddingVertical: scaleSize(spacing.xs),
    borderRadius: scaleSize(radii.sm),
  },
  viewAttendeesText: {
    fontSize: scaleFont(fontSizes.small),
    color: '#fff',
    fontWeight: '600',
  },
  playerInfo: {
    paddingTop: scaleSize(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  playerStatus: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.text,
    marginBottom: scaleSize(spacing.xs),
  },
  paymentStatus: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
  },
  section: {
    marginBottom: scaleSize(spacing.xl),
  },
  sectionTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
  },
  eventsList: {
    paddingHorizontal: scaleSize(spacing.md),
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: scaleSize(spacing.xl),
    marginHorizontal: scaleSize(spacing.md),
  },
});

export default ActivitiesScreen; 