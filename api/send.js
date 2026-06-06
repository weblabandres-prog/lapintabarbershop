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

    const nombre = body.nombre || "";
    const telefono = body.telefono || "";
    const servicio = body.servicio || "";
    const barbero = body.barbero || "Chocho la pinta";
    const fecha = body.fecha || "";
    const hora = body.hora || "";
    const duration = body.duration || body.duracion || "";
    const metodoPago = body.metodoPago || "Efectivo";
    const banco = body.banco || "";
    const approvalLink = body.approvalLink || "https://lapintabarbershop.com/aprobar.html";

    if (!nombre || !telefono || !fecha || !hora) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos obligatorios."
      });
    }

    const html = `
      <div style="margin:0;padding:0;background:#07101d;font-family:Arial,sans-serif;">
        <div style="max-width:620px;margin:auto;background:#07101d;color:#ffffff;padding:28px 22px;border-radius:18px;">
          
          <h2 style="margin:0 0 22px;color:#ffffff;font-size:26px;">
            Nueva cita pendiente
          </h2>

          <div style="border-top:1px solid rgba(255,255,255,.14);">
            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Nombre:</strong> ${escapeHtml(nombre)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Teléfono:</strong> ${escapeHtml(telefono)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Servicio:</strong> ${escapeHtml(servicio)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Barbero:</strong> ${escapeHtml(barbero)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Fecha:</strong> ${escapeHtml(fecha)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Hora:</strong> ${escapeHtml(hora)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Duración:</strong> ${escapeHtml(duration)}
            </p>

            <p style="margin:0;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.14);">
              <strong>Pago:</strong> ${escapeHtml(metodoPago)}${banco ? " | " + escapeHtml(banco) : ""}
            </p>
          </div>

          <div style="margin-top:30px;">
            <a href="${escapeHtml(approvalLink)}"
              style="display:inline-block;background:#1f86ff;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:800;font-size:18px;">
              Aprobar cita
            </a>
          </div>

          <p style="margin-top:30px;color:#dbeafe;font-size:15px;">
            Si el botón no funciona, usa este enlace:
          </p>

          <p style="margin:0;word-break:break-all;">
            <a href="${escapeHtml(approvalLink)}" style="color:#38bdf8;text-decoration:none;">
              ${escapeHtml(approvalLink)}
            </a>
          </p>
        </div>
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
        to: ["castrovictory1@gmail.com"],
        subject: `Nueva cita de ${nombre}`,
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
