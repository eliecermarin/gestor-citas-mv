import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, User, Phone, Mail, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Search, X, Menu } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - IMPORTANTE: Reemplaza estos valores con los tuyos
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';

// Verificar configuración
if (supabaseUrl === 'TU_SUPABASE_URL' || supabaseAnonKey === 'TU_SUPABASE_ANON_KEY') {
  console.warn('⚠️ Supabase no está configurado correctamente. Por favor, actualiza las variables de entorno.');
}

// Inicializar Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No necesitamos persistir sesión para uso público
  },
});

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const diasSemanaCorto = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Horas para el calendario principal (de hora en hora)
const horasCalendario = Array.from({ length: 15 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 - 22:00

// Horas para el selector del formulario (intervalos de 5 minutos)
const horasFormulario = [];
for (let hour = 8; hour <= 22; hour++) {
  for (let minute = 0; minute < 60; minute += 5) {
    if (hour === 22 && minute > 0) break; // No pasar de 22:00
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    horasFormulario.push(timeString);
  }
}

export default function CargaTrabajo() {
  const [reservas, setReservas] = useState([]);
  const [reservasFiltradas, setReservasFiltradas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorActivo, setTrabajadorActivo] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [busqueda, setBusqueda] = useState("");
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Detectar si es móvil
  const [esMobil, setEsMobil] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setEsMobil(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar trabajadores
  useEffect(() => {
    const cargarTrabajadores = async () => {
      try {
        const { data, error } = await supabase
          .from("trabajadores")
          .select('*')
          .order('nombre');
          
        if (error) {
          console.error('Error detallado:', error);
          throw error;
        }
        
        if (data && data.length > 0) {
          setTrabajadores(data);
          setTrabajadorActivo(data[0].id);
        } else {
          // Si no hay trabajadores, crear uno por defecto
          console.log('No se encontraron trabajadores');
        }
      } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        setError('Error al cargar trabajadores. Verifica las políticas RLS.');
      }
    };
    cargarTrabajadores();
  }, []);

  // Cargar reservas
  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const { data, error } = await supabase
          .from("reservas")
          .select('*')
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true });
          
        if (error) {
          console.error('Error detallado:', error);
          throw error;
        }
        
        if (data) {
          setReservas(data);
          setReservasFiltradas(data);
        }
      } catch (error) {
        console.error('Error al cargar reservas:', error);
        setError('Error al cargar reservas. Verifica las políticas RLS.');
      }
    };
    cargarReservas();
  }, []);

  // Función auxiliar para formatear hora
  const formatearHora = (hora) => {
    if (!hora) return '';
    // Si la hora ya tiene segundos, devolverla tal cual
    if (hora.includes(':') && hora.split(':').length === 3) {
      return hora;
    }
    // Si solo tiene HH:MM, agregar :00
    if (hora.includes(':') && hora.split(':').length === 2) {
      return hora + ':00';
    }
    return hora;
  };

  const navegarAFecha = useCallback((fecha) => {
    const inicioSemanaObjetivo = getInicioSemana(fecha);
    setFechaActual(inicioSemanaObjetivo);
  }, []);

  // Filtrar reservas cuando cambie la búsqueda
  useEffect(() => {
    if (!busqueda.trim()) {
      setReservasFiltradas(reservas);
    } else {
      const filtradas = reservas.filter((reserva) => {
        const busquedaLower = busqueda.toLowerCase();
        return (
          reserva.cliente?.nombre?.toLowerCase().includes(busquedaLower) ||
          reserva.cliente?.email?.toLowerCase().includes(busquedaLower)
        );
      });
      setReservasFiltradas(filtradas);
      
      if (filtradas.length > 0 && trabajadorActivo) {
        const primeraReservaDelTrabajador = filtradas.find(r => r.trabajador === trabajadorActivo);
        if (primeraReservaDelTrabajador) {
          const fechaReserva = new Date(primeraReservaDelTrabajador.fecha);
          navegarAFecha(fechaReserva);
        }
      }
    }
  }, [busqueda, reservas, trabajadorActivo, navegarAFecha]);

  const getReservasPorDiaHora = (dia, hora) => {
    return reservasFiltradas.filter((r) => {
      const fecha = new Date(r.fecha);
      
      const inicioSemana = getInicioSemana(fechaActual);
      const diaIndice = diasSemana.indexOf(dia);
      const fechaDia = new Date(inicioSemana);
      fechaDia.setDate(inicioSemana.getDate() + diaIndice);
      
      const fechaReserva = fecha.toISOString().split('T')[0];
      const fechaDiaStr = fechaDia.toISOString().split('T')[0];
      
      // Comparar solo las primeras 2 cifras de la hora
      const horaReserva = r.hora ? r.hora.substring(0, 2) : '';
      const horaSlot = hora.substring(0, 2);
      
      return fechaReserva === fechaDiaStr && 
             horaReserva === horaSlot && 
             r.trabajador === trabajadorActivo;
    });
  };

  const getInicioSemana = (fecha) => {
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const cambiarSemana = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
    setFechaActual(nuevaFecha);
  };

  const irAHoy = () => {
    setFechaActual(new Date());
  };

  const formatearRangoSemana = () => {
    const inicio = getInicioSemana(fechaActual);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    
    const opciones = { 
      day: 'numeric', 
      month: 'short' 
    };
    
    return `${inicio.toLocaleDateString('es-ES', opciones)} - ${fin.toLocaleDateString('es-ES', opciones)}`;
  };

  const abrirModal = (dia, hora, reserva) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    setModalData(reserva ? { ...reserva, cliente: reserva.cliente } : { fecha: iso, hora });
  };

  const eliminarReserva = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) {
      return;
    }
    
    try {
      setCargando(true);
      setError(null);
      
      const { error } = await supabase
        .from("reservas")
        .delete()
        .eq("id", id);
        
      if (error) {
        console.error('Error al eliminar:', error);
        throw error;
      }
      
      // Recargar reservas
      const { data: nuevasReservas, error: errorCarga } = await supabase
        .from("reservas")
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
        
      if (errorCarga) {
        console.error('Error al recargar:', errorCarga);
      } else if (nuevasReservas) {
        setReservas(nuevasReservas);
        setReservasFiltradas(nuevasReservas);
      }
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      if (error.code === '42501') {
        setError('Error de permisos. Ejecuta las políticas RLS en Supabase.');
      } else {
        setError(`Error al eliminar: ${error.message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const guardarReserva = async () => {
    const nombreInput = document.querySelector('input[name="nombre"]');
    const telefonoInput = document.querySelector('input[name="telefono"]');
    const emailInput = document.querySelector('input[name="email"]');
    const horaSelect = document.querySelector('select[name="hora"]');
    
    if (!nombreInput || !telefonoInput || !emailInput || !horaSelect || !trabajadorActivo) {
      setError('Por favor complete todos los campos');
      return;
    }
    
    try {
      setCargando(true);
      setError(null);
      
      const cliente = {
        nombre: nombreInput.value,
        telefono: telefonoInput.value,
        email: emailInput.value
      };
      
      // Asegurarse de que la hora esté en formato HH:MM:SS
      const horaFormateada = formatearHora(horaSelect.value);
      
      if (modalData.id) {
        // Actualizar reserva existente
        const { data, error } = await supabase
          .from("reservas")
          .update({ 
            cliente, 
            hora: horaFormateada,
            // No actualizamos user_id porque puede no existir
          })
          .eq("id", modalData.id)
          .select()
          .single();
          
        if (error) {
          console.error('Error al actualizar:', error);
          throw error;
        }
      } else {
        // Crear nueva reserva
        const nuevaReserva = {
          trabajador: trabajadorActivo,
          fecha: modalData.fecha,
          hora: horaFormateada,
          cliente,
          // user_id se puede dejar null si no hay autenticación
        };
        
        console.log('Intentando crear reserva:', nuevaReserva);
        
        const { data, error } = await supabase
          .from("reservas")
          .insert(nuevaReserva)
          .select()
          .single();
          
        if (error) {
          console.error('Error al insertar:', error);
          throw error;
        }
        
        console.log('Reserva creada:', data);
      }
      
      // Recargar reservas
      const { data: nuevasReservas, error: errorCarga } = await supabase
        .from("reservas")
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
        
      if (errorCarga) {
        console.error('Error al recargar:', errorCarga);
      } else if (nuevasReservas) {
        setReservas(nuevasReservas);
        setReservasFiltradas(nuevasReservas);
      }
      
      setModalData(null);
    } catch (error) {
      console.error('Error al guardar reserva:', error);
      if (error.code === '42501') {
        setError('Error de permisos. Ejecuta las políticas RLS en Supabase.');
      } else if (error.code === '23503') {
        setError('Error: El trabajador seleccionado no existe.');
      } else {
        setError(`Error al guardar: ${error.message}`);
      }
    } finally {
      setCargando(false);
    }
  };

  const getTrabajadorActivo = () => {
    return trabajadores.find(t => t.id === trabajadorActivo);
  };

  const getDiaConFecha = (nombreDia) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(nombreDia);
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(inicioSemana.getDate() + diaIndice);
    return esMobil ? `${diasSemanaCorto[diaIndice]} ${fechaDia.getDate()}` : `${nombreDia} ${fechaDia.getDate()}`;
  };

  const esReservaResaltada = (reserva) => {
    if (!busqueda.trim()) return false;
    const busquedaLower = busqueda.toLowerCase();
    return (
      reserva.cliente?.nombre?.toLowerCase().includes(busquedaLower) ||
      reserva.cliente?.email?.toLowerCase().includes(busquedaLower)
    );
  };

  // Componente de Reserva para móvil
  const ReservaMovil = ({ reserva, dia, hora }) => {
    const esResaltada = esReservaResaltada(reserva);
    
    return (
      <div 
        className={`border rounded-lg p-2 mb-2 shadow-sm ${
          esResaltada 
            ? 'bg-yellow-100 border-yellow-300 ring-2 ring-yellow-400' 
            : 'bg-blue-50 border-blue-200'
        }`}
        onClick={() => abrirModal(dia, hora, reserva)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className={`font-semibold text-sm ${esResaltada ? 'text-yellow-800' : 'text-gray-800'}`}>
              {formatearHora(reserva.hora).substring(0, 5)} - {reserva.cliente?.nombre}
            </p>
            <p className="text-xs text-gray-600 mt-1">{reserva.cliente?.telefono}</p>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                abrirModal(dia, hora, reserva);
              }}
              className="p-1 text-yellow-600"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                eliminarReserva(reserva.id);
              }}
              className="p-1 text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header móvil */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
                className="md:hidden p-2"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg md:text-2xl font-bold">Agenda</h1>
            </div>
            
            {/* Selector de trabajador en móvil */}
            {esMobil && (
              <select
                value={trabajadorActivo || ""}
                onChange={(e) => setTrabajadorActivo(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1"
              >
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Navegación de fechas */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => cambiarSemana(-1)}
              className="p-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <p className="text-sm font-medium">{formatearRangoSemana()}</p>
              <p className="text-xs text-gray-500">{fechaActual.getFullYear()}</p>
            </div>
            
            <button
              onClick={() => cambiarSemana(1)}
              className="p-1"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Botón Hoy y búsqueda en móvil */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={irAHoy}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm"
            >
              Hoy
            </button>
            <button
              onClick={() => setModalDisponibilidad(true)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              Disponible
            </button>
          </div>
        </div>

        {/* Buscador móvil */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border rounded-lg text-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes de error y estado */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {/* Mensaje de carga inicial */}
      {trabajadores.length === 0 && !error && (
        <div className="mx-4 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            No se encontraron trabajadores. Ejecuta el script SQL para insertar trabajadores de ejemplo.
          </p>
        </div>
      )}

      {/* Contenido principal */}
      {!esMobil ? (
        // Vista escritorio (mantener el diseño original)
        <div className="container mx-auto p-6">
          {/* Header escritorio */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-full">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Agenda Semanal</h1>
                  <p className="text-gray-600">Gestión de citas y reservas</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Calendar className="w-5 h-5 text-blue-500" />
                <select
                  value={trabajadorActivo || ""}
                  onChange={(e) => setTrabajadorActivo(e.target.value)}
                  className="bg-white border-2 border-blue-200 rounded-lg px-4 py-2 text-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
                >
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navegación escritorio */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => cambiarSemana(-1)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-blue-600" />
                </button>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {formatearRangoSemana()}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {fechaActual.getFullYear()}
                  </p>
                </div>
                
                <button
                  onClick={() => cambiarSemana(1)}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                </button>
                
                <button
                  onClick={irAHoy}
                  className="ml-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Hoy
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setModalDisponibilidad(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                >
                  <Clock className="w-4 h-4" />
                  <span>Disponibilidad</span>
                </button>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
                  />
                  {busqueda && (
                    <button
                      onClick={() => setBusqueda("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {getTrabajadorActivo() && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Mostrando agenda de: <span className="font-semibold">{getTrabajadorActivo()?.nombre}</span>
                </p>
              </div>
            )}
          </div>

          {/* Grid escritorio */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 min-w-[1200px]">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                {diasSemana.map((dia) => (
                  <div key={dia} className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-center text-white font-semibold">
                    {getDiaConFecha(dia)}
                  </div>
                ))}

                {horasCalendario.map((hora) => (
                  <>
                    <div key={`hora-${hora}`} className="bg-gray-50 p-4 font-medium text-gray-700 border-t border-gray-200 flex items-center justify-center">
                      {hora}
                    </div>
                    {diasSemana.map((dia) => {
                      const reservasEnSlot = getReservasPorDiaHora(dia, hora);
                      return (
                        <div
                          key={dia + hora}
                          className="border-t border-l border-gray-200 p-2 min-h-[100px] bg-white hover:bg-gray-50 cursor-pointer transition-colors group relative"
                          onClick={() => abrirModal(dia, hora)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-6 h-6 text-gray-400" />
                          </div>
                          
                          <div className="relative z-10 space-y-1">
                            {reservasEnSlot.map((r) => {
                              const esResaltada = esReservaResaltada(r);
                              return (
                                <div 
                                  key={r.id} 
                                  className={`border rounded-lg p-2 shadow-sm hover:shadow-md transition-all text-xs ${
                                    esResaltada 
                                      ? 'bg-yellow-100 border-yellow-300 ring-2 ring-yellow-400' 
                                      : 'bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-1">
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-semibold truncate ${esResaltada ? 'text-yellow-800' : 'text-gray-800'}`}>
                                        {r.cliente?.nombre}
                                      </p>
                                      <p className="text-gray-600 truncate">{r.cliente?.telefono}</p>
                                      <p className={`font-medium ${esResaltada ? 'text-yellow-700' : 'text-blue-700'}`}>
                                        {formatearHora(r.hora).substring(0, 5)}
                                      </p>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          abrirModal(dia, hora, r);
                                        }}
                                        className="p-1 hover:bg-yellow-200 rounded text-yellow-600"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          eliminarReserva(r.id);
                                        }}
                                        className="p-1 hover:bg-red-200 rounded text-red-500"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Vista móvil
        <div className="px-4 py-2">
          {/* Lista de días para móvil */}
          <div className="space-y-4">
            {diasSemana.map((dia) => {
              const inicioSemana = getInicioSemana(fechaActual);
              const diaIndice = diasSemana.indexOf(dia);
              const fechaDia = new Date(inicioSemana);
              fechaDia.setDate(inicioSemana.getDate() + diaIndice);
              
              const reservasDelDia = reservasFiltradas.filter((r) => {
                const fechaReserva = new Date(r.fecha).toISOString().split('T')[0];
                const fechaDiaStr = fechaDia.toISOString().split('T')[0];
                return fechaReserva === fechaDiaStr && r.trabajador === trabajadorActivo;
              }).sort((a, b) => a.hora.localeCompare(b.hora));

              return (
                <div key={dia} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">
                      {getDiaConFecha(dia)}
                    </h3>
                    <button
                      onClick={() => abrirModal(dia, "09:00")}
                      className="p-2 bg-blue-50 rounded-lg text-blue-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {reservasDelDia.length > 0 ? (
                    <div className="space-y-2">
                      {reservasDelDia.map((reserva) => (
                        <ReservaMovil 
                          key={reserva.id} 
                          reserva={reserva} 
                          dia={dia} 
                          hora={reserva.hora} 
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">
                      Sin reservas
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de reserva */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-full">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  {modalData?.id ? 'Editar Reserva' : 'Nueva Reserva'}
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo
                  </label>
                  <input 
                    name="nombre" 
                    defaultValue={modalData?.cliente?.nombre || ""} 
                    placeholder="Ingresa el nombre del cliente" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input 
                    name="telefono" 
                    defaultValue={modalData?.cliente?.telefono || ""} 
                    placeholder="Número de teléfono" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input 
                    name="email" 
                    type="email"
                    defaultValue={modalData?.cliente?.email || ""} 
                    placeholder="Correo electrónico" 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hora de la cita
                  </label>
                  <select 
                    name="hora" 
                    defaultValue={modalData?.hora || ""} 
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {horasFormulario.map((hora) => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => {
                    setModalData(null);
                    setError(null);
                  }} 
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={cargando}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={guardarReserva}
                  disabled={cargando}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {cargando ? 'Guardando...' : 'Guardar Reserva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de disponibilidad */}
      {modalDisponibilidad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Consultar Disponibilidad
                  </h2>
                </div>
                <button
                  onClick={() => setModalDisponibilidad(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Aquí iría el componente de disponibilidad */}
              <p className="text-gray-500 text-center py-8">
                Función de disponibilidad en desarrollo
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}