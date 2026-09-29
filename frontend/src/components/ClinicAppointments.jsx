import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import Navbar from "./Navbar";

export default function ClinicAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [currentToken, setCurrentToken] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const clinicRef = doc(db, "clinics", user.uid);
    const unsubClinic = onSnapshot(clinicRef, (snap) => {
      if (snap.exists()) {
        setCurrentToken(snap.data().currentToken || 0);
      }
    });

    const q = query(
      collection(db, "appointments"),
      where("clinicId", "==", user.uid)
    );

    const unsubAppts = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.status !== "cancelled")
        .sort((a, b) => b.token - a.token);

      setAppointments(list);
    });

    return () => {
      unsubClinic();
      unsubAppts();
    };
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="relative mb-8 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl"></span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Today's Appointments
                </h1>
                <p className="text-slate-500 text-sm">
                  {appointments.length > 0
                    ? `${
                        appointments.filter((a) => a.status === "waiting")
                          .length
                      } patients waiting`
                    : "No patients in queue"}
                </p>
              </div>
              {currentToken > 0 && (
                <div className="ml-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg">
                  Now: #{currentToken}
                </div>
              )}
            </div>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-4xl"></span>
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              No Appointments
            </h3>
            <p className="text-slate-500">
              Your queue is empty. Patients can book when you open.
            </p>
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-300 via-blue-300 to-slate-200"></div>

            {appointments.map((a, idx) => {
              let badge = "bg-amber-50 text-amber-700 border border-amber-200";
              let label = "Waiting";
              let icon = "";

              if (a.status === "serving") {
                badge =
                  "bg-emerald-50 text-emerald-700 border border-emerald-200";
                label = "Being Served";
                icon = "";
              } else if (a.status === "completed") {
                badge = "bg-slate-100 text-slate-500 border border-slate-200";
                label = "Completed";
                icon = "";
              }

              const isCurrent =
                a.token === currentToken && a.status !== "completed";

              return (
                <div
                  key={a.id}
                  className="relative pl-14 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white shadow-md z-10
                      ${
                        isCurrent
                          ? "bg-emerald-500"
                          : a.status === "completed"
                          ? "bg-slate-400"
                          : "bg-blue-500"
                      }
                    `}
                  />

                  {/* Card */}
                  <div
                    className={`group relative ${
                      isCurrent ? "scale-[1.02]" : ""
                    }`}
                  >
                    {/* Glow for current */}
                    {isCurrent && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/30 to-teal-400/30 blur-xl animate-pulse" />
                    )}

                    <div
                      className={`relative glass-card rounded-2xl p-5 transition-all duration-300 
                        ${
                          isCurrent
                            ? "ring-2 ring-emerald-400 shadow-xl"
                            : "hover:shadow-lg"
                        }
                      `}
                    >
                      <div className="flex justify-between items-center gap-4">
                        {/* Left - Patient Info */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow
                            ${
                              isCurrent
                                ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                                : a.status === "completed"
                                ? "bg-slate-200"
                                : "bg-gradient-to-br from-blue-500 to-indigo-500"
                            }
                          `}
                          >
                            {icon}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">
                              {a.patientName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${badge}`}
                            >
                              {label}
                            </span>
                          </div>
                        </div>

                        {/* Right - Token */}
                        <div className="flex flex-col items-end">
                          <div
                            className={`px-5 py-2.5 rounded-xl font-bold text-lg
                              ${
                                isCurrent
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                                  : "bg-blue-50 text-blue-700 border-2 border-blue-200"
                              }
                            `}
                          >
                            #{a.token}
                          </div>

                          {isCurrent && (
                            <span className="mt-2 text-xs text-emerald-600 font-bold tracking-wide flex items-center gap-1">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                              NOW SERVING
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
