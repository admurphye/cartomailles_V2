import Hero from "../components/beta/Hero";
import Features from "../components/beta/Features";
import Feedback from "../components/beta/Feedback";
import Changelog from "../components/beta/Changelog";
import Footer from "../components/beta/Footer";
import BetaNotice from "../components/beta/BetaNotice";

type BetaPageProps = {
  onNewProject: () => void;
};

export default function BetaPage({
  onNewProject,
}: BetaPageProps) {
  return (
    <main className="min-h-screen bg-[#FFF9F5]">

 <Hero onLaunch={onNewProject} />

  <div className="max-w-6xl mx-auto px-6">
    <div className="border-b border-pink-100"></div>
  </div>

<BetaNotice />

  <Features />

  <div className="max-w-6xl mx-auto px-6">
    <div className="border-b border-pink-100"></div>
  </div>

  <Feedback />

  <div className="max-w-6xl mx-auto px-6">
    <div className="border-b border-pink-100"></div>
  </div>

  <Changelog />

  <Footer />

</main>
  );
}
