import Hero from "../components/beta/Hero";
import Features from "../components/beta/Features";
import Feedback from "../components/beta/Feedback";
import Changelog from "../components/beta/Changelog";
import Footer from "../components/beta/Footer";
import BetaNotice from "../components/beta/BetaNotice";

export default function BetaPage() {
  return (
    <main className="min-h-screen bg-[#FFF9F5]">

  <Hero />

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