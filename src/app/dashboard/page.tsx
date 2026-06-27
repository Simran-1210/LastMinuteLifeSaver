"use client";
import { useEffect, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  User,
  signOut,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

interface Task {
  id?: string;
  title: string;
  deadline: string;
  priority: "urgent" | "high" | "medium" | "low";
  reason?: string;
  suggestedTime?: string;
  userId: string;
}

const priorityColors = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [calLoading, setCalLoading] = useState(false);
  const router = useRouter();

  const loadTasks = async (uid: string) => {
    const q = query(collection(db, "tasks"), where("userId", "==", uid));
    const snap = await getDocs(q);
    const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
    setTasks(loaded);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      else {
        setUser(u);
        loadTasks(u.uid);
      }
    });
  }, [router]);

  const addTask = async () => {
    if (!title || !deadline || !user) return;
    setLoading(true);
    const newTask: Task = {
      title,
      deadline,
      priority: "medium",
      userId: user.uid,
    };
    const docRef = await addDoc(collection(db, "tasks"), newTask);
    setTasks((prev) => [...prev, { ...newTask, id: docRef.id }]);
    setTitle("");
    setDeadline("");
    setLoading(false);
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const prioritizeWithAI = async () => {
    if (tasks.length === 0) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      const data = await res.json();
      const prioritized = Array.isArray(data) ? data : [];
      if (prioritized.length > 0) {
        setTasks((prev) =>
          prev.map((task) => {
            const aiTask = prioritized.find((a: Task) => a.id === task.id);
            return aiTask ? { ...task, ...aiTask } : task;
          }),
        );
      }
    } catch (err) {
      console.error(err);
    }
    setAiLoading(false);
  };

  const syncToCalendar = async () => {
    if (tasks.length === 0) return;
    setCalLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = await (result as {
        _tokenResponse?: { oauthAccessToken?: string };
      });
      const accessToken = (
        result as unknown as { _tokenResponse: { oauthAccessToken: string } }
      )._tokenResponse?.oauthAccessToken;

      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, accessToken }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.events.length} tasks added to Google Calendar!`);
      } else {
        alert("Calendar sync failed: " + data.error);
      }
    } catch (err) {
      console.error("Calendar sync error:", err);
      alert("Calendar sync failed. See console.");
    }
    setCalLoading(false);
  };
  const extractFromGmail = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const accessToken = (
        result as unknown as { _tokenResponse: { oauthAccessToken: string } }
      )._tokenResponse?.oauthAccessToken;

      const res = await fetch("/api/gmail/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await res.json();

      if (data.deadlines?.length > 0 && user) {
        const newTasks: Task[] = [];
        for (const email of data.deadlines) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(23, 59, 0, 0);

          const newTask: Task = {
            title: email.subject.substring(0, 60),
            deadline: tomorrow.toISOString(),
            priority: "high",
            reason: `Auto-detected from email by ${email.from.split("<")[0].trim()}`,
            userId: user.uid,
          };
          const docRef = await addDoc(collection(db, "tasks"), newTask);
          newTasks.push({ ...newTask, id: docRef.id });
        }
        setTasks((prev) => [...prev, ...newTasks]);
        alert(`✅ Created ${newTasks.length} tasks from your Gmail deadlines!`);
      } else {
        alert("No deadline emails found in the last 7 days.");
      }
    } catch (err) {
      console.error(err);
      alert("Gmail scan failed.");
    }
  };

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome, {user.displayName?.split(" ")[0]}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Your AI-powered task board
            </p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h2 className="font-medium text-gray-800 mb-3">Add a task</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Task title e.g. Submit assignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-48 text-gray-900 bg-white"
            />
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
            />
            <button
              onClick={addTask}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add task"}
            </button>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={prioritizeWithAI}
              disabled={aiLoading}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {aiLoading
                ? "AI is analyzing..."
                : "✨ Prioritize with Gemini AI"}
            </button>
            <button
              onClick={syncToCalendar}
              disabled={calLoading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition"
            >
              {calLoading ? "Syncing..." : "📅 Sync to Google Calendar"}
            </button>
            <button
              onClick={extractFromGmail}
              className="w-full bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition"
            >
              📧 Scan Gmail for Deadlines
            </button>
          </div>
        )}

        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">
                No tasks yet. Add one above.
              </p>
            </div>
          )}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    <h3 className="font-medium text-gray-900 text-sm">
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400">
                    Due: {new Date(task.deadline).toLocaleString()}
                  </p>
                  {task.reason && (
                    <p className="text-xs text-purple-600 mt-1">
                      {task.reason}
                    </p>
                  )}
                  {task.suggestedTime && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Best time: {task.suggestedTime}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(task.id!)}
                  className="text-gray-300 hover:text-red-400 text-lg leading-none"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
