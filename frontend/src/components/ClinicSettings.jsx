import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function ClinicSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    address: "",
    fees: "",
    openTime: "",
    closeTime: "",
    avgTimePerPatient: "10",
    lat: null,
    lng: null,
  });

  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const fetchClinicProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      const clinicRef = doc(db, "clinics", user.uid);
      const snap = await getDoc(clinicRef);

      if (snap.exists()) {
        setForm((prev) => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    };

    fetchClinicProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const saveChanges = async () => {
    const clinicRef = doc(db, "clinics", auth.currentUser.uid);

    await setDoc(
      clinicRef,
      {
        ...form,
        name_lower: form.name.toLowerCase().trim(),
        fees: Number(form.fees),
        avgTimePerPatient: Number(form.avgTimePerPatient),
        lat: form.lat,
        lng: form.lng,
        ownerId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    alert("Clinic profile updated");
  };

  const getLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setGettingLocation(false);
        alert("Location captured successfully!");
      },
      (err) => {
        console.error("Location error:", err);
        alert("Failed to get location. Please enable location services.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium animate-pulse">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Header */}
        <div className="relative mb-6 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Clinic Settings
                </h1>
                <p className="text-slate-500 text-sm">
                  Manage your clinic information and availability
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div
          className="glass-card rounded-3xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Form */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-sm">
                  📋
                </span>
                Basic Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Clinic Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter clinic name"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                             focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Clinic Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter complete address with landmark"
                  rows="2"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                             focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all"
                  required
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-sm">
                  📍
                </span>
                Location
              </h2>

              <button
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className={`w-full p-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
                  ${
                    form.lat && form.lng
                      ? "bg-emerald-50 border-2 border-emerald-300 text-emerald-700"
                      : "bg-cyan-50 border-2 border-cyan-300 text-cyan-700"
                  }
                  ${
                    gettingLocation
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:shadow-lg hover:scale-[1.01]"
                  }
                `}
              >
                {gettingLocation ? (
                  <>
                    <div className="w-5 h-5 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin"></div>
                    Getting Location...
                  </>
                ) : form.lat && form.lng ? (
                  <>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Location Captured ({form.lat.toFixed(4)},{" "}
                    {form.lng.toFixed(4)})
                  </>
                ) : (
                  <>
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
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                    </svg>
                    Click to Capture Clinic Location
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500 flex items-center gap-1">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Location helps patients find your clinic on the map
              </p>
            </div>

            {/* Fees & Timing Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm">
                  💰
                </span>
                Fees & Timing
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Consultation Fees (₹){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="fees"
                    type="number"
                    value={form.fees}
                    onChange={handleChange}
                    placeholder="e.g., 500"
                    min="0"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                               focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Avg Time per Patient (min){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="avgTimePerPatient"
                    type="number"
                    value={form.avgTimePerPatient}
                    onChange={handleChange}
                    placeholder="e.g., 10"
                    min="5"
                    max="60"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                               focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm">
                  🕒
                </span>
                Operating Hours
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Opening Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="openTime"
                    type="time"
                    value={form.openTime}
                    onChange={handleChange}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                               focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Closing Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="closeTime"
                    type="time"
                    value={form.closeTime}
                    onChange={handleChange}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3
                               focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={saveChanges}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600
                           text-white px-6 py-4 rounded-xl font-bold
                           shadow-lg hover:shadow-xl hover:shadow-violet-500/25 
                           hover:scale-[1.02] active:scale-[0.98] transition-all
                           flex items-center justify-center gap-2"
              >
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
