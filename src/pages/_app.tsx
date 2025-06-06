import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../supabaseClient'
import '../styles/globals.css'

interface User {
  id: string;
  email?: string;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // 🔧 FUNCIÓN SIMPLIFICADA: Solo verificar sesión, NO hacer consultas adicionales
    const getInitialSession = async () => {
      try {
        console.log('🔍 Verificando sesión inicial...');
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error);
          setUser(null);
        } else {
          console.log('✅ Sesión obtenida:', !!session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
        console.log('✅ Verificación inicial completada');
      } catch (error) {
        console.error('❌ Error en verificación inicial:', error);
        setUser(null);
        setLoading(false);
      }
    }

    // 🔧 LISTENER SIMPLIFICADO: Sin consultas a base de datos ni redirecciones automáticas
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session);
        
        // ✅ SOLO actualizar el usuario, SIN redirecciones automáticas
        setUser(session?.user ?? null);
        
        // ✅ SOLO redirigir en casos MUY específicos
        if (event === 'SIGNED_OUT') {
          // Usuario cerró sesión manualmente
          console.log('🚪 Usuario cerró sesión, redirigiendo a login');
          router.push('/login');
        }
        // ❌ REMOVIDO: No más redirecciones automáticas en SIGNED_IN
      }
    )

    getInitialSession()

    return () => {
      console.log('🧹 Limpiando subscription');
      subscription.unsubscribe();
    }
  }, [router])

  // 🔧 REDIRECCIÓN SIMPLIFICADA: Solo para casos específicos
  useEffect(() => {
    // ✅ Solo redirigir si NO está logueado Y está en página protegida
    if (!loading && !user) {
      const paginasPublicas = ['/login'];
      const esPagenaPublica = paginasPublicas.includes(router.pathname);
      
      if (!esPagenaPublica) {
        console.log('🔒 Redirigiendo a login desde página protegida:', router.pathname);
        router.push('/login');
      }
    }
  }, [user, loading, router.pathname, router])

  // Páginas que no necesitan layout
  const noLayoutPages = ['/login']
  const showLayout = !noLayoutPages.includes(router.pathname)

  // ✅ Loading mejorado
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
            <p style={{ color: '#666', fontSize: '1.1rem' }}>Cargando aplicación...</p>
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
        .btn-secondary {
          background: #f8f9fa;
          color: #495057;
          padding: 0.75rem 1.5rem;
          border: 2px solid #e9ecef;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-secondary:hover {
          background: #e9ecef;
          border-color: #dee2e6;
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
        .card {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
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