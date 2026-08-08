export default function BottomTabs() {

    return (

        <section className="h-44 bg-white border-t flex flex-col">

            <div className="h-12 flex border-b">

                <button className="px-6 border-r">📚 Guide</button>

                <button className="px-6 border-r">📖 Légende</button>

                <button className="px-6 border-r">✔ Analyse</button>

                <button className="px-6 border-r">⚠ Messages</button>

                <button className="px-6">🕓 Historique</button>

            </div>

            <div className="flex-1 p-6 text-gray-400">

                Bienvenue dans Cartomailles.

            </div>

        </section>

    );

}