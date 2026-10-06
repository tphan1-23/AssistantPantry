import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { BRAND_COLOR } from '@/constants/Colors';

type Props = {
  avatarUrl?: string | null;
  /** Used for the fallback initial when there's no photo. */
  label: string;
  size: number;
};

// A photo if one's been set, otherwise a plain initial-letter circle - no
// icon library in this app, so a placeholder is just styled text, not an
// image asset.
export default function Avatar({ avatarUrl, label, size }: Props) {
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  const dimStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={[styles.image, dimStyle]} />;
  }
  return (
    <View style={[styles.placeholder, dimStyle]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#EFE3D4',
  },
  placeholder: {
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: 'white',
    fontWeight: '800',
  },
});
