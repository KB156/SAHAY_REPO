import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Scan, Menu, X, ArrowLeft, Zap, Shield, Users, LifeBuoy, Globe } from 'lucide-react'; // Added Globe icon

// Styles Component
const AppStyles = () => (
  <style>{`
    /* Basic Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg-cream: #fdfaf6;
      --card-white: #ffffff;
      --primary-purple: #6B46C1;
      --primary-purple-light: #F3EFFF;
      --text-dark: #2D3748;
      --text-light: #718096;
      --border-color: #E2E8F0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--bg-cream);
      color: var(--text-dark);
      overflow-x: hidden;
      min-height: 100vh;
      position: relative;
      padding: 8px;
    }

    body::before {
      content: '';
      position: fixed;
      top: 8px;
      left: 8px;
      right: 8px;
      bottom: 8px;
      border-radius: 16px;
      padding: 2px;
      background: linear-gradient(135deg, 
        rgba(168, 139, 235, 0.3) 0%, 
        rgba(107, 70, 193, 0.25) 25%, 
        rgba(243, 239, 255, 0.4) 50%, 
        rgba(168, 139, 235, 0.2) 75%, 
        rgba(107, 70, 193, 0.3) 100%
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      z-index: 9999;
      animation: gradientBorder 10s ease infinite;
      background-size: 200% 200%;
    }

    @keyframes gradientBorder {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    /* Main App Layout */
    .App {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      width: 100%;
      overflow-x: hidden;
    }

    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 5%;
      background-color: transparent;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
      position: relative;
      z-index: 100;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-dark);
      transition: transform 0.3s ease;
      cursor: pointer;
    }

    .logo:hover {
      transform: scale(1.05);
    }

    .mobile-menu-btn {
      display: none;
      background: var(--card-white);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mobile-menu-btn:hover {
      background: var(--primary-purple-light);
    }

    .nav-menu {
      display: flex;
      list-style: none;
      gap: 2.5rem;
      transition: all 0.3s ease;
    }

    .nav-menu li {
      cursor: pointer;
    }

    .nav-menu li a {
      color: var(--text-light);
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
    }

    .nav-menu li a::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--primary-purple);
      transition: width 0.3s ease;
    }

    .nav-menu li a:hover {
      color: var(--primary-purple);
    }

    .nav-menu li a:hover::after {
      width: 100%;
    }

    .contact-button {
      background-color: var(--card-white);
      color: var(--text-dark);
      border: 1px solid var(--border-color);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .contact-button:hover {
      box-shadow: 0 4px 12px rgba(107, 70, 193, 0.2);
      transform: translateY(-2px);
      background: var(--primary-purple);
      color: white;
      border-color: var(--primary-purple);
    }

    /* Main Content Grid */
    .main-content {
      flex-grow: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem 5%;
      width: 100%;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr;
      gap: 3rem;
      width: 100%;
      max-width: 1600px;
      margin: 0 auto;
    }

    .left-section,
    .right-section {
      min-width: 0;
      width: 100%;
    }

    .left-section {
      display: flex;
      flex-direction: column;
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .main-title {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 2.5rem;
      line-height: 1.2;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .video-container-wrapper {
      position: relative;
      width: 100%;
      padding-top: 56.25%;
      background-color: #e0e0e0;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .video-container-wrapper:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
    }

    .screen-share-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .video-placeholder {
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(135deg, #A88BEB 0%, #6B46C1 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      animation: gradientShift 3s ease infinite;
    }

    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    .placeholder-overlay {
      position: static;
      background: transparent;
      width: auto;
      height: auto;
    }

    .placeholder-text {
      color: white;
      text-align: center;
      padding: 1rem;
      animation: floatIcon 3s ease-in-out infinite;
    }

    @keyframes floatIcon {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .placeholder-text h3 {
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }

    .placeholder-text p {
      font-size: clamp(0.875rem, 2vw, 1rem);
      opacity: 0.9;
    }

    /* Decorative elements */
    .flower-decoration {
      position: absolute;
      width: 150px;
      height: 150px;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
      z-index: 10;
      transition: all 0.5s ease; /* MODIFIED: Animate all properties */
      opacity: 1; /* ADDED: Default opacity */
    }

    /* --- NEW CLASS --- */
    .flowers-hidden {
      opacity: 0;
      transform: scale(0.8) rotate(0deg) !important; /* Force override rotation */
      pointer-events: none; /* Disable interaction when hidden */
    }

    .flower-decoration:hover {
      transform: scale(1.05) rotate(5deg);
    }

    .flower-decoration img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .flower-left {
      bottom: -10px; /* MODIFIED: More visible */
      left: -15px; /* MODIFIED: More visible */
      transform: rotate(-15deg);
    }

    /* --- NEW CLASS for hidden state --- */
    .flower-left.flowers-hidden {
      bottom: -150px; /* Pull it further out of view */
      left: -150px;
    }

    .flower-right {
      top: -15px; /* MODIFIED: More visible */
      right: -15px; /* MODIFIED: More visible */
      transform: rotate(20deg);
    }

    /* --- NEW CLASS for hidden state --- */
    .flower-right.flowers-hidden {
      top: -150px;
      right: -150px;
    }


    /* Right Section Info Card */
    .right-section {
      animation: fadeInUp 0.6s ease-out 0.2s backwards;
    }

    .info-card {
      background-color: var(--card-white);
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .info-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
    }

    .ready-badge {
      display: inline-flex;
      align-items: center;
      background-color: var(--primary-purple-light);
      color: var(--primary-purple);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      align-self: flex-start;
      animation: pulse-badge 2s ease-in-out infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .ready-indicator {
      width: 8px;
      height: 8px;
      background-color: var(--primary-purple);
      border-radius: 50%;
      margin-right: 0.5rem;
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .profile-images {
      display: flex;
      margin-top: 1.5rem;
    }

    .profile-img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid white;
      object-fit: cover;
      box-shadow: 0 0 5px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
      cursor: pointer;
    }

    .profile-img:hover {
      transform: scale(1.1) translateY(-4px);
      z-index: 10;
    }

    .profile-img:not(:first-child) {
      margin-left: -12px;
    }

    .info-text {
      font-size: 1rem;
      color: var(--text-light);
      line-height: 1.6;
      margin-top: 1.5rem;
      flex-grow: 1;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Controls Section */
    .controls-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .control-btn {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .control-btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .control-btn:active::before {
      width: 300px;
      height: 300px;
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .start-btn {
      background-color: var(--primary-purple);
      color: white;
      border-color: var(--primary-purple);
    }

    .start-btn:not(:disabled):hover {
      background-color: #5a3a9a;
      box-shadow: 0 6px 16px rgba(107, 70, 193, 0.3);
      transform: translateY(-2px);
    }

    .stop-btn {
      background-color: var(--card-white);
      color: var(--text-dark);
    }

    .stop-btn:not(:disabled):hover {
      background-color: #fee;
      border-color: #fcc;
      color: #c33;
      transform: translateY(-2px);
    }

    .analyze-btn {
      background-color: var(--card-white);
      color: var(--primary-purple);
      border-color: var(--border-color);
    }

    .analyze-btn:not(:disabled):hover {
      background-color: var(--primary-purple-light);
      border-color: var(--primary-purple);
      transform: translateY(-2px);
    }

    /* --- NEW LANGUAGE BUTTON STYLE --- */
    .language-btn {
      background-color: var(--card-white);
      color: var(--text-light);
      border-color: var(--border-color);
    }

    .language-btn:not(:disabled):hover {
      background-color: #f9f9f9;
      color: var(--text-dark);
      transform: translateY(-2px);
    }
    /* --- END NEW STYLE --- */

    /* Status Display */
    .status-display {
      display: flex;
      align-items: center;
      margin-top: 1.5rem;
      color: var(--text-light);
      background-color: var(--card-white);
      border: 1px solid var(--border-color);
      padding: 1rem;
      border-radius: 12px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .status-dot {
      min-width: 10px;
      width: 10px;
      height: 10px;
      background-color: #00c853;
      border-radius: 50%;
      margin-right: 0.75rem;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(0, 200, 83, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0); }
    }
    
    /* --- NEW STYLES FOR CONTENT PAGES --- */
    .page-content {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      background: var(--card-white);
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      animation: fadeInUp 0.5s ease-out;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-size: 2.5rem;
      color: var(--text-dark);
    }
    .page-content p {
      font-size: 1.1rem;
      color: var(--text-light);
      line-height: 1.7;
      margin-bottom: 1.5rem;
    }
    .back-button {
      background: var(--primary-purple-light);
      color: var(--primary-purple);
      border: none;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .back-button:hover {
      background: var(--primary-purple);
      color: white;
      transform: translateX(-2px);
    }
    .page-content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    .content-card {
      background: #f9f9f9;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }
    .content-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.07);
    }
    .content-card-icon {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--primary-purple-light);
      color: var(--primary-purple);
      margin-bottom: 1rem;
    }
    .content-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }
    /* --- END NEW STYLES --- */
    

    /* Responsive Design */
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .main-content {
        padding: 1.5rem 4%;
      }

      .app-header {
        padding: 1.5rem 4%;
      }

      .flower-decoration {
        width: 100px;
        height: 100px;
      }

      .flower-left {
        bottom: -30px;
        left: -40px;
      }

      .flower-right {
        top: -40px;
        right: -40px;
      }
    }

    @media (max-width: 768px) {
      .mobile-menu-btn {
        display: block;
      }

      .nav-menu {
        position: fixed;
        top: 0;
        right: -100%;
        height: 100vh;
        width: 70%;
        max-width: 300px;
        background: var(--card-white);
        flex-direction: column;
        padding: 5rem 2rem 2rem;
        gap: 1.5rem;
        box-shadow: -5px 0 15px rgba(0,0,0,0.1);
        z-index: 1000;
      }

      .nav-menu.open {
        right: 0;
      }

      .nav-menu li a {
        font-size: 1.125rem;
      }

      .contact-button {
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
      }

      .app-header {
        padding: 1rem 4%;
      }

      .main-content {
        padding: 1rem 4%;
      }

      .info-card {
        padding: 1.5rem;
      }
      
      .page-content {
        padding: 1.5rem;
      }
      .page-title {
        font-size: 2rem;
      }

      .flower-decoration {
        display: none;
      }

      .profile-img {
        width: 40px;
        height: 40px;
      }
    }

    @media (max-width: 480px) {
      .logo {
        font-size: 1.25rem;
      }

      .main-title {
        margin-bottom: 1.5rem;
      }

      .controls-section {
        gap: 0.75rem;
      }

      .control-btn {
        padding: 0.875rem;
        font-size: 0.9375rem;
      }

      .info-card {
        padding: 1.25rem;
      }
      
      .page-content {
        padding: 1rem;
      }
      .page-header {
        padding-bottom: 1rem;
        margin-bottom: 1rem;
      }
      .page-title {
        font-size: 1.75rem;
      }
    }

    /* Loading Animation */
    .loading-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}
  </style>
);

// Image with Fallback Component
const ImageWithFallback = ({ src, alt, style, className }: { src: string, alt: string, style?: React.CSSProperties, className?: string }) => {
  const [error, setError] = useState(false);

  const handleError = () => {
    if (!error) {
      setError(true);
      console.error(`Failed to load image: ${src}`);
    }
  };

  if (error) {
    return (
      <div style={{ ...style, backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={className}>
        <span style={{ color: '#aaa', fontSize: '12px', padding: '10px', textAlign: 'center' }}>{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={style}
      className={className}
      onError={handleError}
    />
  );
};

// AR Overlay Types and Component

// --- NEW PAGE COMPONENTS ---

type PageProps = {
  setPage: (page: PageName) => void;
};

// --- Services Page ---
const ServicesPage = ({ setPage }: PageProps) => {
  return (
    <div className="page-content">
      <div className="page-header">
        <button className="back-button" onClick={() => setPage('home')} aria-label="Back to home">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">Our Services</h1>
      </div>
      <p>
        SAHAY provides premier, real-time technical support designed to solve your problems instantly.
        Our services are built to be intuitive, responsive, and effective.
      </p>
      <div className="page-content-grid">
        <div className="content-card">
          <div className="content-card-icon">
            <Zap size={24} />
          </div>
          <h3>Instant Visual Guidance</h3>
          <p>Our experts see what you see. Through screen sharing, we provide live, on-screen guidance, drawing and pointing to solve issues faster than ever.</p>
        </div>
        <div className="content-card">
          <div className="content-card-icon">
            <Shield size={24} />
          </div>
          <h3>Secure & Private</h3>
          <p>Your privacy is our priority. Our sessions are fully encrypted, and our professionals are trained to handle your data with the utmost confidentiality.</p>
        </div>
        <div className="content-card">
          <div className="content-card-icon">
            <LifeBuoy size={24} />
          </div>
          <h3>24/7 Expert Support</h3>
          <p>Get help whenever you need it. Our team of certified professionals is available around the clock to assist you with any technical challenge, big or small.</p>
        </div>
      </div>
    </div>
  );
};

// --- Features Page ---
const FeaturesPage = ({ setPage }: PageProps) => {
  return (
    <div className="page-content">
      <div className="page-header">
        <button className="back-button" onClick={() => setPage('home')} aria-label="Back to home">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">Features</h1>
      </div>
      <p>
        Our platform is packed with features to make your support experience seamless.
      </p>
      <div className="page-content-grid">
        <div className="content-card">
          <div className="content-card-icon">
            <Zap size={24} />
          </div>
          <h3>Real-Time AR Overlays</h3>
          <p>Our core feature. We draw directly on your screen to show you exactly where to click and what to do.</p>
        </div>
        <div className="content-card">
          <div className="content-card-icon">
            <Shield size={24} />
          </div>
          <h3>AI-Powered Assistance</h3>
          <p>Our assistant analyzes your screen to understand the context of your problem, providing faster and more accurate solutions.</p>
        </div>
        <div className="content-card">
          <div className="content-card-icon">
            <Users size={24} />
          </div>
          <h3>Multi-Platform Support</h3>
          <p>Whether you're on a desktop, laptop, or mobile device, SAHAY is ready to help you on any platform.</p>
        </div>
      </div>
    </div>
  );
};

// --- About Page ---
const AboutPage = ({ setPage }: PageProps) => {
  return (
    <div className="page-content">
      <div className="page-header">
        <button className="back-button" onClick={() => setPage('home')} aria-label="Back to home">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">About SAHAY</h1>
      </div>
      <p>
        SAHAY was founded on a simple principle: technical support should be easy, personal, and instant. We were tired of confusing phone calls and endless support articles.
        We believed there had to be a better way.
      </p>
      <p>
        Our mission is to empower everyone to use technology fearlessly. We connect you with real experts who can see your problem and guide you to a solution in real-time.
        We're not just a support company; we're your personal tech assistant.
      </p>
    </div>
  );
};

// --- Support Page ---
// --- FIX: Corrected prop type from PagePageProps to PageProps ---
const SupportPage = ({ setPage }: PageProps) => {
  return (
    <div className="page-content">
      <div className="page-header">
        <button className="back-button" onClick={() => setPage('home')} aria-label="Back to home">
          <ArrowLeft size={20} />
        </button>
        <h1 className="page-title">Support</h1>
      </div>
      <p>
        Need help? You're in the right place. Our main support method is right on the home page!
        Just click "Start Session" to connect with a professional.
      </p>
      <p>
        For account inquiries or other questions, you can also reach us at:
      </p>
      <div className="page-content-grid">
        <div className="content-card">
          <h3>Email Us</h3>
          <p>contact@sahay.assistant</p>
        </div>
        <div className="content-card">
          <h3>Call Us</h3>
          <p>+1 (800) 555-SAHY</p>
        </div>
      </div>
    </div>
  );
};

// --- END NEW PAGE COMPONENTS ---
// At the top of App.tsx
import ArOverlay, { type ArElement } from './components/ArOverlay.tsx';

const WS_URL = `ws://localhost:3000`;

type PageName = 'home' | 'services' | 'features' | 'about' | 'support';
// --- NEW: Language type ---
type LanguageCode = 'en-US' | 'hi-IN';

function App() {
  const [status, setStatus] = useState<string>('Idle');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [arElements, setArElements] = useState<ArElement[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [page, setPage] = useState<PageName>('home'); // <-- NEW PAGE STATE
  // --- NEW: Language state ---
  const [language, setLanguage] = useState<LanguageCode>('en-US');
  
  const ws = useRef<WebSocket | null>(null);
  const nextArId = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const stopSession = useCallback((closeWs = true) => {
    console.log('Stopping session...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    if (closeWs && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
    }
    mediaRecorderRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    ws.current = null;

    setIsConnected(false);
    setArElements([]);
    setStatus('Idle');
  }, []);
  
  const sendScreenSnapshot = useCallback(() => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open, cannot send snapshot.");
      setStatus('Error: Disconnected');
      return;
    }
    const videoElement = videoRef.current;
    if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
       console.warn("Video element not ready or has no dimensions.");
       setStatus('Error: Screen share not ready');
       return;
    }

    console.log("Capturing screen snapshot...");
    setStatus('Capturing screen...');
    
    const snapWidth = videoElement.videoWidth;
    const snapHeight = videoElement.videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = snapWidth;
    canvas.height = snapHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("Could not get canvas 2D context.");
      setStatus('Error capturing screen.');
      return;
    }

    try {
        ctx.drawImage(videoElement, 0, 0, snapWidth, snapHeight);
        const base64ImageData = canvas.toDataURL('image/jpeg', 0.7);
        const base64Cleaned = base64ImageData.split(',')[1];

        if (base64Cleaned && base64Cleaned.length > 0) {
            const snapshotData = {
                type: 'screen_snapshot',
                imageData: base64Cleaned,
                timestamp: Date.now(),
                videoWidth: snapWidth,
                videoHeight: snapHeight
            };
            ws.current.send(JSON.stringify(snapshotData));
            console.log(`Sent screen snapshot (${snapWidth}x${snapHeight}).`);
            setStatus('Snapshot sent. Analyzing...'); 
        } else {
             throw new Error("Canvas toDataURL returned empty data.");
        }
    } catch (error) {
         console.error("Error creating or sending snapshot:", error);
         setStatus('Error sending snapshot.');
    }
  }, []);
  
  const playAudio = useCallback(async (base64Data: string) => {
    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const audioContext = audioContextRef.current;
        if (!audioContext) throw new Error("AudioContext failed.");

        setStatus('Decoding audio...');
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        setStatus('Playing audio...');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        source.onended = () => {
            console.log("Audio playback finished.");
            if (isConnected) {
               setStatus(mediaRecorderRef.current ? 'Streaming...' : 'Connected. Ready.');
            }
        };
    } catch (error) {
        console.error("Error playing audio:", error);
        setStatus(`Error playing audio`);
    }
  }, [isConnected]);

  const handleServerMessage = useCallback((message: any) => {
    try {
        const msg = JSON.parse(message);

        if (msg.action === 'draw_box' && 
            Array.isArray(msg.coords) && msg.coords.length === 4 &&
            msg.referenceSize
        ) {
            const newElement: ArElement = {
                id: nextArId.current++,
                coords: msg.coords as [number, number, number, number],
                color: msg.color || 'red',
                referenceSize: msg.referenceSize
            };
            console.log("Adding AR element:", newElement);
            setArElements(prev => [...prev, newElement]);
            setTimeout(() => {
                setArElements(prev => prev.filter(el => el.id !== newElement.id));
            }, 5000);
        }
        else if (msg.type === 'audio_playback' && typeof msg.data === 'string') {
            console.log("Received audio playback instruction");
            playAudio(msg.data);
        }
        else if (msg.type === 'status') {
            setStatus(`${msg.message}`);
        }
        else {
            console.log("Received unknown JSON structure:", msg);
        }
    } catch (e) {
        console.log("Received non-JSON message:", message);
    }
  }, [playAudio]);

  const startStreaming = useCallback(async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setStatus("Error: WebSocket not connected.");
      return;
    }
    setStatus('Requesting permissions...');
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setStatus('Mic access granted. Requesting screen...');

      screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" } as any,
            audio: false
      });
      setStatus('Screen access granted.');
      
      if (videoRef.current && screenStreamRef.current) {
          videoRef.current.srcObject = screenStreamRef.current;
          videoRef.current.play().catch(e => {
              console.error("Video play error:", e);
          });
      }
      
      if (localStreamRef.current?.getAudioTracks().length > 0) {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        mediaRecorderRef.current = new MediaRecorder(localStreamRef.current, options);
        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0 && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(event.data);
          }
        };
        mediaRecorderRef.current.start(1000);
        setStatus('Streaming audio and screen...');
      } else {
        setStatus('Streaming screen (no audio input found)...');
      }
    } catch (err) {
      console.error('Error getting media streams:', err);
      setStatus(`Error getting streams`);
      stopSession();
    }
  }, [stopSession]);

  const connectWebSocket = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
    ws.current = new WebSocket(WS_URL);
    setStatus('Connecting...');
    
    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      
      // --- MODIFICATION: Send initial language setting on connect ---
      console.log(`Setting initial language to ${language}`);
      ws.current?.send(JSON.stringify({ type: 'set_language', language: language }));
      // --- END MODIFICATION ---

      setStatus('Connected. Starting streams...');
      startStreaming();
    };
    ws.current.onmessage = (event: MessageEvent) => {
      handleServerMessage(event.data);
    };
    ws.current.onerror = (event: Event) => {
      console.error('WebSocket Error:', event);
      setStatus('Error connecting.');
      stopSession();
    };
    ws.current.onclose = () => {
      console.log('WebSocket Disconnected');
      if (isConnected) {
        setIsConnected(false);
        setStatus('Idle');
        stopSession(false);
      }
    };
  }, [handleServerMessage, stopSession, isConnected, startStreaming, language]); // Added language to dependency array

  // --- NEW: Helper function to set page and close mobile menu ---
  const navigate = (pageName: PageName) => {
    setPage(pageName);
    setMobileMenuOpen(false);
  };
  
  // --- NEW: Language change handler ---
  const handleLanguageChange = () => {
    const newLang = language === 'en-US' ? 'hi-IN' : 'en-US';
    setLanguage(newLang);
    
    // Send language update to server if connected
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log(`Sending language change to server: ${newLang}`);
      ws.current.send(JSON.stringify({ type: 'set_language', language: newLang }));
    } else {
      console.log(`Language set to ${newLang} (offline). Will be sent on connection.`);
    }
  };
  
  // --- NEW: Helper to render the current page ---
  const renderPage = () => {
    switch (page) {
      case 'services':
        return <ServicesPage setPage={navigate} />;
      case 'features':
        return <FeaturesPage setPage={navigate} />;
      case 'about':
        return <AboutPage setPage={navigate} />;
      case 'support':
        return <SupportPage setPage={navigate} />;
      case 'home':
      default:
        return (
          <div className="content-grid">
            {/* Left Section - Title and Video */}
            <div className="left-section">
              <h1 className="main-title">
                Embark on your support journey with professionals
              </h1>

              <div className="video-container-wrapper">
                {/* Decorative Flowers */}
                <div className={`flower-decoration flower-left ${isConnected ? 'flowers-hidden' : ''}`}>
                  <ImageWithFallback
                    src="https://loremflickr.com/300/300/purple,flower?lock=1"
                    alt="Decorative purple flowers"
                    className="flower-img"
                  />
                </div>
                <div className={`flower-decoration flower-right ${isConnected ? 'flowers-hidden' : ''}`}>
                  <ImageWithFallback
                    src="https://loremflickr.com/300/300/purple,flower?lock=1"
                    alt="Decorative purple flowers"
                    className="flower-img"
                  />
                </div>

                {/* Video Container */}
                <div
                  ref={containerRef}
                  className="screen-share-container"
                >
                  {/* Placeholder when no video */}
                  {!isConnected && (
                    <div className="video-placeholder">
                      <div className="placeholder-overlay">
                        <div className="placeholder-text">
                          <Scan size={48} />
                          <h3>Ready to Share</h3>
                          <p>Start Session to begin screen sharing</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      display: isConnected ? 'block' : 'none',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 2,
                      borderRadius: '24px'
                    }}
                  ></video>
                  
                  <ArOverlay elements={arElements} videoRef={videoRef} /> 
                </div>
              </div>
            </div>

            {/* Right Section - Info Card */}
            <div className="right-section">
              <div className="info-card">
                <div className="ready-badge">
                  <div className="ready-indicator"></div>
                  Ready to help
                </div>

                <div className="profile-images">
                  <img 
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80" 
                    alt="Support team member"
                    className="profile-img"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80" 
                    alt="Support team member"
                    className="profile-img"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80" 
                    alt="Support team member"
                    className="profile-img"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80" 
                    alt="Support team member"
                    className="profile-img"
                  />
                </div>

                <p className="info-text">
                  Welcome to SAHAY Assistant, your gateway to instant technical support. 
                  We're here to help you resolve issues and guide you through any challenges 
                  with real-time assistance.
                </p>

                <div className="controls-section">
                  <button 
                    className="control-btn start-btn"
                    onClick={connectWebSocket}
                    disabled={isConnected}
                  >
                    {isConnected ? (
                      <>
                        <div className="loading-spinner"></div>
                        Connected
                      </>
                    ) : (
                      <>
                        <Play size={18} />
                        Start Session
                      </>
                    )}
                  </button>

                  <button 
                    className="control-btn stop-btn"
                    onClick={() => stopSession()}
                    disabled={!isConnected}
                  >
                    <Square size={18} />
                    Stop Session
                  </button>

                  <button
                    className="control-btn analyze-btn"
                    onClick={sendScreenSnapshot}
                    disabled={!isConnected || status.includes('Analyzing...')}
                  >
                    {status.includes('Analyzing...') ? (
                      <>
                        <div className="loading-spinner" style={{ borderTopColor: 'var(--primary-purple)' }}></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Scan size={18} />
                        Analyze Screen
                      </>
                    )}
                  </button>
                  
                  {/* --- NEW LANGUAGE BUTTON --- */}
                  <button
                    className="control-btn language-btn"
                    onClick={handleLanguageChange}
                    disabled={isConnected} // Disable changing language mid-session
                  >
                    <Globe size={18} />
                    {language === 'en-US' ? 'Switch to Hindi (हिंदी)' : 'Switch to English'}
                  </button>
                  {/* --- END NEW BUTTON --- */}

                </div>

                <div className="status-display">
                  {isConnected && <div className="status-dot"></div>}
                  <span>{status}</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <AppStyles />
      
      {/* Header */}
      <header className="app-header">
        <div className="logo" onClick={() => navigate('home')}>SAHAY:assistant</div>
        
        <nav>
          <ul className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <li onClick={() => navigate('services')}><a>Services</a></li>
            <li onClick={() => navigate('features')}><a>Features</a></li>
            <li onClick={() => navigate('about')}><a>About</a></li>
            <li onClick={() => navigate('support')}><a>Support</a></li>
          </ul>
        </nav>
        
        {/* --- MODIFICATION: Added onClick handler --- */}
        <button className="contact-button" onClick={() => navigate('home')}>Get Help</button>
        
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;