export const CAMERA_KEY = 'app-reserve.camera.v1';
export interface CameraChoice {
  id: string;
  label: string;
}
export function readCameraChoice(): CameraChoice | null {
  try {
    const choice = JSON.parse(localStorage.getItem(CAMERA_KEY) ?? 'null') as CameraChoice | null;
    return choice && typeof choice.id === 'string' && choice.id && typeof choice.label === 'string'
      ? choice
      : null;
  } catch {
    return null;
  }
}
export function saveCameraChoice(choice: CameraChoice | null) {
  if (choice) localStorage.setItem(CAMERA_KEY, JSON.stringify(choice));
  else localStorage.removeItem(CAMERA_KEY);
}
