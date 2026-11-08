# Job Vercel des notifications REVIEW_REQUIRED

## État actuel

Le plan **Hobby** a été confirmé par l'utilisateur. Le dépôt ne contient ni
`vercel.json` ni liaison `.vercel/project.json`. Les limites ont été vérifiées
dans la documentation officielle, sans modifier le compte Vercel.

`GET /api/cron/review-notifications` est préparé mais **aucune planification cron
n'est déclarée ou activée**. Les variables Vercel restent inchangées et
`REVIEW_EMAIL_ENABLED` reste désactivé. Webhook Stripe, PasswordGate et diagrammes
sont inchangés.

## Fréquence et limite Hobby

Hobby permet une exécution quotidienne, avec une précision horaire ; Pro et
Enterprise permettent une fréquence jusqu'à la minute. Proposition compatible
Hobby : `0 6 * * *`, une fois par jour à 06 h UTC, avec déclenchement possible
pendant cette heure. Aucun horaire local Europe/Paris n'est supposé par le cron.

Cette fréquence n'est pas suffisante pour garantir des alertes réactives ou
des reprises dans les 24 h d'idempotence Resend. Après une tentative incertaine,
le lendemain peut être trop tard : le worker bloque alors `DELIVERY_UNCERTAIN`
au lieu de risquer un doublon. Le backoff Firestore indique une échéance ; il
ne déclenche pas lui-même une exécution.

Avant une exploitation commerciale réactive, autoriser un plan plus adapté ou
un ordonnanceur externe. Sur Pro/Enterprise, cinq minutes serait une proposition
à valider. Ne pas contourner les limites Hobby par plusieurs crons quotidiens.
Avec le lot actuel de deux, le cron quotidien ne commence au plus que deux
notifications par jour : un backlog impose une évolution de capacité.

## Authentification

- `CRON_SECRET` : secret aléatoire serveur de 32 à 256 caractères, lettres,
  chiffres, `_` ou `-`. Aucun secret réel n'est généré par cette étape.
- En-tête strictement égal à `Authorization: Bearer <CRON_SECRET>`, comparé
  avec SHA-256 et `timingSafeEqual`, sans trim ni solution de repli.
- Secret absent/incorrect ou requête non autorisée : 401, aucun traitement.
- Aucun secret accepté dans l'URL ou un cookie. Les paramètres URL sont refusés :
  aucun choix distant de lot, environnement, fournisseur ou destinataire.
- Preview/Development Vercel refusés ; l'authentification reste nécessaire en
  mode désactivé. Les tests locaux sont uniquement simulés.
- Réponse dynamique avec `Cache-Control: private, no-store`.

Vercel envoie automatiquement l'en-tête à partir du secret du déploiement de
production. Toute rotation nécessite un nouveau déploiement. Ne jamais considérer
le User-Agent `vercel-cron/1.0` comme une authentification.

## Durée, erreurs et concurrence

La route réutilise `drainReviewNotifications` et l'adaptateur Resend existants.
Runtime Node.js, `maxDuration = 60`, lot fixe de deux et budget coopératif de
40 secondes. Aucune nouvelle notification n'est réservée avec moins de 20 secondes
restantes. Le worker reçoit l'échéance et conserve une réserve pour l'accusé
Firestore et la réponse HTTP ; l'appel Resend reste borné à dix secondes.

Les limites documentées des Functions avec Fluid Compute permettent 60 secondes
sur Hobby. Vérifier l'activation de Fluid Compute et la limite effective de la
fonction déployée avant mise en service. Une transaction Firestore lente ne peut
pas être annulée par ce budget : Vercel reste la coupure dure à 60 secondes.
Aucun Promise.race ne laisse volontairement un traitement orphelin après réponse.

Une notification non commencée reste pending. Une interruption après réservation
laisse un bail récupérable ; après acceptation Resend, la reprise conserve sa clé.
Une erreur isolée est comptée puis le lot continue si le budget le permet. Une
erreur de sélection renvoie 503. Aucune notification n'est supprimée par le job.
Les invocations concurrentes utilisent les baux transactionnels existants : elles
peuvent traiter des notifications différentes, chacune dans sa limite de deux,
mais ne doivent pas doubler le même message.

Vercel ne réessaie pas automatiquement une invocation cron échouée. Les reprises
dépendent de la prochaine invocation ou d'une intervention opérateur autorisée,
tout en respectant la fenêtre Resend.

## Réponses et surveillance

- 200 `disabled` : aucun accès Firestore ni appel Resend.
- 200 `completed` : compteurs sent, retry_pending, blocked, skipped, disabled, error.
- 503 `partial_failure` : erreur technique isolée ; les succès persistés restent acquis.
- 503 générique : lot indisponible, sans détails sensibles.

Les logs structurés `review_notification_cron` ne contiennent que des compteurs
ou le code `JOB_FAILED`. Aucun secret, en-tête Authorization, référence de dossier,
e-mail utilisateur ou réponse brute Resend n'est journalisé. Les compteurs portent
sur les notifications commencées, pas sur toute la file.

Surveiller : absence d'exécution quotidienne, 401/403/503/504, âge/nombre de pending,
baux processing expirés, tous les blocked, débit et backlog, rejets et suppressions
Resend. `sent` signifie accepté par le fournisseur, pas reçu ou lu par le destinataire.
Une livraison incertaine doit être rapprochée du fournisseur avant réémission :
ne pas changer sa clé ni effacer son bail pour forcer un envoi.

## Paramètres avant activation, non configurés ici

| Paramètre | Action |
| --- | --- |
| Plan | Hobby confirmé ; décider si les limites quotidiennes sont acceptables |
| `CRON_SECRET` | Ajouter ultérieurement un secret serveur Production conforme |
| `REVIEW_EMAIL_ENABLED` | Rester absent ou false jusqu'à autorisation d'un essai réel |
| `REVIEW_EMAIL_FROM` | notifications@cartomailles.com |
| `RESEND_API_KEY` | Secret serveur existant, ne pas afficher |
| `STRIPE_ENVIRONMENT` | test actuellement ; ne simule pas l'envoi d'e-mails |
| Firebase / IAM | Permissions et index de la file à confirmer |
| Fonction | Vérifier Node.js, Fluid Compute et limite effective de 60 secondes |

Exemple documentaire uniquement, à appliquer dans une étape ultérieure autorisée :

```json
{
  "crons": [
    { "path": "/api/cron/review-notifications", "schedule": "0 6 * * *" }
  ]
}
```

Ce bloc n'est pas écrit dans un `vercel.json`. Une future configuration devra
être déployée puis vérifiée dans les logs, d'abord avec les e-mails désactivés.
Aucune requête au déploiement réel n'est effectuée ici.

Les tests couvrent authentification, mode désactivé sans I/O, taille du lot,
budget épuisé, erreur isolée et concurrence, avec mocks et Firestore en mémoire.
Aucun e-mail, appel Resend ou écriture réelle Firestore.

Références :
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/docs/cron-jobs
- https://vercel.com/docs/functions/limitations
