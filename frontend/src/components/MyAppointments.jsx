import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";

export default function MyAppointments() {
  const { currentUser, loading: authLoading } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [clinicMap, setClinicMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [filter, setFilter] = useState("current"); // "current" or "completed"

  const cancelAppointment = async (id, status) => {
    if (
      !id ||
      status === "cancelled" ||
      status === "completed" ||
      status === "serving"
    )
      return;

    const ok = window.confirm("Cancel this appointment?");
    if (!ok) return;

    try {
      setCancelingId(id);
      await updateDoc(doc(db, "appointments", id), {
        status: "cancelled",
      });
    } catch (err) {
      console.error("Cancel appointment failed", err);
      alert("Could not cancel appointment.");
    } finally {
      setCancelingId(null);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "appointments"),
      where("userId", "==", currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const appts = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .sort((a, b) => {
            const t1 = a.createdAt?.seconds || 0;
            const t2 = b.createdAt?.seconds || 0;
            return t2 - t1;
          });

        setAppointments(appts);

        const clinicIds = [...new Set(appts.map((a) => a.clinicId))];
        const map = {};

        await Promise.all(
          clinicIds.map(async (cid) => {
            const cSnap = await getDoc(doc(db, "clinics", cid));
            if (cSnap.exists()) map[cid] = cSnap.data();
          })
        );

        setClinicMap(map);
        setLoading(false);
      },
      () => {
        setAppointments([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, currentUser]);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Header */}
        <div className="relative mb-8 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-blue-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  My Appointments
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Track your bookings and queue status in real-time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          className="flex gap-2 mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.05s" }}
        >
          <button
            onClick={() => setFilter("current")}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
              filter === "current"
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                : "bg-white/80 text-slate-600 border border-slate-200 hover:border-violet-300 hover:bg-violet-50"
            }`}
          >
            <span>🎫</span> Current Bookings
            {appointments.filter(
              (a) => a.status !== "completed" && a.status !== "cancelled"
            ).length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === "current"
                    ? "bg-white/20"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                {
                  appointments.filter(
                    (a) => a.status !== "completed" && a.status !== "cancelled"
                  ).length
                }
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
              filter === "completed"
                ? "bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg"
                : "bg-white/80 text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>📜</span> History
            {appointments.filter(
              (a) => a.status === "completed" || a.status === "cancelled"
            ).length > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === "completed"
                    ? "bg-white/20"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {
                  appointments.filter(
                    (a) => a.status === "completed" || a.status === "cancelled"
                  ).length
                }
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
            <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">
              Loading your appointments…
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <span className="text-5xl">📅</span>
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              No Appointments Yet
            </h3>
            <p className="text-slate-500">
              Book your first clinic appointment to get started.
            </p>
          </div>
        ) : (
          (() => {
            const filteredAppointments = appointments.filter((a) => {
              if (filter === "current") {
                return a.status !== "completed" && a.status !== "cancelled";
              } else {
                return a.status === "completed" || a.status === "cancelled";
              }
            });

            if (filteredAppointments.length === 0) {
              return (
                <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-4xl">
                      {filter === "current" ? "🎫" : "📜"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 mb-2">
                    {filter === "current"
                      ? "No Active Appointments"
                      : "No Past Appointments"}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    {filter === "current"
                      ? "You don't have any ongoing bookings."
                      : "Your appointment history will appear here."}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredAppointments.map((a, index) => {
                  const status = (a.status || "waiting").toLowerCase();
                  const clinic = clinicMap[a.clinicId];

                  let statusText = status.toUpperCase();
                  let etaText = null;
                  let badgeStyle =
                    "bg-amber-50 text-amber-700 border border-amber-200";
                  let statusIcon = "⏳";
                  let cardBorderGradient = "from-amber-400 to-yellow-400";

                  if (status === "cancelled") {
                    badgeStyle = "bg-red-50 text-red-600 border border-red-200";
                    statusIcon = "❌";
                    cardBorderGradient = "from-red-400 to-rose-400";
                  } else if (status === "completed") {
                    badgeStyle =
                      "bg-slate-100 text-slate-500 border border-slate-200";
                    statusIcon = "✅";
                    cardBorderGradient = "from-slate-400 to-slate-300";
                  } else if (status === "serving") {
                    badgeStyle =
                      "bg-emerald-50 text-emerald-600 border border-emerald-200";
                    etaText =
                      "🩺 It's your turn! Please proceed to the clinic.";
                    statusIcon = "🔔";
                    cardBorderGradient = "from-emerald-400 to-green-400";
                  } else if (clinic) {
                    const currentToken = clinic.currentToken || 0;
                    const avgTime = clinic.avgTimePerPatient || 10;

                    // If currentToken is 0, no one has been served yet
                    if (currentToken === 0) {
                      const remaining = a.token - 1; // Your position in queue
                      if (remaining <= 0) {
                        etaText = "🩺 You're first in line!";
                        badgeStyle =
                          "bg-emerald-50 text-emerald-600 border border-emerald-200";
                        statusIcon = "🔔";
                        cardBorderGradient = "from-emerald-400 to-green-400";
                      } else {
                        etaText = `⏳ Queue position: #${a.token} • Currently serving: N/A`;
                      }
                    } else {
                      const remaining = a.token - currentToken - 1;

                      if (remaining <= 0) {
                        etaText =
                          "🩺 It's your turn! Please proceed to the clinic.";
                        badgeStyle =
                          "bg-emerald-50 text-emerald-600 border border-emerald-200";
                        statusIcon = "🔔";
                        cardBorderGradient = "from-emerald-400 to-green-400";
                      } else {
                        etaText = `⏳ Estimated wait: ~${
                          remaining * avgTime
                        } mins (${remaining} ahead) • Now: #${currentToken}`;
                      }
                    }
                  }

                  return (
                    <div
                      key={a.id}
                      className="group relative animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {/* Glow Effect */}
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${cardBorderGradient} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
                      ></div>

                      <div className="relative glass-card rounded-2xl p-5 sm:p-6 hover:shadow-xl transition-all duration-300 border border-white/50">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          {/* Left Section */}
                          <div className="flex items-start gap-4 flex-1">
                            {/* Token Badge */}
                            <div
                              className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${cardBorderGradient} flex flex-col items-center justify-center text-white shadow-lg`}
                            >
                              <span className="text-xs font-medium opacity-80">
                                Token
                              </span>
                              <span className="text-xl font-bold">
                                #{a.token}
                              </span>
                            </div>

                            <div className="space-y-2 flex-1 min-w-0">
                              {/* Clinic Name */}
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🏥</span>
                                <h3 className="font-bold text-slate-800 truncate">
                                  {a.clinicName}
                                </h3>
                              </div>

                              {/* Date & Time */}
                              {a.createdAt && (
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {new Date(
                                    a.createdAt.seconds * 1000
                                  ).toLocaleDateString("en-IN", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                  })}{" "}
                                  at{" "}
                                  {new Date(
                                    a.createdAt.seconds * 1000
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}

                              {/* ETA Message */}
                              {etaText && (
                                <div
                                  className={`text-sm font-medium px-3 py-2 rounded-xl ${
                                    status === "serving" ||
                                    etaText.includes("your turn")
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {etaText}
                                </div>
                              )}

                              {/* Status Badge */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full ${badgeStyle}`}
                              >
                                {statusIcon} {statusText}
                              </span>
                            </div>
                          </div>

                          {/* Cancel Button */}
                          <button
                            onClick={() => cancelAppointment(a.id, status)}
                            disabled={
                              cancelingId === a.id ||
                              status === "serving" ||
                              status === "completed" ||
                              status === "cancelled"
                            }
                            className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                              cancelingId === a.id ||
                              status === "serving" ||
                              status === "completed" ||
                              status === "cancelled"
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:shadow-md active:scale-95"
                            }`}
                          >
                            {cancelingId === a.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                Cancelling...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                                Cancel
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
