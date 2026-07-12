// src/services/bleService.ts
//
// Mock Bluetooth Low Energy scanning service.
//
// In v1 there is no real BLE hardware integration. This module exposes the
// exact same interface a real implementation (e.g. wrapping `react-native-ble-plx`)
// would expose, so swapping in real BLE later only means rewriting the body
// of `scanForTags`, not any calling code.

import { DetectedBleTag } from "@/types";

export interface BleScanOptions {
  /** How long to "scan" for, in milliseconds. */
  durationMs?: number;
  /**
   * Optional list of bleIds that should be "found" during this mock scan.
   * If omitted, the mock will randomly decide which known tags are nearby.
   */
  forceDetectedIds?: string[];
  /**
   * Full universe of bleIds the mock is allowed to "detect" when
   * forceDetectedIds isn't provided (normally: all bleIds the user has
   * registered). Tags outside this list will never be invented.
   */
  knownBleIds?: string[];
}

export interface BleScanHandle {
  cancel: () => void;
}

/**
 * Simulates a BLE scan and resolves with the list of tags "detected" nearby.
 *
 * Real implementation would use something like:
 *   BleManager.startDeviceScan(null, null, (error, device) => { ... })
 */
export function scanForTags(
  options: BleScanOptions = {},
  onTagDetected?: (tag: DetectedBleTag) => void
): Promise<DetectedBleTag[]> & BleScanHandle {
  const durationMs = options.durationMs ?? 3000;
  let cancelled = false;

  const detected: DetectedBleTag[] = [];

  const promise = new Promise<DetectedBleTag[]>((resolve) => {
    const idsToDetect =
      options.forceDetectedIds ??
      mockPickNearbyIds(options.knownBleIds ?? []);

    const tickMs = Math.max(200, Math.floor(durationMs / Math.max(idsToDetect.length, 1)));

    idsToDetect.forEach((bleId, index) => {
      setTimeout(() => {
        if (cancelled) return;
        const tag: DetectedBleTag = {
          bleId,
          rssi: mockRssi(),
          seenAt: new Date().toISOString()
        };
        detected.push(tag);
        onTagDetected?.(tag);
      }, tickMs * (index + 1));
    });

    setTimeout(() => {
      if (!cancelled) resolve(detected);
    }, durationMs);
  }) as Promise<DetectedBleTag[]> & BleScanHandle;

  promise.cancel = () => {
    cancelled = true;
  };

  return promise;
}

/** Randomly simulate ~70% of known tags being "in range". */
function mockPickNearbyIds(knownBleIds: string[]): string[] {
  return knownBleIds.filter(() => Math.random() < 0.7);
}

function mockRssi(): number {
  // Typical BLE RSSI range: -30 (very close) to -90 (far/weak).
  return -1 * (30 + Math.floor(Math.random() * 60));
}
