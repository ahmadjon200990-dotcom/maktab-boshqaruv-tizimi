import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("role");
        localStorage.removeItem("user");

        setSession(null);
      } else {
        setSession(data.session);

        localStorage.setItem(
          "accessToken",
          data.session.access_token
        );

        localStorage.setItem(
          "userEmail",
          data.session.user.email || ""
        );
      }

      setLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession) {
        localStorage.setItem(
          "accessToken",
          newSession.access_token
        );

        localStorage.setItem(
          "userEmail",
          newSession.user.email || ""
        );
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Tekshirilmoqda...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}