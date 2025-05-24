import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';

const ReservationSystem = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: 1,
    service: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);

  // Servicios disponibles - esto vendrá de Supabase
  const services = [
    { id: 'restaurant', name: 'Mesa de Restaurante', duration: 120 },
    { id: 'spa', name: 'Tratamiento Spa', duration: 90 },
    { id: 'meeting', name: 'Sala de Reuniones', duration: 60 },
    { id: 'event', name: 'Evento Privado', duration: 240 }
  ];

  // Generar horarios disponibles
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  useEffect(() => {
    setAvailableTimes(generateTimeSlots());
  }, []);

  // Validación de formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.date) newErrors.date = 'La fecha es requerida';
    if (!formData.time) newErrors.time = 'La hora es requerida';
    if (!formData.service) newErrors.service = 'Selecciona un servicio';
    if (formData.guests < 1) newErrors.guests = 'Mínimo 1 persona';

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.date = 'No puedes reservar en fechas pasadas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejo de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' ? parseInt(value) || 0 : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Simulación de envío a Supabase
  const submitReservation = async (reservationData) => {
    // Aquí irá la lógica real de Supabase
    // const { data, error } = await supabase
    //   .from('reservations')
    //   .insert([reservationData]);
    
    // Para conectar con Supabase real, descomenta lo siguiente:
    /*
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        name: reservationData.name,
        email: reservationData.email,
        phone: reservationData.phone,
        reservation_date: reservationData.date,
        reservation_time: reservationData.time,
        guests: reservationData.guests,
        service_type: reservationData.service,
        notes: reservationData.notes,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      
    if (error) throw error;
    return { success: true, data };
    */
    
    // Simulación de API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% éxito
          resolve({ 
            success: true, 
            id: Date.now(),
            confirmationCode: `RSV-${Date.now().toString().slice(-6)}`
          });
        } else {
          reject(new Error('Error de conexión'));
        }
      }, 2000);
    });
  };

  // Manejo del envío del formulario
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const reservationData = {
        ...formData,
        created_at: new Date().toISOString(),
        status: 'pending'
      };

      const result = await submitReservation(reservationData);
      
      setSubmitStatus({
        type: 'success',
        message: `¡Reserva confirmada! Código: ${result.confirmationCode}`
      });

      // Limpiar formulario
      setFormData({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: 1,
        service: '',
        notes: ''
      });

    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Error al procesar la reserva. Intenta nuevamente.'
      });
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Sistema de Reservas
        </h1>
        <p className="text-gray-600">
          Completa el formulario para hacer tu reserva
        </p>
      </div>

      {submitStatus && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          submitStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {submitStatus.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{submitStatus.message}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Información Personal */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-1" />
              Nombre Completo
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tu nombre completo"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline w-4 h-4 mr-1" />
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="+34 600 000 000"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline w-4 h-4 mr-1" />
              Número de Personas
            </label>
            <input
              type="number"
              name="guests"
              value={formData.guests}
              onChange={handleInputChange}
              min="1"
              max="20"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.guests ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.guests && (
              <p className="text-red-500 text-sm mt-1">{errors.guests}</p>
            )}
          </div>
        </div>

        {/* Servicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            Tipo de Servicio
          </label>
          <select
            name="service"
            value={formData.service}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.service ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Selecciona un servicio</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.duration} min)
              </option>
            ))}
          </select>
          {errors.service && (
            <p className="text-red-500 text-sm mt-1">{errors.service}</p>
          )}
        </div>

        {/* Fecha y Hora */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Fecha
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={getMinDate()}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline w-4 h-4 mr-1" />
              Hora
            </label>
            <select
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.time ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Selecciona una hora</option>
              {availableTimes.map(time => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {errors.time && (
              <p className="text-red-500 text-sm mt-1">{errors.time}</p>
            )}
          </div>
        </div>

        {/* Notas adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notas Adicionales (Opcional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Cualquier información adicional o solicitud especial..."
          />
        </div>

        {/* Botón de envío */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          } text-white`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando Reserva...
            </span>
          ) : (
            'Confirmar Reserva'
          )}
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-800 mb-2">Información Importante:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Las reservas se confirmarán en un plazo de 24 horas</li>
          <li>• Recibirás un email de confirmación</li>
          <li>• Para cancelaciones, contacta con 24h de anticipación</li>
          <li>• Los datos se almacenan de forma segura en nuestra base de datos</li>
        </ul>
      </div>

      {/* Código de configuración para Supabase */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">🔧 Configuración para Supabase:</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>1.</strong> Crear tabla 'reservations' en Supabase</p>
          <p><strong>2.</strong> Agregar variables de entorno en Vercel:</p>
          <p className="ml-4">• NEXT_PUBLIC_SUPABASE_URL</p>
          <p className="ml-4">• NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
          <p><strong>3.</strong> Instalar: npm install @supabase/supabase-js</p>
        </div>
      </div>
    </div>
  );
};

export default ReservationSystem;