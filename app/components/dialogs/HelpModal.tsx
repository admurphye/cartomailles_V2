"use client";

import { useState } from "react";
import { useModalAccessibility } from "@/app/hooks/useModalAccessibility";

type HelpModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const pages = {
  welcome: {
    title: "📖 Bienvenue",
    content: (
      <div className="space-y-4">
        <p>
          Bienvenue dans <strong>Cartomailles</strong> !
        </p>

        <p>
          Cartomailles est un logiciel conçu pour transformer automatiquement
          un patron de crochet écrit en un diagramme graphique.
        </p>

        <p>
          Son objectif est de simplifier la création et la lecture des
          diagrammes tout en respectant les conventions du crochet.
        </p>

        <p>
          Cette version est actuellement en <strong>bêta</strong>. Certaines
          fonctionnalités sont encore en cours de développement ou
          d&apos;amélioration.
        </p>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4">
          🧶 Vos essais, suggestions et signalements de bugs contribuent
          directement à l&apos;évolution de Cartomailles. Merci de participer
          à son développement !
        </div>
      </div>
    ),
  },

  start: {
    title: "🚀 Premiers pas",
    content: (
      <div className="space-y-5">
        <p>
          Cartomailles transforme votre patron écrit en diagramme en quelques
          étapes.
        </p>

        <ol className="list-decimal ml-5 space-y-3">
          <li>
            <strong>Créez un nouveau projet</strong> à l&apos;aide du bouton
            correspondant dans la barre d&apos;outils.
          </li>

          <li>
            <strong>Choisissez le type de diagramme</strong> :
            {" "}
            <strong>Plat</strong>, <strong>Circulaire</strong> ou <strong>Granny</strong>.
          </li>

          <li>
            <strong>Écrivez ou collez votre patron</strong> dans la zone
            « Patron ».
          </li>

          <li>
            Cartomailles analyse les instructions et génère automatiquement
            le diagramme correspondant.
          </li>

          <li>
            Utilisez les outils du diagramme pour zoomer, vous déplacer ou
            recentrer votre travail.
          </li>

          <li>
            Cliquez sur une maille pour la sélectionner et consulter ses
            informations dans le panneau « Propriétés ».
          </li>

          <li>
            Enregistrez votre projet pour le reprendre ultérieurement ou
            exportez votre diagramme lorsqu&apos;il est terminé.
          </li>
        </ol>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
          💡 Pour les grands diagrammes, utilisez les barres de défilement
          horizontale et verticale afin de parcourir l&apos;ensemble de votre
          travail.
        </div>
      </div>
    ),
  },

  pattern: {
    title: "✍️ Écrire un patron",
    content: (
      <div className="space-y-6">
        <p>
          Cartomailles reconnaît une écriture <strong>simple et naturelle</strong>,
          proche de celle utilisée habituellement pour rédiger un patron de
          crochet.
        </p>

        <div>
          <h3 className="text-pink-300 font-bold text-lg mb-3">
            Une ligne = un rang ou un tour
          </h3>

          <ul className="list-disc ml-5 space-y-2">
            <li>
              Une ligne représente <strong>un rang</strong> pour un diagramme
              plat.
            </li>
            <li>
              Une ligne représente <strong>un tour</strong> pour un diagramme
              circulaire.
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-pink-300 font-bold text-lg mb-3">
            🧶 Exemples simples
          </h3>

          <pre className="bg-[#1b1722] p-4 rounded-lg font-mono">
{`6 ms
6 aug
12 ms`}
          </pre>
        </div>

        <div>
  <h3 className="text-pink-300 font-bold text-lg mb-3">
    🔁 Répétitions
  </h3>

  <p className="mb-3">
    Pour répéter une séquence de plusieurs instructions, placez-la entre
    <strong> parenthèses</strong>, puis ajoutez la lettre
    <strong> x</strong> suivie du nombre de répétitions.
  </p>

  <pre className="bg-[#1b1722] p-4 rounded-lg font-mono mb-3">
{`(1 ms, 1 aug ms) x6`}
  </pre>

  <p className="mb-4">
    Cet exemple signifie :
    {" "}
    <strong>1 maille serrée puis 1 augmentation en mailles serrées</strong>,
    le tout répété <strong>6 fois</strong>.
  </p>

  <pre className="bg-[#1b1722] p-4 rounded-lg font-mono mb-3">
{`(2 ms, 1 aug ms) x6`}
  </pre>

  <p className="mb-4">
    Cet exemple signifie :
    {" "}
    <strong>2 mailles serrées puis 1 augmentation en mailles serrées</strong>,
    le tout répété <strong>6 fois</strong>.
  </p>

  <pre className="bg-[#1b1722] p-4 rounded-lg font-mono mb-3">
{`(3 ms, 1 dim ms) x6`}
  </pre>

  <p>
    Cet exemple signifie :
    {" "}
    <strong>3 mailles serrées puis 1 diminution en mailles serrées</strong>,
    le tout répété <strong>6 fois</strong>.
  </p>

  <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm mt-5">
    💡 <strong>Important :</strong> les augmentations et diminutions doivent
    toujours préciser le type de maille concerné.
    <div className="mt-2 font-mono">
      aug ms → augmentation en mailles serrées
      <br />
      dim ms → diminution en mailles serrées
      <br />
      aug br → augmentation en brides
      <br />
      dim br → diminution en brides
    </div>
  </div>
</div>

        <div>
          <h3 className="text-pink-300 font-bold text-lg mb-3">
            💡 Conseils de saisie
          </h3>

          <ul className="list-disc ml-5 space-y-2">
            <li>Utilisez une ligne par rang ou par tour.</li>
            <li>Laissez des espaces entre les différentes instructions.</li>
            <li>Respectez les abréviations reconnues par Cartomailles.</li>
            <li>Évitez les caractères inutiles.</li>
            <li>
              En cas de résultat inattendu, vérifiez l&apos;orthographe des
              abréviations et la structure de la ligne.
            </li>
          </ul>
        </div>
      </div>
    ),
  },

  symbols: {
  title: "🧶 Symboles",
  content: (
    <div className="space-y-8">

      <div>
        <h3 className="text-pink-300 font-bold text-lg mb-3">
          🧵 Mailles de base
        </h3>

        <div className="space-y-2 font-mono">
          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              ml
            </span>
            Maille en l&apos;air
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              mc
            </span>
            Maille coulée
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              ms
            </span>
            Maille serrée
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-pink-300 font-bold text-lg mb-3">
          🪡 Brides
        </h3>

        <div className="space-y-2 font-mono">
          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              db
            </span>
            Demi-bride
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              br
            </span>
            Bride
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              dbr
            </span>
            Double bride
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              tbr
            </span>
            Triple bride
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-pink-300 font-bold text-lg mb-3">
          ➕ Augmentations
        </h3>

        <p className="mb-3">
          Une augmentation doit toujours être suivie du type de maille concerné.
        </p>

        <div className="space-y-2 font-mono">
          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              aug ms
            </span>
            Augmentation en mailles serrées
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              aug db
            </span>
            Augmentation en demi-brides
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              aug br
            </span>
            2 brides dans la même maille (symbole en V)
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              aug dbr
            </span>
            Augmentation en doubles brides
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              aug tbr
            </span>
            Augmentation en triples brides
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-pink-300 font-bold text-lg mb-3">
          ➖ Diminutions
        </h3>

        <p className="mb-3">
          Une diminution doit également préciser le type de maille concerné.
        </p>

        <div className="space-y-2 font-mono">
          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              dim ms
            </span>
            Diminution en mailles serrées
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              dim db
            </span>
            Diminution en demi-brides
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              dim br
            </span>
            Diminution en brides
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              dim dbr
            </span>
            Diminution en doubles brides
          </div>

          <div>
            <span className="font-bold text-pink-200 w-28 inline-block">
              dim tbr
            </span>
            Diminution en triples brides
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-pink-300 font-bold text-lg mb-3">
          ✨ Éléments spéciaux
        </h3>

        <div className="space-y-2 font-mono">
          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              CM / MR
            </span>
            Cercle magique (vous pouvez aussi écrire « cercle magique »)
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              2BE
            </span>
            Deux brides dans la même maille (équivaut à « aug br »)
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              3BE
            </span>
            Trois brides ensemble
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              brAV
            </span>
            Bride relief avant
          </div>

          <div>
            <span className="font-bold text-pink-200 w-20 inline-block">
              brAR
            </span>
            Bride relief arrière
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
        💡 <strong>Exemples :</strong>
        <div className="mt-2 font-mono">
          6 ms
          <br />
          6 aug ms
          <br />
          (1 ms, 1 aug ms) x6
          <br />
          (2 ms, 1 dim ms) x6
          <br />
          6 br
          <br />
          6 aug br
          <br />
          6 brAV — 6 brides relief avant
          <br />
          6 brAR — 6 brides relief arrière
        </div>
      </div>

      <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
        ⚠️ <strong>Important :</strong> les abréviations doivent être saisies
        exactement comme indiqué pour être reconnues par Cartomailles.
      </div>

      <p className="text-sm text-gray-400">
        De nouvelles mailles et constructions seront progressivement ajoutées
        au logiciel.
      </p>

    </div>
  ),
},

  tools: {
    title: "🖱️ Utiliser le diagramme",
    content: (
      <div className="space-y-6">
        <p>
          La barre d&apos;outils située au-dessus du diagramme permet de
          contrôler son affichage et de naviguer dans votre travail.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">🔍 Zoom</strong>
            <p className="mt-1">
              Agrandissez ou réduisez l&apos;affichage du diagramme.
            </p>
          </div>

          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">✋ Déplacement</strong>
            <p className="mt-1">
              Déplacez-vous librement dans l&apos;espace de travail.
            </p>
          </div>

          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">🎯 Recentrer</strong>
            <p className="mt-1">
              Replacez le diagramme au centre de la zone de travail.
            </p>
          </div>

          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">🖱️ Sélection</strong>
            <p className="mt-1">
              Cliquez sur une maille pour afficher ses informations dans le
              panneau « Propriétés ».
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4">
          Pour les grands diagrammes, utilisez les
          {" "}
          <strong>barres de défilement horizontale et verticale</strong> pour
          naviguer dans l&apos;ensemble du diagramme.
        </div>
      </div>
    ),
  },

  flat: {
    title: "📐 Diagramme plat",
    content: (
      <div className="space-y-4">
        <p>
          Le diagramme plat représente un ouvrage travaillé en
          {" "}
          <strong>rangs</strong>.
        </p>

        <p>
          Chaque ligne du patron correspond à un rang. Les rangs sont disposés
          du bas vers le haut afin de construire progressivement le diagramme.
        </p>

        <p>Cartomailles calcule notamment :</p>

        <ul className="list-disc ml-5 space-y-2">
          <li>les mailles ;</li>
          <li>les augmentations ;</li>
          <li>les diminutions ;</li>
          <li>le placement des différents rangs.</li>
        </ul>

        <p>
          Les couleurs alternent entre les rangs afin de faciliter leur
          identification et la lecture du diagramme.
        </p>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
          🧪 Le placement automatique continue d&apos;être amélioré pendant la
          bêta.
        </div>
      </div>
    ),
  },

  circle: {
    title: "🔵 Diagramme circulaire",
    content: (
      <div className="space-y-4">
        <p>
          Le diagramme circulaire représente les ouvrages travaillés en
          {" "}
          <strong>tours</strong>.
        </p>

        <p>
          Le premier tour est placé au centre, puis chaque nouveau tour est
          disposé autour du précédent.
        </p>

        <p>
          Cartomailles répartit automatiquement les mailles afin de construire
          progressivement le diagramme.
        </p>

        <p>
          Les couleurs alternent entre les tours pour faciliter leur
          identification.
        </p>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
          💡 Sur un grand ouvrage, utilisez le zoom, le déplacement et les
          barres de défilement pour explorer le diagramme.
        </div>
      </div>
    ),
  },

  granny: {
    title: "◻ Diagramme granny",
    content: (
      <div className="space-y-4">
        <p>
          Le diagramme granny représente un ouvrage construit en
          {" "}
          <strong>tours carrés</strong> autour d&apos;un centre.
        </p>

        <p>
          Cartomailles regroupe automatiquement les brides séparées par des
          mailles en l&apos;air, puis répartit ces groupes sur les quatre côtés.
          Les espaces situés entre deux côtés sont placés dans les angles.
        </p>

        <p>Le placement automatique prend en charge :</p>

        <ul className="list-disc ml-5 space-y-2">
          <li>les groupes compacts de trois brides ;</li>
          <li>la répartition régulière des groupes sur chaque côté ;</li>
          <li>les espaces en mailles en l&apos;air dans les quatre angles ;</li>
          <li>l&apos;orientation des symboles selon le côté du carré ;</li>
          <li>la maille coulée utilisée pour fermer le tour.</li>
        </ul>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
          💡 <strong>Exemples :</strong>
          <div className="mt-2 space-y-2 font-mono">
            <div>(3 br 2 ml) x4 1 mc</div>
            <div>(3 br 1 ml 3 br 2 ml) x4 1 mc</div>
          </div>
          <p className="mt-3 font-sans">
            Le premier exemple crée un groupe par côté. Le second crée deux
            groupes par côté. Une ligne du patron correspond à un nouveau tour.
          </p>
        </div>
      </div>
    ),
  },

  save: {
    title: "💾 Sauvegarder",
    content: (
      <div className="space-y-4">
        <p>
          Le bouton <strong>« Sauvegarder »</strong> permet d&apos;enregistrer
          votre projet Cartomailles.
        </p>

        <p>
          Vous pourrez ensuite rouvrir votre projet afin de poursuivre votre
          travail sans avoir à ressaisir votre patron.
        </p>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4 text-sm">
          💡 Pensez à sauvegarder régulièrement votre travail pendant la
          création d&apos;un diagramme important.
        </div>
      </div>
    ),
  },

  export: {
    title: "📤 Export",
    content: (
      <div className="space-y-5">
        <p>
          Cartomailles permet d&apos;exporter vos diagrammes afin de les
          conserver, les imprimer ou les intégrer à vos patrons.
        </p>

        <div className="space-y-4">
          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">PNG</strong>
            <p className="mt-1">
              Format image pratique pour le web, les réseaux sociaux ou
              l&apos;intégration dans un document.
            </p>
          </div>

          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">SVG</strong>
            <p className="mt-1">
              Format vectoriel particulièrement adapté à l&apos;impression et
              aux modifications graphiques.
            </p>
          </div>

          <div className="rounded-lg bg-[#2d2436] p-4">
            <strong className="text-pink-200">PDF</strong>
            <p className="mt-1">
              Format pratique pour imprimer, archiver ou partager votre
              diagramme.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  beta: {
    title: "🧪 Version bêta",
    content: (
      <div className="space-y-5">
        <p>
          Cartomailles est actuellement en <strong>version bêta</strong>.
        </p>

        <p>
          Certaines constructions de crochet peuvent être incomplètes, mal
          interprétées ou ne pas encore être prises en charge.
        </p>

        <p>
          N&apos;hésitez pas à tester différents patrons, types de mailles et
          configurations. Les situations inhabituelles sont particulièrement
          utiles pour améliorer le logiciel.
        </p>

        <div className="rounded-xl border border-pink-800 bg-[#2d2436] p-4">
          Si un diagramme ne correspond pas au résultat attendu, pensez à
          conserver le <strong>patron utilisé</strong> et, si possible, à faire
          une <strong>capture d&apos;écran</strong>.
        </div>

        <p>
          Vos tests et vos retours contribuent directement à
          l&apos;amélioration de Cartomailles. Merci ! 🧶
        </p>
      </div>
    ),
  },

  bug: {
    title: "🐞 Signaler un bug",
    content: (
      <div className="space-y-4">
        <p>Vous avez rencontré un problème ?</p>

        <p>
          Merci de remplir le formulaire de signalement en décrivant le bug le
          plus précisément possible.
        </p>

        <p>Pensez à indiquer :</p>

        <ul className="list-disc ml-5 space-y-2">
          <li>le patron utilisé ;</li>
          <li>le résultat obtenu ;</li>
          <li>le résultat attendu ;</li>
          <li>une capture d&apos;écran si possible.</li>
        </ul>

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
    ),
  },

  website: {
    title: "🌐 Cartomailles.com",
    content: (
      <div className="space-y-4">
        <p>
          Retrouvez toutes les informations concernant Cartomailles sur le site
          officiel.
        </p>

        <p>Vous y trouverez notamment :</p>

        <ul className="list-disc ml-5 space-y-2">
          <li>les dernières actualités ;</li>
          <li>les nouvelles versions ;</li>
          <li>les tutoriels ;</li>
          <li>les annonces importantes.</li>
        </ul>

        <p>
          Le site sera régulièrement enrichi au fil du développement de
          Cartomailles.
        </p>

        <button
          onClick={() =>
            window.open("https://www.cartomailles.com", "_blank")
          }
          className="w-full bg-pink-700 hover:bg-pink-600 rounded-lg py-3 font-semibold transition"
        >
          🌐 Ouvrir le site officiel
        </button>
      </div>
    ),
  },

  community: {
    title: "👥 Rejoindre la communauté",
    content: (
      <div className="space-y-4">
        <p>
          La communauté Cartomailles permet d&apos;échanger autour du logiciel
          et du crochet.
        </p>

        <p>Vous pouvez notamment :</p>

        <ul className="list-disc ml-5 space-y-2">
          <li>partager vos créations ;</li>
          <li>poser vos questions ;</li>
          <li>découvrir les nouveautés ;</li>
          <li>échanger avec d&apos;autres passionnés de crochet.</li>
        </ul>

        <button
          onClick={() =>
            window.open(
              "https://facebook.com/share/15xfjJpp5xC/",
              "_blank"
            )
          }
          className="w-full bg-blue-700 hover:bg-blue-600 rounded-lg py-3 font-semibold transition"
        >
          👥 Rejoindre Facebook
        </button>
      </div>
    ),
  },

  contact: {
    title: "📧 Contact",
    content: (
      <div className="space-y-4">
        <p>
          Une question, une suggestion ou un problème concernant Cartomailles ?
        </p>

        <p>N&apos;hésitez pas à nous contacter.</p>

        <button
          onClick={() =>
            (window.location.href = "mailto:contact@cartomailles.com")
          }
          className="w-full bg-purple-700 hover:bg-purple-600 rounded-lg py-3 font-semibold transition"
        >
          📧 contact@cartomailles.com
        </button>
      </div>
    ),
  },

  about: {
    title: "ℹ️ À propos",
    content: (
      <div className="space-y-4">
        <p>
          Cartomailles est un logiciel imaginé et développé par
          {" "}
          <strong>Aurore alias AD Murphye</strong>.
        </p>

        <p>
          Son objectif est de proposer un outil moderne, intuitif et accessible
          permettant de créer facilement des diagrammes de crochet à partir de
          patrons écrits.
        </p>

        <p>
          Cartomailles évolue continuellement grâce aux essais et aux retours
          de ses bêta-testeuses.
        </p>

        <p>Merci de faire partie de cette aventure ! 🧶</p>

        <hr className="border-[#5d445e]" />

        <p className="text-sm text-gray-400">
          Cartomailles Bêta
          <br />
          © 2026 Aurore alias AD Murphye
          <br />
          Tous droits réservés.
        </p>
      </div>
    ),
  },
};

export default function HelpModal({
  isOpen,
  onClose,
}: HelpModalProps) {
  const [page, setPage] =
    useState<keyof typeof pages>("welcome");
  const dialogRef = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        tabIndex={-1}
        className="bg-[#241d2d] rounded-xl w-full max-w-[1000px] h-[min(700px,calc(100vh-2rem))] flex flex-col md:flex-row overflow-hidden outline-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Menu gauche */}
        <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[#5d445e] p-4 overflow-x-auto md:overflow-y-auto">
          <div className="flex md:flex-col gap-2 min-w-max md:min-w-0">
            {Object.entries(pages).map(([key, value]) => (
              <button
                key={key}
                onClick={() =>
                  setPage(key as keyof typeof pages)
                }
                className={`w-full text-left rounded-lg px-3 py-2 transition text-[#FBF7F2] ${
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

        {/* Contenu */}
        <div
          className="flex-1 p-8 overflow-y-auto"
          style={{ color: "#FBF7F2" }}
        >
          <div className="flex justify-between items-start">
            <h2
              id="help-dialog-title"
              className="text-2xl font-bold"
              style={{ color: "#FBF7F2" }}
            >
              {pages[page].title}
            </h2>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-[#5d445e] hover:bg-[#3a2c48] transition flex items-center justify-center"
              aria-label="Fermer l'aide"
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
