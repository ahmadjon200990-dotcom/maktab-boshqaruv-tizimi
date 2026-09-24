import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ============================================================
// UZBEK DATE / TIME
// ============================================================

const WEEKDAYS = [
    "yakshanba",
    "dushanba",
    "seshanba",
    "chorshanba",
    "payshanba",
    "juma",
    "shanba",
];

const MONTHS = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentabr",
    "oktabr",
    "noyabr",
    "dekabr",
];

function getDateTime() {
    const now = new Date();

    return {
        date: `${now.getDate()}-${MONTHS[now.getMonth()]}, ${WEEKDAYS[now.getDay()]
            }`,

        time: now.toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };
}

// ============================================================
// ICON BOX
// ============================================================

function IconBox({
    icon,
    className = "",
    iconClassName = "",
    size = "h-12 w-12 rounded-[16px]",
}) {
    return (
        <div
            className={`
                flex ${size} shrink-0
                items-center justify-center
                ${className}
            `}
        >
            <i
                className={`${icon} ${iconClassName} text-[18px]`}
            />
        </div>
    );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
    title,
    value,
    description,
    icon,
    background,
    iconColor,
    href,
}) {
    const content = (
        <div
            className="
        flex items-center
        rounded-[22px]
        border border-black/5
        bg-white
        p-4
        shadow-[0_1px_2px_rgba(0,0,0,0.04)]
        transition-transform
        active:scale-[0.97]
    "
        >


            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold leading-4 text-[#6B6B6B]">
                    {title}
                </p>

                <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-[22px] font-black leading-none tracking-tight text-black">
                        {value}
                    </span>

                    <span className="text-[11px] font-medium text-[#A3A3A3]">
                        {description}
                    </span>
                </div>
            </div>

            {href && (
                <i className="fa-solid fa-chevron-right text-[11px] text-[#C4C4C4]" />
            )}
        </div>
    );

    if (!href) {
        return content;
    }

    return (
        <NavLink to={href}>
            {content}
        </NavLink>
    );
}

// ============================================================
// LESSON ITEM
// ============================================================

function LessonItem({
    time,
    className,
    subject,
    icon = "fa-solid fa-book",
    background = "bg-[#F3E8FF]",
    iconColor = "text-[#8B5CF6]",
}) {
    return (
        <div
            className="
                flex items-center gap-3
                border-b border-black/5
                py-3.5
                last:border-b-0
            "
        >
            <div className="w-12.5 shrink-0 text-center">
                <p className="text-[13px] font-black text-black">
                    {time}
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-[#A3A3A3]">
                    dars
                </p>
            </div>

            <div className="h-9 w-px bg-black/6" />

            <IconBox
                icon={icon}
                className={background}
                iconClassName={iconColor}
                size="h-11 w-11 rounded-[14px]"
            />

            <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-black">
                    {className}
                </p>

                <p className="mt-0.5 truncate text-[12px] text-[#8A8A8A]">
                    {subject}
                </p>
            </div>

            <i className="fa-solid fa-chevron-right text-[11px] text-[#C4C4C4]" />
        </div>
    );
}

// ============================================================
// QUICK ACTION
// ============================================================

function QuickAction({
    title,
    icon,
    background,
    iconColor,
    href,
}) {
    return (
        <NavLink
            to={href}
            className="
                flex min-w-0
                flex-col
                rounded-[20px]
                border border-black/5
                bg-white
                p-4
                shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                transition-transform
                active:scale-[0.96]
            "
        >
            <p className="mt-3 truncate text-[13px] font-bold text-black">
                {title}
            </p>
        </NavLink>
    );
}

// ============================================================
// NOTIFICATION ITEM
// ============================================================

function NotificationItem({
    icon,
    background,
    iconColor,
    title,
    description,
    time,
}) {
    return (
        <div className="flex items-center gap-3 py-2.5">
            <IconBox
                icon={icon}
                className={background}
                iconClassName={iconColor}
                size="h-11 w-11 rounded-[14px]"
            />

            <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-black">
                    {title}
                </p>

                <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
                    {description}
                </p>
            </div>

            <span className="shrink-0 text-[10px] font-medium text-[#A3A3A3]">
                {time}
            </span>
        </div>
    );
}

// ============================================================
// LOADING
// ============================================================

function DashboardSkeleton() {
    return (
        <div className="w-full animate-pulse">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <div className="h-3 w-32 rounded bg-black/10" />
                    <div className="mt-2 h-7 w-52 rounded bg-black/10" />
                    <div className="mt-2 h-3 w-40 rounded bg-black/10" />
                </div>

                <div className="h-11 w-11 rounded-2xl bg-black/10" />
            </div>

            <div className="mb-5 h-44 rounded-[26px] bg-black/10" />

            <div className="grid grid-cols-2 gap-3">
                <div className="h-20 rounded-[22px] bg-black/10" />
                <div className="h-20 rounded-[22px] bg-black/10" />
                <div className="h-20 rounded-[22px] bg-black/10" />
                <div className="h-20 rounded-[22px] bg-black/10" />
            </div>
        </div>
    );
}

// ============================================================
// ERROR
// ============================================================

function ErrorState({ message, onRetry }) {
    return (
        <div className="flex min-h-100 items-center justify-center p-5">
            <div className="w-full max-w-md text-center">
                <div
                    className="
                        mx-auto flex h-14 w-14
                        items-center justify-center
                        rounded-2xl
                        bg-[#FFF0F0]
                        text-[#EF4444]
                    "
                >
                    <i className="fa-solid fa-triangle-exclamation text-xl" />
                </div>

                <h2 className="mt-4 text-lg font-black text-black">
                    Ma’lumotlarni yuklab bo‘lmadi
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#737373]">
                    {message}
                </p>

                <button
                    type="button"
                    onClick={onRetry}
                    className="
                        mt-5 rounded-xl
                        bg-black px-5 py-3
                        text-xs font-bold text-white
                        transition active:scale-95
                    "
                >
                    Qayta urinish
                </button>
            </div>
        </div>
    );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function TeacherDashboard() {
    const [profile, setProfile] = useState(null);
    const [homeroomClass, setHomeroomClass] = useState(null);
    const [studentCount, setStudentCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [dateTime, setDateTime] = useState(
        getDateTime()
    );

    // ========================================================
    // REAL CLOCK
    // ========================================================

    useEffect(() => {
        const timer = setInterval(() => {
            setDateTime(getDateTime());
        }, 30000);

        return () => clearInterval(timer);
    }, []);

    // ========================================================
    // SUPABASE DATA
    // ========================================================

    async function loadDashboard() {
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
                throw new Error(
                    "Foydalanuvchi topilmadi. Qaytadan login qiling."
                );
            }

            const {
                data: profileData,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    first_name,
                    last_name,
                    email,
                    role,
                    school_id
                `)
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            if (!profileData) {
                throw new Error(
                    "O‘qituvchi profili topilmadi."
                );
            }

            setProfile(profileData);

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

            if (classData?.id) {
                const {
                    count,
                    error: studentsError,
                } = await supabase
                    .from("students")
                    .select("id", {
                        count: "exact",
                        head: true,
                    })
                    .eq(
                        "class_id",
                        classData.id
                    );

                if (studentsError) {
                    throw studentsError;
                }

                setStudentCount(count || 0);
            } else {
                setStudentCount(0);
            }
        } catch (err) {
            console.error(
                "Teacher dashboard error:",
                err
            );

            setError(
                err?.message ||
                "Dashboard ma’lumotlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();
    }, []);

    const firstName = useMemo(() => {
        if (profile?.first_name?.trim()) {
            return profile.first_name.trim();
        }

        return "O‘qituvchi";
    }, [profile]);

    const className = useMemo(() => {
        if (!homeroomClass) {
            return "—";
        }

        if (homeroomClass.name) {
            return homeroomClass.name;
        }

        if (homeroomClass.grade_level) {
            return `${homeroomClass.grade_level}-${homeroomClass.section || ""
                }`;
        }

        return "—";
    }, [homeroomClass]);

    const statistics = [
        {
            title: "Rahbarlik sinfi",
            value: className,
            description: "sinf",
            icon: "fa-solid fa-school",
            background: "bg-[#F3E8FF]",
            iconColor: "text-[#8B5CF6]",
            href: "/teacher/classes",
        },
        {
            title: "O‘quvchilar",
            value: studentCount,
            description: "nafar",
            icon: "fa-solid fa-users",
            background: "bg-[#E8F1FF]",
            iconColor: "text-[#3B82F6]",
            href: "/teacher/classes",
        },
        {
            title: "Bugungi dars",
            value: "—",
            description: "jadval",
            icon: "fa-solid fa-calendar-days",
            background: "bg-[#FFF4DD]",
            iconColor: "text-[#F59E0B]",
            href: "/teacher/schedule",
        },
        {
            title: "Xabarlar",
            value: "—",
            description: "yangi",
            icon: "fa-solid fa-envelope",
            background: "bg-[#E8F8EF]",
            iconColor: "text-[#22C55E]",
            href: "/teacher/messages",
        },
    ];

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <ErrorState
                message={error}
                onRetry={loadDashboard}
            />
        );
    }

    return (
        <div
            className="
                mx-auto
                w-full
                max-w-6xl
                pb-3
            "
        >
            {/* ==================================================
                HEADER
            ================================================== */}

            <section
                className="
                    mb-5
                    flex items-center
                    justify-between gap-3
                "
            >
                <div className="min-w-0">
                    <p className="text-[13px] font-bold text-black">
                        Assalomu alaykum, {firstName}
                    </p>

                    <div
                        className="
                            mt-0.5
                            flex items-center gap-2
                            text-[12px]
                            font-medium
                            text-[#8A8A8A]
                        "
                    >
                        <span>
                            {dateTime.date}
                        </span>

                        <span className="text-black/20">
                            •
                        </span>

                        <span className="font-bold text-black">
                            {dateTime.time}
                        </span>
                    </div>
                </div>
            </section>

            {/* ==================================================
                MAIN BLACK HERO
            ================================================== */}

            <section
                className="
                    relative
                    mb-6
                    overflow-hidden
                    rounded-[26px]
                    bg-black
                    px-5 py-6
                    text-white
                    sm:px-6 sm:py-7
                "
            >
                <div className="relative z-10">

                    <div className="flex items-center gap-2">
                        <span
                            className="
                                flex h-7 w-7
                                items-center justify-center
                                rounded-xl
                                bg-white/10
                            "
                        >
                            <i className="fa-solid fa-chalkboard-user text-[12px]" />
                        </span>

                        <span
                            className="
                                text-[12px]
                                font-bold
                                text-white/60
                            "
                        >
                            O‘qituvchi paneli
                        </span>
                    </div>

                    <h2
                        className="
                            mt-4
                            max-w-md
                            text-[23px]
                            font-black
                            leading-tight
                            tracking-[-0.5px]
                            sm:text-[27px]
                        "
                    >
                        Bugungi darslaringiz
                        <br />

                        <span className="text-white/50">
                            sizni kutmoqda.
                        </span>
                    </h2>

                    <NavLink
                        to="/teacher/schedule"
                        className="
                            mt-5
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            bg-white
                            px-4 py-2.5
                            text-[12px]
                            font-extrabold
                            text-black
                            transition
                            active:scale-95
                        "
                    >
                        Jadvalni ko‘rish

                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </NavLink>
                </div>

                <div
                    className="
                        pointer-events-none
                        absolute
                        -right-12
                        -top-16
                        h-44
                        w-44
                        rounded-full
                        border-24
                        border-[#8B5CF6]/30
                    "
                />

                <div
                    className="
                        pointer-events-none
                        absolute
                        -bottom-20
                        right-24
                        h-36
                        w-36
                        rounded-full
                        border-18
                        border-[#3B82F6]/20
                    "
                />

                <div
                    className="
                        absolute
                        bottom-4
                        right-5
                        hidden
                        h-3
                        w-3
                        rounded-full
                        bg-[#22C55E]
                        sm:block
                    "
                />
            </section>

            {/* ==================================================
                STATISTICS
            ================================================== */}

            <section className="mb-6">

                <div className="mb-3">
                    <h2 className="text-[16px] font-black text-black">
                        Bugungi holat
                    </h2>

                    <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
                        Qisqacha ma’lumot
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {statistics.map((item) => (
                        <StatCard
                            key={item.title}
                            {...item}
                        />
                    ))}
                </div>
            </section>

            {/* ==================================================
                TODAY LESSONS
            ================================================== */}

            <section
                className="
                    mb-6
                    rounded-[22px]
                    border border-black/5
                    bg-white
                    p-4
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                    sm:p-5
                "
            >
                <div className="flex items-center justify-between">

                    <div>
                        <h2 className="text-[16px] font-black text-black">
                            Bugungi darslar
                        </h2>

                        <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
                            Bugun dars beradigan sinflaringiz
                        </p>
                    </div>

                    <NavLink
                        to="/teacher/schedule"
                        className="
                            flex h-8
                            items-center
                            justify-center
                            gap-1
                            text-[12px]
                            font-semibold
                            text-blue-500
                            active:scale-95
                        "
                    >
                        Ko'rish
                        <i className="fa-solid fa-arrow-right text-[10px]" />
                    </NavLink>
                </div>

                <div className="mt-2">

                    {/* Hozircha jadval schema'si ulanmagan */}

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            py-4
                        "
                    >
                        <IconBox
                            icon="fa-regular fa-calendar-xmark"
                            className="bg-[#FFF4DD]"
                            iconClassName="text-[#F59E0B]"
                            size="h-11 w-11 rounded-[14px]"
                        />

                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-black">
                                Dars jadvali
                            </p>

                            <p className="mt-0.5 text-[11px] leading-5 text-[#8A8A8A]">
                                Jadval ma’lumotlari kiritilganda shu yerda ko‘rinadi.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ==================================================
                QUICK ACTIONS
            ================================================== */}

            <section className="mb-6">

                <div className="mb-3">
                    <h2 className="text-[16px] font-black text-black">
                        Tezkor bo‘limlar
                    </h2>

                    <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
                        Kerakli bo‘limlarga tez o‘ting
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">

                    <QuickAction
                        title="Sinflar"
                        icon="fa-solid fa-school"
                        background="bg-[#F3E8FF]"
                        iconColor="text-[#8B5CF6]"
                        href="/teacher/classes"
                    />

                    <QuickAction
                        title="Xabarlar"
                        icon="fa-solid fa-envelope"
                        background="bg-[#E8F1FF]"
                        iconColor="text-[#3B82F6]"
                        href="/teacher/messages"
                    />

                    <QuickAction
                        title="Dars jadvali"
                        icon="fa-solid fa-calendar-days"
                        background="bg-[#FFF4DD]"
                        iconColor="text-[#F59E0B]"
                        href="/teacher/schedule"
                    />

                    <QuickAction
                        title="Profil"
                        icon="fa-solid fa-user"
                        background="bg-[#E8F8EF]"
                        iconColor="text-[#22C55E]"
                        href="/teacher/profile"
                    />
                </div>
            </section>

            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            <section
                className="
                    mb-2
                    rounded-[22px]
                    border border-black/5
                    bg-white
                    p-4
                    shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                    sm:p-5
                "
            >
                <div className="flex items-center justify-between">

                    <div>
                        <h2 className="text-[16px] font-black text-black">
                            So‘nggi bildirishnomalar
                        </h2>

                        <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
                            Muhim xabarlar
                        </p>
                    </div>

                    <div
                        className="
                            flex h-9 w-9
                            items-center
                            justify-center
                            rounded-xl
                            bg-[#FFF0F0]
                            text-[#EF4444]
                        "
                    >
                        <i className="fa-regular fa-bell text-[14px]" />
                    </div>
                </div>

                <div className="mt-3 divide-y divide-black/5">

                    <NotificationItem
                        icon="fa-solid fa-bullhorn"
                        background="bg-[#F3E8FF]"
                        iconColor="text-[#8B5CF6]"
                        title="Bildirishnomalar"
                        description="Yangi bildirishnomalar shu yerda chiqadi."
                        time="—"
                    />

                    <NotificationItem
                        icon="fa-solid fa-calendar-check"
                        background="bg-[#E8F8EF]"
                        iconColor="text-[#22C55E]"
                        title="Dars jadvali"
                        description="Jadval yangilanganda xabar beriladi."
                        time="—"
                    />
                </div>
            </section>
        </div>
    );
}