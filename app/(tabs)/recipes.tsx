import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, StyleSheet } from "react-native";

import FavoritesPanel from "@/components/FavoritesPanel";
import GradientButton from "@/components/GradientButton";
import RecipeCard from "@/components/RecipeCard";
import { Text, View } from "@/components/Themed";
import {
  addFavoriteRecipe,
  getAllItems,
  getExpiringItems,
  getFavoriteRecipes,
  removeFavoriteRecipe,
} from "@/services/database";
import { generateZeroWasteRecipes } from "@/services/gemini";
import type { FavoriteRecipe, PantryItem, Recipe } from "@/types/pantry";
import { alert } from "@/utils/alert";

export default function RecipesScreen() {
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

      Promise.all([
        getAllItems(),
        getExpiringItems(72),
        getFavoriteRecipes(),
      ]).then(([allItems, expiring, favoriteRecipes]) => {
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
      });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleGenerate() {
    // Re-read the pantry right before calling Gemini so generation always
    // reflects the current state, not a possibly-stale focus-effect snapshot.
    const freshExpiring = await getExpiringItems(72);
    setExpiringItems(freshExpiring);

    if (freshExpiring.length === 0) {
      alert(
        "Nothing expiring soon",
        "No items are within 72 hours of their estimated expiry.",
      );
      return;
    }
    setIsLoading(true);
    try {
      const ingredients = freshExpiring.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      }));
      const result = await generateZeroWasteRecipes(ingredients);
      setRecipes(result);
      recipeBasisIdsRef.current = freshExpiring.map((item) => item.id);
    } catch (error) {
      alert(
        "Could not generate recipes",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleFavorite(recipe: Recipe) {
    const existing = favorites.find((f) => f.title === recipe.title);
    if (existing) {
      await removeFavoriteRecipe(existing.id);
    } else {
      await addFavoriteRecipe(recipe);
    }
    setFavorites(await getFavoriteRecipes());
  }

  async function handleUnfavorite(id: number) {
    await removeFavoriteRecipe(id);
    setFavorites(await getFavoriteRecipes());
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Zero-Waste Recipes</Text>

        {expiringItems.length === 0 ? (
          <Text style={styles.subtitle}>
            No items expiring within 72 hours.
          </Text>
        ) : (
          <View style={styles.expiringChipRow}>
            {expiringItems.map((item) => (
              <View key={item.id} style={styles.expiringChip}>
                <Text style={styles.expiringChipText}>{item.name}</Text>
              </View>
            ))}
          </View>
        )}

        <GradientButton
          title="Generate Zero-Waste Recipes"
          onPress={handleGenerate}
          loading={isLoading}
        />
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(recipe) => recipe.title}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>
              No recipes generated yet. Tap the button above to cook something
              up!
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            isFavorited={favorites.some((f) => f.title === item.title)}
            onToggleFavorite={() => handleToggleFavorite(item)}
          />
        )}
      />

      <FavoritesPanel favorites={favorites} onUnfavorite={handleUnfavorite} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 12,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  expiringChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  expiringChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "#FBD9E3",
  },
  expiringChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9E2A52",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  empty: {
    textAlign: "center",
    opacity: 0.6,
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
