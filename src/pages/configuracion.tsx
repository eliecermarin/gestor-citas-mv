import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseclient";
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
      const { data, error } = await supabase
        .from('trabajadores')
        .insert([{
          nombre: nuevoTrabajador,
          servicios: [],
          festivos: [],
          duracionCitaDefecto: 30,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const nuevoTrab: Trabajador = {
        id: data.id,
        nombre: data.nombre,
        servicios: [],
        festivos: [],
        limiteDiasReserva: 30,
        user_id: data.user_id
      };
      
      setTrabajadores([...trabajadores, nuevoTrab]);
      setNuevoTrabajador("");
      setTrabajadorExpandido(data.id);
      inicializarEstadosTrabajador(data.id);
      showMessage("Trabajador agregado exitosamente");
    } catch (error) {
      console.error('Error agregando trabajador:', error);
      showMessage("Error agregando trabajador");
    }
  };

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
        setTrabajadorExpandido(trabajadores[0]?.id || null);
      }
      showMessage("Trabajador eliminado");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador");
    }
  };

  const agregarServicio = async (trabajadorId: string) => {
    const nuevoServicio = nuevosServicios[trabajadorId];
    if (!nuevoServicio?.nombre.trim() || !user) return;
    
    try {
      // Insertar servicio en tabla servicios
      const { data: servicioData, error: errorServicio } = await supabase
        .from('servicios')
        .insert([{
          nombre: nuevoServicio.nombre,
          duracion: nuevoServicio.duracion,
          precio: nuevoServicio.precio,
          user_id: user.id
        }])
        .select()
        .single();

      if (errorServicio) throw errorServicio;

      // Actualizar servicios globales
      setServiciosGlobales([...serviciosGlobales, servicioData]);

      // Agregar servicio al trabajador
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (trabajador) {
        const serviciosActualizados = [...(trabajador.servicios || []), servicioData];
        const servicioIds = serviciosActualizados.map(s => s.id);

        const { error: errorTrabajador } = await supabase
          .from('trabajadores')
          .update({ servicios: servicioIds })
          .eq('id', trabajadorId)
          .eq('user_id', user.id);

        if (errorTrabajador) throw errorTrabajador;

        // Actualizar estado local
        setTrabajadores(trabajadores.map(t => {
          if (t.id === trabajadorId) {
            return { ...t, servicios: serviciosActualizados };
          }
          return t;
        }));
      }
      
      setNuevosServicios(prev => ({
        ...prev,
        [trabajadorId]: { nombre: "", duracion: 20, precio: 0, mostrarPrecio: true }
      }));
      
      showMessage("Servicio agregado exitosamente");
    } catch (error) {
      console.error('Error agregando servicio:', error);
      showMessage("Error agregando servicio");
    }
  };

  const eliminarServicio = async (trabajadorId: string, servicioId: number) => {
    if (!user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      const serviciosActualizados = trabajador.servicios.filter(s => s.id !== servicioId);
      const servicioIds = serviciosActualizados.map(s => s.id);

      const { error } = await supabase
        .from('trabajadores')
        .update({ servicios: servicioIds })
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
    if (!user) return;
    
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

  const actualizarLimiteDias = async (trabajadorId: string, limite: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('trabajadores')
        .update({ duracionCitaDefecto: limite })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, limiteDiasReserva: limite };
        }
        return t;
      }));
    } catch (error) {
      console.error('Error actualizando límite:', error);
      showMessage("Error actualizando límite de días");
    }
  };

  const actualizarNuevoServicio = (trabajadorId: string, campo: keyof NuevoServicio, valor: string | number | boolean) => {
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: {
        ...prev[trabajadorId],
        [campo]: valor
      }
    }));
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const guardarConfiguracion = async (): Promise<void> => {
    setIsLoading(true);
    showMessage("Configuración guardada exitosamente");
    setIsLoading(false);
  };

  const toggleTrabajador = (id: string) => {
    setTrabajadorExpandido(trabajadorExpandido === id ? null : id);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (isLoading && trabajadores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const totalServicios = trabajadores.reduce((total, t) => total + t.servicios.length, 0);
  const totalFestivos = trabajadores.reduce((total, t) => total + t.festivos.length, 0);
  const promedioLimite = trabajadores.length > 0 
    ? Math.round(trabajadores.reduce((sum, t) => sum + t.limiteDiasReserva, 0) / trabajadores.length) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-8 mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-blue-500 p-2 sm:p-3 rounded-lg sm:rounded-xl">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Configuración del Negocio</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Gestiona tu equipo, servicios y disponibilidad</p>
              {user && (
                <p className="text-xs text-blue-600 mt-1">Usuario: {user.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg z-50 text-sm sm:text-base">
            {message}
          </div>
        )}

        {/* Agregar Trabajador */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            Agregar Nuevo Trabajador
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={nuevoTrabajador}
              onChange={(e) => setNuevoTrabajador(e.target.value)}
              placeholder="Nombre del trabajador"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyPress={(e) => handleKeyPress(e, agregarTrabajador)}
            />
            <button 
              onClick={agregarTrabajador}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Añadir Trabajador
            </button>
          </div>
        </div>

        {/* Lista de Trabajadores */}
        <div className="space-y-4 sm:space-y-6">
          {trabajadores.map((trabajador) => (
            <div key={trabajador.id} className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
              {/* Header del Trabajador */}
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-6 cursor-pointer"
                onClick={() => toggleTrabajador(trabajador.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-white">{trabajador.nombre}</h3>
                      <p className="text-blue-100 text-sm">
                        {trabajador.servicios.length} servicios • {trabajador.festivos.length} días festivos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarTrabajador(trabajador.id);
                      }}
                      className="text-white hover:text-red-200 p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors"
                      aria-label={`Eliminar trabajador ${trabajador.nombre}`}
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    {trabajadorExpandido === trabajador.id ? 
                      <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : 
                      <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    }
                  </div>
                </div>
              </div>

              {/* Contenido Expandible */}
              {trabajadorExpandido === trabajador.id && (
                <div className="p-4 sm:p-6">
                  <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Servicios */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-green-500" />
                        Servicios
                      </h4>
                      
                      {/* Agregar Servicio */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="grid gap-3">
                          <input
                            value={nuevosServicios[trabajador.id]?.nombre || ""}
                            onChange={(e) => actualizarNuevoServicio(trabajador.id, 'nombre', e.target.value)}
                            placeholder="Nombre del servicio"
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input
                                type="number"
                                value={nuevosServicios[trabajador.id]?.duracion || 20}
                                onChange={(e) => actualizarNuevoServicio(trabajador.id, 'duracion', parseInt(e.target.value) || 0)}
                                placeholder="Duración"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                                min="1"
                              />
                              <span className="absolute right-3 top-2 text-gray-500 text-sm">min</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                value={nuevosServicios[trabajador.id]?.precio || 0}
                                onChange={(e) => actualizarNuevoServicio(trabajador.id, 'precio', parseFloat(e.target.value) || 0)}
                                placeholder="Precio"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                                min="0"
                                step="0.01"
                              />
                              <span className="absolute right-3 top-2 text-gray-500 text-sm">€</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => actualizarNuevoServicio(trabajador.id, 'mostrarPrecio', !nuevosServicios[trabajador.id]?.mostrarPrecio)}
                              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                              type="button"
                            >
                              {nuevosServicios[trabajador.id]?.mostrarPrecio ? 
                                <Eye className="w-4 h-4" /> : 
                                <EyeOff className="w-4 h-4" />
                              }
                              {nuevosServicios[trabajador.id]?.mostrarPrecio ? 'Mostrar precio' : 'Ocultar precio'}
                            </button>
                          </div>
                          <button 
                            onClick={() => agregarServicio(trabajador.id)}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50"
                            type="button"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir Servicio
                          </button>
                        </div>
                      </div>

                      {/* Lista de Servicios */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {trabajador.servicios.map((servicio) => (
                          <div key={`servicio-${trabajador.id}-${servicio.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <h5 className="font-medium text-gray-800 text-sm sm:text-base">{servicio.nombre}</h5>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {servicio.duracion} minutos
                                {servicio.mostrarPrecio && ` • ${servicio.precio} euros`}
                              </p>
                            </div>
                            <button 
                              onClick={() => eliminarServicio(trabajador.id, servicio.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              aria-label={`Eliminar servicio ${servicio.nombre}`}
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Días Festivos y Configuración */}
                    <div>
                      {/* Días Festivos */}
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        Días Festivos
                      </h4>
                      
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="date"
                            value={nuevasFechasFestivas[trabajador.id] || ""}
                            onChange={(e) => setNuevasFechasFestivas(prev => ({
                              ...prev,
                              [trabajador.id]: e.target.value
                            }))}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
                          />
                          <button 
                            onClick={() => agregarFestivo(trabajador.id)}
                            disabled={isLoading}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base whitespace-nowrap disabled:opacity-50"
                            type="button"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto mb-6">
                        {trabajador.festivos.map((fecha) => (
                          <div key={`festivo-${trabajador.id}-${fecha}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm sm:text-base text-gray-800">{formatearFecha(fecha)}</span>
                            <button 
                              onClick={() => eliminarFestivo(trabajador.id, fecha)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              aria-label={`Eliminar fecha festiva ${formatearFecha(fecha)}`}
                              type="button"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Límite de Reserva */}
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-orange-500" />
                        Límite de Reserva
                      </h4>
                      
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <label htmlFor={`limite-${trabajador.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                          Días de antelación máximos
                        </label>
                        <input
                          id={`limite-${trabajador.id}`}
                          type="number"
                          value={trabajador.limiteDiasReserva}
                          onChange={(e) => actualizarLimiteDias(trabajador.id, parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm sm:text-base"
                          min="1"
                          max="365"
                        />
                        <p className="text-xs sm:text-sm text-orange-700 mt-2">
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

        {/* Resumen */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Resumen de Configuración</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{trabajadores.length}</div>
              <div className="text-xs sm:text-sm text-blue-800">Trabajadores</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{totalServicios}</div>
              <div className="text-xs sm:text-sm text-green-800">Servicios</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">{totalFestivos}</div>
              <div className="text-xs sm:text-sm text-purple-800">Días Festivos</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-orange-600">{promedioLimite}</div>
              <div className="text-xs sm:text-sm text-orange-800">Días promedio</div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 sm:mt-8 flex justify-center">
          <button 
            onClick={guardarConfiguracion}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl flex items-center gap-3 text-base sm:text-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {isLoading ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}