# Cartomailles

## Présentation
- Objectifs du projet
- Fonctionnalités

---

# Architecture

## page.tsx
- Interface principale
- Gestion des panneaux
- Zoom
- Exports PNG / SVG / PDF
- Diagrammes plats et circulaires

## Parser

### parser.ts
- Analyse du texte
- Découpage des rangs
- Détection du cercle magique
- Construction des Instructions

### 📖 Grammaire du parser

#### Mailles

| Patron | Type |
|--------|------|
| ms | sc |
| db | hdc |
| b | dc |
| tb | tr |
| ml | ch |
| mc | slst |

#### Augmentations

Syntaxe officielle

aug(ms)

aug(db)

aug(b)

aug(tb)

Syntaxes acceptées

- aug
- augmentation
- inc
- increase

Représentation interne

consumes = 1

produces = 2

#### Diminutions

dim(ms)

dim(db)

dim(b)

dim(tb)

consumes = 2

produces = 1

#### Répétitions

- ( ... ) x6
- [ ... ] x6
- * ... * x6

#### Rangs

- R1
- Tour 1
- Round 1

ou un retour à la ligne.

---

# Moteur

## buildPattern

Transforme les Instructions en rangs.

## buildStitches

Construit les mailles.

## linkRound

Construit les liens entre les mailles.

## Layout

Positionnement des mailles.

- circulaire
- plat

---

# Renderer

## drawSymbol.tsx

Dessine les symboles SVG.

## findSymbol.ts

Associe un type de maille à son symbole.

## crochetSymbols.ts

Bibliothèque des symboles.

---

# Conventions

Le parser est tolérant.

Le moteur est strict.

Le renderer dessine le résultat du crochet.

---

# Roadmap

## Parser

- [x] MR
- [x] Augmentation simple
- [x] Diminution simple
- [ ] Répétitions
- [ ] aug(ms)
- [ ] dim(ms)

## Diagrammes

- [x] Plat
- [x] Circulaire
- [ ] Déplacement des mailles
- [ ] Zoom intelligent
- [ ] Accrochage des mailles

## Export

- [x] PNG
- [ ] SVG
- [ ] 

# Décisions d'architecture

## Pourquoi une augmentation n'est pas une maille ?

Une augmentation est une opération.

Elle produit deux mailles.

Le moteur conserve l'information grâce à `operation`.

Le renderer affiche les mailles produites (MS, bride, demi-bride...) et non un symbole d'augmentation.

Cela permet de représenter correctement toutes les variantes :

- augmentation de MS
- augmentation de bride
- augmentation de demi-bride
- augmentation de triple bride