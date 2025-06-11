import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../supabaseClient';
import ReservationSystem from '../../components/ReservationSystem';
import { Calendar, AlertCircle, MapPin, Phone, Clock } from 'lucide-react';

export default function PublicReservationPage() {
  const router = useRouter();
  const { slug } = router.query;
  
  const [businessData, setBusinessData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    
    loadBusinessData();
  }, [slug]);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Buscando negocio con slug:', slug);

      // 🔍 BUSCAR NEGOCIO POR SLUG
      const { data: business, error: businessError } = await supabase
        .from('configuracion')
        .select('*')
        .eq('slug', slug)
        .single();

      console.log('📊 Resultado búsqueda:', { business, businessError });

      if (businessError) {
        if (businessError.code === 'PGRST116') {
          console.log('❌ Negocio no encontrado');
          setError('NEGOCIO_NO_ENCONTRADO');
        } else {
          console.error('❌ Error servidor:', businessError);
          setError('ERROR_SERVIDOR');
        }
        return;
      }

      if (!business) {
        console.log('❌ Sin datos de negocio');
        setError('NEGOCIO_NO_ENCONTRADO');
        return;
      }

      console.log('✅ Negocio encontrado:', business.nombre_negocio);

      // ✅ VERIFICAR QUE EL NEGOCIO ESTÁ CONFIGURADO
      const { data: trabajadores } = await supabase
        .from('trabajadores')
        .select('id')
        .eq('user_id', business.user_id)
        .limit(1);

      const { data: servicios } = await supabase
        .from('servicios')
        .select('id')
        .eq('user_id', business.user_id)
        .limit(1);

      console.log('📊 Verificación:', { 
        trabajadores: trabajadores?.length || 0, 
        servicios: servicios?.length || 0 
      });

      if (!trabajadores?.length || !servicios?.length) {
        console.log('❌ Negocio no configurado');
        setError('NEGOCIO_NO_CONFIGURADO');
        return;
      }

      console.log('✅ Todo listo, cargando negocio');
      setBusinessData(business);
      
    } catch (error) {
      console.error('💥 Error inesperado:', error);
      setError('ERROR_INESPERADO');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando información del negocio...</p>
            {slug && (
              <p className="text-sm text-gray-400 mt-2">Buscando: {slug}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ❌ ERROR STATES
  if (error) {
    const errorContent = {
      'NEGOCIO_NO_ENCONTRADO': {
        title: 'Negocio no encontrado',
        message: `No encontramos ningún negocio con la dirección "${slug}".`,
        suggestion: 'Verifica que la URL sea correcta o contacta con el negocio.',
        color: 'red'
      },
      'NEGOCIO_NO_CONFIGURADO': {
        title: 'Negocio en configuración',
        message: 'Este negocio aún está configurando sus servicios.',
        suggestion: 'Por favor, intenta más tarde o contacta directamente con el negocio.',
        color: 'yellow'
      },
      'ERROR_SERVIDOR': {
        title: 'Error del servidor',
        message: 'Hubo un problema al cargar la información.',
        suggestion: 'Por favor, recarga la página o intenta más tarde.',
        color: 'red'
      },
      'ERROR_INESPERADO': {
        title: 'Error inesperado',
        message: 'Algo salió mal al cargar el negocio.',
        suggestion: 'Por favor, recarga la página.',
        color: 'red'
      }
    };

    const errorInfo = errorContent[error] || errorContent['ERROR_INESPERADO'];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4">
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              errorInfo.color === 'red' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <AlertCircle className={`w-10 h-10 ${
                errorInfo.color === 'red' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {errorInfo.title}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {errorInfo.message}
            </p>
            
            <p className="text-sm text-gray-500 mb-6">
              {errorInfo.suggestion}
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Recargar página
              </button>
            </div>

            {/* 🔧 DEBUG INFO */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-500">
              <p>Debug: slug = "{slug}"</p>
              <p>Error: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SUCCESS STATE - MOSTRAR EL NEGOCIO
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 🏢 HEADER DEL NEGOCIO */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                {businessData.nombre_negocio}
              </h1>
              
              {businessData.descripcion && (
                <p className="text-gray-600 text-lg mb-3">
                  {businessData.descripcion}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {businessData.direccion && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{businessData.direccion}</span>
                  </div>
                )}
                
                {businessData.telefono_contacto && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${businessData.telefono_contacto}`} className="hover:text-blue-600 transition-colors">
                      {businessData.telefono_contacto}
                    </a>
                  </div>
                )}
                
                {businessData.horario_atencion && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{businessData.horario_atencion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📝 FORMULARIO DE RESERVAS */}
      <div className="py-8">
        <ReservationSystem businessId={businessData.user_id} businessData={businessData} />
      </div>

      {/* 🦶 FOOTER */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Sistema de reservas online</p>
            <p className="mt-1">
              Reservas 24/7 para <strong>{businessData.nombre_negocio}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔧 NEXT.JS: Configuración para páginas dinámicas
export async function getServerSideProps(context) {
  const { slug } = context.params;
  
  return {
    props: {
      slug
    }
  };
}