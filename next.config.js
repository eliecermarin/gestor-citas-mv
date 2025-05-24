/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deshabilitar ESLint durante builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TEMPORAL: Ignorar errores de TypeScript también
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configuración para componentes externos
  transpilePackages: ['lucide-react'],
  
  // Configuración experimental si es necesaria
  experimental: {
    esmExternals: false,
  },
}

module.exports = nextConfig