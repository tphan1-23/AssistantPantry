import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import FavoriteBubbles from '@/components/FavoriteBubbles';
import RecipeCard from '@/components/RecipeCard';
import { Text, View } from '@/components/Themed';
import { BRAND_COLOR } from '@/constants/Colors';
import {
  addFavoriteRecipe,
  getAllItems,
  getExpiringItems,
  getFavoriteRecipes,
  removeFavoriteRecipe,
} from '@/services/database';
import { generateZeroWasteRecipes } from '@/services/gemini';
import type { FavoriteRecipe, PantryItem, Recipe } from '@/types/pantry';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // The exact pantry item ids the current `recipes` were generated from.
  // Checking against these (rather than re-parsing Gemini's own possibly
  // reworded ingredient text) is what lets us tell precisely whether one of
  // them was actually removed, without false positives from paraphrasing.
  // A ref because it's pure bookkeeping for the focus-effect check below,
  // not something the UI renders.
  const recipeBasisIdsRef = useRef<number[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      Promise.all([getAllItems(db), getExpiringItems(db, 72), getFavoriteRecipes(db)]).then(
        ([allItems, expiring, favoriteRecipes]) => {
          if (cancelled) return;
          setExpiringItems(expiring);
          setFavorites(favoriteRecipes);

          setRecipes((prevRecipes) => {
            if (prevRecipes.length === 0) return prevRecipes;

            const allIds = new Set(allItems.map((item) => item.id));
            const stillValid =
              allItems.length > 0 &&
              expiring.length > 0 &&
              recipeBasisIdsRef.current.every((id) => allIds.has(id));

            if (!stillValid) {
              recipeBasisIdsRef.current = [];
              return [];
            }
            return prevRecipes;
          });
        }
      );

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
      recipeBasisIdsRef.current = freshExpiring.map((item) => item.id);
    } catch (error) {
      Alert.alert('Could not generate recipes', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleFavorite(recipe: Recipe) {
    const existing = favorites.find((f) => f.title === recipe.title);
    if (existing) {
      await removeFavoriteRecipe(db, existing.id);
    } else {
      await addFavoriteRecipe(db, recipe);
    }
    setFavorites(await getFavoriteRecipes(db));
  }

  async function handleUnfavorite(id: number) {
    await removeFavoriteRecipe(db, id);
    setFavorites(await getFavoriteRecipes(db));
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
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            isFavorited={favorites.some((f) => f.title === item.title)}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        )}
      />

      <FavoriteBubbles favorites={favorites} onUnfavorite={handleUnfavorite} />
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
