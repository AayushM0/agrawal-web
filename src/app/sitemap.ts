import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.maharajaagrasenfoundation.com'
  const routes = ['', '/about', '/sohan-lal-jindal', '/directory', '/businesses', '/matrimony', '/careers', '/guide', '/help', '/support']
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/sohan-lal-jindal' ? 0.9 : 0.7,
  }))
}
