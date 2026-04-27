import HandTracker from "../components/HandTracker";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-8 text-white font-sans relative z-10">
      <header className="mb-10 text-center">
        <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent tracking-tighter drop-shadow-sm">
          SignSync
        </h1>
        <p className="text-slate-400 mt-3 text-lg tracking-wide">Real-time AI Translation Engine</p>
      </header>

      <div className="w-full max-w-4xl">
        {/* This will now work perfectly with the default export */}
        <HandTracker />
      </div>

      <section className="mt-12 p-8 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl w-full shadow-[0_0_30px_-10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] transition-shadow">
        <h2 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Testing Instructions
        </h2>
        <ul className="list-none text-slate-300 space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-cyan-500 font-black">01</span>
            Accept the browser camera permissions.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-cyan-500 font-black">02</span>
            Hold your hand up to the camera to see the <strong className="text-white mx-1">21-point wireframe</strong>.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-cyan-500 font-black">03</span>
            Verify signs are translating and merging in the HUD.
          </li>
        </ul>
      </section>
    </main>
  );
}