import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface ProfileSetupScreenProps {
  onComplete: () => void;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'player' | 'trainer' | 'both';
  avatar?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  address?: string;
  goals?: string;
  location?: any;
  sports?: string[];
  skillLevel?: string;
  credentials?: string;
  intro?: string;
  offeredSports?: string[];
  rates?: {
    hourly?: number;
    session?: number;
    package?: number;
  };
  certificates?: string[];
  experience?: string;
  profileComplete?: boolean;
  onboardingStep?: string;
  createdAt?: any;
  updatedAt?: any;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ onComplete }) => {
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userRole, setUserRole] = useState<'player' | 'trainer' | 'both'>('player');
  const [showSportsModal, setShowSportsModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const sports = [
    'Basketball', 'Soccer', 'Tennis', 'Yoga', 'HIIT', 'Running', 
    'Swimming', 'Golf', 'Baseball', 'Volleyball', 'Weight Training',
    'CrossFit', 'Pilates', 'Boxing', 'Martial Arts', 'Dance', 'Other'
  ];

  const skillLevels = [
    'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Professional'
  ];

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setUserRole(userData.role || 'player');
        setAvatar(userData.avatar);
      } else {
        const initialProfile = {
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          role: 'player',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await setDoc(doc(db, 'users', auth.currentUser.uid), initialProfile);
        setProfile(initialProfile as Partial<UserProfile>);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    }
  };

  const handleAvatarPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Permission to access media library is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.8 
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string> => {
    if (!avatar || !auth.currentUser) return '';
    try {
      const response = await fetch(avatar);
      const blob = await response.blob();
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    }
  };

  const handleNext = () => {
    if (currentStep < getTotalSteps()) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      let avatarUrl = '';
      if (avatar && avatar !== profile.avatar) {
        avatarUrl = await uploadAvatar();
      }
      const updatedProfile = {
        ...profile,
        avatar: avatarUrl || profile.avatar || '',
        profileComplete: true,
        onboardingStep: 'completed',
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      onComplete();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const getTotalSteps = () => 3;

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const renderBasicInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
      {/* Avatar */}
      <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPick}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="camera" size={32} color={colors.muted} />
          </View>
        )}
        <View style={styles.avatarOverlay}>
          <Ionicons name="pencil" size={16} color="#fff" />
        </View>
      </TouchableOpacity>
      {/* Name */}
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={profile.displayName || ''}
        onChangeText={(text) => updateProfile({ displayName: text })}
        autoCapitalize="words"
      />
      {/* Bio */}
      <TextInput
        style={styles.textArea}
        placeholder="Short bio (optional)"
        value={profile.bio || ''}
        onChangeText={(text) => updateProfile({ bio: text })}
        multiline
        numberOfLines={3}
        maxLength={200}
        autoCapitalize="sentences"
      />
      <Text style={styles.charCount}>{(profile.bio || '').length}/200</Text>
      {/* Phone */}
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={profile.phone || ''}
        onChangeText={(text) => updateProfile({ phone: text })}
        keyboardType="phone-pad"
      />
      {/* Gender */}
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={profile.gender || 'choose'}
          onValueChange={(value) => updateProfile({ gender: value })}
          style={styles.picker}
        >
          <Picker.Item label="Gender" value="choose" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>
      {/* Manual Spacer */}
      <View style={{ height: 16 }} />
      {/* Address */}
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={profile.address || ''}
        onChangeText={(text) => updateProfile({ address: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Your Goals"
        value={profile.goals || ''}
        onChangeText={(text) => updateProfile({ goals: text })}
      />
    </View>
  );

  const renderPlayerSetup = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Sports & Skills</Text>
      <Text style={styles.stepSubtitle}>What sports do you enjoy?</Text>
      {/* Sports Selection */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowSportsModal(true)}
      >
        <Text style={styles.pickerButtonText}>
          {profile.sports && profile.sports.length > 0
            ? profile.sports.join(', ')
            : 'Select sports you play'
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
      {/* Skill Level */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowSkillModal(true)}
      >
        <Text style={styles.pickerButtonText}>
          {profile.skillLevel || 'Select your skill level'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderTrainerSetup = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Trainer Profile</Text>
      <Text style={styles.stepSubtitle}>Share your expertise</Text>
      {/* Credentials */}
      <TextInput
        style={styles.input}
        placeholder="Certifications & Credentials"
        value={profile.credentials || ''}
        onChangeText={(text) => updateProfile({ credentials: text })}
        autoCapitalize="words"
      />
      {/* Experience */}
      <TextInput
        style={styles.input}
        placeholder="Years of experience"
        value={profile.experience || ''}
        onChangeText={(text) => updateProfile({ experience: text })}
        keyboardType="numeric"
      />
      {/* Introduction */}
      <TextInput
        style={styles.textArea}
        placeholder="Tell potential clients about yourself and your training style"
        value={profile.intro || ''}
        onChangeText={(text) => updateProfile({ intro: text })}
        multiline
        numberOfLines={4}
        maxLength={500}
        autoCapitalize="sentences"
      />
      <Text style={styles.charCount}>{(profile.intro || '').length}/500</Text>
      {/* Offered Sports */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowSportsModal(true)}
      >
        <Text style={styles.pickerButtonText}>
          {profile.offeredSports && profile.offeredSports.length > 0
            ? profile.offeredSports.join(', ')
            : 'Select sports you teach'
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
    </View>
  );

  const renderRates = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Set Your Rates</Text>
      <Text style={styles.stepSubtitle}>How much do you charge?</Text>
      {/* Hourly Rate */}
      <View style={styles.rateContainer}>
        <Text style={styles.rateLabel}>Hourly Rate ($)</Text>
        <TextInput
          style={styles.rateInput}
          placeholder="0"
          value={profile.rates?.hourly?.toString() || ''}
          onChangeText={(text) => updateProfile({
            rates: { ...profile.rates, hourly: parseInt(text) || 0 }
          })}
          keyboardType="numeric"
        />
      </View>
      {/* Session Rate */}
      <View style={styles.rateContainer}>
        <Text style={styles.rateLabel}>Per Session ($)</Text>
        <TextInput
          style={styles.rateInput}
          placeholder="0"
          value={profile.rates?.session?.toString() || ''}
          onChangeText={(text) => updateProfile({
            rates: { ...profile.rates, session: parseInt(text) || 0 }
          })}
          keyboardType="numeric"
        />
      </View>
      {/* Package Rate */}
      <View style={styles.rateContainer}>
        <Text style={styles.rateLabel}>Package Rate ($)</Text>
        <TextInput
          style={styles.rateInput}
          placeholder="0"
          value={profile.rates?.package?.toString() || ''}
          onChangeText={(text) => updateProfile({
            rates: { ...profile.rates, package: parseInt(text) || 0 }
          })}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.rateNote}>
        <Ionicons name="information-circle" size={16} color={colors.muted} />
        <Text style={styles.rateNoteText}>
          You can adjust these rates later for individual events
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        if (userRole === 'player') return renderPlayerSetup();
        return renderTrainerSetup();
      case 3:
        if (userRole === 'trainer' || userRole === 'both') return renderRates();
        return renderPlayerSetup();
      default:
        return renderBasicInfo();
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return profile.displayName && profile.displayName.trim().length > 0;
      case 2:
        if (userRole === 'player') {
          return profile.sports && profile.sports.length > 0 && profile.skillLevel;
        }
        return profile.credentials && profile.intro && profile.offeredSports && profile.offeredSports.length > 0;
      case 3:
        if (userRole === 'trainer' || userRole === 'both') {
          return profile.rates && (profile.rates.hourly || profile.rates.session || profile.rates.package);
        }
        return true;
      default:
        return true;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} disabled={currentStep === 1}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={currentStep === 1 ? colors.muted : colors.primary} 
          />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / getTotalSteps()) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of {getTotalSteps()}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>
      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isStepValid() && styles.continueButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!isStepValid() || loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Saving...' : 
             currentStep === getTotalSteps() ? 'Complete Setup' : 'Continue'
            }
          </Text>
          <Ionicons 
            name={currentStep === getTotalSteps() ? "checkmark" : "arrow-forward"} 
            size={20} 
            color={isStepValid() ? '#fff' : colors.muted} 
          />
        </TouchableOpacity>
      </View>
      {/* Sports Selection Modal */}
      <Modal visible={showSportsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {userRole === 'player' ? 'Select Sports You Play' : 'Select Sports You Teach'}
            </Text>
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {sports.map((sport) => (
                <TouchableOpacity
                  key={sport}
                  style={styles.modalOption}
                  onPress={() => {
                    const currentSports = userRole === 'player' ? profile.sports : profile.offeredSports;
                    const isSelected = currentSports?.includes(sport);
                    if (isSelected) {
                      const updatedSports = currentSports?.filter(s => s !== sport);
                      updateProfile(userRole === 'player' ? { sports: updatedSports } : { offeredSports: updatedSports });
                    } else {
                      const updatedSports = [...(currentSports || []), sport];
                      updateProfile(userRole === 'player' ? { sports: updatedSports } : { offeredSports: updatedSports });
                    }
                  }}
                >
                  <Text style={styles.modalOptionText}>{sport}</Text>
                  {(userRole === 'player' ? profile.sports : profile.offeredSports)?.includes(sport) && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowSportsModal(false)}
            >
              <Text style={styles.modalCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Skill Level Modal */}
      <Modal visible={showSkillModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Your Skill Level</Text>
            {skillLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.modalOption}
                onPress={() => {
                  updateProfile({ skillLevel: level });
                  setShowSkillModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{level}</Text>
                {profile.skillLevel === level && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowSkillModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: spacing.lg,
  },
  stepTitle: {
    fontSize: fontSizes.xlarge,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSizes.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fontSizes.regular,
    color: colors.text,
    marginBottom: spacing.md,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fontSizes.regular,
    color: colors.text,
    marginBottom: spacing.xs,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: fontSizes.small,
    color: colors.muted,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pickerButtonText: {
    fontSize: fontSizes.regular,
    color: colors.text,
    flex: 1,
  },
  rateContainer: {
    marginBottom: spacing.md,
  },
  rateLabel: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  rateInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fontSizes.regular,
    color: colors.text,
  },
  rateNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  rateNoteText: {
    fontSize: fontSizes.small,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: fontSizes.medium,
    fontWeight: 'bold',
    marginRight: spacing.sm,
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSizes.large,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: fontSizes.medium,
    color: colors.text,
  },
  modalCancel: {
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelText: {
    fontSize: fontSizes.medium,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  picker: {
    width: '100%',
    height: 50,
  },
  label: {
    fontSize: fontSizes.medium,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
});

export default ProfileSetupScreen; 