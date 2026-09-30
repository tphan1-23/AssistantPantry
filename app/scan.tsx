import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { insertScannedItems } from '@/services/database';
import { scanImageForItems } from '@/services/gemini';

export default function ScanScreen() {
  const db = useSQLiteContext();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  async function processImage(base64: string) {
    setIsProcessing(true);
    try {
      const items = await scanImageForItems(base64);
      if (items.length === 0) {
        Alert.alert('No items found', 'Gemini could not identify any food items in that image.');
        return;
      }
      await insertScannedItems(db, items);
      Alert.alert('Added to pantry', `Added ${items.length} item(s).`, [
        { text: 'OK', onPress: () => router.push('/') },
      ]);
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    if (!photo?.base64) {
      Alert.alert('Capture failed', 'Could not read image data from the camera.');
      return;
    }
    await processImage(photo.base64);
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
      mediaTypes: ['images'],
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    await processImage(result.assets[0].base64);
  }

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>We need camera access to scan receipts and fridge items.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handlePickFromGallery}>
          <Text style={styles.buttonText}>Pick from Gallery Instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.controls}>
        {isProcessing ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Pressable style={styles.button} onPress={handleCapture}>
              <Text style={styles.buttonText}>Capture</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handlePickFromGallery}>
              <Text style={styles.buttonText}>Pick from Gallery</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controls: {
    padding: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2f9e44',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
  },
  buttonText: {
    fontWeight: '600',
  },
});
