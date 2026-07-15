import Image from "next/image";

type HeroProps = {
  onLaunch: () => void;
};

export default function Hero({
  onLaunch,
}: HeroProps) {
  return (
    <section className="bg-[#FFF9F5] py-20">

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Texte */}

          <div>

            <div className="inline-flex items-center rounded-full bg-pink-100 text-pink-700 px-4 py-2 text-sm font-medium">
              🟣 Version Bêta 0.9
            </div>

            <Image
              src="/logo-cartomailles-v5.png"
              alt="Cartomailles"
              width={280}
              height={90}
              priority
              className="mt-8"
            />

            <h1 className="mt-10 text-5xl md:text-6xl font-bold text-[#5B2E4D] leading-tight">
              Bienvenue dans
              <span className="block text-[#D98CA8]">
                Cartomailles
              </span>
            </h1>

            <p className="mt-8 text-xl leading-9 text-gray-600 max-w-xl">
              Merci de participer à la bêta.
              <br /><br />
              Vous faites partie des premiers utilisateurs à découvrir
              Cartomailles et à contribuer à son évolution.
            </p>

            <div className="mt-12 flex flex-wrap gap-4">

              <button
  onClick={onLaunch}
  className="rounded-xl bg-[#D98CA8] hover:bg-[#E8A4BD] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1"
>
  🚀 Ouvrir Cartomailles
</button>

            </div>

            <div className="mt-10 rounded-2xl border border-pink-200 bg-white p-6 shadow-sm max-w-xl">

              <h3 className="font-semibold text-[#5B2E4D] text-lg">
                💜 Merci d'être membre fondateur
              </h3>

              <p className="mt-3 text-gray-600 leading-7">
                Vos retours, vos idées et vos signalements de bugs permettront
                d'améliorer Cartomailles avant sa sortie officielle.
              </p>

            </div>

          </div>

          {/* Capture */}

          <div>

            <div className="rounded-3xl overflow-hidden bg-white border border-pink-100 shadow-xl">

              <Image
                src="/capture-cartomailles.png"
                alt="Capture Cartomailles"
                width={1200}
                height={800}
                priority
                className="w-full h-auto"
              />

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}