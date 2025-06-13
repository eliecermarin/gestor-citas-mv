import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // 🔥 VERIFICACIÓN DE VERSIÓN - ELIMINAR DESPUÉS
  console.log('🔥 ARCHIVO ACTUALIZADO - VERSIÓN:', new Date().toISOString());
  console.log('🔥 YA NO HAY EMAIL HARDCODEADO');

  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const {
      reservaData,
      businessData,
      workerData,
      serviceData,
      isPublicReservation = false
    } = req.body;

    console.log('📧 Datos recibidos para emails:', {
      reservaId: reservaData?.id,
      clienteEmail: reservaData?.cliente?.email,
      adminEmail: businessData?.user_email,
      businessName: businessData?.nombre_negocio
    });

    // ✅ VALIDAR DATOS MÍNIMOS
    if (!reservaData || !reservaData.cliente) {
      console.log('❌ Datos de reserva incompletos');
      return res.status(400).json({ 
        success: false, 
        error: 'Datos de reserva incompletos' 
      });
    }

    // ✅ EMAIL PARA EL CLIENTE
    const clientEmailHtml = generateClientEmailTemplate({
      reservaData,
      businessData,
      workerData,
      serviceData,
      isPublicReservation
    });

    // ✅ EMAIL PARA EL ADMINISTRADOR  
    const adminEmailHtml = generateAdminEmailTemplate({
      reservaData,
      businessData,
      workerData,
      serviceData,
      isPublicReservation
    });

    const emailPromises = [];

    // 📧 ENVIAR EMAIL AL CLIENTE
    if (reservaData.cliente?.email && reservaData.cliente.email.trim()) {
      console.log('📧 Preparando email para cliente:', reservaData.cliente.email);
      
      emailPromises.push(
        resend.emails.send({
          from: process.env.SYSTEM_EMAIL_FROM || 'Sistema de Reservas <reservas@gestordecitasmv.es>',
          to: [reservaData.cliente.email],
          replyTo: businessData?.telefono_contacto ? 
            `${businessData.nombre_negocio} <info@gestordecitasmv.es>` : 
            'info@gestordecitasmv.es',
          subject: `✅ Reserva confirmada - ${businessData?.nombre_negocio || 'Gestor de Citas MV'}`,
          html: clientEmailHtml,
        })
      );
    } else {
      console.log('⚠️ Cliente sin email, saltando envío al cliente');
    }

    // 📧 ENVIAR EMAIL AL ADMINISTRADOR
    if (businessData?.user_email && businessData.user_email.trim()) {
      console.log('📧 Preparando email para administrador:', businessData.user_email);
      
      emailPromises.push(
        resend.emails.send({
          from: process.env.SYSTEM_EMAIL_FROM || 'Sistema de Reservas <reservas@gestordecitasmv.es>',
          to: [businessData.user_email],
          subject: `🔔 Nueva reserva recibida - ${reservaData.cliente?.nombre}`,
          html: adminEmailHtml,
        })
      );
    } else {
      console.log('⚠️ Admin sin email, saltando envío al administrador');
    }

    if (emailPromises.length === 0) {
      console.log('⚠️ No hay emails para enviar');
      return res.status(200).json({
        success: true,
        emailsSent: 0,
        emailsFailed: 0,
        message: 'Reserva procesada pero sin emails configurados',
        details: {
          clientEmailSent: false,
          adminEmailSent: false
        }
      });
    }

    // ⚡ ENVIAR TODOS LOS EMAILS
    console.log(`📧 Enviando ${emailPromises.length} emails...`);
    
    const results = await Promise.allSettled(emailPromises);
    
    // 📊 ANALIZAR RESULTADOS
    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');

    console.log(`✅ Emails enviados: ${successful.length}/${results.length}`);
    
    if (failed.length > 0) {
      console.error('❌ Emails fallidos:', failed.map(f => f.reason));
    }

    // Log detalles de éxito
    successful.forEach((result, index) => {
      console.log(`✅ Email ${index + 1} enviado exitosamente:`, result.value);
    });

    return res.status(200).json({
      success: true,
      emailsSent: successful.length,
      emailsFailed: failed.length,
      details: {
        clientEmailSent: reservaData.cliente?.email ? successful.length > 0 : false,
        adminEmailSent: businessData?.user_email ? successful.length > (reservaData.cliente?.email ? 1 : 0) : false
      }
    });

  } catch (error) {
    console.error('💥 Error completo enviando emails:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Error interno del servidor al enviar emails'
    });
  }
}

