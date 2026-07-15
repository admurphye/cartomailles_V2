export default function BetaNotice() {
  return (
    <section className="bg-[#FFF9F5] py-10">
      <div className="max-w-6xl mx-auto px-6">

        <div className="rounded-3xl border border-pink-200 bg-white p-8 shadow-sm">

          <div className="flex items-start gap-5">

            <div className="text-4xl">
              🚧
            </div>

            <div>

              <h2 className="text-2xl font-bold text-[#5B2E4D]">
                Bienvenue dans la bêta de Cartomailles
              </h2>

              <p className="mt-4 text-gray-600 leading-8">
                Vous utilisez une version en cours de développement.
                Certaines fonctionnalités évolueront encore dans les prochaines semaines et quelques imperfections peuvent subsister.
              </p>

              <p className="mt-4 text-gray-600 leading-8">
                Vos retours, vos idées et vos signalements de bugs sont essentiels.
                Ils m'aideront à faire de Cartomailles un logiciel toujours plus intuitif et agréable à utiliser.
              </p>

              <p className="mt-5 font-semibold text-[#D98CA8]">
                💜 Merci de faire partie des premiers membres fondateurs !
              </p>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}