/**
 * Haptic feedback utility
 * Provides vibration feedback on supported devices when enabled in settings
 */

type HapticIntensity = 'light' | 'medium' | 'heavy';

const HAPTIC_DURATIONS: Record<HapticIntensity, number> = {
  light: 5,
  medium: 10,
  heavy: 20,
};

/**
 * Check if haptic feedback is enabled in user settings
 */
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const setting = localStorage.getItem('hapticFeedback');
  // Default to true if not set
  return setting !== 'false';
}

/**
 * Check if the device supports vibration
 */
export function supportsHaptic(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback with specified intensity
 * @param intensity - 'light' (5ms), 'medium' (10ms), or 'heavy' (20ms)
 */
export function triggerHaptic(intensity: HapticIntensity = 'medium'): void {
  if (!isHapticEnabled() || !supportsHaptic()) return;
  
  const duration = HAPTIC_DURATIONS[intensity];
  navigator.vibrate(duration);
}

/**
 * Trigger a pattern of haptic feedback (for special events)
 * @param pattern - Array of vibration/pause durations in ms
 */
export function triggerHapticPattern(pattern: number[]): void {
  if (!isHapticEnabled() || !supportsHaptic()) return;
  navigator.vibrate(pattern);
}

/**
 * Pre-defined haptic patterns for common actions
 */
export const hapticPatterns = {
  // Quick tap feedback for buttons
  tap: () => triggerHaptic('light'),
  
  // Medium feedback for navigation changes
  navigate: () => triggerHaptic('medium'),
  
  // Success feedback (double tap)
  success: () => triggerHapticPattern([10, 50, 10]),
  
  // Error/warning feedback
  error: () => triggerHapticPattern([20, 30, 20, 30, 20]),
  
  // Swipe complete feedback
  swipe: () => triggerHaptic('light'),
  
  // Toggle/switch feedback
  toggle: () => triggerHaptic('medium'),
};
