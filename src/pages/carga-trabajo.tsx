import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, User, Phone, Mail, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Search, X, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Horas para el calendario principal (de hora en hora)
const horasCalendario = Array.from({ length: 15 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`);

// Horas para el selector del formulario (intervalos de 15 minutos)
const horasFormulario = [];
for (let hour = 8; hour <= 21; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    if (hour === 21 && minute > 45) break;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    horasFormulario.push(timeString);
  }
}

export default function CargaTrabajo() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [reservasFiltradas, setReservasFiltradas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [trabajadorActivo, setTrabajadorActivo] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [busqueda, setBusqueda] = useState("");
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalFormData, setModalFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    hora: '',
    observaciones: ''
  });

  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(""), 3000);
  };

  const handleModalInputChange = (field, value) => {
    setModalFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
  }, [router]);

  const cargarDatos = async (userId) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Cargar trabajadores
      const { data: trabajadoresData, error: errorTrabajadores } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('user_id', userId);

      if (errorTrabajadores) throw errorTrabajadores;
      
      const trabajadoresProcesados = (trabajadoresData || []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        servicios: t.servicios || [],
        festivos: t.festivos || [],
        duracionCitaDefecto: t.duracionCitaDefecto || 30
      }));
      
      setTrabajadores(trabajadoresProcesados);
      
      if (trabajadoresProcesados.length > 0 && !trabajadorActivo) {
        setTrabajadorActivo(trabajadoresProcesados[0].id);
      }

      // Cargar servicios
      const { data: serviciosData, error: errorServicios } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', userId);

      if (errorServicios) throw errorServicios;
      setServicios(serviciosData || []);

      // Cargar reservas
      await cargarReservas(userId);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error cargando datos. Por favor, recarga la página.');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarReservas = async (userId) => {
    try {
      const { data: reservasData, error: errorReservas } = await supabase
        .from('reservas')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (errorReservas) throw errorReservas;
      
      const reservasProcesadas = (reservasData || []).map((r) => ({
        id: r.id,
        trabajador: r.trabajador,
        fecha: r.fecha,
        hora: r.hora,
        cliente: r.cliente || { nombre: '', telefono: '', email: '' },
        observaciones: r.observaciones || '',
        user_id: r.user_id
      }));
      
      setReservas(reservasProcesadas);
      setReservasFiltradas(reservasProcesadas);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    }
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
          reserva.cliente?.email?.toLowerCase().includes(busquedaLower) ||
          reserva.cliente?.telefono?.toLowerCase().includes(busquedaLower)
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
      
      const horaReserva = r.hora.substring(0, 2);
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
    
    const opciones = { day: 'numeric', month: 'short' };
    
    return `${inicio.toLocaleDateString('es-ES', opciones)} - ${fin.toLocaleDateString('es-ES', opciones)}`;
  };

  const abrirModal = (dia, hora, reserva) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    
    if (reserva) {
      setModalData({
        id: reserva.id,
        fecha: reserva.fecha,
        hora: reserva.hora,
        cliente: reserva.cliente,
        observaciones: reserva.observaciones
      });
      setModalFormData({
        nombre: reserva.cliente?.nombre || '',
        telefono: reserva.cliente?.telefono || '',
        email: reserva.cliente?.email || '',
        hora: reserva.hora || '',
        observaciones: reserva.observaciones || ''
      });
    } else {
      setModalData({ fecha: iso, hora });
      setModalFormData({
        nombre: '',
        telefono: '',
        email: '',
        hora: hora,
        observaciones: ''
      });
    }
  };

  const guardarReserva = async () => {
    if (!user || !trabajadorActivo) return;

    const cliente = {
      nombre: modalFormData.nombre,
      telefono: modalFormData.telefono,
      email: modalFormData.email
    };

    const hora = modalFormData.hora;
    const observaciones = modalFormData.observaciones || '';

    try {
      if (modalData?.id) {
        // Actualizar reserva existente
        const { error } = await supabase
          .from('reservas')
          .update({
            hora,
            cliente,
            observaciones
          })
          .eq('id', modalData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showMessage('Reserva actualizada exitosamente', 'success');
      } else {
        // Crear nueva reserva
        const { error } = await supabase
          .from('reservas')
          .insert([{
            trabajador: trabajadorActivo,
            fecha: modalData?.fecha,
            hora,
            cliente,
            observaciones,
            user_id: user.id
          }]);

        if (error) throw error;
        showMessage('Reserva creada exitosamente', 'success');
      }

      await cargarReservas(user.id);
      setModalData(null);
      setModalFormData({
        nombre: '',
        telefono: '',
        email: '',
        hora: '',
        observaciones: ''
      });
    } catch (error) {
      console.error('Error guardando reserva:', error);
      showMessage('Error al guardar la reserva', 'error');
    }
  };

  const abrirModal = (dia, hora, reserva) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    
    if (reserva) {
      setModalData({
        id: reserva.id,
        fecha: reserva.fecha,
        hora: reserva.hora,
        cliente: reserva.cliente,
        observaciones: reserva.observaciones
      });
    } else {
      setModalData({ fecha: iso, hora });
    }
  };

  const eliminarReserva = async (id) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar esta reserva?')) return;
    
    try {
      const { error } = await supabase
        .from('reservas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await cargarReservas(user.id);
      showMessage('Reserva eliminada exitosamente', 'success');
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      showMessage('Error al eliminar la reserva', 'error');
    }
  };

  const guardarReserva = async (formData) => {
    if (!user || !trabajadorActivo) return;

    const cliente = {
      nombre: formData.get('nombre'),
      telefono: formData.get('telefono'),
      email: formData.get('email')
    };

    const hora = formData.get('hora');
    const observaciones = formData.get('observaciones') || '';

    try {
      if (modalData?.id) {
        // Actualizar reserva existente
        const { error } = await supabase
          .from('reservas')
          .update({
            hora,
            cliente,
            observaciones
          })
          .eq('id', modalData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showMessage('Reserva actualizada exitosamente', 'success');
      } else {
        // Crear nueva reserva
        const { error } = await supabase
          .from('reservas')
          .insert([{
            trabajador: trabajadorActivo,
            fecha: modalData?.fecha,
            hora,
            cliente,
            observaciones,
            user_id: user.id
          }]);

        if (error) throw error;
        showMessage('Reserva creada exitosamente', 'success');
      }

      await cargarReservas(user.id);
      setModalData(null);
    } catch (error) {
      console.error('Error guardando reserva:', error);
      showMessage('Error al guardar la reserva', 'error');
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
    return `${nombreDia} ${fechaDia.getDate()}`;
  };

  const esReservaResaltada = (reserva) => {
    if (!busqueda.trim()) return false;
    const busquedaLower = busqueda.toLowerCase();
    return (
      reserva.cliente?.nombre?.toLowerCase().includes(busquedaLower) ||
      reserva.cliente?.email?.toLowerCase().includes(busquedaLower) ||
      reserva.cliente?.telefono?.toLowerCase().includes(busquedaLower)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (trabajadores.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-yellow-500 mb-4">
            <User className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sin Trabajadores</h2>
          <p className="text-gray-600 mb-4">
            No tienes trabajadores configurados aún. Ve a la página de configuración para agregar trabajadores.
          </p>
          <button 
            onClick={() => router.push('/configuracion')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Ir a Configuración
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Message Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          message.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-green-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="container mx-auto p-3 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Agenda Semanal</h1>
                <p className="text-gray-600 text-sm md:text-base">Gestión de citas y reservas</p>
                {user && (
                  <p className="text-xs text-blue-600">Usuario: {user.email}</p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <select
                  value={trabajadorActivo || ""}
                  onChange={(e) => setTrabajadorActivo(e.target.value)}
                  className="bg-white border-2 border-blue-200 rounded-lg px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none transition-colors text-sm"
                >
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Navegación de fechas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => cambiarSemana(-1)}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-5 h-5 text-blue-600" />
              </button>
              
              <div className="text-center">
                <h3 className="text-base md:text-lg font-semibold text-gray-800">
                  {formatearRangoSemana()}
                </h3>
                <p className="text-xs md:text-sm text-gray-500">
                  {fechaActual.getFullYear()}
                </p>
              </div>
              
              <button
                onClick={() => cambiarSemana(1)}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Semana siguiente"
              >
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </button>
              
              <button
                onClick={irAHoy}
                className="ml-4 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs md:text-sm font-medium"
              >
                Hoy
              </button>
            </div>

            {/* Buscador */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:w-auto sm:flex-none">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full text-sm"
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
                  {busqueda && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {reservasFiltradas.filter(r => r.trabajador === trabajadorActivo).length > 0 ? (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                          {reservasFiltradas.filter(r => r.trabajador === trabajadorActivo).length} resultados
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded whitespace-nowrap">
                          Sin resultados
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {getTrabajadorActivo() && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs md:text-sm text-blue-700">
                Mostrando agenda de: <span className="font-semibold">{getTrabajadorActivo()?.nombre}</span>
              </p>
            </div>
          )}
        </div>

        {/* Calendar Grid - Desktop */}
        <div className="hidden md:block bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 min-w-full">
              {/* Header Row */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              {diasSemana.map((dia) => (
                <div key={dia} className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-center text-white font-semibold">
                  {getDiaConFecha(dia)}
                </div>
              ))}

              {/* Time Slots */}
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
                        className="border-t border-l border-gray-200 p-2 min-h-16 bg-white hover:bg-blue-25 cursor-pointer transition-colors group relative overflow-hidden"
                        onClick={() => abrirModal(dia, hora)}
                      >
                        {/* Add button on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50">
                          <Plus className="w-6 h-6 text-blue-400" />
                        </div>
                        
                        {/* Existing reservations */}
                        <div className="relative z-10 space-y-1">
                          {reservasEnSlot.map((r) => {
                            const esResaltada = esReservaResaltada(r);
                            return (
                              <div 
                                key={r.id} 
                                className={`border rounded-lg p-2 shadow-sm hover:shadow-md transition-all ${
                                  esResaltada 
                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 ring-2 ring-yellow-400 ring-opacity-50' 
                                    : 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                      <User className={`w-3 h-3 flex-shrink-0 ${esResaltada ? 'text-yellow-700' : 'text-blue-600'}`} />
                                      <p className={`font-semibold text-xs truncate ${esResaltada ? 'text-yellow-800' : 'text-gray-800'}`} title={r.cliente?.nombre}>
                                        {r.cliente?.nombre}
                                      </p>
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate" title={r.cliente?.telefono}>{r.cliente?.telefono}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate" title={r.cliente?.email}>{r.cliente?.email}</span>
                                      </div>
                                      <div className={`flex items-center gap-1 text-xs font-medium ${esResaltada ? 'text-yellow-700' : 'text-blue-700'}`}>
                                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span>{r.hora}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-0.5 ml-1 flex-shrink-0">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        abrirModal(dia, hora, r);
                                      }}
                                      className="p-1 rounded hover:bg-yellow-100 text-yellow-600 transition-colors"
                                      title="Editar reserva"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        eliminarReserva(r.id);
                                      }}
                                      className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                                      title="Eliminar reserva"
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

        {/* Mobile Calendar */}
        <div className="md:hidden space-y-4">
          {diasSemana.map((dia) => {
            const inicioSemana = getInicioSemana(fechaActual);
            const diaIndice = diasSemana.indexOf(dia);
            const fechaDia = new Date(inicioSemana);
            fechaDia.setDate(inicioSemana.getDate() + diaIndice);
            const fechaStr = fechaDia.toISOString().split('T')[0];
            
            const reservasDelDia = reservasFiltradas.filter(r => 
              r.fecha === fechaStr && r.trabajador === trabajadorActivo
            );

            return (
              <div key={dia} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-center text-white">
                  <h3 className="font-semibold text-lg">{getDiaConFecha(dia)}</h3>
                  <p className="text-blue-100 text-sm">{fechaDia.toLocaleDateString('es-ES', { month: 'long' })}</p>
                </div>

                <div className="p-4">
                  {reservasDelDia.length > 0 ? (
                    <div className="space-y-3">
                      {reservasDelDia
                        .sort((a, b) => a.hora.localeCompare(b.hora))
                        .map((r) => {
                          const esResaltada = esReservaResaltada(r);
                          return (
                            <div 
                              key={r.id}
                              className={`border-2 rounded-xl p-4 ${
                                esResaltada 
                                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300' 
                                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-full ${esResaltada ? 'bg-yellow-200' : 'bg-blue-200'}`}>
                                    <Clock className={`w-4 h-4 ${esResaltada ? 'text-yellow-700' : 'text-blue-700'}`} />
                                  </div>
                                  <span className={`font-bold text-lg ${esResaltada ? 'text-yellow-800' : 'text-blue-800'}`}>
                                    {r.hora}
                                  </span>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => abrirModal(dia, r.hora, r)}
                                    className="p-2 rounded-full hover:bg-yellow-100 text-yellow-600 transition-colors"
                                    title="Editar reserva"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => eliminarReserva(r.id)}
                                    className="p-2 rounded-full hover:bg-red-100 text-red-500 transition-colors"
                                    title="Eliminar reserva"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <User className={`w-5 h-5 ${esResaltada ? 'text-yellow-600' : 'text-blue-600'}`} />
                                  <p className="font-semibold text-gray-800 text-lg">{r.cliente?.nombre}</p>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Phone className="w-4 h-4 text-gray-500" />
                                  <a href={`tel:${r.cliente?.telefono}`} className="text-gray-700 hover:text-blue-600 transition-colors">
                                    {r.cliente?.telefono}
                                  </a>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Mail className="w-4 h-4 text-gray-500" />
                                  <a href={`mailto:${r.cliente?.email}`} className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
                                    {r.cliente?.email}
                                  </a>
                                </div>

                                {r.observaciones && (
                                  <div className="mt-3 p-2 bg-gray-100 rounded-lg">
                                    <p className="text-sm text-gray-700">{r.observaciones}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 mb-4">No hay citas programadas</p>
                      <button
                        onClick={() => abrirModal(dia, "09:00")}
                        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                      >
                        Agregar Cita
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-full">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {modalData?.id ? 'Editar Reserva' : 'Nueva Reserva'}
                  </h2>
                </div>
                
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
                    value={modalFormData.nombre}
                    onChange={(e) => handleModalInputChange('nombre', e.target.value)}
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
                    value={modalFormData.telefono}
                    onChange={(e) => handleModalInputChange('telefono', e.target.value)}
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
                    type="email"
                    value={modalFormData.email}
                    onChange={(e) => handleModalInputChange('email', e.target.value)}
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
                    value={modalFormData.hora}
                    onChange={(e) => handleModalInputChange('hora', e.target.value)}
                    required 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {horasFormulario.map((hora) => (
                      <option key={hora} value={hora}>{hora}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional)
                  </label>
                  <textarea 
                    value={modalFormData.observaciones}
                    onChange={(e) => handleModalInputChange('observaciones', e.target.value)}
                    placeholder="Observaciones adicionales..." 
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setModalData(null)} 
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={guardarReserva}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
                >
                  Guardar Reserva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}