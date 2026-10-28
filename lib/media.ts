export const avatarFallback = "/assets/johndoe.png";

const postFallbackImages = [
  "/assets/boy.png",
  "/assets/padangrumput.png",
  "/assets/ruangtamu.png",
  "/assets/salad.png",
  "/assets/bunga.png",
  "/assets/girl.png",
  "/assets/boygirl.png",
  "/assets/girl-girl.png",
  "/assets/laut.png",
];

export function getPostFallbackImage(index = 0) {
  const safeIndex = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return postFallbackImages[safeIndex % postFallbackImages.length];
}

export function postFallbackIndex(post: { id?: string | number; caption?: string }) {
  const key = String(post.id ?? post.caption ?? "");
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % postFallbackImages.length;
}
