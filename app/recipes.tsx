import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import RecipeCard from '@/components/RecipeCard';
import { getExpiringItems } from '@/services/database';
import { generateZeroWasteRecipes } from '@/services/gemini';
import type { PantryItem, Recipe } from '@/types/pantry';

export default function RecipesScreen() {
  const db = useSQLiteContext();
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getExpiringItems(db, 72).then(setExpiringItems);
    }, [db])
  );

  async function handleGenerate() {
    if (expiringItems.length === 0) {
      Alert.alert('Nothing expiring soon', 'No items are within 72 hours of their estimated expiry.');
      return;
    }
    setIsLoading(true);
    try {
      const names = expiringItems.map((item) => item.name);
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
    backgroundColor: '#2f9e44',
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
