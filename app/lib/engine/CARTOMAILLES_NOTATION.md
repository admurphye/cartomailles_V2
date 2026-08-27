# Contrat de notation Cartomailles

Ce document fige l'entrée textuelle actuellement acceptée par le moteur V2.
La notation décrite ici est l'entrée du moteur de diagramme : elle n'est pas le
format du futur texte extrait d'un PDF ou d'un OCR.

## Structure d'un patron

- Un rang explicite commence par `R` suivi de son numéro : `R1`, `R2`, etc.
- Un retour à la ligne ouvre implicitement le rang suivant.
- `Rang N :` est toléré comme alias de `RN`.
- Les instructions d'un rang peuvent être séparées par des espaces ou des
  virgules.
- La casse est ignorée.
- Un point final est ignoré.
- Une quantité précède normalement l'instruction : `6 ms`. Sans quantité, la
  quantité vaut `1` : `mr`, `popcorn`.

Il est recommandé au code producteur d'émettre systématiquement des marqueurs
`RN`, des quantités explicites et des virgules entre les instructions.

## Mailles

| Notation canonique | Type interne | Compatibilités actuellement acceptées |
| --- | --- | --- |
| `mr` | cercle magique | `cm`, `cercle magique`, `anneau magique` |
| `ml` | maille en l'air | `ch` |
| `mc` | maille coulée | `slst` |
| `ms` | maille serrée | `sc` |
| `db` | demi-bride | `hdc` |
| `br` | bride | `b`, `dc` |
| `brAV` | bride relief avant | `brav`, `br_av`, `fpdc`, `br rav` |
| `brAR` | bride relief arrière | `brar`, `br_ar`, `bpdc`, `br rar` |
| `tb` | triple bride | `tbr`, `tr` |
| `dbr` | double bride | `dtr` |
| `popcorn` | point popcorn | `pop`, `pop corn` |

Une suite de `ml` seule dans le premier rang est une chaînette de fondation.
Une suite de `ml` au début d'un rang ultérieur est une chaînette de début de
rang. Une suite de `ml` entre deux autres instructions est un arceau.

## Augmentations et diminutions

- `aug(ms)` produit deux mailles serrées dans un même parent.
- `dim(ms)` produit une maille à partir de deux parents.
- L'argument peut être `ms`, `db`, `br`, `brAV`, `brAR`, `tb` ou `dbr`.
- Les noms `augmentation`, `inc`, `increase`, `diminution`, `dec` et
  `decrease` sont tolérés à la place de `aug` et `dim`.
- La forme sans parenthèses est tolérée : `aug ms`, `dim br`.
- Une quantité répète l'opération : `6 aug(ms)`.

Les formes rédactionnelles `2 brides dans la même maille` et
`2 brides ensemble` sont actuellement normalisées en augmentation de brides.
Les mêmes formulations existent pour les mailles serrées, demi-brides,
doubles brides et triples brides lorsqu'elles indiquent explicitement la même
maille.

Les formes `3 demi-brides ensemble`, `3 doubles brides ensemble` et
`3 triples brides ensemble` représentent actuellement une diminution à trois
parents. Les raccourcis correspondants sont `3dbe`, `3dbre` et `3tbr`.

## Même parent, éventails et groupes particuliers

- `<maille>_same_parent` place une maille sur le même parent que l'instruction
  précédente, par exemple `br_same_parent`.
- `same_N_<maille>` produit `N` mailles dans un parent, par exemple
  `same_3_br`.
- `fan_5_dc`, `fan_6_dc` et `fan_9_dc` produisent respectivement 5, 6 ou 9
  brides dans un parent.
- `cluster5_fpdc` produit une bride relief avant à partir de cinq parents.

Les alias rédactionnels d'éventail actuellement tolérés incluent `5BE`,
`éventail(5 br)`, `eventail 5 br`, `coquillage(5 br)` et les formulations
`5 brides dans la même maille` ou `5 brides ensemble` (également pour 6 et 9).

## Mailles sautées

La notation canonique est `N skip`, par exemple `1 skip` ou `3 skip`.
Elle consomme `N` parents sans créer de maille ni de groupe visible.

Les formulations `sauter une maille`, `sautez 2 mailles` et
`3 mailles sautées` sont actuellement tolérées.

## Répétitions

La notation canonique est :

```text
(1 ms, 1 aug(ms)) x6
```

Le groupe parenthésé est développé avant la tokenisation. Les parenthèses
imbriquées sont repérées, mais seul un suffixe `xN` placé après le groupe
déclenche sa répétition. Les crochets ne font pas partie de la notation
canonique ; seules les formes rédactionnelles limitées `[... ] deux fois` et
`[... ] trois fois` sont actuellement normalisées.

## Erreurs

Une instruction inconnue produit une entrée dans `CrochetGraph.issues`. Les
instructions valides qui l'entourent restent générées. Une ligne ne contenant
aucune instruction valide ne crée pas de rang dans `CrochetGraph.rounds`.

## Contrat pour le futur traducteur de patron écrit

Pour le texte :

```text
Rang 2 : 3 ml, 2 brides dans la même maille, 1 ml, sauter 1 maille. Répéter 5 fois.
```

l'interprétation retenue sépare la chaînette de début du groupe répété. La
notation Cartomailles cible est :

```text
R2 3 ml, (1 aug(br), 1 ml, 1 skip) x5
```

Cette notation signifie : trois mailles en l'air de début de rang, puis cinq
répétitions de deux brides dans un même parent, un arceau d'une maille en l'air
et une maille sautée.
