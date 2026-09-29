import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and redirect based on role
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === "user") {
              navigate("/home");
            } else if (role === "clinic") {
              navigate("/doctor-dashboard");
            } else if (role === "pharmacy") {
              navigate("/pharmacy-dashboard");
            } else {
              navigate("/select-role");
            }
          } else {
            navigate("/select-role");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    // Mouse parallax effect
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      unsubscribe();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div
        className="landing-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div className="bg-animation">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
        </div>
        <div style={{ textAlign: "center", zIndex: 10 }}>
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              animation: "iconPulse 2s ease-in-out infinite",
            }}
          >
            📋
          </div>
          <div
            style={{
              width: "40px",
              height: "40px",
              margin: "0 auto",
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Animated Background */}
      <div className="bg-animation">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="gradient-orb orb-4"></div>
      </div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}>
            {i % 4 === 0
              ? "💊"
              : i % 4 === 1
              ? "🏥"
              : i % 4 === 2
              ? "💉"
              : "🩺"}
          </div>
        ))}
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <div className="brand-icon-wrapper">
            <span className="brand-icon">📋</span>
            <div className="brand-pulse"></div>
          </div>
          <span className="brand-text">
            Near<span className="brand-highlight">Care</span>
          </span>
        </div>
        <button className="nav-login-btn" onClick={() => navigate("/login")}>
          <span>Get Started</span>
          <svg
            className="btn-arrow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge animate-bounce-in">
            <span className="badge-dot"></span>
            <span>Revolutionizing Healthcare Access</span>
          </div>

          <h1 className="hero-title">
            <span className="title-line animate-slide-up delay-1">
              Healthcare at Your
            </span>
            <span className="title-line title-gradient animate-slide-up delay-2">
              Fingertips
            </span>
          </h1>

          <p className="hero-description animate-fade-in delay-3">
            Find medicines near you, book clinic appointments instantly, and
            skip the queue. NearCare connects patients, pharmacies, and clinics
            in one seamless platform.
          </p>

          <div className="hero-cta animate-scale-in delay-4">
            <button className="cta-primary" onClick={() => navigate("/login")}>
              <span className="cta-text">Start Your Journey</span>
              <div className="cta-shine"></div>
              <div className="cta-glow"></div>
            </button>
            <button
              className="cta-secondary"
              onClick={() =>
                document
                  .getElementById("features")
                  .scrollIntoView({ behavior: "smooth" })
              }
            >
              <span>Explore Features</span>
              <svg
                className="explore-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="hero-stats animate-fade-in delay-5">
            <div className="stat-item">
              <span className="stat-number counter" data-target="500">
                500+
              </span>
              <span className="stat-label">Pharmacies</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number counter" data-target="200">
                200+
              </span>
              <span className="stat-label">Clinics</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number counter" data-target="10000">
                10K+
              </span>
              <span className="stat-label">Happy Users</span>
            </div>
          </div>
        </div>

        {/* Hero Illustration */}
        <div
          className="hero-illustration"
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
          }}
        >
          <div className="illustration-wrapper">
            {/* Main Phone Mockup */}
            <div className="phone-mockup animate-float">
              <div className="phone-screen">
                <div className="app-header">
                  <div className="app-logo">📋</div>
                  <span>NearCare</span>
                </div>
                <div className="app-content">
                  <div className="app-card card-1">
                    <span className="card-icon">🏥</span>
                    <div className="card-info">
                      <span className="card-title">City Clinic</span>
                      <span className="card-subtitle">Now serving: #12</span>
                    </div>
                    <span className="card-badge">Open</span>
                  </div>
                  <div className="app-card card-2">
                    <span className="card-icon">💊</span>
                    <div className="card-info">
                      <span className="card-title">MedPlus Pharmacy</span>
                      <span className="card-subtitle">500m away</span>
                    </div>
                    <span className="card-check">✓</span>
                  </div>
                  <div className="app-card card-3">
                    <span className="card-icon">📍</span>
                    <div className="card-info">
                      <span className="card-title">Your Token: #15</span>
                      <span className="card-subtitle">ETA: 15 mins</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="phone-notch"></div>
            </div>

            {/* Floating Cards */}
            <div className="floating-card card-medicine animate-float-delayed">
              <span className="fc-icon">💊</span>
              <div className="fc-content">
                <span className="fc-title">Paracetamol</span>
                <span className="fc-status available">In Stock</span>
              </div>
            </div>

            <div className="floating-card card-appointment animate-float-reverse">
              <span className="fc-icon">📅</span>
              <div className="fc-content">
                <span className="fc-title">Appointment</span>
                <span className="fc-status booked">Confirmed</span>
              </div>
            </div>

            <div className="floating-card card-location animate-float-slow">
              <span className="fc-icon">📍</span>
              <div className="fc-content">
                <span className="fc-title">Nearby</span>
                <span className="fc-status">3 Pharmacies</span>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="deco-circle circle-1"></div>
            <div className="deco-circle circle-2"></div>
            <div className="deco-circle circle-3"></div>
            <div className="deco-plus plus-1">+</div>
            <div className="deco-plus plus-2">+</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-badge">Features</span>
          <h2 className="section-title">
            Everything You Need,
            <span className="title-highlight"> One Platform</span>
          </h2>
          <p className="section-subtitle">
            NearCare bridges the gap between patients and healthcare providers
          </p>
        </div>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-card feature-1">
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <span>🔍</span>
              </div>
              <div className="feature-icon-bg"></div>
            </div>
            <h3 className="feature-title">Find Medicines</h3>
            <p className="feature-desc">
              Search for medicines and instantly see which nearby pharmacies
              have them in stock. No more running around!
            </p>
            <div className="feature-visual">
              <div className="search-demo">
                <div className="search-bar">
                  <span>🔍</span>
                  <span className="typing-text">Paracetamol 500mg</span>
                  <span className="cursor">|</span>
                </div>
                <div className="search-results">
                  <div className="result-item">
                    <span>✓</span> MedPlus - 200m
                  </div>
                  <div className="result-item">
                    <span>✓</span> Apollo - 500m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="feature-card feature-2">
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <span>📅</span>
              </div>
              <div className="feature-icon-bg"></div>
            </div>
            <h3 className="feature-title">Book Appointments</h3>
            <p className="feature-desc">
              Book clinic appointments online and get a token number. Know
              exactly when it's your turn!
            </p>
            <div className="feature-visual">
              <div className="calendar-demo">
                <div className="cal-header">January 2026</div>
                <div className="cal-grid">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`cal-day ${i === 3 ? "selected" : ""}`}
                    >
                      {i + 8}
                    </div>
                  ))}
                </div>
                <div className="time-slot selected-slot">
                  <span>🕐</span> 10:00 AM - Dr. Smith
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="feature-card feature-3">
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <span>⏱️</span>
              </div>
              <div className="feature-icon-bg"></div>
            </div>
            <h3 className="feature-title">Live Queue Tracking</h3>
            <p className="feature-desc">
              Track your position in real-time. Get notified when your turn is
              approaching so you arrive just in time.
            </p>
            <div className="feature-visual">
              <div className="queue-demo">
                <div className="queue-display">
                  <div className="current-token">
                    <span className="token-label">Now Serving</span>
                    <span className="token-number">#12</span>
                  </div>
                  <div className="your-token">
                    <span className="token-label">Your Token</span>
                    <span className="token-number">#15</span>
                  </div>
                </div>
                <div className="eta-bar">
                  <div className="eta-progress"></div>
                </div>
                <span className="eta-text">~15 mins remaining</span>
              </div>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="feature-card feature-4">
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <span>🤖</span>
              </div>
              <div className="feature-icon-bg"></div>
            </div>
            <h3 className="feature-title">AI Inventory Scanner</h3>
            <p className="feature-desc">
              Pharmacies can scan shelves with AI to instantly update inventory.
              Smart technology for smarter healthcare.
            </p>
            <div className="feature-visual">
              <div className="ai-demo">
                <div className="scan-frame">
                  <div className="scan-line"></div>
                  <div className="scan-corners">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="ai-result">
                  <span>✨</span> 12 items detected
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="roles-section">
        <div className="section-header">
          <span className="section-badge">For Everyone</span>
          <h2 className="section-title">
            Built for
            <span className="title-highlight"> All Stakeholders</span>
          </h2>
        </div>

        <div className="roles-grid">
          <div className="role-card role-user">
            <div className="role-avatar">
              <span>👤</span>
              <div className="role-ring"></div>
            </div>
            <h3>For Patients</h3>
            <ul className="role-features">
              <li>
                <span>✓</span> Find medicines nearby
              </li>
              <li>
                <span>✓</span> Book appointments
              </li>
              <li>
                <span>✓</span> Track queue live
              </li>
              <li>
                <span>✓</span> View clinic details
              </li>
            </ul>
          </div>

          <div className="role-card role-pharmacy">
            <div className="role-avatar">
              <span>💊</span>
              <div className="role-ring"></div>
            </div>
            <h3>For Pharmacies</h3>
            <ul className="role-features">
              <li>
                <span>✓</span> Manage inventory
              </li>
              <li>
                <span>✓</span> AI-powered scanning
              </li>
              <li>
                <span>✓</span> Increase visibility
              </li>
              <li>
                <span>✓</span> Serve more customers
              </li>
            </ul>
          </div>

          <div className="role-card role-clinic">
            <div className="role-avatar">
              <span>🏥</span>
              <div className="role-ring"></div>
            </div>
            <h3>For Clinics</h3>
            <ul className="role-features">
              <li>
                <span>✓</span> Digital queue system
              </li>
              <li>
                <span>✓</span> Manage appointments
              </li>
              <li>
                <span>✓</span> Reduce wait times
              </li>
              <li>
                <span>✓</span> Improve experience
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-orb cta-orb-1"></div>
          <div className="cta-orb cta-orb-2"></div>
        </div>
        <div className="cta-content">
          <h2 className="cta-title">
            Ready to Transform Your
            <span className="cta-highlight"> Healthcare Experience?</span>
          </h2>
          <p className="cta-desc">
            Join thousands of users who are already enjoying seamless healthcare
            access
          </p>
          <button className="cta-button" onClick={() => navigate("/login")}>
            <span>Get Started Now</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div className="cta-btn-glow"></div>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-logo">📋</span>
            <span className="footer-name">NearCare</span>
          </div>
          <p className="footer-tagline">
            Making healthcare accessible, one click at a time.
          </p>
          <div className="footer-divider"></div>
          <p className="footer-copy">
            © 2026 NearCare. Built with ❤️ for better healthcare.
          </p>
        </div>
      </footer>
    </div>
  );
}