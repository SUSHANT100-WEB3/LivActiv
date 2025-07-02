import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, PixelRatio, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors, fontSizes, radii, spacing } from '../constants/theme';

interface RoleSelectScreenProps {
  onRoleSelected: () => void;
}

interface Role {
  id: 'player' | 'trainer' | 'both';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  features: string[];
  color: string;
}

const RoleSelectScreen: React.FC<RoleSelectScreenProps> = ({ onRoleSelected }) => {
  const [selectedRole, setSelectedRole] = useState<'player' | 'trainer' | 'both' | null>(null);
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();

  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont, width });

  const roles: Role[] = [
    {
      id: 'player',
      title: 'Player',
      subtitle: 'Join sports events & activities',
      description: 'Discover and join sports events in your area, connect with trainers, and stay active with like-minded people.',
      icon: 'basketball',
      features: [
        'Discover local sports events',
        'Book sessions with trainers',
        'Track your activities',
        'Chat with organizers',
        'Get event reminders'
      ],
      color: colors.primary
    },
    {
      id: 'trainer',
      title: 'Trainer/Coach',
      subtitle: 'Create & host sports events',
      description: 'Share your expertise by creating sports events, managing attendees, and building your client base.',
      icon: 'fitness',
      features: [
        'Create and host events',
        'Manage attendees',
        'Set your rates',
        'Track earnings',
        'Build your reputation'
      ],
      color: colors.success
    },
    {
      id: 'both',
      title: 'Player & Trainer',
      subtitle: 'Best of both worlds',
      description: 'Join events as a player and create your own events as a trainer. Perfect for active sports enthusiasts.',
      icon: 'people',
      features: [
        'All player features',
        'All trainer features',
        'Switch between roles',
        'Flexible participation',
        'Maximum engagement'
      ],
      color: colors.warning
    }
  ];

  const handleRoleSelect = (role: 'player' | 'trainer' | 'both') => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!selectedRole || !auth.currentUser) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        role: selectedRole,
        onboardingStep: 'profile_setup',
        updatedAt: new Date(),
      });

      onRoleSelected();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save role selection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Role</Text>
        <Text style={styles.headerSubtitle}>
          How would you like to use LivActiv?
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Role Options */}
        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.selectedRoleCard,
                selectedRole === role.id && { borderColor: role.color }
              ]}
              onPress={() => handleRoleSelect(role.id)}
            >
              {/* Role Icon */}
              <View style={[
                styles.roleIcon,
                { backgroundColor: role.color + '20' },
                selectedRole === role.id && { backgroundColor: role.color + '30' }
              ]}>
                <Ionicons 
                  name={role.icon as any} 
                  size={32} 
                  color={role.color} 
                />
              </View>

              {/* Role Info */}
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>

              {/* Selection Indicator */}
              <View style={[
                styles.selectionIndicator,
                selectedRole === role.id && { backgroundColor: role.color }
              ]}>
                {selectedRole === role.id && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Features Preview */}
        {selectedRole && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>
              What you can do as a {roles.find(r => r.id === selectedRole)?.title}:
            </Text>
            {roles.find(r => r.id === selectedRole)?.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>You can change this later</Text>
              <Text style={styles.infoText}>
                Don't worry if you're not sure. You can update your role anytime in your profile settings.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Setting up...' : 'Continue'}
          </Text>
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={selectedRole ? '#fff' : colors.muted} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont, width }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number, width: number }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: scaleSize(spacing.lg),
    paddingTop: scaleSize(spacing.xl),
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(fontSizes.xxlarge),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: scaleSize(spacing.sm),
  },
  headerSubtitle: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(22),
  },
  content: {
    flex: 1,
  },
  rolesContainer: {
    padding: scaleSize(spacing.lg),
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: scaleSize(radii.lg),
    padding: scaleSize(spacing.lg),
    marginBottom: scaleSize(spacing.md),
    borderWidth: scaleSize(2),
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scaleSize(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleSize(4),
    elevation: 3,
  },
  selectedRoleCard: {
    borderWidth: scaleSize(2),
    shadowOpacity: 0.2,
    elevation: 5,
  },
  roleIcon: {
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(spacing.md),
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaleSize(spacing.xs),
  },
  roleSubtitle: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.primary,
    fontWeight: '600',
    marginBottom: scaleSize(spacing.sm),
  },
  roleDescription: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    lineHeight: scaleFont(18),
  },
  selectionIndicator: {
    width: scaleSize(24),
    height: scaleSize(24),
    borderRadius: scaleSize(12),
    borderWidth: scaleSize(2),
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    padding: scaleSize(spacing.lg),
    paddingTop: 0,
  },
  featuresTitle: {
    fontSize: scaleFont(fontSizes.large),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaleSize(spacing.md),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(spacing.sm),
  },
  featureText: {
    fontSize: scaleFont(fontSizes.medium),
    color: colors.textSecondary,
    marginLeft: scaleSize(spacing.sm),
  },
  infoContainer: {
    padding: scaleSize(spacing.lg),
    paddingTop: 0,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: scaleSize(radii.lg),
    padding: scaleSize(spacing.md),
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: scaleSize(spacing.sm),
  },
  infoTitle: {
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: scaleSize(spacing.xs),
  },
  infoText: {
    fontSize: scaleFont(fontSizes.small),
    color: colors.textSecondary,
    lineHeight: scaleFont(18),
  },
  footer: {
    padding: scaleSize(spacing.lg),
    borderTopWidth: scaleSize(1),
    borderTopColor: colors.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: scaleSize(spacing.md),
    borderRadius: scaleSize(radii.lg),
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: scaleFont(fontSizes.medium),
    fontWeight: 'bold',
    marginRight: scaleSize(spacing.sm),
  },
});

export default RoleSelectScreen; 