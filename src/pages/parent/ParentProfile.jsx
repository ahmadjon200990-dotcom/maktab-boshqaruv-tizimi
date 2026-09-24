import { useEffect, useState } from "react";
import {
    User,
    Phone,
    Mail,
    GraduationCap,
    Pencil,
    LogOut,
    ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function ParentProfile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [student, setStudent] = useState(null);
    const [studentClass, setStudentClass] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showLogout, setShowLogout] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);
            setError("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                navigate("/login", { replace: true });
                return;
            }

            // Ota-ona profilini olish
            const { data: profileData, error: profileError } =
                await supabase
                    .from("profiles")
                    .select(`
                        id,
                        school_id,
                        role,
                        first_name,
                        last_name,
                        full_name,
                        email,
                        phone,
                        avatar_url,
                        student_id
                    `)
                    .eq("id", user.id)
                    .eq("role", "parent")
                    .maybeSingle();

            if (profileError) throw profileError;

            if (!profileData) {
                setError("Ota-ona profili topilmadi.");
                return;
            }

            setProfile(profileData);

            // Farzand biriktirilmagan bo'lsa
            if (!profileData.student_id) {
                setStudent(null);
                setStudentClass(null);
                return;
            }

            // Farzand ma'lumotlari
            const { data: studentData, error: studentError } =
                await supabase
                    .from("students")
                    .select(`
                        id,
                        school_id,
                        class_id,
                        first_name,
                        last_name,
                        avatar_url,
                        is_active
                    `)
                    .eq("id", profileData.student_id)
                    .eq("school_id", profileData.school_id)
                    .maybeSingle();

            if (studentError) throw studentError;

            setStudent(studentData);

            // Sinf ma'lumotlari
            if (studentData?.class_id) {
                const { data: classData, error: classError } =
                    await supabase
                        .from("classes")
                        .select(`
                            id,
                            name,
                            grade_level,
                            section
                        `)
                        .eq("id", studentData.class_id)
                        .eq("school_id", profileData.school_id)
                        .maybeSingle();

                if (classError) throw classError;

                setStudentClass(classData);
            }
        } catch (err) {
            console.error("Parent profile error:", err);
            setError(
                err?.message || "Profil ma'lumotlarini yuklashda xatolik."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        try {
            setLoggingOut(true);

            const { error: logoutError } = await supabase.auth.signOut();

            if (logoutError) throw logoutError;

            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Logout error:", err);
            setError("Hisobdan chiqishda xatolik yuz berdi.");
            setLoggingOut(false);
        }
    }

    const parentName =
        profile?.full_name ||
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
        profile?.email ||
        "Noma'lum foydalanuvchi";

    const studentName = student
        ? `${student.first_name || ""} ${student.last_name || ""}`.trim()
        : "Farzand biriktirilmagan";

    const className =
        studentClass?.name ||
        (studentClass?.grade_level
            ? `${studentClass.grade_level}-${studentClass.section || ""}`
            : "Sinf ma'lumoti mavjud emas");

    const parentInitials = parentName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    const studentInitials = studentName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 pb-24 pt-3">
                <div className="mx-auto w-full max-w-107">
                    <div className="mb-4 flex h-10 items-center justify-center">
                        <h1 className="text-[17px] font-bold text-slate-800">
                            Profil
                        </h1>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-8 shadow-sm">
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200" />

                            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200" />

                            <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
                        </div>
                    </div>

                    <div className="mt-3 space-y-3">
                        <div className="h-28 animate-pulse rounded-2xl bg-white" />
                        <div className="h-24 animate-pulse rounded-2xl bg-white" />
                        <div className="h-28 animate-pulse rounded-2xl bg-white" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 pb-24 pt-3">
            <div className="mx-auto w-full max-w-107">
                {/* Header */}
                <div className="mb-4 flex h-10 items-center justify-center">
                    <h1 className="text-[17px] font-bold text-slate-800">
                        Profil
                    </h1>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                        <p className="text-[11px] leading-5 text-red-500">
                            {error}
                        </p>
                    </div>
                )}

                {/* Profile card */}
                <div className="mb-3 rounded-2xl bg-white px-4 py-5 shadow-sm">
                    <div className="flex flex-col items-center">
                        {/* Avatar */}
                        <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-600">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={parentName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-xl font-bold">
                                    {parentInitials || <User size={38} />}
                                </span>
                            )}
                        </div>

                        <h2 className="text-[16px] font-bold text-slate-800">
                            {parentName}
                        </h2>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                            Ota-ona
                        </p>
                    </div>
                </div>

                {/* Personal information */}
                <div className="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-[11px] font-bold text-slate-800">
                            Shaxsiy ma'lumotlar
                        </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {/* Phone */}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Phone size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-slate-400">
                                    Telefon raqam
                                </p>

                                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">
                                    {profile?.phone || "Telefon raqam kiritilmagan"}
                                </p>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Mail size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-slate-400">
                                    Elektron pochta
                                </p>

                                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">
                                    {profile?.email || "Email mavjud emas"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Child */}
                <div className="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-[11px] font-bold text-slate-800">
                            Farzandingiz
                        </p>
                    </div>

                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-600">
                            {student?.avatar_url ? (
                                <img
                                    src={student.avatar_url}
                                    alt={studentName}
                                    className="h-full w-full object-cover"
                                />
                            ) : student ? (
                                <span className="text-[11px] font-bold">
                                    {studentInitials || <GraduationCap size={20} />}
                                </span>
                            ) : (
                                <GraduationCap size={20} />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold text-slate-700">
                                {studentName}
                            </p>

                            <p className="mt-0.5 text-[9px] text-slate-400">
                                {student ? className : "O'quvchi biriktirilmagan"}
                            </p>
                        </div>

                        <ChevronRight
                            size={16}
                            className="text-slate-300"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <button
                        type="button"
                        onClick={() => {
                            // Keyingi bosqichda shu yerda
                            // profilni tahrirlash oynasini ochamiz.
                        }}
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Pencil size={16} />
                        </div>

                        <span className="flex-1 text-[11px] font-medium text-slate-700">
                            Profilni tahrirlash
                        </span>

                        <ChevronRight
                            size={16}
                            className="text-slate-300"
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowLogout(true)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
                            <LogOut size={16} />
                        </div>

                        <span className="flex-1 text-[11px] font-medium text-red-500">
                            Chiqish
                        </span>

                        <ChevronRight
                            size={16}
                            className="text-red-200"
                        />
                    </button>
                </div>
            </div>

            {/* Logout modal */}
            {showLogout && (
                <div className="fixed inset-0 z-100 flex items-end justify-center bg-black/30 px-3 pb-3">
                    <div className="w-full max-w-107 rounded-2xl bg-white p-4 shadow-xl">
                        <h3 className="text-center text-[14px] font-bold text-slate-800">
                            Chiqishni xohlaysizmi?
                        </h3>

                        <p className="mt-1 text-center text-[10px] text-slate-400">
                            Hisobingizdan chiqasiz.
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setShowLogout(false)}
                                disabled={loggingOut}
                                className="h-10 rounded-xl bg-slate-100 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
                            >
                                Bekor qilish
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="h-10 rounded-xl bg-red-500 text-[11px] font-semibold text-white disabled:opacity-50"
                            >
                                {loggingOut ? "Chiqilmoqda..." : "Chiqish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}