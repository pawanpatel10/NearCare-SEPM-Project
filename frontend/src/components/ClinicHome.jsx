import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import Navbar from "./Navbar";

export default function ClinicHome() {
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState("Doctor");
  const [currentToken, setCurrentToken] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const [hasServing, setHasServing] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // 🔹 Live clinic + queue status via onSnapshot
  useEffect(() => {
    let unsubClinic;
    let unsubWaiting;
    let unsubServing;

    const fetchClinicData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // Doctor name (one-time fetch)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setDoctorName(userDoc.data().name);
        }

        // Live clinic meta (token + booking state)
        const clinicRef = doc(db, "clinics", user.uid);
        unsubClinic = onSnapshot(clinicRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setCurrentToken(data.currentToken || 0);
            setBookingsOpen(data.bookingsOpen !== false); // default true
          }
        });

        // Live waiting count
        const waitingQ = query(
          collection(db, "appointments"),
          where("clinicId", "==", user.uid),
          where("status", "==", "waiting")
        );
        unsubWaiting = onSnapshot(waitingQ, (snap) => {
          setWaitingCount(snap.size);
        });

        // Live serving status
        const servingQ = query(
          collection(db, "appointments"),
          where("clinicId", "==", user.uid),
          where("status", "==", "serving")
        );
        unsubServing = onSnapshot(servingQ, (snap) => {
          setHasServing(!snap.empty);
        });
      } catch (err) {
        console.error("ClinicHome fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClinicData();

    return () => {
      if (unsubClinic) unsubClinic();
      if (unsubWaiting) unsubWaiting();
      if (unsubServing) unsubServing();
    };
  }, [navigate]);

  // ▶ CALL NEXT PATIENT
  const callNextPatient = async () => {
    if (hasServing) {
      alert("Please complete the current consultation first.");
      return;
    }

    const clinicId = auth.currentUser.uid;

    const q = query(
      collection(db, "appointments"),
      where("clinicId", "==", clinicId),
      where("status", "==", "waiting")
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      alert("No patients waiting.");
      return;
    }

    const next = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.token - b.token)[0];

    await updateDoc(doc(db, "appointments", next.id), {
      status: "serving",
    });

    await updateDoc(doc(db, "clinics", clinicId), {
      currentToken: next.token,
    });

    setCurrentToken(next.token);
    setWaitingCount((c) => Math.max(c - 1, 0));
    setHasServing(true);
  };

  // ✅ COMPLETE CURRENT PATIENT
  const completeCurrentPatient = async () => {
    const clinicId = auth.currentUser.uid;

    const q = query(
      collection(db, "appointments"),
      where("clinicId", "==", clinicId),
      where("status", "==", "serving")
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      alert("No patient is currently being served.");
      return;
    }

    await updateDoc(snap.docs[0].ref, {
      status: "completed",
    });

    // Reset currentToken to 0 so "Now Serving" shows N/A
    await updateDoc(doc(db, "clinics", clinicId), {
      currentToken: 0,
    });

    setCurrentToken(0);
    setHasServing(false);
  };

  // 🛑 TOGGLE BOOKINGS
  const toggleBookings = async () => {
    const clinicId = auth.currentUser.uid;
    const nextState = !bookingsOpen;

    await updateDoc(doc(db, "clinics", clinicId), {
      bookingsOpen: nextState,
    });

    setBookingsOpen(nextState);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600 animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">
            Loading clinic dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* HEADER - Animated */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 
                            flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce-subtle"
            >
              <span className="text-3xl">👨‍⚕️</span>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Welcome back</p>
              <h1 className="text-3xl font-bold text-slate-800">
                Dr. {doctorName}
              </h1>
            </div>
          </div>
          <p className="text-slate-500 mt-3 ml-20">
            Live clinic operations & patient queue management
          </p>
        </div>

        {/* QUEUE PANEL - Glass Morphism */}
        <section className="animate-fade-in-up delay-100">
          <div
            className="relative rounded-[2rem] p-[2px] bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 
                          shadow-2xl shadow-emerald-500/20 mb-12"
          >
            <div className="glass-card rounded-[calc(2rem-2px)] p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/40 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-200/40 to-transparent rounded-full blur-3xl"></div>

              <div className="relative flex flex-col lg:flex-row justify-between gap-10">
                <div className="flex gap-12">
                  <div className="text-center">
                    <p className="text-xs tracking-widest uppercase text-slate-500 font-semibold mb-2">
                      Now Serving
                    </p>
                    <div className="relative">
                      <div
                        className={`text-7xl font-black bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent ${
                          hasServing ? "animate-pulse-glow" : ""
                        }`}
                      >
                        {currentToken || "—"}
                      </div>
                      {hasServing && (
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full animate-ping"></div>
                      )}
                    </div>
                  </div>
                  <div className="w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>
                  <div className="text-center">
                    <p className="text-xs tracking-widest uppercase text-slate-500 font-semibold mb-2">
                      In Queue
                    </p>
                    <div className="text-6xl font-bold text-slate-700">
                      {waitingCount}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      patients waiting
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4 w-full lg:w-80">
                  <button
                    onClick={callNextPatient}
                    disabled={hasServing}
                    className={`relative py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 overflow-hidden ${
                      hasServing
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Call Next Patient
                    </span>
                  </button>
                  <button
                    onClick={completeCurrentPatient}
                    disabled={!hasServing}
                    className={`py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      hasServing
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Mark Completed
                    </span>
                  </button>
                  <button
                    onClick={toggleBookings}
                    className={`py-3 px-6 rounded-2xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                      bookingsOpen
                        ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-600 hover:from-red-200 hover:to-rose-200"
                        : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 hover:from-green-200 hover:to-emerald-200"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {bookingsOpen
                        ? "⏸ Pause New Bookings"
                        : "▶ Resume Bookings"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NAVIGATION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={() => navigate("/doctor-dashboard/appointments")}
            className="group cursor-pointer animate-fade-in-up delay-200"
          >
            <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 shadow-lg shadow-blue-500/20 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-blue-500/30 group-hover:scale-[1.02]">
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-8 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-start gap-5">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-500 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Today's Appointments
                    </h3>
                    <p className="text-slate-500 mt-1">
                      View live queue & patient status
                    </p>
                    <div className="flex items-center text-blue-600 font-semibold text-sm mt-4 group-hover:gap-3 gap-1 transition-all duration-300">
                      <span>Open Queue</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            onClick={() => navigate("/doctor-dashboard/settings")}
            className="group cursor-pointer animate-fade-in-up delay-300"
          >
            <div className="relative rounded-3xl p-[2px] bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/20 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-purple-500/30 group-hover:scale-[1.02]">
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-8 h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-fuchsia-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-start gap-5">
                  <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Clinic Settings
                    </h3>
                    <p className="text-slate-500 mt-1">
                      Manage profile, fees & timings
                    </p>
                    <div className="flex items-center text-purple-600 font-semibold text-sm mt-4 group-hover:gap-3 gap-1 transition-all duration-300">
                      <span>Configure</span>
                      <svg
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
