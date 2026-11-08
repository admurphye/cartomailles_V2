import "server-only";
import type { ReviewEmailCode, ReviewNotificationRecord, StripeEnvironment } from "../firestore/types";

export const REVIEW_EMAIL_RECIPIENT = "contact@cartomailles.com" as const;
const labels: Record<ReviewEmailCode, string> = {
  PARTIAL_REFUND: "Remboursement partiel", REFUND_PENDING: "Remboursement en attente",
  REFUND_AMBIGUOUS: "Remboursement à clarifier", DISPUTE: "Litige de paiement",
  ZERO_INVOICE: "Facture à montant nul", CREDIT_NOTE: "Avoir",
  PRORATION: "Prorata", PAYMENT_UNCONFIRMED: "Paiement non confirmé",
  OUT_OF_BAND: "Paiement hors Stripe", PAUSED_COLLECTION: "Collecte suspendue",
  REVIEW_REQUIRED: "Dossier nécessitant une vérification manuelle",
};

/** v1 is immutable for retries: use a new template version for future changes. */
export function renderReviewEmail(message: ReviewNotificationRecord, environment: StripeEnvironment) {
  if (message.templateVersion !== "v1") throw new Error("Unsupported email template.");
  const anomalies = message.codes.map((code) => {
    if (!Object.hasOwn(labels, code)) throw new Error("Invalid review diagnostic.");
    return `- ${labels[code]} — code : ${code}`;
  });
  return {
    to: REVIEW_EMAIL_RECIPIENT,
    subject: `[Cartomailles][${environment}] Intervention manuelle nécessaire`,
    text: ["Bonjour,", "", "Un dossier d’abonnement Cartomailles est passé en REVIEW_REQUIRED.",
      "Une intervention manuelle est nécessaire.", "", "Anomalies détectées :", ...anomalies, "",
      `Référence technique du dossier : ${message.caseId}`,
      `Référence de notification : ${message.notificationId}`,
      `Date de détection : ${message.detectedAt.toDate().toISOString()} (UTC)`,
      `Environnement Stripe : ${environment}`, "",
      "Consultez le dossier depuis les outils serveur autorisés et vérifiez les preuves dans Stripe avant toute décision.",
      "L’envoi de cette notification ne modifie aucun droit d’accès.", "", "Cartomailles"].join("\n"),
  };
}
