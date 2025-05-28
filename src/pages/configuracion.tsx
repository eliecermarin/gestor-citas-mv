import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, AlertCircle, Euro, Edit, X } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

interface Servicio {
  id: number;
  nombre: string;
  duracion: number;
  precio: number;
  user_id?: string;
}

interface FranjaHoraria {
  inicio: string;
  fin: string;
}

interface HorarioDia {
  activo: boolean;
  franjas: FranjaHoraria[];
}

interface Trabajador {
  id: string;
  nombre: string;
  servicios: Servicio[];
  festivos: string[];
  horariosTrabajo: Record<string, HorarioDia>;
  tiempoDescanso: number;
  limiteDiasReserva: number;
  user_id?: string;
}

interface NuevoServicio {
  nombre: string;
  duracion: number;
  precio: number;
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
  horariosTrabajo: Record<string, HorarioDia>;
  tiempoDescanso: number;
  limiteDiasReserva: number;
  user_id: string;
}

const DIAS_SEMANA = [
  { key: 'lunes', nombre: 'Lunes' },
  { key: 'martes', nombre: 'Martes' },
  { key: 'miercoles', nombre: 'Miércoles' },
  { key: 'jueves', nombre: 'Jueves' },
  { key: 'viernes', nombre: 'Viernes' },
  { key: 'sabado', nombre: 'Sábado' },
  { key: 'domingo', nombre: 'Domingo' }
];

const HORARIOS_DEFAULT: Record<string, HorarioDia> = {
  lunes: { activo: true, franjas: [{ inicio: "09:00", fin: "18:00" }] },
  martes: { activo: true, franjas: [{ inicio: "09:00", fin: "18:00" }] },
  miercoles: { activo: true, franjas: [{ inicio: "09:00", fin: "18:00" }] },
  jueves: { activo: true, franjas: [{ inicio: "09:00", fin: "18:00" }] },
  viernes: { activo: true, franjas: [{ inicio: "09:00", fin: "18:00" }] },
  sabado: { activo: false, franjas: [] },
  domingo: { activo: false, franjas: [] }
};

