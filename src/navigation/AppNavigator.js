import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

import FeedListScreen from '../screens/FeedListScreen';
import ArticleActionsScreen from '../screens/ArticleActionsScreen';
import ArticleReaderScreen from '../screens/ArticleReaderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddFeedScreen from '../screens/AddFeedScreen';
import ReadLaterScreen from '../screens/ReadLaterScreen';
import HomeScreen from '../screens/HomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ReadLaterStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="ReadLaterList" 
        component={ReadLaterScreen} 
      />
      <Stack.Screen 
        name="ArticleReader" 
        component={ArticleReaderScreen} 
      />
    </Stack.Navigator>
  );
}

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
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Feeds') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'ReadLater') {
            iconName = focused ? 'save' : 'save-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feeds" component={FeedStack} />
      <Tab.Screen 
        name="ReadLater" 
        component={ReadLaterStack} 
        options={{ title: 'Saved' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
