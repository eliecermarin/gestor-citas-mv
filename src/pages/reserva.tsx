import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, Scissors, Check, AlertCircle, Loader2, Edit3, X } from 'lucide-react';

const ReservationSystem = () => {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    date: string;
    time: string;
    service: string;
    notes: string;
  }>({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    service: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [reservationConfirmed, setReservationConfirmed] = useState<boolean>(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Servicios disponibles - esto vendrá de Supabase
  const services: Array<{id: string, name: string, duration: number, price: number}> = [
    { id: 'corte-pelo', name: 'Corte de Pelo', duration: 30, price: 25 },
    { id: 'tinte', name: 'Tinte', duration: 90, price: 45 },
    { id: 'peinado', name: 'Peinado', duration: 45, price: 35 },
    { id: 'tratamiento', name: 'Tratamiento Capilar', duration: 60, price: 40 }
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
    const newErrors: Record<string, string> = {};

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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
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
  const submitReservation = async () => {
    // Aquí irá la lógica real de Supabase
    // const { data: result, error } = await supabase
    //   .from('reservations')
    //   .insert([data]);
    
    // Para conectar con Supabase real, descomenta lo siguiente:
    /*
    const { createClient } = require(&apos;@supabase/supabase-js&apos;);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: result, error } = await supabase
      .from(&apos;reservations&apos;)
      .insert([{
        name: data.name,
        email: data.email,
        phone: data.phone,
        reservation_date: data.date,
        reservation_time: data.time,
        service_type: data.service,
        notes: data.notes,
        status: &apos;pending&apos;,
        created_at: new Date().toISOString()
      }]);
      
    if (error) throw error;
    return { success: true, data: result };
    */
    
    // Simulación de API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% éxito
          resolve({ 
            success: true, 
            id: Date.now()
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

  // Obtener fecha mínima (hoy)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Obtener servicio seleccionado
  const getSelectedService = () => {
    return services.find(s => s.id === formData.service) || null;
  };

  // Editar reserva (mantener datos)
  const editReservation = () => {
    setReservationConfirmed(false);
    setErrors({});
  };

  // Cancelar reserva (resetear formulario)
  const cancelReservation = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      service: '',
      notes: ''
    });
    setReservationConfirmed(false);
    setErrors({});
  };

  if (reservationConfirmed) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-xl">
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
                <span className="text-gray-600">Servicio:</span>
                <span className="font-medium">{getSelectedService()?.name || 'No seleccionado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">{new Date(formData.date).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hora:</span>
                <span className="font-medium">{formData.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{formData.name}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={editReservation}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Editar Reserva
            </button>
            
            <button
              onClick={cancelReservation}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
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
                <User className="inline w-4 h-4 mr-2 text-blue-600" />
                Nombre Completo
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="Tu nombre completo"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Mail className="inline w-4 h-4 mr-2 text-blue-600" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="tu@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Phone className="inline w-4 h-4 mr-2 text-blue-600" />
              Teléfono
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              placeholder="+34 600 000 000"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Servicio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Scissors className="inline w-4 h-4 mr-2 text-blue-600" />
              Tipo de Servicio
            </label>
            <select
              name="service"
              value={formData.service}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                errors.service ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <option value="">Selecciona un servicio</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.duration} min - {service.price}€
                </option>
              ))}
            </select>
            {errors.service && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.service}
              </p>
            )}
          </div>

          {/* Fecha y Hora */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Calendar className="inline w-4 h-4 mr-2 text-blue-600" />
                Fecha
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={getMinDate()}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Clock className="inline w-4 h-4 mr-2 text-blue-600" />
                Hora
              </label>
              <select
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.time ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
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
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.time}
                </p>
              )}
            </div>
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none hover:border-gray-300"
              placeholder="Cualquier información adicional o solicitud especial..."
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
            className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] focus:ring-4 focus:ring-blue-200 shadow-lg hover:shadow-xl'
            } text-white`}
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
};

export default ReservationSystem;