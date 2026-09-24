import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Clock3,
    MapPin,
    Check,
    X,
    Save,
    ArrowRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function formatTime(time) {
    if (!time) return "";

    return time.slice(0, 5);
}

export default function TeacherLessonDetail() {
    const { lessonId } = useParams();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState(null);
    const [students, setStudents] = useState([]);

    // studentId -> present / absent
    const [attendance, setAttendance] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Davomat saqlangan yoki yo'q
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!lessonId) return;

        loadLesson();
    }, [lessonId]);

    async function loadLesson() {
        try {
            setLoading(true);
            setError("");
            setSuccess("");
            setSaved(false);

            // 1. Joriy o'qituvchini olamiz
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

            // 2. Darsni olamiz
            const {
                data: lessonData,
                error: lessonError,
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
                .eq("id", lessonId)
                .eq("teacher_id", user.id)
                .single();

            if (lessonError) {
                throw lessonError;
            }

            if (!lessonData) {
                throw new Error(
                    "Dars topilmadi yoki bu dars sizga tegishli emas."
                );
            }

            setLesson(lessonData);

            // 3. Shu sinfdagi faol o'quvchilar
            const {
                data: studentsData,
                error: studentsError,
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
                .eq(
                    "class_id",
                    lessonData.class_id
                )
                .eq("is_active", true)
                .order("last_name", {
                    ascending: true,
                })
                .order("first_name", {
                    ascending: true,
                });

            if (studentsError) {
                throw studentsError;
            }

            const activeStudents =
                studentsData || [];

            setStudents(activeStudents);

            // 4. Bugungi davomatlarni olamiz
            const today = new Date()
                .toISOString()
                .slice(0, 10);

            const {
                data: attendanceData,
                error: attendanceError,
            } = await supabase
                .from("attendance")
                .select(`
                    student_id,
                    status
                `)
                .eq(
                    "lesson_id",
                    lessonData.id
                )
                .eq(
                    "attendance_date",
                    today
                );

            if (attendanceError) {
                throw attendanceError;
            }

            // 5. DB dagi davomatni objectga aylantiramiz
            const attendanceMap = {};

            (attendanceData || []).forEach(
                (item) => {
                    if (
                        item.status ===
                        "present" ||
                        item.status ===
                        "absent"
                    ) {
                        attendanceMap[
                            item.student_id
                        ] = item.status;
                    }
                }
            );

            setAttendance(attendanceMap);

            // Agar oldindan saqlangan davomat mavjud bo'lsa
            // button "Baholarga o'tish" bo'ladi
            if (
                Object.keys(attendanceMap)
                    .length > 0
            ) {
                setSaved(true);
            }
        } catch (err) {
            console.error(
                "Teacher lesson detail error:",
                err
            );

            setError(
                err?.message ||
                "Dars ma'lumotlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // O'quvchining davomatini tanlash
    function selectAttendance(
        studentId,
        status
    ) {
        setError("");
        setSuccess("");

        setAttendance((prev) => ({
            ...prev,
            [studentId]: status,
        }));

        // Davomat o'zgardi
        // qaytadan saqlash kerak
        setSaved(false);
    }

    // Davomatni saqlash
    async function saveAttendance() {
        if (!lesson) return;

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

            const today = new Date()
                .toISOString()
                .slice(0, 10);

            const records = Object.entries(
                attendance
            ).map(
                ([studentId, status]) => ({
                    student_id: studentId,
                    class_id: lesson.class_id,
                    subject_id:
                        lesson.subject_id,
                    lesson_id: lesson.id,
                    attendance_date: today,
                    status,
                    marked_by: user.id,
                })
            );

            if (records.length === 0) {
                setError(
                    "Avval o‘quvchilar uchun davomat belgilang."
                );

                return;
            }

            // Duplicate bo'lmasligi uchun upsert
            const { error: saveError } =
                await supabase
                    .from("attendance")
                    .upsert(records, {
                        onConflict:
                            "student_id,lesson_id,attendance_date",
                    });

            if (saveError) {
                throw saveError;
            }

            // Saqlandi
            setSaved(true);

            // Tepada notification
            setSuccess(
                "Davomat muvaffaqiyatli saqlandi."
            );

            // 2.5 sekunddan keyin notification yo'qoladi
            setTimeout(() => {
                setSuccess("");
            }, 2500);
        } catch (err) {
            console.error(
                "Attendance save error:",
                err
            );

            setError(
                err?.message ||
                "Davomatni saqlashda xatolik yuz berdi."
            );
        } finally {
            setSaving(false);
        }
    }

    // Loading
    if (loading) {
        return (
            <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-3xl">
                    <div className="animate-pulse space-y-4">
                        <div className="h-5 w-32 rounded-full bg-slate-200" />

                        <div className="h-28 rounded-2xl bg-white" />

                        <div className="h-80 rounded-2xl bg-white" />
                    </div>
                </div>
            </div>
        );
    }

    // Error
    if (error && !lesson) {
        return (
            <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-3xl">
                    <button
                        onClick={() =>
                            navigate(
                                "/teacher/schedule"
                            )
                        }
                        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition hover:text-slate-700"
                    >
                        <ArrowLeft size={16} />
                        Dars jadvaliga qaytish
                    </button>

                    <div className="mt-5 rounded-2xl border border-red-100 bg-white p-5">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={loadLesson}
                            className="mt-4 rounded-xl bg-[#33409E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A3480]"
                        >
                            Qayta urinish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

            {/* SUCCESS TOAST */}
            {success && (
                <div className="fixed left-1/2 top-[88px] z-50 w-[min(280px,calc(100%-32px))] -translate-x-1/2">
                    <div className="flex min-h-11 items-center gap-2.5 rounded-xl bg-[#33409E] px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg shadow-[#33409E]/20">
                        <Check
                            size={16}
                            strokeWidth={2.5}
                            className="shrink-0"
                        />

                        <span className="truncate">
                            {success}
                        </span>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-3xl">

                {/* BACK */}
                <button
                    onClick={() =>
                        navigate(
                            "/teacher/schedule"
                        )
                    }
                    className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition hover:text-slate-700"
                >
                    <ArrowLeft size={16} />
                    Dars jadvali
                </button>

                {/* LESSON HEADER */}
                <div className="mt-4 overflow-hidden rounded-2xl bg-white">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">

                        <div>
                            <p className="text-[13px] font-medium text-[#33409E]">
                                {lesson.shift === 1
                                    ? "1-smena"
                                    : "2-smena"}
                                {" · "}
                                {lesson.lesson_number}-dars
                            </p>

                            <h1 className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">
                                {lesson.classes?.name}
                            </h1>

                            <p className="mt-0.5 text-[15px] font-medium text-slate-400">
                                {lesson.subjects?.name}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <Clock3 size={14} />
                                {formatTime(lesson.start_time)}
                                {" – "}
                                {formatTime(lesson.end_time)}
                            </div>

                            {lesson.room && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={14} />
                                    {lesson.room}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ATTENDANCE */}
                <div className="mt-6">

                    {/* HEADER */}
                    <div className="mb-2.5 flex items-baseline justify-between px-1">
                        <div className="flex items-baseline gap-2">
                            <h2 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-slate-400">
                                <CalendarDays size={14} />
                                Davomat
                            </h2>
                        </div>

                        <span className="text-xs font-medium text-slate-400">
                            {students.length} ta o‘quvchi
                        </span>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {students.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                O‘quvchilar topilmadi
                            </p>

                            <p className="mt-1 text-[13px] text-slate-400">
                                Bu sinfda faol o‘quvchilar mavjud emas.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* STUDENTS */}
                            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                                {students.map(
                                    (student, index) => {
                                        const status =
                                            attendance[student.id];

                                        return (
                                            <div
                                                key={student.id}
                                                className={`
                                                    flex
                                                    items-center
                                                    gap-3
                                                    px-4
                                                    py-3
                                                    sm:px-5
                                                    ${
                                                        index !==
                                                        students.length - 1
                                                            ? "border-b border-slate-100"
                                                            : ""
                                                    }
                                                `}
                                            >
                                                {/* NUMBER */}
                                                <div className="w-5 shrink-0 text-[13px] tabular-nums text-slate-300">
                                                    {index + 1}
                                                </div>

                                                {/* AVATAR */}
                                                {student.avatar_url ? (
                                                    <img
                                                        src={student.avatar_url}
                                                        alt=""
                                                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#33409E]/10 text-[12px] font-bold text-[#33409E]">
                                                        {student.first_name?.[0]}
                                                        {student.last_name?.[0]}
                                                    </div>
                                                )}

                                                {/* NAME */}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[14.5px] font-medium text-slate-800">
                                                        {student.last_name}{" "}
                                                        {student.first_name}
                                                    </p>
                                                </div>

                                                {/* ATTENDANCE ICONS */}
                                                <div className="flex shrink-0 items-center gap-1.5">

                                                    {/* PRESENT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            selectAttendance(
                                                                student.id,
                                                                "present"
                                                            )
                                                        }
                                                        title="Keldi"
                                                        className={`
                                                            flex
                                                            h-8
                                                            w-8
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            transition
                                                            ${
                                                                status ===
                                                                "present"
                                                                    ? "bg-emerald-500 text-white"
                                                                    : "bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500"
                                                            }
                                                        `}
                                                    >
                                                        <Check
                                                            size={16}
                                                            strokeWidth={2.5}
                                                        />
                                                    </button>

                                                    {/* ABSENT */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            selectAttendance(
                                                                student.id,
                                                                "absent"
                                                            )
                                                        }
                                                        title="Kelmadi"
                                                        className={`
                                                            flex
                                                            h-8
                                                            w-8
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            transition
                                                            ${
                                                                status ===
                                                                "absent"
                                                                    ? "bg-red-500 text-white"
                                                                    : "bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500"
                                                            }
                                                        `}
                                                    >
                                                        <X
                                                            size={16}
                                                            strokeWidth={2.5}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>

                            {/* ACTION BUTTON */}
                            <div className="mt-5 flex justify-end">
                                {saved ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigate(`/teacher/lesson/${lessonId}/grades`);
                                        }}
                                        className="flex items-center gap-2 rounded-xl bg-[#33409E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#33409E]/20 transition hover:bg-[#2A3480]"
                                    >
                                        Baholarga o'tish
                                        <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={saveAttendance}
                                        disabled={saving}
                                        className="flex items-center gap-2 rounded-xl bg-[#33409E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#33409E]/20 transition hover:bg-[#2A3480] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        {saving
                                            ? "Saqlanmoqda..."
                                            : "Davomatni saqlash"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}