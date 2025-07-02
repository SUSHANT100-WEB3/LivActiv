import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, PixelRatio, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useFilters } from '../components/FilterContext';
import { AuthContext } from '../constants/AuthContext';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';
import EventCreateScreen from './EventCreateScreen';
import EventDetailScreen from './EventDetailScreen';
import FilterModal from './FilterModal';

interface Event {
  id: string;
  title: string;
  type: string;
  latitude: number;
  longitude: number;
  price: string;
  location: string;
  date: string | Timestamp;
  description: string;
  organizer: string;
  image: string;
  time: string;
  maxCapacity?: number;
  currentAttendees?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'map' | 'list'>('map');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 33.4484,
    longitude: -112.0740,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const { user } = useContext(AuthContext);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(500));
  const { sport, date, price, radius, city } = useFilters();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Real-time event updates with enhanced logging
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
      const data: Event[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(data);
      setLastUpdate(new Date());
      console.log(`🔄 Real-time update: ${data.length} events loaded at ${new Date().toLocaleTimeString()}`);
    }, (error) => {
      console.error('❌ Error fetching events:', error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchRole = async () => {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUserRole(docSnap.data().role);
      };
      fetchRole();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifList);
    });

    return () => unsubscribe();
  }, [user]);

  const openEventDetail = (event: Event) => {
    navigation.navigate('EventDetail', { event });
  };

  const handleBookEvent = async (event: Event) => {
    if (!auth.currentUser) {
      Alert.alert('Please log in to book events.');
      return;
    }
    if (event.price === 'Paid') {
      navigation.navigate('StripePaymentModal', { event, amount: 20 });
      return;
    }
    setBookingLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        eventId: event.id,
        userId: auth.currentUser.uid,
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      navigation.navigate('BookingStatus', { status: 'Pending', event });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleFilter = () => {
    setFilterModalVisible(true);
  };

  // NYC as default center for radius filtering
  const centerLat = 33.4484;
  const centerLng = -112.0740;
  function getDistanceFromLatLonInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Apply filters in real-time using FilterContext
  useEffect(() => {
    let filtered = events;

    // Search filter
    if (search.trim()) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        event.description.toLowerCase().includes(search.toLowerCase()) ||
        event.location.toLowerCase().includes(search.toLowerCase())
      );
    }

    // City filter from FilterContext
    if (city && city !== 'New York, NY') {
      filtered = filtered.filter(event => 
        event.location.toLowerCase().includes(city.toLowerCase().split(',')[0].toLowerCase())
      );
    }

    // Sport/Type filter from FilterContext
    if (sport && sport.trim()) {
      filtered = filtered.filter(event => 
        event.type.toLowerCase() === sport.toLowerCase() ||
        event.title.toLowerCase().includes(sport.toLowerCase()) ||
        event.description.toLowerCase().includes(sport.toLowerCase())
      );
    }

    // Price filter from FilterContext
    if (price !== 'all') {
      filtered = filtered.filter(event => {
        if (price === 'free') return event.price === 'Free';
        if (price === 'paid') return event.price === 'Paid';
        return true;
      });
    }

    // Date filter from FilterContext
    if (date) {
      const filterDate = new Date(date);
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(event => {
        try {
          // Handle both string dates and Timestamp objects
          let eventDateTime: Date;
          if (typeof event.date === 'string') {
            eventDateTime = new Date(event.date);
          } else if (event.date && 'toDate' in event.date && typeof event.date.toDate === 'function') {
            eventDateTime = (event.date as any).toDate ? (event.date as any).toDate() : new Date(event.date as any);
          } else {
            eventDateTime = new Date(event.date as any);
          }
          
          return eventDateTime >= startOfDay && eventDateTime <= endOfDay;
        } catch (error) {
          console.error('Error parsing event date:', error);
          return false;
        }
      });
    }

    // Radius filter from FilterContext
    if (radius && radius > 0) {
      filtered = filtered.filter(event => {
        const distance = getDistanceFromLatLonInMiles(
          centerLat, centerLng, event.latitude, event.longitude
        );
        return distance <= radius;
      });
    }

    setFilteredEvents(filtered);
  }, [events, search, sport, price, date, radius, city]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a refresh by updating the lastUpdate timestamp
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const isTrainer = userRole === 'Trainer' || userRole === 'Both';

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleEventClose = () => {
    setShowEventDetail(false);
    setSelectedEvent(null);
  };

  const formatEventDate = (date: string | Timestamp): string => {
    try {
      let d: Date;
      if (typeof date === 'string') {
        d = new Date(date);
      } else if (date && 'toDate' in date) {
        d = date.toDate ? date.toDate() : new Date(date as any);
      } else {
        d = new Date(date as any);
      }
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with notification icon only */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover Events</Text>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => setNotificationsVisible(true)}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Enhanced Search Bar with Refresh */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons 
            name="refresh" 
            size={20} 
            color={colors.primary} 
            style={[styles.refreshIcon, isRefreshing && styles.refreshIconSpinning]} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Filter Bar */}
      <View style={[styles.filterBar, { maxWidth: maxCardWidth, width: '100%' }]}>
        {/* Show active filters from FilterContext */}
        {sport && (
          <TouchableOpacity style={[styles.filterChip, styles.activeFilterChip]}>
            <Text style={[styles.filterChipText, styles.activeFilterChipText]}>Sport: {sport}</Text>
          </TouchableOpacity>
        )}
        
        {price !== 'all' && (
          <TouchableOpacity style={[styles.filterChip, styles.activeFilterChip]}>
            <Text style={[styles.filterChipText, styles.activeFilterChipText]}>Price: {price}</Text>
          </TouchableOpacity>
        )}
        
        {date && (
          <TouchableOpacity style={[styles.filterChip, styles.activeFilterChip]}>
            <Text style={[styles.filterChipText, styles.activeFilterChipText]}>
              Date: {date.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        
        {radius > 10 && (
          <TouchableOpacity style={[styles.filterChip, styles.activeFilterChip]}>
            <Text style={[styles.filterChipText, styles.activeFilterChipText]}>Radius: {radius}km</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Map/List Toggle */}
      <View style={[styles.toggleRow, { maxWidth: maxCardWidth, width: '100%' }]}>
        <TouchableOpacity style={[styles.toggleButton, tab === 'map' && styles.toggleButtonActive]} onPress={() => setTab('map')}>
          <Ionicons name="map" size={18} color={tab === 'map' ? '#fff' : colors.primary} />
          <Text style={[styles.toggleButtonText, tab === 'map' && { color: '#fff' }]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, tab === 'list' && styles.toggleButtonActive]} onPress={() => setTab('list')}>
          <Ionicons name="list" size={18} color={tab === 'list' ? '#fff' : colors.primary} />
          <Text style={[styles.toggleButtonText, tab === 'list' && { color: '#fff' }]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toggleButton, styles.filterToggleButton]} onPress={handleFilter}>
          <Ionicons name="filter" size={18} color={colors.primary} />
          <Text style={styles.toggleButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>
      
      {/* Map or List */}
      {tab === 'map' ? (
        <View style={[styles.mapContainer, { maxWidth: maxCardWidth, width: '100%' }]}>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
            >
              {filteredEvents.map(event => (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                  pinColor={event.price === 'Free' ? colors.free : colors.paid}
                  onPress={() => handleEventPress(event)}
                />
              ))}
            </MapView>
            {/* Grid Overlay */}
            <View pointerEvents="none" style={styles.gridOverlay}>
              {[...Array(6)].map((_, i) => (
                <View key={`vgrid-${i}`} style={[styles.gridLine, { left: `${(i+1)*100/7}%`, top: 0, bottom: 0, width: 1, position: 'absolute' }]} />
              ))}
              {[...Array(6)].map((_, i) => (
                <View key={`hgrid-${i}`} style={[styles.gridLine, { top: `${(i+1)*100/7}%`, left: 0, right: 0, height: 1, position: 'absolute' }]} />
              ))}
            </View>
          </View>
          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.free }]} /><Text style={styles.legendLabel}>Free</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.paid }]} /><Text style={styles.legendLabel}>Paid</Text></View>
          </View>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleEventPress(item)}>
              <View style={[styles.eventCard, { width: Math.min(width - scaleSize(24), 400), alignSelf: 'center' }]}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.eventImage} />
                ) : (
                  <View style={styles.eventImagePlaceholder} />
                )}
                <View style={styles.eventCardContent}>
                  <View style={styles.eventCardHeader}>
                    <Text style={styles.eventCardTitle} numberOfLines={2} ellipsizeMode="tail">{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: item.price === 'Free' ? colors.free : colors.paid }]}> 
                      <Text style={styles.badgeText}>{item.price}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventCardDesc} numberOfLines={3} ellipsizeMode="tail">{item.description}</Text>
                  <View style={styles.eventCardMetaRow}>
                    <Ionicons name="calendar" size={16} color={colors.muted} />
                    <Text style={styles.eventCardMeta}>{formatEventDate(item.date)}  </Text>
                    <Ionicons name="time" size={16} color={colors.muted} style={{ marginLeft: spacing.sm }} />
                    <Text style={styles.eventCardMeta}>{item.time}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 32, alignItems: 'center' }}
          style={{ flex: 1 }}
        />
      )}
      {/* Floating Action Button for Trainers */}
      {(userRole === 'Trainer' || userRole === 'Both') && (
        <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
      {/* Event Create Modal Overlay */}
      <Modal visible={createModalVisible} animationType="slide" transparent={false} onRequestClose={() => setCreateModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#F7F8FA' }}>
          <EventCreateScreen onCreated={() => setCreateModalVisible(false)} />
          <TouchableOpacity style={{ marginTop: 8, alignSelf: 'center' }} onPress={() => setCreateModalVisible(false)}>
            <Text style={{ color: '#1877F2', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      {/* Notifications Modal */}
      <Modal visible={notificationsVisible} animationType="slide" transparent onRequestClose={() => setNotificationsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: maxCardWidth, width: '100%' }]}> 
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 16 }}>Notifications</Text>
            <View style={{ width: '100%', marginBottom: 16 }}>
              {notifications.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>No notifications yet.</Text>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.id} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Ionicons
                      name={notif.type === 'booking' ? 'calendar-outline' : notif.type === 'event' ? 'megaphone-outline' : 'notifications-outline'}
                      size={24}
                      color={notif.type === 'booking' ? '#4CAF50' : notif.type === 'event' ? '#1877F2' : '#888'}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: '#222', marginBottom: 2 }}>{notif.text}</Text>
                      <Text style={{ fontSize: 12, color: '#888' }}>{new Date(notif.timestamp).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setNotificationsVisible(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Event Detail Modal */}
      <Modal visible={showEventDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedEvent && (
          <EventDetailScreen
            eventId={selectedEvent.id}
            onClose={handleEventClose}
          />
        )}
      </Modal>
      {/* Filter Modal */}
      {filterModalVisible && (
        <FilterModal onClose={() => setFilterModalVisible(false)} />
      )}
      {/* Coming Soon Banner */}
      <View style={styles.comingSoonBanner}>
        <Text style={styles.comingSoonText}>🏆 League/Team Tools — Coming Soon!</Text>
      </View>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scaleSize(spacing.md),
    paddingTop: scaleSize(spacing.lg),
  },
  title: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
  },
  notificationButton: {
    marginLeft: scaleSize(spacing.md),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.md),
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.sm),
    borderWidth: scaleSize(1),
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: scaleSize(spacing.sm),
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
  },
  refreshButton: {
    padding: scaleSize(spacing.sm),
  },
  refreshIcon: {
    transform: [{ rotate: '0deg' }],
  },
  refreshIconSpinning: {
    transform: [{ rotate: '360deg' }],
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
  },
  filterChip: {
    backgroundColor: '#E3F0FF',
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.xs),
    marginRight: scaleSize(spacing.sm),
  },
  filterChipText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: scaleFont(fontSizes.small),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.lg),
    paddingVertical: scaleSize(spacing.sm),
    marginRight: scaleSize(spacing.sm),
    borderWidth: scaleSize(1),
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: scaleSize(6),
  },
  mapContainer: {
    height: scaleSize(220),
    borderRadius: scaleSize(radii.md),
    overflow: 'hidden',
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
    backgroundColor: '#E3F0FF',
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    height: scaleSize(180),
    backgroundColor: '#E3F0FF',
    borderRadius: scaleSize(radii.md),
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  gridLine: {
    backgroundColor: '#B3D1F7',
    opacity: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: scaleSize(spacing.sm),
    backgroundColor: '#fff',
    borderRadius: scaleSize(radii.md),
    position: 'absolute',
    bottom: scaleSize(10),
    left: scaleSize(10),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: scaleSize(8),
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scaleSize(spacing.lg),
  },
  legendDot: {
    width: scaleSize(14),
    height: scaleSize(14),
    borderRadius: scaleSize(7),
    marginRight: scaleSize(6),
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: scaleFont(fontSizes.small),
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: scaleSize(16),
    marginHorizontal: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.md),
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: scaleSize(12),
    elevation: 4,
    overflow: 'hidden',
    minHeight: scaleSize(90),
  },
  eventImage: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderTopLeftRadius: scaleSize(16),
    borderBottomLeftRadius: scaleSize(16),
  },
  eventImagePlaceholder: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderTopLeftRadius: scaleSize(16),
    borderBottomLeftRadius: scaleSize(16),
    backgroundColor: '#E3F0FF',
  },
  eventCardContent: {
    flex: 1,
    padding: scaleSize(spacing.md),
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(4),
  },
  eventCardTitle: {
    flex: 1,
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: 'bold',
    color: colors.primary,
  },
  badge: {
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.xs),
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scaleFont(fontSizes.small),
  },
  eventCardDesc: {
    color: colors.textSecondary,
    fontSize: scaleFont(fontSizes.regular),
    marginBottom: scaleSize(8),
  },
  eventCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleSize(4),
  },
  eventCardMeta: {
    color: colors.muted,
    fontSize: scaleFont(fontSizes.small),
    marginLeft: scaleSize(4),
  },
  fab: {
    position: 'absolute',
    right: scaleSize(24),
    bottom: scaleSize(32),
    backgroundColor: '#1877F2',
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(30),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: scaleSize(4),
  },
  fabText: {
    color: '#fff',
    fontSize: scaleFont(32),
    fontWeight: 'bold',
  },
  comingSoonBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF8E1',
    padding: scaleSize(16),
    alignItems: 'center',
    borderTopWidth: scaleSize(1),
    borderColor: '#FFD54F',
    zIndex: 10,
  },
  comingSoonText: {
    color: '#FFA000',
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: scaleSize(16),
    padding: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(12),
    elevation: 4,
    width: '90%',
    maxHeight: '95%',
  },
  closeModalButton: {
    marginTop: scaleSize(8),
    alignSelf: 'center',
  },
  closeModalText: {
    color: '#1877F2',
    fontWeight: 'bold',
    fontSize: scaleFont(16),
  },
  activeFilterChip: {
    backgroundColor: '#D3E4FF',
  },
  activeFilterChipText: {
    fontWeight: 'bold',
  },
  filterToggleButton: {
    backgroundColor: '#E3F0FF',
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.xs),
  },
});

export default HomeScreen; 