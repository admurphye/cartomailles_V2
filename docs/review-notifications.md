# Notifications des dossiers REVIEW_REQUIRED

## Périmètre

Le destinataire est fixé dans le code à `contact@cartomailles.com`. Aucun champ
de requête ni variable d'environnement ne peut remplacer cette adresse.
L'adaptateur serveur Resend est disponible via `fetch`, sans SDK ni dépendance
supplémentaire. Un handler cron protégé par CRON_SECRET est préparé, sans
planification Vercel active ni tableau de bord. Les envois sont
désactivés par défaut ; aucune configuration Vercel ou `.env` n'est modifiée.
Le webhook Stripe et PasswordGate restent inchangés.

## Mise en attente atomique

La transaction de synchronisation des abonnements crée une entrée dans
`stripeEnvironments/{test|live}/reviewNotifications` lorsqu'une nouvelle anomalie
nécessite un examen manuel. Elle le fait dans le même commit que les preuves de
paiement, les droits recalculés et `stripeEvents.errorCode = REVIEW_REQUIRED`.
Une transaction échouée ne perd ni ne crée une alerte isolée de son dossier.
La branche d'échec générique REVIEW_REQUIRED peut aussi créer une alerte sur
la référence d'événement, quand aucun diagnostic d'abonnement n'est disponible.

`reviewNotificationStates/{caseId}` conserve l'empreinte des anomalies actives,
leurs clés hachées et une révision. Les références de dossier et notification
sont des SHA-256 comprenant l'environnement. Les données sources restent dans
Firestore côté serveur, sans être reprises dans le texte de l'e-mail.

Le dossier normal regroupe les diagnostics d'un abonnement. La même anomalie,
reçue via un événement dupliqué ou désordonné, ne crée pas un nouvel e-mail.
L'ordre des diagnostics n'a pas d'effet. Une nouvelle anomalie ou une réapparition
après résolution crée une nouvelle notification ; la simple disparition d'une
partie des anomalies n'en crée pas. Les anciennes notifications sont conservées
pour la traçabilité, même si le dossier se résout avant leur envoi : le message
décrit une détection datée, et l'opérateur doit vérifier l'état actuel.

Chaque notification contient seulement la référence de source technique privée,
les codes autorisés, l'environnement, la date et les métadonnées de livraison.
Aucun e-mail utilisateur, nom, montant, détail bancaire, jeton, secret ou payload
Stripe complet n'est ajouté. L'e-mail envoyé ne contient que les références hachées,
les catégories d'anomalie, les codes, la date UTC et l'environnement.

## Modèle et livraison séparée

`reviewEmail.ts` prépare un message texte français versionné `v1` : type d'anomalie,
code de diagnostic, référence technique du dossier et de notification, date de
détection et mention explicite qu'une intervention manuelle est nécessaire.
Il n'inclut aucun lien d'administration, lien de connexion ni secret d'accès.

`processReviewNotification(id, transport)` et `drainReviewNotifications(transport)`
sont des entrées serveur utilisées par le handler cron authentifié préparé.
Les requêtes de sélection sont bornées et séparées par
environnement. La livraison externe est toujours hors transaction Firestore.

Cycle : `pending` → `processing` → `sent`. Une erreur temporaire renvoie à `pending` avec
backoff exponentiel de 30 secondes à 6 heures. Un bail de 60 secondes et un
identifiant aléatoire empêchent deux workers de posséder simultanément un bail
valide pour le même message. Un envoi déjà parti peut néanmoins survivre à un
timeout : la clé d'idempotence du fournisseur reste indispensable. Une reprise
peut récupérer un bail expiré ; un ancien worker ne peut
plus valider une livraison réservée par un autre.

Les erreurs persistées sont uniquement `SEND_FAILED`, `ACK_FAILED`,
`DELIVERY_UNCERTAIN`, `PROVIDER_CHANGED`, `IDEMPOTENCY_CONFLICT`,
`PROVIDER_REJECTED`, `PROVIDER_CONFIGURATION`, `RATE_LIMIT` ou
`CONCURRENT_REQUEST`, sans corps de réponse ni message réseau brut. Les données
envoyées sont figées : version du modèle, codes, date, destinataire et référence ;
l'expéditeur et l'identité du fournisseur sont figés à la première tentative.

## Prévention des doublons externes

