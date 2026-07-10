import * as Haptics from 'expo-haptics';

// Thin wrappers that never throw (haptics may be unavailable on some devices).

// Light tap — when adding a product to the cart.
export function hapticAdd(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Success buzz — when a sale is registered.
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
