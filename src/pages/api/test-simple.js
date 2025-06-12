import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'reservas@gestordecitasmv.es',
      to: ['TU_EMAIL_PERSONAL@gmail.com'], // ← CAMBIA ESTE EMAIL
      subject: 'Test Directo Resend',
      html: '<h1>¡Funciona!</h1><p>Resend está enviando emails correctamente.</p>'
    });

    if (error) {
      return res.status(400).json({ success: false, error });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}