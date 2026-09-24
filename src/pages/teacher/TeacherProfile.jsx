import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Camera,
    ChevronRight,
    Loader2,
    Mail,
    Phone,
    Save,
    Settings,
    UserRound,
    BookOpen,
    GraduationCap,
    ShieldCheck,
    X,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

export default function TeacherProfile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [homeroomClass, setHomeroomClass] = useState(null);

    const [phone, setPhone] = useState("");
    const [editingPhone, setEditingPhone] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ============================================================
    // LOAD PROFILE
    // ============================================================

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

            if (userError) {
                throw userError;
            }

            if (!user) {
                navigate("/login", {
                    replace: true,
                });

                return;
            }

            // ----------------------------------------------------
            // PROFILE
            // ----------------------------------------------------

            const {
                data: profileData,
                error: profileError,
            } = await supabase
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
                    subject,
                    avatar_url,
                    status
                `)
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            if (profileData.role !== "teacher") {
                throw new Error(
                    "Bu sahifa faqat o‘qituvchilar uchun."
                );
            }

            setProfile(profileData);
            setPhone(profileData.phone || "");

            // ----------------------------------------------------
            // HOMEROOM CLASS
            // ----------------------------------------------------

            const {
                data: classData,
                error: classError,
            } = await supabase
                .from("classes")
                .select(`
                    id,
                    name,
                    grade_level,
                    section,
                    school_id,
                    academic_year_id,
                    homeroom_teacher_id
                `)
                .eq(
                    "homeroom_teacher_id",
                    user.id
                )
                .eq(
                    "school_id",
                    profileData.school_id
                )
                .order("grade_level", {
                    ascending: true,
                })
                .limit(1)
                .maybeSingle();

            if (classError) {
                throw classError;
            }

            setHomeroomClass(classData || null);
        } catch (err) {
            console.error(
                "Teacher profile error:",
                err
            );

            setError(
                err?.message ||
                "Profilni yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================================
    // SAVE PHONE
    // ============================================================

    async function savePhone() {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                throw new Error(
                    "Foydalanuvchi topilmadi."
                );
            }

            const cleanPhone = phone.trim();

            const {
                data: updatedProfile,
                error: updateError,
            } = await supabase
                .from("profiles")
                .update({
                    phone: cleanPhone || null,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", user.id)
                .select(`
                    id,
                    school_id,
                    role,
                    first_name,
                    last_name,
                    full_name,
                    email,
                    phone,
                    subject,
                    avatar_url,
                    status
                `)
                .single();

            if (updateError) {
                throw updateError;
            }

            setProfile(updatedProfile);
            setPhone(updatedProfile.phone || "");
            setEditingPhone(false);

            setSuccess(
                "Telefon raqami saqlandi."
            );

            setTimeout(() => {
                setSuccess("");
            }, 2500);
        } catch (err) {
            console.error(
                "Save phone error:",
                err
            );

            setError(
                err?.message ||
                "Telefon raqamini saqlashda xatolik yuz berdi."
            );
        } finally {
            setSaving(false);
        }
    }

    // ============================================================
    // FULL NAME
    // ============================================================

    const fullName = useMemo(() => {
        if (!profile) {
            return "O‘qituvchi";
        }

        if (profile.full_name?.trim()) {
            return profile.full_name.trim();
        }

        return (
            `${profile.first_name || ""} ${profile.last_name || ""
                }`.trim() || "O‘qituvchi"
        );
    }, [profile]);

    // ============================================================
    // INITIALS
    // ============================================================

    const initials = useMemo(() => {
        const first =
            profile?.first_name
                ?.trim()
                ?.charAt(0) || "";

        const last =
            profile?.last_name
                ?.trim()
                ?.charAt(0) || "";

        return (
            `${first}${last}`.toUpperCase() ||
            "O‘Q"
        );
    }, [profile]);

    // ============================================================
    // CLASS NAME
    // ============================================================

    const className = useMemo(() => {
        if (!homeroomClass) {
            return "";
        }

        return (
            homeroomClass.name ||
            `${homeroomClass.grade_level}-${homeroomClass.section}`
        );
    }, [homeroomClass]);

    // ============================================================
    // CANCEL PHONE
    // ============================================================

    function cancelPhoneEdit() {
        setPhone(profile?.phone || "");
        setEditingPhone(false);
        setError("");
    }

    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {
        return (
            <main className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f8]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2
                        size={26}
                        className="animate-spin text-cyan-600"
                    />

                    <span className="text-sm text-slate-400">
                        Profil yuklanmoqda...
                    </span>
                </div>
            </main>
        );
    }

    // ============================================================
    // PAGE
    // ============================================================

    return (
        <main className="min-h-[100dvh] bg-[#f7f7f8] text-slate-900">
            <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] bg-white sm:border-x sm:border-slate-100">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md">

                    {/* 
                        MUHIM:
                        Profilning back tugmasi endi history'ga
                        emas, Teacher asosiy sahifasiga qaytadi.
                    */}

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/teacher")
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:scale-95 active:bg-slate-100"
                        aria-label="Orqaga"
                    >
                        <ArrowLeft
                            size={21}
                            strokeWidth={2}
                        />
                    </button>

                    <h1 className="text-[16px] font-semibold tracking-[-0.01em]">
                        Profil
                    </h1>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/teacher/settings"
                            )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:scale-95 active:bg-slate-100"
                        aria-label="Sozlamalar"
                    >
                        <Settings
                            size={20}
                            strokeWidth={2}
                        />
                    </button>

                </header>

                {/* ==================================================
                    PROFILE HEADER
                ================================================== */}

                <section className="px-5 pb-7 pt-7">

                    <div className="flex flex-col items-center text-center">

                        {/* AVATAR */}

                        <div className="relative">

                            {profile?.avatar_url ? (
                                <img
                                    src={
                                        profile.avatar_url
                                    }
                                    alt={fullName}
                                    className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-50"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-cyan-50 text-2xl font-bold text-cyan-700 ring-4 ring-slate-50">
                                    {initials}
                                </div>
                            )}

                            {/* CAMERA */}

                            <button
                                type="button"
                                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm transition active:scale-95"
                                aria-label="Profil rasmini o‘zgartirish"
                                onClick={() => {
                                    setError(
                                        "Profil rasmi yuklash funksiyasini Storage bucket bilan keyingi bosqichda ulaymiz."
                                    );
                                }}
                            >
                                <Camera
                                    size={14}
                                    strokeWidth={2.5}
                                />
                            </button>

                        </div>

                        {/* NAME */}

                        <h2 className="mt-4 text-[21px] font-bold tracking-[-0.025em] text-slate-950">
                            {fullName}
                        </h2>

                        {/* SUBJECT */}

                        <p className="mt-1 text-[14px] font-medium text-slate-500">
                            {profile?.subject ||
                                "Fan biriktirilmagan"}
                        </p>

                        {/* ROLE */}

                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] font-semibold text-cyan-700">
                            <ShieldCheck
                                size={13}
                            />
                            O‘qituvchi
                        </div>

                    </div>

                </section>

                {/* ==================================================
                    ERROR / SUCCESS
                ================================================== */}

                {(error || success) && (
                    <div className="px-5">

                        <div
                            className={`mb-4 flex items-center gap-3 border-y px-1 py-3 text-xs font-medium ${error
                                    ? "border-red-100 text-red-600"
                                    : "border-emerald-100 text-emerald-600"
                                }`}
                        >

                            {error ? (
                                <X size={16} />
                            ) : (
                                <ShieldCheck
                                    size={16}
                                />
                            )}

                            <span className="flex-1">
                                {error || success}
                            </span>

                        </div>

                    </div>
                )}

                {/* ==================================================
                    PERSONAL INFORMATION
                ================================================== */}

                <section>

                    <SectionTitle>
                        Shaxsiy ma’lumotlar
                    </SectionTitle>

                    <div>

                        {/* NAME */}

                        <InfoRow
                            icon={UserRound}
                            label="Ism familiya"
                            value={fullName}
                            disabled
                        />

                        {/* EMAIL */}

                        <InfoRow
                            icon={Mail}
                            label="Email"
                            value={
                                profile?.email ||
                                "Email mavjud emas"
                            }
                            disabled
                        />

                        {/* PHONE */}

                        <div className="border-b border-slate-100 px-5 py-4">

                            <div className="flex items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                                    <Phone
                                        size={17}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">

                                    <p className="text-[11px] font-medium text-slate-400">
                                        Telefon
                                    </p>

                                    {editingPhone ? (
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(
                                                e
                                            ) =>
                                                setPhone(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="+998 90 123 45 67"
                                            autoFocus
                                            className="mt-1 w-full border-b border-cyan-500 bg-transparent pb-1 text-[15px] font-medium text-slate-900 outline-none"
                                        />
                                    ) : (
                                        <p className="mt-1 truncate text-[15px] font-medium text-slate-800">
                                            {profile?.phone ||
                                                "Kiritilmagan"}
                                        </p>
                                    )}

                                </div>

                                {!editingPhone ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingPhone(
                                                true
                                            )
                                        }
                                        className="shrink-0 px-1 text-xs font-semibold text-cyan-600 active:opacity-60"
                                    >
                                        Tahrirlash
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1">

                                        <button
                                            type="button"
                                            onClick={
                                                cancelPhoneEdit
                                            }
                                            disabled={
                                                saving
                                            }
                                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 active:bg-slate-100 disabled:opacity-50"
                                        >
                                            <X
                                                size={17}
                                            />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                savePhone
                                            }
                                            disabled={
                                                saving
                                            }
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-white active:scale-95 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Save
                                                    size={16}
                                                />
                                            )}
                                        </button>

                                    </div>
                                )}

                            </div>

                        </div>

                    </div>

                </section>

                {/* ==================================================
                    WORK
                ================================================== */}

                <section className="mt-7">

                    <SectionTitle>
                        Ish faoliyati
                    </SectionTitle>

                    {/* SUBJECT */}

                    <InfoRow
                        icon={BookOpen}
                        label="O‘qitadigan fan"
                        value={
                            profile?.subject ||
                            "Fan biriktirilmagan"
                        }
                    />

                    {/* HOMEROOM */}

                    {homeroomClass ? (
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/teacher/classes/${homeroomClass.id}`
                                )
                            }
                            className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition active:bg-slate-50"
                        >

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                <GraduationCap
                                    size={18}
                                />
                            </div>

                            <div className="min-w-0 flex-1">

                                <p className="text-[11px] font-medium text-slate-400">
                                    Rahbarlik qilayotgan sinf
                                </p>

                                <p className="mt-1 text-[15px] font-semibold text-slate-900">
                                    {className}
                                </p>

                            </div>

                            <ChevronRight
                                size={19}
                                className="shrink-0 text-slate-300"
                            />

                        </button>
                    ) : (
                        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                                <GraduationCap
                                    size={18}
                                />
                            </div>

                            <div>

                                <p className="text-[11px] font-medium text-slate-400">
                                    Rahbarlik qilayotgan sinf
                                </p>

                                <p className="mt-1 text-[14px] text-slate-400">
                                    Hozircha biriktirilmagan
                                </p>

                            </div>

                        </div>
                    )}

                </section>

                {/* ==================================================
                    SECURITY
                ================================================== */}

                <section className="mt-7 pb-8">

                    <SectionTitle>
                        Xavfsizlik
                    </SectionTitle>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/teacher/settings"
                            )
                        }
                        className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left transition active:bg-slate-50"
                    >

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                            <Settings
                                size={18}
                            />
                        </div>

                        <div className="min-w-0 flex-1">

                            <p className="text-[15px] font-medium text-slate-900">
                                Sozlamalar
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Parol va hisob xavfsizligi
                            </p>

                        </div>

                        <ChevronRight
                            size={19}
                            className="shrink-0 text-slate-300"
                        />

                    </button>

                </section>

            </div>
        </main>
    );
}

// ================================================================
// SECTION TITLE
// ================================================================

function SectionTitle({ children }) {
    return (
        <div className="px-5 pb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                {children}
            </h3>
        </div>
    );
}

// ================================================================
// INFO ROW
// ================================================================

function InfoRow({
    icon: Icon,
    label,
    value,
    disabled = false,
}) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <Icon size={17} />
            </div>

            <div className="min-w-0 flex-1">

                <p className="text-[11px] font-medium text-slate-400">
                    {label}
                </p>

                <p
                    className={`mt-1 truncate text-[15px] font-medium ${disabled
                            ? "text-slate-700"
                            : "text-slate-900"
                        }`}
                >
                    {value}
                </p>

            </div>

            {disabled && (
                <span className="shrink-0 text-[10px] font-medium text-slate-300">
                    O‘zgarmaydi
                </span>
            )}

        </div>
    );
}