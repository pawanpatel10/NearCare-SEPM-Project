import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebaseConfig";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import "./auth.css";

function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: null,
          createdAt: new Date(),
        });
        await refreshUser();
        navigate("/select-role");
      } else {
        await refreshUser();
        await redirectUsingFirestore(user);
      }
    } catch (err) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled. Please try again.");
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const redirectUsingFirestore = async (user) => {
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      navigate("/select-role");
      return;
    }

    const data = snap.data();

    if (!data.role) {
      navigate("/select-role");
    } else if (data.role === "clinic") {
      navigate("/doctor-dashboard");
    } else if (data.role === "pharmacy") {
      navigate("/pharmacy-dashboard");
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card google-only-card">
        <div className="brand-section">
          <div className="brand-icon">
            <span></span>
          </div>
          <h1 className="brand-name">NearCare</h1>
          <p className="brand-tagline">Your Health, Just a Click Away</p>
        </div>

        <div className="welcome-section">
          <h2>Welcome</h2>
          <p className="auth-subtitle">Sign in to access healthcare services</p>
        </div>

        {error && (
          <div className="error-message">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="google-signin-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="auth-spinner"></span>
              Signing in...
            </>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="features-section">
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Book Clinic Appointments</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Find Medicines Nearby</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon"></span>
            <span>Location-based Services</span>
          </div>
        </div>

        <p className="auth-footer">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

export default Login;
