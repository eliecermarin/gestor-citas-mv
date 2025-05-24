import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../supabaseClient'

interface User {
  id: string;
  email?: string;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    // Timeout para evitar loading infinito
    const timeoutId = setTimeout(() => {
      console.log('⚠️ TIMEOUT: Carga tomó más de 10 segundos');
      setLoading(false);
      setError("Timeout cargando la aplicación");
    }, 10000);

    // Verificar sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('🔍 DEBUG: Iniciando verificación de sesión...');
        console.log('🔍 DEBUG: Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('🔍 DEBUG: Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('🔍 DEBUG: Respuesta de getSession:', { session: !!session, error });
        
        if (error) {
          console.error('❌ DEBUG: Error en getSession:', error);
          setError(`Error de autenticación: ${error.message}`);
        }
        
        setUser(session?.user ?? null)
        clearTimeout(timeoutId);
        setLoading(false)
        
        console.log('✅ DEBUG: Sesión verificada, loading = false');
      } catch (error) {
        console.error('💥 DEBUG: Error capturado:', error)
        setError(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        clearTimeout(timeoutId);
        setLoading(false)
      }
    }

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 DEBUG: Auth state change:', event, !!session);
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

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [router])

  // Redirigir a login si no está autenticado (excepto en página de login)
  useEffect(() => {
    if (!loading && !user && router.pathname !== '/login') {
      console.log('🔍 DEBUG: Redirigiendo a login');
      router.push('/login')
    }
  }, [user, loading, router])

  // Páginas que no necesitan layout
  const noLayoutPages = ['/login']
  const showLayout = !noLayoutPages.includes(router.pathname)

  // Mostrar error si hay problemas
  if (error) {
    return (
      <>
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem'
        }}>
          <div style={{ 
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            maxWidth: '500px'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: '#ef4444',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px'
            }}>⚠</div>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error de Configuración</h2>
            <p style={{ color: '#666', fontSize: '1rem', marginBottom: '1rem' }}>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </>
    )
  }

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <>
        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{ 
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Cargando aplicación...</p>
            <p style={{ color: '#999', fontSize: '0.9rem' }}>Verificando autenticación</p>
          </div>
        </div>
      </>
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

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: #f8fafc;
          color: #1a202c;
        }
        button {
          font-family: inherit;
        }
        input, select, textarea {
          font-family: inherit;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        /* Estilos básicos para formularios */
        .btn-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      `}</style>
      
      {showLayout && user ? (
        <Layout title={getPageTitle()}>
          <Component {...pageProps} />
        </Layout>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  )
}