import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import PantryItemCard from '@/components/PantryItemCard';
import { deletePantryItem, getAllItems, markConsumed } from '@/services/database';
import type { PantryItem } from '@/types/pantry';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<PantryItem[]>([]);

  const refresh = useCallback(() => {
    getAllItems(db).then(setItems);
  }, [db]);

  useFocusEffect(refresh);

  async function handleConsume(id: number) {
    await markConsumed(db, id);
    refresh();
  }

  async function handleDelete(id: number) {
    await deletePantryItem(db, id);
    refresh();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Your pantry is empty. Tap Scan to add items from a receipt or fridge photo.
          </Text>
        }
        renderItem={({ item }) => (
          <PantryItemCard item={item} onConsume={handleConsume} onDelete={handleDelete} />
        )}
      />
      <Pressable style={styles.scanButton} onPress={() => router.push('/scan')}>
        <Text style={styles.scanButtonText}>+ Scan</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 40,
  },
  scanButton: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#2f9e44',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: '700',
  },
});
