import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Modal, PixelRatio, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AuthContext } from '../constants/AuthContext';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';
import ChatRoomScreen from './ChatRoomScreen';

interface Chat {
  id: string;
  type: 'event' | 'direct';
  eventId?: string;
  eventTitle?: string;
  recipientId?: string;
  recipientName?: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount: number;
}

interface Event {
  id: string;
  title: string;
  organizer: string;
  organizerName?: string;
  currentAttendees: number;
  maxCapacity: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

const MessagesScreen: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'player' | 'trainer' | 'both'>('player');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(500));

  useEffect(() => {
    if (!auth.currentUser) return;

    loadUserRole();
    loadChats();
  }, []);

  const loadUserRole = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data()?.role || 'player');
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadChats = () => {
    if (!auth.currentUser) return;

    setLoading(true);

    if (userRole === 'trainer' || userRole === 'both') {
      // Load event chats for trainers
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer', '==', auth.currentUser.uid)
      );

      const unsubscribeEvents = onSnapshot(eventsQuery, async (snapshot) => {
        const eventChats: Chat[] = [];
        
        for (const eventDoc of snapshot.docs) {
          const event = { id: eventDoc.id, ...eventDoc.data() } as Event;
          
          // Check if there are messages in the event chat
          const chatId = `event_${event.id}`;
          const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages')
          );
          
          const messagesSnapshot = await getDocs(messagesQuery);
          if (!messagesSnapshot.empty) {
            const lastMessage = messagesSnapshot.docs[messagesSnapshot.docs.length - 1];
            const lastMessageData = lastMessage.data();
            
            eventChats.push({
              id: chatId,
              type: 'event',
              eventId: event.id,
              eventTitle: event.title,
              lastMessage: lastMessageData.text,
              lastMessageTime: lastMessageData.timestamp,
              unreadCount: 0, // TODO: Implement unread count
            });
          }
        }
        
        setChats(eventChats);
        setLoading(false);
      });

      return () => unsubscribeEvents();
    } else {
      // Load direct chats for players
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'confirmed')
      );

      const unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
        const directChats: Chat[] = [];
        
        for (const bookingDoc of snapshot.docs) {
          const booking = bookingDoc.data();
          
          // Get event details
          const eventDoc = await getDoc(doc(db, 'events', booking.eventId));
          if (eventDoc.exists()) {
            const event = { id: eventDoc.id, ...eventDoc.data() } as Event;
            
            // Check if there are messages in the direct chat
            const chatId = `chat_${[auth.currentUser!.uid, event.organizer].sort().join('_')}`;
            const messagesQuery = query(
              collection(db, 'chats', chatId, 'messages')
            );
            
            const messagesSnapshot = await getDocs(messagesQuery);
            if (!messagesSnapshot.empty) {
              const lastMessage = messagesSnapshot.docs[messagesSnapshot.docs.length - 1];
              const lastMessageData = lastMessage.data();
              
              directChats.push({
                id: chatId,
                type: 'direct',
                eventId: event.id,
                eventTitle: event.title,
                recipientId: event.organizer,
                recipientName: event.organizerName || 'Event Organizer',
                lastMessage: lastMessageData.text,
                lastMessageTime: lastMessageData.timestamp,
                unreadCount: 0, // TODO: Implement unread count
              });
            }
          }
        }
        
        setChats(directChats);
        setLoading(false);
      });

      return () => unsubscribeBookings();
    }
  };

  const handleChatPress = (chat: Chat) => {
    setSelectedChat(chat);
    setShowChatRoom(true);
  };

  const handleChatClose = () => {
    setShowChatRoom(false);
    setSelectedChat(null);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const renderChatItem = ({ item: chat }: { item: Chat }) => (
    <TouchableOpacity
      style={[styles.chatItem, { maxWidth: maxCardWidth, width: '100%' }]}
      onPress={() => handleChatPress(chat)}
    >
      <View style={styles.chatAvatar}>
        <Ionicons 
          name={chat.type === 'event' ? 'people' : 'person'} 
          size={24} 
          color={colors.primary} 
        />
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>
            {chat.type === 'event' ? chat.eventTitle : chat.recipientName}
          </Text>
          <Text style={styles.chatTime}>
            {formatTime(chat.lastMessageTime)}
          </Text>
        </View>
        
        <View style={styles.chatSubheader}>
          <Text style={styles.chatSubtitle}>
            {chat.type === 'event' ? 'Event Group Chat' : chat.eventTitle}
          </Text>
          {chat.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
        
        {chat.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {chat.lastMessage}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredChats = chats.filter(chat => {
    const searchTerm = search.toLowerCase();
    const chatTitle = chat.type === 'event' ? chat.eventTitle : chat.recipientName;
    const eventTitle = chat.eventTitle;
    const lastMessage = chat.lastMessage;
    
    return (
      chatTitle?.toLowerCase().includes(searchTerm) ||
      eventTitle?.toLowerCase().includes(searchTerm) ||
      lastMessage?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <View style={{ flex: 1, width: '100%', alignItems: 'center', backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerRow, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {/* Search Bar */}
      <View style={[styles.searchBar, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Ionicons name="search" size={20} color={colors.muted} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Conversation List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={{ padding: spacing.md, alignItems: 'center', width: '100%' }}
          style={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                {userRole === 'trainer' 
                  ? 'Start conversations with your event attendees'
                  : 'Join events to start chatting with organizers'
                }
              </Text>
            </View>
          }
        />
      )}
      {/* Chat Room Modal */}
      <Modal visible={showChatRoom} animationType="slide" presentationStyle="pageSheet">
        {selectedChat && (
          <ChatRoomScreen
            eventId={selectedChat.eventId}
            recipientId={selectedChat.recipientId}
            recipientName={selectedChat.recipientName}
            isGroupChat={selectedChat.type === 'event'}
            onClose={handleChatClose}
          />
        )}
      </Modal>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: scaleSize(spacing.md), paddingTop: scaleSize(spacing.lg) },
  headerTitle: { fontSize: scaleFont(fontSizes.large), fontWeight: 'bold', color: colors.primary, marginLeft: scaleSize(spacing.md) },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: scaleSize(radii.md), marginHorizontal: scaleSize(spacing.md), marginBottom: scaleSize(spacing.md), paddingHorizontal: scaleSize(spacing.md), paddingVertical: scaleSize(spacing.sm), borderWidth: scaleSize(1), borderColor: colors.border },
  searchInput: { flex: 1, fontSize: scaleFont(fontSizes.regular), color: colors.text },
  roleBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: scaleSize(spacing.sm),
    paddingVertical: scaleSize(spacing.xs),
    borderRadius: scaleSize(radii.sm),
  },
  roleText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.primary,
    fontWeight: '600',
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
  chatItem: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: scaleSize(radii.lg), padding: scaleSize(spacing.md), marginBottom: scaleSize(spacing.md), shadowColor: '#000', shadowOffset: { width: 0, height: scaleSize(1) }, shadowOpacity: 0.1, shadowRadius: scaleSize(2), elevation: 2 },
  chatAvatar: { width: scaleSize(50), height: scaleSize(50), borderRadius: scaleSize(25), backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: scaleSize(spacing.md) },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleSize(spacing.xs) },
  chatTitle: { fontSize: scaleFont(fontSizes.medium), fontWeight: 'bold', color: colors.text, flex: 1 },
  chatTime: { fontSize: scaleFont(fontSizes.small), color: colors.textSecondary },
  chatSubheader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleSize(spacing.xs) },
  chatSubtitle: { fontSize: scaleFont(fontSizes.small), color: colors.textSecondary, flex: 1 },
  unreadBadge: { backgroundColor: colors.primary, borderRadius: scaleSize(10), minWidth: scaleSize(20), height: scaleSize(20), justifyContent: 'center', alignItems: 'center', marginLeft: scaleSize(spacing.sm) },
  unreadText: { fontSize: scaleFont(fontSizes.xsmall), color: '#fff', fontWeight: 'bold' },
  lastMessage: { fontSize: scaleFont(fontSizes.small), color: colors.textSecondary, lineHeight: scaleFont(16) },
  emptyContainer: { alignItems: 'center', paddingVertical: scaleSize(spacing.xl) },
  emptyText: { fontSize: scaleFont(fontSizes.large), color: colors.text, marginTop: scaleSize(spacing.md), fontWeight: '600' },
  emptySubtext: { fontSize: scaleFont(fontSizes.medium), color: colors.textSecondary, textAlign: 'center', marginTop: scaleSize(spacing.sm) },
});

export default MessagesScreen; 