"use client";

import { useState } from "react";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const pages = {
    welcome: {
title: "📖 Bienvenue",
content: (
<>
<p className="whitespace-pre-line">
{`
Bienvenue dans Cartomailles !

Cartomailles est un logiciel conçu pour transformer automatiquement un patron de 
crochet écrit en diagramme graphique.

Son objectif est de simplifier la création de diagrammes 
tout en respectant les conventions du crochet.

Cette version est actuellement en bêta. 
Certaines fonctionnalités sont encore en cours d'amélioration. 
Vos retours, suggestions et signalements de bugs sont précieux 
et contribuent directement à l'évolution du logiciel.

Merci de contribuer à son amélioration.
`}
</p>
</>
)
},

start: {
title: "🚀 Premiers pas",
content: (
<>
<ol className="list-decimal ml-5 space-y-2">

<li>Créez un nouveau projet en lui donnant un nom (facultatif mais recommandé).</li>

<li>Choisissez le type de diagramme :
   Plat ou Circulaire</li>

<li>Cliquez sur « Créer le diagramme ».</li>

<li>Exportez votre diagramme.</li>

<p>Le logiciel analyse automatiquement votre patron, calcule le nombre de mailles de chaque rang et génère le diagramme correspondant.
Vous pouvez ensuite enregistrer votre projet ou exporter votre diagramme.</p>
</ol>
</>
)
},

pattern: {
title: "✍️ Écrire un patron",
content: (
<>
<pre className="bg-[#1b1722] p-4 rounded">

{`Cartomailles reconnaît une écriture simple et naturelle des patrons de crochet.

Chaque ligne représente :

• un rang pour un diagramme plat ;
• un tour pour un diagramme circulaire.

Les répétitions sont indiquées avec la lettre « x » suivie du nombre de répétitions.

Exemples :

6 ms

6 aug

2 ms 1 aug x6

3 ms 1 dim x6

Conseils :

• Respectez les espaces entre les différents éléments.
• Une ligne = un rang ou un tour.
• Évitez les caractères inutiles.
• Vérifiez l'orthographe des abréviations.`}

</pre>
</>
)
},

symbols: {
  title: "🧶 Symboles",
  content: (
    <p className="whitespace-pre-line">
{`Cartomailles reconnaît actuellement les symboles suivants :

ml   → Maille en l'air
mc   → Maille coulée
ms   → Maille serrée
db   → Demi-bride
br   → Bride
dbr  → Double bride
tbr  → Triple bride

aug  → Augmentation
dim  → Diminution

2BE  → Deux brides ensemble
3BE  → Trois brides ensemble

De nouveaux symboles seront régulièrement ajoutés lors des prochaines mises à jour.`}
    </p>
  )
},

flat: {
title: "📐 Diagramme plat",
content: (
  <p className="whitespace-pre-line">
{`Le diagramme plat représente un ouvrage travaillé en rangs.

Chaque ligne du patron correspond à un rang.

Les rangs sont affichés du bas vers le haut, conformément aux conventions des diagrammes de crochet.

Cartomailles calcule automatiquement :

• les mailles ;
• les augmentations ;
• les diminutions ;
• les liaisons entre les rangs.

Le placement des symboles est continuellement amélioré afin d'obtenir un diagramme clair et fidèle au patron.`}
  </p>
)
},

circle: {
title: "🔵 Diagramme circulaire",
content: (
  <p className="whitespace-pre-line">
{`Le diagramme circulaire représente les ouvrages travaillés en tours.

Le premier tour est placé au centre puis chaque tour est ajouté autour du précédent.

Le logiciel répartit automatiquement les mailles, les augmentations et les diminutions afin d'obtenir une représentation équilibrée.

Les tours sont numérotés automatiquement.`}
  </p>
)
},

save: {
title: "💾 Sauvegarder",
content: (
  <p className="whitespace-pre-line">
{`Le bouton « Sauvegarder » permet d'enregistrer votre projet Cartomailles.

Le fichier obtenu pourra être rouvert ultérieurement afin de poursuivre votre travail sans perdre vos modifications.`}
  </p>
)
},

export: {
title: "📤 Export",
content: (
  <p className="whitespace-pre-line">
{`Cartomailles permet d'exporter vos diagrammes dans plusieurs formats.

PNG
Image haute qualité adaptée au web et aux réseaux sociaux.

SVG
Format vectoriel idéal pour l'impression et les modifications graphiques.

PDF
Document prêt à être imprimé ou partagé.`}
  </p>
)
},

bug: {
  title: "🐞 Signaler un bug",
  content: (
    <div className="space-y-4">

      <p className="whitespace-pre-line">
{`Vous avez rencontré un problème ?

Merci de remplir le formulaire de signalement en décrivant le bug le plus précisément possible.

Pensez à indiquer :
• le patron utilisé ;
• le résultat obtenu ;
• le résultat attendu ;
• une capture d'écran si possible.`}
      </p>

      <button
        onClick={() =>
          window.open(
            "https://docs.google.com/forms/d/e/1FAIpQLSckIAs1BYBPK15mz8ySauiN4DthzQnslDz7FdL7NmE-zZu4IQ/viewform?usp=header",
            "_blank"
          )
        }
        className="bg-pink-700 hover:bg-pink-600 text-white px-5 py-3 rounded-lg font-semibold transition"
      >
        🐞 Ouvrir le formulaire
      </button>

    </div>
  )
},

about: {
title: "❤️ À propos",
content: (
  <p className="whitespace-pre-line">
{`Cartomailles est un logiciel imaginé et développé par Aurore

Il est né de la volonté de proposer un outil moderne, simple et accessible permettant de créer facilement des diagrammes de crochet à partir de patrons écrits.

Le développement de Cartomailles se poursuit grâce aux retours de sa communauté de bêta-testeurs.

Merci de participer à cette aventure !`}
  </p>
)
}

};

export default function HelpModal({

isOpen,
onClose,

}: HelpModalProps) {

const [page, setPage] = useState<keyof typeof pages>("welcome");

if(!isOpen) return null;

return(

<div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">

<div className="bg-[#241d2d] rounded-xl w-[1000px] h-[700px] flex">

<div className="w-64 border-r border-[#5d445e] p-4">

  <div className="flex flex-col gap-2">

    {Object.entries(pages).map(([key, value]) => (

      <button
        key={key}
        onClick={() => setPage(key as keyof typeof pages)}

        className={`w-full text-left rounded-lg px-3 py-2 transition
${
  page === key
    ? "bg-[#3a2c48] text-pink-300"
    : "hover:bg-[#2d2436]"
}`}
      >
        {value.title}
      </button>

    ))}

  </div>

</div>

<div className="flex-1 p-8 overflow-y-auto">

<div className="flex justify-between">

<h2 className="text-2xl font-bold">

{pages[page].title}

</h2>

<button

onClick={onClose}

>

✕

</button>

</div>

<div className="mt-6">

{pages[page].content}

</div>

</div>

</div>

</div>

);
}