import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import PantryItemCard from '@/components/PantryItemCard';
import { BRAND_COLOR, BRAND_COLOR_MUTED } from '@/constants/Colors';
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

  function handleEdit(id: number) {
    router.push({ pathname: '/item-form', params: { id: String(id) } });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Your pantry is empty. Scan a receipt/fridge photo or add an item manually to get
            started.
          </Text>
        }
        renderItem={({ item }) => (
          <PantryItemCard
            item={item}
            onPress={handleEdit}
            onConsume={handleConsume}
            onDelete={handleDelete}
          />
        )}
      />
      <View style={styles.fabRow}>
        <Pressable style={styles.addButton} onPress={() => router.push('/item-form')}>
          <Text style={styles.addButtonText}>+ Add Manually</Text>
        </Pressable>
        <Pressable style={styles.scanButton} onPress={() => router.push('/scan')}>
          <Text style={styles.scanButtonText}>+ Scan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 40,
  },
  fabRow: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    gap: 10,
    alignItems: 'flex-end',
  },
  scanButton: {
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
  },
  scanButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: BRAND_COLOR_MUTED,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
});