Une transaction Firestore ne peut pas confirmer atomiquement un e-mail livré
chez un fournisseur externe. La fiabilité repose donc aussi sur le contrat de
l'adaptateur Resend : dédupliquer la clé stable
`cartomailles-review-{notificationId}` pour une durée documentée `retentionMs`,
y compris après timeout ou perte de réponse, avec le même contenu.
Resend annonce une rétention de 24 heures, fixée à `86_400_000` ms dans
l'adaptateur. Les tests simulent ce contrat ; aucun appel à Resend n'est effectué.

L'adaptateur doit avoir une identité stable et annoncer une rétention d'au moins
deux minutes ; la durée réelle devra couvrir les reprises opérationnelles choisies.
Il doit respecter le signal d'annulation de dix secondes et ne jamais changer
de compte fournisseur sous la même identité. Une fenêtre trop courte produit
rapidement un dossier bloqué plutôt qu'une tentative risquant un doublon.

Quand l'envoi a réussi mais que l'accusé Firestore échoue, la reprise utilise
la même clé et le même contenu. À l'approche de la fin de la fenêtre de rétention
(marge de 60 secondes), ou si le fournisseur change, le message devient `blocked`.
Aucun nouvel envoi automatique n'est alors tenté. Une procédure opérateur doit
confirmer chez le fournisseur si l'e-mail a été livré avant toute réémission.
Sans cette capacité d'idempotence, l'adaptateur n'est pas prêt à être branché.
Le système ne promet pas un « exactement une fois » indépendant du fournisseur.

Le worker relit transactionnellement le bail et la fenêtre juste avant l'appel,
renouvelle le bail s'il est encore valide et fournit une date limite courte à
l'adaptateur. Celui-ci vérifie à nouveau cette limite et le signal d'annulation
juste avant `fetch`. Un worker dont le bail est expiré ou réattribué n'envoie rien.
Une reprise qui dépasserait la fenêtre sûre est bloquée, y compris lorsque
`Retry-After` demanderait d'attendre trop longtemps.

## Adaptateur Resend

`createResendReviewEmailTransport()` ne lit aucune clé et n'effectue aucun appel
à sa construction. Le futur job pourra fournir cet adaptateur à
`drainReviewNotifications`, sans changement de webhook. Aucune planification automatique
n'est active. Voir `review-notification-cron.md` pour la préparation Hobby et ses limites.
L'adaptateur contrôle aussi le drapeau d'activation
à l'instant de l'envoi : désactivé, il n'appelle jamais `fetch`.

Il appelle uniquement `POST https://api.resend.com/emails`, avec redirections
refusées, `Authorization` côté serveur, l'en-tête `Idempotency-Key` stable et le
signal de dix secondes transmis par le worker. L'expéditeur est strictement
`notifications@cartomailles.com`, le destinataire `contact@cartomailles.com`.
Aucun montant, secret ou détail personnel n'est ajouté au modèle français existant.

| Réponse / incident | Traitement |
| --- | --- |
| Succès avec identifiant UUID valide | Accusé Firestore `sent` et conservation de `providerMessageId` |
| Timeout, réseau, 408, 500, 503 ou autre 5xx | Reprise avec la même clé et le même contenu |
| 409 `concurrent_idempotent_requests` | Reprise différée, code `CONCURRENT_REQUEST` |
| 409 `invalid_idempotent_request` | Blocage `IDEMPOTENCY_CONFLICT`, examen opérateur |
| 429 | Reprise `RATE_LIMIT`, avec `Retry-After` borné et contrôle de la fenêtre |
| 401 ou 403 | Blocage `PROVIDER_CONFIGURATION` |
| Autre erreur permanente, dont 400/422 ou conflit inconnu | Blocage `PROVIDER_REJECTED` |
| Succès sans accusé exploitable | Livraison incertaine ; reprise avec la même clé |

Les anciennes notifications sans champ `providerMessageId` restent lisibles ;
aucune migration distante n'est lancée. Un échec de persistance après acceptation
Resend se reprend par la clé identique pour récupérer le même identifiant.
`sent` signifie accepté par Resend et non réception effective en boîte mail.

## Configuration serveur à préparer après validation

