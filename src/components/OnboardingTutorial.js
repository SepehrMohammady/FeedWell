import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
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
    title: 'Smart Filtering',
    description: 'Filter articles by All, Unread, or Read. Sort by newest or oldest. Find what you need quickly.',
    color: '#CB936A',
  },
  {
    id: 5,
    icon: 'bookmark-outline',
    title: 'Reading Position',
    description: 'Set a bookmark line to mark your reading position. It smartly adjusts based on your filter and actions.',
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
    icon: 'reader-outline',
    title: 'Clean Reader Mode',
    description: 'Read articles in a beautiful, distraction-free reader mode with support for RTL languages and dark mode.',
    color: '#A17F66',
  },
  {
    id: 8,
    icon: 'checkmark-circle-outline',
    title: 'You\'re All Set!',
    description: 'Start by adding your first RSS feed and enjoy a better reading experience. Happy reading!',
    color: '#A2A9A3',
  },
];

export default function OnboardingTutorial({ visible, onComplete }) {
  const { theme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!visible) return null;

  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[currentSlide];

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Skip Button */}
        {!isLastSlide && (
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
            <Ionicons name={slide.icon} size={80} color={slide.color} />
          </View>

          {/* Logo for first slide */}
          {currentSlide === 0 && (
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          )}

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {slide.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {slide.description}
          </Text>

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
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {/* Previous Button */}
          {currentSlide > 0 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.previousButton, { borderColor: theme.colors.border }]}
              onPress={handlePrevious}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
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
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 120,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
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
