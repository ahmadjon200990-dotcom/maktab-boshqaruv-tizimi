import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    X,
    ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const DAYS = [
    {
        value: 1,
        label: "Dushanba",
        short: "Du",
    },
    {
        value: 2,
        label: "Seshanba",
        short: "Se",
    },
    {
        value: 3,
        label: "Chorshanba",
        short: "Cho",
    },
    {
        value: 4,
        label: "Payshanba",
        short: "Pa",
    },
    {
        value: 5,
        label: "Juma",
        short: "Ju",
    },
    {
        value: 6,
        label: "Shanba",
        short: "Sha",
    },
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

function getTodayWeekday() {
    const day = new Date().getDay();

    return day === 0 ? 7 : day;
}

function formatTime(time) {
    if (!time) {
        return "--:--";
    }

    return String(time).slice(0, 5);
}

export default function ParentDashboard() {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [modalDay, setModalDay] = useState(null);

    const now = new Date();
    const todayWeekday = getTodayWeekday();

    // ============================================
    // LOAD SCHEDULE
    // ============================================

    useEffect(() => {
        loadSchedule();
    }, []);

    async function loadSchedule() {
        try {
            setLoading(true);
            setError("");

            // ========================================
            // CURRENT USER
            // ========================================

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

            // ========================================
            // PARENT PROFILE
            // ========================================

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    role,
                    school_id,
                    student_id
                `)
                .eq("id", user.id)
                .eq("role", "parent")
                .maybeSingle();

            if (profileError) {
                throw profileError;
            }

            if (!profile) {
                throw new Error(
                    "Ota-ona profili topilmadi."
                );
            }

            if (!profile.student_id) {
                throw new Error(
                    "Ota-onaga o‘quvchi biriktirilmagan."
                );
            }

            // ========================================
            // STUDENT
            // ========================================

            const {
                data: student,
                error: studentError,
            } = await supabase
                .from("students")
                .select(`
                    id,
                    first_name,
                    last_name,
                    avatar_url,
                    class_id,
                    is_active
                `)
                .eq("id", profile.student_id)
                .maybeSingle();

            if (studentError) {
                throw studentError;
            }

            if (!student) {
                throw new Error(
                    "O‘quvchi ma’lumotlari topilmadi."
                );
            }

            if (!student.class_id) {
                throw new Error(
                    "O‘quvchiga sinf biriktirilmagan."
                );
            }

            // ========================================
            // LESSONS
            // ========================================

            const {
                data: lessonsData,
                error: lessonsError,
            } = await supabase
                .from("lessons")
                .select(`
                    id,
                    weekday,
                    shift,
                    lesson_number,
                    start_time,
                    end_time,
                    room,
                    class_id,
                    subject_id,
                    teacher_id,
                    classes (
                        id,
                        name,
                        grade_level,
                        section
                    ),
                    subjects (
                        id,
                        name
                    )
                `)
                .eq(
                    "class_id",
                    student.class_id
                )
                .order("weekday", {
                    ascending: true,
                })
                .order("shift", {
                    ascending: true,
                })
                .order("lesson_number", {
                    ascending: true,
                });

            if (lessonsError) {
                throw lessonsError;
            }

            setLessons(lessonsData || []);
        } catch (err) {
            console.error(
                "Parent schedule error:",
                err
            );

            setError(
                err?.message ||
                    "Dars jadvalini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // TODAY LESSONS
    // ============================================

    const todayLessons = useMemo(() => {
        return lessons
            .filter(
                (lesson) =>
                    Number(lesson.weekday) ===
                    Number(todayWeekday)
            )
            .sort((a, b) => {
                if (a.shift !== b.shift) {
                    return (
                        Number(a.shift || 0) -
                        Number(b.shift || 0)
                    );
                }

                return (
                    Number(a.lesson_number || 0) -
                    Number(b.lesson_number || 0)
                );
            });
    }, [lessons, todayWeekday]);

    // ============================================
    // AVAILABLE DAYS
    // ============================================

    const availableDays = useMemo(() => {
        const dayNumbers = new Set(
            lessons.map((lesson) =>
                Number(lesson.weekday)
            )
        );

        return DAYS.filter((day) =>
            dayNumbers.has(day.value)
        );
    }, [lessons]);

    // ============================================
    // MODAL LESSONS
    // ============================================

    const modalLessons = useMemo(() => {
        return lessons
            .filter(
                (lesson) =>
                    Number(lesson.weekday) ===
                    Number(modalDay)
            )
            .sort((a, b) => {
                if (a.shift !== b.shift) {
                    return (
                        Number(a.shift || 0) -
                        Number(b.shift || 0)
                    );
                }

                return (
                    Number(a.lesson_number || 0) -
                    Number(b.lesson_number || 0)
                );
            });
    }, [lessons, modalDay]);

    // ============================================
    // OPEN MODAL
    // ============================================

    function openDay(dayValue) {
        setModalDay(dayValue);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setModalDay(null);
    }

    // ============================================
    // DATE
    // ============================================

    const todayName =
        DAYS.find(
            (day) => day.value === todayWeekday
        )?.label || "";

    const todayDateText = `${now.getDate()}-${
        MONTHS[now.getMonth()]
    }, ${todayName}`;

    // ============================================
    // LOADING
    // ============================================

    if (loading) {
        return (
            <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
                <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

                    <p className="mt-3 text-sm text-slate-500">
                        Jadval yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    // ============================================
    // ERROR
    // ============================================

    if (error) {
        return (
            <div className="p-4 md:p-6">
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-600">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 md:py-7">

                {/* ========================================
                    DATE
                ======================================== */}

                <section className="mb-5">
                    <p className="text-[13px] font-medium text-slate-500">
                        Bugungi darslar
                    </p>

                    <h1 className="mt-1 text-[24px] font-bold tracking-tight text-slate-900 md:text-[28px]">
                        {todayDateText}
                    </h1>
                </section>

                {/* ========================================
                    TODAY LESSONS
                ======================================== */}

                <section className="mb-7">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h2 className="text-[16px] font-bold text-slate-900">
                                Bugungi darslar
                            </h2>

                            <p className="mt-0.5 text-[12px] text-slate-500">
                                Bugungi fanlar
                            </p>
                        </div>

                        <CalendarDays
                            size={19}
                            className="text-blue-500"
                        />
                    </div>

                    {todayLessons.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center">
                            <p className="text-sm font-medium text-slate-600">
                                Bugun darslar mavjud emas
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                Jadvalga darslar kiritilganda shu yerda ko‘rinadi.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {todayLessons.map(
                                (lesson) => (
                                    <TodayLesson
                                        key={lesson.id}
                                        lesson={lesson}
                                    />
                                )
                            )}
                        </div>
                    )}
                </section>

                {/* ========================================
                    WEEK DAYS
                ======================================== */}

                <section>
                    <div className="mb-3">
                        <h2 className="text-[16px] font-bold text-slate-900">
                            Haftalik jadval
                        </h2>

                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Dars mavjud kunlardan birini tanlang
                        </p>
                    </div>

                    {availableDays.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center">
                            <p className="text-sm text-slate-500">
                                Hozircha haftalik jadval mavjud emas.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
                            {availableDays.map((day) => {
                                const isToday =
                                    day.value ===
                                    todayWeekday;

                                const count =
                                    lessons.filter(
                                        (lesson) =>
                                            Number(
                                                lesson.weekday
                                            ) ===
                                            Number(
                                                day.value
                                            )
                                    ).length;

                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() =>
                                            openDay(
                                                day.value
                                            )
                                        }
                                        className={`
                                            rounded-2xl
                                            border
                                            px-3
                                            py-3
                                            text-left
                                            transition
                                            active:scale-[0.98]
                                            ${
                                                isToday
                                                    ? "border-blue-200 bg-blue-50"
                                                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span
                                                className={`
                                                    text-sm font-bold
                                                    ${
                                                        isToday
                                                            ? "text-blue-600"
                                                            : "text-slate-800"
                                                    }
                                                `}
                                            >
                                                {day.short}
                                            </span>

                                            <ChevronRight
                                                size={15}
                                                className={
                                                    isToday
                                                        ? "text-blue-500"
                                                        : "text-slate-400"
                                                }
                                            />
                                        </div>

                                        <p className="mt-1 text-[10px] text-slate-500">
                                            {count} ta dars
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ============================================
                DAY MODAL
            ============================================ */}

            {modalOpen && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-[3px]"
                    onClick={closeModal}
                >
                    <div
                        className="
                            relative
                            w-full
                            max-w-90
                            overflow-hidden
                            rounded-3xl
                            bg-white
                            shadow-2xl
                        "
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        {/* MODAL HEADER */}

                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <p className="text-[12px] font-medium text-slate-400">
                                    Haftalik jadval
                                </p>

                                <h2 className="mt-0.5 text-[21px] font-bold text-slate-900">
                                    {
                                        DAYS.find(
                                            (day) =>
                                                day.value ===
                                                modalDay
                                        )?.label
                                    }
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-100
                                    text-slate-500
                                    transition
                                    hover:bg-slate-200
                                "
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* MODAL SUBJECTS */}

                        <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
                            {modalLessons.length ===
                            0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm font-medium text-slate-500">
                                        Bu kuni dars yo‘q
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {modalLessons.map(
                                        (
                                            lesson,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    lesson.id
                                                }
                                                className="
                                                    flex
                                                    items-center
                                                    gap-3
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-slate-50
                                                    px-3.5
                                                    py-3
                                                "
                                            >
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-blue-600 shadow-sm">
                                                    {index +
                                                        1}
                                                </span>

                                                <p className="truncate text-[14px] font-semibold text-slate-800">
                                                    {lesson
                                                        .subjects
                                                        ?.name ||
                                                        "Fan"}
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* =========================================================
   TODAY LESSON
========================================================= */

function TodayLesson({ lesson }) {
    return (
        <div
            className="
                rounded-[17px]
                border
                border-slate-200
                bg-white
                px-4
                py-3
                shadow-[0_1px_3px_rgba(15,23,42,0.04)]
            "
        >
            <p className="truncate text-[15px] font-bold text-slate-900">
                {lesson.subjects?.name || "Fan"}
            </p>

            <p className="mt-1 text-[11px] font-medium text-slate-400">
                {formatTime(lesson.start_time)}
                {" — "}
                {formatTime(lesson.end_time)}
            </p>
        </div>
    );
}