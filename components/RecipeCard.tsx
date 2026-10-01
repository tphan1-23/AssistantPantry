import { StyleSheet } from 'react-native';

import BreakableHeart from '@/components/BreakableHeart';
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
          <BreakableHeart filled={!!isFavorited} onPress={onToggleFavorite} size={26} />
        )}
      </View>

      <Text style={styles.sectionLabel}>🌿 Uses expiring ingredients</Text>
      <View style={styles.chipRow}>
        {recipe.urgentIngredientsUsed.map((ingredient, index) => (
          <View key={index} style={[styles.chip, styles.chipUrgent]}>
            <Text style={styles.chipTextUrgent}>{ingredient}</Text>
          </View>
        ))}
      </View>

      {recipe.additionalIngredients.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>🧂 Also needed</Text>
          <View style={styles.chipRow}>
            {recipe.additionalIngredients.map((ingredient, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>{ingredient}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionLabel}>👩‍🍳 Instructions</Text>
      <View style={styles.instructions}>
        {recipe.instructions.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF8F2',
    borderWidth: 1,
    borderColor: '#F0DCC8',
    marginBottom: 16,
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: '#5C3A21',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.55,
    marginTop: 12,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#EFE3D4',
  },
  chipText: {
    fontSize: 13,
    color: '#5C3A21',
  },
  chipUrgent: {
    backgroundColor: '#FBD9E3',
  },
  chipTextUrgent: {
    fontSize: 13,
    color: '#9E2A52',
    fontWeight: '600',
  },
  instructions: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8B5E3C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
