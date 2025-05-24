import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, Scissors, Check, AlertCircle, Loader2, Edit3, X } from 'lucide-react';
import { supabase } from '../lib/supabaseclient';
import { useRouter } from 'next/router';

interface FormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  worker: string;
  notes: string;
}

interface Servicio {
  id: number;
  nombre: string;
  duracion: number;
  precio: number;
}

interface Trabajador {
  id: string;
  nombre: string;
  servicios: number[];
  festivos: string[];
  duracionCitaDefecto: number;
}

interface BusinessConfig {
  nombre_negocio: string;
  dias_reserva_max: number;
}

const ReservationSystem = ({ businessId }: { businessId?: string }) => {
  const router = useRouter();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    service: '',
    worker: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationConfirmed, setReservationConfirmed] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Datos de configuración
  const [services, setServices] = useState<Servicio[]>([]);
  const [workers, setWorkers] = useState<Trabajador[]>([]);
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(null);
  const [existingReservations, setExistingReservations] = useState<any[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  // Obtener el businessId del usuario actual o usar el prop
  useEffect(() => {
    const getUserBusinessId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentBusinessId(user.id);
        } else if (businessId) {
          setCurrentBusinessId(businessId);
        } else {
          // Si no hay usuario ni businessId, redirigir al login
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Error getting user:', error);
        router.push('/login');
      }
    };

    getUserBusinessId();
  }, [businessId, router]);

  // Cargar configuración del negocio
  useEffect(() => {
    const loadBusinessData = async () => {
      if (!currentBusinessId) return;

      try {
        setIsLoading(true);
        
        // Cargar configuración general
        const { data: config, error: configError } = await supabase
          .from('configuracion')
          .select('*')
          .eq('user_id', currentBusinessId)
          .single();

        if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error cargando configuración:', configError);
        } else {
          setBusinessConfig(config);
        }

        // Cargar servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .eq('user_id', currentBusinessId);

        if (servicesError) {
          console.error('Error cargando servicios:', servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Cargar trabajadores
        const { data: workersData, error: workersError } = await supabase
          .from('trabajadores')
          .select('*')
          .eq('user_id', currentBusinessId);

        if (workersError) {
          console.error('Error cargando trabajadores:', workersError);
        } else {
          // Procesar trabajadores con sus servicios
          const processedWorkers = (workersData || []).map((worker: any) => ({
            ...worker,
            servicios: worker.servicios || [],
            festivos: worker.festivos || []
          }));
          setWorkers(processedWorkers);
        }

        // Cargar reservas existentes para validar disponibilidad
        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservas')
          .select('*')
          .eq('user_id', currentBusinessId);

        if (reservationsError) {
          console.error('Error cargando reservas:', reservationsError);
        } else {
          setExistingReservations(reservationsData || []);
        }

      } catch (error) {
        console.error('Error cargando datos del negocio:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessData();
  }, [currentBusinessId]);

  // Generar horarios disponibles basados en trabajador y fecha seleccionada
  useEffect(() => {
    generateAvailableTimes();
  }, [formData.worker, formData.date, existingReservations]);

  const generateAvailableTimes = () => {
    if (!formData.worker || !formData.date) {
      setAvailableTimes([]);
      return;
    }

    const selectedWorker = workers.find(w => w.id === formData.worker);
    if (!selectedWorker) {
      setAvailableTimes([]);
      return;
    }

    // Verificar si la fecha es un día festivo para el trabajador
    const selectedDate = new Date(formData.date);
    const dateString = formData.date;
    
    if (selectedWorker.festivos && selectedWorker.festivos.includes(dateString)) {
      setAvailableTimes([]);
      return;
    }

    // Generar slots de tiempo (cada 15 minutos de 8:00 a 22:00)
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 21 && minute > 45) break; // No pasar de 21:45
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Verificar si el slot está ocupado
        const isOccupied = existingReservations.some(reservation => 
          reservation.trabajador === formData.worker &&
          reservation.fecha === dateString &&
          reservation.hora === timeString
        );

        if (!isOccupied) {
          slots.push(timeString);
        }
      }
    }

    setAvailableTimes(slots);
  };

  // Obtener servicios disponibles para el trabajador seleccionado
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
    if (!formData.worker) newErrors.worker = 'Selecciona un trabajador';

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      newErrors.date = 'No puedes reservar en fechas pasadas';
    }

    // Validar límite de días de antelación
    if (businessConfig && businessConfig.dias_reserva_max) {
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + businessConfig.dias_reserva_max);
      
      if (selectedDate > maxDate) {
        newErrors.date = `No puedes reservar con más de ${businessConfig.dias_reserva_max} días de antelación`;
      }
    }

    // Validar disponibilidad del trabajador en la fecha
    const selectedWorker = workers.find(w => w.id === formData.worker);
    if (selectedWorker && selectedWorker.festivos && selectedWorker.festivos.includes(formData.date)) {
      newErrors.date = 'El trabajador no está disponible en esta fecha';
    }

    // Validar que el servicio esté disponible para el trabajador
    if (formData.service && formData.worker) {
      const availableServices = getAvailableServices();
      if (!availableServices.find(s => s.id.toString() === formData.service)) {
        newErrors.service = 'Este servicio no está disponible para el trabajador seleccionado';
      }
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

    // Limpiar servicios y horarios si cambia el trabajador
    if (name === 'worker') {
      setFormData(prev => ({
        ...prev,
        service: '',
        time: ''
      }));
    }

    // Limpiar horarios si cambia la fecha
    if (name === 'date') {
      setFormData(prev => ({
        ...prev,
        time: ''
      }));
    }

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Envío de reserva a Supabase
  const submitReservation = async () => {
    if (!currentBusinessId) throw new Error('No business ID');

    const cliente = {
      nombre: formData.name,
      email: formData.email,
      telefono: formData.phone
    };

    const { data, error } = await supabase
      .from('reservas')
      .insert([{
        trabajador: formData.worker,
        fecha: formData.date,
        hora: formData.time,
        cliente: cliente,
        observaciones: formData.notes || '',
        user_id: currentBusinessId
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  };

  // Manejo del envío del formulario
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await submitReservation();
      setReservationConfirmed(true);
      
      // Recargar reservas existentes
      if (currentBusinessId) {
        const { data: reservationsData } = await supabase
          .from('reservas')
          .select('*')
          .eq('user_id', currentBusinessId);
        
        if (reservationsData) {
          setExistingReservations(reservationsData);
        }
      }

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

  // Obtener fecha máxima basada en configuración
  const getMaxDate = () => {
    if (!businessConfig || !businessConfig.dias_reserva_max) {
      return undefined;
    }
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + businessConfig.dias_reserva_max);
    return maxDate.toISOString().split('T')[0];
  };

  // Obtener servicio seleccionado
  const getSelectedService = () => {
    return services.find(s => s.id.toString() === formData.service) || null;
  };

  // Obtener trabajador seleccionado
  const getSelectedWorker = () => {
    return workers.find(w => w.id === formData.worker) || null;
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
      worker: '',
      notes: ''
    });
    setReservationConfirmed(false);
    setErrors({});
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del negocio...</p>
        </div>
      </div>
    );
  }

  if (workers.length === 0 || services.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Configuración Pendiente
          </h2>
          <p className="text-gray-600 mb-6">
            Este negocio aún no ha configurado sus servicios y trabajadores.
          </p>
          <p className="text-sm text-gray-500">
            Por favor, contacta con el administrador del negocio.
          </p>
        </div>
      </div>
    );
  }

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
                <span className="font-medium">{getSelectedService()?.nombre || 'No seleccionado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trabajador:</span>
                <span className="font-medium">{getSelectedWorker()?.nombre || 'No seleccionado'}</span>
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
              {getSelectedService()?.precio && getSelectedService()!.precio > 0 && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Precio:</span>
                  <span className="font-medium text-green-600">{getSelectedService()?.precio}€</span>
                </div>
              )}
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
              Nueva Reserva
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
            {businessConfig?.nombre_negocio || 'Completa los datos para confirmar tu reserva'}
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

          {/* Trabajador */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <User className="inline w-4 h-4 mr-2 text-blue-600" />
              Trabajador
            </label>
            <select
              name="worker"
              value={formData.worker}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                errors.worker ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <option value="">Selecciona un trabajador</option>
              {workers.map(worker => (
                <option key={worker.id} value={worker.id}>
                  {worker.nombre}
                </option>
              ))}
            </select>
            {errors.worker && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.worker}
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
              disabled={!formData.worker}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                errors.service ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
              } ${!formData.worker ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {!formData.worker ? 'Primero selecciona un trabajador' : 'Selecciona un servicio'}
              </option>
              {getAvailableServices().map(service => (
                <option key={service.id} value={service.id}>
                  {service.nombre} - {service.duracion} min
                  {service.precio > 0 ? ` - ${service.precio}€` : ''}
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
                max={getMaxDate()}
                disabled={!formData.worker}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                } ${!formData.worker ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                disabled={!formData.date || availableTimes.length === 0}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none ${
                  errors.time ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                } ${(!formData.date || availableTimes.length === 0) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                <p className="text-red-500 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.time}
                </p>
              )}
              {formData.date && availableTimes.length === 0 && (
                <p className="text-amber-600 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  No hay horarios disponibles para esta fecha
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
              rows={3}
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

          {/* Resumen de selección */}
          {formData.service && formData.worker && formData.date && formData.time && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Resumen de tu reserva:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Servicio:</strong> {getSelectedService()?.nombre}</p>
                <p><strong>Trabajador:</strong> {getSelectedWorker()?.nombre}</p>
                <p><strong>Fecha:</strong> {new Date(formData.date).toLocaleDateString('es-ES')}</p>
                <p><strong>Hora:</strong> {formData.time}</p>
                <p><strong>Duración:</strong> {getSelectedService()?.duracion} minutos</p>
                {getSelectedService()?.precio && getSelectedService()!.precio > 0 && (
                  <p><strong>Precio:</strong> {getSelectedService()?.precio}€</p>
                )}
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