import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailLink, isSignInWithEmailLink } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "./Navbar";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    // Check if the URL contains the email link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // Get email from localStorage (user saved it during signup)
      let emailAddress = window.localStorage.getItem("emailForSignIn");

      // If not in localStorage, ask user to enter their email
      if (!emailAddress) {
        setShowEmailInput(true);
        setLoading(false);
        return;
      }

      // Complete the sign-in process
      completeEmailSignIn(emailAddress);
    } else {
      setError("Invalid email verification link");
      setLoading(false);
    }
  }, []);

  const completeEmailSignIn = async (emailAddress) => {
    try {
      // Complete the sign-in with the email link
      const result = await signInWithEmailLink(
        auth,
        emailAddress,
        window.location.href
      );
      const user = result.user;

      // Clear the stored email from localStorage
      window.localStorage.removeItem("emailForSignIn");

      // Check if user exists in database
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // New user - create profile
        const userData = JSON.parse(
          window.localStorage.getItem("newUserData") || "{}"
        );

        // Get location if not provided
        let lat = userData.lat;
        let lng = userData.lng;

        if (!lat || !lng) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
          } catch (e) {
            lat = 25.4358;
            lng = 81.8463;
          }
        }

        await setDoc(userRef, {
          uid: user.uid,
          name: userData.name || user.email.split("@")[0],
          email: user.email,
          role: userData.role || "user",
          phone: userData.phone || "",
          address: userData.address || "",
          lat,
          lng,
          createdAt: new Date(),
          emailVerified: true,
        });

        window.localStorage.removeItem("newUserData");

        // Redirect based on role
        const role = userData.role || "user";
        if (role === "clinic") navigate("/doctor-dashboard");
        else if (role === "pharmacy") navigate("/pharmacy-dashboard");
        else navigate("/home");
      } else {
        // Existing user - redirect based on role
        await redirectUsingFirestore(user);
      }
    } catch (err) {
      console.error("Email sign-in error:", err);
      setError(`Authentication failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    await completeEmailSignIn(email);
  };

  const redirectUsingFirestore = async (user) => {
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      navigate("/login");
      return;
    }

    const data = snap.data();

    if (!data.role) {
      navigate("/login");
    } else if (data.role === "clinic") {
      navigate("/doctor-dashboard");
    } else if (data.role === "pharmacy") {
      navigate("/pharmacy-dashboard");
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-md mx-auto p-6 mt-10">
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading && (
            <div className="text-center">
              <p className="text-lg font-semibold text-blue-600 mb-2">
                ✅ Verifying your email...
              </p>
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-semibold">❌ Verification Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {showEmailInput && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800">
                Email Verification
              </h2>
              <p className="text-gray-600 text-sm">
                Please enter the email address associated with your account to
                complete verification.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>
            </form>
          )}

          {!loading && !error && !showEmailInput && (
            <div className="text-center">
              <p className="text-lg font-semibold text-green-600">
                ✅ Email verified successfully!
              </p>
              <p className="text-gray-600 text-sm mt-2">Redirecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
