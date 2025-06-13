import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Template de email de recordatorio
const createReminderEmailTemplate = (reservation) => {
  const { nombre_cliente, email_cliente, fecha, hora, servicio, negocio_nombre, telefono_negocio } = reservation;
  
  return {
    subject: `Recordatorio: Tu cita mañana a las ${hora} - ${negocio_nombre}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recordatorio de Cita</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 0; 
              background-color: #f7f8fc; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 12px; 
              overflow: hidden; 
              box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
            .content { 
              padding: 30px; 
            }
            .reminder-badge { 
              background: #ff6b6b; 
              color: white; 
              padding: 8px 16px; 
              border-radius: 20px; 
              display: inline-block; 
              margin-bottom: 20px; 
              font-weight: bold; 
              font-size: 14px; 
            }
            .appointment-details { 
              background: #f8f9ff; 
              border-left: 4px solid #667eea; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 8px; 
            }
            .detail-row { 
              margin: 10px 0; 
              display: flex; 
              align-items: center; 
            }
            .detail-icon { 
              width: 20px; 
              margin-right: 12px; 
              text-align: center; 
            }
            .cta-buttons { 
              text-align: center; 
              margin: 30px 0; 
            }
            .btn { 
              display: inline-block; 
              padding: 12px 24px; 
              margin: 8px; 
              border-radius: 6px; 
              text-decoration: none; 
              font-weight: bold; 
              transition: all 0.3s ease; 
            }
            .btn-primary { 
              background: #667eea; 
              color: white; 
            }
            .btn-secondary { 
              background: #f1f2f6; 
              color: #2f3542; 
              border: 2px solid #ddd; 
            }
            .btn:hover { 
              transform: translateY(-2px); 
              box-shadow: 0 4px 12px rgba(0,0,0,0.2); 
            }
            .footer { 
              background: #f8f9fa; 
              padding: 20px; 
              text-align: center; 
              color: #6c757d; 
              font-size: 14px; 
            }
            @media (max-width: 600px) {
              .container { margin: 10px; }
              .content { padding: 20px; }
              .btn { display: block; margin: 10px 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🔔 Recordatorio de Cita</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Tu cita es mañana</p>
            </div>
            
            <div class="content">
              <div class="reminder-badge">
                ⏰ ¡24 HORAS PARA TU CITA!
              </div>
              
              <p style="font-size: 18px; margin-bottom: 10px;">Hola <strong>${nombre_cliente}</strong>,</p>
              <p>Te recordamos que tienes una cita programada para mañana. Aquí están los detalles:</p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <span class="detail-icon">📅</span>
                  <strong>Fecha:</strong> &nbsp; ${new Date(fecha).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div class="detail-row">
                  <span class="detail-icon">⏰</span>
                  <strong>Hora:</strong> &nbsp; ${hora}
                </div>
                <div class="detail-row">
                  <span class="detail-icon">💼</span>
                  <strong>Servicio:</strong> &nbsp; ${servicio}
                </div>
                <div class="detail-row">
                  <span class="detail-icon">🏢</span>
                  <strong>Lugar:</strong> &nbsp; ${negocio_nombre}
                </div>
                ${telefono_negocio ? `
                <div class="detail-row">
                  <span class="detail-icon">📞</span>
                  <strong>Teléfono:</strong> &nbsp; ${telefono_negocio}
                </div>
                ` : ''}
              </div>
              
              <div class="cta-buttons">
                <a href="#" class="btn btn-primary">✅ Confirmar Asistencia</a>
                <a href="#" class="btn btn-secondary">📅 Reagendar</a>
                <a href="#" class="btn btn-secondary">❌ Cancelar</a>
              </div>
              
              <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #1e40af;">💡 Recomendaciones:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li>Llega 5-10 minutos antes de tu cita</li>
                  <li>Trae un documento de identificación</li>
                  <li>Si necesitas cancelar, hazlo con al menos 2 horas de anticipación</li>
                </ul>
              </div>
              
              <p style="color: #6b7280;">¡Esperamos verte mañana! Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">${negocio_nombre}</p>
              <p style="margin: 5px 0 0 0;">Este es un recordatorio automático. Por favor, no respondas a este email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  };
};

export default async function handler(req, res) {
  // Solo permitir requests GET (Vercel Cron)
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔄 Iniciando proceso de recordatorios...', new Date().toISOString());

    // Calcular la fecha de mañana (24 horas desde ahora)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('📅 Buscando citas para:', tomorrowString);

    // Buscar citas que necesitan recordatorio
    const { data: reservations, error: fetchError } = await supabase
      .from('reservas')
      .select(`
        id,
        nombre_cliente,
        email_cliente,
        fecha,
        hora,
        servicio,
        estado,
        recordatorio_enviado,
        negocios (
          nombre as negocio_nombre,
          telefono as telefono_negocio
        )
      `)
      .eq('fecha', tomorrowString)
      .eq('estado', 'confirmada')
      .eq('recordatorio_enviado', false);

    if (fetchError) {
      console.error('❌ Error al buscar reservas:', fetchError);
      return res.status(500).json({ error: 'Error al buscar reservas' });
    }

    console.log(`📋 Encontradas ${reservations?.length || 0} citas para recordar`);

    if (!reservations || reservations.length === 0) {
      console.log('✅ No hay citas que requieran recordatorio');
      return res.status(200).json({ 
        message: 'No hay citas que requieran recordatorio',
        processed: 0 
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Procesar cada reserva
    for (const reservation of reservations) {
      try {
        console.log(`📧 Enviando recordatorio a: ${reservation.email_cliente}`);

        // Preparar datos del email
        const emailData = {
          ...reservation,
          negocio_nombre: reservation.negocios?.nombre || 'Tu Negocio',
          telefono_negocio: reservation.negocios?.telefono
        };

        const emailTemplate = createReminderEmailTemplate(emailData);

        // Enviar email
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
          to: reservation.email_cliente,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        if (emailResult.error) {
          throw new Error(`Error enviando email: ${emailResult.error.message}`);
        }

        console.log(`✅ Email enviado exitosamente a ${reservation.email_cliente}, ID: ${emailResult.data?.id}`);

        // Marcar como recordatorio enviado
        const { error: updateError } = await supabase
          .from('reservas')
          .update({ 
            recordatorio_enviado: true,
            fecha_recordatorio_enviado: new Date().toISOString()
          })
          .eq('id', reservation.id);

        if (updateError) {
          throw new Error(`Error actualizando base de datos: ${updateError.message}`);
        }

        successCount++;

      } catch (error) {
        console.error(`❌ Error procesando reserva ${reservation.id}:`, error.message);
        errorCount++;
        errors.push({
          reservationId: reservation.id,
          email: reservation.email_cliente,
          error: error.message
        });
      }
    }

    console.log(`🎉 Proceso completado. Éxitos: ${successCount}, Errores: ${errorCount}`);

    // Respuesta final
    const response = {
      message: 'Proceso de recordatorios completado',
      total: reservations.length,
      success: successCount,
      errors: errorCount,
      timestamp: new Date().toISOString()
    };

    if (errors.length > 0) {
      response.errorDetails = errors;
    }

    // Status code basado en resultados
    const statusCode = errorCount === 0 ? 200 : (successCount > 0 ? 207 : 500);
    
    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('💥 Error crítico en el proceso de recordatorios:', error);
    return res.status(500).json({ 
      error: 'Error crítico en el proceso de recordatorios',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}