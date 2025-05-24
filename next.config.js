/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deshabilitar ESLint durante builds (temporal)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Mantener verificación de TypeScript pero ser menos estricto
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuración para componentes externos
  transpilePackages: ['lucide-react'],
  
  // Configuración de imágenes si usas next/image
  images: {
    domains: [],
  },
}

module.exports = nextConfig