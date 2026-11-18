/**
 * Motion preference helpers.
 * `prefersReducedMotion` now lives in lib/motionSettings so the in-app
 * "Reduce motion" toggle is honoured everywhere the OS setting is.
 */
export { prefersReducedMotion, getReduceMotion } from './motionSettings';
