# Synchronisation des abonnements Stripe

## Périmètre

Le service serveur `synchronizeStripeSubscriptionEvent(eventId)` applique les
règles validées dans `CARTOMAILLES_SUBSCRIPTION_POLICY`. Il n'est
branché à aucune route. Le webhook existant, PasswordGate et les diagrammes
restent inchangés. Aucune configuration déployée n'est modifiée.

Le service récupère l'événement auprès de Stripe, vérifie son environnement puis
récupère ses objets actuels. Un événement Checkout ne constitue jamais une preuve
de paiement. Le futur webhook devra toujours vérifier sa signature avant tout
appel, acquitter seulement un traitement durable et gérer les reprises et alertes.
Les événements Connect sont refusés : cette intégration vise le compte Stripe
direct configuré, sans contexte de compte fourni par un appelant.

## Association et environnements

Les variables existantes `STRIPE_ENVIRONMENT`, `STRIPE_SECRET_KEY`,
`STRIPE_PRICE_ID` et `APP_URL` sont réutilisées et validées par la configuration
du checkout. Aucun prix, UID ou environnement n'est déduit d'un e-mail.

Le client est associé à un UID uniquement par `stripeCustomers/{customerId}`.
Pour chaque abonnement, le service exige également :

- Les métadonnées UID, environnement et commande de l'abonnement.
- La commande Firestore, possédée par cet UID, avec son client et sa session
  enregistrée ; aucune réassignation d'une association existante n'est admise.
- La session récupérée auprès de Stripe : complétée, en mode abonnement, avec
  le même UID, la même commande, le même client, le même abonnement et le prix
  autorisé, pour une quantité de un.
- Un abonnement à un seul item récurrent licensed au prix autorisé.

Les objets dotés de `livemode` sont contrôlés individuellement. Les remboursements
du SDK utilisé n'ont pas ce champ : ils sont récupérés avec la clé configurée et
reliés à une charge dont l'environnement est contrôlé. Toutes les collections sont
sous `stripeEnvironments/{test|live}` ; leurs métadonnées sont aussi validées.

Une session absente de la commande ou un conflit bloque la synchronisation,
sans changer de propriétaire ni inventer une liaison de remplacement.
Un checkout dont la réponse a été perdue doit d'abord être repris/réconcilié.

## Preuve des paiements et calcul des droits

Pour chaque abonnement associé, le service parcourt les factures payées avec
pagination, les récupère à nouveau et vérifie client et abonnement. Le statut
`paid` seul ne suffit pas : le service exige les InvoicePayments payés, leurs
PaymentIntents `succeeded` le cas échéant, ainsi que les charges payées, capturées
et de montant suffisant. Les devises, clients, factures et environnements sont
recoupés. Les remboursements, y compris en attente, et les litiges sont examinés.

Les périodes proviennent exclusivement des lignes de facture du bon item et du
bon prix, entièrement couvertes par un paiement confirmé. Les factures sans
preuve de règlement monétaire complet, les crédits et les proratas suivent la
politique explicite `nonCashInvoices`. Les essais gratuits et le seul statut
`active` ne créent aucune couverture.

`paidThrough` est une information sur la dernière échéance couverte ; ce champ
ne suffit pas à décider de l'accès. Le calcul des droits fusionne uniquement
les intervalles payés contigus ou chevauchants, sur tous les abonnements et
clients connus du même UID. Il ne comble pas un intervalle impayé et n'additionne
pas la durée de deux abonnements simultanés. Les bornes de l'intervalle courant
donnent `validFrom` et `validUntil`, avec fin exclusive.

Un renouvellement échoué ne prolonge jamais la couverture. Une résiliation
programmée ne crée ni ne supprime de paiement ; même une résiliation immédiate
conserve la période déjà payée. L'annulation d'un abonnement ne supprime pas la couverture
d'un autre abonnement valide. À échéance, le contrôle `access.ts` refuse déjà
les droits expirés même sans nouvel événement Stripe.

