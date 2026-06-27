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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-4xl">⚡</div>
        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Last-Minute Life Saver
        </h1>
        <p className="text-gray-500 text-center text-sm">
          AI that plans your day before deadlines hit.
        </p>
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
