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

const priorityConfig = {
  urgent: {
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
  high: {
    bg: "bg-orange-500/20",
    text: "text-orange-300",
    border: "border-orange-500/30",
    dot: "bg-orange-400",
  },
  medium: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-300",
    border: "border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  low: {
    bg: "bg-green-500/20",
    text: "text-green-300",
    border: "border-green-500/30",
    dot: "bg-green-400",
  },
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
      const accessToken = (
        result as unknown as { _tokenResponse: { oauthAccessToken: string } }
      )._tokenResponse?.oauthAccessToken;
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, accessToken }),
      });
      const data = await res.json();
      if (data.success)
        alert(`${data.events.length} tasks added to Google Calendar!`);
      else alert("Calendar sync failed: " + data.error);
    } catch (err) {
      console.error(err);
      alert("Calendar sync failed.");
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
        alert(`Created ${newTasks.length} tasks from your Gmail deadlines!`);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );

  const urgentCount = tasks.filter((t) => t.priority === "urgent").length;
  const highCount = tasks.filter((t) => t.priority === "high").length;

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-sm font-bold">
              ⚡
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm">
                Last-Minute Life Saver
              </h1>
              <p className="text-slate-400 text-xs">
                Welcome back, {user.displayName?.split(" ")[0]}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-500 transition"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{tasks.length}</div>
            <div className="text-slate-400 text-xs mt-1">Total Tasks</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{urgentCount}</div>
            <div className="text-slate-400 text-xs mt-1">Urgent</div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">
              {highCount}
            </div>
            <div className="text-slate-400 text-xs mt-1">High Priority</div>
          </div>
        </div>

        {/* Add Task */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-medium text-slate-300 mb-3">
            Add a task
          </h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="e.g. Submit project report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 min-w-48"
            />
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={addTask}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition"
            >
              {loading ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>

        {/* AI Action Buttons */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
            <button
              onClick={prioritizeWithAI}
              disabled={aiLoading}
              className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {aiLoading ? "Analyzing..." : "✨ Prioritize with Gemini"}
            </button>
            <button
              onClick={syncToCalendar}
              disabled={calLoading}
              className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {calLoading ? "Syncing..." : "📅 Sync to Calendar"}
            </button>
            <button
              onClick={extractFromGmail}
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
            >
              📧 Scan Gmail
            </button>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚡</div>
            <p className="text-slate-400 text-sm">
              No tasks yet. Add one above or scan your Gmail.
            </p>
            <button
              onClick={extractFromGmail}
              className="mt-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 py-2.5 px-6 rounded-xl text-sm font-medium transition"
            >
              📧 Scan Gmail for Deadlines
            </button>
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = priorityConfig[task.priority];
            const isOverdue = new Date(task.deadline) < new Date();
            return (
              <div
                key={task.id}
                className={`bg-slate-800/50 border ${config.border} rounded-2xl p-4 hover:bg-slate-800/70 transition`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${config.dot}`}
                      ></div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} font-medium`}
                      >
                        {task.priority}
                      </span>
                      {isOverdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                          overdue
                        </span>
                      )}
                      <h3 className="font-medium text-white text-sm">
                        {task.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 ml-4">
                      Due: {new Date(task.deadline).toLocaleString()}
                    </p>
                    {task.reason && (
                      <p className="text-xs text-purple-400 mt-1 ml-4">
                        {task.reason}
                      </p>
                    )}
                    {task.suggestedTime && (
                      <p className="text-xs text-slate-500 mt-0.5 ml-4">
                        Best time: {task.suggestedTime}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask(task.id!)}
                    className="text-slate-600 hover:text-red-400 transition text-lg leading-none mt-0.5"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
