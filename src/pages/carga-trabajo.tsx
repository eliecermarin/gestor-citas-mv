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
              <div key={dia + hora} className="border-t border-l p-2 min-h-[60px] bg-white">
                {getReservasPorDiaHora(dia, hora).map((r) => (
                  <div key={r.id} className="border p-2 rounded mb-1 bg-blue-50">
                    <p className="text-sm font-bold">{r.cliente?.nombre}</p>
                    <p className="text-xs">📞 {r.cliente?.telefono}</p>
                    <p className="text-xs">✉️ {r.cliente?.email}</p>
                    <p className="text-xs">🕒 {r.hora}</p>
                  </div>
                ))}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
}
