# Firebase Admin côté serveur

Le module `app/lib/firebaseAdmin.ts` est réservé aux modules serveur Next.js
(`server-only`) et au runtime Node.js, pas Edge. Il n'est pas encore branché
aux pages ou au webhook. Il ne crée aucun compte et n'initialise pas Firestore.

## Configuration Vercel

Dans les variables d'environnement du projet Vercel, renseigner :

| Variable | Valeur issue du compte de service Firebase |
| --- | --- |
| `FIREBASE_ADMIN_PROJECT_ID` | `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `private_key`, PEM complet avec début et fin |

Utiliser le même projet Firebase que l'authentification navigateur. Ne jamais
préfixer ces variables par `NEXT_PUBLIC_`. Stocker la clé privée comme secret
Vercel, sans guillemets englobants. Les vrais sauts de ligne et les séquences
littérales `\n` sont acceptés. Ne pas placer le JSON du compte de service dans
le dépôt. En local, utiliser `.env.local`, déjà ignoré par Git.

Configurer les environnements Vercel concernés explicitement, avec un projet
Firebase séparé pour les tests/Preview si possible, puis redéployer. Aucune
variable réelle ni aucun compte de service n'a été créé par cette modification.
Les identifiants ne sont lus qu'au premier appel, pas lors de l'import/build.
Après un changement de configuration, redémarrer le serveur.

Le compte de service doit avoir les permissions nécessaires à Firebase Auth,
notamment la lecture des utilisateurs pour vérifier révocation et désactivation.
Ne pas lui attribuer Owner/Editor par défaut. Aucun rôle Firestore n'est requis
par ce module. `FIREBASE_AUTH_EMULATOR_HOST` est refusé pour éviter une
vérification accidentelle de jetons non signés via l'émulateur.

## Utilisation future

```ts
import { verifyFirebaseIdToken } from "@/app/lib/firebaseAdmin";

const uid = await verifyFirebaseIdToken(idToken);
```

Transmettre le jeton ID brut obtenu par Firebase Authentication, sans le préfixe
`Bearer`. Le SDK vérifie le jeton pour le projet configuré ; la vérification de
révocation et de compte désactivé est activée. Elle implique un appel Firebase
supplémentaire. La fonction renvoie uniquement l'UID authentifié, sans accorder
de droit d'abonnement et sans attester à elle seule une adresse e-mail vérifiée.

Les jetons refusés produisent `FirebaseIdTokenError`, sans contenu du jeton ni
détail sensible. Les erreurs de configuration restent distinctes. Un échec du
service de vérification refuse aussi l'accès. Les futurs endpoints devront
gérer ces erreurs sans exposer les détails serveur ni journaliser les jetons.

L'application Admin nommée est réutilisée via le registre du SDK, y compris
après rechargement des modules en développement. Les tests utilisent des mocks :
ils n'appellent pas Firebase et ne valident pas les permissions réelles Vercel.

Références :
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
