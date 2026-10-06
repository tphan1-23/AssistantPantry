import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { View } from '@/components/Themed';
import Colors from '@/constants/Colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

// Minimum downward drag (px) - or a fast enough downward flick - to count
// as "swipe to dismiss," for both the handle-drag and pull-past-the-top
// gestures below.
const DISMISS_DRAG_THRESHOLD = 60;
const DISMISS_VELOCITY_THRESHOLD = 1.2;

// Shared shell for every bottom-sheet modal (History, Profile, ...): tap
// anywhere outside to close, drag the handle down to close, or scroll past
// the top of the content to close (like pulling down on an already-
// scrolled-to-top list). Owns the ScrollView itself (rather than taking an
// already-scrollable child) specifically so it can track scroll position
// for that last gesture - something it couldn't do if the caller owned the
// ScrollView instead.
export default function BottomSheetModal({
  visible,
  onClose,
  children,
  contentContainerStyle,
}: Props) {
  const [scrollY, setScrollY] = useState(0);

  // Not memoized (no useRef/useState wrapping PanResponder.create) -
  // PanResponder.create() is a cheap plain object, and building it fresh
  // each render means its onClose closure (and, for the second one,
  // scrollY) is never stale.
  const dragHandleResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_evt, gesture) =>
      gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_evt, gesture) => {
      if (gesture.dy > DISMISS_DRAG_THRESHOLD || gesture.vy > DISMISS_VELOCITY_THRESHOLD) {
        onClose();
      }
    },
  });

  // Wraps the ScrollView as an ancestor - which is exactly the shape that
  // broke FavoritesPanel's scroll gesture (see Decisions & Bug Fixes Log) -
  // but safely this time, because onMoveShouldSetPanResponderCapture only
  // ever returns true once the list is already scrolled to the very top
  // (scrollY <= 0). Mid-scroll (scrollY > 0) it always returns false, so
  // the ScrollView keeps the gesture entirely to itself; this responder
  // only ever takes over for the one case where there's nothing left for
  // the ScrollView to scroll into anyway (pulling down further at the top).
  const pullToCloseResponder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
      scrollY <= 0 && gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
    onPanResponderRelease: (_evt, gesture) => {
      if (gesture.dy > DISMISS_DRAG_THRESHOLD || gesture.vy > DISMISS_VELOCITY_THRESHOLD) {
        onClose();
      }
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <RNView style={styles.modalRoot}>
        {/* A full-screen tap-to-close layer *behind* the sheet, as a sibling
            rather than an ancestor - see Decisions & Bug Fixes Log re:
            FavoritesPanel. An ancestor Pressable can steal a scroll drag
            that starts on plain (non-Pressable) content inside the sheet. */}
        <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} />
        <RNView style={[StyleSheet.absoluteFill, styles.sheetWrap]} pointerEvents="box-none">
          <View style={styles.sheet}>
            <RNView style={styles.dragHandleRow} {...dragHandleResponder.panHandlers}>
              <RNView style={styles.dragHandle} />
            </RNView>
            <RNView style={styles.body} {...pullToCloseResponder.panHandlers}>
              <ScrollView
                contentContainerStyle={contentContainerStyle}
                onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}>
                {children}
              </ScrollView>
            </RNView>
          </View>
        </RNView>
      </RNView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  dim: {
    backgroundColor: '#00000066',
  },
  sheetWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.cardBorder,
  },
  body: {
    flexShrink: 1,
  },
});
