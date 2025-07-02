import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, PixelRatio, ScrollView, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle, useWindowDimensions } from 'react-native';
import { AuthContext } from '../constants/AuthContext';
import { db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(500));
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          if (data.avatar) setAvatar(data.avatar);
        } else {
          // Set default profile for new users
          setProfile({
            name: user.displayName || 'User',
            role: 'Player',
            email: user.email,
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleEditProfile = () => {
    navigation.navigate('ProfileEdit');
  };

  const handleAvatarPress = async () => {
    try {
      setImageLoading(true);
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }
      
      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.8 
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setAvatar(imageUri);
        
        // Upload to Firebase Storage
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `avatars/${user!.uid}_${Date.now()}`);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update Firestore profile
          await updateDoc(doc(db, 'users', user!.uid), { avatar: downloadURL });
          setAvatar(downloadURL);
          Alert.alert('Success', 'Avatar updated successfully!');
        } catch (e) {
          console.error('Upload error:', e);
          Alert.alert('Error', 'Failed to upload avatar. Please try again.');
          setAvatar(null);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setImageLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { alignItems: 'center' }]}>
      {/* Header with avatar and role badge */}
      <View style={[styles.headerRow, { maxWidth: maxCardWidth, width: '100%' }]}>
        <TouchableOpacity style={styles.avatarWrapper} onPress={handleAvatarPress} disabled={imageLoading}>
          {imageLoading ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <Ionicons name="person-circle" size={64} color={colors.muted} />
          )}
          <View style={styles.avatarEditIcon}>
            <Ionicons name="camera" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{
            profile.displayName && profile.name && profile.displayName !== profile.name
              ? `${profile.displayName} (${profile.name})`
              : profile.displayName || profile.name || user?.displayName || 'User'
          }</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="person" size={16} color={colors.primary} />
            <Text style={styles.roleBadgeText}>{profile.role || 'Player'}</Text>
          </View>
        </View>
      </View>

      {/* Basic Info Card */}
      <View style={[styles.card, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.cardTitle}>Basic Information</Text>
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={18} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>{profile.email || user?.email}</Text>
        </View>
        {profile.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{profile.phone}</Text>
          </View>
        )}
        {/* Gender */}
        {profile.gender && profile.gender !== '' && (
          <View style={styles.infoRow}>
            <Ionicons name="male-female" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{profile.gender === 'choose' ? 'Gender' : profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}</Text>
          </View>
        )}
        {/* Date of Birth */}
        {profile.dateOfBirth && profile.dateOfBirth !== '' && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{profile.dateOfBirth}</Text>
          </View>
        )}
        {profile.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{profile.address}</Text>
          </View>
        )}
        {profile.goals && (
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={18} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{profile.goals}</Text>
          </View>
        )}
        {profile.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioLabel}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}
      </View>

      {/* Role & Preferences Card */}
      <View style={[styles.card, { maxWidth: maxCardWidth, width: '100%' }]}>
        <Text style={styles.cardTitle}>Role & Preferences</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>I am a...</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{profile.role || 'Player'}</Text>
          </View>
        </View>
        
        {/* Sports Section */}
        {(profile.role === 'Player' || profile.role === 'Both') && profile.sports && Array.isArray(profile.sports) && profile.sports.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sports & Activities</Text>
            <View style={styles.sportsContainer}>
              {profile.sports.map((sport: string, index: number) => (
                <View key={index} style={styles.sportChip}>
                  <Text style={styles.sportChipText}>{sport}</Text>
                </View>
              ))}
            </View>
            {profile.skillLevel && (
              <Text style={styles.sectionLabel}>Skill Level: <Text style={{fontWeight:'normal'}}>{profile.skillLevel}</Text></Text>
            )}
          </View>
        )}

        {/* Trainer Section */}
        {(profile.role === 'Trainer' || profile.role === 'Both') && (
          <View style={styles.section}>
            {profile.credentials && (
              <>
                <Text style={styles.sectionLabel}>Credentials & Experience</Text>
                <Text style={styles.credentialsText}>{profile.credentials}</Text>
              </>
            )}
            {profile.experience && (
              <Text style={styles.sectionLabel}>Years of Experience: <Text style={{fontWeight:'normal'}}>{profile.experience}</Text></Text>
            )}
            {profile.intro && (
              <>
                <Text style={styles.sectionLabel}>Introduction</Text>
                <Text style={styles.bioText}>{profile.intro}</Text>
              </>
            )}
            {profile.offeredSports && Array.isArray(profile.offeredSports) && profile.offeredSports.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Sports Offered</Text>
                <View style={styles.sportsContainer}>
                  {profile.offeredSports.map((sport: string, index: number) => (
                    <View key={index} style={styles.sportChip}>
                      <Text style={styles.sportChipText}>{sport}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
            {profile.rates && (profile.rates.hourly || profile.rates.session || profile.rates.package) && (
              <>
                <Text style={styles.sectionLabel}>Rates</Text>
                {profile.rates.hourly ? <Text style={styles.bioText}>Hourly: ${profile.rates.hourly}</Text> : null}
                {profile.rates.session ? <Text style={styles.bioText}>Session: ${profile.rates.session}</Text> : null}
                {profile.rates.package ? <Text style={styles.bioText}>Package: ${profile.rates.package}</Text> : null}
              </>
            )}
          </View>
        )}

        {/* Show message if no role-specific data */}
        {((profile.role === 'Player' || profile.role === 'Both') && (!profile.sports || !Array.isArray(profile.sports) || profile.sports.length === 0)) && (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No sports selected yet</Text>
          </View>
        )}
        
        {((profile.role === 'Trainer' || profile.role === 'Both') && !profile.credentials) && (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No credentials added yet</Text>
          </View>
        )}
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity style={[styles.editButton, { maxWidth: maxCardWidth, width: '100%' }]} onPress={handleEditProfile}>
        <Ionicons name="create-outline" size={20} color="#fff" style={styles.editIcon} />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: scaleSize(spacing.md),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.textSecondary,
  },
  container: { 
    padding: scaleSize(spacing.md), 
    backgroundColor: colors.background, 
    flexGrow: 1 
  } as ViewStyle,
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: scaleSize(spacing.lg) 
  } as ViewStyle,
  avatarWrapper: { 
    width: scaleSize(72), 
    height: scaleSize(72), 
    borderRadius: scaleSize(36), 
    backgroundColor: '#E3F0FF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: scaleSize(spacing.md) 
  } as ViewStyle,
  avatar: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(32),
  },
  avatarLoading: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(32),
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaleSize(spacing.xs),
  },
  roleBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E3F0FF', 
    borderRadius: scaleSize(radii.md), 
    paddingHorizontal: scaleSize(spacing.md), 
    paddingVertical: scaleSize(spacing.xs),
    alignSelf: 'flex-start'
  } as ViewStyle,
  roleBadgeText: { 
    color: colors.primary, 
    fontWeight: 'bold', 
    marginLeft: scaleSize(spacing.xs),
    fontSize: scaleFont(fontSizes.small)
  } as TextStyle,
  card: { 
    backgroundColor: colors.card, 
    borderRadius: scaleSize(radii.md), 
    padding: scaleSize(spacing.md), 
    marginBottom: scaleSize(spacing.md), 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: scaleSize(8), 
    elevation: 2 
  } as ViewStyle,
  cardTitle: { 
    fontSize: scaleFont(fontSizes.medium), 
    fontWeight: 'bold', 
    color: colors.primary, 
    marginBottom: scaleSize(spacing.sm) 
  } as TextStyle,
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: scaleSize(spacing.sm) 
  } as ViewStyle,
  infoIcon: {
    marginRight: scaleSize(spacing.sm),
    width: scaleSize(20),
  },
  infoText: { 
    color: colors.text, 
    fontSize: scaleFont(fontSizes.regular),
    flex: 1
  } as TextStyle,
  infoLabel: { 
    color: colors.textSecondary, 
    fontSize: scaleFont(fontSizes.regular), 
    marginRight: scaleSize(spacing.sm),
    minWidth: scaleSize(80)
  } as TextStyle,
  bioSection: {
    marginTop: scaleSize(spacing.sm),
    paddingTop: scaleSize(spacing.sm),
    borderTopWidth: scaleSize(1),
    borderTopColor: colors.border,
  },
  bioLabel: {
    fontSize: scaleFont(fontSizes.small),
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: scaleSize(spacing.xs),
  },
  bioText: {
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    lineHeight: scaleFont(20),
  },
  section: {
    marginTop: scaleSize(spacing.sm),
    paddingTop: scaleSize(spacing.sm),
    borderTopWidth: scaleSize(1),
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: scaleFont(fontSizes.small),
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: scaleSize(spacing.sm),
  },
  emptySection: {
    marginTop: scaleSize(spacing.sm),
    paddingTop: scaleSize(spacing.sm),
    borderTopWidth: scaleSize(1),
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  rolePill: { 
    backgroundColor: '#E3F0FF', 
    borderRadius: scaleSize(radii.md), 
    paddingHorizontal: scaleSize(spacing.md), 
    paddingVertical: scaleSize(spacing.xs) 
  } as ViewStyle,
  rolePillText: { 
    color: colors.primary, 
    fontWeight: 'bold',
    fontSize: scaleFont(fontSizes.small)
  } as TextStyle,
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(spacing.xs),
  },
  sportChip: { 
    backgroundColor: '#E3F0FF', 
    borderRadius: scaleSize(radii.md), 
    paddingHorizontal: scaleSize(spacing.md), 
    paddingVertical: scaleSize(spacing.xs) 
  } as ViewStyle,
  sportChipText: { 
    color: colors.primary, 
    fontWeight: 'bold',
    fontSize: scaleFont(fontSizes.small)
  } as TextStyle,
  credentialsText: {
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    lineHeight: scaleFont(20),
  },
  editButton: { 
    backgroundColor: colors.primary, 
    borderRadius: scaleSize(radii.md), 
    padding: scaleSize(spacing.md), 
    marginTop: scaleSize(spacing.md), 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  } as ViewStyle,
  editButtonText: { 
    color: colors.background, 
    fontSize: scaleFont(fontSizes.regular), 
    fontWeight: 'bold',
    marginLeft: scaleSize(spacing.xs)
  } as TextStyle,
  editIcon: {
    marginRight: scaleSize(spacing.xs),
  },
  avatarEditIcon: { 
    position: 'absolute', 
    bottom: 0, 
    right: 0, 
    backgroundColor: colors.background, 
    borderRadius: scaleSize(12), 
    padding: scaleSize(4), 
    borderWidth: scaleSize(1), 
    borderColor: colors.primary, 
  },
});

export default ProfileScreen;

 