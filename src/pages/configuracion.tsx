/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Settings, User, Clock, Calendar, Shield, Trash2, Plus, Save } from "lucide-react";

export default function Configuracion() {
  const [trabajadores, setTrabajadores] = useState([
    { id: 1, nombre: "María García" },
    { id: 2, nombre: "Juan Pérez" }
  ]);
  const [servicios, setServicios] = useState([
    { id: 1, nombre: "Corte de pelo", duracion: 30, precio: 25 },
    { id: 2, nombre: "Tinte", duracion: 90, precio: 45 }
  ]);
  const [festivos, setFestivos] = useState([
    "2025-12-25",
    "2025-01-01"
  ]);

  const [nuevoTrabajador, setNuevoTrabajador] = useState("");
  const [nuevoServicio, setNuevoServicio] = useState({ nombre: "", duracion: 20, precio: 0 });
  const [nuevaFechaFestiva, setNuevaFechaFestiva] = useState("");
  const [limiteDiasReserva, setLimiteDiasReserva] = useState(30);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const agregarTrabajador = async () => {
    if (!nuevoTrabajador.trim()) return;
    setIsLoading(true);
    
    const nuevoId = Math.max(...trabajadores.map(t => t.id)) + 1;
    setTrabajadores([...trabajadores, { id: nuevoId, nombre: nuevoTrabajador }]);
    setNuevoTrabajador("");
    showMessage("Trabajador agregado exitosamente");
    setIsLoading(false);
  };

  const eliminarTrabajador = async (id) => {
    setTrabajadores(trabajadores.filter(t => t.id !== id));
    showMessage("Trabajador eliminado");
  };

  const agregarServicio = async () => {
    if (!nuevoServicio.nombre.trim()) return;
    setIsLoading(true);
    
    const nuevoId = Math.max(...servicios.map(s => s.id)) + 1;
    setServicios([...servicios, { ...nuevoServicio, id: nuevoId }]);
    setNuevoServicio({ nombre: "", duracion: 20, precio: 0 });
    showMessage("Servicio agregado exitosamente");
    setIsLoading(false);
  };

  const eliminarServicio = async (id) => {
    setServicios(servicios.filter(s => s.id !== id));
    showMessage("Servicio eliminado");
  };

  const agregarFestivo = async () => {
    if (!nuevaFechaFestiva) return;
    if (festivos.includes(nuevaFechaFestiva)) {
      showMessage("Esta fecha ya está marcada como festiva", "error");
      return;
    }
    
    setFestivos([...festivos, nuevaFechaFestiva].sort());
    setNuevaFechaFestiva("");
    showMessage("Día festivo agregado");
  };

  const eliminarFestivo = async (fecha) => {
    setFestivos(festivos.filter(f => f !== fecha));
    showMessage("Día festivo eliminado");
  };

  const guardarConfiguracion = async () => {
    setIsLoading(true);
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    showMessage("Configuración guardada exitosamente");
    setIsLoading(false);
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Configuración del Negocio</h1>
              <p className="text-gray-600 mt-1">Gestiona tu equipo, servicios y disponibilidad</p>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Trabajadores */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Trabajadores</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex gap-3 mb-6">
                <input
                  value={nuevoTrabajador}
                  onChange={(e) => setNuevoTrabajador(e.target.value)}
                  placeholder="Nombre del trabajador"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && agregarTrabajador()}
                />
                <button 
                  onClick={agregarTrabajador} 
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Añadir
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {trabajadores.map((trabajador) => (
                  <div key={trabajador.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-800">{trabajador.nombre}</span>
                    </div>
                    <button 
                      onClick={() => eliminarTrabajador(trabajador.id)} 
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Servicios */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Servicios</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid gap-3 mb-6">
                <input
                  value={nuevoServicio.nombre}
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                  placeholder="Nombre del servicio"
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={nuevoServicio.duracion}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, duracion: +e.target.value })}
                    placeholder="Duración (min)"
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <input
                    type="number"
                    value={nuevoServicio.precio}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, precio: +e.target.value })}
                    placeholder="Precio (€)"
                    className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <button 
                  onClick={agregarServicio} 
                  disabled={isLoading}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Servicio
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {servicios.map((servicio) => (
                  <div key={servicio.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-800">{servicio.nombre}</h3>
                      <p className="text-sm text-gray-600">{servicio.duracion} min • {servicio.precio} €</p>
                    </div>
                    <button 
                      onClick={() => eliminarServicio(servicio.id)} 
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Days Festivos */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Días Festivos</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex gap-3 mb-6">
                <input
                  type="date"
                  value={nuevaFechaFestiva}
                  onChange={(e) => setNuevaFechaFestiva(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <button 
                  onClick={agregarFestivo} 
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Añadir
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {festivos.map((fecha) => (
                  <div key={fecha} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-800">{formatearFecha(fecha)}</span>
                    </div>
                    <button 
                      onClick={() => eliminarFestivo(fecha)} 
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Configuración General */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Configuración General</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite de días para reservar
                </label>
                <input
                  type="number"
                  value={limiteDiasReserva}
                  onChange={(e) => setLimiteDiasReserva(+e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  min="1"
                  max="365"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Los clientes solo podrán reservar con hasta <strong>{limiteDiasReserva} días</strong> de antelación.
                </p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-medium text-orange-800 mb-2">Resumen de configuración</h3>
                <div className="text-sm text-orange-700 space-y-1">
                  <p>• {trabajadores.length} trabajadores registrados</p>
                  <p>• {servicios.length} servicios disponibles</p>
                  <p>• {festivos.length} días festivos marcados</p>
                  <p>• Reservas hasta {limiteDiasReserva} días de antelación</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <button 
            onClick={guardarConfiguracion}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl flex items-center gap-3 text-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}