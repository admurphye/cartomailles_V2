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

website: {
title: "🌐 Cartomailles.com",
content: (
<div className="space-y-4">

<p className="whitespace-pre-line">
{`Retrouvez toutes les informations concernant Cartomailles sur le site officiel.

Vous y trouverez :

• les dernières actualités
• les nouvelles versions
• les téléchargements
• les tutoriels
• les annonces importantes

Le site sera régulièrement enrichi au fil du développement du logiciel.`}
</p>

<button
onClick={() => window.open("https://www.cartomailles.com","_blank")}
className="w-full bg-pink-700 hover:bg-pink-600 rounded-lg py-3 font-semibold transition"
>
🌐 Ouvrir le site officiel
</button>

</div>
)
},

community: {
title: "👥 Rejoindre la communauté",
content: (
<div className="space-y-4">

<p className="whitespace-pre-line">
{`La communauté Cartomailles est le meilleur endroit pour :

• partager vos créations
• poser vos questions
• découvrir les nouveautés
• échanger avec d'autres passionnés de crochet

Nous serons heureux de vous accueillir !`}
</p>

<button
onClick={() => window.open("https://facebook.com/share/15xfjJpp5xC/","_blank")}
className="w-full bg-blue-700 hover:bg-blue-600 rounded-lg py-3 font-semibold transition"
>
👥 Rejoindre Facebook
</button>

</div>
)
},

contact: {
title: "📧 Contact",
content: (
<div className="space-y-4">

<p className="whitespace-pre-line">
{`Une question ?

Une suggestion ?

Un problème ?

N'hésitez pas à nous contacter.

Nous répondrons dans les meilleurs délais.`}
</p>

<button
onClick={() => window.location.href="mailto:contact@cartomailles.com"}
className="w-full bg-purple-700 hover:bg-purple-600 rounded-lg py-3 font-semibold transition"
>
📧 contact@cartomailles.com
</button>

</div>
)
},


about: {
title: "ℹ️ À propos",
content: (
<div className="space-y-4">

<p className="whitespace-pre-line">
{`Cartomailles est un logiciel imaginé et développé par Aurore alias AD Murphye.

Son objectif est de proposer un outil moderne, intuitif et accessible permettant de créer facilement des diagrammes de crochet à partir de patrons écrits.

Le logiciel évolue continuellement grâce aux retours des bêta-testeurs.

Merci de faire partie de cette aventure !`}
</p>

<hr className="border-[#5d445e]" />

<p className="text-sm text-gray-400">

Cartomailles Bêta 0.9.0

<br />

© 2026 Aurore alias AD Murphye

<br />

Tous droits réservés.

</p>

</div>
)
},

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

        className={`w-full text-left rounded-lg px-3 py-2 transition text-[#FBF7F2]
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

<div
  className="flex-1 p-8 overflow-y-auto"
  style={{ color: "#FBF7F2" }}
>

<div className="flex justify-between">

<h2
  className="text-2xl font-bold"
  style={{ color: "#FBF7F2" }}
>

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