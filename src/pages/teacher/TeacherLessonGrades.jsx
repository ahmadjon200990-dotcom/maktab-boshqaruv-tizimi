import { useEffect, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Check,
    Clock3,
    MapPin,
    Save,
    X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function formatTime(time) {
    if (!time) return "";

    return time.slice(0, 5);
}

export default function TeacherLessonGrades() {
    const { lessonId } = useParams();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState(null);
    const [students, setStudents] = useState([]);

    // studentId -> grade
    const [grades, setGrades] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Baholar DB dan saqlanganmi?
    const [saved, setSaved] = useState(false);

    // Toast animation
    const [showSuccess, setShowSuccess] = useState(false);

    // Modal
    const [selectedStudent, setSelectedStudent] =
        useState(null);

    // Modal ichida vaqtinchalik tanlangan baho
    const [selectedGrade, setSelectedGrade] =
        useState(null);

    useEffect(() => {
        if (!lessonId) return;

        loadLessonGrades();
    }, [lessonId]);

    // =========================================================
    // LOAD LESSON + STUDENTS + GRADES
    // =========================================================

    async function loadLessonGrades() {
        try {
            setLoading(true);
            setError("");
            setSuccess("");
            setSaved(false);

            // 1. Current teacher
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

            // 2. Lesson
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

            // 3. Students
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

            setStudents(studentsData || []);

            // 4. Today's grades
            const today = new Date()
                .toISOString()
                .slice(0, 10);

            const {
                data: gradesData,
                error: gradesError,
            } = await supabase
                .from("grades")
                .select(`
                    id,
                    student_id,
                    grade,
                    grade_type,
                    grade_date,
                    title,
                    comment
                `)
                .eq("teacher_id", user.id)
                .eq(
                    "subject_id",
                    lessonData.subject_id
                )
                .eq(
                    "class_id",
                    lessonData.class_id
                )
                .eq("grade_date", today)
                .eq(
                    "grade_type",
                    "classwork"
                );

            if (gradesError) {
                throw gradesError;
            }

            // 5. Grades -> object
            const gradeMap = {};

            (gradesData || []).forEach(
                (item) => {
                    gradeMap[item.student_id] =
                        Number(item.grade);
                }
            );

            setGrades(gradeMap);

            // Agar oldindan saqlangan baholar bo'lsa
            if (
                Object.keys(gradeMap).length > 0
            ) {
                setSaved(true);
            }
        } catch (err) {
            console.error(
                "Teacher lesson grades error:",
                err
            );

            setError(
                err?.message ||
                    "Baholarni yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // =========================================================
    // OPEN STUDENT MODAL
    // =========================================================

    function openGradeModal(student) {
        setSelectedStudent(student);

        setSelectedGrade(
            grades[student.id] || null
        );

        setError("");
    }

    // =========================================================
    // CLOSE MODAL
    // =========================================================

    function closeGradeModal() {
        setSelectedStudent(null);
        setSelectedGrade(null);
    }

    // =========================================================
    // SELECT GRADE IN MODAL
    // =========================================================

    function chooseGrade(grade) {
        if (!selectedStudent) return;

        setSelectedGrade(grade);
    }

    // =========================================================
    // CONFIRM GRADE
    // =========================================================

    function confirmGrade() {
        if (!selectedStudent) return;

        if (!selectedGrade) {
            setError(
                "Avval bahoni tanlang."
            );

            return;
        }

        setGrades((prev) => ({
            ...prev,
            [selectedStudent.id]:
                selectedGrade,
        }));

        // Bahoda o'zgarish bo'ldi
        setSaved(false);

        setError("");

        closeGradeModal();
    }

    // =========================================================
    // REMOVE GRADE
    // =========================================================

    function removeGrade() {
        if (!selectedStudent) return;

        setGrades((prev) => {
            const next = {
                ...prev,
            };

            delete next[selectedStudent.id];

            return next;
        });

        setSaved(false);

        closeGradeModal();
    }

    // =========================================================
    // SAVE GRADES
    // =========================================================

    async function saveGrades() {
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
                grades
            ).map(
                ([studentId, grade]) => ({
                    student_id: studentId,
                    class_id:
                        lesson.class_id,
                    subject_id:
                        lesson.subject_id,
                    teacher_id: user.id,
                    grade_type:
                        "classwork",
                    grade,
                    title: "Dars ishi",
                    grade_date: today,
                })
            );

            console.log("GRADE RECORDS:", records);

            if (records.length === 0) {
                setError(
                    "Avval o‘quvchilarga baho qo‘ying."
                );

                return;
            }

            // =================================================
            // OLD GRADES
            // =================================================

            const {
                error: deleteError,
            } = await supabase
                .from("grades")
                .delete()
                .eq(
                    "teacher_id",
                    user.id
                )
                .eq(
                    "class_id",
                    lesson.class_id
                )
                .eq(
                    "subject_id",
                    lesson.subject_id
                )
                .eq(
                    "grade_type",
                    "classwork"
                )
                .eq(
                    "grade_date",
                    today
                );

            if (deleteError) {
                throw deleteError;
            }

            // =================================================
            // NEW GRADES
            // =================================================

            const {
                error: insertError,
            } = await supabase
                .from("grades")
                .insert(records);

            if (insertError) {
                throw insertError;
            }

            // Saved
            setSaved(true);

            setSuccess(
                "Baholar muvaffaqiyatli saqlandi."
            );

            setShowSuccess(true);

            setTimeout(() => {
                setShowSuccess(false);

                setTimeout(() => {
                    setSuccess("");
                }, 300);
            }, 2500);
        } catch (err) {
            console.error(
                "Grades save error:",
                err
            );

            setError(
                err?.message ||
                    "Baholarni saqlashda xatolik yuz berdi."
            );
        } finally {
            setSaving(false);
        }
    }

    // =========================================================
    // LOADING
    // =========================================================

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

    // =========================================================
    // ERROR
    // =========================================================

    if (error && !lesson) {
        return (
            <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-3xl">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/teacher/lesson/${lessonId}`
                            )
                        }
                        className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition hover:text-slate-700"
                    >
                        <ArrowLeft size={16} />
                        Davomatga qaytish
                    </button>

                    <div className="mt-5 rounded-2xl border border-red-100 bg-white p-5">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={
                                loadLessonGrades
                            }
                            className="mt-4 rounded-xl bg-[#33409E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A3480]"
                        >
                            Qayta urinish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // MAIN
    // =========================================================

    return (
        <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

            {/* =================================================
                SUCCESS TOAST
            ================================================= */}

            {success && (
                <div
                    className={`
                        fixed
                        left-1/2
                        top-[88px]
                        z-50
                        w-[min(320px,calc(100%-32px))]
                        -translate-x-1/2
                        transition-all
                        duration-300
                        ease-out
                        ${
                            showSuccess
                                ? "translate-y-0 opacity-100"
                                : "-translate-y-3 opacity-0"
                        }
                    `}
                >
                    <div className="flex min-h-11 items-center gap-2.5 rounded-xl bg-[#33409E] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-[#33409E]/20">
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

                {/* =================================================
                    BACK
                ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            `/teacher/lesson/${lessonId}`
                        )
                    }
                    className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition hover:text-slate-700"
                >
                    <ArrowLeft size={16} />
                    Davomatga qaytish
                </button>

                {/* =================================================
                    LESSON HEADER
                ================================================= */}

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

                {/* =================================================
                    GRADES
                ================================================= */}

                <div className="mt-6">

                    {/* HEADER */}

                    <div className="mb-2.5 flex items-baseline justify-between px-1">
                        <h2 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-slate-400">
                            <CalendarDays size={14} />
                            Baholar · Dars ishi
                        </h2>

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

                    {/* =================================================
                        STUDENTS
                    ================================================= */}

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
                            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">

                                {students.map(
                                    (student, index) => {
                                        const grade =
                                            grades[student.id];

                                        return (
                                            <button
                                                key={student.id}
                                                type="button"
                                                onClick={() =>
                                                    openGradeModal(
                                                        student
                                                    )
                                                }
                                                className={`
                                                    group
                                                    flex
                                                    w-full
                                                    items-center
                                                    gap-3
                                                    px-4
                                                    py-3.5
                                                    text-left
                                                    transition-colors
                                                    hover:bg-[#EEF1FB]
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

                                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                                        Baho qo‘yish
                                                    </p>
                                                </div>

                                                {/* GRADE */}

                                                <div className="flex items-center gap-2">
                                                    {grade ? (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#33409E] text-sm font-bold text-white">
                                                            {grade}
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-200 text-sm text-slate-300">
                                                            —
                                                        </div>
                                                    )}

                                                    <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500">
                                                        ›
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    }
                                )}

                            </div>

                            {/* =================================================
                                ACTION BUTTONS
                            ================================================= */}

                            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                {/* DAVOMATGA QAYTISH */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/teacher/lesson/${lessonId}`
                                        )
                                    }
                                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                                >
                                    <ArrowLeft size={16} />
                                    Davomatga qaytish
                                </button>

                                {/* SAVE */}

                                {!saved && (
                                    <button
                                        type="button"
                                        onClick={saveGrades}
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-[#33409E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#33409E]/20 transition hover:bg-[#2A3480] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        {saving
                                            ? "Saqlanmoqda..."
                                            : "Baholarni saqlash"}
                                    </button>
                                )}

                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* =====================================================
                GRADE MODAL
            ===================================================== */}

            {selectedStudent && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeGradeModal();
                        }
                    }}
                >
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">

                        {/* MODAL HEADER */}

                        <div className="flex items-start justify-between gap-4">

                            <div className="flex min-w-0 items-center gap-3">

                                {selectedStudent.avatar_url ? (
                                    <img
                                        src={
                                            selectedStudent.avatar_url
                                        }
                                        alt=""
                                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#33409E]/10 text-sm font-bold text-[#33409E]">
                                        {
                                            selectedStudent
                                                .first_name?.[0]
                                        }
                                        {
                                            selectedStudent
                                                .last_name?.[0]
                                        }
                                    </div>
                                )}

                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold text-slate-900">
                                        {selectedStudent.last_name}{" "}
                                        {selectedStudent.first_name}
                                    </h3>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {lesson?.subjects?.name}
                                        {" · "}
                                        Dars ishi
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeGradeModal}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {/* DIVIDER */}

                        <div className="my-5 h-px bg-slate-100" />

                        {/* TITLE */}

                        <div className="text-center">
                            <p className="text-[13px] font-semibold text-slate-800">
                                Baho qo‘yish
                            </p>

                            <p className="mt-1 text-[13px] text-slate-400">
                                O‘quvchining bahosini tanlang
                            </p>
                        </div>

                        {/* GRADES */}

                        <div className="mt-5 flex justify-center gap-2.5">

                            {[1, 2, 3, 4, 5].map(
                                (number) => (
                                    <button
                                        key={number}
                                        type="button"
                                        onClick={() =>
                                            chooseGrade(number)
                                        }
                                        className={`
                                            flex
                                            h-11
                                            w-11
                                            items-center
                                            justify-center
                                            rounded-full
                                            text-sm
                                            font-bold
                                            transition
                                            ${
                                                selectedGrade ===
                                                number
                                                    ? "bg-[#33409E] text-white shadow-md shadow-[#33409E]/25"
                                                    : "border border-slate-200 bg-white text-slate-500 hover:border-[#33409E]/40 hover:bg-[#EEF1FB] hover:text-[#33409E]"
                                            }
                                        `}
                                    >
                                        {number}
                                    </button>
                                )
                            )}

                        </div>

                        {/* SELECTED */}

                        <div className="mt-5 flex min-h-10 items-center justify-center rounded-xl bg-slate-50">
                            {selectedGrade ? (
                                <p className="text-[13px] font-medium text-slate-600">
                                    Tanlangan baho:{" "}
                                    <span className="font-bold text-slate-900">
                                        {selectedGrade}
                                    </span>
                                </p>
                            ) : (
                                <p className="text-[13px] text-slate-400">
                                    Baho tanlanmagan
                                </p>
                            )}
                        </div>

                        {/* ACTIONS */}

                        <div className="mt-5 flex gap-2">

                            {grades[selectedStudent.id] && (
                                <button
                                    type="button"
                                    onClick={removeGrade}
                                    className="flex-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                                >
                                    Bahoni o‘chirish
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={confirmGrade}
                                disabled={!selectedGrade}
                                className="flex-1 rounded-xl bg-[#33409E] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2A3480] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Bahoni tanlash
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}