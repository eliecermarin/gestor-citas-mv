import { useEffect, useState, useCallback } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle, CheckCircle, Euro, Scissors, UserPlus, Search } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/router";

// Estilos definidos como objetos
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #e0f2fe 0%, #e8eaf6 50%, #f3e5f5 100%)",
    padding: "1rem",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "1rem",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  iconContainer: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    padding: "0.75rem",
    borderRadius: "50%",
    color: "white",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: "bold",
    color: "#1f2937",
    margin: "0",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "0.875rem",
    margin: "0.25rem 0 0 0",
  },
  button: {
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  buttonSecondary: {
    backgroundColor: "#10b981",
    color: "white",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  buttonDanger: {
    backgroundColor: "#ef4444",
    color: "white",
    padding: "0.5rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: "500",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  },
  select: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box" as const,
    backgroundColor: "white",
    cursor: "pointer",
  },
  trabajadorCard: {
    backgroundColor: "white",
    borderRadius: "1rem",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
    marginBottom: "1.5rem",
  },
  trabajadorHeader: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    padding: "1.5rem",
    cursor: "pointer",
    color: "white",
  },
  trabajadorContent: {
    padding: "1.5rem",
  },
  gridTwoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    "@media (max-width: 1024px)": {
      gridTemplateColumns: "1fr",
    }
  },
  servicioCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "0.5rem",
    border: "1px solid #e9ecef",
    marginBottom: "0.75rem",
  },
  festivoCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.75rem",
    backgroundColor: "#fef3c7",
    borderRadius: "0.5rem",
    border: "1px solid #fbbf24",
    marginBottom: "0.5rem",
  },
  modal: {
    position: "fixed" as const,
    inset: "0",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 50,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "1rem",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
    width: "100%",
    maxWidth: "48rem",
    maxHeight: "80vh",
    overflowY: "auto" as const,
    padding: "1.5rem",
  },
  toast: {
    position: "fixed" as const,
    top: "1rem",
    right: "1rem",
    zIndex: 50,
    padding: "1rem",
    borderRadius: "0.5rem",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    transition: "all 0.3s",
    color: "white",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  toastSuccess: {
    backgroundColor: "#10b981",
  },
  toastError: {
    backgroundColor: "#ef4444",
  },
  loadingSpinner: {
    width: "3rem",
    height: "3rem",
    border: "2px solid #f3f4f6",
    borderTop: "2px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 1rem",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "2rem",
    backgroundColor: "#f8f9fa",
    borderRadius: "0.5rem",
    border: "2px dashed #dee2e6",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1f2937",
    margin: "0 0 1rem 0",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  },
  statCard: {
    textAlign: "center" as const,
    padding: "1rem",
    borderRadius: "0.5rem",
  },
  statCardBlue: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
  },
  statCardGreen: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  statCardOrange: {
    backgroundColor: "#fed7aa",
    color: "#ea580c",
  },
};

