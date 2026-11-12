# Création de compte et accès à Cartomailles

PasswordGate propose connexion, création de compte e-mail/mot de passe et
réinitialisation du mot de passe via Firebase Authentication. Aucun document
Firestore, client Stripe ou droit n'est créé par l'inscription. Firebase connecte
le nouveau compte ; l'éditeur attend ensuite la vérification serveur des droits.
Le minimum de six caractères du formulaire ne remplace pas la politique de mot
de passe Firebase, dont les refus sont présentés sans message SDK brut.

## Consultation des droits

`GET /api/billing/access` reçoit uniquement un jeton Firebase ID dans
`Authorization: Bearer …`. Il refuse les paramètres d'URL et une origine étrangère,
n'active aucun CORS et ne reçoit aucun UID, prix ou environnement du navigateur.
`checkCartomaillesAccess` vérifie le jeton avec Firebase Admin (révocation incluse),
détermine l'UID et lit uniquement ses droits dans l'environnement serveur configuré.
Les règles Firestore clientes restent fermées. Ni clé Admin ni jeton n'est logué.

- 200 : `authorized: true`, date d'expiration en millisecondes UTC ; aucun UID,
  abonnement, client Stripe ou motif privé n'est retourné.
- 401 : authentification absente ou invalide.
  L'interface demande une déconnexion puis une reconnexion lorsque le serveur
  refuse la session expirée ou révoquée ; elle ne présente pas ce refus comme
  une absence d'abonnement.
- 403 `subscription_required` : droit absent, inactif, invalide ou expiré.
- 503 : panne technique/configuration ; ne signifie pas absence d'abonnement.
- Réponses `private, no-store`, avec `Vary: Authorization`.

Le navigateur ne monte l'éditeur qu'après une réponse positive avec une échéance
future valide. Chargement initial, panne technique et absence d'abonnement sont
distincts. En cas de panne, l'accès reste fermé et un bouton permet de réessayer.
Le bouton « S'abonner » est actif uniquement après un refus serveur pour absence
de droit valide. Il transmet le jeton Firebase à `POST /api/stripe/checkout`,
sans UID ni paramètre de paiement. La préparation bloque les doubles clics,
expire après trente secondes et affiche les erreurs sans détails techniques.
La redirection exige l'origine exacte `https://checkout.stripe.com`, sans
identifiants dans l'URL. Un retour `?checkout=success` n'est jamais une preuve
de paiement : les droits sont relus au montage, au focus et à `pageshow`, y
compris lors d'une restauration depuis le cache de navigation.

La vérification est renouvelée toutes les cinq minutes et au focus de la fenêtre.
Une minuterie ferme l'éditeur à l'expiration connue même si une nouvelle requête
est lente. Chaque requête a un délai de dix secondes, y compris l'attente du jeton.
Les réponses d'un ancien utilisateur ou d'un composant démonté sont ignorées.
L'éditeur reste monté pendant une vérification en arrière-plan encore couverte
par un droit valide ; un refus ou une erreur le ferme. Une fermeture peut perdre
les changements non sauvegardés : le comportement de sauvegarde existant n'est
pas modifié ici. Les minuteurs du navigateur peuvent être retardés en arrière-plan.

## Audit des protections et limites à terminer

| Surface existante | Protection / action restante |
| --- | --- |
| `/api/billing/access` | Jeton Firebase vérifié ; lecture des seuls droits de l'UID authentifié |
| `/api/stripe/checkout` | Jeton vérifié, UID serveur, origine et paramètres contrôlés ; accessible sans abonnement ; configuration et objets Stripe exclusivement test |
| `/api/stripe/webhook` | Signature obligatoire, compte direct et mode test ; droits issus des preuves Stripe relues, jamais de la redirection |
| `/api/cron/review-notifications` | Secret serveur CRON_SECRET, refus preview, aucun droit d'administration accordé par un compte client |
| Firestore navigateur | Toutes les lectures/écritures refusées par les règles actuelles ; Admin reste protégé par IAM |
| Éditeur, génération, import/export | Exécution dans le navigateur ; aucune route de fonctionnalité payante identifiée dans le dépôt |

Le contrôle React est un contrôle du parcours et ne constitue pas une protection
du code JavaScript distribué au navigateur : un client modifié peut le contourner.
Il ne faut pas présenter cette étape comme une protection complète contre la copie
ou l'usage hors abonnement. Toute future route payante de sauvegarde, génération,
export ou stockage doit vérifier `checkCartomaillesAccess` à chaque requête, puis
la propriété de la ressource. Les droits doivent être vérifiés côté serveur au
moment d'une opération sensible, indépendamment des cinq minutes de rafraîchissement.
Une révocation peut rester visible côté interface jusqu'à la prochaine vérification.
La page `/beta` reste une page de présentation publique, sans montage de l'éditeur.

Le service Checkout refuse toute configuration autre que `test` et toute clé
autre qu'une clé secrète test avant un appel Stripe ou une écriture Firestore.
Le webhook impose également le mode test. Aucun mode ni secret distant n'a été
modifié ici. Un clic réel sur le bouton utiliserait les services configurés et
écrirait les associations de session Firestore ; les validations locales utilisent
uniquement des simulations et ne déclenchent pas ce parcours réel.

## Validation avant essai réel, non effectuée ici

1. Confirmer Email/Password et la politique de mot de passe dans Firebase Auth,
   les domaines autorisés, et la configuration existante du projet ; aucune
   variable ni configuration distante n'est changée pendant cette préparation.
2. Conserver `STRIPE_ENVIRONMENT=test`. Le mode test Stripe n'isole pas Firebase :
   utiliser un projet Firebase de test séparé ou un environnement d'émulation
   explicitement préparé avant tout essai réel.
3. Tester l'inscription, la connexion et l'absence d'accès sans droit. Les tests
   locaux de cette étape simulent Auth, HTTP et Firestore, sans créer de compte réel.
4. Avec droits simulés, vérifier accès valide, échéance, suspension, session
   révoquée, panne Firestore, changement d'utilisateur et réponses tardives.
5. Le test du parcours Stripe complet reste à effectuer dans un environnement
   de test isolé. Aucun paiement, e-mail, écriture Firestore,
   modification Vercel, cron, commit ou push n'est réalisé ici.

Références :
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
