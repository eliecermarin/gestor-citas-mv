import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Mail, Phone, Scissors, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ReservationSystem({ businessId, businessData }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    service: '',
    worker: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Datos de configuración
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [existingReservations, setExistingReservations] = useState([]);

  // ✅ CARGAR DATOS DEL NEGOCIO
  useEffect(() => {
    if (!businessId) return;
    
    loadBusinessData();
  }, [businessId]);

  const loadBusinessData = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Cargando datos para negocio:', businessId);

      // Cargar servicios
      const { data: servicesData, error: servicesError } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', businessId);

      if (servicesError) {
        console.error('Error cargando servicios:', servicesError);
        throw servicesError;
      }

      console.log('✅ Servicios cargados:', servicesData?.length || 0);
      setServices(servicesData || []);

      // Cargar trabajadores
      const { data: workersData, error: workersError } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('user_id', businessId);

      if (workersError) {
        console.error('Error cargando trabajadores:', workersError);
        throw workersError;
      }

      console.log('✅ Trabajadores cargados:', workersData?.length || 0);
      
      // Procesar trabajadores
      const processedWorkers = (workersData || []).map((worker) => ({
        ...worker,
        servicios: worker.servicios || [],
        festivos: worker.festivos || [],
        horariosTrabajo: worker.horariosTrabajo || {},
        tiempoDescanso: worker.tiempoDescanso || 15,
        limiteDiasReserva: worker.limiteDiasReserva || 30
      }));
      setWorkers(processedWorkers);

      // Cargar reservas existentes
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservas')
        .select('*')
        .eq('user_id', businessId);

      if (reservationsError) {
        console.error('Error cargando reservas:', reservationsError);
      } else {
        setExistingReservations(reservationsData || []);
      }

    } catch (error) {
      console.error('❌ Error cargando datos del negocio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generar horarios disponibles
  const generateAvailableTimes = useCallback(() => {
    if (!formData.worker || !formData.date) {
      setAvailableTimes([]);
      return;
    }

    // Generar slots de tiempo básicos (cada 30 min de 9:00 a 18:00)
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    setAvailableTimes(slots);
  }, [formData.worker, formData.date]);

  useEffect(() => {
    generateAvailableTimes();
  }, [generateAvailableTimes]);

  // Obtener servicios disponibles
  const getAvailableServices = () => {
    if (!formData.worker) {
      return services;
    }

    const selectedWorker = workers.find(w => w.id === formData.worker);
    if (!selectedWorker || !selectedWorker.servicios || selectedWorker.servicios.length === 0) {
      return services;
    }

    return services.filter(service => 
      selectedWorker.servicios.includes(service.id)
    );
  };

  // Validación básica
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.date) newErrors.date = 'La fecha es requerida';
    if (!formData.time) newErrors.time = 'La hora es requerida';
    if (!formData.service) newErrors.service = 'Selecciona un servicio';
    if (!formData.worker) newErrors.worker = 'Selecciona un trabajador';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejo de cambios
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar campos dependientes
    if (name === 'worker') {
      setFormData(prev => ({
        ...prev,
        service: '',
        time: ''
      }));
    }

    if (name === 'date' || name === 'service') {
      setFormData(prev => ({
        ...prev,
        time: ''
      }));
    }

    // Limpiar error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // ✅ ENVÍO DE RESERVA PÚBLICA
  const submitReservation = async () => {
    if (!businessId) throw new Error('No business ID');

    const cliente = {
      nombre: formData.name,
      email: formData.email,
      telefono: formData.phone
    };

    const selectedService = services.find(s => s.id.toString() === formData.service);

    const { data, error } = await supabase
      .from('reservas')
      .insert([{
        trabajador: formData.worker,
        fecha: formData.date,
        hora: formData.time,
        cliente: cliente,
        observaciones: formData.notes || '',
        servicio_id: selectedService ? selectedService.id : null,
        estado: 'confirmada',
        user_id: businessId  // ✅ USAR EL businessId
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  };

  // Manejo del envío
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await submitReservation();
      setReservationConfirmed(true);

    } catch (error) {
      setErrors({ submit: 'Error al procesar la reserva. Intenta nuevamente.' });
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fecha mínima
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando servicios...</p>
          </div>
        </div>
      </div>
    );
  }

  if (workers.length === 0 || services.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Configuración Pendiente
            </h3>
            <p className="text-gray-600">
              Este negocio aún está configurando sus servicios.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (reservationConfirmed) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ¡Reserva Confirmada!
            </h2>
            
            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{new Date(formData.date).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">{formData.time}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              Hacer otra reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Reservar Cita
          </h1>
          <p className="text-gray-600">
            Completa los datos para confirmar tu reserva
          </p>
        </div>

        <div className="space-y-6">
          {/* Información Personal */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Nombre Completo
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none"
                placeholder="Tu nombre completo"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-2">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none"
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-2">{errors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none"
              placeholder="+34 600 000 000"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-2">{errors.phone}</p>
            )}
          </div>

          {/* Trabajador */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Profesional
            </label>
            <select
              name="worker"
              value={formData.worker}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none"
            >
              <option value="">Selecciona un profesional</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.nombre}
                </option>
              ))}
            </select>
            {errors.worker && (
              <p className="text-red-500 text-sm mt-2">{errors.worker}</p>
            )}
          </div>

          {/* Servicio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipo de Servicio
            </label>
            <select
              name="service"
              value={formData.service}
              onChange={handleInputChange}
              disabled={!formData.worker}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none disabled:bg-gray-100"
            >
              <option value="">
                {!formData.worker ? 'Primero selecciona un profesional' : 'Selecciona un servicio'}
              </option>
              {getAvailableServices().map(service => (
                <option key={service.id} value={service.id}>
                  {service.nombre} - {service.duracion} min
                  {service.precio > 0 ? ` - ${service.precio}€` : ''}
                </option>
              ))}
            </select>
            {errors.service && (
              <p className="text-red-500 text-sm mt-2">{errors.service}</p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Fecha
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={getMinDate()}
                disabled={!formData.worker}
                className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none disabled:bg-gray-100"
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-2">{errors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Hora
              </label>
              <select
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                disabled={!formData.date || availableTimes.length === 0}
                className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none disabled:bg-gray-100"
              >
                <option value="">
                  {!formData.date ? 'Primero selecciona una fecha' : 
                   availableTimes.length === 0 ? 'No hay horarios disponibles' : 
                   'Selecciona una hora'}
                </option>
                {availableTimes.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.time && (
                <p className="text-red-500 text-sm mt-2">{errors.time}</p>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border-2 rounded-xl focus:border-blue-500 transition-all outline-none"
              placeholder="Cualquier información adicional..."
            />
          </div>

          {/* Error de envío */}
          {errors.submit && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{errors.submit}</span>
              </div>
            </div>
          )}

          {/* Botón de envío */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando Reserva...
              </span>
            ) : (
              'Confirmar Reserva'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}