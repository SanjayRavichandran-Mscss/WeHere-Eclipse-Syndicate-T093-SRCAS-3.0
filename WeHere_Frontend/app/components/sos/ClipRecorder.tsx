import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = ' http://192.168.137.1:5000/api/sos'; // same host as auth API, different route

interface ClipRecorderProps {
  visible: boolean;
  onClose: () => void;
  onUploaded: () => void; // called after a successful upload so parent can refresh the feed
}

export default function ClipRecorder({ visible, onClose, onUploaded }: ClipRecorderProps) {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const ensurePermissions = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission();
      if (!res.granted) return false;
    }
    if (!micPermission?.granted) {
      const res = await requestMicPermission();
      if (!res.granted) return false;
    }
    return true;
  };

  const handleRecord = async () => {
    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert('Permissions required', 'Camera and microphone access are needed to record an SOS clip.');
      return;
    }

    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }

    try {
      setIsRecording(true);
      // Records until stopRecording() is called, or maxDuration is hit
      const video = await cameraRef.current?.recordAsync({ maxDuration: 30 });
      setIsRecording(false);

      if (video?.uri) {
        await uploadClip(video.uri);
      }
    } catch (err: any) {
      setIsRecording(false);
      console.error('Recording error:', err); // check Metro/logcat for the full stack
      Alert.alert('Recording failed', err?.message || 'Could not record the clip. Please try again.');
    }
  };

  const uploadClip = async (videoUri: string) => {
    setIsUploading(true);
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {
        // location is optional - upload continues without it
      }

      const formData = new FormData();
      formData.append('file', {
        uri: videoUri,
        name: `sos_${Date.now()}.mp4`,
        type: 'video/mp4',
      } as any);
      formData.append('userId', String(user?.id ?? ''));
      formData.append('username', user?.username ?? 'Anonymous');
      if (latitude !== null) formData.append('latitude', String(latitude));
      if (longitude !== null) formData.append('longitude', String(longitude));

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();
      setIsUploading(false);

   if (data.success) {
        Alert.alert('Uploaded', 'Your SOS clip is now live on IPFS and visible to others.');
        onUploaded();
        onClose();
      } else {
        console.error('Upload failed response:', data);
        Alert.alert('Upload failed', data.error || data.message || 'Please try again.');
      }
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload failed', err.message || 'Network error while uploading clip.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" mode="video" mute={false} />

        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={isUploading}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.bottomBar}>
            {isUploading ? (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.uploadingText}>Uploading to IPFS...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={handleRecord}
              >
                <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
              </TouchableOpacity>
            )}
            <Text style={styles.hint}>
              {isRecording ? 'Recording... tap to stop' : 'Tap to record an SOS clip (max 30s)'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  closeButton: {
    alignSelf: 'flex-end',
    margin: 20,
    marginTop: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 18 },
  bottomBar: { alignItems: 'center', marginBottom: 40 },
  recordButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: { borderColor: '#dc2626' },
  recordInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dc2626' },
  recordInnerActive: { width: 28, height: 28, borderRadius: 6 },
  hint: { color: '#fff', marginTop: 12, fontSize: 14 },
  uploadingBox: { alignItems: 'center' },
  uploadingText: { color: '#fff', marginTop: 8, fontSize: 14 },
});