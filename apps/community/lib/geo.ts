export async function getExactLocation(): Promise<{ lat: number; lon: number; accuracy: number }> {
  if (!navigator.geolocation) {
    throw new Error("Location is not available on this phone.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => reject(new Error("Turn on location so responders can find you.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 8000 },
    );
  });
}

export function normalizeKenyaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `+254${digits}`;
  return null;
}
