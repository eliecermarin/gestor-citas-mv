import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, ChevronDown, ChevronUp, Euro, X, Coffee, AlertTriangle } from "lucide-react";
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

interface FranjaHoraria {
  inicio: string;
  fin: string;
}

interface HorariosTrabajo {
  [key: string]: FranjaHoraria[];
}

interface Trabajador {
  id: string;
  nombre: string;
  servicios: Servicio[];
  festivos: string[];
  horariosTrabajo: HorariosTrabajo;
  tiempoDescanso: number;
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
  horaInicio?: string;
  horaFin?: string;
  diasTrabajo?: string[];
  horariosTrabajo?: HorariosTrabajo;
  tiempoDescanso?: number;
  limiteDiasReserva?: number;
  user_id: string;
}

const diasSemana = [
  { id: 'lunes', nombre: 'Lunes', abrev: 'L' },
  { id: 'martes', nombre: 'Martes', abrev: 'M' },
  { id: 'miercoles', nombre: 'Miércoles', abrev: 'X' },
  { id: 'jueves', nombre: 'Jueves', abrev: 'J' },
  { id: 'viernes', nombre: 'Viernes', abrev: 'V' },
  { id: 'sabado', nombre: 'Sábado', abrev: 'S' },
  { id: 'domingo', nombre: 'Domingo', abrev: 'D' }
];

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
  const [columnasExisten, setColumnasExisten] = useState<boolean>(false);
  const [verificandoEstructura, setVerificandoEstructura] = useState<boolean>(true);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  };

  // 🔥 VERIFICAR ESTRUCTURA DE LA TABLA
  const verificarEstructuraTabla = async () => {
    try {
      setVerificandoEstructura(true);
      
      // Intentar hacer una consulta simple para verificar columnas
      const { data, error } = await supabase
        .from('trabajadores')
        .select('id, nombre, horariosTrabajo, tiempoDescanso, limiteDiasReserva')
        .limit(1);

      if (error) {
        console.log('🔍 Algunas columnas no existen:', error.message);
        setColumnasExisten(false);
        showMessage('⚠️ Faltan columnas en la base de datos. Consulta las instrucciones.');
      } else {
        console.log('✅ Todas las columnas existen');
        setColumnasExisten(true);
      }
    } catch (error) {
      console.error('Error verificando estructura:', error);
      setColumnasExisten(false);
    } finally {
      setVerificandoEstructura(false);
    }
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

      // Cargar trabajadores - Adaptativo según columnas disponibles
      let selectQuery = 'id, nombre, servicios, festivos, duracionCitaDefecto, user_id';
      
      if (columnasExisten) {
        selectQuery += ', horariosTrabajo, tiempoDescanso, limiteDiasReserva';
      } else {
        selectQuery += ', horaInicio, horaFin, diasTrabajo';
      }

      const { data: trabajadoresData, error: errorTrabajadores } = await supabase
        .from('trabajadores')
        .select(selectQuery)
        .eq('user_id', userId);

      if (errorTrabajadores) throw errorTrabajadores;

      // Procesar trabajadores con sus servicios y horarios
      const trabajadoresProcesados = (trabajadoresData || []).map((t: any) => {
        // Horarios - usar nuevas columnas si existen, sino formato antiguo
        let horariosTrabajo: HorariosTrabajo = {};
        
        if (columnasExisten && t.horariosTrabajo && Object.keys(t.horariosTrabajo).length > 0) {
          // Usar nuevas columnas
          horariosTrabajo = t.horariosTrabajo;
        } else if (t.diasTrabajo && t.horaInicio && t.horaFin) {
          // Migrar del formato antiguo
          t.diasTrabajo.forEach((dia: string) => {
            horariosTrabajo[dia] = [{
              inicio: t.horaInicio || '09:00',
              fin: t.horaFin || '18:00'
            }];
          });
        } else {
          // Configuración por defecto
          ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
            horariosTrabajo[dia] = [{
              inicio: '09:00',
              fin: '18:00'
            }];
          });
        }

        return {
          id: t.id,
          nombre: t.nombre,
          servicios: t.servicios ? 
            t.servicios.map((sId: number) => servicios?.find(s => s.id === sId)).filter(Boolean) || [] 
            : [],
          festivos: t.festivos || [],
          horariosTrabajo,
          tiempoDescanso: columnasExisten ? (t.tiempoDescanso || 0) : 0,
          limiteDiasReserva: columnasExisten ? (t.limiteDiasReserva || 30) : (t.duracionCitaDefecto || 30),
          user_id: t.user_id
        };
      });

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
  }, [trabajadorExpandido, columnasExisten]);

  // Verificar autenticación y cargar datos
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          await verificarEstructuraTabla();
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error de autenticación:', error);
        router.push('/login');
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  // Cargar datos después de verificar estructura
  useEffect(() => {
    if (user && !verificandoEstructura) {
      cargarDatos(user.id);
    }
  }, [user, verificandoEstructura, cargarDatos]);

  const inicializarEstadosTrabajador = (trabajadorId: string) => {
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || { nombre: "", duracion: 30, precio: 0, mostrarPrecio: true }
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
      
      // Preparar datos según columnas disponibles
      let trabajadorData: any = {
        nombre: nuevoTrabajador.trim(),
        servicios: [],
        festivos: [],
        duracionCitaDefecto: 30,
        user_id: user.id
      };

      if (columnasExisten) {
        // Horarios por defecto (Lunes a Viernes 9:00-18:00)
        const horariosDefecto: HorariosTrabajo = {};
        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
          horariosDefecto[dia] = [{ inicio: '09:00', fin: '18:00' }];
        });
        
        trabajadorData = {
          ...trabajadorData,
          horariosTrabajo: horariosDefecto,
          tiempoDescanso: 0,
          limiteDiasReserva: 30,
        };
      } else {
        // Formato antiguo
        trabajadorData = {
          ...trabajadorData,
          horaInicio: '09:00',
          horaFin: '18:00',
          diasTrabajo: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']
        };
      }

      const { data, error } = await supabase
        .from('trabajadores')
        .insert([trabajadorData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error:', error);
        throw error;
      }

      // Crear objeto trabajador para el estado local
      const horariosDefecto: HorariosTrabajo = {};
      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
        horariosDefecto[dia] = [{ inicio: '09:00', fin: '18:00' }];
      });

      const nuevoTrab = {
        id: data.id,
        nombre: data.nombre,
        servicios: [],
        festivos: data.festivos || [],
        horariosTrabajo: columnasExisten ? (data.horariosTrabajo || horariosDefecto) : horariosDefecto,
        tiempoDescanso: columnasExisten ? (data.tiempoDescanso || 0) : 0,
        limiteDiasReserva: columnasExisten ? (data.limiteDiasReserva || 30) : 30,
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
  };

  const eliminarTrabajador = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este trabajador?')) return;
    
    try {
      const { error } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      const trabajadoresRestantes = trabajadores.filter(t => t.id !== id);
      setTrabajadores(trabajadoresRestantes);
      
      if (trabajadorExpandido === id) {
        setTrabajadorExpandido(trabajadoresRestantes[0]?.id || null);
      }
      showMessage("Trabajador eliminado");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador");
    }
  };

  const agregarServicio = async (trabajadorId: string) => {
    const nuevoServicio = nuevosServicios[trabajadorId];
    if (!nuevoServicio || !nuevoServicio.nombre.trim() || !user) return;

    try {
      // Primero crear el servicio global
      const { data: servicioCreado, error: errorServicio } = await supabase
        .from('servicios')
        .insert([{
          nombre: nuevoServicio.nombre.trim(),
          duracion: nuevoServicio.duracion,
          precio: nuevoServicio.precio,
          user_id: user.id
        }])
        .select()
        .single();

      if (errorServicio) throw errorServicio;

      // Actualizar lista de servicios globales
      setServiciosGlobales([...serviciosGlobales, servicioCreado]);

      // Agregar servicio al trabajador
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const serviciosActualizados = [...trabajador.servicios, servicioCreado];
      const idsServicios = serviciosActualizados.map(s => s.id);

      const { error: errorActualizar } = await supabase
        .from('trabajadores')
        .update({ servicios: idsServicios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (errorActualizar) throw errorActualizar;

      // Actualizar estado local
      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, servicios: serviciosActualizados };
        }
        return t;
      }));

      // Limpiar formulario
      setNuevosServicios(prev => ({
        ...prev,
        [trabajadorId]: { nombre: "", duracion: 30, precio: 0, mostrarPrecio: true }
      }));

      showMessage("Servicio agregado exitosamente");
    } catch (error) {
      console.error('Error agregando servicio:', error);
      showMessage("Error agregando servicio");
    }
  };

  const eliminarServicio = async (trabajadorId: string, servicioId: number) => {
    if (!user || !confirm('¿Estás seguro de que quieres quitar este servicio del trabajador?')) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const serviciosActualizados = trabajador.servicios.filter(s => s.id !== servicioId);
      const idsServicios = serviciosActualizados.map(s => s.id);

      const { error } = await supabase
        .from('trabajadores')
        .update({ servicios: idsServicios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, servicios: serviciosActualizados };
        }
        return t;
      }));
      
      showMessage("Servicio eliminado del trabajador");
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      showMessage("Error eliminando servicio");
    }
  };

  const agregarFestivo = async (trabajadorId: string) => {
    const nuevaFecha = nuevasFechasFestivas[trabajadorId];
    if (!nuevaFecha || !user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      if (trabajador.festivos.includes(nuevaFecha)) {
        showMessage("Esta fecha ya está marcada como festiva");
        return;
      }

      const festivosActualizados = [...trabajador.festivos, nuevaFecha].sort();

      const { error } = await supabase
        .from('trabajadores')
        .update({ festivos: festivosActualizados })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, festivos: festivosActualizados };
        }
        return t;
      }));
      
      setNuevasFechasFestivas(prev => ({
        ...prev,
        [trabajadorId]: ""
      }));
      
      showMessage("Día festivo agregado");
    } catch (error) {
      console.error('Error agregando festivo:', error);
      showMessage("Error agregando día festivo");
    }
  };

  const eliminarFestivo = async (trabajadorId: string, fecha: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres quitar este día festivo?')) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const festivosActualizados = trabajador.festivos.filter(f => f !== fecha);

      const { error } = await supabase
        .from('trabajadores')
        .update({ festivos: festivosActualizados })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, festivos: festivosActualizados };
        }
        return t;
      }));
      
      showMessage("Día festivo eliminado");
    } catch (error) {
      console.error('Error eliminando festivo:', error);
      showMessage("Error eliminando día festivo");
    }
  };

  // 🔥 FUNCIÓN: Agregar franja horaria (solo si columnas existen)
  const agregarFranjaHoraria = async (trabajadorId: string, dia: string) => {
    if (!user || !columnasExisten) {
      showMessage("⚠️ Esta función requiere actualizar la base de datos");
      return;
    }
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const nuevosHorarios = { ...trabajador.horariosTrabajo };
      if (!nuevosHorarios[dia]) {
        nuevosHorarios[dia] = [];
      }
      
      // Agregar nueva franja por defecto
      nuevosHorarios[dia].push({ inicio: '09:00', fin: '18:00' });

      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: nuevosHorarios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: nuevosHorarios };
        }
        return t;
      }));
      
      showMessage("Franja horaria agregada");
    } catch (error) {
      console.error('Error agregando franja horaria:', error);
      showMessage("Error agregando franja horaria");
    }
  };

  // 🔥 FUNCIÓN: Eliminar franja horaria (solo si columnas existen)
  const eliminarFranjaHoraria = async (trabajadorId: string, dia: string, indice: number) => {
    if (!user || !columnasExisten) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const nuevosHorarios = { ...trabajador.horariosTrabajo };
      if (nuevosHorarios[dia] && nuevosHorarios[dia].length > 1) {
        nuevosHorarios[dia].splice(indice, 1);
      } else {
        // Si solo hay una franja, la eliminamos pero dejamos el día sin horarios
        delete nuevosHorarios[dia];
      }

      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: nuevosHorarios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: nuevosHorarios };
        }
        return t;
      }));
      
      showMessage("Franja horaria eliminada");
    } catch (error) {
      console.error('Error eliminando franja horaria:', error);
      showMessage("Error eliminando franja horaria");
    }
  };

  // 🔥 FUNCIÓN: Actualizar franja horaria (solo si columnas existen)
  const actualizarFranjaHoraria = async (trabajadorId: string, dia: string, indice: number, campo: 'inicio' | 'fin', valor: string) => {
    if (!user || !columnasExisten) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const nuevosHorarios = { ...trabajador.horariosTrabajo };
      if (nuevosHorarios[dia] && nuevosHorarios[dia][indice]) {
        nuevosHorarios[dia][indice][campo] = valor;
      }

      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: nuevosHorarios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: nuevosHorarios };
        }
        return t;
      }));
      
    } catch (error) {
      console.error('Error actualizando franja horaria:', error);
      showMessage("Error actualizando franja horaria");
    }
  };

  // 🔥 FUNCIÓN: Actualizar configuración avanzada (solo si columnas existen)
  const actualizarConfiguracionAvanzada = async (trabajadorId: string, campo: 'tiempoDescanso' | 'limiteDiasReserva', valor: number) => {
    if (!user || !columnasExisten) {
      showMessage("⚠️ Esta función requiere actualizar la base de datos");
      return;
    }
    
    try {
      const updateData = { [campo]: valor };
      
      const { error } = await supabase
        .from('trabajadores')
        .update(updateData)
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, [campo]: valor };
        }
        return t;
      }));
      
      showMessage("Configuración actualizada");
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      showMessage("Error actualizando configuración");
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

  const obtenerResumenHorarios = (horarios: HorariosTrabajo): string => {
    const diasConHorarios = Object.keys(horarios).length;
    if (diasConHorarios === 0) return "Sin horarios";
    
    const totalFranjas = Object.values(horarios).reduce((total, franjas) => total + franjas.length, 0);
    return `${diasConHorarios} días • ${totalFranjas} franjas`;
  };

  if (verificandoEstructura) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Verificando estructura de la base de datos...</p>
        </div>
      </div>
    );
  }

  if (isLoading && trabajadores.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
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
      padding: '1rem'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea, #764ba2)', 
              padding: '1rem', 
              borderRadius: '0.75rem',
              color: 'white',
              flexShrink: 0
            }}>
              <Settings size={24} />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 'bold', color: '#1a202c', margin: 0 }}>
                Configuración del Negocio
              </h1>
              <p style={{ color: '#666', margin: '0.5rem 0 0 0', fontSize: 'clamp(0.875rem, 2.5vw, 1rem)' }}>
                Gestiona tu equipo, servicios y horarios de trabajo
              </p>
              {user && (
                <p style={{ color: '#667eea', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                  Usuario: {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Alerta de estructura si es necesario */}
          {!columnasExisten && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '0.75rem',
              padding: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.125rem' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', margin: '0 0 0.5rem 0' }}>
                  Base de datos desactualizada
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 0.75rem 0' }}>
                  Para usar las funciones avanzadas (franjas horarias, tiempo de descanso), ejecuta este SQL en Supabase:
                </p>
                <code style={{ 
                  display: 'block', 
                  background: '#92400e20', 
                  padding: '0.5rem', 
                  borderRadius: '0.25rem', 
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#92400e',
                  whiteSpace: 'pre-wrap'
                }}>
                  {`ALTER TABLE trabajadores 
ADD COLUMN horariosTrabajo JSONB DEFAULT '{}',
ADD COLUMN tiempoDescanso INTEGER DEFAULT 0,
ADD COLUMN limiteDiasReserva INTEGER DEFAULT 30;`}
                </code>
                <button
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  style={{
                    marginTop: '0.5rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Abrir Supabase Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Toast */}
        {message && (
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: message.includes('Error') || message.includes('⚠️') ? '#ef4444' : '#10b981',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            fontWeight: '600',
            fontSize: '0.875rem',
            maxWidth: 'calc(100vw - 2rem)'
          }}>
            {message}
          </div>
        )}

        {/* Agregar Trabajador */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Plus size={20} style={{ color: '#667eea' }} />
            <h2 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', fontWeight: '600', color: '#1a202c', margin: 0 }}>
              Agregar Nuevo Trabajador
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              value={nuevoTrabajador}
              onChange={(e) => setNuevoTrabajador(e.target.value)}
              placeholder="Nombre del trabajador"
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
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
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: (!nuevoTrabajador.trim() || isLoading) ? 0.6 : 1,
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                width: '100%'
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
                    padding: '1rem',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                  onClick={() => toggleTrabajador(trabajador.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: 'rgba(255, 255, 255, 0.2)', 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <User size={20} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: '600', margin: 0 }}>
                          {trabajador.nombre}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)' }}>
                          {trabajador.servicios.length} servicios • {obtenerResumenHorarios(trabajador.horariosTrabajo)}
                          {columnasExisten && trabajador.tiempoDescanso > 0 && ` • ${trabajador.tiempoDescanso}min descanso`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
                      display: 'flex',
                      flexDirection: 'column',
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
                        
                        {/* Formulario para agregar servicio */}
                        <div style={{ 
                          background: '#f8f9fa', 
                          padding: '1rem', 
                          borderRadius: '0.75rem', 
                          marginBottom: '1rem',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                Nombre del servicio
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: Corte de pelo"
                                value={nuevosServicios[trabajador.id]?.nombre || ''}
                                onChange={(e) => setNuevosServicios(prev => ({
                                  ...prev,
                                  [trabajador.id]: {
                                    ...prev[trabajador.id],
                                    nombre: e.target.value
                                  }
                                }))}
                                style={{ 
                                  padding: '0.75rem', 
                                  border: '1px solid #ddd', 
                                  borderRadius: '0.5rem',
                                  fontSize: '0.875rem',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                              <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                  <Clock size={14} />
                                  Duración (min)
                                </label>
                                <input
                                  type="number"
                                  placeholder="30"
                                  value={nuevosServicios[trabajador.id]?.duracion || 30}
                                  onChange={(e) => setNuevosServicios(prev => ({
                                    ...prev,
                                    [trabajador.id]: {
                                      ...prev[trabajador.id],
                                      duracion: parseInt(e.target.value) || 30
                                    }
                                  }))}
                                  style={{ 
                                    padding: '0.75rem', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                  min="1"
                                />
                              </div>
                              
                              <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                  <Euro size={14} />
                                  Precio (€)
                                </label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={nuevosServicios[trabajador.id]?.precio || 0}
                                  onChange={(e) => setNuevosServicios(prev => ({
                                    ...prev,
                                    [trabajador.id]: {
                                      ...prev[trabajador.id],
                                      precio: parseFloat(e.target.value) || 0
                                    }
                                  }))}
                                  style={{ 
                                    padding: '0.75rem', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                            
                            <button
                              onClick={() => agregarServicio(trabajador.id)}
                              disabled={!nuevosServicios[trabajador.id]?.nombre?.trim()}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                opacity: !nuevosServicios[trabajador.id]?.nombre?.trim() ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%'
                              }}
                            >
                              <Plus size={16} />
                              Agregar Servicio
                            </button>
                          </div>
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
                                   background: '#f0fdf4', 
                                   borderRadius: '0.5rem',
                                   border: '1px solid #bbf7d0',
                                   gap: '1rem'
                                 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ fontWeight: '600', color: '#1a202c', margin: 0, fontSize: '0.9rem' }}>
                                  {servicio.nombre}
                                </h5>
                                <p style={{ color: '#666', margin: '0.25rem 0 0 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Clock size={12} />
                                    {servicio.duracion} min
                                  </span>
                                  {servicio.precio > 0 && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Euro size={12} />
                                      {servicio.precio}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button 
                                onClick={() => eliminarServicio(trabajador.id, servicio.id)}
                                style={{ 
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  padding: '0.5rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title="Eliminar servicio"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.servicios.length === 0 && (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '2rem 1rem', 
                              background: '#f8f9fa', 
                              borderRadius: '0.5rem',
                              border: '2px dashed #dee2e6'
                            }}>
                              <Clock size={32} style={{ color: '#adb5bd', margin: '0 auto 0.5rem' }} />
                              <p style={{ color: '#666', margin: 0, fontSize: '0.875rem' }}>No hay servicios configurados</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Horarios de Trabajo con Franjas */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Clock size={20} style={{ color: '#3b82f6' }} />
                          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                            Horarios de Trabajo
                            {!columnasExisten && (
                              <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '0.5rem' }}>
                                (Requiere actualización BD)
                              </span>
                            )}
                          </h4>
                        </div>
                        
                        <div style={{ 
                          background: columnasExisten ? '#f0f9ff' : '#fef3c7', 
                          padding: '1rem', 
                          borderRadius: '0.75rem', 
                          border: `1px solid ${columnasExisten ? '#bfdbfe' : '#fbbf24'}`
                        }}>
                          {diasSemana.map((dia) => (
                            <div key={dia.id} style={{ marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <h5 style={{ fontSize: '1rem', fontWeight: '600', color: columnasExisten ? '#1e40af' : '#92400e', margin: 0 }}>
                                  {dia.nombre}
                                </h5>
                                <button
                                  onClick={() => agregarFranjaHoraria(trabajador.id, dia.id)}
                                  disabled={!columnasExisten}
                                  style={{
                                    background: columnasExisten ? '#3b82f6' : '#9ca3af',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    cursor: columnasExisten ? 'pointer' : 'not-allowed',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    opacity: columnasExisten ? 1 : 0.5
                                  }}
                                >
                                  <Plus size={12} />
                                  Franja
                                </button>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {trabajador.horariosTrabajo[dia.id]?.map((franja, index) => (
                                  <div key={index} style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    background: 'white',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #d1d5db'
                                  }}>
                                    <input
                                      type="time"
                                      value={franja.inicio}
                                      onChange={(e) => actualizarFranjaHoraria(trabajador.id, dia.id, index, 'inicio', e.target.value)}
                                      disabled={!columnasExisten}
                                      style={{
                                        padding: '0.25rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        width: '80px',
                                        opacity: columnasExisten ? 1 : 0.7
                                      }}
                                    />
                                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>-</span>
                                    <input
                                      type="time"
                                      value={franja.fin}
                                      onChange={(e) => actualizarFranjaHoraria(trabajador.id, dia.id, index, 'fin', e.target.value)}
                                      disabled={!columnasExisten}
                                      style={{
                                        padding: '0.25rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        width: '80px',
                                        opacity: columnasExisten ? 1 : 0.7
                                      }}
                                    />
                                    <button
                                      onClick={() => eliminarFranjaHoraria(trabajador.id, dia.id, index)}
                                      disabled={!columnasExisten}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: columnasExisten ? '#ef4444' : '#9ca3af',
                                        padding: '0.25rem',
                                        borderRadius: '0.25rem',
                                        cursor: columnasExisten ? 'pointer' : 'not-allowed',
                                        marginLeft: 'auto'
                                      }}
                                      title="Eliminar franja"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                )) || (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    padding: '1rem', 
                                    color: '#6b7280', 
                                    fontSize: '0.875rem',
                                    fontStyle: 'italic'
                                  }}>
                                    Sin horarios configurados
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Configuración Avanzada */}
                      {columnasExisten && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Settings size={20} style={{ color: '#f59e0b' }} />
                            <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                              Configuración Avanzada
                            </h4>
                          </div>

                          <div style={{ 
                            background: '#fff7ed', 
                            border: '1px solid #fed7aa', 
                            borderRadius: '0.75rem', 
                            padding: '1rem'
                          }}>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#ea580c', marginBottom: '0.5rem' }}>
                                  <Coffee size={16} />
                                  Tiempo de descanso entre citas (minutos)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  step="5"
                                  value={trabajador.tiempoDescanso}
                                  onChange={(e) => actualizarConfiguracionAvanzada(trabajador.id, 'tiempoDescanso', parseInt(e.target.value) || 0)}
                                  style={{
                                    padding: '0.5rem',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '80px',
                                    textAlign: 'center'
                                  }}
                                />
                                <p style={{ color: '#9a3412', margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>
                                  Tiempo libre automático entre citas consecutivas
                                </p>
                              </div>

                              <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#ea580c', marginBottom: '0.5rem' }}>
                                  <Shield size={16} />
                                  Límite de reserva (días de antelación)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="365"
                                  value={trabajador.limiteDiasReserva}
                                  onChange={(e) => actualizarConfiguracionAvanzada(trabajador.id, 'limiteDiasReserva', parseInt(e.target.value) || 30)}
                                  style={{
                                    padding: '0.5rem',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '80px',
                                    textAlign: 'center'
                                  }}
                                />
                                <p style={{ color: '#9a3412', margin: '0.5rem 0 0 0', fontSize: '0.75rem' }}>
                                  Los clientes podrán reservar hasta este número de días de antelación
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Días Festivos */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                          <Calendar size={20} style={{ color: '#8b5cf6' }} />
                          <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                            Días Festivos
                          </h4>
                        </div>

                        <div style={{ 
                          background: '#f8f9fa', 
                          padding: '1rem', 
                          borderRadius: '0.75rem', 
                          marginBottom: '1rem',
                          border: '1px solid #e9ecef'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                                Seleccionar fecha
                              </label>
                              <input
                                type="date"
                                value={nuevasFechasFestivas[trabajador.id] || ''}
                                onChange={(e) => setNuevasFechasFestivas(prev => ({
                                  ...prev,
                                  [trabajador.id]: e.target.value
                                }))}
                                min={new Date().toISOString().split('T')[0]}
                                style={{ 
                                  padding: '0.75rem', 
                                  border: '1px solid #ddd', 
                                  borderRadius: '0.5rem',
                                  fontSize: '0.875rem',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <button
                              onClick={() => agregarFestivo(trabajador.id)}
                              disabled={!nuevasFechasFestivas[trabajador.id]}
                              style={{
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                opacity: !nuevasFechasFestivas[trabajador.id] ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                width: '100%'
                              }}
                            >
                              <Plus size={16} />
                              Agregar Día Festivo
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {trabajador.festivos.map((fecha) => (
                            <div key={`festivo-${trabajador.id}-${fecha}`} 
                                 style={{ 
                                   display: 'flex', 
                                   alignItems: 'center', 
                                   justifyContent: 'space-between', 
                                   padding: '0.75rem', 
                                   background: '#fef3c7', 
                                   borderRadius: '0.5rem',
                                   border: '1px solid #fbbf24',
                                   gap: '1rem'
                                 }}>
                              <span style={{ color: '#92400e', fontWeight: '500', fontSize: '0.875rem', flex: 1 }}>
                                {formatearFecha(fecha)}
                              </span>
                              <button 
                                onClick={() => eliminarFestivo(trabajador.id, fecha)}
                                style={{ 
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  padding: '0.25rem',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                title="Eliminar día festivo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.festivos.length === 0 && (
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '2rem 1rem', 
                              background: '#f8f9fa', 
                              borderRadius: '0.5rem',
                              border: '2px dashed #dee2e6'
                            }}>
                              <Calendar size={32} style={{ color: '#adb5bd', margin: '0 auto 0.5rem' }} />
                              <p style={{ color: '#666', margin: 0, fontSize: '0.875rem' }}>No hay días festivos configurados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
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