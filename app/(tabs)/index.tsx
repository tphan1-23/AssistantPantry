import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Text, View } from '@/components/Themed';
import PantryItemCard from '@/components/PantryItemCard';
import EditItemModal from '@/components/EditItemModal';
import { deletePantryItem, getAllItems, markConsumed, updateItem } from '@/services/database';
import type { PantryItem } from '@/types/pantry';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

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

  function handleOpenEdit(id: number) {
    const item = items.find((i) => i.id === id) ?? null;
    setEditingItem(item);
  }

  async function handleSaveEdit(
    id: number,
    fields: { name: string; quantity: number; unit: string; expiryTimestamp: number }
  ) {
    await updateItem(db, id, fields);
    setEditingItem(null);
    refresh();
  }

  async function handleDeleteFromModal(id: number) {
    await deletePantryItem(db, id);
    setEditingItem(null);
    refresh();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pantry</Text>
        <Text style={styles.subtitle}>
          {items.length === 0
            ? 'Nothing in your pantry yet'
            : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Use the Scan or Add tabs to get started.</Text>
        }
        renderItem={({ item }) => (
          <PantryItemCard
            item={item}
            onPress={handleOpenEdit}
            onConsume={handleConsume}
            onDelete={handleDelete}
          />
        )}
      />
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 40,
  },
});
