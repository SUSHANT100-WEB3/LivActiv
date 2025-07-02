import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { PixelRatio, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const ComingSoonScreen = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  // Responsive scaling helpers
  const guidelineBaseWidth = 375;
  const scaleSize = (size: number) => width / guidelineBaseWidth * size;
  const scaleFont = (size: number) => size * PixelRatio.getFontScale() * (width / guidelineBaseWidth);
  const styles = getStyles({ scaleSize, scaleFont });

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coming Soon!</Text>
      <Text style={styles.text}>This feature is under development.</Text>
      <TouchableOpacity style={styles.button} onPress={handleBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
};

// Responsive styles factory
const getStyles = ({ scaleSize, scaleFont }: { scaleSize: (n: number) => number, scaleFont: (n: number) => number }) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FA' },
  title: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1877F2', marginBottom: scaleSize(16) },
  text: { fontSize: scaleFont(18), color: '#222', marginBottom: scaleSize(32) },
  button: { backgroundColor: '#1877F2', padding: scaleSize(14), borderRadius: scaleSize(8), alignItems: 'center', width: scaleSize(120) },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(16), textAlign: 'center' },
});

export default ComingSoonScreen; 