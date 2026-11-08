# Contrôle serveur des droits Cartomailles

`app/lib/billing/access.ts` expose `checkCartomaillesAccess(idToken)`.
Le paramètre est le jeton ID Firebase brut, sans préfixe Bearer. L'UID vient
uniquement de Firebase Admin, avec vérification de révocation et de désactivation.
Le module est réservé au serveur et n'est branché à aucune route ni interface.
Il ne crée aucun compte et n'effectue aucune écriture.

## Configuration serveur

- `STRIPE_ENVIRONMENT` : exactement `test` ou `live`, sans valeur par défaut.
  Cette variable est distincte de `VERCEL_ENV`. La configurer explicitement
  avant de brancher le contrôle ; ne pas la déduire d'une requête navigateur.
- `FIREBASE_ADMIN_PROJECT_ID` et `NEXT_PUBLIC_FIREBASE_PROJECT_ID` : requis et
  identiques après suppression des espaces périphériques. L'application Admin
  déjà initialisée doit aussi utiliser ce projet.
- Les identifiants Admin existants restent nécessaires. Aucun secret n'est ajouté.
- `FIRESTORE_EMULATOR_HOST` est refusé si `NODE_ENV` ou `VERCEL_ENV` vaut
  `production`, y compris avec une application Admin déjà initialisée.

La configuration est vérifiée à l'appel, sans initialisation lors de l'import.
Aucune configuration Vercel ni variable .env n'a été modifiée par cette étape.

## Décision

Lecture unique du document
`stripeEnvironments/{STRIPE_ENVIRONMENT}/entitlements/{uid}` via le store serveur.
Celui-ci valide le schéma, les métadonnées, l'environnement et l'identité du
document. Le contrôle vérifie aussi produit, UID et environnement, puis exige
le statut `active`, une référence d'abonnement et une période non vide.
L'horloge serveur est consultée après la lecture :
`validFrom <= maintenant < validUntil`.

- `authorized: true` : UID vérifié et échéance du droit.
- `authorized: false, kind: unauthenticated` : jeton invalide, expiré ou révoqué,
  compte désactivé ou introuvable.
- `authorized: false, kind: denied` : droit absent, inactif, hors période ou
  incohérent lors des contrôles supplémentaires.
- `authorized: false, kind: unavailable` : configuration, service
  d'authentification, lecture Firestore ou validation du document stocké en échec.
  Un document corrompu rejeté par le store n'est jamais assimilé à un droit absent.

Aucune erreur SDK, aucun jeton et aucun secret n'est renvoyé ni journalisé.
Une panne de vérification Firebase est distincte d'un jeton invalide.
Cette décision n'est valable qu'au moment du contrôle : le futur appelant devra
revérifier les droits et ne pas conserver indéfiniment un résultat positif.

## Limites et validations ultérieures

Ce module consomme les droits Firestore de confiance ; il ne prouve pas lui-même
le paiement Stripe et ne modifie pas le verrou qui interdit encore d'activer un
droit dans le store. La synchronisation des paiements reste une étape séparée.
PasswordGate et l'accès actuel au logiciel restent inchangés.

Les tests utilisent des mocks, sans réseau Firebase ni écriture réelle. Avant
branchement : vérifier la configuration déployée, les permissions IAM de lecture,
les règles Firestore réellement publiées et la séparation des environnements.
Le test d'une lecture réelle devra faire l'objet d'une étape autorisée distincte.
