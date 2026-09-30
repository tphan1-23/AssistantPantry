import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { BRAND_COLOR } from '@/constants/Colors';
import { scanImageForItems } from '@/services/gemini';
import { setPendingScan } from '@/services/scanSession';

type CapturedPhoto = { uri: string; base64: string };

export default function ScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    if (!result?.base64) {
      Alert.alert('Capture failed', 'Could not read image data from the camera.');
      return;
    }
    setPhoto({ uri: result.uri, base64: result.base64 });
  }

  async function handlePickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
      mediaTypes: ['images'],
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  }

  async function handleUsePhoto() {
    if (!photo) return;
    setIsProcessing(true);
    try {
      const items = await scanImageForItems(photo.base64);
      if (items.length === 0) {
        Alert.alert('No items found', 'Gemini could not identify any food items in that image.');
        setPhoto(null);
        return;
      }
      setPendingScan(items);
      router.push('/review-scan');
      setPhoto(null);
    } catch (error) {
      Alert.alert('Scan failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleRetake() {
    setPhoto(null);
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo.uri }} style={styles.camera} resizeMode="cover" />
        <View style={styles.controls}>
          {isProcessing ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              <Pressable style={styles.button} onPress={handleUsePhoto}>
                <Text style={styles.buttonText}>Use This Photo</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleRetake}>
                <Text style={styles.buttonText}>Retake</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
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
        <Pressable style={styles.button} onPress={handleCapture}>
          <Text style={styles.buttonText}>Capture</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handlePickFromGallery}>
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </Pressable>
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
    backgroundColor: BRAND_COLOR,
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
