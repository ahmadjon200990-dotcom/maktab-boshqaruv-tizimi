import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function RoleRoute({ allowedRoles = [] }) {
    const [checking, setChecking] = useState(true);
    const [accessToken, setAccessToken] = useState(null);
    const [userRole, setUserRole] = useState(null);

    const roles = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles].filter(Boolean);

    useEffect(() => {
        const checkAuth = () => {
            const token =
                localStorage.getItem("accessToken");

            const role =
                localStorage.getItem("role");

            setAccessToken(token);
            setUserRole(role);

            setChecking(false);
        };

        checkAuth();

        // Login/logout yoki localStorage o'zgarganda
        // tekshirish uchun
        const handleStorage = () => {
            checkAuth();
        };

        window.addEventListener(
            "storage",
            handleStorage
        );

        return () => {
            window.removeEventListener(
                "storage",
                handleStorage
            );
        };
    }, []);

    console.log(
        "ACCESS TOKEN:",
        accessToken
    );

    console.log(
        "USER ROLE:",
        userRole
    );

    console.log(
        "ALLOWED ROLES:",
        roles
    );

    /*
    |--------------------------------------------------------------------------
    | Tekshirilmoqda
    |--------------------------------------------------------------------------
    */

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Login qilmagan
    |--------------------------------------------------------------------------
    */

    if (!accessToken) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Role hali mavjud emas
    |--------------------------------------------------------------------------
    */

    if (!userRole) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />

                    <p className="mt-3 text-sm font-semibold text-slate-500">
                        Foydalanuvchi ma'lumotlari
                        yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Role tekshirish
    |--------------------------------------------------------------------------
    */

    if (
        roles.length > 0 &&
        !roles.includes(userRole)
    ) {
        /*
        | Teacher bo'lsa teacher dashboardga
        */

        if (userRole === "teacher") {
            return (
                <Navigate
                    to="/teacher"
                    replace
                />
            );
        }

        /*
        | Admin bo'lsa admin dashboardga
        */

        if (userRole === "admin") {
            return (
                <Navigate
                    to="/admin"
                    replace
                />
            );
        }

        /*
        | Parent bo'lsa parent dashboardga
        */

        if (userRole === "parent") {
            return (
                <Navigate
                    to="/parent"
                    replace
                />
            );
        }

        /*
        | Noma'lum role
        */

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return <Outlet />;
}