## Atomicité, événements désordonnés et reprises

`stripeEvents` conserve état, nombre de tentatives et codes d'erreur non sensibles.
Un événement déjà traité ne réapplique pas les écritures. Les événements ne sont
jamais triés pour décider des droits : même un événement ancien déclenche une
lecture de l'état Stripe actuel.

Une nouvelle collection `subscriptionSyncStates/{uid}` porte une génération
transactionnelle. Chaque tentative la fait avancer avant les lectures de
paiement. Un traitement devenu ancien ne peut plus valider son résultat. Une
transition d'abonnement détectée pendant la lecture de son historique provoque
également une reprise. Les requêtes Stripe ne sont jamais exécutées dans les
transactions Firestore, qui peuvent être rejouées.

La transaction finale relit et valide les associations, les commandes et leur
version, puis écrit atomiquement tous les abonnements calculés, les commandes
associées, les preuves de période par facture dans `subscriptionCoverage`, le
droit agrégé et l'état de l'événement. Sans examen manuel, celui-ci devient
`processed` ; sinon il reste `failed` avec `errorCode: REVIEW_REQUIRED`.
Les droits indépendants et les remboursements non ambigus sont tout de même
appliqués atomiquement dans ce dernier cas. Une erreur technique ne produit
aucune activation partielle. Le store générique continue d'interdire l'activation
d'un droit ; seule cette transaction métier contrôlée dispose de cette capacité.

Les erreurs après réservation laissent un événement `failed` réessayable lorsque
Firestore est disponible. Un arrêt brutal peut laisser `processing` : une nouvelle
tentative reprend avec une génération supérieure, sans verrou permanent. Une
panne empêchant aussi l'enregistrement de l'échec reste une erreur technique à
réessayer ; elle n'est jamais transformée en succès.

Les clients sont énumérés depuis Firestore ; les abonnements viennent de Stripe
et des abonnements déjà enregistrés. L'abonnement déclencheur est aussi inclus
explicitement, même s'il manque provisoirement dans une liste Stripe.
Une association ajoutée pendant le calcul ou un abonnement connu omis entraîne
une reprise. Les historiques sont entièrement paginés, avec limites explicites
(20 clients, 50 abonnements, 1000 éléments par historique). Dépasser une limite
provoque une erreur et aucun calcul partiel n'est validé.

Stripe et Firestore ne fournissent pas de transaction commune : un changement
Stripe après sa dernière lecture sera pris en compte au prochain événement ou
à la réconciliation. Le service ne promet pas une cohérence instantanée globale.

## Règles commerciales validées

Les points d'entrée utilisent la constante serveur ci-dessous par défaut et
refusent une politique différente. Aucun paramètre navigateur ne peut la modifier.

| Choix | Règle appliquée |
| --- | --- |
| `pastDue` / `unpaid` | Conserver seulement les périodes payées ; recalcul après régularisation |
| `canceled` | Conserver les périodes payées, même après résiliation immédiate |
| `pausedCollection` | Examen manuel ; conserver uniquement les preuves déjà enregistrées |
| `refunds` | Retirer les périodes de la facture totalement remboursée de façon confirmée ; examen manuel pour un remboursement partiel, en attente ou ambigu |
| `disputes` | Examen manuel, sans prolongation automatique |
| `nonCashInvoices` | Examen manuel pour zéro, avoir, prorata ou paiement hors Stripe |

Un remboursement total exige une liste de remboursements `succeeded` dont le
montant et la devise correspondent à la totalité capturée, ainsi qu'une charge
marquée entièrement remboursée. Chaque paiement de la facture doit être couvert
sans allocation ambiguë à d'autres factures. Un simple événement ou un indicateur
isolé ne suffit pas. Les remboursements échoués n'entraînent aucune révocation.
Un remboursement intégral confirmé peut être retiré même si le même dossier a
un litige qui reste à examiner. Aucune autre facture ou période n'est supprimée.
Le service n'invente ni délai de grâce, ni prorata de remboursement, ni
réactivation automatique après litige gagné.

