import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import FeedListScreen from '../screens/FeedListScreen';
import ArticleActionsScreen from '../screens/ArticleActionsScreen';
import ArticleReaderScreen from '../screens/ArticleReaderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddFeedScreen from '../screens/AddFeedScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="FeedList" 
        component={FeedListScreen} 
      />
      <Stack.Screen 
        name="ArticleActions" 
        component={ArticleActionsScreen} 
      />
      <Stack.Screen 
        name="ArticleReader" 
        component={ArticleReaderScreen} 
      />
      <Stack.Screen 
        name="AddFeed" 
        component={AddFeedScreen} 
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Feeds') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feeds" component={FeedStack} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
