"use client";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm w-full px-6">
        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-purple-500/25">
          ⚡
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Last-Minute Life Saver
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            AI that prioritizes your tasks, scans your Gmail for deadlines, and
            schedules everything on your Calendar automatically.
          </p>
        </div>

        <div className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-purple-400"></span> Gemini AI task
            prioritization
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-blue-400">📧</span> Gmail deadline extraction
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-green-400">📅</span> Google Calendar
            auto-scheduling
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3.5 rounded-xl font-medium transition shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-slate-600 text-xs text-center">
          Built with Gemini AI · Google Calendar · Gmail API
        </p>
      </div>
    </main>
  );
}
