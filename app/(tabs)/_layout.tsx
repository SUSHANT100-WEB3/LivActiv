import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../constants/AuthContext';
import { db } from '../../constants/firebase';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user } = useContext(AuthContext);

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
    if (routeName === 'activities') {
      if (userRole === 'trainer') return 'My Sessions';
      if (userRole === 'both') return 'My Activities';
      return 'My Activities'; // Default for player
    }
    return routeName.charAt(0).toUpperCase() + routeName.slice(1);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
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
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: getTabLabel('activities'),
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