Un examen manuel renvoie `review_required` et enregistre `REVIEW_REQUIRED` dans
l'événement. Chaque `subscriptionCoverage/{subscriptionId}` conserve les périodes
prouvées par facture et les diagnostics courants. Pour une facture ambiguë,
seules les bornes déjà prouvées et enregistrées sont conservées : ses nouvelles
périodes ne sont jamais ajoutées. Les autres factures confirmées sont recalculées
normalement, de même que les autres abonnements. Une facture totalement remboursée
est exclue même si une autre facture demande un examen. Le retrait d'une période
peut créer une interruption, qui n'est jamais comblée artificiellement.

Les diagnostics utilisent uniquement des codes autorisés (`PARTIAL_REFUND`,
`REFUND_PENDING`, `REFUND_AMBIGUOUS`, `DISPUTE`, `ZERO_INVOICE`, `CREDIT_NOTE`,
`PRORATION`, `PAYMENT_UNCONFIRMED`, `OUT_OF_BAND`, `PAUSED_COLLECTION`) avec les
identifiants internes de facture et d'abonnement. Aucun e-mail, token, clé,
payload Stripe, message SDK ni détail bancaire n'est enregistré. Ces identifiants
restent réservés au serveur et à un futur outil opérateur autorisé.

Une file durable `reviewNotifications`, créée dans la même transaction, prépare
les alertes vers `contact@cartomailles.com`. Les envois restent désactivés ; un
adaptateur Resend via fetch est préparé sans dépendance ni appel réel.
Voir `review-notifications.md` pour les transitions,
la déduplication, les reprises et la procédure opérateur proposée.

Sans preuve historique attribuable à une facture, le service ne reconstitue pas
une période depuis le seul droit agrégé : ce dossier reste à examiner, sans
extension supposée. Une procédure de migration/réconciliation est nécessaire
pour des droits historiques créés sans ces preuves. Le futur opérateur devra
prévoir une alerte et une procédure de décision/reprise ; ce résultat ne doit
pas être acquitté silencieusement. Les reprises d'un examen recalculent le même
périmètre sans prolonger les bornes conservées.
Les conflits d'association et erreurs techniques conservent eux aussi les
derniers droits sans les prolonger, et interdisent toute nouvelle activation.

## Réconciliation et validations restantes

`reconcileStripeCustomerSubscriptions(customerId)` est une entrée réservée
à un futur job serveur de confiance. Elle recalcule les droits sans dépendre d'un
ancien événement déjà traité. Aucun ordonnanceur ni route n'est installé.
Il faudra programmer les reprises, les alertes et la réconciliation périodique,
notamment pour activer une période payée future après une interruption de service.

Avant branchement : organiser l'examen manuel (qui décide et comment enregistrer
une approbation explicite), décider si une politique plus précise est souhaitée
pour les litiges résolus et la suspension de collecte, confirmer la version d'API Stripe et
ses permissions de lecture (événements, clients, sessions, abonnements, factures,
InvoicePayments, PaymentIntents, charges, remboursements et litiges), vérifier IAM,
les règles Firestore effectivement publiées et les index requis en environnement
de test. Les règles clientes doivent rester fermées ; le SDK Admin passe par IAM.
Prévoir une migration/réconciliation si les données historiques ne possèdent pas
les associations de commande requises. Aucun rattachement automatique par e-mail.

Tous les tests de cette étape utilisent des mocks Stripe et un double transactionnel
Firestore en mémoire. Aucun paiement, appel métier Stripe ou accès réel Firestore
n'a été effectué. Le premier essai intégré reste une validation distincte à autoriser.

Références :
- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/webhooks
- https://docs.stripe.com/api/invoices/object
- https://docs.stripe.com/api/invoice-line-item/object
