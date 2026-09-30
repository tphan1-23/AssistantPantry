import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import RecipeCard from '@/components/RecipeCard';
import { BRAND_COLOR } from '@/constants/Colors';
import { findMatchingItem, getAllItems, getExpiringItems } from '@/services/database';
import { generateZeroWasteRecipes } from '@/services/gemini';
import type { PantryItem, Recipe } from '@/types/pantry';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      Promise.all([getAllItems(db), getExpiringItems(db, 72)]).then(([allItems, expiring]) => {
        if (cancelled) return;
        setExpiringItems(expiring);

        // Drop any displayed recipes that no longer reflect the current
        // pantry: nothing left at all, nothing urgent left, or one of the
        // ingredients a recipe actually used has since been removed.
        setRecipes((prevRecipes) => {
          if (prevRecipes.length === 0) return prevRecipes;
          if (allItems.length === 0 || expiring.length === 0) return [];

          const stillValid = prevRecipes.every((recipe) =>
            recipe.urgentIngredientsUsed.every(
              (ingredient) => findMatchingItem(allItems, ingredient) !== null
            )
          );
          return stillValid ? prevRecipes : [];
        });
      });

      return () => {
        cancelled = true;
      };
    }, [db])
  );

  async function handleGenerate() {
    // Re-read the pantry right before calling Gemini so generation always
    // reflects the current state, not a possibly-stale focus-effect snapshot.
    const freshExpiring = await getExpiringItems(db, 72);
    setExpiringItems(freshExpiring);

    if (freshExpiring.length === 0) {
      Alert.alert('Nothing expiring soon', 'No items are within 72 hours of their estimated expiry.');
      return;
    }
    setIsLoading(true);
    try {
      const names = freshExpiring.map((item) => item.name);
      const result = await generateZeroWasteRecipes(names);
      setRecipes(result);
    } catch (error) {
      Alert.alert('Could not generate recipes', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {expiringItems.length === 0
            ? 'No items expiring within 72 hours.'
            : `Expiring soon: ${expiringItems.map((item) => item.name).join(', ')}`}
        </Text>
        <Pressable style={styles.button} onPress={handleGenerate} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Generate Zero-Waste Recipes</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.title}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No recipes generated yet.</Text> : null
        }
        renderItem={({ item }) => <RecipeCard recipe={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 10,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  button: {
    backgroundColor: BRAND_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 24,
  },
});
