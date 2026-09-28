import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import "./auth.css";

function RoleSelection() {
  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locationMethod, setLocationMethod] = useState("address"); // "address" or "gps"

  const [form, setForm] = useState({
    role: "",
    name: currentUser?.displayName || currentUser?.name || "",
    phone: "",
    // Pharmacy-specific fields
    address: "",
    lat: null,
    lng: null,
    // Clinic-specific fields
    specialization: "",
    clinicName: "",
  });

  // Geocode address to coordinates using OpenStreetMap Nominatim
  const geocodeAddress = async (address) => {
    if (!address.trim()) return null;

    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`,
        {
          headers: {
            "User-Agent": "NearCare-App",
          },
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  // Get user's GPS location
  const getLocation = () => {
    setLocationStatus("Getting your location...");

    if (!navigator.geolocation) {
      setLocationStatus("Geolocation not supported. Please enter address.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setLocationStatus(
          `✅ GPS Location: ${pos.coords.latitude.toFixed(
            4
          )}, ${pos.coords.longitude.toFixed(4)}`
        );
      },
      (err) => {
        console.error("Geolocation error:", err);
        setLocationStatus(
          "⚠️ Could not get GPS location. Please enter address."
        );
        if (form.role === "pharmacy") {
          setLocationMethod("address");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Get location for clinic when role changes
  useEffect(() => {
    if (form.role === "clinic") {
      getLocation();
    }
  }, [form.role]);

  // Get GPS location for pharmacy when method changes to GPS
  useEffect(() => {
    if (form.role === "pharmacy" && locationMethod === "gps") {
      getLocation();
    }
  }, [form.role, locationMethod]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (!form.role) {
      setError("Please select a role");
      setIsLoading(false);
      return;
    }

    if (!form.name.trim()) {
      setError("Please enter your name");
      setIsLoading(false);
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number");
      setIsLoading(false);
      return;
    }

    if (form.role === "pharmacy" && !form.address.trim()) {
      setError("Please enter your pharmacy address");
      setIsLoading(false);
      return;
    }

    if (form.role === "clinic" && !form.clinicName.trim()) {
      setError("Please enter your clinic name");
      setIsLoading(false);
      return;
    }

    try {
      let finalLat = form.lat;
      let finalLng = form.lng;

      // For pharmacy with address method, geocode the address
      if (form.role === "pharmacy" && locationMethod === "address") {
        setLocationStatus("Finding location from address...");
        const geocoded = await geocodeAddress(form.address);
        if (!geocoded) {
          setError(
            "Could not find location for this address. Please check the address or use GPS."
          );
          setIsLoading(false);
          return;
        }
        finalLat = geocoded.lat;
        finalLng = geocoded.lng;
        setLocationStatus(`✅ Found: ${geocoded.displayName}`);
      }

      // For clinic, we need GPS location
      if (form.role === "clinic" && (!finalLat || !finalLng)) {
        setError(
          "Location is required for clinics. Please allow location access."
        );
        setIsLoading(false);
        return;
      }

      const docRef = doc(db, "users", currentUser.uid);

      // Base data for all roles
      let userData = {
        uid: currentUser.uid,
        name: form.name.trim(),
        email: currentUser.email,
        role: form.role,
        phone: form.phone.trim(),
        updatedAt: new Date(),
      };

      // Add role-specific fields
      if (form.role === "pharmacy") {
        userData = {
          ...userData,
          address: form.address.trim(),
          lat: finalLat || 25.4358,
          lng: finalLng || 81.8463,
          isOpen: true,
          currentToken: 0,
        };
      } else if (form.role === "clinic") {
        userData = {
          ...userData,
          clinicName: form.clinicName.trim(),
          specialization: form.specialization.trim(),
          lat: finalLat || 25.4358,
          lng: finalLng || 81.8463,
        };
      } else if (form.role === "user") {
        // User can optionally have location
        if (finalLat && finalLng) {
          userData.lat = finalLat;
          userData.lng = finalLng;
        }
      }

      await setDoc(docRef, userData, { merge: true });

      // Refresh auth context to get updated role
      await refreshUser();

      // Navigate to appropriate dashboard
      if (form.role === "clinic") {
        navigate("/doctor-dashboard");
      } else if (form.role === "pharmacy") {
        navigate("/pharmacy-dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card role-selection-form" onSubmit={handleSubmit}>
        <h2>Complete Your Profile</h2>
        <p className="auth-subtitle">
          Select your role and provide additional details to get started
        </p>

        {error && (
          <div className="error-message">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Role Selection Cards */}
        <label className="section-label">I am a...</label>
        <div className="role-cards">
          <div
            className={`role-card ${form.role === "user" ? "selected" : ""}`}
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                role: "user",
                lat: null,
                lng: null,
              }));
              setLocationStatus("");
              setLocationMethod("address");
            }}
          >
            <div className="role-icon">👤</div>
            <div className="role-name">Patient</div>
            <div className="role-desc">Find medicines & book appointments</div>
          </div>

          <div
            className={`role-card ${form.role === "clinic" ? "selected" : ""}`}
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                role: "clinic",
                lat: null,
                lng: null,
              }));
              setLocationStatus("");
            }}
          >
            <div className="role-icon">🏥</div>
            <div className="role-name">Doctor</div>
            <div className="role-desc">Manage your clinic & patients</div>
          </div>

          <div
            className={`role-card ${
              form.role === "pharmacy" ? "selected" : ""
            }`}
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                role: "pharmacy",
                lat: null,
                lng: null,
              }));
              setLocationStatus("");
              setLocationMethod("address");
            }}
          >
            <div className="role-icon">💊</div>
            <div className="role-name">Pharmacy</div>
            <div className="role-desc">List your medicines & inventory</div>
          </div>
        </div>

        {/* Common Fields */}
        <div className="form-group">
          <label>
            <svg
              className="inline w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {form.role === "pharmacy" ? "Pharmacy Name" : "Full Name"} *
          </label>
          <input
            type="text"
            name="name"
            placeholder={
              form.role === "pharmacy"
                ? "Enter pharmacy name"
                : "Enter your full name"
            }
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>
            <svg
              className="inline w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="Enter phone number"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>

        {/* Clinic-specific Fields */}
        {form.role === "clinic" && (
          <>
            <div className="form-group">
              <label>
                <svg
                  className="inline w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Clinic Name *
              </label>
              <input
                type="text"
                name="clinicName"
                placeholder="Enter clinic name"
                value={form.clinicName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <svg
                  className="inline w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Specialization
              </label>
              <input
                type="text"
                name="specialization"
                placeholder="e.g., General Physician, Dentist, etc."
                value={form.specialization}
                onChange={handleChange}
              />
            </div>

            <div className="location-info-box">
              <div className="location-status">
                📍 {locationStatus || "Getting your clinic location..."}
              </div>
              <button
                type="button"
                onClick={getLocation}
                className="refresh-location-btn"
              >
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh location
              </button>
            </div>
          </>
        )}

        {/* Pharmacy-specific Fields */}
        {form.role === "pharmacy" && (
          <>
            <div className="form-group">
              <label>
                <svg
                  className="inline w-4 h-4 mr-1"
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
                Pharmacy Address *
              </label>
              <input
                type="text"
                name="address"
                placeholder="Enter full address (e.g., 123 Main St, City, State)"
                value={form.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Location Method Toggle */}
            <div className="location-method-box">
              <p className="location-method-label">
                How should we get your location?
              </p>
              <div className="location-method-buttons">
                <button
                  type="button"
                  onClick={() => setLocationMethod("address")}
                  className={`location-method-btn ${
                    locationMethod === "address" ? "active" : ""
                  }`}
                >
                  📍 From Address
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMethod("gps")}
                  className={`location-method-btn ${
                    locationMethod === "gps" ? "active" : ""
                  }`}
                >
                  🛰️ Use GPS
                </button>
              </div>
              <p className="location-method-hint">
                {locationMethod === "address"
                  ? "We'll convert your address to coordinates automatically."
                  : locationStatus ||
                    "Click 'Use GPS' to get your current location"}
              </p>
            </div>
          </>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || geocoding || !form.role}
        >
          {isLoading ? (
            <>
              <span className="auth-spinner"></span>
              Saving...
            </>
          ) : geocoding ? (
            <>
              <span className="auth-spinner"></span>
              Finding location...
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Complete Setup
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default RoleSelection;
