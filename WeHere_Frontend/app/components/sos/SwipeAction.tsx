import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SwipeActionProps {
  icon: React.ReactNode;
  onSwipe: () => void;
}

const SWIPE_THRESHOLD = 0.7; // 70% of track width
const THUMB_WIDTH = 48;
const THUMB_MARGIN = 4;
const MAX_THUMB_POSITION = THUMB_WIDTH + THUMB_MARGIN * 2; // 56

export default function SwipeAction({ icon, onSwipe }: SwipeActionProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isActive, setIsActive] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal gestures, ignore small touches
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Capture if there's significant horizontal movement
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
      },
      onPanResponderGrant: () => {
        setIsActive(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (trackWidth <= 0) return;

        // Calculate maximum allowed movement (track width minus thumb width)
        const maxTranslate = trackWidth - MAX_THUMB_POSITION;
        
        // Constrain thumb position between 0 and maxTranslate
        const newX = Math.max(0, Math.min(gestureState.dx, maxTranslate));
        
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (trackWidth <= 0) {
          resetThumb();
          setIsActive(false);
          return;
        }

        const maxTranslate = trackWidth - MAX_THUMB_POSITION;
        const progress = gestureState.dx / maxTranslate;

        if (progress >= SWIPE_THRESHOLD) {
          // Threshold reached - animate to end and trigger action
          triggerAction();
        } else {
          // Not enough - spring back
          resetThumb();
        }
        
        setIsActive(false);
      },
      onPanResponderTerminate: () => {
        resetThumb();
        setIsActive(false);
      },
    })
  ).current;

  const resetThumb = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();
  }, [translateX]);

  const triggerAction = useCallback(() => {
    if (trackWidth <= 0) return;

    const maxTranslate = trackWidth - MAX_THUMB_POSITION;

    Animated.timing(translateX, {
      toValue: maxTranslate,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Call the swipe handler
      onSwipe();
      
      // Reset after delay
      setTimeout(() => {
        resetThumb();
      }, 600);
    });
  }, [trackWidth, translateX, onSwipe, resetThumb]);

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <View 
        style={styles.swipeTrack}
        onLayout={handleLayout}
      >
        {/* Arrow indicator - only show if not swiping */}
        {!isActive && (
          <View style={styles.arrowIndicator}>
            <MaterialIcons name="arrow-forward" size={20} color="#CBD5E1" />
          </View>
        )}

        {/* Draggable thumb */}
        <Animated.View
          style={[
            styles.swipeThumb,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.thumbIcon}>
            {icon}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  swipeTrack: {
    height: 56,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'center',
    position: 'relative',
  },

  swipeThumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  thumbIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  arrowIndicator: {
    position: 'absolute',
    right: 16,
    opacity: 0.5,
  },
});
