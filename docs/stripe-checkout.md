# Checkout Stripe associé à Firebase

## Configuration Vercel

Variables serveur, à configurer dans l'environnement de déploiement concerné :

| Variable | Valeur attendue |
| --- | --- |
| `STRIPE_ENVIRONMENT` | `test` actuellement, ou `live` lors de la commercialisation réelle |
| `STRIPE_SECRET_KEY` | Clé secrète standard `sk_test_…` ou `sk_live_…` correspondant à cet environnement |
| `STRIPE_PRICE_ID` | Identifiant du prix d'abonnement autorisé dans le même compte et environnement Stripe |
| `APP_URL` | Origine HTTPS canonique de l'application, sans slash final ni chemin, par exemple `https://app.cartomailles.com` |

Les variables Firebase Admin et publiques déjà configurées restent nécessaires.
Le compte de service devra pouvoir lire et écrire les données Firestore utilisées.
`STRIPE_WEBHOOK_SECRET` reste requis par le webhook existant, sans modification
de celui-ci. Il n'intervient pas dans la création de session Checkout.
Après changement de variables, créer un nouveau déploiement Vercel.
Aucune valeur réelle ni aucun fichier `.env` n'a été modifié pour cette étape.

Le prix est récupéré auprès de Stripe avec la clé configurée : il doit exister,
être actif, récurrent, de type licensed (quantité fixe), sans montant libre et
avoir le `livemode` attendu. Aucun montant, devise ou intervalle n'est inventé.
Les prix mesurés à l'usage ne sont pas pris en charge par cette première version.

## Contrat HTTP

`POST /api/stripe/checkout`, en runtime Node.js, attend
`Authorization: Bearer <jeton ID Firebase>` et un corps vide ou `{}`.
Le serveur vérifie le jeton avec Firebase Admin, révocation incluse. Aucun UID,
prix, client Stripe, URL de retour ni environnement n'est accepté dans la requête.
Un en-tête Origin présent doit correspondre à `APP_URL`. Sans cookie de session,
un jeton Bearer vérifié reste obligatoire, même sans Origin.

Succès : `{ "url": "https://checkout.stripe.com/..." }`, avec `Cache-Control: no-store`.
Pas de clé, de jeton, d'UID ni de document Firestore renvoyé.
Erreurs génériques : 400 paramètres inattendus, 401 authentification, 403 origine,
409 conflit/reprise nécessitant attention, 503 configuration ou service indisponible.
Les erreurs SDK ne sont ni journalisées ni renvoyées au navigateur.

Les URL de retour sont `APP_URL/?checkout=success` et `APP_URL/?checkout=canceled`.
Ces paramètres n'accordent aucun accès. Aucune interface ni aucun bouton n'est ajouté.

## Persistance et reprises

Les collections restent sous `stripeEnvironments/{test|live}` :

- `checkoutOrders/{orderId}` : structure existante, commande associée à l'UID avant
  tout appel de création Stripe, puis références client/session ; aucune preuve
  de paiement n'est fabriquée.
- `stripeCustomers/{customerId}` : association existante vers l'UID, sans recherche
  ni rattachement par e-mail.
- Nouvelle `checkoutAccounts/{uid}` : client, identifiant d'opération de création
  client, commande courante et configuration figée (prix et origine de retour).

Une transaction réserve une seule commande en cours par UID et environnement.
Lors de la première réservation, une association client existante est réutilisée ;
plusieurs clients associés au même UID provoquent un conflit à réconcilier.
La création du client utilise une clé d'idempotence fondée sur l'opération persistée.
La session utilise une clé fondée sur l'identifiant de commande. Les paramètres
restent identiques lors des reprises, y compris l'expiration absolue de deux heures.
La session et l'abonnement portent les métadonnées UID, commande et environnement ;
`client_reference_id` contient la commande créée par le serveur.

L'association client/UID et la commande sont mises à jour atomiquement avant la
création de session. La session est persistée avant de renvoyer son URL. Une
réponse perdue ou un échec Firestore se reprend avec les mêmes clés Stripe.
Les sessions déjà enregistrées sont récupérées auprès de Stripe et vérifiées
(client, commande, métadonnées, mode, environnement, prix, quantité, état et URL).
Une session complète n'est pas remplacée par un nouveau checkout.

Stripe peut purger les clés après 24 heures. Pour éviter une création en double,
une création client encore inconnue après 20 heures est bloquée. Une création
de session inconnue est bloquée dès qu'il reste moins de 31 minutes avant son
expiration. Il faut alors réconcilier côté serveur les objets Stripe et Firestore,
sans supprimer aveuglément les réservations ni changer leurs clés.
Une nouvelle commande n'est autorisée qu'après expiration confirmée par Stripe
de la session connue ; une requête suivante reprend avec le même client.
Changer le prix ou l'origine pendant une commande en cours provoque un conflit.

Les transactions ne contiennent aucun appel Stripe. Elles n'écrivent jamais dans
`entitlements`, `subscriptions` ou `users`. Le store générique continue d'interdire
l'activation d'un droit actif. Le webhook de synchronisation reste à développer :
un checkout complété n'active donc aucun droit dans cette étape.

## Validation

Tests exclusivement avec mocks : route HTTP, contrôles Stripe, reprises après
échec de persistance et de réponse, transactions simulées, accès concurrents,
propriété des clients, séparation test/live et absence d'activation des droits.
Le build n'appelle pas Stripe ou Firestore : les clients sont initialisés à l'appel.

Avant une utilisation réelle : confirmer le prix récurrent autorisé dans Stripe,
les variables du déploiement, IAM et les règles Firestore publiées. La première
création réelle de checkout, même en mode test Stripe, devra être une validation
distincte autorisée ; aucun appel métier réel n'a été effectué ici.

Références :
- https://docs.stripe.com/api/idempotent_requests
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/api/prices/retrieve
