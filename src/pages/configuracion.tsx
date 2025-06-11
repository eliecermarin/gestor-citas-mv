import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, AlertCircle, Euro, Link, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

export default function Configuracion() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trabajadores, setTrabajadores] = useState([]);
  const [serviciosGlobales, setServiciosGlobales] = useState([]);
  const [configuracionNegocio, setConfiguracionNegocio] = useState(null);
  const [nuevoTrabajador, setNuevoTrabajador] = useState("");
  const [trabajadorExpandido, setTrabajadorExpandido] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState("negocio");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [nuevosServicios, setNuevosServicios] = useState({});
  const [nuevasFechasFestivas, setNuevasFechasFestivas] = useState({});
  
  // Estados para configuración del negocio
  const [datosNegocio, setDatosNegocio] = useState({
    nombre_negocio: '',
    slug: '',
    descripcion: '',
    telefono_contacto: '',
    direccion: '',
    horario_atencion: '',
    dias_reserva_max: 30
  });
  const [slugDisponible, setSlugDisponible] = useState(null);
  const [verificandoSlug, setVerificandoSlug] = useState(false);
  const [urlCopiada, setUrlCopiada] = useState(false);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const cargarDatos = useCallback(async (userId) => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando datos para usuario:', userId);

      // ✅ CARGAR CONFIGURACIÓN DEL NEGOCIO
      const { data: config, error: errorConfig } = await supabase
        .from('configuracion')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (errorConfig && errorConfig.code !== 'PGRST116') {
        console.error('Error cargando configuración:', errorConfig);
      } else if (config) {
        console.log('✅ Configuración cargada:', config);
        setConfiguracionNegocio(config);
        setDatosNegocio({
          nombre_negocio: config.nombre_negocio || '',
          slug: config.slug || '',
          descripcion: config.descripcion || '',
          telefono_contacto: config.telefono_contacto || '',
          direccion: config.direccion || '',
          horario_atencion: config.horario_atencion || '',
          dias_reserva_max: config.dias_reserva_max || 30
        });
      }

      // Cargar servicios globales
      const { data: servicios, error: errorServicios } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', userId);

      if (errorServicios) {
        console.error('Error cargando servicios:', errorServicios);
        throw errorServicios;
      }
      console.log('✅ Servicios cargados:', servicios?.length || 0);
      setServiciosGlobales(servicios || []);

      // Cargar trabajadores
      const { data: trabajadoresData, error: errorTrabajadores } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('user_id', userId);

      if (errorTrabajadores) {
        console.error('Error cargando trabajadores:', errorTrabajadores);
        throw errorTrabajadores;
      }

      console.log('✅ Trabajadores cargados:', trabajadoresData?.length || 0);

      // Procesar trabajadores con sus servicios Y HORARIOS
      const trabajadoresProcesados = (trabajadoresData || []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        servicios: t.servicios ? 
          t.servicios.map((sId) => servicios?.find(s => s.id === sId)).filter(Boolean) || [] 
          : [],
        festivos: t.festivos || [],
        limiteDiasReserva: t.duracionCitaDefecto || 30,
        horariosTrabajo: t.horariosTrabajo || {}, // ✅ CARGAR HORARIOS
        tiempoDescanso: t.tiempoDescanso || 15,   // ✅ CARGAR TIEMPO DESCANSO
        user_id: t.user_id
      }));

      setTrabajadores(trabajadoresProcesados);
      
      // Inicializar estados para cada trabajador
      trabajadoresProcesados.forEach((t) => inicializarEstadosTrabajador(t.id));
      
      if (trabajadoresProcesados.length > 0 && !trabajadorExpandido) {
        setTrabajadorExpandido(trabajadoresProcesados[0].id);
      }

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
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

  // ✅ FUNCIÓN: Generar slug automáticamente desde el nombre
  const generarSlugDesdeNombre = () => {
    const nombre = datosNegocio.nombre_negocio.trim();
    if (!nombre) {
      showMessage('Primero escribe el nombre del negocio');
      return;
    }
    
    const slugGenerado = nombre
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setDatosNegocio(prev => ({ ...prev, slug: slugGenerado }));
    verificarSlugDisponible(slugGenerado);
  };

  // ✅ FUNCIÓN: Verificar si el slug está disponible
  const verificarSlugDisponible = async (slug) => {
    if (!slug || slug.length < 3) {
      setSlugDisponible(null);
      return;
    }
    
    setVerificandoSlug(true);
    
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('slug, user_id')
        .eq('slug', slug)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // No existe, está disponible
        setSlugDisponible(true);
      } else if (data && data.user_id === user?.id) {
        // Es el slug actual del usuario
        setSlugDisponible(true);
      } else {
        // Ya existe para otro usuario
        setSlugDisponible(false);
      }
    } catch (error) {
      console.error('Error verificando slug:', error);
      setSlugDisponible(null);
    } finally {
      setVerificandoSlug(false);
    }
  };

  // ✅ FUNCIÓN: Guardar configuración del negocio
  const guardarConfiguracionNegocio = async () => {
    if (!user) {
      showMessage('Error: Usuario no autenticado');
      return;
    }
    
    if (!datosNegocio.nombre_negocio.trim()) {
      showMessage('El nombre del negocio es requerido');
      return;
    }
    
    if (!datosNegocio.slug.trim()) {
      showMessage('El identificador web es requerido');
      return;
    }
    
    if (slugDisponible === false) {
      showMessage('Este identificador ya está en uso');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const datosActualizados = {
        ...datosNegocio,
        user_id: user.id
      };
      
      console.log('💾 Guardando configuración:', datosActualizados);
      
      if (configuracionNegocio) {
        // Actualizar configuración existente
        const { error } = await supabase
          .from('configuracion')
          .update(datosActualizados)
          .eq('id', configuracionNegocio.id)
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await supabase
          .from('configuracion')
          .insert([datosActualizados]);
          
        if (error) throw error;
      }
      
      showMessage('✅ Configuración guardada exitosamente');
      await cargarDatos(user.id);
      
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      showMessage(`Error al guardar: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FUNCIÓN: Copiar URL pública
  const copiarUrlPublica = async () => {
    if (!datosNegocio.slug) return;
    
    const urlPublica = `${window.location.origin}/reservas/${datosNegocio.slug}`;
    
    try {
      await navigator.clipboard.writeText(urlPublica);
      setUrlCopiada(true);
      showMessage('✅ URL copiada al portapapeles');
      setTimeout(() => setUrlCopiada(false), 2000);
    } catch (error) {
      console.error('Error copiando URL:', error);
      showMessage('Error al copiar la URL');
    }
  };

  // ✅ FUNCIÓN: Abrir URL pública en nueva pestaña
  const abrirUrlPublica = () => {
    if (!datosNegocio.slug) return;
    
    const urlPublica = `${window.location.origin}/reservas/${datosNegocio.slug}`;
    window.open(urlPublica, '_blank');
  };

  const inicializarEstadosTrabajador = (trabajadorId) => {
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || { nombre: "", duracion: 30, precio: 0, mostrarPrecio: true }
    }));
    
    setNuevasFechasFestivas(prev => ({
      ...prev,
      [trabajadorId]: prev[trabajadorId] || ""
    }));
  };

  // ✅ FUNCIÓN AGREGAR TRABAJADOR CON HORARIOS POR DEFECTO
  const agregarTrabajador = async () => {
    if (!nuevoTrabajador.trim() || !user) return;
    
    try {
      console.log('🔄 Intentando crear trabajador:', nuevoTrabajador);
      
      // ✅ HORARIOS POR DEFECTO (Lunes-Viernes: 9-13 y 15-19)
      const horariosDefecto = {
        "lunes": {
          "activo": true,
          "franjas": [
            {"inicio": "09:00", "fin": "13:00"},
            {"inicio": "15:00", "fin": "19:00"}
          ]
        },
        "martes": {
          "activo": true,
          "franjas": [
            {"inicio": "09:00", "fin": "13:00"},
            {"inicio": "15:00", "fin": "19:00"}
          ]
        },
        "miercoles": {
          "activo": true,
          "franjas": [
            {"inicio": "09:00", "fin": "13:00"},
            {"inicio": "15:00", "fin": "19:00"}
          ]
        },
        "jueves": {
          "activo": true,
          "franjas": [
            {"inicio": "09:00", "fin": "13:00"},
            {"inicio": "15:00", "fin": "19:00"}
          ]
        },
        "viernes": {
          "activo": true,
          "franjas": [
            {"inicio": "09:00", "fin": "13:00"},
            {"inicio": "15:00", "fin": "19:00"}
          ]
        },
        "sabado": {
          "activo": false,
          "franjas": []
        },
        "domingo": {
          "activo": false,
          "franjas": []
        }
      };
      
      const trabajadorData = {
        nombre: nuevoTrabajador.trim(),
        servicios: [],
        festivos: [],
        duracionCitaDefecto: 30,
        user_id: user.id,
        // 🔥 AGREGAR HORARIOS OBLIGATORIOS
        horariosTrabajo: horariosDefecto,
        tiempoDescanso: 15,
        limiteDiasReserva: 30
      };

      console.log('📝 Datos a insertar:', trabajadorData);

      const { data, error } = await supabase
        .from('trabajadores')
        .insert([trabajadorData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error SQL:', error);
        throw error;
      }

      console.log('✅ Trabajador creado:', data);

      const nuevoTrab = {
        id: data.id,
        nombre: data.nombre,
        servicios: [],
        festivos: data.festivos || [],
        limiteDiasReserva: data.duracionCitaDefecto || 30,
        horariosTrabajo: data.horariosTrabajo || horariosDefecto,
        tiempoDescanso: data.tiempoDescanso || 15,
        user_id: data.user_id
      };
      
      setTrabajadores([...trabajadores, nuevoTrab]);
      setNuevoTrabajador("");
      setTrabajadorExpandido(data.id);
      inicializarEstadosTrabajador(data.id);
      showMessage("✅ Trabajador agregado con horarios: L-V 9:00-13:00 y 15:00-19:00");

    } catch (error) {
      console.error('❌ Error completo:', error);
      showMessage(`Error: ${error.message || 'Error desconocido'}`);
    }
  };

  const eliminarTrabajador = async (id) => {
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
      showMessage("✅ Trabajador eliminado");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador");
    }
  };

  // 🕒 FUNCIONES PARA MANEJAR HORARIOS
  const actualizarHorarioTrabajador = async (trabajadorId, dia, campo, valor) => {
    if (!user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      // Obtener horarios actuales desde la base de datos
      const { data: trabajadorDB, error: errorGet } = await supabase
        .from('trabajadores')
        .select('horariosTrabajo')
        .eq('id', trabajadorId)
        .single();

      if (errorGet) throw errorGet;

      const horariosActuales = trabajadorDB.horariosTrabajo || {};
      
      // Actualizar el campo específico
      const horarioActualizado = {
        ...horariosActuales,
        [dia]: {
          ...horariosActuales[dia],
          [campo]: valor,
          // Si se desactiva el día, limpiar franjas
          franjas: valor === false ? [] : (horariosActuales[dia]?.franjas || [])
        }
      };

      // Guardar en base de datos
      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: horarioActualizado })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: horarioActualizado };
        }
        return t;
      }));

      showMessage(`✅ Horario de ${dia} actualizado`);
    } catch (error) {
      console.error('Error actualizando horario:', error);
      showMessage('Error actualizando horario');
    }
  };

  const actualizarFranjaTrabajador = async (trabajadorId, dia, franjaIndex, campo, valor) => {
    if (!user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      // Obtener horarios actuales
      const { data: trabajadorDB, error: errorGet } = await supabase
        .from('trabajadores')
        .select('horariosTrabajo')
        .eq('id', trabajadorId)
        .single();

      if (errorGet) throw errorGet;

      const horariosActuales = trabajadorDB.horariosTrabajo || {};
      const franjasActuales = horariosActuales[dia]?.franjas || [];
      
      // Actualizar la franja específica
      const franjasActualizadas = franjasActuales.map((franja, index) => {
        if (index === franjaIndex) {
          return { ...franja, [campo]: valor };
        }
        return franja;
      });

      const horarioActualizado = {
        ...horariosActuales,
        [dia]: {
          ...horariosActuales[dia],
          franjas: franjasActualizadas
        }
      };

      // Guardar en base de datos
      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: horarioActualizado })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: horarioActualizado };
        }
        return t;
      }));

    } catch (error) {
      console.error('Error actualizando franja:', error);
      showMessage('Error actualizando horario');
    }
  };

  const agregarFranjaTrabajador = async (trabajadorId, dia) => {
    if (!user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      // Obtener horarios actuales
      const { data: trabajadorDB, error: errorGet } = await supabase
        .from('trabajadores')
        .select('horariosTrabajo')
        .eq('id', trabajadorId)
        .single();

      if (errorGet) throw errorGet;

      const horariosActuales = trabajadorDB.horariosTrabajo || {};
      const franjasActuales = horariosActuales[dia]?.franjas || [];
      
      // Nueva franja por defecto
      const nuevaFranja = { inicio: "09:00", fin: "13:00" };
      const franjasActualizadas = [...franjasActuales, nuevaFranja];

      const horarioActualizado = {
        ...horariosActuales,
        [dia]: {
          ...horariosActuales[dia],
          activo: true,
          franjas: franjasActualizadas
        }
      };

      // Guardar en base de datos
      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: horarioActualizado })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: horarioActualizado };
        }
        return t;
      }));

      showMessage(`✅ Nueva franja agregada para ${dia}`);
    } catch (error) {
      console.error('Error agregando franja:', error);
      showMessage('Error agregando horario');
    }
  };

  const eliminarFranjaTrabajador = async (trabajadorId, dia, franjaIndex) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar esta franja horaria?')) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      // Obtener horarios actuales
      const { data: trabajadorDB, error: errorGet } = await supabase
        .from('trabajadores')
        .select('horariosTrabajo')
        .eq('id', trabajadorId)
        .single();

      if (errorGet) throw errorGet;

      const horariosActuales = trabajadorDB.horariosTrabajo || {};
      const franjasActuales = horariosActuales[dia]?.franjas || [];
      
      // Eliminar la franja específica
      const franjasActualizadas = franjasActuales.filter((_, index) => index !== franjaIndex);

      const horarioActualizado = {
        ...horariosActuales,
        [dia]: {
          ...horariosActuales[dia],
          franjas: franjasActualizadas
        }
      };

      // Guardar en base de datos
      const { error } = await supabase
        .from('trabajadores')
        .update({ horariosTrabajo: horarioActualizado })
        .eq('id', trabajadorId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      setTrabajadores(trabajadores.map(t => {
        if (t.id === trabajadorId) {
          return { ...t, horariosTrabajo: horarioActualizado };
        }
        return t;
      }));

      showMessage(`✅ Franja eliminada de ${dia}`);
    } catch (error) {
      console.error('Error eliminando franja:', error);
      showMessage('Error eliminando horario');
    }
  };

  const agregarServicio = async (trabajadorId) => {
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

      showMessage("✅ Servicio agregado exitosamente");
    } catch (error) {
      console.error('Error agregando servicio:', error);
      showMessage("Error agregando servicio");
    }
  };

  const eliminarServicio = async (trabajadorId, servicioId) => {
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
      
      showMessage("✅ Servicio eliminado del trabajador");
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      showMessage("Error eliminando servicio");
    }
  };

  const agregarFestivo = async (trabajadorId) => {
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
      
      showMessage("✅ Día festivo agregado");
    } catch (error) {
      console.error('Error agregando festivo:', error);
      showMessage("Error agregando día festivo");
    }
  };

  const eliminarFestivo = async (trabajadorId, fecha) => {
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
      
      showMessage("✅ Día festivo eliminado");
    } catch (error) {
      console.error('Error eliminando festivo:', error);
      showMessage("Error eliminando día festivo");
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleTrabajador = (id) => {
    setTrabajadorExpandido(trabajadorExpandido === id ? null : id);
  };

  // Debounce para verificación de slug
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (datosNegocio.slug && datosNegocio.slug.length >= 3) {
        verificarSlugDisponible(datosNegocio.slug);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [datosNegocio.slug]);

  if (isLoading && trabajadores.length === 0 && !configuracionNegocio) {
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
                Configura tu negocio, equipo y página pública
              </p>
              {user && (
                <p style={{ color: '#667eea', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                  Usuario: {user.email}
                </p>
              )}
            </div>
          </div>

          {/* ✅ Navegación por secciones */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
            <button
              onClick={() => setSeccionActiva('negocio')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: seccionActiva === 'negocio' ? '#667eea' : 'transparent',
                color: seccionActiva === 'negocio' ? 'white' : '#666',
                fontWeight: seccionActiva === 'negocio' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              🏢 Información del Negocio
            </button>
            <button
              onClick={() => setSeccionActiva('trabajadores')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: seccionActiva === 'trabajadores' ? '#667eea' : 'transparent',
                color: seccionActiva === 'trabajadores' ? 'white' : '#666',
                fontWeight: seccionActiva === 'trabajadores' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              👥 Trabajadores y Servicios
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: message.includes('Error') || message.includes('❌') ? '#ef4444' : '#10b981',
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

        {/* ✅ SECCIÓN: Configuración del Negocio */}
        {seccionActiva === 'negocio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Información Básica */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Settings size={20} style={{ color: '#667eea' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  Información del Negocio
                </h2>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Nombre del Negocio *
                  </label>
                  <input
                    value={datosNegocio.nombre_negocio}
                    onChange={(e) => setDatosNegocio(prev => ({ ...prev, nombre_negocio: e.target.value }))}
                    placeholder="Mi Peluquería"
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={datosNegocio.descripcion}
                    onChange={(e) => setDatosNegocio(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Breve descripción de tu negocio..."
                    rows={3}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Teléfono de Contacto
                    </label>
                    <input
                      value={datosNegocio.telefono_contacto}
                      onChange={(e) => setDatosNegocio(prev => ({ ...prev, telefono_contacto: e.target.value }))}
                      placeholder="+34 600 000 000"
                      className="form-input"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Días Máx. Reserva
                    </label>
                    <input
                      type="number"
                      value={datosNegocio.dias_reserva_max}
                      onChange={(e) => setDatosNegocio(prev => ({ ...prev, dias_reserva_max: parseInt(e.target.value) || 30 }))}
                      min="1"
                      max="365"
                      className="form-input"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Dirección (opcional)
                  </label>
                  <input
                    value={datosNegocio.direccion}
                    onChange={(e) => setDatosNegocio(prev => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Calle Principal 123, Ciudad"
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Horario de Atención (opcional)
                  </label>
                  <input
                    value={datosNegocio.horario_atencion}
                    onChange={(e) => setDatosNegocio(prev => ({ ...prev, horario_atencion: e.target.value }))}
                    placeholder="Lunes a Viernes: 9:00 - 19:00"
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                  />
                </div>
              </div>
            </div>

            {/* ✅ Configuración de URL Pública */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Link size={20} style={{ color: '#10b981' }} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  URL Pública para Reservas
                </h2>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Esta será la dirección web que compartirás con tus clientes para que hagan reservas online.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Identificador Web *
                  </label>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
                    <div style={{ 
                      flex: 1, 
                      minWidth: '200px',
                      position: 'relative'
                    }}>
                      <input
                        value={datosNegocio.slug}
                        onChange={(e) => {
                          const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setDatosNegocio(prev => ({ ...prev, slug }));
                        }}
                        placeholder="mi-peluqueria"
                        className="form-input"
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          fontSize: '1rem',
                          paddingRight: verificandoSlug ? '2.5rem' : '0.75rem'
                        }}
                      />
                      
                      {verificandoSlug && (
                        <div style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '16px',
                          height: '16px',
                          border: '2px solid #f3f3f3',
                          borderTop: '2px solid #667eea',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                      )}
                    </div>
                    
                    <button
                      onClick={generarSlugDesdeNombre}
                      disabled={!datosNegocio.nombre_negocio.trim()}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        color: '#374151',
                        fontSize: '0.875rem',
                        cursor: datosNegocio.nombre_negocio.trim() ? 'pointer' : 'not-allowed',
                        opacity: datosNegocio.nombre_negocio.trim() ? 1 : 0.5,
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      🔄 Auto-generar
                    </button>
                  </div>

                  {/* Estado del slug */}
                  {datosNegocio.slug && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      {slugDisponible === true && (
                        <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} />
                          ✅ Disponible
                        </div>
                      )}
                      {slugDisponible === false && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={16} />
                          ❌ Ya está en uso - prueba otro
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview de la URL */}
                {datosNegocio.slug && slugDisponible && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginTop: '1rem'
                  }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#15803d', margin: '0 0 0.5rem 0' }}>
                      🌐 Tu URL pública será:
                    </h4>
                    
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ color: '#16a34a', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined' ? window.location.origin : 'https://tudominio.com'}/reservas/{datosNegocio.slug}
                      </span>
                      
                      <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                        <button
                          onClick={copiarUrlPublica}
                          style={{
                            padding: '0.5rem',
                            background: urlCopiada ? '#10b981' : '#16a34a',
                            border: 'none',
                            borderRadius: '0.25rem',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Copiar URL"
                        >
                          {urlCopiada ? <CheckCircle size={14} /> : <Copy size={14} />}
                        </button>
                        
                        <button
                          onClick={abrirUrlPublica}
                          style={{
                            padding: '0.5rem',
                            background: '#16a34a',
                            border: 'none',
                            borderRadius: '0.25rem',
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Abrir en nueva pestaña"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p style={{ color: '#15803d', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                      📱 Comparte esta URL con tus clientes para que puedan hacer reservas online 24/7
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Botón guardar configuración */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={guardarConfiguracionNegocio}
                disabled={isLoading || !datosNegocio.nombre_negocio.trim() || !datosNegocio.slug.trim() || slugDisponible === false}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  background: (!datosNegocio.nombre_negocio.trim() || !datosNegocio.slug.trim() || slugDisponible === false) ? '#9ca3af' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (!datosNegocio.nombre_negocio.trim() || !datosNegocio.slug.trim() || slugDisponible === false) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: (!datosNegocio.nombre_negocio.trim() || !datosNegocio.slug.trim() || slugDisponible === false) ? 'none' : '0 10px 25px rgba(102, 126, 234, 0.3)'
                }}
              >
                {isLoading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    💾 Guardar Configuración
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN: Trabajadores y Servicios */}
        {seccionActiva === 'trabajadores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Agregar Trabajador */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <Plus size={20} style={{ color: '#667eea' }} />
                <h2 style={{ fontSize: 'clamp(1.125rem, 3vw, 1.25rem)', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                  Agregar Nuevo Trabajador
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
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
                    fontSize: '0.875rem'
                  }}
                >
                  <Plus size={16} />
                  ➕ Añadir Trabajador
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
                              {trabajador.servicios.length} servicios • {trabajador.festivos.length} días festivos
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
                              <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                                  style={{ 
                                    padding: '0.75rem', 
                                    border: '1px solid #ddd', 
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    width: '100%'
                                  }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                                    style={{ 
                                      padding: '0.75rem', 
                                      border: '1px solid #ddd', 
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem'
                                    }}
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
                                    style={{ 
                                      padding: '0.75rem', 
                                      border: '1px solid #ddd', 
                                      borderRadius: '0.5rem',
                                      fontSize: '0.875rem'
                                    }}
                                    min="0"
                                    step="0.01"
                                  />
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
                                    gap: '0.5rem'
                                  }}
                                >
                                  <Plus size={16} />
                                  ➕ Agregar Servicio
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
                                    <p style={{ color: '#666', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                                      {servicio.duracion} min
                                      {servicio.precio > 0 && (
                                        <span style={{ marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
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

                          {/* ✅ HORARIOS DE TRABAJO */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                              <Clock size={20} style={{ color: '#f59e0b' }} />
                              <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                                Horarios de Trabajo
                              </h4>
                            </div>

                            <div style={{ 
                              background: '#fefbf3', 
                              border: '1px solid #fed7aa', 
                              borderRadius: '0.75rem', 
                              padding: '1rem',
                              marginBottom: '1rem'
                            }}>
                              <div style={{ display: 'grid', gap: '1rem' }}>
                                {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((dia) => {
                                  const horarioDia = trabajador.horariosTrabajo?.[dia] || { activo: false, franjas: [] };
                                  const nombreDia = dia.charAt(0).toUpperCase() + dia.slice(1);
                                  
                                  return (
                                    <div key={dia} style={{ 
                                      background: 'white', 
                                      border: `1px solid ${horarioDia.activo ? '#bbf7d0' : '#e5e7eb'}`,
                                      borderRadius: '0.5rem', 
                                      padding: '1rem' 
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <label style={{ 
                                          fontSize: '0.875rem', 
                                          fontWeight: '600', 
                                          color: horarioDia.activo ? '#16a34a' : '#6b7280' 
                                        }}>
                                          {nombreDia}
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            checked={horarioDia.activo}
                                            onChange={(e) => actualizarHorarioTrabajador(trabajador.id, dia, 'activo', e.target.checked)}
                                            style={{ width: '16px', height: '16px' }}
                                          />
                                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            {horarioDia.activo ? 'Disponible' : 'No disponible'}
                                          </span>
                                        </label>
                                      </div>
                                      
                                      {horarioDia.activo && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                          {/* Franjas horarias existentes */}
                                          {horarioDia.franjas?.map((franja, index) => (
                                            <div key={index} style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '0.5rem',
                                              padding: '0.5rem',
                                              background: '#f0fdf4',
                                              borderRadius: '0.25rem',
                                              border: '1px solid #bbf7d0'
                                            }}>
                                              <input
                                                type="time"
                                                value={franja.inicio}
                                                onChange={(e) => actualizarFranjaTrabajador(trabajador.id, dia, index, 'inicio', e.target.value)}
                                                style={{ 
                                                  padding: '0.25rem', 
                                                  border: '1px solid #d1d5db', 
                                                  borderRadius: '0.25rem',
                                                  fontSize: '0.75rem'
                                                }}
                                              />
                                              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>-</span>
                                              <input
                                                type="time"
                                                value={franja.fin}
                                                onChange={(e) => actualizarFranjaTrabajador(trabajador.id, dia, index, 'fin', e.target.value)}
                                                style={{ 
                                                  padding: '0.25rem', 
                                                  border: '1px solid #d1d5db', 
                                                  borderRadius: '0.25rem',
                                                  fontSize: '0.75rem'
                                                }}
                                              />
                                              <button
                                                onClick={() => eliminarFranjaTrabajador(trabajador.id, dia, index)}
                                                style={{
                                                  background: '#fef2f2',
                                                  border: '1px solid #fecaca',
                                                  borderRadius: '0.25rem',
                                                  padding: '0.25rem',
                                                  color: '#dc2626',
                                                  cursor: 'pointer',
                                                  fontSize: '0.75rem'
                                                }}
                                                title="Eliminar franja"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ))}
                                          
                                          {/* Botón para agregar nueva franja */}
                                          <button
                                            onClick={() => agregarFranjaTrabajador(trabajador.id, dia)}
                                            style={{
                                              background: '#f0fdf4',
                                              border: '1px dashed #bbf7d0',
                                              borderRadius: '0.25rem',
                                              padding: '0.5rem',
                                              color: '#16a34a',
                                              cursor: 'pointer',
                                              fontSize: '0.75rem',
                                              fontWeight: '500'
                                            }}
                                          >
                                            + Agregar horario
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div style={{ 
                                marginTop: '1rem', 
                                padding: '0.75rem', 
                                background: '#eff6ff', 
                                borderRadius: '0.5rem',
                                border: '1px solid #bfdbfe'
                              }}>
                                <p style={{ color: '#1e40af', fontSize: '0.75rem', margin: 0 }}>
                                  💡 <strong>Tip:</strong> Puedes configurar múltiples franjas horarias por día (ej: 9:00-13:00 y 15:00-19:00)
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Días Festivos */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                              <Calendar size={20} style={{ color: '#8b5cf6' }} />
                              <h4 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1a202c', margin: 0 }}>
                                Días Festivos
                              </h4>
                            </div>

                            {/* Formulario para agregar festivo */}
                            <div style={{ 
                              background: '#f8f9fa', 
                              padding: '1rem', 
                              borderRadius: '0.75rem', 
                              marginBottom: '1rem',
                              border: '1px solid #e9ecef'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                                    width: '100%'
                                  }}
                                />
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
                                    gap: '0.5rem'
                                  }}
                                >
                                  <Plus size={16} />
                                  📅 Agregar Día Festivo
                                </button>
                              </div>
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

                            {/* Límite de Reserva */}
                            <div style={{ 
                              background: '#fff7ed', 
                              border: '1px solid #fed7aa', 
                              borderRadius: '0.75rem', 
                              padding: '1rem' 
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <Shield size={18} style={{ color: '#ea580c' }} />
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#ea580c', margin: 0 }}>
                                  Límite de Reserva
                                </h4>
                              </div>
                              <p style={{ color: '#9a3412', margin: 0, fontSize: '0.875rem' }}>
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
                  ➕ Añadir Primer Trabajador
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resumen */}
        {(trabajadores.length > 0 || datosNegocio.slug) && (
          <div className="card" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a202c', margin: '0 0 1rem 0' }}>
              📊 Resumen de Configuración
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
              
              {/* Mostrar URL pública si está configurada */}
              {datosNegocio.slug && (
                <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#16a34a', marginBottom: '0.5rem' }}>
                    <Link size={20} style={{ display: 'inline' }} />
                  </div>
                  <div style={{ color: '#15803d', fontSize: '0.875rem', fontWeight: '500' }}>
                    URL Pública Activa
                  </div>
                  <div style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    /reservas/{datosNegocio.slug}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}