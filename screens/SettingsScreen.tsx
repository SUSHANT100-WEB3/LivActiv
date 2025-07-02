import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Linking, Modal, PixelRatio, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { AuthContext } from '../constants/AuthContext';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface Settings {
  notifications: {
    eventReminders: boolean;
    bookingUpdates: boolean;
    chatMessages: boolean;
    eventUpdates: boolean;
  };
  privacy: {
    showProfile: boolean;
    showLocation: boolean;
    allowMessages: boolean;
  };
  preferences: {
    darkMode: boolean;
    units: 'metric' | 'imperial';
  };
}

const unitOptions = [
  { label: 'Metric (km, °C)', value: 'metric' },
  { label: 'Imperial (mi, °F)', value: 'imperial' },
];

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      eventReminders: true,
      bookingUpdates: true,
      chatMessages: true,
      eventUpdates: true,
    },
    privacy: {
      showProfile: true,
      showLocation: true,
      allowMessages: true,
    },
    preferences: {
      darkMode: false,
      units: 'metric',
    },
  });
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const { theme, setTheme } = useTheme();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(500));
  const [unitModalVisible, setUnitModalVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.settings) {
            setSettings({ ...settings, ...userData.settings });
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSetting = async (category: keyof Settings, key: string, value: any) => {
    if (!user) return;

    try {
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          [key]: value,
        },
      };
      
      setSettings(newSettings);
      
      if (category === 'preferences' && key === 'darkMode') {
        setTheme(value ? 'dark' : 'light');
      }
      
      await updateDoc(doc(db, 'users', user.uid), {
        settings: newSettings,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => auth.signOut(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;
              // Delete all events organized by the user
              const eventsQuery = query(collection(db, 'events'), where('organizer', '==', user.uid));
              const eventsSnapshot = await getDocs(eventsQuery);
              for (const docSnap of eventsSnapshot.docs) {
                await deleteDoc(docSnap.ref);
              }
              // Delete all bookings by the user
              const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
              const bookingsSnapshot = await getDocs(bookingsQuery);
              for (const docSnap of bookingsSnapshot.docs) {
                await deleteDoc(docSnap.ref);
              }
              // Delete user document
              await deleteDoc(doc(db, 'users', user.uid));
              // Delete Auth user
              await auth.currentUser?.delete();
              Alert.alert('Success', 'Account and all related data deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    value?: boolean,
    onValueChange?: (value: boolean) => void,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !onValueChange}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {onValueChange && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      )}
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={[styles.header, { maxWidth: maxCardWidth, width: '100%' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Notifications Section */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {renderSettingItem(
          'notifications',
          'Event Reminders',
          'Get notified before events start',
          settings.notifications.eventReminders,
          (value) => updateSetting('notifications', 'eventReminders', value)
        )}
        {renderSettingItem(
          'checkmark-circle',
          'Booking Updates',
          'Notifications about booking status changes',
          settings.notifications.bookingUpdates,
          (value) => updateSetting('notifications', 'bookingUpdates', value)
        )}
        {renderSettingItem(
          'chatbubble',
          'Chat Messages',
          'New message notifications',
          settings.notifications.chatMessages,
          (value) => updateSetting('notifications', 'chatMessages', value)
        )}
        {renderSettingItem(
          'megaphone',
          'Event Updates',
          'Updates about events you\'re attending',
          settings.notifications.eventUpdates,
          (value) => updateSetting('notifications', 'eventUpdates', value)
        )}
      </View>

      {/* Privacy Section */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        {renderSettingItem(
          'person',
          'Show Profile',
          'Allow others to see your profile',
          settings.privacy.showProfile,
          (value) => updateSetting('privacy', 'showProfile', value)
        )}
        {renderSettingItem(
          'location',
          'Show Location',
          'Share your location with event organizers',
          settings.privacy.showLocation,
          (value) => updateSetting('privacy', 'showLocation', value)
        )}
        {renderSettingItem(
          'mail',
          'Allow Messages',
          'Let others send you messages',
          settings.privacy.allowMessages,
          (value) => updateSetting('privacy', 'allowMessages', value)
        )}
      </View>

      {/* Preferences Section */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {renderSettingItem(
          'moon',
          'Dark Mode',
          'Use dark theme',
          settings.preferences.darkMode,
          (value) => updateSetting('preferences', 'darkMode', value)
        )}
        {renderSettingItem(
          'speedometer',
          'Units',
          unitOptions.find(opt => opt.value === settings.preferences.units)?.label || 'Choose',
          undefined,
          undefined,
          () => setUnitModalVisible(true)
        )}
      </View>

      {/* Account Section */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>Account</Text>
        {renderSettingItem(
          'person-circle',
          'Edit Profile',
          'Update your profile information',
          undefined,
          undefined,
          () => navigation.navigate('ProfileEdit')
        )}
        {renderSettingItem(
          'shield-checkmark',
          'Privacy Policy',
          'Read our privacy policy',
          undefined,
          undefined,
          () => Linking.openURL('https://yourdomain.com/privacy-policy')
        )}
        {renderSettingItem(
          'document-text',
          'Terms of Service',
          'Read our terms of service',
          undefined,
          undefined,
          () => Linking.openURL('https://yourdomain.com/terms-of-service')
        )}
        {renderSettingItem(
          'help-circle',
          'Help & Support',
          'Get help and contact support',
          undefined,
          undefined,
          () => Linking.openURL('mailto:support@yourdomain.com?subject=Help%20%26%20Support')
        )}
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        {renderSettingItem(
          'log-out',
          'Sign Out',
          'Sign out of your account',
          undefined,
          undefined,
          handleSignOut
        )}
        {renderSettingItem(
          'trash',
          'Delete Account',
          'Permanently delete your account',
          undefined,
          undefined,
          handleDeleteAccount
        )}
      </View>

      {/* App Info */}
      <View style={[styles.section, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.sectionTitle}>App Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build</Text>
          <Text style={styles.infoValue}>25.1.1</Text>
        </View>
      </View>

      <Modal
        visible={unitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnitModalVisible(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setUnitModalVisible(false)}>
          <View style={{
            backgroundColor: '#fff',
            margin: 40,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Select Units</Text>
            {unitOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={{ paddingVertical: 10, width: 180, alignItems: 'center', backgroundColor: settings.preferences.units === opt.value ? colors.primary : '#eee', borderRadius: 8, marginBottom: 8 }}
                onPress={async () => {
                  setUnitModalVisible(false);
                  await updateSetting('preferences', 'units', opt.value);
                }}
              >
                <Text style={{ color: settings.preferences.units === opt.value ? '#fff' : '#222', fontWeight: 'bold' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setUnitModalVisible(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: scaleSize(spacing.md),
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(spacing.lg),
    marginBottom: scaleSize(spacing.lg),
  },
  headerTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.lg),
    padding: scaleSize(spacing.md),
    marginBottom: scaleSize(spacing.lg),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(4),
    elevation: 3,
  },
  sectionTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: scaleSize(spacing.md),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSize(spacing.sm),
    borderBottomWidth: scaleSize(1),
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: scaleSize(40),
    alignItems: 'center',
    marginRight: scaleSize(spacing.sm),
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: '600',
    color: colors.text,
  },
  settingSubtitle: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginTop: scaleSize(2),
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleSize(spacing.sm),
    borderBottomWidth: scaleSize(1),
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.text,
  },
  infoValue: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
  },
});

export default SettingsScreen; 