/**
 * Optimise une URL Cloudinary avec les transformations recommandées
 * - f_auto: format automatique (WebP/AVIF si supporté)
 * - q_auto: qualité automatique
 * - w_XXX: width responsive
 */
export function optimizeCloudinaryUrl(url: string, width: number = 800): string {
  if (!url.includes('cloudinary.com')) return url

  // Injecte les transformations juste après /upload/
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
}

/**
 * Génère un srcSet pour images responsives
 */
export function getCloudinarySourceSet(url: string): string {
  if (!url.includes('cloudinary.com')) return ''

  const widths = [400, 800, 1200]
  return widths
    .map(w => `${optimizeCloudinaryUrl(url, w)} ${w}w`)
    .join(', ')
}
