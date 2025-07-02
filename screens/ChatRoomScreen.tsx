import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, PixelRatio, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface ChatRoomScreenProps {
  eventId?: string;
  recipientId?: string;
  recipientName?: string;
  isGroupChat?: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Timestamp | null;
  isAnnouncement?: boolean;
}

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ 
  eventId, 
  recipientId, 
  recipientName, 
  isGroupChat = false, 
  onClose 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { width } = useWindowDimensions();

  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Get recipient info for 1:1 chat
    if (recipientId && !isGroupChat) {
      const getUserInfo = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', recipientId));
          if (userDoc.exists()) {
            setRecipient({ id: userDoc.id, ...userDoc.data() } as User);
          }
        } catch (error) {
          console.error('Error fetching recipient info:', error);
        }
      };
      getUserInfo();
    }

    // Get event info for group chat
    if (eventId && isGroupChat) {
      const getEventInfo = async () => {
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            setEvent({ id: eventDoc.id, ...eventDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching event info:', error);
        }
      };
      getEventInfo();
    }

    // Listen to messages
    const chatId = isGroupChat ? `event_${eventId}` : `chat_${[auth.currentUser.uid, recipientId].sort().join('_')}`;
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList: Message[] = [];
      snapshot.forEach((doc) => {
        messagesList.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, recipientId, isGroupChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;

    setSending(true);
    try {
      const chatId = isGroupChat ? `event_${eventId}` : `chat_${[auth.currentUser.uid, recipientId].sort().join('_')}`;
      
      const messageData = {
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Unknown',
        timestamp: serverTimestamp(),
        isAnnouncement: false,
      };

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      setNewMessage('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendAnnouncement = async () => {
    if (!newMessage.trim() || !auth.currentUser || !isGroupChat) return;

    Alert.alert(
      'Send Announcement',
      'This message will be sent to all event attendees. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const chatId = `event_${eventId}`;
              
              const messageData = {
                text: newMessage.trim(),
                senderId: auth.currentUser!.uid,
                senderName: auth.currentUser!.displayName || 'Unknown',
                timestamp: serverTimestamp(),
                isAnnouncement: true,
              };

              await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
              setNewMessage('');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send announcement');
            } finally {
              setSending(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (timestamp: Timestamp | null) => {
    if (!timestamp) {
      return 'Unknown time';
    }
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (message: Message) => {
    return message.senderId === auth.currentUser?.uid;
  };

  const renderMessage = ({ item: message }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      isOwnMessage(message) ? styles.ownMessage : styles.otherMessage
    ]}>
      {!isOwnMessage(message) && (
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{message.senderName}</Text>
          {message.isAnnouncement && (
            <View style={styles.announcementBadge}>
              <Ionicons name="megaphone" size={12} color="#fff" />
              <Text style={styles.announcementText}>Announcement</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isOwnMessage(message) ? styles.ownBubble : styles.otherBubble,
        message.isAnnouncement && styles.announcementBubble
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage(message) ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.messageTime,
          isOwnMessage(message) ? styles.ownMessageTime : styles.otherMessageTime
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );

  const getChatTitle = () => {
    if (isGroupChat && event) {
      return `${event.title} - Group Chat`;
    }
    if (recipient) {
      return recipient.name;
    }
    return recipientName || 'Chat';
  };

  const getChatSubtitle = () => {
    if (isGroupChat && event) {
      return `${event.currentAttendees} attendees`;
    }
    if (recipient) {
      return recipient.role;
    }
    return '';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{getChatTitle()}</Text>
          {getChatSubtitle() && (
            <Text style={styles.headerSubtitle}>{getChatSubtitle()}</Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                {isGroupChat ? 'Start the conversation!' : 'Send a message to get started'}
              </Text>
            </View>
          }
        />
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={isGroupChat ? "Type a message or announcement..." : "Type a message..."}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <View style={styles.inputActions}>
            {isGroupChat && (
              <TouchableOpacity
                style={[styles.sendButton, styles.announcementButton]}
                onPress={sendAnnouncement}
                disabled={!newMessage.trim() || sending}
              >
                <Ionicons name="megaphone" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? '#fff' : colors.muted} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    padding: scaleSize(spacing.md),
    paddingTop: scaleSize(spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
    marginLeft: scaleSize(spacing.md),
  },
  headerTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginTop: scaleSize(spacing.xs),
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
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: scaleSize(spacing.md),
  },
  messageContainer: {
    marginBottom: scaleSize(spacing.md),
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(spacing.xs),
  },
  senderName: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: scaleSize(spacing.xs),
    paddingVertical: scaleSize(2),
    borderRadius: scaleSize(radii.sm),
    marginLeft: scaleSize(spacing.xs),
  },
  announcementText: {
    fontSize: scaleFont(fontSizes.xsmall),
    color: '#fff',
    fontWeight: '600',
    marginLeft: scaleSize(2),
  },
  messageBubble: {
    maxWidth: '80%',
    padding: scaleSize(spacing.md),
    borderRadius: scaleSize(radii.lg),
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: scaleSize(radii.sm),
  },
  otherBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: scaleSize(radii.sm),
  },
  announcementBubble: {
    backgroundColor: colors.warning,
    borderWidth: scaleSize(2),
    borderColor: colors.warning,
  },
  messageText: {
    fontSize: scaleFont(fontSizes.regular),
    lineHeight: scaleFont(20),
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: scaleFont(fontSizes.xsmall),
    marginTop: scaleSize(spacing.xs),
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: colors.textSecondary,
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
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: scaleSize(spacing.md),
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.lg),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.sm),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    maxHeight: scaleSize(100),
    marginRight: scaleSize(spacing.sm),
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButton: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scaleSize(spacing.xs),
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  announcementButton: {
    backgroundColor: colors.warning,
  },
});

export default ChatRoomScreen; 