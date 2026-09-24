import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";

const SETTINGS_STORAGE_KEYS = {
    notifications: "teacherSettings_notifications",
    lessonReminder: "teacherSettings_lessonReminder",
    autoAttendance: "teacherSettings_autoAttendance",
    appearance: "teacherSettings_appearance",
};

function loadStoredSetting(key, fallback) {
    try {
        const raw = localStorage.getItem(key);

        if (raw === null) {
            return fallback;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error(
            "Sozlamani o‘qishda xatolik:",
            error
        );

        return fallback;
    }
}

function saveStoredSetting(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    } catch (error) {
        console.error(
            "Sozlamani saqlashda xatolik:",
            error
        );
    }
}

export default function TeacherSettings() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [phone, setPhone] = useState("");
    const [phoneEditing, setPhoneEditing] = useState(false);
    const [phoneSaving, setPhoneSaving] = useState(false);

    const [message, setMessage] = useState("");

    const [notifications, setNotifications] = useState(() =>
        loadStoredSetting(
            SETTINGS_STORAGE_KEYS.notifications,
            {
                all: true,
                messages: true,
                attendance: true,
                grades: true,
                schedule: true,
                system: true,
            }
        )
    );

    const [lessonReminder, setLessonReminder] =
        useState(() =>
            loadStoredSetting(
                SETTINGS_STORAGE_KEYS.lessonReminder,
                "10"
            )
        );

    const [autoAttendance, setAutoAttendance] =
        useState(() =>
            loadStoredSetting(
                SETTINGS_STORAGE_KEYS.autoAttendance,
                true
            )
        );

    const [appearance, setAppearance] =
        useState(() =>
            loadStoredSetting(
                SETTINGS_STORAGE_KEYS.appearance,
                "system"
            )
        );

    const [passwordOpen, setPasswordOpen] =
        useState(false);

    const [currentPassword, setCurrentPassword] =
        useState("");

    const [newPassword, setNewPassword] =
        useState("");

    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [showCurrentPassword, setShowCurrentPassword] =
        useState(false);

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [passwordLoading, setPasswordLoading] =
        useState(false);

    const [passwordError, setPasswordError] =
        useState("");

    const [passwordSuccess, setPasswordSuccess] =
        useState("");

    const [logoutOpen, setLogoutOpen] =
        useState(false);

    // ========================================================
    // LOAD
    // ========================================================

    useEffect(() => {
        loadSettings();
    }, []);

    // Persist local-only preferences (there is no
    // backend column for these yet) so they survive a
    // page refresh instead of silently resetting.
    useEffect(() => {
        saveStoredSetting(
            SETTINGS_STORAGE_KEYS.notifications,
            notifications
        );
    }, [notifications]);

    useEffect(() => {
        saveStoredSetting(
            SETTINGS_STORAGE_KEYS.lessonReminder,
            lessonReminder
        );
    }, [lessonReminder]);

    useEffect(() => {
        saveStoredSetting(
            SETTINGS_STORAGE_KEYS.autoAttendance,
            autoAttendance
        );
    }, [autoAttendance]);

    useEffect(() => {
        saveStoredSetting(
            SETTINGS_STORAGE_KEYS.appearance,
            appearance
        );
    }, [appearance]);

    async function loadSettings() {
        try {
            setLoading(true);

            const {
                data: {
                    user: authUser,
                },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!authUser) {
                navigate("/login", {
                    replace: true,
                });

                return;
            }

            setUser(authUser);

            const {
                data,
                error,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    first_name,
                    last_name,
                    full_name,
                    email,
                    phone,
                    role,
                    subject
                `)
                .eq("id", authUser.id)
                .maybeSingle();

            if (error) {
                throw error;
            }

            setProfile(data || null);

            setPhone(
                normalizePhone(data?.phone || "")
            );
        } catch (error) {
            console.error(
                "Teacher settings load error:",
                error
            );
        } finally {
            setLoading(false);
        }
    }

    // ========================================================
    // PHONE HELPERS
    // ========================================================

    function normalizePhone(value) {
        const digits = String(value || "")
            .replace(/\D/g, "");

        // Only strip a country/trunk prefix from a
        // longer, unnormalized number. A number that
        // is already 9 digits or fewer is left as-is,
        // so local numbers starting with "8" (e.g. the
        // 88-prefix Uzmobile range) are not corrupted
        // by re-running this on an already-normalized
        // value.
        if (digits.length > 9 && digits.startsWith("998")) {
            return digits.slice(3, 12);
        }

        if (digits.length > 9 && digits.startsWith("8")) {
            return digits.slice(1, 10);
        }

        return digits.slice(0, 9);
    }

    function formattedPhone(value) {
        const digits = normalizePhone(value);

        if (!digits) {
            return "";
        }

        let result = digits.slice(0, 2);

        if (digits.length > 2) {
            result += " " + digits.slice(2, 5);
        }

        if (digits.length > 5) {
            result += " " + digits.slice(5, 7);
        }

        if (digits.length > 7) {
            result += " " + digits.slice(7, 9);
        }

        return result;
    }

    // ========================================================
    // PHONE SAVE
    // ========================================================

    async function savePhone() {
        if (!user?.id) return;

        const digits = normalizePhone(phone);

        if (digits.length !== 9) {
            setMessage(
                "Telefon raqami 9 xonadan iborat bo‘lishi kerak."
            );

            return;
        }

        try {
            setPhoneSaving(true);
            setMessage("");

            const fullPhone = `+998${digits}`;

            const {
                error,
            } = await supabase
                .from("profiles")
                .update({
                    phone: fullPhone,
                    updated_at:
                        new Date().toISOString(),
                })
                .eq("id", user.id);

            if (error) {
                throw error;
            }

            setProfile((prev) => ({
                ...prev,
                phone: fullPhone,
            }));

            setPhone(digits);
            setPhoneEditing(false);

            setMessage(
                "Telefon raqami saqlandi."
            );

            setTimeout(() => {
                setMessage("");
            }, 2500);
        } catch (error) {
            console.error(
                "Phone save error:",
                error
            );

            setMessage(
                "Telefon raqamini saqlashda xatolik yuz berdi."
            );
        } finally {
            setPhoneSaving(false);
        }
    }

    // ========================================================
    // NOTIFICATIONS
    // ========================================================

    function toggleNotification(key) {
        setNotifications((prev) => {
            if (key === "all") {
                const value = !prev.all;

                return {
                    all: value,
                    messages: value,
                    attendance: value,
                    grades: value,
                    schedule: value,
                    system: value,
                };
            }

            // "Barchasini yoqish/o'chirish" faqat bitta
            // tezkor amal (bulk action). U pastdagi
            // bitta bildirishnomani o'chirish/yoqishga
            // qarab o'zgarmasligi kerak, aks holda bitta
            // narsani o'chirganda "Barchasi" tugmasi ham
            // kutilmaganda o'chib qolar edi.
            return {
                ...prev,
                [key]: !prev[key],
            };
        });
    }

    // ========================================================
    // PASSWORD
    // ========================================================

    function openPasswordModal() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordOpen(true);
    }

    function closePasswordModal() {
        if (passwordLoading) return;

        setPasswordOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        setPasswordSuccess("");
    }

    async function changePassword(e) {
        e.preventDefault();

        setPasswordError("");
        setPasswordSuccess("");

        if (!currentPassword) {
            setPasswordError(
                "Joriy parolni kiriting."
            );
            return;
        }

        if (!newPassword) {
            setPasswordError(
                "Yangi parolni kiriting."
            );
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError(
                "Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak."
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(
                "Yangi parollar bir xil emas."
            );
            return;
        }

        if (!user?.email) {
            setPasswordError(
                "Email topilmadi."
            );
            return;
        }

        try {
            setPasswordLoading(true);

            const {
                error: loginError,
            } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (loginError) {
                setPasswordError(
                    "Joriy parol noto‘g‘ri."
                );
                return;
            }

            const {
                error: updateError,
            } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                throw updateError;
            }

            setPasswordSuccess(
                "Parol muvaffaqiyatli o‘zgartirildi."
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                closePasswordModal();
            }, 1200);
        } catch (error) {
            console.error(
                "Password change error:",
                error
            );

            setPasswordError(
                error?.message ||
                "Parolni o‘zgartirishda xatolik yuz berdi."
            );
        } finally {
            setPasswordLoading(false);
        }
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    async function handleLogout() {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error(
                "Logout error:",
                error
            );
        } finally {
            localStorage.removeItem(
                "accessToken"
            );

            localStorage.removeItem(
                "userId"
            );

            localStorage.removeItem(
                "userEmail"
            );

            localStorage.removeItem(
                "email"
            );

            localStorage.removeItem(
                "userRole"
            );

            localStorage.removeItem(
                "role"
            );

            localStorage.removeItem(
                "profile"
            );

            navigate("/login", {
                replace: true,
            });
        }
    }

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div
                className="
                    flex
                    min-h-[100dvh]
                    items-center
                    justify-center
                    bg-[#F7F7F7]
                "
            >
                <div className="flex flex-col items-center">
                    <div
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-2xl
                            bg-black
                            text-white
                        "
                    >
                        <i className="fa-solid fa-gear text-[15px]" />
                    </div>

                    <p
                        className="
                            mt-3
                            text-[13px]
                            font-bold
                            text-[#8A8A8A]
                        "
                    >
                        Yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    const firstName =
        profile?.first_name ||
        profile?.full_name
            ?.trim()
            ?.split(" ")[0] ||
        "O‘qituvchi";

    const lastName =
        profile?.last_name || "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    // ========================================================
    // UI
    // ========================================================

    return (
        <div
            className="
                min-h-[100dvh]
                bg-[#F7F7F7]
                text-black
            "
        >

            {/* ==================================================
                MOBILE HEADER
            ================================================== */}

            <header
                className="
                    sticky
                    top-0
                    z-40
                    border-b
                    border-black/[0.06]
                    bg-white/95
                    px-4
                    py-3
                    backdrop-blur-xl
                "
            >
                <div className="mx-auto flex max-w-[700px] items-center gap-3">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/teacher/profile"
                            )
                        }
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-[14px]
                            border
                            border-black/[0.06]
                            bg-white
                            text-black
                            transition
                            active:scale-95
                        "
                    >
                        <i className="fa-solid fa-arrow-left text-[13px]" />
                    </button>

                    <div className="min-w-0">
                        <h1
                            className="
                                truncate
                                text-[15px]
                                font-black
                                tracking-[-0.2px]
                            "
                        >
                            Sozlamalar
                        </h1>

                        <p
                            className="
                                mt-0.5
                                text-[13px]
                                font-medium
                                text-[#8A8A8A]
                            "
                        >
                            Hisob va ilova
                        </p>
                    </div>

                </div>
            </header>

            {/* ==================================================
                CONTENT
            ================================================== */}

            <main
                className="
                    mx-auto
                    w-full
                    max-w-[700px]
                    px-4
                    pb-8
                    pt-5
                    sm:px-5
                    sm:pt-6
                "
            >

                {/* ==================================================
                    MESSAGE
                ================================================== */}

                {message && (
                    <div
                        className="
                            mb-4
                            rounded-[16px]
                            border
                            border-black/[0.06]
                            bg-white
                            px-4
                            py-3
                        "
                    >
                        <p className="text-[13px] font-bold text-black">
                            {message}
                        </p>
                    </div>
                )}

                {/* ==================================================
                    ACCOUNT
                ================================================== */}

                <SettingSection
                    title="Hisob"
                >

                    <SettingInfoRow
                        title="Ism va familiya"
                        value={fullName}
                        locked
                    />

                    <SettingInfoRow
                        title="Email"
                        value={
                            profile?.email ||
                            user?.email ||
                            "—"
                        }
                        locked
                    />

                    {/* PHONE */}

                    <div className="px-4 py-4">

                        <div className="flex items-center justify-between gap-3">

                            <div className="min-w-0">
                                <p className="text-[12px] font-bold text-black">
                                    Telefon raqami
                                </p>

                                {!phoneEditing && (
                                    <p className="mt-1 truncate text-[13px] font-medium text-[#8A8A8A]">
                                        {phone
                                            ? `+998 ${formattedPhone(
                                                phone
                                            )}`
                                            : "Kiritilmagan"}
                                    </p>
                                )}
                            </div>

                            {!phoneEditing && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPhoneEditing(
                                            true
                                        )
                                    }
                                    className="
                                        shrink-0
                                        rounded-xl
                                        bg-[#F2F2F2]
                                        px-3
                                        py-2
                                        text-[12px]
                                        font-black
                                        text-black
                                        transition
                                        active:scale-95
                                    "
                                >
                                    Tahrirlash
                                </button>
                            )}

                        </div>

                        {phoneEditing && (
                            <div className="mt-3">

                                <div
                                    className="
                                        flex
                                        items-center
                                        overflow-hidden
                                        rounded-[15px]
                                        border
                                        border-black/[0.08]
                                        bg-[#F7F7F7]
                                        focus-within:border-black
                                    "
                                >

                                    <div
                                        className="
                                            flex
                                            h-[46px]
                                            items-center
                                            border-r
                                            border-black/[0.06]
                                            px-3
                                            text-[12px]
                                            font-black
                                            text-black
                                        "
                                    >
                                        +998
                                    </div>

                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={9}
                                        value={normalizePhone(
                                            phone
                                        )}
                                        onChange={(e) => {
                                            const digits =
                                                e.target.value
                                                    .replace(
                                                        /\D/g,
                                                        ""
                                                    )
                                                    .slice(
                                                        0,
                                                        9
                                                    );

                                            setPhone(
                                                digits
                                            );
                                        }}
                                        placeholder="90 123 45 67"
                                        className="
                                            min-w-0
                                            flex-1
                                            bg-transparent
                                            px-3
                                            py-3
                                            text-[13px]
                                            font-bold
                                            tracking-[0.2px]
                                            text-black
                                            outline-none
                                        "
                                    />

                                </div>

                                <p
                                    className="
                                        mt-1.5
                                        px-1
                                        text-[13px]
                                        font-medium
                                        text-[#A3A3A3]
                                    "
                                >
                                    Masalan: 90 123 45 67
                                </p>

                                <div className="mt-3 grid grid-cols-2 gap-2">

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhone(
                                                normalizePhone(
                                                    profile?.phone ||
                                                    ""
                                                )
                                            );

                                            setPhoneEditing(
                                                false
                                            );

                                            setMessage("");
                                        }}
                                        className="
                                            rounded-[14px]
                                            bg-[#F2F2F2]
                                            px-3
                                            py-3
                                            text-[13px]
                                            font-bold
                                            text-[#737373]
                                            transition
                                            active:scale-[0.98]
                                        "
                                    >
                                        Bekor qilish
                                    </button>

                                    <button
                                        type="button"
                                        disabled={
                                            phoneSaving
                                        }
                                        onClick={
                                            savePhone
                                        }
                                        className="
                                            rounded-[14px]
                                            bg-black
                                            px-3
                                            py-3
                                            text-[13px]
                                            font-bold
                                            text-white
                                            transition
                                            active:scale-[0.98]
                                            disabled:opacity-50
                                        "
                                    >
                                        {phoneSaving
                                            ? "Saqlanmoqda..."
                                            : "Saqlash"}
                                    </button>

                                </div>

                            </div>
                        )}

                    </div>

                </SettingSection>

                {/* ==================================================
                    NOTIFICATIONS
                ================================================== */}

                <SettingSection
                    title="Bildirishnomalar"
                >

                    <SettingToggle
                        title="Barcha bildirishnomalar"
                        description="Barcha muhim xabarlarni olish"
                        checked={
                            notifications.all
                        }
                        onChange={() =>
                            toggleNotification(
                                "all"
                            )
                        }
                        first
                    />

                    <SettingToggle
                        title="Xabarlar"
                        description="Yangi xabar kelganda"
                        checked={
                            notifications.messages
                        }
                        onChange={() =>
                            toggleNotification(
                                "messages"
                            )
                        }
                    />

                    <SettingToggle
                        title="Davomat"
                        description="Davomat bilan bog‘liq eslatmalar"
                        checked={
                            notifications.attendance
                        }
                        onChange={() =>
                            toggleNotification(
                                "attendance"
                            )
                        }
                    />

                    <SettingToggle
                        title="Baholar"
                        description="Baholar bilan bog‘liq xabarlar"
                        checked={
                            notifications.grades
                        }
                        onChange={() =>
                            toggleNotification(
                                "grades"
                            )
                        }
                    />

                    <SettingToggle
                        title="Dars jadvali"
                        description="Dars boshlanishidan oldingi eslatmalar"
                        checked={
                            notifications.schedule
                        }
                        onChange={() =>
                            toggleNotification(
                                "schedule"
                            )
                        }
                    />

                    <SettingToggle
                        title="Tizim xabarlari"
                        description="Maktab tizimidagi yangiliklar"
                        checked={
                            notifications.system
                        }
                        onChange={() =>
                            toggleNotification(
                                "system"
                            )
                        }
                    />

                </SettingSection>

                {/* ==================================================
                    LESSONS
                ================================================== */}

                <SettingSection
                    title="Darslar"
                >

                    <div className="px-4 py-4">

                        <div className="flex items-center justify-between gap-3">

                            <div className="min-w-0">
                                <p className="text-[12px] font-bold text-black">
                                    Darsdan oldin eslatish
                                </p>

                                <p className="mt-1 text-[12px] font-medium text-[#8A8A8A]">
                                    Dars boshlanishidan oldin
                                </p>
                            </div>

                            <select
                                value={
                                    lessonReminder
                                }
                                onChange={(e) =>
                                    setLessonReminder(
                                        e.target.value
                                    )
                                }
                                className="
                                    shrink-0
                                    rounded-[12px]
                                    border
                                    border-black/[0.06]
                                    bg-[#F7F7F7]
                                    px-3
                                    py-2.5
                                    text-[12px]
                                    font-black
                                    text-black
                                    outline-none
                                "
                            >
                                <option value="5">
                                    5 daqiqa
                                </option>

                                <option value="10">
                                    10 daqiqa
                                </option>

                                <option value="15">
                                    15 daqiqa
                                </option>

                                <option value="30">
                                    30 daqiqa
                                </option>
                            </select>

                        </div>

                    </div>

                    <SettingToggle
                        title="Davomatni avtomatik ochish"
                        description="Dars boshlanganda davomatni tayyorlash"
                        checked={
                            autoAttendance
                        }
                        onChange={() =>
                            setAutoAttendance(
                                (prev) => !prev
                            )
                        }
                    />

                </SettingSection>

                {/* ==================================================
                    APPEARANCE
                ================================================== */}

                <SettingSection
                    title="Ko‘rinish"
                >

                    <div className="px-4 py-4">

                        <p className="text-[12px] font-bold text-black">
                            Ilova ko‘rinishi
                        </p>

                        <div className="mt-3 grid grid-cols-3 gap-2">

                            <AppearanceButton
                                value="system"
                                current={
                                    appearance
                                }
                                onClick={() =>
                                    setAppearance(
                                        "system"
                                    )
                                }
                                icon="fa-solid fa-circle-half-stroke"
                                title="Tizim"
                            />

                            <AppearanceButton
                                value="light"
                                current={
                                    appearance
                                }
                                onClick={() =>
                                    setAppearance(
                                        "light"
                                    )
                                }
                                icon="fa-solid fa-sun"
                                title="Yorug‘"
                            />

                            <AppearanceButton
                                value="dark"
                                current={
                                    appearance
                                }
                                onClick={() =>
                                    setAppearance(
                                        "dark"
                                    )
                                }
                                icon="fa-solid fa-moon"
                                title="Tungi"
                            />

                        </div>

                    </div>

                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            border-t
                            border-black/[0.05]
                            px-4
                            py-4
                        "
                    >

                        <div>
                            <p className="text-[12px] font-bold text-black">
                                Til
                            </p>

                            <p className="mt-1 text-[12px] font-medium text-[#8A8A8A]">
                                Ilova tili
                            </p>
                        </div>

                        <div
                            className="
                                rounded-[12px]
                                bg-[#F2F2F2]
                                px-3
                                py-2
                                text-[12px]
                                font-black
                                text-black
                            "
                        >
                            O‘zbekcha
                        </div>

                    </div>

                </SettingSection>

                {/* ==================================================
                    SECURITY
                ================================================== */}

                <SettingSection
                    title="Xavfsizlik"
                >

                    <button
                        type="button"
                        onClick={
                            openPasswordModal
                        }
                        className="
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-4
                            px-4
                            py-4
                            text-left
                            transition
                            active:bg-[#FAFAFA]
                        "
                    >

                        <div className="min-w-0">
                            <p className="text-[12px] font-bold text-black">
                                Parolni o‘zgartirish
                            </p>

                            <p className="mt-1 text-[12px] font-medium text-[#8A8A8A]">
                                Hisob parolingizni yangilang
                            </p>
                        </div>

                        <i className="fa-solid fa-chevron-right shrink-0 text-[12px] text-[#A3A3A3]" />

                    </button>

                </SettingSection>

                {/* ==================================================
                    LOGOUT
                ================================================== */}

                <button
                    type="button"
                    onClick={() =>
                        setLogoutOpen(true)
                    }
                    className="
                        mb-4
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-[17px]
                        border
                        border-[#FECACA]
                        bg-[#FFF7F7]
                        px-4
                        py-3.5
                        text-[13px]
                        font-black
                        text-[#EF4444]
                        transition
                        active:scale-[0.99]
                    "
                >
                    <i className="fa-solid fa-right-from-bracket text-[12px]" />
                    Hisobdan chiqish
                </button>

                <p
                    className="
                        pb-4
                        text-center
                        text-[13px]
                        font-medium
                        text-[#B0B0B0]
                    "
                >
                    Maktab boshqaruv tizimi
                </p>

            </main>

            {/* ==================================================
                PASSWORD MODAL
            ================================================== */}

            {passwordOpen && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-end
                        justify-center
                        bg-black/40
                        sm:items-center
                        sm:p-4
                    "
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closePasswordModal();
                        }
                    }}
                >
                    <div
                        className="
                            max-h-[90dvh]
                            w-full
                            overflow-y-auto
                            rounded-t-[28px]
                            bg-white
                            p-5
                            sm:max-w-md
                            sm:rounded-[24px]
                        "
                    >

                        <div className="mb-5 flex items-start justify-between gap-3">

                            <div>
                                <h2 className="text-[18px] font-black text-black">
                                    Parolni o‘zgartirish
                                </h2>

                                <p className="mt-1 text-[12px] leading-4 text-[#8A8A8A]">
                                    Yangi parol kamida 6 ta belgidan iborat bo‘lsin.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    closePasswordModal
                                }
                                className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-[#F7F7F7]
                                    text-[#737373]
                                "
                            >
                                <i className="fa-solid fa-xmark text-[13px]" />
                            </button>

                        </div>

                        <form
                            onSubmit={
                                changePassword
                            }
                            className="space-y-3"
                        >

                            <PasswordInput
                                label="Joriy parol"
                                value={
                                    currentPassword
                                }
                                onChange={(e) =>
                                    setCurrentPassword(
                                        e.target.value
                                    )
                                }
                                show={
                                    showCurrentPassword
                                }
                                onToggle={() =>
                                    setShowCurrentPassword(
                                        (prev) =>
                                            !prev
                                    )
                                }
                            />

                            <PasswordInput
                                label="Yangi parol"
                                value={
                                    newPassword
                                }
                                onChange={(e) =>
                                    setNewPassword(
                                        e.target.value
                                    )
                                }
                                show={
                                    showNewPassword
                                }
                                onToggle={() =>
                                    setShowNewPassword(
                                        (prev) =>
                                            !prev
                                    )
                                }
                            />

                            <PasswordInput
                                label="Yangi parolni tasdiqlang"
                                value={
                                    confirmPassword
                                }
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                show={
                                    showConfirmPassword
                                }
                                onToggle={() =>
                                    setShowConfirmPassword(
                                        (prev) =>
                                            !prev
                                    )
                                }
                            />

                            {passwordError && (
                                <div className="rounded-[13px] bg-[#FFF0F0] px-3 py-2.5">
                                    <p className="text-[12px] font-bold leading-4 text-[#EF4444]">
                                        {passwordError}
                                    </p>
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="rounded-[13px] bg-[#F0FDF4] px-3 py-2.5">
                                    <p className="text-[12px] font-bold leading-4 text-[#16A34A]">
                                        {passwordSuccess}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={
                                    passwordLoading
                                }
                                className="
                                    mt-2
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    rounded-[16px]
                                    bg-black
                                    px-4
                                    py-3.5
                                    text-[13px]
                                    font-black
                                    text-white
                                "
                            >
                                {passwordLoading
                                    ? "Saqlanmoqda..."
                                    : "Parolni o‘zgartirish"}
                            </button>

                        </form>

                    </div>
                </div>
            )}

            {/* ==================================================
                LOGOUT MODAL
            ================================================== */}

            {logoutOpen && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-end
                        justify-center
                        bg-black/40
                        sm:items-center
                        sm:p-4
                    "
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setLogoutOpen(
                                false
                            );
                        }
                    }}
                >
                    <div
                        className="
                            w-full
                            rounded-t-[28px]
                            bg-white
                            p-5
                            sm:max-w-sm
                            sm:rounded-[24px]
                        "
                    >

                        <div
                            className="
                                mx-auto
                                flex
                                h-12
                                w-12
                                items-center
                                justify-center
                                rounded-2xl
                                bg-[#FFF0F0]
                                text-[#EF4444]
                            "
                        >
                            <i className="fa-solid fa-right-from-bracket text-[16px]" />
                        </div>

                        <h2 className="mt-4 text-center text-[18px] font-black text-black">
                            Hisobdan chiqish
                        </h2>

                        <p className="mt-2 text-center text-[13px] leading-5 text-[#8A8A8A]">
                            Haqiqatan ham ushbu hisobdan
                            chiqmoqchimisiz?
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-2">

                            <button
                                type="button"
                                onClick={() =>
                                    setLogoutOpen(
                                        false
                                    )
                                }
                                className="
                                    rounded-[15px]
                                    bg-[#F2F2F2]
                                    px-3
                                    py-3
                                    text-[13px]
                                    font-black
                                    text-[#737373]
                                "
                            >
                                Bekor qilish
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleLogout
                                }
                                className="
                                    rounded-[15px]
                                    bg-[#EF4444]
                                    px-3
                                    py-3
                                    text-[13px]
                                    font-black
                                    text-white
                                "
                            >
                                Chiqish
                            </button>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

// ============================================================
// SECTION
// ============================================================

function SettingSection({
    title,
    children,
}) {
    return (
        <section className="mb-5">

            <p
                className="
                    mb-2
                    px-1
                    text-[13px]
                    font-black
                    uppercase
                    tracking-[0.12em]
                    text-[#A3A3A3]
                "
            >
                {title}
            </p>

            <div
                className="
                    overflow-hidden
                    rounded-[20px]
                    border
                    border-black/[0.06]
                    bg-white
                "
            >
                {children}
            </div>

        </section>
    );
}

// ============================================================
// INFO ROW
// ============================================================

function SettingInfoRow({
    title,
    value,
    locked = false,
}) {
    return (
        <div
            className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-black/[0.05]
                px-4
                py-4
            "
        >
            <div className="min-w-0">

                <p className="text-[12px] font-bold text-black">
                    {title}
                </p>

                <p className="mt-1 truncate text-[13px] font-medium text-[#8A8A8A]">
                    {value || "—"}
                </p>

            </div>

            {locked && (
                <i className="fa-solid fa-lock shrink-0 text-[12px] text-[#B0B0B0]" />
            )}

        </div>
    );
}

// ============================================================
// TOGGLE
// ============================================================

function SettingToggle({
    title,
    description,
    checked,
    onChange,
    first = false,
}) {
    return (
        <div
            className={`
                flex
                items-center
                justify-between
                gap-4
                px-4
                py-4
                ${!first
                    ? "border-t border-black/[0.05]"
                    : ""
                }
            `}
        >
            <div className="min-w-0">

                <p className="text-[12px] font-bold text-black">
                    {title}
                </p>

                <p className="mt-1 text-[12px] leading-4 text-[#8A8A8A]">
                    {description}
                </p>

            </div>

            <button
                type="button"
                onClick={onChange}
                aria-pressed={checked}
                className={`
                    relative
                    h-[27px]
                    w-[47px]
                    shrink-0
                    rounded-full
                    transition-colors
                    ${checked
                        ? "bg-black"
                        : "bg-[#D9D9D9]"
                    }
                `}
            >
                <span
                    className={`
                        absolute
                        top-[3px]
                        h-[21px]
                        w-[21px]
                        rounded-full
                        bg-white
                        shadow-sm
                        transition-all
                        ${checked
                            ? "left-[23px]"
                            : "left-[3px]"
                        }
                    `}
                />
            </button>

        </div>
    );
}

// ============================================================
// APPEARANCE
// ============================================================

function AppearanceButton({
    value,
    current,
    onClick,
    icon,
    title,
}) {
    const active =
        value === current;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                flex
                min-h-[66px]
                flex-col
                items-center
                justify-center
                gap-2
                rounded-[14px]
                border
                transition
                active:scale-[0.98]
                ${active
                    ? "border-black bg-black text-white"
                    : "border-black/[0.06] bg-[#F7F7F7] text-[#737373]"
                }
            `}
        >
            <i
                className={`${icon} text-[13px]`}
            />

            <span className="text-[13px] font-bold">
                {title}
            </span>
        </button>
    );
}

// ============================================================
// PASSWORD INPUT
// ============================================================

function PasswordInput({
    label,
    value,
    onChange,
    show,
    onToggle,
}) {
    return (
        <div>

            <label
                className="
                    mb-1.5
                    block
                    text-[12px]
                    font-bold
                    text-[#737373]
                "
            >
                {label}
            </label>

            <div
                className="
                    flex
                    items-center
                    overflow-hidden
                    rounded-[14px]
                    border
                    border-black/[0.07]
                    bg-[#F7F7F7]
                    focus-within:border-black
                "
            >

                <input
                    type={
                        show
                            ? "text"
                            : "password"
                    }
                    value={value}
                    onChange={onChange}
                    className="
                        min-w-0
                        flex-1
                        bg-transparent
                        px-3
                        py-3
                        text-[12px]
                        font-bold
                        text-black
                        outline-none
                    "
                />

                <button
                    type="button"
                    onClick={onToggle}
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        text-[#8A8A8A]
                    "
                >
                    <i
                        className={
                            show
                                ? "fa-regular fa-eye-slash text-[12px]"
                                : "fa-regular fa-eye text-[12px]"
                        }
                    />
                </button>

            </div>

        </div>
    );
}