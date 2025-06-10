import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, User, Phone, Mail, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Search, X, AlertCircle, CheckCircle, Filter, CalendarSearch, Zap, Ban } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Generar horas para formularios (intervalos de 15 minutos)
const generarHorasFormulario = () => {
  const horas = [];
  for (let hour = 8; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 21 && minute > 45) break;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      horas.push(timeString);
    }
  }
  return horas;
};

// ✅ NUEVA FUNCIÓN: Verificar si una fecha/hora ya pasó
const esFechaHoraPasada = (fecha, hora = null) => {
  const ahora = new Date();
  const fechaObj = new Date(fecha);
  
  // Si solo verificamos fecha
  if (!hora) {
    const fechaSoloFecha = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());
    const hoySoloFecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    return fechaSoloFecha < hoySoloFecha;
  }
  
  // Si verificamos fecha y hora
  const [horaNum, minNum] = hora.split(':').map(Number);
  const fechaHoraObj = new Date(fechaObj);
  fechaHoraObj.setHours(horaNum, minNum, 0, 0);
  
  return fechaHoraObj <= ahora;
};

export default function CargaTrabajoCorregida() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [reservasFiltradas, setReservasFiltradas] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [trabajadorActivo, setTrabajadorActivo] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [busqueda, setBusqueda] = useState("");
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [guardandoReserva, setGuardandoReserva] = useState(false);
  
  const [modalFormData, setModalFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    hora: '',
    observaciones: ''
  });

  const [bloqueoFormData, setBloqueoFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    motivo: ''
  });
  
  // Estados para búsqueda de disponibilidad
  const [busquedaDisponibilidad, setBusquedaDisponibilidad] = useState({
    fechaDesde: new Date().toISOString().split('T')[0],
    horaDesde: '09:00',
    servicio: '',
    trabajador: '',
    cantidadResultados: 10
  });
  const [resultadosDisponibilidad, setResultadosDisponibilidad] = useState([]);
  const [buscandoDisponibilidad, setBuscandoDisponibilidad] = useState(false);

  const horasFormulario = generarHorasFormulario();

  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(""), 4000);
  };

  const handleModalInputChange = (field, value) => {
    setModalFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ VERIFICACIÓN DE AUTENTICACIÓN MEJORADA (sin auto-redirecciones)
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          console.log('✅ Usuario autenticado:', currentUser.email);
          setUser(currentUser);
          await cargarDatos(currentUser.id);
        } else {
          console.log('❌ No hay usuario autenticado');
          setError('No hay usuario autenticado. Por favor, inicia sesión.');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error de autenticación:', error);
        setError('Error de autenticación');
        setIsLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, []);

  const cargarDatos = async (userId) => {
    setIsLoading(true);
    setError("");
    
    try {
      console.log('🔄 Cargando datos para usuario:', userId);

      // ✅ CARGAR TRABAJADORES con filtro estricto por user_id
      const { data: trabajadoresData, error: errorTrabajadores } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('user_id', userId);

      if (errorTrabajadores) {
        console.error('❌ Error trabajadores:', errorTrabajadores);
        throw errorTrabajadores;
      }
      
      console.log('✅ Trabajadores cargados:', trabajadoresData?.length || 0);
      
      const trabajadoresProcesados = (trabajadoresData || []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        servicios: t.servicios || [],
        festivos: t.festivos || [],
        horariosTrabajo: t.horariosTrabajo || {},
        tiempoDescanso: t.tiempoDescanso || 15,
        limiteDiasReserva: t.limiteDiasReserva || 30
      }));
      
      setTrabajadores(trabajadoresProcesados);
      
      if (trabajadoresProcesados.length > 0 && !trabajadorActivo) {
        setTrabajadorActivo(trabajadoresProcesados[0].id);
      }

      // ✅ CARGAR SERVICIOS con filtro estricto por user_id
      const { data: serviciosData, error: errorServicios } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', userId);

      if (errorServicios) {
        console.error('❌ Error servicios:', errorServicios);
        throw errorServicios;
      }

      console.log('✅ Servicios cargados:', serviciosData?.length || 0, 'para usuario:', userId);
      
      // ✅ FILTRO ADICIONAL: Asegurar que solo servicios del usuario actual
      const serviciosFiltrados = (serviciosData || []).filter(s => s.user_id === userId);
      console.log('✅ Servicios después del filtro:', serviciosFiltrados.length);
      
      setServicios(serviciosFiltrados);

      // Cargar reservas
      await cargarReservas(userId);

      // Cargar bloqueos manuales
      await cargarBloqueos(userId);

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setError('Error cargando datos. Por favor, recarga la página.');
    } finally {
      setIsLoading(false);
    }
  };

  const cargarReservas = async (userId) => {
    try {
      // ✅ CARGAR RESERVAS con filtro estricto
      const { data: reservasData, error: errorReservas } = await supabase
        .from('reservas')
        .select('*')
        .eq('user_id', userId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (errorReservas) {
        console.error('❌ Error cargando reservas:', errorReservas);
        showMessage('Error cargando algunas reservas', 'error');
        return;
      }
      
      console.log('✅ Reservas cargadas:', reservasData?.length || 0);
      
      const reservasProcesadas = (reservasData || []).map((r) => ({
        id: r.id,
        trabajador: r.trabajador,
        fecha: r.fecha,
        hora: r.hora,
        servicio_id: r.servicio_id,
        cliente: r.cliente || { nombre: '', telefono: '', email: '' },
        observaciones: r.observaciones || '',
        estado: r.estado || 'confirmada',
        user_id: r.user_id
      }));
      
      setReservas(reservasProcesadas);
      setReservasFiltradas(reservasProcesadas);
    } catch (error) {
      console.error('❌ Error cargando reservas:', error);
      showMessage('Error cargando reservas', 'error');
    }
  };

  const cargarBloqueos = async (userId) => {
    try {
      const { data: bloqueosData, error: errorBloqueos } = await supabase
        .from('bloqueos')
        .select('*')
        .eq('user_id', userId);

      if (errorBloqueos && errorBloqueos.code !== 'PGRST116') {
        console.error('❌ Error cargando bloqueos:', errorBloqueos);
        setBloqueos([]);
        return;
      }
      
      setBloqueos(bloqueosData || []);
    } catch (error) {
      console.error('❌ Error cargando bloqueos:', error);
      setBloqueos([]);
    }
  };

  // ✅ FUNCIÓN MEJORADA: Verificar disponibilidad con validación de fechas pasadas
  const estaDisponible = (trabajadorId, fecha, horaInicio, duracionMinutos = 30) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return false;

    // ✅ VALIDACIÓN: No permitir fechas/horas pasadas
    if (esFechaHoraPasada(fecha, horaInicio)) {
      return false;
    }

    const fechaObj = new Date(fecha);
    
    // Verificar límite de días de reserva
    const hoy = new Date();
    const diasDiferencia = Math.ceil((fechaObj - hoy) / (1000 * 60 * 60 * 24));
    if (diasDiferencia > trabajador.limiteDiasReserva) {
      return false;
    }

    const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaObj.getDay()];
    
    // Verificar si es día festivo
    if (trabajador.festivos.includes(fecha)) return false;
    
    // Verificar horarios de trabajo
    const horarioDia = trabajador.horariosTrabajo[diaSemana];
    if (!horarioDia || !horarioDia.activo) return false;
    
    // Convertir hora inicio a minutos
    const [horaIni, minIni] = horaInicio.split(':').map(Number);
    const minutosInicio = horaIni * 60 + minIni;
    const minutosFin = minutosInicio + duracionMinutos;
    
    // Verificar si está dentro de alguna franja horaria
    let dentroFranja = false;
    for (const franja of horarioDia.franjas || []) {
      const [horaFranjaIni, minFranjaIni] = franja.inicio.split(':').map(Number);
      const [horaFranjaFin, minFranjaFin] = franja.fin.split(':').map(Number);
      const minutosFranjaIni = horaFranjaIni * 60 + minFranjaIni;
      const minutosFranjaFin = horaFranjaFin * 60 + minFranjaFin;
      
      if (minutosInicio >= minutosFranjaIni && minutosFin <= minutosFranjaFin) {
        dentroFranja = true;
        break;
      }
    }
    
    if (!dentroFranja) return false;
    
    // Verificar conflictos con reservas existentes
    const reservasConflicto = reservas.filter(r => 
      r.trabajador === trabajadorId && 
      r.fecha === fecha && 
      r.estado !== 'cancelada'
    );
    
    for (const reserva of reservasConflicto) {
      const [horaRes, minRes] = reserva.hora.split(':').map(Number);
      const minutosReserva = horaRes * 60 + minRes;
      
      const servicioReserva = servicios.find(s => s.id === reserva.servicio_id);
      const duracionReserva = servicioReserva ? servicioReserva.duracion : 30;
      const minutosFinReserva = minutosReserva + duracionReserva + trabajador.tiempoDescanso;
      
      // Verificar solapamiento exacto
      if (!(minutosFin + trabajador.tiempoDescanso <= minutosReserva || minutosInicio >= minutosFinReserva)) {
        return false;
      }
    }
    
    // Verificar conflictos con bloqueos manuales
    const bloqueosConflicto = bloqueos.filter(b => 
      b.trabajador === trabajadorId && 
      b.fecha === fecha
    );
    
    for (const bloqueo of bloqueosConflicto) {
      const [horaBloqueoIni, minBloqueoIni] = bloqueo.horaInicio.split(':').map(Number);
      const [horaBloqueoFin, minBloqueoFin] = bloqueo.horaFin.split(':').map(Number);
      const minutosBloqueoIni = horaBloqueoIni * 60 + minBloqueoIni;
      const minutosBloqueoFin = horaBloqueoFin * 60 + minBloqueoFin;
      
      if (!(minutosFin <= minutosBloqueoIni || minutosInicio >= minutosBloqueoFin)) {
        return false;
      }
    }
    
    return true;
  };

  // Generar horas del calendario basadas en configuración del trabajador
  const generarHorasCalendario = (trabajadorId) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    if (!trabajador) return [];

    const horasSet = new Set();
    
    Object.values(trabajador.horariosTrabajo || {}).forEach(horarioDia => {
      if (horarioDia.activo && horarioDia.franjas) {
        horarioDia.franjas.forEach(franja => {
          const [horaIni, minIni] = franja.inicio.split(':').map(Number);
          const [horaFin, minFin] = franja.fin.split(':').map(Number);
          
          for (let minutos = horaIni * 60 + minIni; minutos < horaFin * 60 + minFin; minutos += 30) {
            const hora = Math.floor(minutos / 60);
            const min = minutos % 60;
            const timeString = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            horasSet.add(timeString);
          }
        });
      }
    });
    
    return Array.from(horasSet).sort();
  };

  // ✅ FUNCIÓN MEJORADA: Búsqueda de disponibilidad más precisa
  const buscarProximasDisponibilidades = async () => {
    setBuscandoDisponibilidad(true);
    
    try {
      const resultados = [];
      const fechaInicio = new Date(busquedaDisponibilidad.fechaDesde);
      const trabajadorId = busquedaDisponibilidad.trabajador || trabajadorActivo;
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      
      if (!trabajador) {
        showMessage('Selecciona un trabajador válido', 'error');
        return;
      }
      
      // ✅ OBTENER DURACIÓN EXACTA DEL SERVICIO
      let duracionServicio = 30; // Por defecto
      let servicioSeleccionado = null;
      
      if (busquedaDisponibilidad.servicio) {
        servicioSeleccionado = servicios.find(s => s.id.toString() === busquedaDisponibilidad.servicio);
        if (servicioSeleccionado) {
          duracionServicio = servicioSeleccionado.duracion;
          console.log('🎯 Servicio seleccionado:', servicioSeleccionado.nombre, 'Duración:', duracionServicio, 'min');
        }
      }
      
      const maxDias = trabajador.limiteDiasReserva;
      let diasBuscados = 0;
      
      console.log('🔍 Buscando disponibilidad:', {
        trabajador: trabajador.nombre,
        servicio: servicioSeleccionado?.nombre || 'Cualquiera',
        duracion: duracionServicio,
        desde: busquedaDisponibilidad.fechaDesde,
        horaDesde: busquedaDisponibilidad.horaDesde
      });
      
      for (let dia = 0; dia < maxDias && resultados.length < busquedaDisponibilidad.cantidadResultados && diasBuscados < 90; dia++) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fechaInicio.getDate() + dia);
        const fechaStr = fecha.toISOString().split('T')[0];
        
        // ✅ NO BUSCAR EN FECHAS PASADAS
        if (esFechaHoraPasada(fechaStr)) {
          continue;
        }
        
        diasBuscados++;
        
        const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fecha.getDay()];
        const horarioDia = trabajador.horariosTrabajo[diaSemana];
        
        if (!horarioDia || !horarioDia.activo || trabajador.festivos.includes(fechaStr)) continue;
        
        // Buscar slots disponibles en las franjas del día
        for (const franja of horarioDia.franjas || []) {
          const [horaIni, minIni] = franja.inicio.split(':').map(Number);
          const [horaFin, minFin] = franja.fin.split(':').map(Number);
          
          // ✅ BUSCAR EN INTERVALOS DE 15 MINUTOS para mayor precisión
          for (let minutos = horaIni * 60 + minIni; minutos <= (horaFin * 60 + minFin) - duracionServicio; minutos += 15) {
            const hora = Math.floor(minutos / 60);
            const min = minutos % 60;
            const horaStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            
            // Verificar si es después de la hora mínima del primer día
            if (dia === 0) {
              const [horaMinima, minMinimo] = busquedaDisponibilidad.horaDesde.split(':').map(Number);
              if (minutos < horaMinima * 60 + minMinimo) continue;
            }
            
            // ✅ VERIFICAR DISPONIBILIDAD CON DURACIÓN EXACTA
            if (estaDisponible(trabajadorId, fechaStr, horaStr, duracionServicio)) {
              resultados.push({
                fecha: fechaStr,
                hora: horaStr,
                trabajador: trabajador,
                duracion: duracionServicio,
                servicio: servicioSeleccionado,
                fechaFormateada: fecha.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })
              });
              
              if (resultados.length >= busquedaDisponibilidad.cantidadResultados) break;
            }
          }
          if (resultados.length >= busquedaDisponibilidad.cantidadResultados) break;
        }
        if (resultados.length >= busquedaDisponibilidad.cantidadResultados) break;
      }
      
      console.log('✅ Resultados encontrados:', resultados.length);
      setResultadosDisponibilidad(resultados);
      
      if (resultados.length === 0) {
        showMessage('No se encontraron disponibilidades con los criterios seleccionados', 'error');
      } else {
        showMessage(`Se encontraron ${resultados.length} disponibilidades`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error buscando disponibilidades:', error);
      showMessage('Error al buscar disponibilidades', 'error');
    } finally {
      setBuscandoDisponibilidad(false);
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
      
      const [horaRes, minRes] = r.hora.split(':').map(Number);
      const [horaSlot, minSlot] = hora.split(':').map(Number);
      const minutosReserva = horaRes * 60 + minRes;
      const minutosSlot = horaSlot * 60 + minSlot;
      
      return fechaReserva === fechaDiaStr && 
             minutosReserva >= minutosSlot && 
             minutosReserva < minutosSlot + 30 &&
             r.trabajador === trabajadorActivo &&
             r.estado !== 'cancelada';
    });
  };

  const getBloqueosPorDiaHora = (dia, hora) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(inicioSemana.getDate() + diaIndice);
    const fechaStr = fechaDia.toISOString().split('T')[0];

    return bloqueos.filter(b => {
      if (b.trabajador !== trabajadorActivo || b.fecha !== fechaStr) return false;
      
      const [horaBloqueoIni, minBloqueoIni] = b.horaInicio.split(':').map(Number);
      const [horaBloqueoFin, minBloqueoFin] = b.horaFin.split(':').map(Number);
      const [horaSlot, minSlot] = hora.split(':').map(Number);
      
      const minutosBloqueoIni = horaBloqueoIni * 60 + minBloqueoIni;
      const minutosBloqueoFin = horaBloqueoFin * 60 + minBloqueoFin;
      const minutosSlot = horaSlot * 60 + minSlot;
      
      return minutosSlot >= minutosBloqueoIni && minutosSlot < minutosBloqueoFin;
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

  // ✅ FUNCIÓN MEJORADA: Verificar si día no disponible O si es fecha pasada
  const esDiaNoDisponible = (dia) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorActivo);
    if (!trabajador) return true;
    
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(inicioSemana.getDate() + diaIndice);
    const fechaStr = fechaDia.toISOString().split('T')[0];
    
    // ✅ VERIFICAR SI ES FECHA PASADA
    if (esFechaHoraPasada(fechaStr)) return true;
    
    const diaSemanaKey = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fechaDia.getDay()];
    const horarioDia = trabajador.horariosTrabajo[diaSemanaKey];
    
    return !horarioDia || !horarioDia.activo || trabajador.festivos.includes(fechaStr);
  };

  // ✅ FUNCIÓN MEJORADA: Verificar si slot específico es clickeable
  const esSlotClickeable = (dia, hora) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(inicioSemana.getDate() + diaIndice);
    const fechaStr = fechaDia.toISOString().split('T')[0];
    
    // ✅ NO CLICKEABLE SI ES FECHA/HORA PASADA
    if (esFechaHoraPasada(fechaStr, hora)) return false;
    
    // ✅ NO CLICKEABLE SI EL DÍA NO ESTÁ DISPONIBLE
    if (esDiaNoDisponible(dia)) return false;
    
    // ✅ NO CLICKEABLE SI HAY BLOQUEOS
    const bloqueosEnSlot = getBloqueosPorDiaHora(dia, hora);
    if (bloqueosEnSlot.length > 0) return false;
    
    return true;
  };

  const abrirModal = (dia, hora, reserva = null) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    
    // ✅ VALIDACIÓN: No abrir modal para fechas/horas pasadas
    if (!reserva && esFechaHoraPasada(iso, hora)) {
      showMessage('No puedes crear reservas en fechas u horas pasadas', 'error');
      return;
    }
    
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

  const abrirModalBloqueo = (dia, hora) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    
    setBloqueoFormData({
      fecha: iso,
      horaInicio: hora,
      horaFin: hora,
      motivo: ''
    });
    setModalBloqueo(true);
  };

  const guardarReserva = async () => {
    if (!user || !trabajadorActivo) {
      showMessage('Error: Usuario o trabajador no válido', 'error');
      return;
    }

    if (!modalFormData.nombre.trim()) {
      showMessage('El nombre es requerido', 'error');
      return;
    }

    // ✅ VALIDACIÓN: No permitir guardar reservas en fechas/horas pasadas
    if (!modalData?.id && esFechaHoraPasada(modalData?.fecha, modalFormData.hora)) {
      showMessage('No puedes crear reservas en fechas u horas pasadas', 'error');
      return;
    }

    setGuardandoReserva(true);

    const cliente = {
      nombre: modalFormData.nombre.trim(),
      telefono: modalFormData.telefono.trim(),
      email: modalFormData.email.trim()
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
        const nuevaReserva = {
          trabajador: trabajadorActivo,
          fecha: modalData?.fecha,
          hora,
          cliente,
          observaciones,
          estado: 'confirmada',
          user_id: user.id
        };

        const { error } = await supabase
          .from('reservas')
          .insert([nuevaReserva]);

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
      console.error('❌ Error guardando reserva:', error);
      showMessage(`Error al guardar la reserva: ${error.message}`, 'error');
    } finally {
      setGuardandoReserva(false);
    }
  };

  const guardarBloqueo = async () => {
    if (!user || !trabajadorActivo) {
      showMessage('Error: Usuario o trabajador no válido', 'error');
      return;
    }

    try {
      const nuevoBloqueo = {
        trabajador: trabajadorActivo,
        fecha: bloqueoFormData.fecha,
        horaInicio: bloqueoFormData.horaInicio,
        horaFin: bloqueoFormData.horaFin,
        motivo: bloqueoFormData.motivo || 'Bloqueo manual',
        user_id: user.id
      };

      const { error } = await supabase
        .from('bloqueos')
        .insert([nuevoBloqueo]);

      if (error) {
        setBloqueos([...bloqueos, { ...nuevoBloqueo, id: Date.now() }]);
        showMessage('Bloqueo guardado temporalmente (crear tabla bloqueos en Supabase)', 'success');
      } else {
        await cargarBloqueos(user.id);
        showMessage('Bloqueo guardado exitosamente', 'success');
      }

      setModalBloqueo(false);
      setBloqueoFormData({
        fecha: '',
        horaInicio: '',
        horaFin: '',
        motivo: ''
      });
      
    } catch (error) {
      console.error('❌ Error guardando bloqueo:', error);
      showMessage(`Error al guardar el bloqueo: ${error.message}`, 'error');
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
      console.error('❌ Error al eliminar reserva:', error);
      showMessage('Error al eliminar la reserva', 'error');
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
    
    // ✅ INDICAR SI ES FECHA PASADA
    const esPasada = esFechaHoraPasada(fechaDia.toISOString().split('T')[0]);
    const texto = `${nombreDia} ${fechaDia.getDate()}`;
    
    return esPasada ? `${texto} (pasado)` : texto;
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

  const reservarDesdeDisponibilidad = (resultado) => {
    navegarAFecha(new Date(resultado.fecha));
    setModalDisponibilidad(false);
    
    setTimeout(() => {
      const fechaObj = new Date(resultado.fecha);
      const diaSemana = diasSemana[fechaObj.getDay() === 0 ? 6 : fechaObj.getDay() - 1];
      abrirModal(diaSemana, resultado.hora);
    }, 100);
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
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors w-full"
            >
              Recargar página
            </button>
            {error.includes('autenticado') && (
              <button 
                onClick={() => router.push('/login')}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors w-full"
              >
                Ir a Login
              </button>
            )}
          </div>
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

  const horasCalendario = generarHorasCalendario(trabajadorActivo);

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

            {/* Buscador y herramientas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setModalDisponibilidad(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                title="Buscar disponibilidad"
              >
                <CalendarSearch className="w-4 h-4" />
                <span className="hidden sm:inline">Disponibilidad</span>
                <span className="sm:hidden">Buscar</span>
              </button>

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
                <span className="ml-4 text-xs">
                  Descanso: {getTrabajadorActivo()?.tiempoDescanso}min • 
                  Reserva máx: {getTrabajadorActivo()?.limiteDiasReserva} días
                </span>
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
              {diasSemana.map((dia) => {
                const noDisponible = esDiaNoDisponible(dia);
                return (
                  <div key={dia} className={`p-4 text-center text-white font-semibold ${
                    noDisponible 
                      ? 'bg-gradient-to-r from-red-400 to-red-500' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}>
                    {getDiaConFecha(dia)}
                    {noDisponible && (
                      <div className="text-xs mt-1 opacity-90">No disponible</div>
                    )}
                  </div>
                );
              })}

              {/* Time Slots */}
              {horasCalendario.map((hora) => (
                <>
                  <div key={`hora-${hora}`} className="bg-gray-50 p-4 font-medium text-gray-700 border-t border-gray-200 flex items-center justify-center">
                    {hora}
                  </div>
                  {diasSemana.map((dia) => {
                    const reservasEnSlot = getReservasPorDiaHora(dia, hora);
                    const bloqueosEnSlot = getBloqueosPorDiaHora(dia, hora);
                    const noDisponible = esDiaNoDisponible(dia);
                    const hayBloqueo = bloqueosEnSlot.length > 0;
                    const esClickeable = esSlotClickeable(dia, hora);
                    
                    // ✅ DETERMINAR COLOR Y ESTADO DEL SLOT
                    let claseSlot = 'border-t border-l border-gray-200 p-2 min-h-16 transition-colors group relative overflow-hidden ';
                    
                    if (noDisponible) {
                      claseSlot += 'bg-red-50 cursor-not-allowed';
                    } else if (hayBloqueo) {
                      claseSlot += 'bg-orange-50 cursor-not-allowed';
                    } else if (!esClickeable) {
                      claseSlot += 'bg-gray-100 cursor-not-allowed opacity-50';
                    } else {
                      claseSlot += 'bg-white hover:bg-blue-25 cursor-pointer';
                    }
                    
                    return (
                      <div
                        key={dia + hora}
                        className={claseSlot}
                        onClick={() => esClickeable && abrirModal(dia, hora)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (esClickeable) abrirModalBloqueo(dia, hora);
                        }}
                        title={!esClickeable ? 'Hora no disponible' : 'Click para crear reserva, click derecho para bloquear'}
                      >
                        {/* Add button on hover para slots clickeables */}
                        {esClickeable && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50">
                            <Plus className="w-6 h-6 text-blue-400" />
                          </div>
                        )}

                        {/* Block button para slots válidos */}
                        {esClickeable && (
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalBloqueo(dia, hora);
                              }}
                              className="p-1 rounded bg-orange-100 text-orange-600 hover:bg-orange-200"
                              title="Bloquear horario"
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        
                        {/* Bloqueos */}
                        {bloqueosEnSlot.map((bloqueo) => (
                          <div key={bloqueo.id} className="bg-orange-200 border border-orange-300 rounded p-2 mb-1">
                            <div className="flex items-center gap-1">
                              <Ban className="w-3 h-3 text-orange-600" />
                              <span className="text-xs font-medium text-orange-800">
                                Bloqueado
                              </span>
                            </div>
                            <div className="text-xs text-orange-700">
                              {bloqueo.horaInicio} - {bloqueo.horaFin}
                            </div>
                            {bloqueo.motivo && (
                              <div className="text-xs text-orange-600 truncate">
                                {bloqueo.motivo}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Reservas existentes */}
                        <div className="relative z-10 space-y-1">
                          {reservasEnSlot.map((r) => {
                            const esResaltada = esReservaResaltada(r);
                            const servicio = servicios.find(s => s.id === r.servicio_id);
                            
                            return (
                              <div 
                                key={r.id} 
                                className={`border rounded-lg p-2 shadow-sm hover:shadow-md transition-all ${
                                  esResaltada 
                                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 ring-2 ring-yellow-400 ring-opacity-50' 
                                    : r.estado === 'confirmada'
                                      ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200'
                                      : 'bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300'
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
                                      {r.cliente?.telefono && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                          <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                                          <span className="truncate" title={r.cliente?.telefono}>{r.cliente?.telefono}</span>
                                        </div>
                                      )}
                                      <div className={`flex items-center gap-1 text-xs font-medium ${esResaltada ? 'text-yellow-700' : 'text-blue-700'}`}>
                                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span>{r.hora}</span>
                                        {servicio && (
                                          <span className="text-xs text-gray-500">({servicio.duracion}min)</span>
                                        )}
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
                        
                        {/* Indicadores de estado */}
                        {!esClickeable && reservasEnSlot.length === 0 && bloqueosEnSlot.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-gray-400 text-xs font-medium">
                              {noDisponible ? 'No disponible' : 'Hora pasada'}
                            </div>
                          </div>
                        )}
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
            const noDisponible = esDiaNoDisponible(dia);
            
            const reservasDelDia = reservasFiltradas.filter(r => 
              r.fecha === fechaStr && r.trabajador === trabajadorActivo && r.estado !== 'cancelada'
            );

            return (
              <div key={dia} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className={`p-4 text-center text-white ${
                  noDisponible 
                    ? 'bg-gradient-to-r from-red-400 to-red-500' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}>
                  <h3 className="font-semibold text-lg">{getDiaConFecha(dia)}</h3>
                  <p className="text-blue-100 text-sm">
                    {fechaDia.toLocaleDateString('es-ES', { month: 'long' })}
                    {noDisponible && <span className="block text-xs mt-1">Día no disponible</span>}
                  </p>
                </div>

                <div className="p-4">
                  {reservasDelDia.length > 0 ? (
                    <div className="space-y-3">
                      {reservasDelDia
                        .sort((a, b) => a.hora.localeCompare(b.hora))
                        .map((r) => {
                          const esResaltada = esReservaResaltada(r);
                          const servicio = servicios.find(s => s.id === r.servicio_id);
                          
                          return (
                            <div 
                              key={r.id}
                              className={`border-2 rounded-xl p-4 ${
                                esResaltada 
                                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300' 
                                  : r.estado === 'confirmada'
                                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                                    : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-2 rounded-full ${esResaltada ? 'bg-yellow-200' : 'bg-blue-200'}`}>
                                    <Clock className={`w-4 h-4 ${esResaltada ? 'text-yellow-700' : 'text-blue-700'}`} />
                                  </div>
                                  <div>
                                    <span className={`font-bold text-lg ${esResaltada ? 'text-yellow-800' : 'text-blue-800'}`}>
                                      {r.hora}
                                    </span>
                                    {servicio && (
                                      <span className="text-sm text-gray-600 ml-2">({servicio.duracion} min)</span>
                                    )}
                                  </div>
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
                                
                                {r.cliente?.telefono && (
                                  <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <a href={`tel:${r.cliente?.telefono}`} className="text-gray-700 hover:text-blue-600 transition-colors">
                                      {r.cliente?.telefono}
                                    </a>
                                  </div>
                                )}
                                
                                {r.cliente?.email && (
                                  <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <a href={`mailto:${r.cliente?.email}`} className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
                                      {r.cliente?.email}
                                    </a>
                                  </div>
                                )}

                                {servicio && (
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700 text-sm">{servicio.nombre}</span>
                                  </div>
                                )}

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
                      <div className={`rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center ${
                        noDisponible ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {noDisponible ? (
                          <X className="w-8 h-8 text-red-400" />
                        ) : (
                          <Plus className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-500 mb-4">
                        {noDisponible ? 'Día no disponible' : 'No hay citas programadas'}
                      </p>
                      {!noDisponible && (
                        <button
                          onClick={() => abrirModal(dia, "09:00")}
                          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                          Agregar Cita
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Reserva */}
      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-full">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-800">
                    {modalData?.id ? 'Editar Reserva' : 'Nueva Reserva'}
                  </h2>
                </div>
                <button
                  onClick={() => setModalData(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input 
                    value={modalFormData.nombre}
                    onChange={(e) => handleModalInputChange('nombre', e.target.value)}
                    placeholder="Nombre del cliente" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono (opcional)
                  </label>
                  <input 
                    value={modalFormData.telefono}
                    onChange={(e) => handleModalInputChange('telefono', e.target.value)}
                    placeholder="Número de teléfono" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (opcional)
                  </label>
                  <input 
                    type="email"
                    value={modalFormData.email}
                    onChange={(e) => handleModalInputChange('email', e.target.value)}
                    placeholder="Correo electrónico" 
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Selecciona una hora</option>
                    {horasFormulario
                      .filter(hora => {
                        // ✅ FILTRAR HORAS PASADAS EN EL SELECTOR
                        if (modalData?.id) return true; // Si es edición, permitir cualquier hora
                        return !esFechaHoraPasada(modalData?.fecha, hora);
                      })
                      .map((hora) => (
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalData(null)} 
                  className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={guardandoReserva}
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={guardarReserva}
                  disabled={guardandoReserva}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardandoReserva ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </span>
                  ) : (
                    'Guardar Reserva'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bloqueo */}
      {modalBloqueo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-full">
                  <Ban className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Bloquear Horario
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
                  </label>
                  <input 
                    type="date"
                    value={bloqueoFormData.fecha}
                    onChange={(e) => setBloqueoFormData(prev => ({ ...prev, fecha: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora inicio
                    </label>
                    <select 
                      value={bloqueoFormData.horaInicio}
                      onChange={(e) => setBloqueoFormData(prev => ({ ...prev, horaInicio: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      {horasFormulario.map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora fin
                    </label>
                    <select 
                      value={bloqueoFormData.horaFin}
                      onChange={(e) => setBloqueoFormData(prev => ({ ...prev, horaFin: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      {horasFormulario.map((hora) => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo (opcional)
                  </label>
                  <input 
                    value={bloqueoFormData.motivo}
                    onChange={(e) => setBloqueoFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Motivo del bloqueo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setModalBloqueo(false)} 
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={guardarBloqueo}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl"
                >
                  Bloquear Horario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Búsqueda de Disponibilidad - MEJORADO */}
      {modalDisponibilidad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full">
                    <CalendarSearch className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    Buscar Disponibilidad
                  </h2>
                </div>
                <button
                  onClick={() => setModalDisponibilidad(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desde fecha
                    </label>
                    <input
                      type="date"
                      value={busquedaDisponibilidad.fechaDesde}
                      onChange={(e) => setBusquedaDisponibilidad(prev => ({
                        ...prev,
                        fechaDesde: e.target.value
                      }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Desde hora
                    </label>
                    <select
                      value={busquedaDisponibilidad.horaDesde}
                      onChange={(e) => setBusquedaDisponibilidad(prev => ({
                        ...prev,
                        horaDesde: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      {horasFormulario.map(hora => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Servicio (opcional)
                    </label>
                    <select
                      value={busquedaDisponibilidad.servicio}
                      onChange={(e) => setBusquedaDisponibilidad(prev => ({
                        ...prev,
                        servicio: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      <option value="">Cualquier servicio</option>
                      {/* ✅ MOSTRAR SOLO SERVICIOS DEL USUARIO ACTUAL */}
                      {servicios.map(servicio => (
                        <option key={servicio.id} value={servicio.id}>
                          {servicio.nombre} ({servicio.duracion}min)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trabajador
                    </label>
                    <select
                      value={busquedaDisponibilidad.trabajador}
                      onChange={(e) => setBusquedaDisponibilidad(prev => ({
                        ...prev,
                        trabajador: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      <option value="">Trabajador actual</option>
                      {trabajadores.map(trabajador => (
                        <option key={trabajador.id} value={trabajador.id}>
                          {trabajador.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad de resultados
                    </label>
                    <select
                      value={busquedaDisponibilidad.cantidadResultados}
                      onChange={(e) => setBusquedaDisponibilidad(prev => ({
                        ...prev,
                        cantidadResultados: parseInt(e.target.value)
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      <option value={5}>5 resultados</option>
                      <option value={10}>10 resultados</option>
                      <option value={20}>20 resultados</option>
                      <option value={50}>50 resultados</option>
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-auto">
                    <button
                      onClick={buscarProximasDisponibilidades}
                      disabled={buscandoDisponibilidad}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {buscandoDisponibilidad ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Buscar Disponibilidad
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {resultadosDisponibilidad.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Próximas disponibilidades ({resultadosDisponibilidad.length} encontradas)
                  </h3>
                  
                  <div className="grid gap-3">
                    {resultadosDisponibilidad.map((resultado, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <span className="font-semibold text-gray-800 text-sm sm:text-base">
                                  {resultado.fechaFormateada}
                                </span>
                              </div>
                              <span className="text-green-700 font-medium text-lg">
                                {resultado.hora}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                <span>{resultado.trabajador.nombre}</span>
                              </div>
                              {resultado.servicio && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{resultado.servicio.nombre} ({resultado.duracion} min)</span>
                                </div>
                              )}
                              {!resultado.servicio && resultado.duracion !== 30 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{resultado.duracion} min</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => reservarDesdeDisponibilidad(resultado)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Reservar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {resultadosDisponibilidad.length === 0 && !buscandoDisponibilidad && (
                <div className="text-center py-8">
                  <CalendarSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Haz clic en "Buscar Disponibilidad" para encontrar los próximos horarios libres
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}