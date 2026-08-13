import Image from "next/image";

export default function CreatorMessage() {
  return (
    <section
  className="py-20"
  style={{ backgroundColor: "#5B2E4D" }}
>

      <div className="max-w-5xl mx-auto px-6">

        <div className="rounded-3xl border border-pink-100 bg-[#FFF9F5] p-10 shadow-sm">

          <div className="grid md:grid-cols-[180px_1fr] gap-10 items-center">

            {/* Photo */}

            <div className="flex justify-center">

              <Image
                src="/aurore.jpg"
                alt="Aurore"
                width={180}
                height={180}
                className="rounded-full border-4 border-white shadow-lg object-cover"
              />

            </div>

            {/* Texte */}

            <div>

              <span className="inline-flex rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
                💜 Un mot de la créatrice
              </span>

              <h2 className="mt-6 text-3xl font-bold text-[#5B2E4D]">
                Merci d’être ici.
              </h2>

              <p className="mt-6 text-gray-600 leading-8">
                Bonjour 👋,
              </p>

              <p className="mt-4 text-gray-600 leading-8">
                Je suis <strong>Aurore</strong>, la créatrice de Cartomailles.
              </p>

              <p className="mt-4 text-gray-600 leading-8">
                Ce logiciel est né d’un besoin que j’ai moi-même rencontré :
                créer des diagrammes de crochet rapidement, simplement et avec
                un rendu professionnel.
              </p>

              <p className="mt-4 text-gray-600 leading-8">
                Aujourd’hui, grâce à vous, cette idée devient réalité.
                Vos retours, vos idées et vos signalements de bugs me permettront
                de faire évoluer Cartomailles dans la bonne direction.
              </p>

              <p className="mt-4 text-gray-600 leading-8">
                Merci sincèrement de faire partie de cette aventure.
              </p>

              <p className="mt-8 font-semibold text-[#5B2E4D]">
                Bon crochet 💜
              </p>

              <p className="text-[#D98CA8] font-semibold">
                Aurore
              </p>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
