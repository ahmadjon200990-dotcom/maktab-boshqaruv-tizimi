import { useEffect, useState } from "react";
import { LogOut, User, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const navigate = useNavigate();

  const [userData, setUserData] = useState({
    email: "",
    role: "",
  });

  useEffect(() => {
    const email =
      localStorage.getItem("userEmail") ||
      localStorage.getItem("email") ||
      "";

    const role = localStorage.getItem("userRole") || "";

    setUserData({
      email,
      role,
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("email");
    localStorage.removeItem("role");

    navigate("/login", { replace: true });
  };

  const getInitials = (email) => {
    if (!email) return "U";

    return email
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 pb-24 sm:p-6 sm:pb-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Sozlamalar
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Profil va akkaunt sozlamalarini boshqarish
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {/* Profile card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3 sm:mb-5">
              <div className="shrink-0 rounded-xl bg-orange-100 p-2.5 text-orange-600 sm:p-3">
                <User size={20} className="sm:hidden" />
                <User size={22} className="hidden sm:block" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">
                  Profil ma&rsquo;lumotlari
                </h2>

                <p className="truncate text-sm text-slate-500">
                  Akkaunt haqida
                </p>
              </div>
            </div>

            <div className="mb-4 flex items-center gap-3 sm:mb-5 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-xl">
                {getInitials(userData.email)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {userData.email || "Email mavjud emas"}
                </p>

                <span className="mt-1 inline-flex max-w-full truncate rounded-full bg-orange-100 px-3 py-1 text-xs font-medium capitalize text-orange-700">
                  {userData.role || "Admin"}
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Email
                </p>

                <p className="break-all text-sm font-medium text-slate-800">
                  {userData.email || "Ma&rsquo;lumot topilmadi"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Rol
                </p>

                <p className="truncate text-sm font-medium capitalize text-slate-800">
                  {userData.role || "admin"}
                </p>
              </div>
            </div>
          </div>

          {/* Security card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3 sm:mb-5">
              <div className="shrink-0 rounded-xl bg-cyan-100 p-2.5 text-cyan-600 sm:p-3">
                <ShieldCheck size={20} className="sm:hidden" />
                <ShieldCheck size={22} className="hidden sm:block" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">
                  Akkaunt xavfsizligi
                </h2>

                <p className="truncate text-sm text-slate-500">
                  Kirish va chiqish
                </p>
              </div>
            </div>

            <p className="mb-5 text-sm leading-6 text-slate-600 sm:mb-6">
              Akkauntdan chiqish uchun quyidagi tugmani bosing.
              Chiqilgandan keyin login sahifasiga qaytasiz.
            </p>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3.5 font-semibold text-white transition hover:bg-red-600 active:scale-[0.98] sm:py-3"
            >
              <LogOut size={19} />
              Chiqish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}