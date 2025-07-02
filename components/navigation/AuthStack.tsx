import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import ProfileSetupScreen from '../../screens/ProfileSetupScreen';
import RoleSelectScreen from '../../screens/RoleSelectScreen';
import WelcomeScreen from '../../screens/WelcomeScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelect: undefined;
  ProfileSetup: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
} 