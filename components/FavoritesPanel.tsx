import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import RecipeCard from '@/components/RecipeCard';
import { Text, View } from '@/components/Themed';
import type { FavoriteRecipe } from '@/types/pantry';

type Props = {
  favorites: FavoriteRecipe[];
  onUnfavorite: (id: number) => void;
};

// A single always-present heart icon is the one entry point into favorites:
// tap it for a list of saved recipe titles, tap a title for its full detail,
// and un-favorite from there (heart-break animation lives in RecipeCard).
export default function FavoritesPanel({ favorites, onUnfavorite }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = favorites.find((f) => f.id === selectedId) ?? null;

  function close() {
    setIsOpen(false);
    setSelectedId(null);
  }

  function handleRemove() {
    if (selected) onUnfavorite(selected.id);
    setSelectedId(null);
  }

  return (
    <>
      <Pressable style={styles.heartButton} onPress={() => setIsOpen(true)}>
        <Text style={styles.heartButtonIcon}>♥</Text>
        {favorites.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{favorites.length}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <View style={styles.popup}>
            <ScrollView contentContainerStyle={styles.popupContent}>
              {selected ? (
                <>
                  <Pressable onPress={() => setSelectedId(null)} style={styles.backRow} hitSlop={8}>
                    <Text style={styles.backText}>‹ Favorites</Text>
                  </Pressable>
                  <RecipeCard recipe={selected} isFavorited onToggleFavorite={handleRemove} />
                </>
              ) : (
                <>
                  <Text style={styles.heading}>Favorite Recipes</Text>
                  {favorites.length === 0 ? (
                    <Text style={styles.empty}>No favorite recipes yet.</Text>
                  ) : (
                    favorites.map((fav) => (
                      <Pressable
                        key={fav.id}
                        style={styles.listRow}
                        onPress={() => setSelectedId(fav.id)}>
                        <Text style={styles.listRowText}>{fav.title}</Text>
                        <Text style={styles.chevron}>›</Text>
                      </Pressable>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heartButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#d6336c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  heartButtonIcon: {
    color: 'white',
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: '#3A2418',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: 24,
  },
  popup: {
    maxHeight: '80%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  popupContent: {
    padding: 18,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: 16,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8888',
  },
  listRowText: {
    fontSize: 15,
    flex: 1,
  },
  chevron: {
    fontSize: 18,
    opacity: 0.5,
  },
  backRow: {
    paddingBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d6336c',
  },
});
