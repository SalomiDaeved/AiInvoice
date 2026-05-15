import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";

const STORAGE_KEY = "invoiceai-sidebar-collapsed";

const AppShell = () => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();

  const userName =
    user?.firstName || user?.username || user?.fullName || "User";

  const displayName = userName;

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch {
      // Ignore localStorage error
    }
  }, [collapsed]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const getInitials = () => {
    const name = displayName || userEmail || "User";
    const parts = name.trim().split(" ").filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  };

  const logout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSidebarToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(true);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const DashboardIcon = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.8V21h14V9.8" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );

  const InvoiceIcon = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h5" />
      <path d="M9.5 12h6" />
      <path d="M9.5 16h6" />
    </svg>
  );

  const CreateIcon = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );

  const ProfileIcon = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </svg>
  );

  const LogoutIcon = ({ className = "h-4 w-4" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );

  const MenuIcon = ({ className = "h-5 w-5" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );

  const CloseIcon = ({ className = "h-5 w-5" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );

  const CollapseIcon = ({ className = "h-4 w-4", collapsed = false }) => (
    <svg
      className={`${className} transition-transform duration-300 ${
        collapsed ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  );

  const navItems = [
    { name: "Dashboard", path: "/app/dashboard", icon: DashboardIcon },
    { name: "Invoices", path: "/app/invoices", icon: InvoiceIcon },
    { name: "Create Invoice", path: "/app/create-invoice", icon: CreateIcon },
    { name: "Business Profile", path: "/app/business", icon: ProfileIcon },
  ];

  const SidebarContent = ({ isMobile = false }) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex h-full flex-col bg-white">
        <div
          className={`relative flex h-[78px] items-center border-b border-gray-100 px-5 ${
            isCollapsed ? "justify-center px-3" : "justify-between"
          }`}
        >
          <Link
            to="/app/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <img
              src={logo}
              alt="InvoiceAI Logo"
              className="h-9 w-9 rounded-xl object-contain shadow-sm"
            />

            {!isCollapsed && (
              <span className="text-[20px] font-bold tracking-wide text-[#1f3d8a]">
                InvoiceAI
              </span>
            )}
          </Link>

          {!isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className={`hidden h-8 w-8 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 shadow-sm transition hover:bg-[#eef4ff] hover:text-[#1f5aa8] lg:flex ${
                isCollapsed ? "absolute -right-4 top-6" : ""
              }`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseIcon className="h-4 w-4" collapsed={isCollapsed} />
            </button>
          )}

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 lg:hidden"
              title="Close menu"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-3 px-4 pt-7">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    "group flex h-11 items-center rounded-xl text-[13px] font-semibold transition-all duration-200",
                    isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-[#eef4ff] text-[#1f5aa8] shadow-[0_10px_24px_rgba(37,99,235,0.10)]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#1f5aa8]",
                  ].join(" ")
                }
                title={isCollapsed ? item.name : ""}
              >
                <span className="flex items-center justify-center text-current">
                  <Icon className="h-4 w-4" />
                </span>

                {!isCollapsed && <span>{item.name}</span>}

                {!isCollapsed && item.name === "Dashboard" && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#1f5aa8]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 pb-7">
          <button
            type="button"
            onClick={logout}
            className={[
              "group flex h-11 w-full items-center rounded-xl text-[13px] font-semibold text-red-700 transition-all duration-200 hover:bg-red-50",
              isCollapsed ? "justify-center px-0" : "gap-3 px-3",
            ].join(" ")}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogoutIcon className="h-4 w-4" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={[
          "fixed left-0 top-0 z-50 hidden h-screen border-r border-gray-100 shadow-[8px_0_30px_rgba(15,23,42,0.04)] transition-all duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[240px]",
        ].join(" ")}
      >
        <SidebarContent />
      </aside>

      <aside
        className={[
          "fixed left-0 top-0 z-50 h-screen w-[265px] border-r border-gray-100 shadow-2xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent isMobile />
      </aside>

      <main
        className={[
          "min-h-screen transition-all duration-300",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[240px]",
        ].join(" ")}
      >
        <div className="min-h-screen p-4 sm:p-5 lg:p-8">
          <header className="mb-6 rounded-3xl border border-white bg-white/90 px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5 lg:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={handleSidebarToggle}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-[#1f5aa8]/30 hover:bg-[#eef4ff] hover:text-[#1f5aa8]"
                  title="Toggle sidebar"
                  aria-label="Toggle sidebar"
                >
                  <CollapseIcon
                    className="hidden h-5 w-5 lg:block"
                    collapsed={collapsed}
                  />
                  <MenuIcon className="h-5 w-5 lg:hidden" />
                </button>

                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-bold tracking-tight text-gray-900 sm:text-[22px] lg:text-[24px]">
                    Welcome back,{" "}
                    <span className="bg-gradient-to-r from-[#1f5aa8] to-[#1f3d8a] bg-clip-text text-transparent">
                      {userName}
                    </span>
                  </h1>

                  <p className="mt-1 truncate text-[12px] font-medium text-gray-500 sm:text-[13px]">
                    Ready to create amazing invoices today?
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/app/create-invoice")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#1f5aa8] px-4 text-[13px] font-bold text-white shadow-[0_12px_24px_rgba(31,90,168,0.22)] transition hover:bg-[#1f3d8a] active:scale-[0.98] sm:px-5"
                >
                  <CreateIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Invoice</span>
                  <span className="sm:hidden">Create</span>
                </button>

                <div className="flex max-w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                  <div className="hidden min-w-0 text-right sm:block">
                    <div className="truncate text-[13px] font-bold text-gray-900">
                      {displayName}
                    </div>

                    {userEmail && (
                      <div className="max-w-[180px] truncate text-[11px] font-medium text-gray-500">
                        {userEmail}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1f5aa8] to-[#1f3d8a] text-[13px] font-bold text-white shadow-md">
                      {getInitials()}
                    </div>

                    <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppShell;