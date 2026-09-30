import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
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
    <View style={{ flex: 1 }}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', opacity: 0.6, marginTop: 40 }}>
            Your pantry is empty. Use the Scan or Add tabs to get started.
          </Text>
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
