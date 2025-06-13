import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    console.log('🔧 API Key presente:', !!process.env.RESEND_API_KEY);
    console.log('🔧 API Key primeros chars:', process.env.RESEND_API_KEY?.substring(0, 10));
    console.log('🔧 Email From:', process.env.SYSTEM_EMAIL_FROM);

    const { data, error } = await resend.emails.send({
      from: 'reservas@gestordecitasmv.es',
      to: ['TU_EMAIL_PERSONAL@gmail.com'], // ← CAMBIAR POR TU EMAIL
      subject: '🔧 Test Directo Resend - ' + new Date().toISOString(),
      html: `
        <h1>🔧 Test Directo de Resend</h1>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>API Key presente:</strong> ${!!process.env.RESEND_API_KEY}</p>
        <p><strong>Si recibes esto, Resend funciona!</strong></p>
      `
    });

    console.log('📨 Respuesta Resend:', { data, error });

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error,
        apiKeyPresent: !!process.env.RESEND_API_KEY
      });
    }

    return res.status(200).json({ 
      success: true, 
      data,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.SYSTEM_EMAIL_FROM
    });

  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}