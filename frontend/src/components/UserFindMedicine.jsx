import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import OSMMapView from "./OSMMapView";
import Navbar from "./Navbar";
import { useLocationContext } from "../context/LocationContext.jsx";

const UserFindMedicine = () => {
  const navigate = useNavigate();
  const { location: ctxLocation, accuracy: ctxAccuracy, refreshLocation } = useLocationContext();
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locVersion, setLocVersion] = useState(0); // bumps when location updates
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nearbyPharmacies, setNearbyPharmacies] = useState([]);
  const [nearbyClinics, setNearbyClinics] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [locationError, setLocationError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // New states for clinic search
  const [searchType, setSearchType] = useState("medicine"); // "medicine" or "clinic"
  const [selectedPlace, setSelectedPlace] = useState(null);

  // 📍 Use global precise location when available
  useEffect(() => {
    if (ctxLocation) {
      setUserLocation(ctxLocation);
      setAccuracy(ctxAccuracy);
      setLocationError(null);
      setLocVersion((v) => v + 1);
    }
  }, [ctxLocation, ctxAccuracy]);

  // Kick off a fresh location fetch on mount if none is present
  useEffect(() => {
    if (!ctxLocation) {
      refreshLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: attempt a fresh location before searching; waits briefly for an update
  const ensureFreshLocation = async () => {
    const prevVersion = locVersion;
    refreshLocation();
    // wait up to 2 seconds for a new location reading
    const maxWaitMs = 2000;
    const pollInterval = 100;
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (Date.now() - start < maxWaitMs) {
      // If location updated, stop waiting
      if (locVersion !== prevVersion) break;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  };

  // Calculate distance between two coordinates (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🔍 Search medicine → pharmacy users
  const handleSearch = async () => {
    // Allow empty search only for clinics (show all clinics)
    if (!search && searchType === "medicine") return;

    // Try to refresh location just before searching
    await ensureFreshLocation();

    setLoading(true);
    setPlaces([]);
    setNotFound(false);
    setSelectedPlace(null);

    try {
      if (searchType === "medicine") {
        await searchMedicine();
      } else {
        await searchClinic();
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search for medicine in pharmacies
  const searchMedicine = async () => {
    // If search is empty, fetch all pharmacy inventory items and group by pharmacy
    const term = search.toLowerCase().trim();
    if (!term) {
      const invQueryAll = query(
        collection(db, "pharmacy_inventory"),
        where("stock", ">", 0)
      );

      const inventorySnap = await getDocs(invQueryAll);
      if (inventorySnap.empty) {
        setNotFound(true);
        return;
      }

      // Aggregate medicines per pharmacy
      const map = new Map();
      for (const docSnap of inventorySnap.docs) {
        const item = docSnap.data();
        try {
          const userSnap = await getDoc(doc(db, "users", item.pharmacyId));
          if (!userSnap.exists() || userSnap.data().role !== "pharmacy")
            continue;
          const pharmacy = userSnap.data();
          // Check if profile is completed
          if (!pharmacy.isProfileCompleted) continue;
          if (!pharmacy.lat || !pharmacy.lng) continue;

          const existing = map.get(item.pharmacyId) || {
            id: item.pharmacyId,
            lat: pharmacy.lat,
            lon: pharmacy.lng,
            name: pharmacy.name,
            address: pharmacy.address || "Address not available",
            isOpen: pharmacy.isOpen,
            medicines: [],
          };

          existing.medicines.push({
            name: item.name,
            price: item.price,
            dosage: item.dosage,
            type: item.type,
          });
          map.set(item.pharmacyId, existing);
        } catch (err) {
          console.error("Error fetching pharmacy for inventory", err);
          continue;
        }
      }

      const results = Array.from(map.values()).map((pharmacy) => {
        const distance = userLocation
          ? calculateDistance(
              userLocation[0],
              userLocation[1],
              pharmacy.lat,
              pharmacy.lon
            )
          : Infinity;
        return { ...pharmacy, distance, placeType: "pharmacy" };
      });

      if (results.length === 0) {
        setNotFound(true);
      } else {
        results.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
        );
      }

      setPlaces(results);
      return;
    }

    // 1️⃣ Search inventory by name
    const invQuery = query(
      collection(db, "pharmacy_inventory"),
      where("name_lower", ">=", term),
      where("name_lower", "<=", term + "\uf8ff"),
      where("stock", ">", 0)
    );

    const inventorySnap = await getDocs(invQuery);

    if (inventorySnap.empty) {
      setNotFound(true);
      return;
    }

    // 2️⃣ Fetch pharmacy users for matched items
    const pharmacyPromises = inventorySnap.docs.map(async (docSnap) => {
      const item = docSnap.data();
      const userSnap = await getDoc(doc(db, "users", item.pharmacyId));
      if (userSnap.exists() && userSnap.data().role === "pharmacy") {
        const pharmacy = userSnap.data();
        // Check if profile is completed
        if (!pharmacy.isProfileCompleted) return null;
        if (!pharmacy.lat || !pharmacy.lng) return null;

        const distance = userLocation
          ? calculateDistance(
              userLocation[0],
              userLocation[1],
              pharmacy.lat,
              pharmacy.lng
            )
          : Infinity;

        return {
          id: item.pharmacyId,
          lat: pharmacy.lat,
          lon: pharmacy.lng,
          name: pharmacy.name,
          address: pharmacy.address || "Address not available",
          medicine: item.name,
          price: item.price,
          dosage: item.dosage,
          type: item.type,
          isOpen: pharmacy.isOpen,
          distance: distance,
          placeType: "pharmacy",
        };
      }
      return null;
    });

    const results = await Promise.all(pharmacyPromises);
    const validResults = results.filter(Boolean);

    if (validResults.length === 0) {
      setNotFound(true);
    } else {
      // Sort by distance (nearest first)
      validResults.sort((a, b) => a.distance - b.distance);
    }
    setPlaces(validResults);
  };

  // Fetch nearby pharmacies without any search (grouped by pharmacy)
  const fetchNearbyPharmacies = async () => {
    try {
      const invQueryAll = query(
        collection(db, "pharmacy_inventory"),
        where("stock", ">", 0)
      );

      const inventorySnap = await getDocs(invQueryAll);
      if (inventorySnap.empty) {
        setNearbyPharmacies([]);
        return;
      }

      const map = new Map();
      for (const docSnap of inventorySnap.docs) {
        const item = docSnap.data();
        try {
          const userSnap = await getDoc(doc(db, "users", item.pharmacyId));
          if (!userSnap.exists() || userSnap.data().role !== "pharmacy")
            continue;
          const pharmacy = userSnap.data();
          if (!pharmacy.isProfileCompleted) continue;
          if (!pharmacy.lat || !pharmacy.lng) continue;

          const existing = map.get(item.pharmacyId) || {
            id: item.pharmacyId,
            lat: pharmacy.lat,
            lon: pharmacy.lng,
            name: pharmacy.name,
            address: pharmacy.address || "Address not available",
            isOpen: pharmacy.isOpen,
            medicines: [],
            placeType: "pharmacy",
          };

          existing.medicines.push({
            name: item.name,
            price: item.price,
            dosage: item.dosage,
            type: item.type,
          });
          map.set(item.pharmacyId, existing);
        } catch (err) {
          console.error("Error fetching pharmacy for inventory", err);
          continue;
        }
      }

      const results = Array.from(map.values()).map((pharmacy) => {
        const distance = userLocation
          ? calculateDistance(
              userLocation[0],
              userLocation[1],
              pharmacy.lat,
              pharmacy.lon
            )
          : Infinity;
        return { ...pharmacy, distance };
      });

      results.sort(
        (a, b) => (a.distance || Infinity) - (b.distance || Infinity)
      );
      setNearbyPharmacies(results);
    } catch (error) {
      console.error("Nearby pharmacies fetch error:", error);
      setNearbyPharmacies([]);
    }
  };

  // Search for clinics by doctor name or clinic name
  const searchClinic = async () => {
    if (!userLocation) {
      console.error("User location not available");
      setNotFound(true);
      return;
    }

    const searchTerm = search.toLowerCase().trim();

    // Get all users with role "clinic"
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", "clinic")
    );

    const usersSnap = await getDocs(usersQuery);

    if (usersSnap.empty) {
      console.log("No clinic users found in database");
      setNotFound(true);
      return;
    }

    console.log(`Found ${usersSnap.docs.length} clinic users`);

    // Filter and process clinic data
    const clinicPromises = usersSnap.docs.map(async (userDoc) => {
      const userData = userDoc.data();
      const clinicId = userDoc.id;

      // Check if clinic name or doctor name matches search
      const doctorName = (userData.name || "").toLowerCase();
      const clinicNameFromUser = (userData.clinicName || "").toLowerCase();

      // Fetch clinic details
      const clinicSnap = await getDoc(doc(db, "clinics", clinicId));

      let clinicData = null;
      if (clinicSnap.exists()) {
        clinicData = clinicSnap.data();
      }

      const clinicName = clinicData?.name || userData.clinicName || "";
      const clinicNameLower = clinicName.toLowerCase();

      // Match against search term
      const matchesSearch =
        doctorName.includes(searchTerm) ||
        clinicNameLower.includes(searchTerm) ||
        clinicNameFromUser.includes(searchTerm);

      if (!matchesSearch) return null;

      // Get location from clinic data or user data
      const lat = clinicData?.lat || userData.lat;
      const lng = clinicData?.lng || userData.lng;

      // Check if location data exists
      if (!lat || !lng) {
        console.log(`Clinic ${clinicId} has no location data`);
        return null;
      }

      const distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        lat,
        lng
      );

      return {
        id: clinicId,
        lat: lat,
        lon: lng,
        name: clinicName || userData.name,
        doctorName: userData.name,
        address:
          clinicData?.address || userData.address || "Address not available",
        fees: clinicData?.fees || userData.fees,
        openTime: clinicData?.openTime || userData.openTime,
        closeTime: clinicData?.closeTime || userData.closeTime,
        distance: distance,
        placeType: "clinic",
      };
    });

    const results = await Promise.all(clinicPromises);
    const validResults = results.filter(Boolean);

    console.log(`Found ${validResults.length} clinics matching search`);

    if (validResults.length === 0) {
      setNotFound(true);
    } else {
      // Sort by distance (nearest first)
      validResults.sort((a, b) => a.distance - b.distance);
    }
    setPlaces(validResults);
  };

  // Fetch all clinics near user without search
  const fetchNearbyClinics = async () => {
    if (!userLocation) return;

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("role", "==", "clinic")
      );

      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        setNearbyClinics([]);
        return;
      }

      const clinicPromises = usersSnap.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const clinicId = userDoc.id;

        const clinicSnap = await getDoc(doc(db, "clinics", clinicId));
        const clinicData = clinicSnap.exists() ? clinicSnap.data() : null;

        const lat = clinicData?.lat || userData.lat;
        const lng = clinicData?.lng || userData.lng;
        if (!lat || !lng) return null;

        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          lat,
          lng
        );

        return {
          id: clinicId,
          lat,
          lon: lng,
          name: clinicData?.name || userData.clinicName || userData.name,
          doctorName: userData.name,
          address:
            clinicData?.address || userData.address || "Address not available",
          fees: clinicData?.fees || userData.fees,
          openTime: clinicData?.openTime || userData.openTime,
          closeTime: clinicData?.closeTime || userData.closeTime,
          distance,
          placeType: "clinic",
        };
      });

      const results = (await Promise.all(clinicPromises)).filter(Boolean);
      results.sort((a, b) => a.distance - b.distance);
      setNearbyClinics(results);
    } catch (error) {
      console.error("Nearby clinics fetch error:", error);
      setNearbyClinics([]);
    }
  };

  // Auto-search clinics (show all) when switching to clinic search and user location is available
  useEffect(() => {
    if (searchType === "clinic" && userLocation) {
      // If user hasn't entered a search term, fetch all clinics sorted by distance
      if (!search || search.trim() === "") {
        (async () => {
          setLoading(true);
          setPlaces([]);
          setNotFound(false);
          try {
            await searchClinic();
          } catch (err) {
            console.error("Auto search clinic error:", err);
          } finally {
            setLoading(false);
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType, userLocation]);

  // Auto-search pharmacies when switching to medicine search and user location is available
  useEffect(() => {
    if (searchType === "medicine" && userLocation) {
      if (!search || search.trim() === "") {
        (async () => {
          setLoading(true);
          setPlaces([]);
          setNotFound(false);
          try {
            await searchMedicine();
          } catch (err) {
            console.error("Auto search medicine error:", err);
          } finally {
            setLoading(false);
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType, userLocation]);

  // Auto-fetch nearby clinics and pharmacies on location available (no search)
  useEffect(() => {
    if (!userLocation) return;
    (async () => {
      try {
        setNearbyLoading(true);
        await Promise.all([fetchNearbyPharmacies(), fetchNearbyClinics()]);
      } catch (e) {
        console.error("Auto nearby fetch error:", e);
      } finally {
        setNearbyLoading(false);
      }
    })();
  }, [userLocation]);

  // Handle clicking on a place to show route
  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
  };

  // Handle booking appointment for a clinic
  const handleBookAppointment = (clinicId) => {
    navigate(`/book-appointment/${clinicId}`);
  };

  if (locationError) {
    return (
      <div className="min-h-screen bg-mesh">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-red-500 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
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
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Location Required</h3>
                <p className="text-slate-600 text-sm">{locationError}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userLocation)
    return (
      <div className="min-h-screen bg-mesh">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 font-medium">
            Fetching your location...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero Header */}
        <div className="relative mb-6 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-teal-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Find Healthcare
                </h1>
                <p className="text-slate-500 text-sm">
                  Search for medicines and nearby clinics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Type Toggle */}
        <div
          className="mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.05s" }}
        >
          <div className="glass-card rounded-2xl p-4 flex gap-3">
            <button
              onClick={() => setSearchType("medicine")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                searchType === "medicine"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>💊</span> Search Medicine
            </button>
            <button
              onClick={() => setSearchType("clinic")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                searchType === "clinic"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🏥</span> Search Clinic
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div
          className="mb-6 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="relative flex">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder={
                searchType === "medicine"
                  ? "Search medicine (e.g. Oxitocin)"
                  : "Search by doctor or clinic name..."
              }
              className="flex-1 pl-12 pr-4 py-4 rounded-l-2xl border-2 border-r-0 border-slate-200 
                         bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 
                         focus:border-blue-500 text-slate-800 placeholder-slate-400 font-medium transition-all"
            />
            <button
              onClick={handleSearch}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold 
                         rounded-r-2xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg 
                         hover:shadow-blue-500/25 flex items-center gap-2"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </button>
            <button
              onClick={refreshLocation}
              className="ml-3 px-4 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-2xl hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              Use Current Location
            </button>
          </div>
          {accuracy && (
            <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
                🎯 Accuracy: {accuracy.toFixed(0)} m
              </span>
              <button
                onClick={refreshLocation}
                className="text-blue-600 font-semibold hover:underline"
              >
                Improve accuracy
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="glass-card rounded-2xl p-6 mb-6 flex items-center justify-center gap-3 animate-pulse">
            <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-slate-600 font-medium">
              Finding nearby{" "}
              {searchType === "medicine" ? "pharmacies" : "clinics"}...
            </span>
          </div>
        )}

        {/* Not Found Message */}
        {notFound && !loading && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-l-4 border-amber-400 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔎</span>
              <div>
                <p className="font-bold text-slate-800">
                  {searchType === "medicine"
                    ? "Medicine Not Available"
                    : "No Clinics Found"}
                </p>
                <p className="text-slate-600 text-sm">
                  {searchType === "medicine"
                    ? `No pharmacies found with "${search.trim()}" in stock nearby.`
                    : `No clinics found matching "${search.trim()}".`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two-column layout: results left, map right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Results */}
          <div className="order-2 md:order-1 glass-card rounded-2xl p-4" style={{ height: "70vh", overflowY: "auto" }}>
            {nearbyLoading && (
              <div className="glass-card rounded-2xl p-6 mb-6 flex items-center justify-center gap-3 animate-pulse">
                <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                <span className="text-slate-600 font-medium">Loading nearby clinics and pharmacies...</span>
              </div>
            )}

            {/* Search results (if any) */}
            {places.length > 0 ? (
              <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{searchType === "medicine" ? "💊" : "🏥"}</span>
                  <h3 className="text-lg font-bold text-slate-800">
                    {searchType === "medicine"
                      ? `Pharmacies with ${search.trim() || "medicines"}:`
                      : `Clinics ${search.trim() ? `matching "${search.trim()}"` : "near you"}:`}
                  </h3>
                  <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{places.length} found</span>
                </div>
                <div className="grid gap-4">
                  {places.map((p, index) => (
                    <div
                      key={p.id}
                      className={`group relative glass-card rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in-up cursor-pointer ${selectedPlace?.id === p.id ? "ring-2 ring-blue-500 shadow-xl" : "hover:shadow-xl"}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => handlePlaceClick(p)}
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow ${p.placeType === "pharmacy" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-teal-500 to-emerald-500"}`}>{p.placeType === "pharmacy" ? "💊" : "🏥"}</div>
                              <div>
                                <h4 className="font-bold text-slate-800">{p.name}</h4>
                                {p.placeType === "clinic" && p.doctorName && (
                                  <p className="text-sm text-teal-600 font-medium">Dr. {p.doctorName}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-semibold border border-cyan-200">
                                📍 {p.distance < 1 ? `${(p.distance * 1000).toFixed(0)} m` : `${p.distance.toFixed(1)} km`}
                              </span>

                              {p.placeType === "pharmacy" && (
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${p.isOpen ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{p.isOpen ? "✓ Open" : "✕ Closed"}</span>
                              )}

                              {p.placeType === "clinic" && p.openTime && p.closeTime && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold border border-violet-200">🕒 {p.openTime} - {p.closeTime}</span>
                              )}

                              {p.placeType === "clinic" && p.fees && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">💰 ₹{p.fees}</span>
                              )}
                            </div>

                            <p className="text-sm text-slate-500 mb-2 flex items-start gap-1">
                              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {p.address}
                            </p>

                            {p.placeType === "pharmacy" && p.medicines && (
                              <div className="flex flex-wrap gap-2">
                                {p.medicines.slice(0, 3).map((m, i) => (
                                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                    {m.name}
                                    {m.dosage ? ` ${m.dosage}mg` : ""} - ₹{m.price}
                                  </span>
                                ))}
                                {p.medicines.length > 3 && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">+{p.medicines.length - 3} more</span>
                                )}
                              </div>
                            )}

                            {p.placeType === "pharmacy" && !p.medicines && p.medicine && (
                              <div className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs inline-block">
                                {p.medicine} - {p.type} - {p.dosage}mg - ₹{p.price}
                              </div>
                            )}

                            {selectedPlace?.id === p.id && (
                              <div className="mt-3 text-sm text-blue-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                Route shown on map
                              </div>
                            )}
                          </div>
                        </div>

                        {p.placeType === "clinic" && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookAppointment(p.id);
                              }}
                              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Book Appointment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Nearby Pharmacies */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">💊</span>
                    <h3 className="text-lg font-bold text-slate-800">Nearby Pharmacies</h3>
                    <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{nearbyPharmacies.length} found</span>
                  </div>
                  <div className="grid gap-4">
                    {nearbyPharmacies.map((p, index) => (
                      <div
                        key={p.id}
                        className={`group relative glass-card rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in-up cursor-pointer ${selectedPlace?.id === p.id ? "ring-2 ring-blue-500 shadow-xl" : "hover:shadow-xl"}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => handlePlaceClick(p)}
                      >
                        <div className="p-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow bg-gradient-to-br from-blue-500 to-blue-600">💊</div>
                                <div>
                                  <h4 className="font-bold text-slate-800">{p.name}</h4>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-semibold border border-cyan-200">📍 {p.distance < 1 ? `${(p.distance * 1000).toFixed(0)} m` : `${p.distance.toFixed(1)} km`}</span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${p.isOpen ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>{p.isOpen ? "✓ Open" : "✕ Closed"}</span>
                              </div>

                              <p className="text-sm text-slate-500 mb-2 flex items-start gap-1">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {p.address}
                              </p>

                              {p.medicines && (
                                <div className="flex flex-wrap gap-2">
                                  {p.medicines.slice(0, 3).map((m, i) => (
                                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                                      {m.name}
                                      {m.dosage ? ` ${m.dosage}mg` : ""} - ₹{m.price}
                                    </span>
                                  ))}
                                  {p.medicines.length > 3 && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">+{p.medicines.length - 3} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nearby Clinics */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🏥</span>
                    <h3 className="text-lg font-bold text-slate-800">Nearby Clinics</h3>
                    <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{nearbyClinics.length} found</span>
                  </div>
                  <div className="grid gap-4">
                    {nearbyClinics.map((p, index) => (
                      <div
                        key={p.id}
                        className={`group relative glass-card rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in-up cursor-pointer ${selectedPlace?.id === p.id ? "ring-2 ring-blue-500 shadow-xl" : "hover:shadow-xl"}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onClick={() => handlePlaceClick(p)}
                      >
                        <div className="p-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow bg-gradient-to-br from-teal-500 to-emerald-500">🏥</div>
                                <div>
                                  <h4 className="font-bold text-slate-800">{p.name}</h4>
                                  {p.doctorName && (
                                    <p className="text-sm text-teal-600 font-medium">Dr. {p.doctorName}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-semibold border border-cyan-200">📍 {p.distance < 1 ? `${(p.distance * 1000).toFixed(0)} m` : `${p.distance.toFixed(1)} km`}</span>
                                {p.openTime && p.closeTime && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold border border-violet-200">🕒 {p.openTime} - {p.closeTime}</span>
                                )}
                                {p.fees && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">💰 ₹{p.fees}</span>
                                )}
                              </div>

                              <p className="text-sm text-slate-500 mb-2 flex items-start gap-1">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {p.address}
                              </p>

                              <div className="mt-4 pt-4 border-t border-slate-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookAppointment(p.id);
                                  }}
                                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Book Appointment
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div className="order-1 md:order-2 md:sticky md:top-24">
            <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-white/50 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <div style={{ height: "70vh" }}>
                <OSMMapView
                  userLocation={userLocation}
                  pharmacies={places.length > 0 ? places : [...nearbyPharmacies, ...nearbyClinics]}
                  accuracy={accuracy}
                  selectedPlace={selectedPlace}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFindMedicine;