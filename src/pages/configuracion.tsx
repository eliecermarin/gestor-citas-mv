import { useEffect, useState } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

export default function Configuracion() {
  const [trabajadores, setTrabajadores] = useState([
    {
      id: 1,
      nombre: "María García",
      servicios: [
        { id: 1, nombre: "Corte de pelo", duracion: 30, precio: 25, mostrarPrecio: true },
        { id: 2, nombre: "Tinte", duracion: 90, precio: 45, mostrarPrecio: true }
      ],
      festivos: ["2025-12-25", "2025-01-01"],
      limiteDiasReserva: 30
    },
    {
      id: 2,
      nombre: "Juan Pérez",
      servicios: [
        { id: 1, nombre: "Masaje relajante", duracion: 60, precio: 35, mostrarPrecio: true },
        { id: 2, nombre: "Consulta", duracion: 45, precio: 0, mostrarPrecio: false }
      ],
      festivos: ["2025-12-31", "2025-08-15"],
      limiteDiasReserva: 45
    }
  ]);

  const [nuevoTrabajador, setNuevoTrabajador] = useState("");
  const [trabajadorExpandido, setTrabajadorExpandido] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Estados para cada trabajador
  const [nuevosServicios, setNuevosServicios] = useState({});
  const [nuevasFechasFestivas, setNuevasFechasFestivas] = useState({});

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const inicializarEstadosTrabajador = (trabajadorId) => {
    if (!nuevosServicios[trabajadorId]) {
      setNuevosServicios(prev => ({
        ...prev,
        [trabajadorId]: { nombre: "", duracion: 20, precio: 0, mostrarPrecio: true }
      }));
    }
    if (!nuevasFechasFestivas[trabajadorId]) {
      setNuevasFechasFestivas(prev => ({
        ...prev,
        [trabajadorId]: ""
      }));
    }
  };

  useEffect(() => {
    trabajadores.forEach(t => inicializarEstadosTrabajador(t.id));
  }, [trabajadores]);

  const agregarTrabajador = () => {
    if (!nuevoTrabajador.trim()) return;
    
    const nuevoId = Math.max(...trabajadores.map(t => t.id), 0) + 1;
    const nuevoTrab = {
      id: nuevoId,
      nombre: nuevoTrabajador,
      servicios: [],
      festivos: [],
      limiteDiasReserva: 30
    };
    
    setTrabajadores([...trabajadores, nuevoTrab]);
    setNuevoTrabajador("");
    setTrabajadorExpandido(nuevoId);
    inicializarEstadosTrabajador(nuevoId);
    showMessage("Trabajador agregado exitosamente");
  };

  const eliminarTrabajador = (id) => {
    setTrabajadores(trabajadores.filter(t => t.id !== id));
    if (trabajadorExpandido === id) {
      setTrabajadorExpandido(trabajadores[0]?.id || null);
    }
    showMessage("Trabajador eliminado");
  };

  const agregarServicio = (trabajadorId) => {
    const nuevoServicio = nuevosServicios[trabajadorId];
    if (!nuevoServicio?.nombre.trim()) return;
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        const nuevoId = Math.max(...t.servicios.map(s => s.id), 0) + 1;
        return {
          ...t,
          servicios: [...t.servicios, { ...nuevoServicio, id: nuevoId }]
        };
      }
      return t;
    }));
    
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: { nombre: "", duracion: 20, precio: 0, mostrarPrecio: true }
    }));
    
    showMessage("Servicio agregado exitosamente");
  };

  const eliminarServicio = (trabajadorId, servicioId) => {
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return {
          ...t,
          servicios: t.servicios.filter(s => s.id !== servicioId)
        };
      }
      return t;
    }));
    showMessage("Servicio eliminado");
  };

  const agregarFestivo = (trabajadorId) => {
    const nuevaFecha = nuevasFechasFestivas[trabajadorId];
    if (!nuevaFecha) return;
    
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        if (t.festivos.includes(nuevaFecha)) {
          showMessage("Esta fecha ya está marcada como festiva", "error");
          return t;
        }
        return {
          ...t,
          festivos: [...t.festivos, nuevaFecha].sort()
        };
      }
      return t;
    }));
    
    setNuevasFechasFestivas(prev => ({
      ...prev,
      [trabajadorId]: ""
    }));
    
    showMessage("Día festivo agregado");
  };

  const eliminarFestivo = (trabajadorId, fecha) => {
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return {
          ...t,
          festivos: t.festivos.filter(f => f !== fecha)
        };
      }
      return t;
    }));
    showMessage("Día festivo eliminado");
  };

  const actualizarLimiteDias = (trabajadorId, limite) => {
    setTrabajadores(trabajadores.map(t => {
      if (t.id === trabajadorId) {
        return { ...t, limiteDiasReserva: limite };
      }
      return t;
    }));
  };

  const actualizarNuevoServicio = (trabajadorId, campo, valor) => {
    setNuevosServicios(prev => ({
      ...prev,
      [trabajadorId]: {
        ...prev[trabajadorId],
        [campo]: valor
      }
    }));
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const guardarConfiguracion = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    showMessage("Configuración guardada exitosamente");
    setIsLoading(false);
  };

  const toggleTrabajador = (id) => {
    setTrabajadorExpandido(trabajadorExpandido === id ? null : id);
  };

  const totalServicios = trabajadores.reduce((total, t) => total + t.servicios.length, 0);
  const totalFestivos = trabajadores.reduce((total, t) => total + t.festivos.length, 0);

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
              onKeyPress={(e) => e.key === 'Enter' && agregarTrabajador()}
            />
            <button 
              onClick={agregarTrabajador}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
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
                                onChange={(e) => actualizarNuevoServicio(trabajador.id, 'duracion', +e.target.value)}
                                placeholder="Duración"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                              />
                              <span className="absolute right-3 top-2 text-gray-500 text-sm">min</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                value={nuevosServicios[trabajador.id]?.precio || 0}
                                onChange={(e) => actualizarNuevoServicio(trabajador.id, 'precio', +e.target.value)}
                                placeholder="Precio"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm sm:text-base"
                              />
                              <span className="absolute right-3 top-2 text-gray-500 text-sm">€</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => actualizarNuevoServicio(trabajador.id, 'mostrarPrecio', !nuevosServicios[trabajador.id]?.mostrarPrecio)}
                              className="flex items-center gap-2 text-sm text-gray-600"
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
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir Servicio
                          </button>
                        </div>
                      </div>

                      {/* Lista de Servicios */}
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {trabajador.servicios.map((servicio) => (
                          <div key={servicio.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base whitespace-nowrap"
                          >
                            <Plus className="w-4 h-4" />
                            Añadir
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto mb-6">
                        {trabajador.festivos.map((fecha) => (
                          <div key={fecha} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm sm:text-base text-gray-800">{formatearFecha(fecha)}</span>
                            <button 
                              onClick={() => eliminarFestivo(trabajador.id, fecha)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días de antelación máximos
                        </label>
                        <input
                          type="number"
                          value={trabajador.limiteDiasReserva}
                          onChange={(e) => actualizarLimiteDias(trabajador.id, +e.target.value)}
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
              <div className="text-xl sm:text-2xl font-bold text-orange-600">
                {trabajadores.length > 0 ? Math.round(trabajadores.reduce((sum, t) => sum + t.limiteDiasReserva, 0) / trabajadores.length) : 0}
              </div>
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
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {isLoading ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}