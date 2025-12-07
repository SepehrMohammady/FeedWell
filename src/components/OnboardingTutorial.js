import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: 1,
    icon: 'newspaper-outline',
    title: 'Welcome to FeedWell',
    description: 'Your ad-free RSS reader for a clean, distraction-free reading experience across Android, iOS, and Windows.',
    color: '#A17F66',
    showLogo: true,
  },
  {
    id: 2,
    icon: 'shield-checkmark-outline',
    title: 'Ad-Free Reading',
    description: 'Enjoy articles without ads, tracking scripts, or promotional content. We automatically clean and block unwanted elements.',
    color: '#A2A9A3',
  },
  {
    id: 3,
    icon: 'add-circle-outline',
    title: 'Add Your Feeds',
    description: 'Add RSS or Atom feeds from your favorite websites. Manage all your sources in one place.',
    color: '#5F758E',
  },
  {
    id: 4,
    icon: 'filter-outline',
    title: 'Simple Filtering',
    description: 'Filter articles by All, Unread, or Read. Sort by newest or oldest. Find what you need quickly.',
    color: '#CB936A',
  },
  {
    id: 5,
    icon: 'bookmark-outline',
    title: 'Reading Position',
    description: 'Set a bookmark line to mark your reading position. It adjusts based on your filter and actions.',
    color: '#CD9C8B',
  },
  {
    id: 6,
    icon: 'save-outline',
    title: 'Save for Later',
    description: 'Bookmark articles to read offline. Access them anytime from the Saved tab, even without internet.',
    color: '#758793',
  },
  {
    id: 7,
    icon: 'checkmark-circle-outline',
    title: 'You\'re All Set!',
    description: 'Start by adding your first RSS feed and enjoy a better reading experience. Happy reading!',
    color: '#A2A9A3',
  },
];

export default function OnboardingTutorial({ visible, onComplete }) {
  const { theme, isDarkMode } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef(null);
  const onViewableItemsChangedRef = useRef(null);
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50,
  });

  // Initialize the callback once
  if (!onViewableItemsChangedRef.current) {
    onViewableItemsChangedRef.current = ({ viewableItems }) => {
      if (viewableItems.length > 0) {
        setCurrentSlide(viewableItems[0].index);
      }
    };
  }

  if (!visible) return null;

  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      flatListRef.current?.scrollToIndex({ index: nextSlide, animated: true });
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      setCurrentSlide(prevSlide);
      flatListRef.current?.scrollToIndex({ index: prevSlide, animated: true });
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slideContainer, { width }]}>
      <View style={styles.content}>
        {/* Logo (only on first slide, bigger size, no icon) */}
        {item.showLogo && (
          <Image 
            source={isDarkMode ? require('../../assets/logo-invert.png') : require('../../assets/logo.png')} 
            style={styles.logoLarge}
            resizeMode="contain"
          />
        )}

        {/* Icon (not shown on first slide) */}
        {!item.showLogo && (
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={80} color={item.color} />
          </View>
        )}

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.title}
        </Text>

        {/* Description */}
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Skip Button */}
        {!isLastSlide && (
          <TouchableOpacity 
            style={[
              styles.skipButton,
              { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}
            onPress={handleSkip}
            activeOpacity={0.6}
            delayPressIn={0}
            delayPressOut={0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        )}

        {/* Swipeable Content */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          viewabilityConfig={viewabilityConfigRef.current}
          bounces={false}
          scrollEnabled={true}
        />

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentSlide 
                    ? theme.colors.primary 
                    : theme.colors.border,
                  width: index === currentSlide ? 24 : 8,
                }
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {/* Previous Button */}
          {currentSlide > 0 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.previousButton, { borderColor: theme.colors.border }]}
              onPress={handlePrevious}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={0}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}

          {/* Next/Get Started Button */}
          <TouchableOpacity 
            style={[
              styles.navButton, 
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              currentSlide === 0 && styles.nextButtonFullWidth
            ]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? 'Get Started' : 'Next'}
            </Text>
            {!isLastSlide && (
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 70,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 120,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  logoLarge: {
    width: 180,
    height: 180,
    marginBottom: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  pagination: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  navigation: {
    position: 'absolute',
    bottom: 32,
    left: 32,
    right: 32,
    flexDirection: 'row',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  previousButton: {
    borderWidth: 2,
    flex: 0,
    width: 56,
    height: 56,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  nextButton: {
    flex: 1,
  },
  nextButtonFullWidth: {
    flex: 1,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
