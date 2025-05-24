import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

interface Servicio {
  id: number;
  nombre: string;
  duracion: number;
  precio: number;
  mostrarPrecio: boolean;
  user_id?: string;
}

interface Trabajador {
  id: string;
  nombre: string;
  servicios: Servicio[];
  festivos: string[];
  limiteDiasReserva: number;
  user_id?: string;
}

interface NuevoServicio {
  nombre: string;
  duracion: number;
  precio: number;
  mostrarPrecio: boolean;
}

interface User {
  id: string;
  email?: string;
}

interface TrabajadorData {
  id: string;
  nombre: string;
  servicios: number[];
  festivos: string[];
  duracionCitaDefecto: number;
  user_id: string;
}

export default function Configuracion() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [serviciosGlobales, setServiciosGlobales] = useState<Servicio[]>([]);
  const [nuevoTrabajador, setNuevoTrabajador] = useState<string>("");
  const [trabajadorExpandido, setTrabajadorExpandido] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [nuevosServicios, setNuevosServicios] = useState<Record<string, NuevoServicio>>({});
  const [nuevasFechasFestivas, setNuevasFechasFestivas] = useState<Record<string, string>>({});

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const cargarDatos = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Cargar servicios globales
      const { data: servicios, error: errorServicios } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', userId);

      if (errorServicios) throw errorServicios;
      setServiciosGlobales(servicios || []);

      // Cargar trabajadores
      const { data: trabajadoresData, error: errorTrabajadores } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('user_id', userId);

      if (errorTrabajadores) throw errorTrabajadores;

      // Procesar trabajadores con sus servicios
      const trabajadoresProcesados = (trabajadoresData || []).map((t: TrabajadorData) => ({
        id: t.id,
        nombre: t.nombre,
        servicios: t.servicios ? 
          t.servicios.map((sId: number) => servicios?.find(s => s.id === sId)).filter(Boolean) || [] 
          : [],
        festivos: t.festivos || [],
        limiteDiasReserva: t.duracionCitaDefecto || 30,
        user_id: t.user_id
      }));

      setTrabajadores(trabajadoresProcesados);
      
      // Inicializar estados para cada trabajador
      trabajadoresProcesados.forEach((t: Trabajador) => inicializarEstadosTrabajador(t.id));
      
      if (trabajadoresProcesados.length > 0 && !trabajadorExpandido) {
        setTrabajadorExpandido(trabajadoresProcesados[0].id);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      showMessage('Error cargando configuración');
    } finally {
      setIsLoading(false);
    }
  }, [trabajadorExpandido]);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          await cargarDatos(currentUser.id);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error de autenticación:', error);
        router.push('/login');
      }
    };

    checkAuthAndLoadData();
  }, [router, cargarDatos]);

  const inicializarEstadosTrabajador = (trabajadorId: string) => {
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || { nombre: "", duracion: 20, precio: 0, mostrarPrecio: true }
    }));
    
    setNuevasFechasFestivas(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || ""
    }));
  };

  const agregarTrabajador = async () => {
  if (!nuevoTrabajador.trim() || !user) return;
  
  try {
    console.log('🔄 Intentando crear trabajador:', nuevoTrabajador);
    
    // 🔥 SOLO CAMPOS BÁSICOS QUE EXISTEN
    const trabajadorData = {
      nombre: nuevoTrabajador.trim(),
      servicios: [],
      festivos: [],
      duracionCitaDefecto: 30,
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('trabajadores')
      .insert([trabajadorData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error);
      throw error;
    }

    const nuevoTrab = {
      id: data.id,
      nombre: data.nombre,
      servicios: [],
      festivos: data.festivos || [],
      limiteDiasReserva: data.duracionCitaDefecto || 30,
      user_id: data.user_id
    };
    
    setTrabajadores([...trabajadores, nuevoTrab]);
    setNuevoTrabajador("");
    setTrabajadorExpandido(data.id);
    inicializarEstadosTrabajador(data.id);
    showMessage("Trabajador agregado exitosamente");

  } catch (error: any) {
    console.error('❌ Error completo:', error);
    showMessage(`Error: ${error.message || 'Error desconocido'}`);
  }


  const eliminarTrabajador = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.filter(t => t.id !== id));
      if (trabajadorExpandido === id) {
        setTrabajadores(trabajadores => {
          const remaining = trabajadores.filter(t => t.id !== id);
          return remaining;
        });
        setTrabajadorExpandido(trabajadores[0]?.id || null);
      }
      showMessage("Trabajador eliminado");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador");
    }
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleTrabajador = (id: string) => {
    setTrabajadorExpandido(trabajadorExpandido === id ? null : id);
  };

  if (isLoading && trabajadores.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const totalServicios = trabajadores.reduce((total, t) => total + t.servicios.length, 0);
  const totalFestivos = trabajadores.reduce((total, t) => total + t.festivos.length, 0);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '2rem 1rem'
    }}>
      <div className="container">
        {/* Header */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea, #764ba2)', 
              padding: '1rem', 
              borderRadius: '0.75rem',
              color: 'white'
            }}>
              <Settings size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a202c', margin: 0 }}>
                Configuración del Negocio
              </h1>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                Gestiona tu equipo, servicios y disponibilidad
              </p>
              {user && (
                <p style={{ color: '#667eea', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Usuario: {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            background: message.includes('Error') ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            fontWeight: '600'
          }}>
            {message}
          </div>
        )}

        {/* Agregar Trabajador */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Plus size={20} style={{ color: '#667eea' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
              Agregar Nuevo Trabajador
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              value={nuevoTrabajador}
              onChange={(e) => setNuevoTrabajador(e.target.value)}
              placeholder="Nombre del trabajador"
              className="form-input"
              style={{ flex: '1', minWidth: '200px' }}
              onKeyPress={(e) => e.key === 'Enter' && agregarTrabajador()}
              disabled={isLoading}
            />
            <button 
              onClick={agregarTrabajador}
              disabled={isLoading || !nuevoTrabajador.trim()}
              className="btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                opacity: (!nuevoTrabajador.trim() || isLoading) ? 0.6 : 1
              }}
            >
              <Plus size={16} />
              Añadir Trabajador
            </button>
          </div>
        </div>

        {/* Lista de Trabajadores */}
        {trabajadores.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {trabajadores.map((trabajador) => (
              <div key={trabajador.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {/* Header del Trabajador */}
                <div 
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea, #764ba2)', 
                    padding: '1.5rem',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                  onClick={() => toggleTrabajador(trabajador.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: 'rgba(255, 255, 255, 0.2)', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                          {trabajador.nombre}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>
                          {trabajador.servicios.length} servicios • {trabajador.festivos.length} días festivos
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarTrabajador(trabajador.id);
                        }}
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'background 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      >
                        <Trash2 size={16} />
                      </button>
                      {trabajadorExpandido === trabajador.id ? 
                        <ChevronUp size={20} /> : 
                        <ChevronDown size={20} />
                      }
                    </div>
                  </div>
                </div>

                {/* Contenido Expandible */}
                {trabajadorExpandido === trabajador.id && (
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                      gap: '2rem' 
                    }}>
                      {/* Servicios */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Clock size={20} style={{ color: '#10b981' }} />
                          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                            Servicios
                          </h4>
                        </div>
                        
                        {/* Lista de Servicios */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {trabajador.servicios.map((servicio) => (
                            <div key={`servicio-${trabajador.id}-${servicio.id}`} 
                                 style={{ 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   justifyContent: 'space-between', 
                                   padding: '1rem', 
                                   background: '#f8f9fa', 
                                   borderRadius: '0.5rem',
                                   border: '1px solid #e9ecef'
                                 }}>
                              <div>
                                <h5 style={{ fontWeight: '600', color: '#1a202c', margin: 0 }}>
                                  {servicio.nombre}
                                </h5>
                                <p style={{ color: '#666', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                                  {servicio.duracion} minutos
                                  {servicio.mostrarPrecio && servicio.precio > 0 && ` • ${servicio.precio}€`}
                                </p>
                              </div>
                              <button 
                                onClick={() => {/* eliminarServicio(trabajador.id, servicio.id) */}}
                                style={{ 
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  padding: '0.5rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.servicios.length === 0 && (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '2rem', 
                              background: '#f8f9fa', 
                              borderRadius: '0.5rem',
                              border: '2px dashed #dee2e6'
                            }}>
                              <Clock size={32} style={{ color: '#adb5bd', margin: '0 auto 0.5rem' }} />
                              <p style={{ color: '#666', margin: 0 }}>No hay servicios configurados</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Días Festivos y Configuración */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Calendar size={20} style={{ color: '#8b5cf6' }} />
                          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                            Días Festivos
                          </h4>
                        </div>

                        {/* Lista de Días Festivos */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                          {trabajador.festivos.map((fecha) => (
                            <div key={`festivo-${trabajador.id}-${fecha}`} 
                                 style={{ 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   justifyContent: 'space-between', 
                                   padding: '0.75rem', 
                                   background: '#fef3c7', 
                                   borderRadius: '0.5rem',
                                   border: '1px solid #fbbf24'
                                 }}>
                              <span style={{ color: '#92400e', fontWeight: '500' }}>
                                {formatearFecha(fecha)}
                              </span>
                              <button 
                                onClick={() => {/* eliminarFestivo(trabajador.id, fecha) */}}
                                style={{ 
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.festivos.length === 0 && (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '2rem', 
                              background: '#f8f9fa', 
                              borderRadius: '0.5rem',
                              border: '2px dashed #dee2e6'
                            }}>
                              <Calendar size={32} style={{ color: '#adb5bd', margin: '0 auto 0.5rem' }} />
                              <p style={{ color: '#666', margin: 0 }}>No hay días festivos configurados</p>
                            </div>
                          )}
                        </div>

                        {/* Límite de Reserva */}
                        <div style={{ 
                          background: '#fff7ed', 
                          border: '1px solid #fed7aa', 
                          borderRadius: '0.5rem', 
                          padding: '1rem' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Shield size={18} style={{ color: '#ea580c' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ea580c', margin: 0 }}>
                              Límite de Reserva
                            </h4>
                          </div>
                          <p style={{ color: '#9a3412', margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
                            Los clientes podrán reservar hasta <strong>{trabajador.limiteDiasReserva} días</strong> de antelación.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: '#f3f4f6', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <User size={40} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: '0 0 0.5rem 0' }}>
              No tienes trabajadores configurados
            </h3>
            <p style={{ color: '#666', margin: '0 0 1.5rem 0' }}>
              Añade tu primer trabajador para empezar a gestionar tu negocio
            </p>
            <button 
              onClick={() => document.querySelector('input')?.focus()}
              className="btn-primary"
            >
              Añadir Primer Trabajador
            </button>
          </div>
        )}

        {/* Resumen */}
        {trabajadores.length > 0 && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: '0 0 1rem 0' }}>
              Resumen de Configuración
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem' 
            }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#dbeafe', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d4ed8' }}>
                  {trabajadores.length}
                </div>
                <div style={{ color: '#1e40af', fontSize: '0.875rem', fontWeight: '500' }}>
                  Trabajadores
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#dcfce7', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                  {totalServicios}
                </div>
                <div style={{ color: '#15803d', fontSize: '0.875rem', fontWeight: '500' }}>
                  Servicios
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
                  {totalFestivos}
                </div>
                <div style={{ color: '#b45309', fontSize: '0.875rem', fontWeight: '500' }}>
                  Días Festivos
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}