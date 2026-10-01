import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function ClinicBooking() {
  const { clinicId } = useParams();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false); // Prevent duplicate bookings

  // 🔥 live waiting count
  const [waitingCount, setWaitingCount] = useState(0);

  // 🔹 Load clinic
  useEffect(() => {
    const loadClinic = async () => {
      const snap = await getDoc(doc(db, "clinics", clinicId));
      if (snap.exists()) {
        setClinic(snap.data());
      }
      setLoading(false);
    };
    loadClinic();
  }, [clinicId]);

  // 🔥 count ONLY waiting appointments
  useEffect(() => {
    const fetchWaiting = async () => {
      const q = query(
        collection(db, "appointments"),
        where("clinicId", "==", clinicId),
        where("status", "==", "waiting")
      );
      const snap = await getDocs(q);
      setWaitingCount(snap.size);
    };
    fetchWaiting();
  }, [clinicId]);

  const bookAppointment = async () => {
    if (!auth.currentUser || !clinic || booking) return;

    setBooking(true);
    const userId = auth.currentUser.uid;

    try {
      // ✅ block multiple active bookings
      const existingQuery = query(
        collection(db, "appointments"),
        where("clinicId", "==", clinicId),
        where("userId", "==", userId),
        where("status", "in", ["waiting", "serving"])
      );

      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        alert("You already have an active appointment at this clinic.");
        setBooking(false);
        return;
      }

      // 🔢 token = currentToken + waiting + 1
      const currentToken = clinic.currentToken || 0;
      const nextToken = currentToken + waitingCount + 1;

      await addDoc(collection(db, "appointments"), {
        clinicId,
        clinicName: clinic.name,
        userId,
        patientName: auth.currentUser.displayName || "Patient",
        token: nextToken,
        status: "waiting",
        createdAt: serverTimestamp(),
      });

      alert(`Appointment booked! Your token number is ${nextToken}`);
      navigate("/my-appointments");
    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to book appointment. Please try again.");
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-mesh">
        <div className="animate-fade-in-up glass-card rounded-2xl p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></div>
          <p className="text-slate-700 font-semibold">Loading clinic...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-red-700 font-semibold">Clinic not found.</p>
        </div>
      </div>
    );
  }

  const avgTime = clinic.avgTimePerPatient || 10;

  // 🕒 TIME LOGIC (same as BookAppointment)
  const now = new Date();

  const [openH, openM] = clinic.openTime.split(":").map(Number);
  const [closeH, closeM] = clinic.closeTime.split(":").map(Number);

  const openingTime = new Date(now);
  openingTime.setHours(openH, openM, 0, 0);

  const closingTime = new Date(now);
  closingTime.setHours(closeH, closeM, 0, 0);

  const effectiveStart = now < openingTime ? openingTime : now;

  const estimatedServiceTime = new Date(
    effectiveStart.getTime() + waitingCount * avgTime * 60000
  );

  const outOfTimeRange = estimatedServiceTime > closingTime;

  // ⏳ ETA DISPLAY
  const estimatedWait =
    waitingCount === 0
      ? now < openingTime
        ? `Opens at ${clinic.openTime}`
        : "No wait"
      : `~${waitingCount * avgTime} mins`;

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="animate-fade-in-up">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 rounded-3xl blur-xl"></div>

          <div className="relative glass-card rounded-3xl px-6 py-6 shadow-lg">
            {/* Header with icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {clinic.name}
                </h1>
                <p className="text-slate-500 text-sm">
                  Confirm your appointment
                </p>
              </div>
            </div>

            {/* Clinic details */}
            <div className="space-y-3 py-4 border-t border-slate-100">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">
                  📍
                </span>
                <span>{clinic.address}</span>
              </div>

              <div className="flex items-center gap-3 text-slate-700">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">
                  ⏰
                </span>
                <span>
                  {clinic.openTime} – {clinic.closeTime}
                </span>
              </div>
            </div>

            {/* Fees badge */}
            <div className="py-4 border-t border-slate-100">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg">
                💰 Fees: ₹{clinic.fees}
              </div>
            </div>

            {/* Wait time indicator */}
            <div className="py-4 border-t border-slate-100">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                ⏳ Estimated wait: {estimatedWait}
              </div>
            </div>

            {outOfTimeRange && (
              <div className="py-3 px-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <span>⚠️</span> No slots available today
                </p>
              </div>
            )}

            <button
              disabled={outOfTimeRange || booking}
              onClick={bookAppointment}
              className={`w-full py-4 mt-6 rounded-2xl font-bold text-white text-lg
                transition-all duration-300 flex items-center justify-center gap-2 ${
                  outOfTimeRange || booking
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] hover:shadow-xl shadow-lg"
                }`}
            >
              {booking ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Booking...
                </>
              ) : outOfTimeRange ? (
                "Fully Booked"
              ) : (
                "✓ Confirm Appointment"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
