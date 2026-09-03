const MAX_PHOTO = 50 * 1024;
const MAX_VOICE_MS = 15_000;

export async function compressPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not compress photo");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let quality = 0.7;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length * 0.75 > MAX_PHOTO && quality > 0.35) {
    quality -= 0.1;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length * 0.75 > MAX_PHOTO) {
    throw new Error("Photo is still too large. Skip the photo or take a closer shot.");
  }
  return data;
}

export function recordVoiceNote(): Promise<{ stop: () => void; done: Promise<string | null> }> {
  return navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise<string | null>((resolve) => {
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!chunks.length) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        resolve(`data:audio/webm;base64,${btoa(binary)}`);
      };
    });
    recorder.start();
    const timer = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_VOICE_MS);
    return {
      stop: () => {
        window.clearTimeout(timer);
        if (recorder.state === "recording") recorder.stop();
      },
      done,
    };
  });
}
