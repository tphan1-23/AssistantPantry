import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import type { Recipe } from '@/types/pantry';

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{recipe.title}</Text>

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
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
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
