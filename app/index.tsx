import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { registerTranslation } from 'react-native-paper-dates';
import MainStack from '../components/navigation/MainStack';
import OnboardingFlow from '../components/OnboardingFlow';
import { auth, db } from '../constants/firebase';
import { colors } from '../constants/theme';

registerTranslation('en', {
  save: 'Save',
  selectSingle: 'Select date',
  selectMultiple: 'Select dates',
  selectRange: 'Select period',
  notAccordingToDateFormat: (inputFormat) => `Date format must be ${inputFormat}`,
  mustBeHigherThan: (date) => `Must be later than ${date}`,
  mustBeLowerThan: (date) => `Must be earlier than ${date}`,
  mustBeBetween: (startDate, endDate) => `Must be between ${startDate} - ${endDate}`,
  dateIsDisabled: 'Day is not allowed',
  previous: 'Previous',
  next: 'Next',
  typeInDate: 'Type in date',
  pickDateFromCalendar: 'Pick date from calendar',
  close: 'Close',
});

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check Firestore for profileComplete
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().profileComplete) {
            setOnboardingComplete(true);
          } else {
            setOnboardingComplete(false);
          }
        } catch (e) {
          setOnboardingComplete(false);
        }
      } else {
        setOnboardingComplete(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  if (loading) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <Text style={{ fontSize: 18, color: colors.text }}>Loading...</Text>
        </View>
      </PaperProvider>
    );
  }

  // If user is authenticated and onboarding is complete, render MainStack
  if (user && onboardingComplete) {
    return (
      <PaperProvider>
        <MainStack />
      </PaperProvider>
    );
  }

  // If user is not authenticated or onboarding is not complete, show onboarding
  return (
    <PaperProvider>
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    </PaperProvider>
  );
} 