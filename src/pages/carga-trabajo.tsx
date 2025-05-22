import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const horas = Array.from({ length: 12 }, (_, i) => `${(9 + i).toString().padStart(2, '0')}:00`); // 09:00 - 20:00

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

type Peluquero = {
  id: string;
  nombre: string;
};

export default function CargaTrabajo() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [peluqueros, setPeluqueros] = useState<Peluquero[]>([]);
  const [peluqueroActivo, setPeluqueroActivo] = useState<string | null>(null);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  useEffect(() => {
    const cargarPeluqueros = async () => {
      const { data } = await supabase.from("trabajadores").select("*");
      if (data) {
        setPeluqueros(data);
        setPeluqueroActivo(data[0]?.id || null);
      }
    };
    cargarPeluqueros();
  }, []);

  useEffect(() => {
    if (!peluqueroActivo) return;
    const cargarReservas = async () => {
      const { data } = await supabase
        .from("reservas")
        .select("*")
        .eq("trabajador", peluqueroActivo);
      if (data) setReservas(data);
    };
    cargarReservas();
  }, [peluqueroActivo]);

  const getReservasPorDiaHora = (dia: string, hora: string) => {
    return reservas.filter((r) => {
      const fecha = new Date(r.fecha);
      const nombreDia = diasSemana[fecha.getDay() - 1];
      return nombreDia === dia && r.hora.startsWith(hora);
    });
  };

  const abrirModal = (dia: string, hora: string, reserva?: Reserva) => {
    const hoy = new Date();
    const offset = diasSemana.indexOf(dia) - hoy.getDay() + 1;
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + offset);
    const iso = fecha.toISOString().split("T")[0];
    setModalData(reserva || { fecha: iso, hora });
  };

  const guardarReserva = async (cliente: any) => {
    if (!peluqueroActivo || !modalData) return;
    const { fecha, hora } = modalData;

    if (modalData.id) {
      // Editar
      await supabase.from("reservas").update({ cliente }).eq("id", modalData.id);
    } else {
      // Crear
      await supabase.from("reservas").insert({
        trabajador: peluqueroActivo,
        fecha,
        hora,
        cliente,
        observaciones: ""
      });
    }

    setModalData(null);
    const { data: nuevas } = await supabase.from("reservas").select("*").eq("trabajador", peluqueroActivo);
    setReservas(nuevas || []);
  };

  const eliminarReserva = async (id: string) => {
    await supabase.from("reservas").delete().eq("id", id);
    const { data: nuevas } = await supabase.from("reservas").select("*").eq("trabajador", peluqueroActivo);
    setReservas(nuevas || []);
  };

  return (
    <div className="p-4 overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Agenda Semanal</h1>

      <select
        value={peluqueroActivo || ""}
        onChange={(e) => setPeluqueroActivo(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        {peluqueros.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      <div className="grid grid-cols-[100px_repeat(7,minmax(200px,1fr))] border">
        <div className="bg-gray-100 p-2 font-semibold">Hora</div>
        {diasSemana.map((dia) => (
          <div key={dia} className="bg-gray-100 p-2 font-semibold text-center">
            {dia}
          </div>
        ))}

        {horas.map((hora) => (
          <>
            <div className="border-t p-2 font-medium text-sm bg-white">{hora}</div>
            {diasSemana.map((dia) => (
              <div
                key={dia + hora}
                className="border-t border-l p-2 min-h-[60px] bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => abrirModal(dia, hora)}
              >
                {getReservasPorDiaHora(dia, hora).map((r) => (
                  <div key={r.id} className="border p-2 rounded mb-1 bg-blue-50 relative">
                    <p className="text-sm font-bold">{r.cliente?.nombre}</p>
                    <p className="text-xs">📞 {r.cliente?.telefono}</p>
                    <p className="text-xs">✉️ {r.cliente?.email}</p>
                    <p className="text-xs">🕒 {r.hora}</p>
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button onClick={() => abrirModal(dia, hora, r)} className="text-xs text-yellow-600">✏️</button>
                      <button onClick={() => eliminarReserva(r.id)} className="text-xs text-red-500">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        ))}
      </div>

      {modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-[300px]">
            <h2 className="font-bold mb-2">{modalData?.id ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
            <form onSubmit={(e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement & {
    nombre: { value: string };
    telefono: { value: string };
    email: { value: string };
  };
  const cliente = {
    nombre: form.nombre.value,
    telefono: form.telefono.value,
    email: form.email.value
  };
  guardarReserva(cliente);
}}>

              <input name="nombre" defaultValue={modalData?.cliente?.nombre || ""} placeholder="Nombre" required className="border p-1 mb-2 w-full" />
              <input name="telefono" defaultValue={modalData?.cliente?.telefono || ""} placeholder="Teléfono" required className="border p-1 mb-2 w-full" />
              <input name="email" defaultValue={modalData?.cliente?.email || ""} placeholder="Email" required className="border p-1 mb-2 w-full" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalData(null)} className="text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="bg-blue-500 text-white px-3 py-1 text-sm rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

