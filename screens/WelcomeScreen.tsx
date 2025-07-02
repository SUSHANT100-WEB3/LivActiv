import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../constants/firebase';
import { colors } from '../constants/theme';

interface WelcomeScreenProps {
  onAuthSuccess?: () => void;
  navigation?: any;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAuthSuccess, navigation }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string>('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          setLocation(
            [address.city, address.region].filter(Boolean).join(', ') || 'Your Location'
          );
        }
      }
    } catch (error) {
      setLocation('Your Location');
    }
  };

  const checkProfileAndNavigate = async (user: any) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profileComplete = data.profileComplete || false;
        
        if (profileComplete) {
          if (navigation) {
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
          } else if (onAuthSuccess) {
            onAuthSuccess();
          }
        } else if (data.role) {
          if (navigation) {
            navigation.navigate('ProfileSetup');
          } else if (onAuthSuccess) {
            onAuthSuccess();
          }
        } else {
          if (navigation) {
            navigation.navigate('RoleSelect');
          } else if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      } else {
        if (navigation) {
          navigation.navigate('RoleSelect');
        } else if (onAuthSuccess) {
          onAuthSuccess();
        }
      }
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (isSignUp && password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }
      if (isSignUp && userCredential.user) {
        const userData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || 'User',
          provider: 'email',
          createdAt: new Date(),
        };
        await setDoc(doc(db, 'users', userData.uid), {
          ...userData,
          role: null,
          profileComplete: false,
          onboardingStep: 'role_selection',
        });
      }
      await checkProfileAndNavigate(userCredential.user);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      // For demo: simulate phone verification
      const mockVerificationId = 'mock_verification_id_' + Date.now();
      setVerificationId(mockVerificationId);
      setShowPhoneAuth(true);
      Alert.alert(
        'Verification Code Sent',
        'For demo purposes, use any 6-digit code. In production, you would receive an SMS.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    try {
      // For demo: accept any 6-digit code
      const userData = {
        uid: `phone_${Date.now()}`,
        email: `${phone}@phone.example.com`,
        displayName: 'Phone User',
        phone: phone,
        provider: 'phone',
        createdAt: new Date(),
      };
      await setDoc(doc(db, 'users', userData.uid), {
        ...userData,
        role: null,
        profileComplete: false,
        onboardingStep: 'role_selection',
      });
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to <Text style={styles.titleAccent}>LivActiv</Text></Text>
          <Text style={styles.subtitle}>
            Connect with sports enthusiasts and trainers in your area
          </Text>
        </View>
        
        {/* Auth Form */}
        <View style={styles.formBox}>
          {!showPhoneAuth ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#bbb"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor="#bbb"
              />
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholderTextColor="#bbb"
                />
              )}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleEmailAuth}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? (isSignUp ? 'Signing Up...' : 'Signing In...') : (isSignUp ? 'Sign Up' : 'Sign In')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.phoneButton]}
                onPress={handlePhoneAuth}
                disabled={loading}
              >
                <Ionicons name="call" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.phoneButtonText}>Continue with Phone</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.toggleText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.phoneVerificationContainer}>
              <Text style={styles.verificationTitle}>Enter verification code</Text>
              <Text style={styles.verificationSubtitle}>
                We sent a code to {phone}
              </Text>
              <TextInput
                style={styles.verificationInput}
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                placeholderTextColor="#bbb"
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify Code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowPhoneAuth(false)}
              >
                <Text style={styles.toggleText}>Change phone number</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleAccent: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EAF2FF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 18,
  },
  locationText: {
    color: '#1877F2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  orText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  phoneButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  phoneButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 4,
  },
  toggleText: {
    color: colors.primary,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  phoneVerificationContainer: {
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  verificationSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  verificationInput: {
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    marginBottom: 16,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  termsText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen; 