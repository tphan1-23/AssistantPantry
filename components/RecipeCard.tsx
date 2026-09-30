import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { Recipe } from '@/types/pantry';

type Props = {
  recipe: Recipe;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
};

export default function RecipeCard({ recipe, isFavorited, onToggleFavorite }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{recipe.title}</Text>
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} hitSlop={10} style={styles.heartButton}>
            <Text style={[styles.heart, isFavorited && styles.heartActive]}>
              {isFavorited ? '♥' : '♡'}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionLabel}>Uses expiring ingredients</Text>
      <Text style={styles.ingredients}>{recipe.urgentIngredientsUsed.join(', ')}</Text>

      {recipe.additionalIngredients.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Also needed</Text>
          <Text style={styles.ingredients}>{recipe.additionalIngredients.join(', ')}</Text>
        </>
      )}

      <Text style={styles.sectionLabel}>Instructions</Text>
      {recipe.instructions.map((step, index) => (
        <Text key={index} style={styles.step}>
          {index + 1}. {step}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  heartButton: {
    paddingLeft: 10,
  },
  heart: {
    fontSize: 24,
    opacity: 0.5,
  },
  heartActive: {
    opacity: 1,
    color: '#d6336c',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 8,
  },
  ingredients: {
    fontSize: 14,
    marginTop: 2,
  },
  step: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
});
