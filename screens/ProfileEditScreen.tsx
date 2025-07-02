import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, PixelRatio, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AuthContext } from '../constants/AuthContext';
import { db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

const ProfileEditScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });
  const maxCardWidth = Math.min(width - scaleSize(32), scaleSize(400));
  const [avatar, setAvatar] = useState<string | null>(null);
  const [role, setRole] = useState('Player');
  const [sports, setSports] = useState<string[]>([]);
  const [credentials, setCredentials] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirthYear, setDateOfBirthYear] = useState<string | number>('year');
  const [dateOfBirthMonth, setDateOfBirthMonth] = useState<string | number>('month');
  const [dateOfBirthDay, setDateOfBirthDay] = useState<string | number>('day');
  const [address, setAddress] = useState('');
  const [goals, setGoals] = useState('');
  const roles = ['Player', 'Trainer', 'Both'];

  // Load existing user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || user.displayName || '');
          setBio(data.bio || '');
          setAvatar(data.avatar || null);
          setRole(data.role || 'Player');
          setSports(data.sports || []);
          setCredentials(data.credentials || '');
          setPhone(data.phone || '');
          setGender(data.gender || '');
          // Parse dateOfBirth into year, month, day pickers
          if (data.dateOfBirth && typeof data.dateOfBirth === 'string' && data.dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = data.dateOfBirth.split('-');
            setDateOfBirthYear(Number(y));
            setDateOfBirthMonth(Number(m) - 1);
            setDateOfBirthDay(Number(d));
          } else {
            setDateOfBirthYear('year');
            setDateOfBirthMonth('month');
            setDateOfBirthDay('day');
          }
          setAddress(data.address || '');
          setGoals(data.goals || '');
        } else {
          // Set default values for new users
          setName(user.displayName || '');
          setRole('Player');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handlePhotoPick = async () => {
    try {
      setImageLoading(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Show preview immediately
        setAvatar(imageUri);
        
        // Upload to Firebase Storage
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `avatars/${user?.uid}_${Date.now()}`);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);
          setAvatar(downloadURL);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
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

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }
    
    if (role === 'Trainer' && !credentials.trim()) {
      Alert.alert('Validation Error', 'Please enter your credentials');
      return false;
    }
    
    if (role === 'Player' && sports.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one sport');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;
    
    setLoading(true);
    try {
      let avatarUrl = avatar;
      
      // Upload avatar if it's a local URI
      if (avatar && !avatar.startsWith('http')) {
        const response = await fetch(avatar);
        const blob = await response.blob();
        const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, blob);
        avatarUrl = await getDownloadURL(storageRef);
      }

      // Combine date of birth pickers into string
      let dob = '';
      if (
        dateOfBirthYear !== 'year' &&
        dateOfBirthMonth !== 'month' &&
        dateOfBirthDay !== 'day'
      ) {
        const month = String(Number(dateOfBirthMonth) + 1).padStart(2, '0');
        const day = String(dateOfBirthDay).padStart(2, '0');
        dob = `${dateOfBirthYear}-${month}-${day}`;
      }

      // Prepare update data
      const updateData: any = {
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatarUrl || '',
        role,
        updatedAt: new Date(),
        phone,
        gender,
        dateOfBirth: dob,
        address,
        goals,
      };

      // Add role-specific data
      if (role === 'Player' || role === 'Both') {
        updateData.sports = sports;
      }
      if (role === 'Trainer' || role === 'Both') {
        updateData.credentials = credentials.trim();
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  const toggleSport = (sport: string) => {
    setSports(prev => 
      prev.includes(sport) 
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  const commonSports = ['Football', 'Basketball', 'Tennis', 'Swimming', 'Running', 'Gym', 'Yoga', 'Boxing'];

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={[styles.scrollContainer, { alignItems: 'center' }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { maxWidth: maxCardWidth, width: '100%' }]}> 
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePhotoPick} style={styles.avatarContainer} disabled={imageLoading}>
            {imageLoading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={40} color={colors.muted} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>Tap to change photo</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Full Name" 
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <TextInput 
            style={styles.textArea} 
            placeholder="Tell us about yourself..." 
            multiline 
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
            maxLength={200}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I am a...</Text>
          <View style={styles.roleContainer}>
            {roles.map(r => (
              <TouchableOpacity 
                key={r} 
                onPress={() => setRole(r)} 
                style={[styles.roleButton, role === r && styles.roleButtonActive]}
              >
                <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Role-specific fields */}
        {(role === 'Player' || role === 'Both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sports I'm interested in</Text>
            <View style={styles.sportsContainer}>
              {commonSports.map(sport => (
                <TouchableOpacity
                  key={sport}
                  onPress={() => toggleSport(sport)}
                  style={[styles.sportChip, sports.includes(sport) && styles.sportChipActive]}
                >
                  <Text style={[styles.sportChipText, sports.includes(sport) && styles.sportChipTextActive]}>
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(role === 'Trainer' || role === 'Both') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credentials & Experience</Text>
            <TextInput 
              style={styles.textArea} 
              placeholder="Describe your qualifications, certifications, and experience..." 
              multiline 
              numberOfLines={4}
              value={credentials}
              onChangeText={setCredentials}
              maxLength={500}
            />
            <Text style={styles.charCount}>{credentials.length}/500</Text>
          </View>
        )}

        <TextInput 
          style={styles.input} 
          placeholder="Phone Number" 
          value={phone} 
          onChangeText={setPhone} 
          keyboardType="phone-pad" 
        />
        {/* Gender Picker */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={gender || 'choose'}
            onValueChange={setGender}
            style={styles.picker}
          >
            <Picker.Item label="Gender" value="choose" />
            <Picker.Item label="Male" value="male" />
            <Picker.Item label="Female" value="female" />
            <Picker.Item label="Other" value="other" />
          </Picker>
        </View>
        {/* Date of Birth Pickers */}
        <Text style={styles.label}>Date of Birth</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 2 }}>
            <Picker
              selectedValue={dateOfBirthMonth}
              onValueChange={setDateOfBirthMonth}
              style={styles.picker}
            >
              <Picker.Item label="Month" value="month" />
              {Array.from({ length: 12 }, (_, i) => (
                <Picker.Item key={i} label={new Date(0, i).toLocaleString('default', { month: 'long' })} value={i} />
              ))}
            </Picker>
          </View>
          <View style={{ flex: 1 }}>
            <Picker
              selectedValue={dateOfBirthDay}
              onValueChange={setDateOfBirthDay}
              style={styles.picker}
            >
              <Picker.Item label="Day" value="day" />
              {Array.from({ length: 31 }, (_, i) => (
                <Picker.Item key={i + 1} label={String(i + 1)} value={i + 1} />
              ))}
            </Picker>
          </View>
          <View style={{ flex: 1 }}>
            <Picker
              selectedValue={dateOfBirthYear}
              onValueChange={setDateOfBirthYear}
              style={styles.picker}
            >
              <Picker.Item label="Year" value="year" />
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <Picker.Item key={year} label={String(year)} value={year} />
              ))}
            </Picker>
          </View>
        </View>
        <TextInput 
          style={styles.input} 
          placeholder="Address" 
          value={address} 
          onChangeText={setAddress} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Your Goals (optional)" 
          value={goals} 
          onChangeText={setGoals} 
        />
      </View>
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
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingVertical: scaleSize(spacing.xl),
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.lg),
    padding: scaleSize(spacing.xl),
    width: '100%',
    maxWidth: scaleSize(400),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: scaleSize(12),
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleSize(spacing.xl),
  },
  cancelButton: {
    padding: scaleSize(spacing.sm),
  },
  title: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaleSize(spacing.lg),
    paddingVertical: scaleSize(spacing.sm),
    borderRadius: scaleSize(radii.md),
    minWidth: scaleSize(60),
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.muted,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: scaleFont(fontSizes.regular),
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: scaleSize(spacing.xl),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: scaleSize(spacing.sm),
  },
  avatar: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    borderWidth: scaleSize(3),
    borderColor: colors.primary,
  },
  defaultAvatar: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scaleSize(3),
    borderColor: colors.primary,
  },
  avatarLoading: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    backgroundColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scaleSize(3),
    borderColor: colors.primary,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: scaleSize(15),
    width: scaleSize(30),
    height: scaleSize(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
  },
  section: {
    marginBottom: scaleSize(spacing.xl),
  },
  sectionTitle: {
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaleSize(spacing.md),
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    marginBottom: scaleSize(spacing.md),
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    fontSize: scaleFont(fontSizes.regular),
    color: colors.text,
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    minHeight: scaleSize(100),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: scaleSize(spacing.xs),
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(spacing.sm),
  },
  roleButton: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.lg),
    paddingVertical: scaleSize(spacing.md),
    alignItems: 'center',
    borderWidth: scaleSize(1),
    borderColor: colors.border,
    minHeight: scaleSize(44),
    justifyContent: 'center',
    minWidth: scaleSize(80),
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    fontSize: scaleFont(fontSizes.small),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    flexShrink: 0,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(spacing.sm),
  },
  sportChip: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    paddingHorizontal: scaleSize(spacing.md),
    paddingVertical: scaleSize(spacing.sm),
    borderWidth: scaleSize(1),
    borderColor: colors.border,
  },
  sportChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sportChipText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.text,
    fontWeight: '500',
  },
  sportChipTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    marginBottom: scaleSize(spacing.xs),
  },
  pickerWrapper: {
    backgroundColor: colors.background,
    borderRadius: scaleSize(radii.md),
    padding: scaleSize(spacing.md),
    borderWidth: scaleSize(1),
    borderColor: colors.border,
  },
  picker: {
    width: '100%',
    height: scaleSize(50),
  },
});

export default ProfileEditScreen; 