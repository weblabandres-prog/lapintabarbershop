function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = async function handler(req, res) {
  const allowedOrigins = [
    "https://lapintabarbershop.com",
    "https://www.lapintabarbershop.com",
    "https://lapintabarbershop.vercel.app",
    "https://weblabandres-prog.github.io"
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método no permitido"
    });
  }

  try {
    const body = req.body || {};

    if (body.botcheck) {
      return res.status(200).json({
        ok: true,
        message: "Solicitud ignorada."
      });
    }

    const nombre = body.nombre || body.name || body.clientName || "";
    const telefono = body.telefono || body.phone || body.clientPhone || "";
    const servicio = body.servicio || body.service || "";
    const fecha = body.fecha || body.date || "";
    const hora = body.hora || body.time || "";
    const metodoPago = body.metodoPago || body.paymentMethod || body.pago || "";
    const banco = body.banco || body.bank || "";
    const mensaje = body.mensaje || body.message || "";

    if (!nombre || !telefono || !fecha || !hora) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos obligatorios."
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
        <h2>Nueva cita - La Pinta Barber</h2>

        <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
        <p><strong>Servicio:</strong> ${escapeHtml(servicio || "No especificado")}</p>
        <p><strong>Fecha:</strong> ${escapeHtml(fecha)}</p>
        <p><strong>Hora:</strong> ${escapeHtml(hora)}</p>
        <p><strong>Método de pago:</strong> ${escapeHtml(metodoPago || "No especificado")}</p>
        <p><strong>Banco:</strong> ${escapeHtml(banco || "No especificado")}</p>
        <p><strong>Mensaje:</strong> ${escapeHtml(mensaje || "Sin mensaje")}</p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />

        <p style="font-size: 13px; color: #666;">
          Enviado desde el formulario de citas de La Pinta Barber.
        </p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "La Pinta Barber <citas@lapintabarbershop.com>",
        to: ["weblabandres@gmail.com"],
        subject: `Nueva cita de ${escapeHtml(nombre)}`,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        ok: false,
        message: "Resend no pudo enviar el correo.",
        error: data
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Cita enviada correctamente.",
      id: data.id
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error interno al enviar la cita."
    });
  }
};
