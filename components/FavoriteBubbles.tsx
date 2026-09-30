import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';

import RecipeCard from '@/components/RecipeCard';
import { Text, View } from '@/components/Themed';
import type { FavoriteRecipe } from '@/types/pantry';

type Props = {
  favorites: FavoriteRecipe[];
  onUnfavorite: (id: number) => void;
};

// Messenger "chat heads"-style bubbles: each favorited recipe gets a small
// floating circle; tap it to pop the full recipe up over the screen, tap
// anywhere outside the popup to collapse it back down to just the bubbles.
export default function FavoriteBubbles({ favorites, onUnfavorite }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const openRecipe = favorites.find((f) => f.id === openId) ?? null;

  if (favorites.length === 0) return null;

  return (
    <>
      <View style={styles.stack}>
        {favorites.map((fav) => (
          <Pressable key={fav.id} style={styles.bubble} onPress={() => setOpenId(fav.id)}>
            <Text style={styles.bubbleText}>♥</Text>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={openRecipe !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenId(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenId(null)}>
          {openRecipe && (
            <Pressable style={styles.popup} onPress={(e) => e.stopPropagation()}>
              <ScrollView contentContainerStyle={styles.popupContent}>
                <RecipeCard recipe={openRecipe} />
                <Pressable
                  style={styles.unfavoriteButton}
                  onPress={() => {
                    onUnfavorite(openRecipe.id);
                    setOpenId(null);
                  }}>
                  <Text style={styles.unfavoriteText}>♥ Remove from Favorites</Text>
                </Pressable>
              </ScrollView>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    gap: 10,
  },
  bubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d6336c',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bubbleText: {
    color: 'white',
    fontSize: 22,
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
  },
  popupContent: {
    padding: 4,
  },
  unfavoriteButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d6336c',
  },
  unfavoriteText: {
    color: '#d6336c',
    fontWeight: '600',
  },
});
