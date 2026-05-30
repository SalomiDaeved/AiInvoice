import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AppShell from "./components/AppShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateInvoice from "./pages/CreateInvoice.jsx";
import Invoices from "./pages/Invoices.jsx";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-react";
import InvoicePreview from "./components/InvoicePreview.jsx";



// ✅ Safer Protected Route (fixes session 404 timing issue)
const ClerkProtected = ({ children }) => {
  const { isLoaded } = useAuth();

  // Prevent Clerk API calls before session is ready
  if (!isLoaded) return null;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const App = () => {
  return (
    <div className="min-h-screen max-w-full overflow-hidden">
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Home />} />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={
            <ClerkProtected>
              <AppShell />
            </ClerkProtected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path ="invoices" element={<Invoices/>}/>
          <Route path ="invoices/new" element={<CreateInvoice/>}/>
          <Route path ="invoice/:id" element ={<InvoicePreview/>} />
          <Route path ="invoice/:id/preview"  element ={<InvoicePreview/>} />
          <Route path ="invoices/:id/edit" element={<CreateInvoice/>}/>

           <Route path="create-invoice" element={<CreateInvoice />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;