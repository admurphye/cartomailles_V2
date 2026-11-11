# Consultation privée des notifications REVIEW_REQUIRED

Le contrôle `scripts/review-notification-monitor.cjs` est un outil Node.js serveur
en lecture seule. Il ne dépend ni du worker, ni du job Vercel, ni de Resend, ni de
`REVIEW_EMAIL_ENABLED`. Aucun e-mail, écriture, modification de bail ou correction
automatique. Il n'est raccordé à aucune route et aucune exécution n'est planifiée.
Le cron existant continue à ne résumer que son propre lot.

## Situations signalées

- `BLOCKED` : toute notification bloquée exige un examen.
- `PERMANENT_ERROR` : rejet, configuration fournisseur, conflit d'idempotence ou
  changement de fournisseur. Le code enregistré est conservé dans le résumé.
- `DELIVERY_UNCERTAIN` : `ACK_FAILED`, `DELIVERY_UNCERTAIN` ou `SEND_FAILED`.
  Ce dernier est volontairement prudent : il peut couvrir un timeout après
  acceptation. Le contrôle ne peut pas prouver la réception effective.
- `IDEMPOTENCY_WINDOW_EXHAUSTED` : première tentative + rétention enregistrée
  moins 60 secondes atteinte, ou prochaine tentative prévue après cette limite.
  La rétention actuelle Resend du dépôt est de 24 h. Ce contrôle ne remplace pas
  le preflight du worker, qui peut appliquer un contrat fournisseur plus court.
- `PENDING_TOO_LONG` : pending depuis au moins six heures après détection,
  même si `nextAttemptAt` est encore futur. Seuil opérationnel initial à valider :
  le cron quotidien Hobby ne garantit pas une prise en charge sous six heures.
- `LEASE_EXPIRED` : processing avec bail expiré, récupérable par le worker mais
  à examiner si la situation persiste.
- `INVALID_RECORD` : métadonnées de surveillance invalides ; ne pas ignorer.

`sent` est exclu des anomalies de file : il signifie accepté par le fournisseur,
pas reçu, lu ou dossier métier résolu. Les bounces et suppressions ne sont pas
détectables avec ces seuls documents ; leur consultation fournisseur reste séparée.

## Procédure de l'administratrice

1. Depuis un poste de confiance, utiliser un compte nominatif avec MFA et une
   authentification Google ADC approuvée. Faire attribuer un accès IAM **lecture
   seule**, limité au projet et, si disponible, au périmètre nécessaire. Firebase
   Admin contourne les règles clientes : elles ne suffisent pas à protéger cet
   outil. Ne pas utiliser ni exporter la clé serveur de production de l'application.
2. Confirmer le projet et l'environnement Stripe avant la commande suivante,
   donnée uniquement comme exemple et non exécutée pendant cette préparation :

   ```powershell
   node scripts/review-notification-monitor.cjs --read-only ID_PROJET test
   ```

   Remplacer `ID_PROJET` et choisir explicitement `test` ou `live`. Le mode Stripe
   test n'est pas une simulation de données. L'outil ne charge aucun fichier .env.
3. Lire le JSON dans le terminal privé. Il contient uniquement les références
   hachées notification/dossier, environnement, états, codes autorisés, nombres de
   tentatives et dates UTC. Aucun sourceId, UID, adresse e-mail, message fournisseur,
   payload Stripe, clé ou corps d'exception. Ne pas publier ce résumé ; même les
   références techniques restent réservées à l'équipe autorisée.
4. Vérifier `complete` et `errorCode` avant de conclure. Codes de sortie : 0 = scan
   complet sans anomalie, 1 = anomalies, 2 = contrôle incomplet ou indisponible.
   Une erreur Firestore, un refus IAM, une panne réseau ou un timeout est une
   **défaillance de surveillance**, jamais une file saine. Les erreurs restent
   génériques pour éviter de divulguer des secrets. Faire diagnostiquer la cause
   dans les outils privés autorisés.
5. Consulter le document privé avec sa notificationId dans
   `stripeEnvironments/{environnement}/reviewNotifications`. Relire son état actuel
   avant toute décision : un worker peut l'avoir traité depuis le scan. Rapprocher
   le dossier avec les sources privées et, si nécessaire, les traces Resend avec
   la clé stable `cartomailles-review-{notificationId}` et l'accusé fournisseur.
6. Pour livraison incertaine ou fenêtre expirée, confirmer l'acceptation chez le
   fournisseur avant toute réémission. Ne pas réinitialiser pending, changer la
   clé, supprimer le document ou forcer le bail. Corriger une configuration exige
   une opération distincte autorisée ; cet outil ne répare rien. Une résolution
   métier ne découle pas du statut de l'e-mail.
7. Consigner dans le support privé approuvé : référence, date UTC, opératrice,
   code, constat fournisseur, décision et suivi. Le dépôt ne fournit pas encore
   de commande de reprise manuelle ni de registre de résolution des anomalies.

## Limites et mise en service ultérieure

Le scan ordonne les documents par identifiant, pages de 100, au plus 20 pages
(2 000 documents, y compris sent). Aucun index composé supplémentaire. Les
doublons de lecture sont dédupliqués par notificationId. Les pages ne constituent
pas un snapshot global : insertions ou transitions concurrentes peuvent être
manquées jusqu'au prochain scan. Deux consultations concurrentes n'écrivent rien.
Un scan borné affiche `complete: false` et le dernier curseur ; la CLI ne reprend
pas un curseur. Si la file dépasse cette capacité, faire adapter la limite via
`inspectNotifications` (maxPages jusqu'à 1 000), ou préparer une consultation plus
adaptée avant activation. Ne pas considérer le curseur comme un bilan global.
Le délai maximal de la CLI est 60 secondes ; un timeout impose un nouveau contrôle.

Avant activation : valider IAM/ADC et projet, seuil et capacité de scan, fréquence
de consultation et responsable de remplacement. Prévoir un rappel calendrier ou
un ordonnanceur privé indépendant de Resend qui contrôle la présence d'un résultat
récent et les codes de sortie, avec un canal d'escalade hors e-mail Resend (par
exemple notification de l'outil d'exploitation ou téléphone). Ce mécanisme reste
à installer et tester séparément ; un script non exécuté ne surveille rien.
Une panne Firestore empêche la lecture : le signal d'échec et l'absence de contrôle
récent doivent eux-mêmes être suivis hors Firestore et hors Resend.

Aucune variable Vercel, planification cron ou connexion webhook Stripe n'est
changée. `REVIEW_EMAIL_ENABLED` doit rester absent ou false. L'activation des
envois et du cron exige une validation distincte selon les documents existants.

Les tests utilisent uniquement des lecteurs simulés : seuils, codes permanents,
incertitude, fenêtres expirées, baux, sent, doublons, pagination, erreurs Firestore,
enregistrements invalides, confidentialité et lectures concurrentes. Les tests
existants du worker couvrent les baux transactionnels et les doublons d'envoi.
