import React, { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Yönetim paneli ayrı bir parça olarak yalnızca açıldığında indirilir
const AdminApp = lazy(() => import("./admin.jsx"));
const isAdminHash = () => /^#\/yonetim(\/|$)/.test(window.location.hash);

function Root() {
  const [admin, setAdmin] = useState(isAdminHash);
  useEffect(() => {
    const onHash = () => setAdmin(isAdminHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (!admin) return <App />;
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm font-bold text-slate-400">Yönetim paneli açılıyor…</div>}>
      <AdminApp />
    </Suspense>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
