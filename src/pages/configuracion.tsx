import React, { useState, useEffect } from 'react';

// Tipos
// -----------------------------------------------------------------
type Horario = {
  activo: boolean;
  mananaInicio: string;
  mananaFin: string;
  tardeInicio: string;
  tardeFin: string;
};

type DiasSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

type Servicio = {
  id: number;
  nombre: string;
  duracion: number;
  precio: number;
};

type Peluquero = {
  id: number;
  nombre: string;
  apellido: string;
  horarios: { [key in DiasSemana]: Horario };
  festivos: string[];
  servicios: number[];
  duracionCitaDefecto: number;
};

// Componente principal
// -----------------------------------------------------------------
export default function Configuracion() {
  const dias: DiasSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const horarioInicial: Horario = {
    activo: true,
    mananaInicio: '',
    mananaFin: '',
    tardeInicio: '',
    tardeFin: ''
  };

  const peluqueroBase = (): Peluquero => {
    const horarios: { [key in DiasSemana]: Horario } = dias.reduce((acc, dia) => {
      acc[dia] = { ...horarioInicial };
      return acc;
    }, {} as any);

    return {
      id: Date.now(),
      nombre: '',
      apellido: '',
      horarios,
      festivos: [],
      servicios: [],
      duracionCitaDefecto: 30
    };
  };

  const [peluqueros, setPeluqueros] = useState<Peluquero[]>([]);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  useEffect(() => {
    const guardados = localStorage.getItem('configPeluqueros');
    if (guardados) {
      setPeluqueros(JSON.parse(guardados));
    }
  }, []);

  const guardarConfiguracion = () => {
    localStorage.setItem('configPeluqueros', JSON.stringify(peluqueros));
    setMensajeGuardado('✅ Configuración guardada con éxito.');
    setTimeout(() => setMensajeGuardado(null), 3000);
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.title}>🂄 Configuración del Negocio</h2>
        <p style={styles.info}>Configura peluqueros, horarios, días festivos y servicios disponibles.</p>

        <button
          onClick={() => setPeluqueros([...peluqueros, peluqueroBase()])}
          style={styles.btnSecundario}
        >
          ➕ Añadir peluquero
        </button>

        <button onClick={guardarConfiguracion} style={styles.boton}>
          📄 Guardar configuración
        </button>

        {mensajeGuardado && (
          <div style={styles.mensaje}>{mensajeGuardado}</div>
        )}
      </div>
    </div>
  );
}

// Estilos en linea (CSS-in-JS)
// -----------------------------------------------------------------
const styles: { [key: string]: React.CSSProperties } = {
  body: {
    backgroundColor: '#f3f6fb',
    padding: '40px 20px',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: 40,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    color: '#1e3a8a',
    marginBottom: 12,
    fontSize: 24,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  info: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 25
  },
  boton: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontWeight: 600,
    border: 'none',
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    cursor: 'pointer'
  },
  btnSecundario: {
    marginBottom: 20,
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #2563eb',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 500
  },
  mensaje: {
    marginTop: 20,
    color: 'green',
    backgroundColor: '#e6ffed',
    padding: 12,
    borderRadius: 8,
    fontWeight: 500
  }
};
