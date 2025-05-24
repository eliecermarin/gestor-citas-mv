import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseclient'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Verificar sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('Error getting session:', error)
        setLoading(false)
      }
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Redirigir según el estado de autenticación
        if (event === 'SIGNED_IN') {
          // Usuario inició sesión
          if (session?.user) {
            try {
              // Verificar si tiene configuración
              const { data: trabajadores } = await supabase
                .from('trabajadores')
                .select('id')
                .eq('user_id', session.user.id)
                .limit(1)

              if (trabajadores && trabajadores.length > 0) {
                router.push('/carga-trabajo')
              } else {
                router.push('/configuracion')
              }
            } catch (error) {
              console.error('Error checking user config:', error)
              router.push('/configuracion')
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Usuario cerró sesión
          router.push('/login')
        }
      }
    )

    getInitialSession()

    return () => subscription.unsubscribe()
  }, [router])

  // Redirigir a login si no está autenticado (excepto en página de login)
  useEffect(() => {
    if (!loading && !user && router.pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, router])

  // Páginas que no necesitan layout
  const noLayoutPages = ['/login']
  const showLayout = !noLayoutPages.includes(router.pathname)

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
        </div>
      </div>
    )
  }

  // Configurar el título de la página según la ruta
  const getPageTitle = () => {
    switch (router.pathname) {
      case '/configuracion':
        return 'Configuración del Negocio'
      case '/reserva':
        return 'Nueva Reserva'
      case '/carga-trabajo':
        return 'Agenda Semanal'
      case '/login':
        return 'Iniciar Sesión'
      default:
        return 'Sistema de Reservas'
    }
  }

  if (showLayout && user) {
    return (
      <Layout title={getPageTitle()}>
        <Component {...pageProps} />
      </Layout>
    )
  }

  return <Component {...pageProps} />
}