| Configuration | Comportement |
| --- | --- |
| `REVIEW_EMAIL_ENABLED` | Doit rester absent ou `false` pendant cette préparation. Seul `true` autorise le worker et l'adaptateur à envoyer. |
| `REVIEW_EMAIL_FROM` | `notifications@cartomailles.com`, requise pour un futur essai autorisé. Toute autre adresse est refusée par l'adaptateur Resend. |
| `RESEND_API_KEY` | Secret serveur Resend, déjà déclaré dans Vercel Production selon la configuration fournie. Jamais `NEXT_PUBLIC_*`, jamais affiché ni ajouté au dépôt. |
| `STRIPE_ENVIRONMENT` | `test` ou `live`, requis pour sélectionner la file ; aucun repli entre environnements. |
| Adaptateur serveur | `createResendReviewEmailTransport()`, identité stable `resend-cartomailles-v1`, rétention 24 h. Ne pas changer de compte Resend sous cette même identité. |

Il faudra également installer un job authentifié hors des routes publiques,
vérifier IAM, et configurer les index Firestore nécessaires pour :

- `reviewNotifications` : `status ASC`, `nextAttemptAt ASC`.
- `reviewNotifications` : `status ASC`, `leaseUntil ASC`.

Les règles clientes doivent rester fermées. Les workers utilisent Firebase Admin
et ses permissions IAM. Les configurations, domaines expéditeurs (SPF/DKIM/DMARC),
quotas, délais d'envoi et conditions de conservation seront à valider avec le
fournisseur avant tout essai réel. Le domaine est annoncé vérifié par l'utilisateur ;
cette étape ne contrôle ni ne modifie son DNS, sa clé ou ses variables Vercel.
Le mode Stripe `test` ne simule pas les e-mails : une activation de Resend enverrait
de vrais messages à contact@cartomailles.com. Maintenir le drapeau désactivé.

## Traitement manuel sécurisé sans tableau de bord

1. Un opérateur autorisé utilise son compte nominatif avec MFA et des outils
   serveur/console à accès limité. La réception de l'e-mail ne confère aucun droit
   d'administration ; les références ne constituent pas des jetons d'accès.
2. À partir de la référence de notification hachée, il consulte le document privé
   `reviewNotifications`, puis la source, `subscriptionCoverage`, la commande et
   l'événement concernés, dans le même environnement.
3. Il recoupe client, abonnement, facture, commande et UID dans les sources de
   confiance. Il examine l'état Stripe actuel et les preuves de règlement ou de
   remboursement. Aucun rapprochement automatique par e-mail et aucune copie de
   données bancaires dans un ticket ou une réponse e-mail.
4. Il consigne une décision avec référence de dossier, identité d'opérateur,
   date, motif et périmètre exact. Le stockage audité et le mécanisme d'approbation
   métier de cette décision restent à développer ; aucun changement de droit
   manuel n'est exécuté par cette étape.
5. Une correction des données de référence peut être suivie par la réconciliation
   serveur existante. Un remboursement partiel ou un litige encore ambigu exige
   un mécanisme d'approbation explicite à développer : relancer la synchronisation
   ne vaut pas approbation. Ne pas fabriquer une période payée ni modifier seulement
   le droit agrégé pour faire disparaître l'alerte.

`sent` signifie seulement que la livraison a été confirmée au niveau du fournisseur,
pas que le dossier a été traité, ni que le destinataire a lu l'e-mail. Ne jamais
effacer ou réinitialiser aveuglément une notification en cours pour la réémettre.
Prévoir une surveillance des files anciennes, messages `blocked`, taux d'erreur
et échecs de remise signalés par le futur fournisseur. Les bounces et suppressions
nécessiteront une intégration approuvée séparée, sans route ajoutée ici.

Les notifications n'accordent, ne prolongent et ne retirent aucun droit d'abonnement.
Leur traitement ne modifie ni `subscriptions` ni `entitlements`.

## Tests

Mocks uniquement : mise en file atomique, rollback, répétitions, réouvertures,
résolutions partielles, travailleurs simultanés, erreurs d'envoi, réponse perdue,
accusé Firestore perdu, bail expiré, fenêtre d'idempotence dépassée, changement
de fournisseur, expéditeur figé, destinataire fixe et séparation test/live.
Aucun e-mail réel, appel fournisseur ou écriture réelle Firestore n'est effectué.

L'adaptateur est testé avec `fetch` remplacé par un mock : succès, 409 concurrents
et permanents, 429, 500, 503, timeout, réponse invalide, signal annulé, délai expiré,
reprises et travailleurs concurrents. Les tests n'utilisent aucune clé réelle.

Références :
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://resend.com/docs/api-reference/errors
