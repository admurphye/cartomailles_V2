# Préparation Firestore serveur

Cette couche n'est appelée par aucune page, route ou webhook. Aucun document
réel n'est créé. Aucun accès payant n'est accordé. Les tests utilisent des mocks.

## Configuration

Les trois variables `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`
et `FIREBASE_ADMIN_PRIVATE_KEY` existantes suffisent. Aucune variable supplémentaire,
clé navigateur, URL de base ou variable de région n'est nécessaire : le SDK Admin
utilise la base `(default)` du projet configuré. Le client est réutilisé par le SDK.

Le compte de service devra disposer des permissions de lecture/écriture de données
Firestore, par exemple le rôle IAM `roles/datastore.user`, en plus des permissions
Firebase Auth existantes. Rien n'a été changé dans IAM ou dans la console Firebase.

## Schéma et environnements

Les six collections sont placées sous
`stripeEnvironments/{test|live}/{collection}/{documentId}`. Le choix est explicite,
sans défaut. Même les profils `users` sont séparés pour qu'un test ne modifie jamais
le profil commercial. Le même UID Firebase peut apparaître dans les deux espaces :
aucun compte Authentication supplémentaire n'est créé.

| Collection | Identifiant | Rôle |
| --- | --- | --- |
| users | UID Firebase | Profil et activation du compte, sans droit payant |
| stripeCustomers | Identifiant client Stripe | Liaison vers un UID, éventuellement en attente |
| subscriptions | Identifiant abonnement Stripe | Statut, prix, période courante, échéance payée, résiliation |
| entitlements | UID Firebase | Droit Cartomailles, abonnement source, début et fin de validité |
| stripeEvents | Identifiant événement Stripe | État du traitement, tentatives et dates |
| checkoutOrders | Identifiant de commande serveur | Session, paiement et rattachement au compte |

Toutes les dates sont des `Timestamp` Firestore, jamais des chaînes locales.
`currentPeriodEnd` décrit la période Stripe ; `paidThrough` représente la période
confirmée payée et ne doit pas être déduit du seul statut `active`. Les futurs
contrôles utiliseront une borne de fin exclusive (`maintenant < validUntil`).
Les états Stripe ne donnent aucun droit automatiquement. Cette étape refuse
explicitement toute création ou mise à jour d'un entitlement `active`.

Chaque document porte `environment`, `createdAt` et `updatedAt` générés par le
serveur ; ces champs ne peuvent pas être fournis dans les données d'écriture.
Une lecture vérifie le schéma, les dates, l'identité et l'environnement stockés.

## Fonctions disponibles

`getFirebaseAdminFirestore()` retourne le client Admin pour `(default)`.
`createServerFirestoreStore("test" | "live")` construit un accès paresseux :

- `read(collection, id)` retourne un document validé ou `null` s'il est absent.
- `create(collection, id, data)` crée sans écraser un document existant.
- `replace(collection, id, data, expectedUpdatedAt)` remplace dans une transaction
  après vérification de la date lue ; refuse un document absent, une mise à jour
  concurrente et le changement d'un UID déjà associé. La création est conservée.

Ces fonctions sont réservées au code serveur de confiance, protégé par `server-only`.
Elles ne constituent pas une API utilisateur : les futurs endpoints devront vérifier
le jeton Firebase, dériver l'UID côté serveur, vérifier la propriété et sélectionner
l'environnement depuis la configuration serveur ou l'événement Stripe signé.
Ne jamais accepter ces paramètres tels quels depuis un navigateur. L'accès bas
niveau Admin est privilégié et ne doit pas servir à contourner cette discipline.

Les erreurs ne sont ni journalisées ni masquées en succès. Le code appelant devra
les gérer sans renvoyer les détails SDK au navigateur. Ne stocker aucun mot de
passe, jeton, clé ou payload Stripe complet ; `errorCode` doit rester un code
technique non sensible. Les mises à jour utilisent des documents complets validés,
sans champs arbitraires ni opérations Firestore injectées.

## Règles et limites de cette étape

`firestore.rules` interdit toutes les lectures/écritures directes des SDK clients,
y compris pour les utilisateurs connectés. Ce fichier est préparé localement,
pas déployé : vérifier/publier ces règles avant une future ouverture au navigateur.
Le mode production actuel est annoncé par l'utilisateur ; ses règles distantes
n'ont pas été inspectées. Le SDK Admin passe par IAM et contourne les règles.

La création par ID protège contre l'écrasement d'un événement déjà enregistré,
mais ne constitue pas encore un traitement idempotent complet des webhooks.
Les transactions entre abonnement et droits, les reprises, la réconciliation Stripe,
la preuve du paiement et l'activation des droits seront des étapes séparées.
Aucun flux d'activation ou route publique n'est ajouté ici.

Référence : https://firebase.google.com/docs/firestore/security/rules-conditions
