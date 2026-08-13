export default function Feedback() {
  return (
    <section className="bg-[#FFF9F5] py-20">

      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-14">

          <span className="inline-flex rounded-full bg-pink-100 px-4 py-2 text-sm font-medium text-pink-700">
            💜 Votre avis est précieux
          </span>

          <h2 className="mt-6 text-4xl font-bold text-[#5B2E4D]">
            Construisons Cartomailles ensemble
          </h2>

          <p className="mt-5 max-w-3xl mx-auto text-lg text-gray-600 leading-8">
            Cette bêta évolue grâce à vous. Chaque bug signalé et chaque idée
            proposée nous permettent d’améliorer Cartomailles avant son lancement officiel.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2">

          {/* BUG */}

          <div className="rounded-3xl bg-white border border-red-100 shadow-sm p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">

            <div className="text-5xl mb-6">
              🐞
            </div>

            <h3 className="text-2xl font-bold text-[#5B2E4D]">
              Signaler un bug
            </h3>

            <p className="mt-4 text-gray-600 leading-8">
              Vous avez rencontré un problème, un comportement inattendu ou un
              blocage ? Décrivez-nous ce qu’il s’est passé afin que nous
              puissions le corriger rapidement.
            </p>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSckIAs1BYBPK15mz8ySauiN4DthzQnslDz7FdL7NmE-zZu4IQ/viewform?usp=publish-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8 rounded-xl bg-[#D16A7C] hover:bg-[#BF5B6E] px-6 py-4 text-white font-semibold transition"
            >
              🐞 Signaler un bug
            </a>

          </div>

          {/* IDEES */}

          <div className="rounded-3xl bg-white border border-yellow-100 shadow-sm p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">

            <div className="text-5xl mb-6">
              💡
            </div>

            <h3 className="text-2xl font-bold text-[#5B2E4D]">
              Proposer une idée
            </h3>

            <p className="mt-4 text-gray-600 leading-8">
              Une fonctionnalité vous ferait gagner du temps ?
              Une amélioration vous semblerait utile ?
              Toutes les suggestions sont étudiées avec attention.
            </p>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdMk8mSdTDui3IX8RFSxbsmQNgz3ElzYF9tmF5AOaLW2y1eXw/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8 rounded-xl bg-[#D98CA8] hover:bg-[#E8A4BD] px-6 py-4 text-white font-semibold transition"
            >
              💡 Proposer une idée
            </a>

          </div>

        </div>

      </div>

    </section>
  );
}
