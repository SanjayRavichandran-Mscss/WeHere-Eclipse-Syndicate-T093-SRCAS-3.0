import React, { useState } from 'react';
import {
  View,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SwipeAction from './SwipeAction';
import ClipRecorder from './ClipRecorder';

interface RecordingSwipeActionProps {
  userId?: number;
}

export default function RecordingSwipeAction({ userId }: RecordingSwipeActionProps) {
  const [cameraVisible, setCameraVisible] = useState(false);

  const handleRecordingSwipe = () => {
    setCameraVisible(true);
  };

  const handleRecorderClose = () => {
    setCameraVisible(false);
  };

  const handleRecorderUploaded = () => {
    setCameraVisible(false);
    console.log('[Recording] Clip uploaded');
  };

  return (
    <>
      {/* Swipe to record */}
      <SwipeAction
        icon={
          <MaterialIcons
            name="emergency-recording"
            size={28}
            color="#DC2626"
          />
        }
        onSwipe={handleRecordingSwipe}
      />

      {/* Clip Recorder Modal */}
      <ClipRecorder
        visible={cameraVisible}
        onClose={handleRecorderClose}
        onUploaded={handleRecorderUploaded}
      />
    </>
  );
}
