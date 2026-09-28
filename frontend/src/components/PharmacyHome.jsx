
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Navbar from "./Navbar";

export default function PharmacyHome() {
  const navigate = useNavigate();
  const [pharmacyData, setPharmacyData] = useState(null);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch Pharmacy Data & Stats from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
          return;
        }

        // 1. Fetch pharmacy profile from 'pharmacies' collection
        const pharmacyDoc = await getDoc(doc(db, "pharmacies", user.uid));
        if (pharmacyDoc.exists()) {
          setPharmacyData(pharmacyDoc.data());
        } else {
          // Fallback to users collection if pharmacy doc doesn't exist
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setPharmacyData(userDoc.data());
          }
        }

        // 2. Fetch inventory stats
        const inventoryQuery = query(
          collection(db, "pharmacy_inventory"),
          where("pharmacyId", "==", user.uid)
        );
        const inventorySnap = await getDocs(inventoryQuery);

        let totalItems = 0;
        let lowStock = 0;
        let outOfStock = 0;

        inventorySnap.forEach((doc) => {
          const item = doc.data();
          totalItems++;
          if (item.stock === 0) outOfStock++;
          else if (item.stock <= 10) lowStock++;
        });

        setStats({ totalItems, lowStock, outOfStock });
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-teal-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-600 animate-spin"></div>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">
            Loading pharmacy dashboard...
          </p>
        </div>
      </div>
    );

  const pharmacyName = pharmacyData?.name || "Pharmacy";
  const isProfileComplete = pharmacyData?.address && pharmacyData?.phone;

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        {/* Profile Incomplete Warning - Modern */}
        {!isProfileComplete && (
          <div className="animate-fade-in-up mb-6">
            <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-amber-400 to-orange-400">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-[calc(1rem-2px)] p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-xl shadow-lg shadow-amber-500/30">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div>
                    <p className="font-bold text-amber-800">
                      Complete your store profile
                    </p>
                    <p className="text-amber-700 text-sm">
                      Add address and contact info so customers can find you.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/pharmacy/profile")}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-semibold 
                             shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                  Complete Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section - Animated Gradient */}
        <div className="relative rounded-[2rem] p-10 text-white shadow-2xl mb-10 overflow-hidden bg-gradient-hero animate-fade-in-up">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float delay-200" />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-bounce-subtle">
                <span className="text-3xl">🏥</span>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">
                  Welcome back
                </p>
                <h1 className="text-4xl font-bold tracking-tight">
                  {pharmacyName}
                </h1>
              </div>
            </div>
            <p className="text-white/80 text-lg mt-4 max-w-lg">
              Manage your inventory and help customers find medicines nearby.
            </p>
            {pharmacyData?.address && (
              <p className="text-white/60 text-sm mt-3 flex items-center gap-2">
                <span>📍</span> {pharmacyData.address.substring(0, 60)}...
              </p>
            )}
          </div>
        </div>

        {/* Live Stats - Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-100">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/30">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  Total Medicines
                </p>
                <p className="text-3xl font-bold text-slate-800">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-200">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg shadow-amber-500/30">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  Low Stock (≤10)
                </p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats.lowStock}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 animate-fade-in-up delay-300">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-red-400 to-rose-500 p-4 rounded-2xl shadow-lg shadow-red-500/30">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  Out of Stock
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.outOfStock}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Modern Cards */}
        <h2 className="text-slate-800 font-bold text-xl mb-6 animate-fade-in-up delay-400">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manage Inventory */}
          <div
            onClick={() => navigate("/pharmacy/inventory")}
            className="group cursor-pointer animate-fade-in-up delay-400"
          >
            <div
              className="relative rounded-3xl p-[2px] bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-500 
                            shadow-lg shadow-teal-500/20 transition-all duration-500 
                            group-hover:shadow-xl group-hover:shadow-teal-500/30 group-hover:scale-[1.02]"
            >
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-7 h-full relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-0 
                                group-hover:opacity-100 transition-opacity duration-500"
                ></div>
                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-teal-500 to-cyan-500 w-16 h-16 rounded-2xl 
                                  flex items-center justify-center mb-5 shadow-lg shadow-teal-500/30
                                  group-hover:scale-110 transition-transform duration-500"
                  >
                    <span className="text-3xl">💊</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Manage Inventory
                  </h3>
                  <p className="text-slate-600 text-sm mb-5">
                    Add medicines, update prices, or remove expired items.
                  </p>
                  <div className="flex items-center text-teal-600 font-semibold text-sm group-hover:gap-3 gap-1 transition-all duration-300">
                    <span>Open Inventory</span>
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

          {/* AI Scanner */}
          <div
            onClick={() => navigate("/inventory-scanner")}
            className="group cursor-pointer animate-fade-in-up delay-500"
          >
            <div
              className="relative rounded-3xl p-[2px] bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500 
                            shadow-lg shadow-indigo-500/20 transition-all duration-500 
                            group-hover:shadow-xl group-hover:shadow-indigo-500/30 group-hover:scale-[1.02]"
            >
              <div className="bg-white rounded-[calc(1.5rem-2px)] p-7 h-full relative overflow-hidden">
                <div
                  className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 
                                group-hover:opacity-100 transition-opacity duration-500"
                ></div>
                <div className="relative z-10">
                  <div
                    className="bg-gradient-to-br from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl 
                                  flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30
                                  group-hover:scale-110 transition-transform duration-500"
                  >
                    <span className="text-3xl">📸</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    AI Scanner
                  </h3>
                  <p className="text-slate-600 text-sm mb-5">
                    Scan packages with AI to auto-add to inventory.
                  </p>
                  <div className="flex items-center text-indigo-600 font-semibold text-sm group-hover:gap-3 gap-1 transition-all duration-300">
                    <span>Open Scanner</span>
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

          {/* Store Profile */}
          <div
            onClick={() => navigate("/pharmacy/profile")}
            className="group cursor-pointer animate-fade-in-up delay-500"
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
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Store Profile
                  </h3>
                  <p className="text-slate-600 text-sm mb-5">
                    Update shop timings, address, and contact details.
                  </p>
                  <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:gap-3 gap-1 transition-all duration-300">
                    <span>Edit Settings</span>
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

        {/* Pro Tip Footer - Glass */}
        <div className="mt-12 animate-fade-in-up delay-500">
          <div className="glass-card rounded-2xl p-5 flex items-start gap-4 border-l-4 border-teal-500">
            <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-3 rounded-xl shadow-lg">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h4 className="font-bold text-teal-800">Did you know?</h4>
              <p className="text-sm text-teal-700 mt-1">
                Keeping your stock updated increases your visibility in "Find
                Medicines" search results by 40%.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