export default function Configuracion() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trabajadores, setTrabajadores] = useState([]);
  const [serviciosGlobales, setServiciosGlobales] = useState([]);
  const [nuevoTrabajador, setNuevoTrabajador] = useState("");
  const [trabajadorExpandido, setTrabajadorExpandido] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [modalDisponibilidad, setModalDisponibilidad] = useState(false);
  const [configuracionNegocio, setConfiguracionNegocio] = useState({
    nombreNegocio: '',
    diasReservaMax: 30
  });

  // Estados para formularios
  const [nuevosServicios, setNuevosServicios] = useState({});
  const [nuevasFechasFestivas, setNuevasFechasFestivas] = useState({});

  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(""), 3000);
  };

  const cargarDatos = useCallback(async (userId) => {
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
      const trabajadoresProcesados = (trabajadoresData || []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        apellido: t.apellido || '',
        servicios: t.servicios ? 
          t.servicios.map((sId) => servicios?.find(s => s.id === sId)).filter(Boolean) || [] 
          : [],
        festivos: t.festivos || [],
        limiteDiasReserva: t.duracionCitaDefecto || 30,
        user_id: t.user_id
      }));

      setTrabajadores(trabajadoresProcesados);
      
      // Inicializar estados para cada trabajador
      trabajadoresProcesados.forEach((t) => inicializarEstadosTrabajador(t.id));
      
      if (trabajadoresProcesados.length > 0 && !trabajadorExpandido) {
        setTrabajadorExpandido(trabajadoresProcesados[0].id);
      }

      // Cargar configuración del negocio
      const { data: configData, error: errorConfig } = await supabase
        .from('configuracion')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!errorConfig && configData) {
        setConfiguracionNegocio({
          nombreNegocio: configData.nombre_negocio || '',
          diasReservaMax: configData.dias_reserva_max || 30
        });
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

  const agregarTrabajador = async () => {
    if (!nuevoTrabajador.trim() || !user) return;
    
    try {
      const trabajadorData = {
        nombre: nuevoTrabajador.trim(),
        apellido: '',
        horarios: {},
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

      if (error) throw error;

      const nuevoTrab = {
        id: data.id,
        nombre: data.nombre,
        apellido: data.apellido || '',
        servicios: [],
        festivos: [],
        limiteDiasReserva: data.duracionCitaDefecto || 30,
        user_id: data.user_id
      };
      
      setTrabajadores([...trabajadores, nuevoTrab]);
      setNuevoTrabajador("");
      setTrabajadorExpandido(data.id);
      inicializarEstadosTrabajador(data.id);
      showMessage("Trabajador agregado exitosamente", "success");
    } catch (error) {
      console.error('Error agregando trabajador:', error);
      showMessage(`Error: ${error.message || 'Error desconocido'}`, 'error');
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

      setTrabajadores(trabajadores.filter(t => t.id !== id));
      if (trabajadorExpandido === id) {
        const remaining = trabajadores.filter(t => t.id !== id);
        setTrabajadorExpandido(remaining[0]?.id || null);
      }
      showMessage("Trabajador eliminado", "success");
    } catch (error) {
      console.error('Error eliminando trabajador:', error);
      showMessage("Error eliminando trabajador", "error");
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

      showMessage("Servicio agregado exitosamente", "success");
    } catch (error) {
      console.error('Error agregando servicio:', error);
      showMessage("Error agregando servicio", "error");
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
      
      showMessage("Servicio eliminado del trabajador", "success");
    } catch (error) {
      console.error('Error eliminando servicio:', error);
      showMessage("Error eliminando servicio", "error");
    }
  };

  const agregarFestivo = async (trabajadorId) => {
    const nuevaFecha = nuevasFechasFestivas[trabajadorId];
    if (!nuevaFecha || !user) return;
    
    try {
      const trabajador = trabajadores.find(t => t.id === trabajadorId);
      if (!trabajador) return;

      if (trabajador.festivos.includes(nuevaFecha)) {
        showMessage("Esta fecha ya está marcada como festiva", "error");
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
      
      showMessage("Día festivo agregado", "success");
    } catch (error) {
      console.error('Error agregando festivo:', error);
      showMessage("Error agregando día festivo", "error");
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
      
      showMessage("Día festivo eliminado", "success");
    } catch (error) {
      console.error('Error eliminando festivo:', error);
      showMessage("Error eliminando día festivo", "error");
    }
  };

  const actualizarLimiteDias = async (trabajadorId, limite) => {
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
      
      showMessage("Límite actualizado exitosamente", "success");
    } catch (error) {
      console.error('Error actualizando límite:', error);
      showMessage("Error actualizando límite de días", "error");
    }
  };

  const guardarConfiguracionNegocio = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert({
          user_id: user.id,
          nombre_negocio: configuracionNegocio.nombreNegocio,
          dias_reserva_max: configuracionNegocio.diasReservaMax
        });

      if (error) throw error;
      
      showMessage("Configuración guardada exitosamente", "success");
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showMessage("Error guardando configuración", "error");
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

  // Función para obtener disponibilidades
  const obtenerDisponibilidades = () => {
    // Esta función se conectaría con la lógica de disponibilidad de la página de agenda
    // Por ahora simular algunos datos
    const disponibilidades = [];
    const hoy = new Date();
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      if (fecha.getDay() >= 1 && fecha.getDay() <= 5) { // Solo días laborables
        for (let hora of ['09:00', '10:00', '11:00', '15:00', '16:00', '17:00']) {
          disponibilidades.push({
            fecha: fecha.toISOString().split('T')[0],
            hora,
            dia: fecha.toLocaleDateString('es-ES', { weekday: 'long' }),
            trabajadores: trabajadores.filter(t => !t.festivos.includes(fecha.toISOString().split('T')[0]))
          });
        }
      }
    }
    
    return disponibilidades.slice(0, 10);
  };

  if (isLoading && trabajadores.length === 0) {
    return (
      <div style={{
        ...styles.container,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={styles.loadingSpinner}></div>
          <p style={{ color: "#6b7280" }}>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const totalServicios = trabajadores.reduce((total, t) => total + t.servicios.length, 0);
  const totalFestivos = trabajadores.reduce((total, t) => total + t.festivos.length, 0);

  return (
    <div style={styles.container}>
      {/* Message Toast */}
      {message && (
        <div style={{
          ...styles.toast,
          ...(message.type === 'error' ? styles.toastError : styles.toastSuccess)
        }}>
          {message.type === 'error' ? (
            <AlertCircle style={{ width: "1.25rem", height: "1.25rem" }} />
          ) : (
            <CheckCircle style={{ width: "1.25rem", height: "1.25rem" }} />
          )}
          {message.text}
        </div>
      )}

      <div style={{ maxWidth: "6rem", margin: "0 auto" }}>
        {/* Header */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.iconContainer}>
              <Settings style={{ width: "1.5rem", height: "1.5rem" }} />
            </div>
            <div>
              <h1 style={styles.title}>
                Configuración del Negocio
              </h1>
              <p style={styles.subtitle}>
                Gestiona tu equipo, servicios y disponibilidad
              </p>
              {user && (
                <p style={{ fontSize: "0.75rem", color: "#3b82f6", margin: "0.25rem 0 0 0" }}>
                  Usuario: {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Configuración General */}
          <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.75rem", padding: "1rem" }}>
            <h3 style={{ ...styles.sectionTitle, color: "#3b82f6" }}>
              <Settings style={{ width: "1.25rem", height: "1.25rem" }} />
              Configuración General
            </h3>
            <div style={styles.formGrid}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  value={configuracionNegocio.nombreNegocio}
                  onChange={(e) => setConfiguracionNegocio(prev => ({
                    ...prev,
                    nombreNegocio: e.target.value
                  }))}
                  placeholder="Mi Negocio"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                  Días máximos de reserva
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={configuracionNegocio.diasReservaMax}
                  onChange={(e) => setConfiguracionNegocio(prev => ({
                    ...prev,
                    diasReservaMax: parseInt(e.target.value) || 30
                  }))}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
              <button
                onClick={guardarConfiguracionNegocio}
                style={styles.button}
              >
                <Save style={{ width: "1rem", height: "1rem" }} />
                Guardar Configuración
              </button>
              
              {/* BOTÓN CONSULTAR DISPONIBILIDAD */}
              <button
                onClick={() => setModalDisponibilidad(true)}
                style={styles.buttonSecondary}
              >
                <Search style={{ width: "1rem", height: "1rem" }} />
                Consultar Disponibilidad
              </button>
            </div>
          </div>
        </div>

        {/* Agregar Trabajador */}
        <div style={styles.card}>
          <div style={{ ...styles.sectionTitle, color: "#10b981" }}>
            <UserPlus style={{ width: "1.25rem", height: "1.25rem" }} />
            Agregar Nuevo Trabajador
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.5rem" }}>
                Nombre del trabajador
              </label>
              <input
                value={nuevoTrabajador}
                onChange={(e) => setNuevoTrabajador(e.target.value)}
                placeholder="Nombre del trabajador"
                style={styles.input}
                onKeyPress={(e) => e.key === 'Enter' && agregarTrabajador()}
                disabled={isLoading}
              />
            </div>
            <button 
              onClick={agregarTrabajador}
              disabled={isLoading || !nuevoTrabajador.trim()}
              style={{
                ...styles.buttonSecondary,
                opacity: (!nuevoTrabajador.trim() || isLoading) ? 0.6 : 1,
                cursor: (!nuevoTrabajador.trim() || isLoading) ? "not-allowed" : "pointer"
              }}
            >
              <Plus style={{ width: "1rem", height: "1rem" }} />
              Añadir
            </button>
          </div>
        </div>

        {/* Lista de Trabajadores */}
        {trabajadores.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {trabajadores.map((trabajador) => (
              <div key={trabajador.id} style={styles.trabajadorCard}>
                {/* Header del Trabajador */}
                <div 
                  style={styles.trabajadorHeader}
                  onClick={() => toggleTrabajador(trabajador.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ 
                        width: "3rem", 
                        height: "3rem", 
                        backgroundColor: "rgba(255, 255, 255, 0.2)", 
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <User style={{ width: "1.5rem", height: "1.5rem" }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", margin: "0" }}>
                          {trabajador.nombre}
                        </h3>
                        <p style={{ margin: "0.25rem 0 0 0", opacity: 0.9 }}>
                          {trabajador.servicios.length} servicios • {trabajador.festivos.length} días festivos
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarTrabajador(trabajador.id);
                        }}
                        style={{ 
                          backgroundColor: "rgba(255, 255, 255, 0.2)",
                          border: "none",
                          padding: "0.5rem",
                          borderRadius: "0.5rem",
                          color: "white",
                          cursor: "pointer",
                          transition: "background 0.3s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.8)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)"}
                      >
                        <Trash2 style={{ width: "1rem", height: "1rem" }} />
                      </button>
                      {trabajadorExpandido === trabajador.id ? 
                        <ChevronUp style={{ width: "1.25rem", height: "1.25rem" }} /> : 
                        <ChevronDown style={{ width: "1.25rem", height: "1.25rem" }} />
                      }
                    </div>
                  </div>
                </div>

                {/* Contenido Expandible */}
                {trabajadorExpandido === trabajador.id && (
                  <div style={styles.trabajadorContent}>
                    <div style={styles.gridTwoColumns}>
                      {/* Servicios */}
                      <div>
                        <div style={{ ...styles.sectionTitle, color: "#8b5cf6" }}>
                          <Scissors style={{ width: "1.25rem", height: "1.25rem" }} />
                          Servicios
                        </div>
                        
                        {/* Agregar Servicio */}
                        <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem" }}>
                          <div style={styles.formGrid}>
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
                              style={{ ...styles.input, fontSize: "0.875rem" }}
                            />
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
                              style={{ ...styles.input, fontSize: "0.875rem" }}
                              min="1"
                            />
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
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
                              style={{ ...styles.input, fontSize: "0.875rem", flex: 1 }}
                              min="0"
                              step="0.01"
                            />
                            <button
                              onClick={() => agregarServicio(trabajador.id)}
                              disabled={!nuevosServicios[trabajador.id]?.nombre?.trim()}
                              style={{
                                ...styles.button,
                                backgroundColor: "#8b5cf6",
                                fontSize: "0.875rem",
                                opacity: !nuevosServicios[trabajador.id]?.nombre?.trim() ? 0.5 : 1,
                                cursor: !nuevosServicios[trabajador.id]?.nombre?.trim() ? "not-allowed" : "pointer"
                              }}
                            >
                              <Plus style={{ width: "1rem", height: "1rem" }} />
                              Agregar
                            </button>
                          </div>
                        </div>
                        
                        {/* Lista de Servicios */}
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                          {trabajador.servicios.map((servicio) => (
                            <div key={servicio.id} style={styles.servicioCard}>
                              <div>
                                <h5 style={{ fontWeight: "600", color: "#1f2937", margin: "0" }}>
                                  {servicio.nombre}
                                </h5>
                                <p style={{ color: "#6b7280", margin: "0.25rem 0 0 0", fontSize: "0.875rem" }}>
                                  {servicio.duracion} min
                                  {servicio.precio > 0 && (
                                    <span style={{ marginLeft: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                      <Euro style={{ width: "0.75rem", height: "0.75rem" }} />
                                      {servicio.precio}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button 
                                onClick={() => eliminarServicio(trabajador.id, servicio.id)}
                                style={{
                                  padding: "0.25rem",
                                  color: "#ef4444",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  cursor: "pointer",
                                  transition: "background-color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                title="Quitar servicio"
                              >
                                <Trash2 style={{ width: "1rem", height: "1rem" }} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.servicios.length === 0 && (
                            <div style={styles.emptyState}>
                              <Scissors style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", opacity: 0.5, color: "#9ca3af" }} />
                              <p style={{ color: "#6b7280", margin: "0" }}>No hay servicios configurados</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Días Festivos y Configuración */}
                      <div>
                        <div style={{ ...styles.sectionTitle, color: "#f59e0b" }}>
                          <Calendar style={{ width: "1.25rem", height: "1.25rem" }} />
                          Días Festivos
                        </div>

                        {/* Agregar Día Festivo */}
                        <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem" }}>
                          <div style={{ display: "flex", gap: "0.75rem" }}>
                            <input
                              type="date"
                              value={nuevasFechasFestivas[trabajador.id] || ''}
                              onChange={(e) => setNuevasFechasFestivas(prev => ({
                                ...prev,
                                [trabajador.id]: e.target.value
                              }))}
                              min={new Date().toISOString().split('T')[0]}
                              style={{ ...styles.input, fontSize: "0.875rem", flex: 1 }}
                            />
                            <button
                              onClick={() => agregarFestivo(trabajador.id)}
                              disabled={!nuevasFechasFestivas[trabajador.id]}
                              style={{
                                ...styles.button,
                                backgroundColor: "#f59e0b",
                                fontSize: "0.875rem",
                                opacity: !nuevasFechasFestivas[trabajador.id] ? 0.5 : 1,
                                cursor: !nuevasFechasFestivas[trabajador.id] ? "not-allowed" : "pointer"
                              }}
                            >
                              <Plus style={{ width: "1rem", height: "1rem" }} />
                              Agregar
                            </button>
                          </div>
                        </div>

                        {/* Lista de Días Festivos */}
                        <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "1.5rem" }}>
                          {trabajador.festivos.map((fecha) => (
                            <div key={fecha} style={styles.festivoCard}>
                              <span style={{ color: "#92400e", fontWeight: "500" }}>
                                {formatearFecha(fecha)}
                              </span>
                              <button 
                                onClick={() => eliminarFestivo(trabajador.id, fecha)}
                                style={{
                                  padding: "0.25rem",
                                  color: "#ef4444",
                                  backgroundColor: "transparent",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  cursor: "pointer"
                                }}
                                title="Eliminar día festivo"
                              >
                                <Trash2 style={{ width: "0.875rem", height: "0.875rem" }} />
                              </button>
                            </div>
                          ))}
                          
                          {trabajador.festivos.length === 0 && (
                            <div style={styles.emptyState}>
                              <Calendar style={{ width: "2rem", height: "2rem", margin: "0 auto 0.5rem", opacity: 0.5, color: "#9ca3af" }} />
                              <p style={{ color: "#6b7280", margin: "0" }}>No hay días festivos configurados</p>
                            </div>
                          )}
                        </div>

                        {/* Límite de Reserva */}
                        <div style={{ 
                          backgroundColor: "#fff7ed", 
                          border: "1px solid #fed7aa", 
                          borderRadius: "0.5rem", 
                          padding: "1rem" 
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                            <Shield style={{ width: "1.125rem", height: "1.125rem", color: "#ea580c" }} />
                            <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#ea580c", margin: "0" }}>
                              Límite de Reserva
                            </h4>
                          </div>
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={trabajador.limiteDiasReserva}
                              onChange={(e) => actualizarLimiteDias(trabajador.id, parseInt(e.target.value) || 30)}
                              style={{ width: "5rem", ...styles.input, fontSize: "0.875rem" }}
                            />
                            <span style={{ fontSize: "0.875rem", color: "#9a3412" }}>
                              días de antelación máxima
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...styles.card, textAlign: "center", padding: "3rem" }}>
            <div style={{ 
              width: "5rem", 
              height: "5rem", 
              backgroundColor: "#f3f4f6", 
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem"
            }}>
              <User style={{ width: "2.5rem", height: "2.5rem", color: "#9ca3af" }} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: "0 0 0.5rem 0" }}>
              No tienes trabajadores configurados
            </h3>
            <p style={{ color: "#6b7280", margin: "0 0 1.5rem 0" }}>
              Añade tu primer trabajador para empezar a gestionar tu negocio
            </p>
            <button 
              onClick={() => document.querySelector('input')?.focus()}
              style={styles.button}
            >
              Añadir Primer Trabajador
            </button>
          </div>
        )}

        {/* Resumen */}
        {trabajadores.length > 0 && (
          <div style={styles.card}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", margin: "0 0 1rem 0" }}>
              Resumen de Configuración
            </h2>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "1rem" 
            }}>
              <div style={{ ...styles.statCard, ...styles.statCardBlue }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                  {trabajadores.length}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                  Trabajadores
                </div>
              </div>
              <div style={{ ...styles.statCard, ...styles.statCardGreen }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                  {totalServicios}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                  Servicios Totales
                </div>
              </div>
              <div style={{ ...styles.statCard, ...styles.statCardOrange }}>
                <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.25rem" }}>
                  {totalFestivos}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                  Días Festivos
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de consulta de disponibilidad */}
      {modalDisponibilidad && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div style={styles.header}>
                <div style={{ ...styles.iconContainer, backgroundColor: "#10b981" }}>
                  <Clock style={{ width: "1.25rem", height: "1.25rem" }} />
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1f2937", margin: "0" }}>
                  Consultar Disponibilidad
                </h2>
              </div>
              <button
                onClick={() => setModalDisponibilidad(false)}
                style={{
                  color: "#9ca3af",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: "0.5rem",
                  cursor: "pointer"
                }}
              >
                <X style={{ width: "1.25rem", height: "1.25rem" }} />
              </button>
            </div>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#1f2937", marginBottom: "1rem" }}>
                Próximas disponibilidades
              </h3>
              
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {obtenerDisponibilidades().map((disp, index) => (
                  <div key={index} style={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    marginBottom: "0.5rem",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontWeight: "500", color: "#1f2937", margin: "0" }}>
                          {disp.dia} {new Date(disp.fecha).getDate()} - {disp.hora}
                        </p>
                        <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                          Disponible: {disp.trabajadores.map(t => t.nombre).join(', ')}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        {disp.trabajadores.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setModalDisponibilidad(false);
                              // Aquí se podría navegar a la fecha específica en el calendario
                              showMessage(`Horario disponible: ${disp.dia} ${disp.hora} con ${t.nombre}`, 'success');
                            }}
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#dbeafe",
                              border: "1px solid #bfdbfe",
                              color: "#1d4ed8",
                              fontSize: "0.75rem",
                              borderRadius: "0.25rem",
                              cursor: "pointer",
                              transition: "background-color 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#bfdbfe"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dbeafe"}
                          >
                            {t.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {obtenerDisponibilidades().length === 0 && (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem" }}>
                  No hay disponibilidades en los próximos días
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .grid-two-columns {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}