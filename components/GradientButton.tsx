import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const GRADIENT = ['#C9986B', '#8B5E3C'] as const;

// The shared look for every primary brown action button in the app (same
// gradient pill as the Recipes tab's "Generate" button).
export default function GradientButton({ title, onPress, disabled, loading }: Props) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}>
      <LinearGradient
        colors={GRADIENT}
        style={[styles.button, (disabled || loading) && styles.disabled]}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 13,
    borderRadius: 26,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: 'white',
    fontWeight: '700',
  },
});
