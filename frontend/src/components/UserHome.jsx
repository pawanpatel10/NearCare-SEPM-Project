import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Navbar from "./Navbar";

export default function UserHome() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        setUserName(docSnap.exists() ? docSnap.data().name : user.displayName);
      } else {
        navigate("/login");
      }
      setLoading(false);
    };
    fetchUserData();
  }, [navigate]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero Section - Animated Gradient */}
        <div
          className="relative rounded-[2rem] p-10 text-white shadow-2xl mb-12 overflow-hidden
                        bg-gradient-hero animate-fade-in-up"
        >
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-float delay-200" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-bounce-subtle">
                <span className="text-3xl">👋</span>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">
                  Welcome back
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                  {userName.split(" ")[0]}
                </h1>
              </div>
            </div>
            <p className="text-white/80 text-lg max-w-md mt-4">
              Your health companion is ready. Find medicines, book appointments,
              and manage your healthcare journey.
            </p>
          </div>
        </div>

        {/* System Status - Glass Card */}
        <div className="glass-card rounded-2xl p-5 mb-10 flex items-center gap-4 animate-fade-in-up delay-100">
          <div className="relative">
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 rounded-xl shadow-lg">
              <svg
                className="w-6 h-6 text-white"
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
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse-glow"></div>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">
              All Systems Operational
            </p>
            <p className="text-sm text-slate-500">
              Real-time pharmacy stock updates • Live clinic queues
            </p>
          </div>
        </div>

        {/* Action Grid - 3D Hover Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Find Medicines */}
          <div
            onClick={() => navigate("/search-medicines")}
            className="group cursor-pointer animate-fade-in-up delay-200"
          >
            <div
              className="relative rounded-3xl p-[2px] bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 
                            shadow-lg shadow-blue-500/20 transition-all duration-500 
                            group-hover:shadow-xl group-hover:shadow-blue-500/30 group-hover:scale-[1.02]"
            >
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-7 h-full relative overflow-hidden">
                {/* Animated Background */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 
                                group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-2xl 
                                  flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30
                                  group-hover:scale-110 transition-transform duration-500"
                  >
                    <span className="text-3xl">💊</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Find Medicines
                  </h3>
                  <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                    Locate nearby pharmacies with your prescription in stock
                    instantly.
                  </p>
                  <div
                    className="flex items-center text-blue-600 font-semibold text-sm 
                                  group-hover:gap-3 gap-1 transition-all duration-300"
                  >
                    <span>Search Now</span>
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

          {/* Book Appointment */}
          <div
            onClick={() => navigate("/book-appointment")}
            className="group cursor-pointer animate-fade-in-up delay-300"
          >
            <div
              className="relative rounded-3xl p-[2px] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 
                            shadow-lg shadow-emerald-500/20 transition-all duration-500 
                            group-hover:shadow-xl group-hover:shadow-emerald-500/30 group-hover:scale-[1.02]"
            >
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-7 h-full relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 
                                group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-emerald-500 to-teal-500 w-16 h-16 rounded-2xl 
                                  flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30
                                  group-hover:scale-110 transition-transform duration-500"
                  >
                    <span className="text-3xl">👨‍⚕️</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Book Clinic Visit
                  </h3>
                  <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                    Get a digital token, track live queues, and skip waiting
                    rooms.
                  </p>
                  <div
                    className="flex items-center text-emerald-600 font-semibold text-sm 
                                  group-hover:gap-3 gap-1 transition-all duration-300"
                  >
                    <span>Book Now</span>
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

          {/* My Appointments */}
          <div
            onClick={() => navigate("/my-appointments")}
            className="group cursor-pointer animate-fade-in-up delay-400"
          >
            <div
              className="relative rounded-3xl p-[2px] bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500 
                            shadow-lg shadow-purple-500/20 transition-all duration-500 
                            group-hover:shadow-xl group-hover:shadow-purple-500/30 group-hover:scale-[1.02]"
            >
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-7 h-full relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-violet-50 to-fuchsia-50 opacity-0 
                                group-hover:opacity-100 transition-opacity duration-500"
                ></div>

                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-violet-500 to-fuchsia-500 w-16 h-16 rounded-2xl 
                                  flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30
                                  group-hover:scale-110 transition-transform duration-500"
                  >
                    <span className="text-3xl">📅</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    My Bookings
                  </h3>
                  <p className="text-slate-600 text-sm mb-5 leading-relaxed">
                    View active tokens, appointment history, and live wait
                    times.
                  </p>
                  <div
                    className="flex items-center text-purple-600 font-semibold text-sm 
                                  group-hover:gap-3 gap-1 transition-all duration-300"
                  >
                    <span>View Status</span>
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

        {/* Emergency Banner - Modern Glass */}
        <div className="mt-14 animate-fade-in-up delay-500">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 p-[2px]">
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-[calc(1rem-2px)] p-6 flex items-start gap-4">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-xl shadow-lg flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-red-800 text-lg">
                  Medical Emergency?
                </h4>
                <p className="text-red-700 mt-1">
                  This app is for non-critical appointments. For emergencies,
                  call{" "}
                  <a
                    href="tel:102"
                    className="font-bold underline decoration-2 hover:text-red-900"
                  >
                    102
                  </a>{" "}
                  or{" "}
                  <a
                    href="tel:108"
                    className="font-bold underline decoration-2 hover:text-red-900"
                  >
                    108
                  </a>{" "}
                  immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}