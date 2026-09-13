/**
 * Camera Utilities for Sappy Stationary POS
 * Ensures the default camera is always "Camera 0 (facing Back)" across all
 * desktop, mobile (Android/iOS), and tablet devices.
 */

export interface FormattedCamera {
  id: string;
  label: string;
  isBackCamera: boolean;
  rawLabel: string;
}

/**
 * Organizes, prioritizes, and formats available camera devices so that
 * the default camera is always "Camera 0 (facing Back)".
 *
 * Inspects device labels for back/rear/environment indicators:
 * e.g., "facing back", "camera2 0", "rear", "environment", "back".
 * Places the back-facing camera at index 0 as "Camera 0 (facing Back)".
 * If no label indicates direction, the primary device is designated as
 * "Camera 0 (facing Back)".
 */
export function prioritizeAndFormatCameras(
  devices: { id: string; label: string }[]
): FormattedCamera[] {
  if (!devices || devices.length === 0) return [];

  const backCameras: { id: string; rawLabel: string }[] = [];
  const frontCameras: { id: string; rawLabel: string }[] = [];
  const otherCameras: { id: string; rawLabel: string }[] = [];

  for (const d of devices) {
    const raw = (d.label || '').trim();
    const lower = raw.toLowerCase();

    const isBack =
      lower.includes('back') ||
      lower.includes('rear') ||
      lower.includes('environment') ||
      lower.includes('facing back') ||
      lower.includes('camera2 0') ||
      lower.includes('0, facing back');

    const isFront =
      lower.includes('front') ||
      lower.includes('user') ||
      lower.includes('facing front') ||
      lower.includes('selfie') ||
      lower.includes('camera2 1') ||
      lower.includes('1, facing front');

    if (isBack) {
      backCameras.push({ id: d.id, rawLabel: raw });
    } else if (isFront) {
      frontCameras.push({ id: d.id, rawLabel: raw });
    } else {
      otherCameras.push({ id: d.id, rawLabel: raw });
    }
  }

  const result: FormattedCamera[] = [];

  // Case 1: At least one back camera detected
  if (backCameras.length > 0) {
    // Primary back camera is ALWAYS Camera 0 (facing Back)
    const primaryBack = backCameras[0];
    result.push({
      id: primaryBack.id,
      label: 'Camera 0 (facing Back)',
      isBackCamera: true,
      rawLabel: primaryBack.rawLabel
    });

    // Front camera(s) next as Camera 1 (facing Front)
    frontCameras.forEach((fc, idx) => {
      result.push({
        id: fc.id,
        label: frontCameras.length === 1 ? 'Camera 1 (facing Front)' : `Camera ${result.length} (facing Front ${idx + 1})`,
        isBackCamera: false,
        rawLabel: fc.rawLabel
      });
    });

    // Secondary back cameras (e.g. Ultra-wide, Telephoto, Macro)
    backCameras.slice(1).forEach((bc, idx) => {
      const extra = bc.rawLabel ? ` - ${bc.rawLabel}` : ` ${idx + 2}`;
      result.push({
        id: bc.id,
        label: `Camera ${result.length} (facing Back${extra})`,
        isBackCamera: true,
        rawLabel: bc.rawLabel
      });
    });

    // Any remaining cameras
    otherCameras.forEach((oc) => {
      const extra = oc.rawLabel ? ` (${oc.rawLabel})` : '';
      result.push({
        id: oc.id,
        label: `Camera ${result.length}${extra}`,
        isBackCamera: false,
        rawLabel: oc.rawLabel
      });
    });
  } 
  // Case 2: No explicit back camera label found (e.g., PC webcam or generic USB camera)
  else if (otherCameras.length > 0) {
    const primary = otherCameras[0];
    result.push({
      id: primary.id,
      label: 'Camera 0 (facing Back)',
      isBackCamera: true,
      rawLabel: primary.rawLabel
    });

    frontCameras.forEach((fc) => {
      result.push({
        id: fc.id,
        label: `Camera ${result.length} (facing Front)`,
        isBackCamera: false,
        rawLabel: fc.rawLabel
      });
    });

    otherCameras.slice(1).forEach((oc) => {
      const extra = oc.rawLabel ? ` (${oc.rawLabel})` : '';
      result.push({
        id: oc.id,
        label: `Camera ${result.length}${extra}`,
        isBackCamera: false,
        rawLabel: oc.rawLabel
      });
    });
  } 
  // Case 3: Only front cameras reported by device
  else if (frontCameras.length > 0) {
    const primary = frontCameras[0];
    result.push({
      id: primary.id,
      label: 'Camera 0 (facing Back)',
      isBackCamera: true,
      rawLabel: primary.rawLabel
    });

    frontCameras.slice(1).forEach((fc) => {
      result.push({
        id: fc.id,
        label: `Camera ${result.length} (facing Front)`,
        isBackCamera: false,
        rawLabel: fc.rawLabel
      });
    });
  }

  return result;
}
