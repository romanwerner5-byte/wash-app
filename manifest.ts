import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Waschkalender Haus-App',
    short_name: 'Waschkalender',
    description: 'Teilbare Waschplan-App für Mehrfamilienhäuser mit E-Mail/SMS-Weitergabe.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    lang: 'de-CH',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
