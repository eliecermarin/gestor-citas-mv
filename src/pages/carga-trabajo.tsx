import { useEffect, useState, useCallback } from "react";
import { Calendar, Clock, User, Phone, Mail, Edit2, Trash2, Plus, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Horas para el calendario principal (de hora en hora)
const horasCalendario = Array.from({ length: 15 }, (_, i) => `${(8 + i).toString().padStart(2, '0')}:00`); // 08:00 - 22:00

// Horas para el selector del formulario (intervalos de 5 minutos)
const horasFormulario: string[] = [];  // ← Con el tipado
for (let hour = 8; hour <= 22; hour++) {
  for (let minute = 0; minute < 60; minute += 5) {
    if (hour === 22 && minute > 0) break; // No pasar de 22:00
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    horasFormulario.push(timeString);
  }
}

// Simulamos supabase para el ejemplo
let mockReservas: Reserva[] = [];

type SupabaseResponse<T> = { data: T[] | null };
type SupabaseInsertResponse = { data: Reserva | null };
type SupabaseUpdateResponse = { data: Reserva | null };
type SupabaseDeleteResponse = { data: null };

const supabase = {
  from: (table: string) => ({
    select: (): Promise<SupabaseResponse<Trabajador | Reserva>> => {
      if (table === "trabajadores") {
        return Promise.resolve({ data: [
          { id: "1", nombre: "María García" },
          { id: "2", nombre: "Ana López" },
          { id: "3", nombre: "Carmen Silva" }
        ] as Trabajador[] });
      } else if (table === "reservas") {
        // Inicializar datos de ejemplo solo la primera vez
        if (mockReservas.length === 0) {
          const hoy = new Date();
          const mañana = new Date(hoy);
          mañana.setDate(hoy.getDate() + 1);
          const pasadoMañana = new Date(hoy);
          pasadoMañana.setDate(hoy.getDate() + 2);
          
          mockReservas = [
            {
              id: "1",
              trabajador: "1",
              fecha: hoy.toISOString().split("T")[0],
              hora: "08:15",
              cliente: {
                nombre: "Laura Martín García",
                telefono: "612345678",
                email: "laura.martin@email.com"
              },
              observaciones: "Reunión matutina"
            },
            {
              id: "2",
              trabajador: "1",
              fecha: hoy.toISOString().split("T")[0],
              hora: "10:30",
              cliente: {
                nombre: "Carlos González Pérez",
                telefono: "654987321",
                email: "carlos.gonzalez@email.com"
              },
              observaciones: "Consulta técnica"
            },
            {
              id: "3",
              trabajador: "1",
              fecha: mañana.toISOString().split("T")[0],
              hora: "15:30",
              cliente: {
                nombre: "Patricia Ruiz López",
                telefono: "687654321",
                email: "patricia.ruiz@email.com"
              },
              observaciones: "Consulta inicial"
            },
            {
              id: "4",
              trabajador: "2",
              fecha: pasadoMañana.toISOString().split("T")[0],
              hora: "09:45",
              cliente: {
                nombre: "Ana María Sánchez",
                telefono: "600123456",
                email: "anamaria@email.com"
              },
              observaciones: "Revisión trimestral"
            }
          ];
        }
        return Promise.resolve({ data: [...mockReservas] });
      }
      return Promise.resolve({ data: [] });
    },
    insert: (data: Omit<Reserva, 'id'>): Promise<SupabaseInsertResponse> => {
      const newReserva = {
        ...data,
        id: Date.now().toString()
      };
      mockReservas.push(newReserva);
      return Promise.resolve({ data: newReserva });
    },
    update: (data: Partial<Reserva>) => ({
      eq: (field: string, value: string): Promise<SupabaseUpdateResponse> => {
        const index = mockReservas.findIndex((r) => (r as Record<string, unknown>)[field] === value);
        if (index !== -1) {
          mockReservas[index] = { ...mockReservas[index], ...data };
        }
        return Promise.resolve({ data: mockReservas[index] || null });
      }
    }),
    delete: () => ({
      eq: (field: string, value: string): Promise<SupabaseDeleteResponse> => {
        mockReservas = mockReservas.filter((r) => (r as Record<string, unknown>)[field] !== value);
        return Promise.resolve({ data: null });
      }
    })
  })
};

type Reserva = {
  id: string;
  trabajador: string;
  fecha: string;
  hora: string;
  cliente: {
    nombre: string;
    telefono: string;
    email: string;
  };
  observaciones: string;
};

type Trabajador = {
  id: string;
  nombre: string;
};

type ModalData = {
  id?: string;
  fecha: string;
  hora: string;
  cliente?: {
    nombre: string;
    telefono: string;
    email: string;
  };
};

export default function CargaTrabajo() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [reservasFiltradas, setReservasFiltradas] = useState<Reserva[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [trabajadorActivo, setTrabajadorActivo] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [fechaActual, setFechaActual] = useState<Date>(new Date());
  const [busqueda, setBusqueda] = useState<string>("");
  const [modalDisponibilidad, setModalDisponibilidad] = useState<boolean>(false);

  useEffect(() => {
    const cargarTrabajadores = async () => {
      const { data } = await supabase.from("trabajadores").select("*");
      if (data) {
        setTrabajadores(data as Trabajador[]);
        setTrabajadorActivo((data as Trabajador[])[0]?.id || null);
      }
    };
    cargarTrabajadores();
  }, []);

  useEffect(() => {
    const cargarReservas = async () => {
      const { data } = await supabase.from("reservas").select("*");
      if (data) {
        setReservas(data as Reserva[]);
        setReservasFiltradas(data as Reserva[]);
      }
    };
    cargarReservas();
  }, []);

  const navegarAFecha = useCallback((fecha: Date) => {
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
      
      // Navegar a la primera reserva encontrada del trabajador activo
      if (filtradas.length > 0 && trabajadorActivo) {
        const primeraReservaDelTrabajador = filtradas.find(r => r.trabajador === trabajadorActivo);
        if (primeraReservaDelTrabajador) {
          const fechaReserva = new Date(primeraReservaDelTrabajador.fecha);
          navegarAFecha(fechaReserva);
        }
      }
    }
  }, [busqueda, reservas, trabajadorActivo, navegarAFecha]);

  const getReservasPorDiaHora = (dia: string, hora: string) => {
    return reservasFiltradas.filter((r) => {
      const fecha = new Date(r.fecha);
      
      // Obtener la fecha de la semana actual basada en fechaActual
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

  const getInicioSemana = (fecha: Date) => {
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const cambiarSemana = (direccion: number) => {
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
    
    const opciones: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short' 
    };
    
    return `${inicio.toLocaleDateString('es-ES', opciones)} - ${fin.toLocaleDateString('es-ES', opciones)}`;
  };

  const abrirModal = (dia: string, hora: string, reserva?: Reserva) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(dia);
    const fecha = new Date(inicioSemana);
    fecha.setDate(inicioSemana.getDate() + diaIndice);
    const iso = fecha.toISOString().split("T")[0];
    setModalData(reserva ? { ...reserva, cliente: reserva.cliente } : { fecha: iso, hora });
  };

  const eliminarReserva = async (id: string) => {
    try {
      await supabase.from("reservas").delete().eq("id", id);
      const { data: nuevasReservas } = await supabase.from("reservas").select("*");
      if (nuevasReservas) {
        setReservas(nuevasReservas as Reserva[]);
        setReservasFiltradas(nuevasReservas as Reserva[]);
      }
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
    }
  };

  const getTrabajadorActivo = () => {
    return trabajadores.find(t => t.id === trabajadorActivo);
  };

  const getDiaConFecha = (nombreDia: string) => {
    const inicioSemana = getInicioSemana(fechaActual);
    const diaIndice = diasSemana.indexOf(nombreDia);
    const fechaDia = new Date(inicioSemana);
    fechaDia.setDate(inicioSemana.getDate() + diaIndice);
    return `${nombreDia} ${fechaDia.getDate()}`;
  };

  const esReservaResaltada = (reserva: Reserva) => {
    if (!busqueda.trim()) return false;
    const busquedaLower = busqueda.toLowerCase();
    return (
      reserva.cliente?.nombre?.toLowerCase().includes(busquedaLower) ||
      reserva.cliente?.email?.toLowerCase().includes(busquedaLower)
    );
  };

  const buscarDisponibilidad = (fecha: string, hora: string, trabajadorId?: string) => {
    const reservasEnFechaHora = reservas.filter(r => 
      r.fecha === fecha && 
      r.hora.substring(0, 2) === hora.substring(0, 2) &&
      (!trabajadorId || r.trabajador === trabajadorId)
    );
    
    if (trabajadorId) {
      return reservasEnFechaHora.length === 0;
    }

    const trabajadoresOcupados = reservasEnFechaHora.map(r => r.trabajador);
    return trabajadores.filter(t => !trabajadoresOcupados.includes(t.id));
  };

  const obtenerProximasDisponibilidades = (fechaInicio: Date, cantidadDias: number = 7) => {
    const disponibilidades = [];
    const fecha = new Date(fechaInicio);
    
    for (let d = 0; d < cantidadDias; d++) {
      const fechaStr = fecha.toISOString().split('T')[0];
      const diaSemana = fecha.getDay();
      
      if (diaSemana >= 1 && diaSemana <= 5) {
        for (const hora of horasCalendario) {
          const trabajadoresDisponibles = buscarDisponibilidad(fechaStr, hora) as Trabajador[];
          if (trabajadoresDisponibles.length > 0) {
            disponibilidades.push({
              fecha: fechaStr,
              hora,
              dia: diasSemana[diaSemana === 0 ? 6 : diaSemana - 1],
              trabajadores: trabajadoresDisponibles
            });
          }
        }
      }
      fecha.setDate(fecha.getDate() + 1);
    }
    
    return disponibilidades.slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6">
        {/* Header */}
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

          {/* Navegación de fechas */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => cambiarSemana(-1)}
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Semana anterior"
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
                title="Semana siguiente"
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

            {/* Buscador y herramientas */}
            <div className="flex items-center gap-4">
              {/* Consulta de disponibilidad */}
              <button
                onClick={() => setModalDisponibilidad(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                title="Consultar disponibilidad"
              >
                <Clock className="w-4 h-4" />
                <span>Disponibilidad</span>
              </button>

              {/* Buscador */}
              <div className="relative">
                <div className="flex items-center gap-2">
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
                  {busqueda && (
                    <div className="flex items-center gap-2">
                      {reservasFiltradas.filter(r => r.trabajador === trabajadorActivo).length > 0 ? (
                        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {reservasFiltradas.filter(r => r.trabajador === trabajadorActivo).length} resultados
                        </span>
                      ) : (
                        <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
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
              <p className="text-sm text-blue-700">
                Mostrando agenda de: <span className="font-semibold">{getTrabajadorActivo()?.nombre}</span>
              </p>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
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
              
              <div>
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
                    onClick={async () => {
                      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
                      const telefonoInput = document.querySelector('input[name="telefono"]') as HTMLInputElement;
                      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
                      const horaSelect = document.querySelector('select[name="hora"]') as HTMLSelectElement;
                      
                      if (nombreInput && telefonoInput && emailInput && horaSelect) {
                        const cliente = {
                          nombre: nombreInput.value,
                          telefono: telefonoInput.value,
                          email: emailInput.value
                        };
                        
                        const modalDataActualizado = {...modalData, hora: horaSelect.value};
                        
                        if (modalDataActualizado.id) {
                          await supabase.from("reservas").update({ cliente, hora: horaSelect.value }).eq("id", modalDataActualizado.id);
                          const { data } = await supabase.from("reservas").select("*");
                          if (data) {
                            setReservas(data as Reserva[]);
                            setReservasFiltradas(data as Reserva[]);
                          }
                          setModalData(null);
                        } else {
                          await supabase.from("reservas").insert({
                            trabajador: trabajadorActivo,
                            fecha: modalDataActualizado.fecha,
                            hora: horaSelect.value,
                            cliente,
                            observaciones: ""
                          });
                          const { data } = await supabase.from("reservas").select("*");
                          if (data) {
                            setReservas(data as Reserva[]);
                            setReservasFiltradas(data as Reserva[]);
                          }
                          setModalData(null);
                        }
                      }
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl"
                  >
                    Guardar Reserva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consulta de disponibilidad */}
      {modalDisponibilidad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
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
              
              <ModalDisponibilidad 
                trabajadores={trabajadores}
                horasCalendario={horasCalendario}
                buscarDisponibilidad={buscarDisponibilidad}
                obtenerProximasDisponibilidades={obtenerProximasDisponibilidades}
                onReservar={(fecha, hora) => {
                  const fechaObj = new Date(fecha);
                  navegarAFecha(fechaObj);
                  setModalDisponibilidad(false);
                  
                  setTimeout(() => {
                    const nombreDia = diasSemana[fechaObj.getDay() === 0 ? 6 : fechaObj.getDay() - 1];
                    abrirModal(nombreDia, hora);
                  }, 100);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalDisponibilidad({ 
  trabajadores, 
  horasCalendario, 
  buscarDisponibilidad, 
  obtenerProximasDisponibilidades, 
  onReservar 
}: {
  trabajadores: Trabajador[];
  horasCalendario: string[];
  buscarDisponibilidad: (fecha: string, hora: string, trabajadorId?: string) => boolean | Trabajador[];
  obtenerProximasDisponibilidades: (fechaInicio: Date, cantidadDias?: number) => Array<{
    fecha: string;
    hora: string;
    dia: string;
    trabajadores: Trabajador[];
  }>;
  onReservar: (fecha: string, hora: string) => void;
}) {
  const [fechaConsulta, setFechaConsulta] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horaConsulta, setHoraConsulta] = useState<string>("09:00");
  const [trabajadorConsulta, setTrabajadorConsulta] = useState<string>("todos");

  const disponibilidades = obtenerProximasDisponibilidades(new Date());
  const esDisponible = trabajadorConsulta === "todos" 
    ? (buscarDisponibilidad(fechaConsulta, horaConsulta) as Trabajador[]).length > 0
    : buscarDisponibilidad(fechaConsulta, horaConsulta, trabajadorConsulta) as boolean;

  const trabajadoresDisponibles = trabajadorConsulta === "todos" 
    ? buscarDisponibilidad(fechaConsulta, horaConsulta) as Trabajador[]
    : esDisponible 
      ? trabajadores.filter(t => t.id === trabajadorConsulta)
      : [];

  return (
    <div className="space-y-6">
      {/* Consulta específica */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Consultar fecha y hora específica</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
            <select
              value={horaConsulta}
              onChange={(e) => setHoraConsulta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {horasCalendario.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trabajador</label>
            <select
              value={trabajadorConsulta}
              onChange={(e) => setTrabajadorConsulta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="todos">Cualquier trabajador</option>
              {trabajadores.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultado de la consulta */}
        <div className={`p-4 rounded-lg ${esDisponible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {esDisponible ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">¡Disponible!</span>
              </div>
              <p className="text-sm text-green-700 mb-3">
                {new Date(fechaConsulta).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} a las {horaConsulta}
              </p>
              <div className="flex flex-wrap gap-2">
                {trabajadoresDisponibles.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onReservar(fechaConsulta, horaConsulta)}
                    className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-800 text-sm rounded-full transition-colors"
                  >
                    Reservar con {t.nombre}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-800">No disponible</span>
              </div>
              <p className="text-sm text-red-700">
                La fecha y hora seleccionadas ya están ocupadas.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Próximas disponibilidades */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Próximas disponibilidades</h3>
        
        {disponibilidades.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {disponibilidades.map((disp, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {disp.dia} {new Date(disp.fecha).getDate()} - {disp.hora}
                    </p>
                    <p className="text-sm text-gray-600">
                      Disponible: {disp.trabajadores.map((t: Trabajador) => t.nombre).join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {disp.trabajadores.map((t: Trabajador) => (
                      <button
                        key={t.id}
                        onClick={() => onReservar(disp.fecha, disp.hora)}
                        className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded transition-colors"
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No hay disponibilidades en los próximos días
          </p>
        )}
      </div>
    </div>
  );
}