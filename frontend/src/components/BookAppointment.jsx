import { useEffect, useState, useRef, useMemo } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function BookAppointment() {
  const navigate = useNavigate();

  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [search, setSearch] = useState("");

  // 🔥 waiting count per clinic (ONLY waiting)
  const [waitingMap, setWaitingMap] = useState({});

  // 🔥 Cache distance calculations
  const distanceCache = useRef({});

  // 🔥 Memoize distance calculation function
  const calculateDistance = useMemo(() => {
    return (lat1, lon1, lat2, lon2) => {
      const key = `${lat1},${lon1},${lat2},${lon2}`;
      if (distanceCache.current[key]) return distanceCache.current[key];

      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceCache.current[key] = dist;
      return dist;
    };
  }, []);

  // 🔥 Get location once, don't re-fetch
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLocationError(null);
        },
        () => {
          setLocationError(
            "Location not available — showing clinics by wait time"
          );
          setUserLocation(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [userLocation]);

  // 🔥 Load clinics with limit (only 50 at a time)
  useEffect(() => {
    // 🔹 Use limit to reduce data transfer
    const clinicQuery = query(
      collection(db, "clinics"),
      orderBy("name"),
      limit(50)
    );

    const unsubClinics = onSnapshot(clinicQuery, (snap) => {
      let clinicList = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.name && c.address && c.openTime && c.closeTime);

      if (userLocation) {
        clinicList = clinicList.map((c) =>
          c.lat && c.lng
            ? {
                ...c,
                distance: calculateDistance(
                  userLocation[0],
                  userLocation[1],
                  c.lat,
                  c.lng
                ),
              }
            : { ...c, distance: null }
        );

        clinicList.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
        );
      }

      setClinics(clinicList);
      setLoading(false);
    });

    // 🔥 WAITING appointments only
    const waitingQ = query(
      collection(db, "appointments"),
      where("status", "==", "waiting")
    );

    const unsubWaiting = onSnapshot(waitingQ, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const { clinicId } = d.data();
        map[clinicId] = (map[clinicId] || 0) + 1;
      });
      setWaitingMap(map);
    });

    return () => {
      unsubClinics();
      unsubWaiting();
    };
  }, [userLocation, calculateDistance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">
            Finding nearby clinics…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Header */}
        <div className="relative mb-8 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Book Clinic Appointment
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Find doctors near you with real-time availability
                </p>
              </div>
            </div>

            {locationError && (
              <div className="mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {locationError}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div
          className="mb-8 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by clinic name, doctor, or specialty..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 
                         bg-white/80 backdrop-blur-sm
                         focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                         text-slate-800 placeholder-slate-400 font-medium
                         transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>
        </div>

        {clinics.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center animate-fade-in-up">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-4xl">🔍</span>
            </div>
            <p className="text-slate-600 font-medium">
              No clinics available in your area.
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Try expanding your search or check back later
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5">
            {clinics
              .filter((clinic) => {
                if (!search) return true;
                const term = search.toLowerCase().trim();
                return (
                  (clinic.name || "").toLowerCase().includes(term) ||
                  (clinic.doctorName || "").toLowerCase().includes(term) ||
                  (clinic.specialty || "").toLowerCase().includes(term)
                );
              })
              .map((clinic, index) => {
                const waitingCount = waitingMap[clinic.id] || 0;
                const avgTime = clinic.avgTimePerPatient || 10;

                const now = new Date();
                const [openH, openM] = clinic.openTime.split(":").map(Number);
                const [closeH, closeM] = clinic.closeTime
                  .split(":")
                  .map(Number);

                const openingTime = new Date(now);
                openingTime.setHours(openH, openM, 0, 0);

                const closingTime = new Date(now);
                closingTime.setHours(closeH, closeM, 0, 0);

                const effectiveStart = now < openingTime ? openingTime : now;

                const estimatedServiceTime = new Date(
                  effectiveStart.getTime() + waitingCount * avgTime * 60000
                );

                const outOfTimeRange = estimatedServiceTime > closingTime;
                const bookingsPaused = clinic.bookingsOpen === false;

                const estimatedWait =
                  waitingCount === 0
                    ? now < openingTime
                      ? `Opens at ${clinic.openTime}`
                      : "No wait"
                    : `~${waitingCount * avgTime} mins`;

                const waitBadge = bookingsPaused
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : outOfTimeRange
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : waitingCount === 0
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : waitingCount <= 4
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-red-50 text-red-600 border border-red-200";

                return (
                  <div
                    key={clinic.id}
                    className="group relative animate-fade-in-up"
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                    <div className="relative glass-card rounded-2xl p-5 sm:p-6 hover:shadow-2xl transition-all duration-300 border border-white/50 hover:border-blue-200">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Clinic Header */}
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg shadow-lg flex-shrink-0">
                              🏥
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-slate-800 text-lg leading-tight">
                                {clinic.name}
                              </h3>
                              {clinic.doctorName && (
                                <p className="text-sm text-blue-600 font-medium mt-0.5">
                                  Dr. {clinic.doctorName}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="text-base">📍</span>
                              <span className="truncate">{clinic.address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="text-base">⏰</span>
                              <span>
                                {clinic.openTime} – {clinic.closeTime}
                              </span>
                            </div>
                          </div>

                          {/* Tags Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            {clinic.distance != null && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {clinic.distance < 1
                                  ? `${(clinic.distance * 1000).toFixed(0)} m`
                                  : `${clinic.distance.toFixed(1)} km`}
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">
                              💰 ₹{clinic.fees}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${waitBadge}`}
                            >
                              ⏳ {bookingsPaused ? "Paused" : estimatedWait}
                            </span>
                          </div>

                          {/* Warnings */}
                          {outOfTimeRange && !bookingsPaused && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
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
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                              </svg>
                              No slots available today
                            </p>
                          )}

                          {bookingsPaused && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
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
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              Bookings temporarily paused
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <button
                          disabled={outOfTimeRange || bookingsPaused}
                          onClick={() =>
                            navigate(`/book-appointment/${clinic.id}`)
                          }
                          className={`mt-2 sm:mt-0 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                            outOfTimeRange || bookingsPaused
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95"
                          }`}
                        >
                          {bookingsPaused ? (
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
                                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              Paused
                            </>
                          ) : outOfTimeRange ? (
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
                              Full
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
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              Book Now
                            </>
                          )}
                        </button>
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
