import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const SNAP_POINTS = ['85%'];

// Shared shell for every bottom-sheet modal (History, Profile, ...), built on
// @gorhom/bottom-sheet rather than a hand-rolled PanResponder.
//
// A plain JS PanResponder (an earlier implementation) can't reliably take
// the gesture away from a ScrollView that's already actively scrolling -
// React Native's responder negotiation mostly settles who "owns" a touch
// right at gesture start, not continuously on every subsequent move, so a
// finger-drag that starts as a scroll stays a scroll even once it reaches
// the top and the user keeps pulling. @gorhom/bottom-sheet's
// `enablePanDownToClose` solves this properly via react-native-gesture-
// handler's native gesture recognizers.
//
// Uses the plain (non-modal) `BottomSheet`, not the Portal-based
// `BottomSheetModal` - the modal variant renders through a separate
// provider/portal/host-container chain that turned out not to actually
// present anything in practice (tapping the History icon did nothing).
// This renders inline instead, right where it's placed in the tree, which
// is a much shorter, more direct path with far fewer places for the
// open/close signal to get lost. See Decisions & Bug Fixes Log. The one
// trade-off: it won't draw over the tab bar the way a true native <Modal>
// (or the portal-based variant) would - acceptable, since the Pantry
// screen's own content already fills the area above the tab bar.
export default function BottomSheetModal({
  visible,
  onClose,
  children,
  contentContainerStyle,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  function renderBackdrop(backdropProps: BottomSheetBackdropProps) {
    // pressBehavior defaults to 'close', so tapping outside the sheet
    // dismisses it with no extra wiring needed here.
    return <BottomSheetBackdrop {...backdropProps} appearsOnIndex={0} disappearsOnIndex={-1} />;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheet}
      handleStyle={styles.handle}
      handleIndicatorStyle={styles.dragHandle}>
      <BottomSheetScrollView contentContainerStyle={contentContainerStyle}>
        {children}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.cardBorder,
  },
});
