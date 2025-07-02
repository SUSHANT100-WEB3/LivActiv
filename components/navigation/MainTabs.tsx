import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { doc, getDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../constants/AuthContext';
import { db } from '../../constants/firebase';
import { colors } from '../../constants/theme';
import ActivitiesScreen from '../../screens/ActivitiesScreen';
import HomeScreen from '../../screens/HomeScreen';
import MessagesScreen from '../../screens/MessagesScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import SettingsScreen from '../../screens/SettingsScreen';

export type MainTabsParamList = {
  Home: undefined;
  Activities: undefined;
  Chat: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  const { user } = useContext(AuthContext);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchRole = async () => {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role);
        }
      };
      fetchRole();
    }
  }, [user]);

  const getTabLabel = (routeName: string) => {
    if (routeName === 'Activities') {
      if (userRole === 'Trainer') return 'My Sessions';
      if (userRole === 'Both') return 'My Activities';
      return 'My Activities'; // Default for Player
    }
    return routeName;
  };

  const getTabIcon = (routeName: string, focused: boolean, color: string, size: number) => {
    let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
    
    if (routeName === 'Home') {
      iconName = 'map-outline';
    } else if (routeName === 'Activities') {
      if (userRole === 'Trainer') {
        iconName = 'calendar-outline';
      } else {
        iconName = 'list-outline';
      }
    } else if (routeName === 'Chat') {
      iconName = 'chatbubble-ellipses-outline';
    } else if (routeName === 'Profile') {
      iconName = 'person-outline';
    } else if (routeName === 'Settings') {
      iconName = 'settings-outline';
    }
    
    return <Ionicons name={iconName} size={24} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 64,
          paddingBottom: 6,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => getTabIcon(route.name, focused, color, size),
        tabBarLabel: getTabLabel(route.name),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} />
      <Tab.Screen name="Chat" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
} 