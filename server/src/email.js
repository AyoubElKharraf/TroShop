import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter = null;

function getTransporter() {
  if (!config.SMTP.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP.host,
      port: config.SMTP.port,
      secure: config.SMTP.port === 465,
      auth: config.SMTP.user
        ? { user: config.SMTP.user, pass: config.SMTP.pass }
        : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter();
  const subject = "TrocSpot — réinitialisation du mot de passe";
  const text = `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien :\n${resetUrl}\n\nCe lien expire dans 1 heure.\n\n— TrocSpot`;
  const html = `<p>Bonjour,</p><p>Pour choisir un nouveau mot de passe, <a href="${resetUrl}">cliquez ici</a>.</p><p>Ce lien expire dans 1 heure.</p><p>— TrocSpot</p>`;

  if (t) {
    await t.sendMail({
      from: config.SMTP.from,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  }
  if (!config.isProd) {
    console.warn("[email non configuré — lien de test uniquement]\n", resetUrl);
  }
  return { sent: false };
}