export default function ConfiguracionMejorada() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [serviciosGlobales, setServiciosGlobales] = useState<Servicio[]>([]);
  const [nuevoTrabajador, setNuevoTrabajador] = useState<string>("");
  const [trabajadorExpandido, setTrabajadorExpandido] = useState<string | null>(null);
  const [seccionExpandida, setSeccionExpandida] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' }>({ text: "", type: 'success' });
  const [nuevosServicios, setNuevosServicios] = useState<Record<string, NuevoServicio>>({});
  const [nuevasFechasFestivas, setNuevasFechasFestivas] = useState<Record<string, string>>({});

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: 'success' }), 4000);
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
        horariosTrabajo: t.horariosTrabajo || HORARIOS_DEFAULT,
        tiempoDescanso: t.tiempoDescanso || 15,
        limiteDiasReserva: t.limiteDiasReserva || 30,
        user_id: t.user_id
      }));

      setTrabajadores(trabajadoresProcesados);
      
      // Inicializar estados para cada trabajador
      trabajadoresProcesados.forEach((t: Trabajador) => inicializarEstadosTrabajador(t.id));
      
      if (trabajadoresProcesados.length > 0 && !trabajadorExpandido) {
        setTrabajadorExpandido(trabajadoresProcesados[0].id);
        setSeccionExpandida({ [trabajadoresProcesados[0].id]: 'servicios' });
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      showMessage('Error cargando configuración', 'error');
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
      [trabajadorId]: prev[trabajadorId] || { nombre: "", duracion: 30, precio: 0 }
    }));
    
    setNuevasFechasFestivas(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || ""
    }));
  };

  const agregarTrabajador = async () => {
    if (!nuevoTrabajador.trim() || !user) return;
    
    try {
      const trabajadorData = {
        nombre: nuevoTrabajador.trim(),
        servicios: [],
        festivos: [],
        horariosTrabajo: HORARIOS_DEFAULT,
        tiempoDescanso: 15,
        limiteDiasReserva: 30,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('trabajadores')
        .insert([trabajadorData])
        .select()
        .single();

      if (error) throw error;

      const nuevoTrab = {
        id: data.id,
        nombre: data.nombre,
        servicios: [],
        festivos: data.festivos || [],
        horariosTrabajo: data.horariosTrabajo || HORARIOS_DEFAULT,
        tiempoDescanso: data.tiempoDescanso || 15,
        limiteDiasReserva: data.limiteDiasReserva || 30,
        user_id: data.user_id
      };
      
      setTrabajadores([...trabajadores, nuevoTrab]);
      setNuevoTrabajador("");
      setTrabajadorExpandido(data.id);
      setSeccionExpandida({ [data.id]: 'servicios' });
      inicializarEstadosTrabajador(data.id);
      showMessage("Trabajador agregado exitosamente");

    } catch (error: any) {
      console.error('Error creando trabajador:', error);
      showMessage(`Error: ${error.message || 'Error desconocido'}`, 'error');
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
        if (trabajadoresRestantes[0]) {
          setSeccionExpandida({ [trabajadoresRestantes[0].id]: 'servicios' });
        }
      }
      showMessage("Trabajador eliminado");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador", 'error');
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
        [trabajadorId]: { nombre: "", duracion: 30, precio: 0 }
      }));

      showMessage("Servicio agregado exitosamente");
    } catch (error) {
      console.error('Error agregando servicio:', error);
      showMessage("Error agregando servicio", 'error');
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
      showMessage("Error eliminando servicio", 'error');
    }
  };

  const agregarFestivo = async (trabajadorId: string) => {
    const nuevaFecha = nuevasFechasFestivas[trabajadorId];
    if (!nuevaFecha || !user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      if (trabajador.festivos.includes(nuevaFecha)) {
        showMessage("Esta fecha ya está marcada como festiva", 'error');
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
      showMessage("Error agregando día festivo", 'error');
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
      showMessage("Error eliminando día festivo", 'error');
    }
  };

  const actualizarHorarioTrabajador = async (trabajadorId: string, horarios: Record<string, HorarioDia>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: horarios })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: horarios };
        }
        return t;
      }));
      
      showMessage("Horarios actualizados");
    } catch (error) {
      console.error('Error actualizando horarios:', error);
      showMessage("Error actualizando horarios", 'error');
    }
  };

  const actualizarConfiguracionTrabajador = async (trabajadorId: string, campo: string, valor: any) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trabajadores')
        .update({ [campo]: valor })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, [campo]: valor };
        }
        return t;
      }));
      
      showMessage(`${campo === 'tiempoDescanso' ? 'Tiempo de descanso' : 'Límite de reserva'} actualizado`);
    } catch (error) {
      console.error(`Error actualizando ${campo}:`, error);
      showMessage(`Error actualizando ${campo}`, 'error');
    }
  };

  const agregarFranjaHoraria = (trabajadorId: string, dia: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return;

    const nuevosHorarios = { ...trabajador.horariosTrabajo };
    if (!nuevosHorarios[dia]) {
      nuevosHorarios[dia] = { activo: true, franjas: [] };
    }
    
    nuevosHorarios[dia].franjas.push({ inicio: "09:00", fin: "18:00" });
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return { ...t, horariosTrabajo: nuevosHorarios };
      }
      return t;
    }));
  };

  const eliminarFranjaHoraria = (trabajadorId: string, dia: string, franjaIndex: number) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return;

    const nuevosHorarios = { ...trabajador.horariosTrabajo };
    nuevosHorarios[dia].franjas.splice(franjaIndex, 1);
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return { ...t, horariosTrabajo: nuevosHorarios };
      }
      return t;
    }));
  };

  const actualizarFranjaHoraria = (trabajadorId: string, dia: string, franjaIndex: number, campo: 'inicio' | 'fin', valor: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return;

    const nuevosHorarios = { ...trabajador.horariosTrabajo };
    nuevosHorarios[dia].franjas[franjaIndex][campo] = valor;
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return { ...t, horariosTrabajo: nuevosHorarios };
      }
      return t;
    }));
  };

  const toggleDiaActivo = (trabajadorId: string, dia: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return;

    const nuevosHorarios = { ...trabajador.horariosTrabajo };
    nuevosHorarios[dia].activo = !nuevosHorarios[dia].activo;
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return { ...t, horariosTrabajo: nuevosHorarios };
      }
      return t;
    }));
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
    if (trabajadorExpandido !== id) {
      setSeccionExpandida({ [id]: 'servicios' });
    }
  };

  const toggleSeccion = (trabajadorId: string, seccion: string) => {
    setSeccionExpandida(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] === seccion ? '' : seccion
    }));
  };

  if (isLoading && trabajadores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const totalServicios = trabajadores.reduce((total, t) => total + t.servicios.length, 0);
  const totalFestivos = trabajadores.reduce((total, t) => total + t.festivos.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-3 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-full">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Configuración del Negocio</h1>
                <p className="text-gray-600 text-sm md:text-base">Gestiona tu equipo, servicios y disponibilidad</p>
                {user && (
                  <p className="text-xs text-blue-600">Usuario: {user.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            message.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          } text-white font-medium max-w-sm`}>
            {message.text}
          </div>
        )}

        {/* Agregar Trabajador */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">Agregar Nuevo Trabajador</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={nuevoTrabajador}
              onChange={(e) => setNuevoTrabajador(e.target.value)}
              placeholder="Nombre del trabajador"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && agregarTrabajador()}
              disabled={isLoading}
            />
            <button 
              onClick={agregarTrabajador}
              disabled={isLoading || !nuevoTrabajador.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Añadir Trabajador
            </button>
          </div>
        </div>

        {/* Lista de Trabajadores */}
        {trabajadores.length > 0 ? (
          <div className="space-y-6">
            {trabajadores.map((trabajador) => (
              <div key={trabajador.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header del Trabajador */}
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 md:p-6 cursor-pointer"
                  onClick={() => toggleTrabajador(trabajador.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg md:text-xl font-semibold text-white truncate">
                          {trabajador.nombre}
                        </h3>
                        <p className="text-white/80 text-sm">
                          {trabajador.servicios.length} servicios • {trabajador.festivos.length} días festivos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarTrabajador(trabajador.id);
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-red-500 transition-colors"
                        title="Eliminar trabajador"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                      {trabajadorExpandido === trabajador.id ? 
                        <ChevronUp className="w-5 h-5 text-white" /> : 
                        <ChevronDown className="w-5 h-5 text-white" />
                      }
                    </div>
                  </div>
                </div>

                {/* Contenido Expandible */}
                {trabajadorExpandido === trabajador.id && (
                  <div className="p-4 md:p-6">
                    {/* Navegación de Secciones */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
                      {[
                        { key: 'servicios', label: 'Servicios', icon: Clock },
                        { key: 'horarios', label: 'Horarios', icon: Calendar },
                        { key: 'festivos', label: 'Días Festivos', icon: Calendar },
                        { key: 'configuracion', label: 'Configuración', icon: Settings }
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => toggleSeccion(trabajador.id, key)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            seccionExpandida[trabajador.id] === key
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Sección Servicios */}
                    {seccionExpandida[trabajador.id] === 'servicios' && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-green-600" />
                          Gestión de Servicios
                        </h4>
                        
                        {/* Formulario para agregar servicio */}
                        <div className="bg-gray-50 rounded-xl p-4 border">
                          <div className="grid gap-4">
                            <input
                              type="text"
                              placeholder="Nombre del servicio"
                              value={nuevosServicios[trabajador.id]?.nombre || ''}
                              onChange={(e) => setNuevosServicios(prev => ({
                                ...prev,
                                [trabajador.id]: {
                                  ...prev[trabajador.id],
                                  nombre: e.target.value
                                }
                              }))}
                              className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                type="number"
                                placeholder="Duración (min)"
                                value={nuevosServicios[trabajador.id]?.duracion || 30}
                                onChange={(e) => setNuevosServicios(prev => ({
                                  ...prev,
                                  [trabajador.id]: {
                                    ...prev[trabajador.id],
                                    duracion: parseInt(e.target.value) || 30
                                  }
                                }))}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                min="1"
                              />
                              <input
                                type="number"
                                placeholder="Precio (€)"
                                value={nuevosServicios[trabajador.id]?.precio || 0}
                                onChange={(e) => setNuevosServicios(prev => ({
                                  ...prev,
                                  [trabajador.id]: {
                                    ...prev[trabajador.id],
                                    precio: parseFloat(e.target.value) || 0
                                  }
                                }))}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <button
                              onClick={() => agregarServicio(trabajador.id)}
                              disabled={!nuevosServicios[trabajador.id]?.nombre?.trim()}
                              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Agregar Servicio
                            </button>
                          </div>
                        </div>
                        
                        {/* Lista de Servicios */}
                        <div className="space-y-3">
                          {trabajador.servicios.map((servicio) => (
                            <div key={`servicio-${trabajador.id}-${servicio.id}`} 
                                 className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800">{servicio.nombre}</h5>
                                <p className="text-gray-600 text-sm">
                                  {servicio.duracion} min
                                  {servicio.precio > 0 && (
                                    <span className="ml-2 inline-flex items-center gap-1">
                                      <Euro className="w-3 h-3" />
                                      {servicio.precio}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button 
                                onClick={() => eliminarServicio(trabajador.id, servicio.id)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                title="Eliminar servicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.servicios.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No hay servicios configurados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sección Horarios */}
                    {seccionExpandida[trabajador.id] === 'horarios' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Horarios de Trabajo
                          </h4>
                          <button
                            onClick={() => actualizarHorarioTrabajador(trabajador.id, trabajador.horariosTrabajo)}
                            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Guardar Horarios
                          </button>
                        </div>
                        
                        <div className="space-y-6">
                          {DIAS_SEMANA.map(({ key, nombre }) => (
                            <div key={key} className="border border-gray-200 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={trabajador.horariosTrabajo[key]?.activo || false}
                                      onChange={() => toggleDiaActivo(trabajador.id, key)}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="font-semibold text-gray-800">{nombre}</span>
                                  </label>
                                </div>
                                {trabajador.horariosTrabajo[key]?.activo && (
                                  <button
                                    onClick={() => agregarFranjaHoraria(trabajador.id, key)}
                                    className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Franja
                                  </button>
                                )}
                              </div>
                              
                              {trabajador.horariosTrabajo[key]?.activo && (
                                <div className="space-y-3">
                                  {(trabajador.horariosTrabajo[key]?.franjas || []).map((franja, franjaIndex) => (
                                    <div key={franjaIndex} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                      <span className="text-sm text-gray-600 font-medium min-w-0">
                                        Franja {franjaIndex + 1}:
                                      </span>
                                      <input
                                        type="time"
                                        value={franja.inicio}
                                        onChange={(e) => actualizarFranjaHoraria(trabajador.id, key, franjaIndex, 'inicio', e.target.value)}
                                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                                      />
                                      <span className="text-gray-500">-</span>
                                      <input
                                        type="time"
                                        value={franja.fin}
                                        onChange={(e) => actualizarFranjaHoraria(trabajador.id, key, franjaIndex, 'fin', e.target.value)}
                                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                                      />
                                      {(trabajador.horariosTrabajo[key]?.franjas || []).length > 1 && (
                                        <button
                                          onClick={() => eliminarFranjaHoraria(trabajador.id, key, franjaIndex)}
                                          className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                          title="Eliminar franja"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sección Días Festivos */}
                    {seccionExpandida[trabajador.id] === 'festivos' && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          Días Festivos
                        </h4>

                        {/* Formulario para agregar festivo */}
                        <div className="bg-gray-50 rounded-xl p-4 border">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="date"
                              value={nuevasFechasFestivas[trabajador.id] || ''}
                              onChange={(e) => setNuevasFechasFestivas(prev => ({
                                ...prev,
                                [trabajador.id]: e.target.value
                              }))}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              onClick={() => agregarFestivo(trabajador.id)}
                              disabled={!nuevasFechasFestivas[trabajador.id]}
                              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Agregar Día Festivo
                            </button>
                          </div>
                        </div>

                        {/* Lista de Días Festivos */}
                        <div className="space-y-3">
                          {trabajador.festivos.map((fecha) => (
                            <div key={`festivo-${trabajador.id}-${fecha}`} 
                                 className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <span className="text-yellow-800 font-medium">
                                {formatearFecha(fecha)}
                              </span>
                              <button 
                                onClick={() => eliminarFestivo(trabajador.id, fecha)}
                                className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                                title="Eliminar día festivo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.festivos.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No hay días festivos configurados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sección Configuración */}
                    {seccionExpandida[trabajador.id] === 'configuracion' && (
                      <div className="space-y-6">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <Settings className="w-5 h-5 text-orange-600" />
                          Configuración Avanzada
                        </h4>
                        
                        <div className="grid gap-6">
                          {/* Tiempo de Descanso */}
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="w-5 h-5 text-blue-600" />
                              <h5 className="font-semibold text-blue-800">Tiempo de Descanso entre Citas</h5>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={trabajador.tiempoDescanso}
                                onChange={(e) => actualizarConfiguracionTrabajador(trabajador.id, 'tiempoDescanso', parseInt(e.target.value) || 15)}
                                className="w-20 px-3 py-2 border border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none text-center"
                                min="0"
                                max="60"
                              />
                              <span className="text-blue-700">minutos</span>
                            </div>
                            <p className="text-blue-600 text-sm mt-2">
                              Tiempo mínimo entre citas para preparación y limpieza
                            </p>
                          </div>

                          {/* Límite de Reserva */}
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="w-5 h-5 text-orange-600" />
                              <h5 className="font-semibold text-orange-800">Límite de Reserva Anticipada</h5>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                value={trabajador.limiteDiasReserva}
                                onChange={(e) => actualizarConfiguracionTrabajador(trabajador.id, 'limiteDiasReserva', parseInt(e.target.value) || 30)}
                                className="w-20 px-3 py-2 border border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none text-center"
                                min="1"
                                max="365"
                              />
                              <span className="text-orange-700">días</span>
                            </div>
                            <p className="text-orange-600 text-sm mt-2">
                              Máximo número de días que los clientes pueden reservar con antelación
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No tienes trabajadores configurados</h3>
            <p className="text-gray-600 mb-6">Añade tu primer trabajador para empezar a gestionar tu negocio</p>
            <button 
              onClick={() => document.querySelector('input')?.focus()}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              Añadir Primer Trabajador
            </button>
          </div>
        )}

        {/* Resumen */}
        {trabajadores.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen de Configuración</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{trabajadores.length}</div>
                <div className="text-blue-700 font-medium">Trabajadores</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600">{totalServicios}</div>
                <div className="text-green-700 font-medium">Servicios</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl font-bold text-yellow-600">{totalFestivos}</div>
                <div className="text-yellow-700 font-medium">Días Festivos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}