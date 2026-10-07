import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Drop-in replacement for React Native's Alert.alert that actually works on
 * web. react-native-web's Alert.alert is a literal no-op - `static alert()
 * {}`, see node_modules/react-native-web/src/exports/Alert/index.js - so
 * every Alert.alert call in this app, including its button callbacks, was
 * silently doing nothing on web: not just rendering oddly, but never
 * running at all. Native behavior is unchanged (delegates straight to the
 * real Alert.alert); web falls back to window.alert/window.confirm, which
 * is plainer but actually executes.
 */
export function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    buttons[0].onPress?.();
    return;
  }

  // Every multi-button alert in this app is a two-button Cancel/action
  // pair - window.confirm's OK maps to the non-cancel button, Cancel maps
  // to the cancel button (or just does nothing if there isn't one).
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b !== cancelButton) ?? buttons[0];
  if (window.confirm(text)) {
    actionButton.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
