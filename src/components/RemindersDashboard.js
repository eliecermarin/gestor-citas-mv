import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle, Clock, Mail, Calendar, Users, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const RemindersDashboard = () => {
  const [stats, setStats] = useState({
    citasMañana: 0,
    recordatoriosEnviados: 0,
    recordatoriosPendientes: 0,
    ultimaEjecucion: null,
    loading: true
  });
  
  const [recentReminders, setRecentReminders] = useState([]);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);

  useEffect(() => {
    loadReminderStats();
    loadRecentReminders();
  }, []);

  const loadReminderStats = async () => {
    try {
      // Fecha de mañana
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      // Citas de mañana
      const { data: tomorrowAppointments, error: tomorrowError } = await supabase
        .from('reservas')
        .select('id, recordatorio_enviado')
        .eq('fecha', tomorrowString)
        .eq('estado', 'confirmada');

      if (tomorrowError) throw tomorrowError;

      const citasMañana = tomorrowAppointments?.length || 0;
      const recordatoriosEnviados = tomorrowAppointments?.filter(r => r.recordatorio_enviado).length || 0;
      const recordatoriosPendientes = citasMañana - recordatoriosEnviados;

      setStats({
        citasMañana,
        recordatoriosEnviados,
        recordatoriosPendientes,
        ultimaEjecucion: null, // Se podría obtener de logs
        loading: false
      });

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const loadRecentReminders = async () => {
    try {
      const { data: reminders, error } = await supabase
        .from('reservas')
        .select(`
          id,
          nombre_cliente,
          email_cliente,
          fecha,
          hora,
          servicio,
          fecha_recordatorio_enviado,
          negocios(nombre)
        `)
        .eq('recordatorio_enviado', true)
        .not('fecha_recordatorio_enviado', 'is', null)
        .order('fecha_recordatorio_enviado', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentReminders(reminders || []);
    } catch (error) {
      console.error('Error cargando recordatorios recientes:', error);
    }
  };

  const triggerManualReminders = async () => {
    setManualTriggerLoading(true);
    try {
      const response = await fetch('/api/send-reminders');
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ Recordatorios procesados: ${result.success} enviados, ${result.errors} errores`);
        loadReminderStats();
        loadRecentReminders();
      } else {
        alert(`❌ Error: ${result.error || 'Error desconocido'}`);
      }
    } catch (error) {
      alert(`💥 Error ejecutando recordatorios: ${error.message}`);
    } finally {
      setManualTriggerLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, description }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {stats.loading ? '...' : value}
          </p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📧 Recordatorios Automáticos</h2>
          <p className="text-gray-600">Sistema de recordatorios 24h antes de las citas</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadReminderStats}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={triggerManualReminders}
            disabled={manualTriggerLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {manualTriggerLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {manualTriggerLoading ? 'Enviando...' : 'Enviar Ahora'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Calendar}
          label="Citas Mañana"
          value={stats.citasMañana}
          color="text-blue-600"
          description="Total de citas confirmadas"
        />
        <StatCard
          icon={CheckCircle}
          label="Recordatorios Enviados"
          value={stats.recordatoriosEnviados}
          color="text-green-600"
          description="Ya procesados"
        />
        <StatCard
          icon={Clock}
          label="Pendientes"
          value={stats.recordatoriosPendientes}
          color="text-orange-600"
          description="Por enviar automáticamente"
        />
        <StatCard
          icon={Users}
          label="Tasa de Envío"
          value={stats.citasMañana > 0 ? `${Math.round((stats.recordatoriosEnviados / stats.citasMañana) * 100)}%` : '0%'}
          color="text-purple-600"
          description="Recordatorios completados"
        />
      </div>

      {/* Status del Sistema */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Estado del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Configuración de Cron</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Frecuencia:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">0 * * * *</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Descripción:</span>
                <span>Cada hora</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Activo
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Información</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plataforma:</span>
                <span>Vercel Cron Jobs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Zona Horaria:</span>
                <span>UTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timeout:</span>
                <span>300s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recordatorios Recientes */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📨 Recordatorios Recientes</h3>
        
        {recentReminders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay recordatorios enviados recientemente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Cita</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Servicio</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-700">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {recentReminders.map((reminder) => (
                  <tr key={reminder.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{reminder.nombre_cliente}</td>
                    <td className="py-3 px-2 text-gray-600">{reminder.email_cliente}</td>
                    <td className="py-3 px-2">
                      <div className="text-gray-900">{new Date(reminder.fecha).toLocaleDateString('es-ES')}</div>
                      <div className="text-xs text-gray-500">{reminder.hora}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{reminder.servicio}</td>
                    <td className="py-3 px-2">
                      <div className="text-xs text-gray-500">
                        {new Date(reminder.fecha_recordatorio_enviado).toLocaleString('es-ES')}
                      </div>
                      <div className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Enviado
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alertas y Consejos */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">💡 Consejos del Sistema</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Los recordatorios se envían automáticamente cada hora</li>
              <li>• Solo se procesan citas confirmadas para el día siguiente</li>
              <li>• Puedes usar "Enviar Ahora" para pruebas o envíos manuales</li>
              <li>• El sistema marca automáticamente los recordatorios enviados</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemindersDashboard;