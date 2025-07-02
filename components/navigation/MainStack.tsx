import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import AttendeeListModal from '../../screens/AttendeeListModal';
import BookingStatusScreen from '../../screens/BookingStatusScreen';
import ChatRoomScreen from '../../screens/ChatRoomScreen';
import ComingSoonScreen from '../../screens/ComingSoonScreen';
import EventDetailScreen from '../../screens/EventDetailScreen';
import FilterModal from '../../screens/FilterModal';
import ProfileEditScreen from '../../screens/ProfileEditScreen';
import StripePaymentModal from '../../screens/StripePaymentModal';
import MainTabs from './MainTabs';

export type RootStackParamList = {
  MainTabs: undefined;
  EventDetail: { eventId: string };
  ProfileEdit: undefined;
  BookingStatus: { bookingId: string };
  ComingSoon: undefined;
  ChatRoom: { event: any };
  FilterModal: undefined;
  AttendeeListModal: { event: any };
  StripePaymentModal: { event: any; bookingId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="BookingStatus" component={BookingStatusScreen} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="FilterModal" component={FilterModal} />
      <Stack.Screen name="AttendeeListModal" component={AttendeeListModal} />
      <Stack.Screen name="StripePaymentModal" component={StripePaymentModal} />
    </Stack.Navigator>
  );
} 