import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors } from '../constants/theme';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import RoleSelectScreen from '../screens/RoleSelectScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'role_selection' | 'profile_setup' | 'completed';

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const onboardingStep = userData.onboardingStep || 'welcome';
        const profileComplete = userData.profileComplete || false;

        if (profileComplete) {
          setCurrentStep('completed');
          onComplete();
        } else if (userData.role) {
          setCurrentStep('profile_setup');
        } else {
          setCurrentStep('role_selection');
        }
      } else {
        setCurrentStep('role_selection');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setCurrentStep('role_selection');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setCurrentStep('role_selection');
  };

  const handleRoleSelected = () => {
    setCurrentStep('profile_setup');
  };

  const handleProfileComplete = () => {
    setCurrentStep('completed');
    onComplete();
  };

  if (loading) {
    return <View style={styles.loadingContainer} />;
  }

  if (!auth.currentUser) {
    return <WelcomeScreen onAuthSuccess={handleAuthSuccess} />;
  }

  switch (currentStep) {
    case 'welcome':
      return <WelcomeScreen onAuthSuccess={handleAuthSuccess} />;
    case 'role_selection':
      return <RoleSelectScreen onRoleSelected={handleRoleSelected} />;
    case 'profile_setup':
      return <ProfileSetupScreen onComplete={handleProfileComplete} />;
    case 'completed':
      return null; // Should not reach here as onComplete is called
    default:
      return <WelcomeScreen onAuthSuccess={handleAuthSuccess} />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default OnboardingFlow; 