// ✅ TEMPLATE PARA EMAIL DEL CLIENTE
function generateClientEmailTemplate({ reservaData, businessData, workerData, serviceData, isPublicReservation }) {
  const fechaFormateada = new Date(reservaData.fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const horaFin = serviceData?.duracion ? 
    calculateEndTime(reservaData.hora, serviceData.duracion) : null;

  const nombreNegocio = businessData?.nombre_negocio || 'Gestor de Citas MV';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reserva Confirmada</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #f8fafc;
        }
        .container { 
          background: white; 
          border-radius: 12px; 
          padding: 30px; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
        }
        .logo { 
          width: 60px; 
          height: 60px; 
          background: linear-gradient(135deg, #667eea, #764ba2); 
          border-radius: 50%; 
          margin: 0 auto 15px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
        .title { 
          color: #1a202c; 
          font-size: 28px; 
          font-weight: bold; 
          margin: 0;
        }
        .subtitle { 
          color: #64748b; 
          margin: 5px 0 0 0;
        }
        .success-badge {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          display: inline-block;
          margin: 15px 0;
        }
        .details {
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #4a5568;
        }
        .detail-value {
          color: #1a202c;
          font-weight: 500;
        }
        .contact-info {
          background: #eff6ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #bfdbfe;
        }
        .contact-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 10px 0;
        }
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .container { padding: 20px; }
          .detail-row { flex-direction: column; }
          .detail-value { margin-top: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📅</div>
          <h1 class="title">${nombreNegocio}</h1>
          <p class="subtitle">Confirmación de tu reserva</p>
          <div class="success-badge">✅ Reserva Confirmada</div>
        </div>

        <p>Hola <strong>${reservaData.cliente?.nombre}</strong>,</p>
        
        <p>Tu reserva ha sido confirmada exitosamente. Aquí tienes todos los detalles:</p>

        <div class="details">
          <div class="detail-row">
            <span class="detail-label">📅 Fecha:</span>
            <span class="detail-value">${fechaFormateada}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">🕒 Hora:</span>
            <span class="detail-value">${reservaData.hora}${horaFin ? ` - ${horaFin}` : ''}</span>
          </div>
          ${workerData ? `
          <div class="detail-row">
            <span class="detail-label">👤 Profesional:</span>
            <span class="detail-value">${workerData.nombre}</span>
          </div>
          ` : ''}
          ${serviceData ? `
          <div class="detail-row">
            <span class="detail-label">✂️ Servicio:</span>
            <span class="detail-value">${serviceData.nombre} (${serviceData.duracion} min)</span>
          </div>
          ` : ''}
          ${serviceData?.precio && serviceData.precio > 0 ? `
          <div class="detail-row">
            <span class="detail-label">💰 Precio:</span>
            <span class="detail-value">${serviceData.precio}€</span>
          </div>
          ` : ''}
          ${reservaData.observaciones ? `
          <div class="detail-row">
            <span class="detail-label">📝 Observaciones:</span>
            <span class="detail-value">${reservaData.observaciones}</span>
          </div>
          ` : ''}
        </div>

        ${businessData?.direccion || businessData?.telefono_contacto ? `
        <div class="contact-info">
          <div class="contact-title">📍 Información de Contacto</div>
          ${businessData.direccion ? `<p><strong>Dirección:</strong> ${businessData.direccion}</p>` : ''}
          ${businessData.telefono_contacto ? `<p><strong>Teléfono:</strong> ${businessData.telefono_contacto}</p>` : ''}
          ${businessData.horario_atencion ? `<p><strong>Horario:</strong> ${businessData.horario_atencion}</p>` : ''}
        </div>
        ` : ''}

        <p><strong>¿Necesitas cambiar algo?</strong></p>
        <p>Si necesitas modificar o cancelar tu reserva, ponte en contacto con nosotros lo antes posible.</p>

        <div class="footer">
          <p>Este email fue enviado automáticamente por el Gestor de Citas MV.</p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          ${isPublicReservation && businessData?.slug ? `
          <p style="margin-top: 15px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.gestordecitasmv.es'}/reservas/${businessData.slug}" class="btn">
              Hacer otra reserva
            </a>
          </p>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

// ✅ TEMPLATE PARA EMAIL DEL ADMINISTRADOR
function generateAdminEmailTemplate({ reservaData, businessData, workerData, serviceData, isPublicReservation }) {
  const fechaFormateada = new Date(reservaData.fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const horaFin = serviceData?.duracion ? 
    calculateEndTime(reservaData.hora, serviceData.duracion) : null;

  const nombreNegocio = businessData?.nombre_negocio || 'Tu Negocio';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nueva Reserva</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #f8fafc;
        }
        .container { 
          background: white; 
          border-radius: 12px; 
          padding: 30px; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding: 20px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 8px;
          color: white;
        }
        .notification-badge {
          background: #f59e0b;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          display: inline-block;
          margin: 10px 0;
        }
        .client-info {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #0ea5e9;
        }
        .reservation-info {
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #4a5568;
        }
        .detail-value {
          color: #1a202c;
          font-weight: 500;
        }
        .actions {
          background: #fef3c7;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #fbbf24;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 14px;
        }
        @media only screen and (max-width: 600px) {
          body { padding: 10px; }
          .container { padding: 20px; }
          .detail-row { flex-direction: column; }
          .detail-value { margin-top: 5px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Nueva Reserva Recibida</h1>
          <div class="notification-badge">
            ${isPublicReservation ? '🌐 Reserva Online' : '👤 Reserva Interna'}
          </div>
          <p>Se ha registrado una nueva reserva en ${nombreNegocio}</p>
        </div>

        <div class="client-info">
          <h3 style="margin-top: 0; color: #0369a1;">👤 Información del Cliente</h3>
          <div class="detail-row">
            <span class="detail-label">Nombre:</span>
            <span class="detail-value">${reservaData.cliente?.nombre}</span>
          </div>
          ${reservaData.cliente?.email ? `
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span class="detail-value">
              <a href="mailto:${reservaData.cliente.email}">${reservaData.cliente.email}</a>
            </span>
          </div>
          ` : ''}
          ${reservaData.cliente?.telefono ? `
          <div class="detail-row">
            <span class="detail-label">Teléfono:</span>
            <span class="detail-value">
              <a href="tel:${reservaData.cliente.telefono}">${reservaData.cliente.telefono}</a>
            </span>
          </div>
          ` : ''}
        </div>

        <div class="reservation-info">
          <h3 style="margin-top: 0; color: #047857;">📅 Detalles de la Reserva</h3>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${fechaFormateada}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hora:</span>
            <span class="detail-value">${reservaData.hora}${horaFin ? ` - ${horaFin}` : ''}</span>
          </div>
          ${workerData ? `
          <div class="detail-row">
            <span class="detail-label">Trabajador:</span>
            <span class="detail-value">${workerData.nombre}</span>
          </div>
          ` : ''}
          ${serviceData ? `
          <div class="detail-row">
            <span class="detail-label">Servicio:</span>
            <span class="detail-value">${serviceData.nombre} (${serviceData.duracion} min)</span>
          </div>
          ` : ''}
          ${serviceData?.precio && serviceData.precio > 0 ? `
          <div class="detail-row">
            <span class="detail-label">Precio:</span>
            <span class="detail-value">${serviceData.precio}€</span>
          </div>
          ` : ''}
          ${reservaData.observaciones ? `
          <div class="detail-row">
            <span class="detail-label">Observaciones:</span>
            <span class="detail-value">${reservaData.observaciones}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Estado:</span>
            <span class="detail-value" style="color: #10b981; font-weight: bold;">
              ✅ ${reservaData.estado || 'Confirmada'}
            </span>
          </div>
        </div>

        <div class="actions">
          <h3 style="margin-top: 0; color: #92400e;">⚡ Acciones Rápidas</h3>
          <p>Accede a tu panel de administración para gestionar esta reserva:</p>
          <div style="text-align: center; margin: 15px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.gestordecitasmv.es'}/carga-trabajo" class="btn">
              📊 Ver Agenda
            </a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.gestordecitasmv.es'}/configuracion" class="btn">
              ⚙️ Configuración
            </a>
          </div>
        </div>

        <div class="footer">
          <p>Esta notificación fue enviada automáticamente por el Gestor de Citas MV.</p>
          <p><strong>ID de Reserva:</strong> ${reservaData.id}</p>
          <p><strong>Fecha de creación:</strong> ${new Date().toLocaleString('es-ES')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ✅ FUNCIÓN AUXILIAR: Calcular hora de fin
function calculateEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) return null;
  
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}