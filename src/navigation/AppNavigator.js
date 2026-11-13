import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../context/LanguageContext';
import { FONT } from '../theme/type';
import MiniPlayer from '../components/MiniPlayer';

import FeedListScreen from '../screens/FeedListScreen';
import ArticleActionsScreen from '../screens/ArticleActionsScreen';
import ArticleReaderScreen from '../screens/ArticleReaderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddFeedScreen from '../screens/AddFeedScreen';
import ReadLaterScreen from '../screens/ReadLaterScreen';
import HomeScreen from '../screens/HomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_BAR_HEIGHT = 62;

// Stack screens are transparent over the wash; the article reader paints its
// own plain page, which long reading is calmer on.
const STACK_OPTIONS = { headerShown: false, cardStyle: { backgroundColor: 'transparent' } };

function ReadLaterStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
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
    <Stack.Navigator screenOptions={STACK_OPTIONS}>
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

// A tab's label: Medium, SemiBold when selected, on one line; a long word
// shrinks a little to fit rather than lose its end.
const tabLabel = (label) => ({ focused, color }) => (
  <Text
    style={[styles.tabLabel, { fontFamily: focused ? FONT.semiBold : FONT.medium, color }]}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.8}
  >
    {label}
  </Text>
);

const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Feeds: ['newspaper', 'newspaper-outline'],
  ReadLater: ['save', 'save-outline'],
  Settings: ['settings', 'settings-outline'],
};

export default function AppNavigator() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View>
          <MiniPlayer />
          {/* On React Navigation 7 the selected tab's frame keeps its old
              color after a theme change until the bar is drawn again: a new
              bar per theme draws it afresh. */}
          <BottomTabBar key={colors.mainTint} {...props} />
        </View>
      )}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        // The screens are transparent over the wash.
        sceneStyle: styles.transparent,
        // Docked at the bottom: the surface at 88% over the wash, a hairline
        // on top.
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 0,
          elevation: 0,
        },
        // The selected tab is framed whole: icon and label in one rounded
        // frame of the main tint, in main ink.
        tabBarActiveBackgroundColor: colors.tabBarActiveBackground,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: colors.tabBarActiveTint,
        tabBarInactiveTintColor: colors.tabBarInactiveTint,
        // Labels under the icons on wide screens too (tablets and foldables).
        tabBarLabelPosition: 'below-icon',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tab.home'), tabBarLabel: tabLabel(t('tab.home')) }} />
      <Tab.Screen name="Feeds" component={FeedStack} options={{ title: t('tab.feeds'), tabBarLabel: tabLabel(t('tab.feeds')) }} />
      <Tab.Screen
        name="ReadLater"
        component={ReadLaterStack}
        options={{ title: t('tab.saved'), tabBarLabel: tabLabel(t('tab.saved')) }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: t('tab.settings'), tabBarLabel: tabLabel(t('tab.settings')) }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  transparent: {
    backgroundColor: 'transparent',
  },
  // On bottom-tabs 7 the item style sits on an outer view and the active
  // background on an inner pressable with square corners and 5 dp of padding
  // of its own: clip it to the frame's radius and add no padding.
  tabItem: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 6,
    marginTop: 6,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});
