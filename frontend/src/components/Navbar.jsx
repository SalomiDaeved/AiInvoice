import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { navbarStyles } from '../assets/Styles.js';
import logo from '../assets/logo.png';
import { SignedOut, useClerk } from '@clerk/clerk-react';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [mobileHover, setMobileHover] = useState(false);

  const clerk = useClerk();
  const navigate = useNavigate();

  function openSignIn() {
    try {
      clerk?.openSignIn ? clerk.openSignIn() : navigate('/login');
    } catch {
      navigate('/login');
    }
  }

  function openSignUp() {
    try {
      clerk?.openSignUp ? clerk.openSignUp() : navigate('/signup');
    } catch {
      navigate('/signup');
    }
  }

  return (
    <header className={navbarStyles.header}>
      <div className={navbarStyles.container}>
        <nav className={navbarStyles.nav}>

          {/* LOGO */}
          <div className={navbarStyles.logoSection}>
            <Link to="/" className={navbarStyles.logoLink}>
              <img src={logo} alt="Logo" className={navbarStyles.logoImage} />
              <span className={navbarStyles.logoText}>InvoiceAI</span>
            </Link>

            <div className={navbarStyles.desktopNav}>
              <a href="#features" className={navbarStyles.navLink}>Features</a>
              <a href="#pricing" className={navbarStyles.navLinkInactive}>Pricing</a>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-4">

            <SignedOut>

              {/* DESKTOP BUTTONS */}
              <div className="hidden md:flex items-center gap-3">

                <button
                  onClick={openSignIn}
                  className={navbarStyles.signInButton}
                >
                  Sign In
                </button>

                <button
                  onClick={openSignUp}
                  onMouseEnter={() => setHover(true)}
                  onMouseLeave={() => setHover(false)}
                  type="button"
                  style={{
                    position: "relative",
                    backgroundColor: "#2563eb",
                    padding: "12px 24px",
                    borderRadius: "9999px",
                    border: "none",
                    cursor: "pointer",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                    transform: hover ? "translateY(-2px)" : "translateY(0)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: hover ? "0%" : "-100%",
                      width: "100%",
                      height: "100%",
                      background: "rgba(255,255,255,0.15)",
                      transition: "left 0.4s ease",
                    }}
                  />

                  <span style={{ color: "#fff", fontWeight: 600, fontSize: 14, position: "relative", zIndex: 1 }}>
                    Get Started
                  </span>

                  <svg
                    style={{ width: 18, height: 18, color: "#fff", position: "relative", zIndex: 1 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14m-7-7l7 7-7 7" />
                  </svg>
                </button>

              </div>

            </SignedOut>

            {/* MOBILE MENU ICON (ONLY MOBILE) */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden"
            >
              <div className="flex flex-col justify-center items-center w-8 h-8 gap-1">

                <span
                  style={{
                    width: "22px",
                    height: "2px",
                    backgroundColor: "#000",
                    transition: "0.3s",
                    transform: open ? "rotate(45deg) translate(5px, 5px)" : "none",
                  }}
                />

                <span
                  style={{
                    width: "22px",
                    height: "2px",
                    backgroundColor: "#000",
                    transition: "0.3s",
                    opacity: open ? 0 : 1,
                  }}
                />

                <span
                  style={{
                    width: "22px",
                    height: "2px",
                    backgroundColor: "#000",
                    transition: "0.3s",
                    transform: open ? "rotate(-45deg) translate(5px, -5px)" : "none",
                  }}
                />

              </div>
            </button>

          </div>
        </nav>
      </div>

      {/* MOBILE MENU */}
      <div className={`${open ? "block" : "hidden"} ${navbarStyles.mobileMenu}`}>
        <div className={navbarStyles.mobileMenuContainer}>

          <a href="#features" className={navbarStyles.mobileNavLink}>Features</a>
          <a href="#pricing" className={navbarStyles.mobileNavLink}>Pricing</a>

          <SignedOut>

            <button
              onClick={openSignIn}
              className={navbarStyles.mobileSignIn}
            >
              Sign In
            </button>

            {/* MOBILE GET STARTED */}
            <button
              onClick={openSignUp}
              onMouseEnter={() => setMobileHover(true)}
              onMouseLeave={() => setMobileHover(false)}
              style={{
                position: "relative",
                backgroundColor: "#2563eb",
                padding: "10px 20px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                overflow: "hidden",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                transform: mobileHover ? "translateY(-2px)" : "translateY(0)",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: mobileHover ? "0%" : "-100%",
                  width: "100%",
                  height: "100%",
                  background: "rgba(255,255,255,0.15)",
                  transition: "left 0.4s ease",
                }}
              />

              <span style={{ color: "#fff", fontWeight: 600, position: "relative", zIndex: 1 }}>
                Get Started
              </span>

              <svg
                style={{ width: 18, height: 18, color: "#fff", position: "relative", zIndex: 1 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>

            </button>

          </SignedOut>

        </div>
      </div>

    </header>
  );
};

export default Navbar;