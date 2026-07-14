import {
  Circle,
  Rows3,
  Save,
  FileImage,
  FileText,
  Signature,
} from "lucide-react";

const features = [
  {
    icon: Circle,
    title: "Diagrammes circulaires",
    description:
      "Créez automatiquement des diagrammes pour tous vos ouvrages travaillés en rond.",
  },
  {
    icon: Rows3,
    title: "Diagrammes plats",
    description:
      "Générez facilement des diagrammes pour les ouvrages travaillés en aller-retour.",
  },
  {
    icon: Signature,
    title: "Nom du diagramme",
    description:
      "Ajoutez un titre à vos créations pour retrouver facilement chacun de vos projets.",
  },
  {
    icon: Save,
    title: "Sauvegarde des projets",
    description:
      "Enregistrez vos diagrammes au format Cartomailles et reprenez votre travail à tout moment.",
  },
  {
    icon: FileImage,
    title: "Export PNG & SVG",
    description:
      "Exportez vos diagrammes sous forme d'image ou de fichier vectoriel de haute qualité.",
  },
  {
    icon: FileText,
    title: "Export PDF",
    description:
      "Imprimez ou partagez vos diagrammes dans un document PDF prêt à être utilisé.",
  },
];

export default function Features() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="inline-flex rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
            🧶 Fonctionnalités disponibles
          </span>

          <h2 className="mt-6 text-4xl font-bold text-[#5B2E4D]">
            Ce que vous pouvez déjà faire
          </h2>

          <p className="mt-5 max-w-2xl mx-auto text-lg text-gray-600 leading-8">
            Découvrez les principales fonctionnalités déjà disponibles dans cette
            première version bêta de Cartomailles.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-3xl border border-pink-100 bg-[#FFF9F5] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100">
                  <Icon size={28} className="text-[#D98CA8]" />
                </div>

                <h3 className="text-xl font-semibold text-[#5B2E4D]">
                  {feature.title}
                </h3>

                <p className="mt-4 text-gray-600 leading-7">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}