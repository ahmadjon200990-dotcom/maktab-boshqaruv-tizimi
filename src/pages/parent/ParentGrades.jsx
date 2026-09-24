import { useEffect, useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronDown,
    Check,
    X,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const DAYS = [
    { value: 1, label: "Dushanba", short: "Du" },
    { value: 2, label: "Seshanba", short: "Se" },
    { value: 3, label: "Chorshanba", short: "Cho" },
    { value: 4, label: "Payshanba", short: "Pa" },
    { value: 5, label: "Juma", short: "Ju" },
    { value: 6, label: "Shanba", short: "Sha" },
];

function getMonday(date) {
    const result = new Date(date);
    const day = result.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);

    return result;
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDayNumber(date) {
    const day = date.getDay();

    return day === 0 ? 7 : day;
}

export default function ParentGrades() {
    const [student, setStudent] = useState(null);

    const [lessons, setLessons] = useState([]);
    const [grades, setGrades] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDay, setSelectedDay] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [quarter, setQuarter] = useState("1");

    const weekStart = useMemo(() => {
        const today = new Date();
        const monday = getMonday(today);

        return addDays(monday, weekOffset * 7);
    }, [weekOffset]);

    const weekDays = useMemo(() => {
        return DAYS.map((day, index) => ({
            ...day,
            date: addDays(weekStart, index),
        }));
    }, [weekStart]);

    /*
     * Ota-onaga biriktirilgan o‘quvchini olish
     */
    useEffect(() => {
        let mounted = true;

        async function loadStudent() {
            setLoading(true);
            setError("");

            try {
                const {
                    data: { user },
                    error: authError,
                } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (!user) {
                    throw new Error("Foydalanuvchi topilmadi.");
                }

                const { data: profile, error: profileError } =
                    await supabase
                        .from("profiles")
                        .select(`
                            id,
                            role,
                            school_id,
                            student_id
                        `)
                        .eq("id", user.id)
                        .maybeSingle();

                if (profileError) throw profileError;

                if (!profile?.student_id) {
                    throw new Error(
                        "Ota-ona profiliga o‘quvchi biriktirilmagan."
                    );
                }

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
                        .eq("id", profile.student_id)
                        .maybeSingle();

                if (studentError) throw studentError;

                if (!studentData) {
                    throw new Error("O‘quvchi topilmadi.");
                }

                if (!mounted) return;

                setStudent(studentData);
            } catch (err) {
                console.error("Parent grades student error:", err);

                if (mounted) {
                    setError(
                        err?.message ||
                        "O‘quvchi ma’lumotlarini yuklab bo‘lmadi."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadStudent();

        return () => {
            mounted = false;
        };
    }, []);

    /*
     * Haqiqiy haftalik baho + davomat ma'lumotlarini olish
     */
    useEffect(() => {
        if (!student?.id || !student?.class_id) return;

        let mounted = true;

        async function loadGrades() {
            setLoading(true);
            setError("");

            try {
                const weekEnd = addDays(weekStart, 5);

                const startDate = toISODate(weekStart);
                const endDate = toISODate(weekEnd);

                /*
                 * Shu sinfning haftalik darslari
                 */
                const {
                    data: lessonData,
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
                        subjects (
                            id,
                            name
                        )
                    `)
                    .eq("class_id", student.class_id)
                    .order("weekday", { ascending: true })
                    .order("shift", { ascending: true })
                    .order("lesson_number", { ascending: true });

                if (lessonsError) throw lessonsError;

                /*
                 * O‘quvchining shu haftadagi baholari
                 */
                const {
                    data: gradeData,
                    error: gradesError,
                } = await supabase
                    .from("grades")
                    .select(`
                        id,
                        student_id,
                        class_id,
                        subject_id,
                        grade,
                        grade_type,
                        grade_date,
                        title,
                        comment,
                        created_at
                    `)
                    .eq("student_id", student.id)
                    .eq("class_id", student.class_id)
                    .gte("grade_date", startDate)
                    .lte("grade_date", endDate)
                    .order("grade_date", { ascending: true })
                    .order("created_at", { ascending: true });

                if (gradesError) throw gradesError;

                /*
                 * O‘quvchining shu haftadagi davomatlari
                 */
                const {
                    data: attendanceData,
                    error: attendanceError,
                } = await supabase
                    .from("attendance")
                    .select(`
                        id,
                        student_id,
                        class_id,
                        subject_id,
                        lesson_id,
                        attendance_date,
                        status,
                        reason,
                        marked_by,
                        created_at
                    `)
                    .eq("student_id", student.id)
                    .eq("class_id", student.class_id)
                    .gte("attendance_date", startDate)
                    .lte("attendance_date", endDate);

                if (attendanceError) throw attendanceError;

                if (!mounted) return;

                setLessons(lessonData || []);
                setGrades(gradeData || []);
                setAttendance(attendanceData || []);
            } catch (err) {
                console.error("Parent grades load error:", err);

                if (mounted) {
                    setError(
                        err?.message ||
                        "Baholarni yuklashda xatolik yuz berdi."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadGrades();

        return () => {
            mounted = false;
        };
    }, [student?.id, student?.class_id, weekStart]);

    /*
     * Tanlangan kun
     */
    const currentDay = weekDays[selectedDay];

    /*
     * Shu kunning darslari
     */
    const currentLessons = useMemo(() => {
        if (!currentDay) return [];

        return lessons.filter(
            (lesson) =>
                Number(lesson.weekday) === Number(currentDay.value)
        );
    }, [lessons, currentDay]);

    /*
     * Jadval uchun fanlar
     *
     * Bir xil fan bir necha marta bo‘lsa,
     * bittasini qoldiramiz.
     */
    const subjects = useMemo(() => {
        const map = new Map();

        currentLessons.forEach((lesson) => {
            if (!lesson.subject_id) return;

            if (!map.has(lesson.subject_id)) {
                map.set(lesson.subject_id, {
                    subjectId: lesson.subject_id,
                    subjectName:
                        lesson.subjects?.name || "Noma’lum fan",
                    lessonId: lesson.id,
                    lessonNumber: lesson.lesson_number,
                });
            }
        });

        return Array.from(map.values()).sort(
            (a, b) =>
                Number(a.lessonNumber || 0) -
                Number(b.lessonNumber || 0)
        );
    }, [currentLessons]);

    /*
     * Har bir fan uchun baho va davomatni topamiz
     */
    const rows = useMemo(() => {
        if (!currentDay) return [];

        const date = toISODate(currentDay.date);

        return subjects.map((subject, index) => {
            /*
             * Shu fan + shu sana bo‘yicha baholar
             */
            const subjectGrades = grades.filter(
                (item) =>
                    item.subject_id === subject.subjectId &&
                    item.grade_date === date
            );

            /*
             * Eng oxirgi bahoni ko‘rsatamiz
             */
            const latestGrade =
                subjectGrades.length > 0
                    ? subjectGrades[subjectGrades.length - 1]
                    : null;

            /*
             * Shu fanning lesson ID sini topamiz
             */
            const lessonForSubject = currentLessons.find(
                (lesson) =>
                    lesson.subject_id === subject.subjectId
            );

            /*
             * Davomat
             */
            const attendanceRecord = attendance.find(
                (item) =>
                    item.subject_id === subject.subjectId &&
                    item.attendance_date === date &&
                    (!lessonForSubject?.id ||
                        item.lesson_id === lessonForSubject.id)
            );

            return {
                number: index + 1,
                subject: subject.subjectName,
                grade: latestGrade?.grade ?? null,
                attendance: attendanceRecord?.status || null,
            };
        });
    }, [
        subjects,
        grades,
        attendance,
        currentDay,
        currentLessons,
    ]);

    /*
     * O‘quvchi ismi
     */
    const studentName = useMemo(() => {
        if (!student) return "";

        return `${student.first_name || ""} ${student.last_name || ""
            }`.trim();
    }, [student]);

    /*
     * Sinf nomi
     *
     * Agar classes relation keyin kerak bo‘lsa,
     * mavjud schema asosida class nomini alohida ulash mumkin.
     */
    const studentClassName = "Sinf";

    /*
     * Davomat holatini aniqlash
     */
    const isPresent = (status) => {
        if (!status) return null;

        const normalized = String(status).toLowerCase();

        return [
            "present",
            "keldi",
            "kelgan",
            "bor",
            "attended",
        ].includes(normalized);
    };

    /*
     * Keyingi hafta
     */
    const goNextWeek = () => {
        setWeekOffset((prev) => prev + 1);
        setSelectedDay(0);
    };

    /*
     * Oldingi hafta
     */
    const goPreviousWeek = () => {
        setWeekOffset((prev) => prev - 1);
        setSelectedDay(0);
    };

    if (loading && !student) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 pb-24 pt-3">
                <div className="mx-auto w-full max-w-107">
                    <div className="animate-pulse">
                        <div className="mx-auto mb-4 h-5 w-20 rounded bg-slate-200" />

                        <div className="mb-3 h-16 rounded-xl bg-white" />

                        <div className="mb-2 grid grid-cols-3 gap-1.5">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-12 rounded-xl bg-slate-200"
                                />
                            ))}
                        </div>

                        <div className="h-90 rounded-xl bg-white" />
                    </div>
                </div>
            </div>
        );
    }

    if (error && !student) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 pb-24 pt-3">
                <div className="mx-auto w-full max-w-107">
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#f8fafc] px-3 pb-24 pt-3">
            <div className="mx-auto w-full max-w-107">
                {/* Header */}
                <div className="relative mb-3 flex h-10 items-center justify-center">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full text-slate-700"
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <h1 className="text-[17px] font-bold text-slate-800">
                        Baholar
                    </h1>
                </div>

                {/* Student */}
                <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200">
                            {student?.avatar_url ? (
                                <img
                                    src={student.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">
                                    {studentName
                                        .split(" ")
                                        .map((item) => item[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-slate-800">
                                {studentName || "O‘quvchi"}
                            </p>

                            <p className="text-[10px] text-slate-400">
                                {studentClassName}
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <select
                            value={quarter}
                            onChange={(event) =>
                                setQuarter(event.target.value)
                            }
                            className="appearance-none rounded-lg bg-slate-50 py-2 pl-2.5 pr-7 text-[10px] font-medium text-slate-600 outline-none"
                        >
                            <option value="1">
                                1-chorak
                            </option>
                            <option value="2">
                                2-chorak
                            </option>
                            <option value="3">
                                3-chorak
                            </option>
                            <option value="4">
                                4-chorak
                            </option>
                        </select>

                        <ChevronDown
                            size={13}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                    </div>
                </div>

                {/* Days */}
                <div className="mb-2 grid grid-cols-3 gap-1.5">
                    {weekDays.slice(0, 3).map((day, index) => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => setSelectedDay(index)}
                            className={`rounded-xl px-1 py-2 text-center transition ${selectedDay === index
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-white text-slate-600"
                                }`}
                        >
                            <p className="text-[10px] font-bold">
                                {day.label}
                            </p>

                            <p className="mt-0.5 text-[8px] opacity-70">
                                {formatDate(day.date)}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Ikkinchi 3 kun */}
                <div className="mb-2 grid grid-cols-3 gap-1.5">
                    {weekDays.slice(3, 6).map((day, index) => {
                        const realIndex = index + 3;

                        return (
                            <button
                                key={day.value}
                                type="button"
                                onClick={() =>
                                    setSelectedDay(realIndex)
                                }
                                className={`rounded-xl px-1 py-2 text-center transition ${selectedDay === realIndex
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-white text-slate-600"
                                    }`}
                            >
                                <p className="text-[10px] font-bold">
                                    {day.label}
                                </p>

                                <p className="mt-0.5 text-[8px] opacity-70">
                                    {formatDate(day.date)}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="mb-2 rounded-xl bg-white px-3 py-2 text-center text-[10px] text-slate-400">
                        Ma’lumotlar yuklanmoqda...
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center text-[10px] text-red-500">
                        {error}
                    </div>
                )}

                {/* Grades table */}
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="grid grid-cols-[30px_1fr_62px_38px] items-center border-b border-slate-100 px-2 py-2 text-[9px] font-semibold text-slate-400">
                        <span>#</span>
                        <span>Fan</span>
                        <span className="text-center">
                            Davomat
                        </span>
                        <span className="text-center">
                            Baho
                        </span>
                    </div>

                    {rows.length > 0 ? (
                        rows.map((row) => {
                            const attendanceState = isPresent(
                                row.attendance
                            );

                            return (
                                <div
                                    key={`${row.subject}-${row.number}`}
                                    className="grid grid-cols-[30px_1fr_62px_38px] items-center border-b border-slate-100 px-2 py-2 last:border-b-0"
                                >
                                    <span className="text-[9px] text-slate-400">
                                        {row.number}
                                    </span>

                                    <span className="truncate pr-1 text-[10px] font-medium text-slate-700">
                                        {row.subject}
                                    </span>

                                    <div className="flex justify-center">
                                        {attendanceState === true ? (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-emerald-400 text-emerald-500">
                                                <Check
                                                    size={10}
                                                    strokeWidth={3}
                                                />
                                            </span>
                                        ) : attendanceState ===
                                            false ? (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-300 text-red-400">
                                                <X
                                                    size={10}
                                                    strokeWidth={3}
                                                />
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">
                                                -
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-center">
                                        {row.grade !== null &&
                                            row.grade !== undefined ? (
                                            <span className="flex h-5 min-w-6 items-center justify-center rounded-md bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-600">
                                                {row.grade}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">
                                                -
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-4 py-12 text-center">
                            <p className="text-[11px] font-medium text-slate-500">
                                Bu kunda darslar topilmadi
                            </p>

                            <p className="mt-1 text-[9px] text-slate-400">
                                Boshqa kunni tanlab ko‘ring
                            </p>
                        </div>
                    )}
                </div>

                {/* Next week */}
                <button
                    type="button"
                    onClick={goNextWeek}
                    className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-[10px] font-semibold text-white shadow-sm"
                >
                    Keyingi haftaning kunlari
                    <ArrowRight size={13} />
                </button>

                {/* Previous week */}
                {weekOffset !== 0 && (
                    <button
                        type="button"
                        onClick={goPreviousWeek}
                        className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white text-[10px] font-semibold text-blue-600"
                    >
                        <ArrowLeft size={13} />
                        Oldingi haftaning kunlari
                    </button>
                )}
            </div>
        </div>
    );
}