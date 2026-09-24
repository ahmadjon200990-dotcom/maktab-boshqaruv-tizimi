import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ChevronRight,
    GraduationCap,
    Search,
    UserRound,
    Users,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

export default function TeacherClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();

    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadClass();
    }, [classId]);

    async function loadClass() {
        try {
            setLoading(true);
            setError("");

            // =========================================================
            // LOGIN USER
            // =========================================================

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

            // =========================================================
            // TEACHER PROFILE
            // =========================================================

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("id, school_id, role")
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            // =========================================================
            // CLASS
            // =========================================================

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
                .eq("id", classId)
                .eq("school_id", profile.school_id)
                .single();

            if (classError) {
                throw classError;
            }

            // =========================================================
            // TEACHER HUQUQI
            // =========================================================

            if (
                classData.homeroom_teacher_id !==
                user.id
            ) {
                throw new Error(
                    "Bu sinf sizga biriktirilmagan."
                );
            }

            setClassInfo(classData);

            // =========================================================
            // STUDENTS
            // =========================================================

            const {
                data: studentsData,
                error: studentsError,
            } = await supabase
                .from("students")
                .select("*")
                .eq("class_id", classId)
                .eq("is_active", true)
                .order("created_at", {
                    ascending: true,
                });

            if (studentsError) {
                throw studentsError;
            }

            setStudents(studentsData || []);
        } catch (err) {
            console.error(
                "TeacherClassDetail error:",
                err
            );

            setError(
                err?.message ||
                    "Sinf ma'lumotlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // =========================================================
    // STUDENT NAME
    // =========================================================

    function getStudentName(student) {
        if (student.full_name) {
            return student.full_name;
        }

        const name =
            `${student.first_name || ""} ${
                student.last_name || ""
            }`.trim();

        if (name) {
            return name;
        }

        return (
            student.name ||
            student.email ||
            "Noma'lum o'quvchi"
        );
    }

    // =========================================================
    // INITIALS
    // =========================================================

    function getInitials(name) {
        const words = name
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!words.length) {
            return "?";
        }

        if (words.length === 1) {
            return words[0]
                .slice(0, 2)
                .toUpperCase();
        }

        return (
            words[0][0] +
            words[1][0]
        ).toUpperCase();
    }

    // =========================================================
    // AVATAR COLORS
    // =========================================================

    function getAvatarStyle(name) {
        const colors = [
            "bg-orange-100 text-orange-600",
            "bg-blue-100 text-blue-600",
            "bg-emerald-100 text-emerald-600",
            "bg-violet-100 text-violet-600",
            "bg-rose-100 text-rose-600",
            "bg-cyan-100 text-cyan-600",
        ];

        let hash = 0;

        for (let i = 0; i < name.length; i++) {
            hash =
                name.charCodeAt(i) +
                ((hash << 5) - hash);
        }

        return colors[
            Math.abs(hash) % colors.length
        ];
    }

    // =========================================================
    // FILTER
    // =========================================================

    const filteredStudents =
        students.filter((student) => {
            const name =
                getStudentName(
                    student
                ).toLowerCase();

            const email =
                (
                    student.email || ""
                ).toLowerCase();

            const phone =
                (
                    student.phone || ""
                ).toLowerCase();

            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return true;
            }

            return (
                name.includes(value) ||
                email.includes(value) ||
                phone.includes(value)
            );
        });

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="min-h-full bg-[#F7F7F7] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-7xl animate-pulse">
                    <div className="h-4 w-32 rounded bg-gray-200" />

                    <div className="mt-5 flex items-center gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-gray-200" />

                        <div>
                            <div className="h-8 w-32 rounded bg-gray-200" />

                            <div className="mt-2 h-4 w-48 rounded bg-gray-200" />
                        </div>
                    </div>

                    <div className="mt-6 h-11 rounded-xl bg-gray-200" />

                    <div className="mt-5 space-y-1">
                        {Array.from({
                            length: 8,
                        }).map((_, index) => (
                            <div
                                key={index}
                                className="h-16 rounded-xl bg-gray-200"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // ERROR
    // =========================================================

    if (error) {
        return (
            <div className="min-h-full bg-[#F7F7F7] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-7xl">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/teacher/classes"
                            )
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-950"
                    >
                        <ArrowLeft size={17} />

                        Sinflarga qaytish
                    </button>

                    <div className="mt-6">
                        <p className="font-semibold text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadClass}
                            className="mt-4 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            Qayta urinish
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // PAGE
    // =========================================================

    return (
        <div className="min-h-full bg-[#F7F7F7] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-7xl">

                {/* =================================================
                    BACK
                ================================================== */}

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/teacher/classes"
                        )
                    }
                    className="
                        flex items-center gap-2
                        text-sm font-semibold
                        text-gray-500
                        transition
                        hover:text-gray-950
                    "
                >
                    <ArrowLeft size={17} />

                    Sinflarga qaytish
                </button>

                {/* =================================================
                    BREADCRUMB
                ================================================== */}

                <div className="mt-6 flex items-center gap-2 text-xs font-medium text-gray-400 sm:text-sm">
                    <GraduationCap size={16} />

                    <span>
                        O‘qituvchi paneli
                    </span>

                    <span>/</span>

                    <span>
                        Sinflar
                    </span>
                </div>

                {/* =================================================
                    HEADER
                ================================================== */}

                <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-4">

                        {/* CLASS ICON */}

                        <div className="
                            flex
                            h-14 w-14
                            shrink-0
                            items-center
                            justify-center
                            rounded-2xl
                            bg-orange-100
                            text-lg
                            font-extrabold
                            text-orange-600
                            sm:h-16
                            sm:w-16
                            sm:text-xl
                        ">
                            {classInfo.name}
                        </div>

                        {/* TITLE */}

                        <div>
                            <h1 className="
                                text-2xl
                                font-bold
                                tracking-tight
                                text-gray-950
                                sm:text-3xl
                            ">
                                {classInfo.name}
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                {classInfo.grade_level}
                                -sinf
                                <span className="mx-2">
                                    •
                                </span>
                                Sinf
                            </p>
                        </div>
                    </div>

                    {/* =================================================
                        STUDENT COUNT
                    ================================================== */}

                    <div className="
                        flex
                        w-fit
                        items-center
                        gap-3
                        rounded-2xl
                        bg-orange-50
                        px-4
                        py-3
                    ">
                        <Users
                            size={20}
                            className="text-orange-500"
                        />

                        <div>
                            <p className="text-xs text-gray-500">
                                O‘quvchilar
                            </p>

                            <p className="text-lg font-bold text-gray-950">
                                {students.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* =================================================
                    SEARCH
                ================================================== */}

                <div className="relative mt-6">
                    <Search
                        size={18}
                        className="
                            absolute
                            left-4
                            top-1/2
                            -translate-y-1/2
                            text-gray-400
                        "
                    />

                    <input
                        type="text"
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                        placeholder="O‘quvchini qidirish..."
                        className="
                            h-12
                            w-full
                            rounded-2xl
                            border
                            border-black/[0.06]
                            bg-white
                            pl-11
                            pr-4
                            text-sm
                            text-gray-900
                            outline-none
                            transition
                            placeholder:text-gray-400
                            focus:border-orange-300
                            focus:ring-4
                            focus:ring-orange-50
                        "
                    />
                </div>

                {/* =================================================
                    STUDENT COUNT / RESULT
                ================================================== */}

                <div className="mt-5 flex items-center justify-between px-1">
                    <p className="text-sm font-semibold text-gray-700">
                        O‘quvchilar
                    </p>

                    <p className="text-xs font-medium text-gray-400">
                        {filteredStudents.length} ta
                    </p>
                </div>

                {/* =================================================
                    STUDENTS
                    NO WHITE CARD
                ================================================== */}

                {filteredStudents.length > 0 ? (
                    <div className="mt-2">

                        {filteredStudents.map(
                            (student, index) => {
                                const name =
                                    getStudentName(
                                        student
                                    );

                                return (
                                    <Link
                                        key={
                                            student.id
                                        }
                                        to={`/teacher/classes/${classId}/students/${student.id}`}
                                        className="
                                            group
                                            flex
                                            w-full
                                            items-center
                                            gap-3
                                            border-b
                                            border-black/[0.07]
                                            py-4
                                            text-left
                                            transition
                                            hover:bg-black/[0.015]
                                            sm:gap-4
                                            sm:py-4.5
                                        "
                                    >
                                        {/* AVATAR */}

                                        <div
                                            className={`
                                                flex
                                                h-11
                                                w-11
                                                shrink-0
                                                items-center
                                                justify-center
                                                rounded-full
                                                text-xs
                                                font-extrabold
                                                sm:h-12
                                                sm:w-12
                                                ${getAvatarStyle(
                                                    name
                                                )}
                                            `}
                                        >
                                            {getInitials(
                                                name
                                            )}
                                        </div>

                                        {/* INFO */}

                                        <div className="min-w-0 flex-1">
                                            <p className="
                                                truncate
                                                text-sm
                                                font-bold
                                                text-gray-950
                                                sm:text-[15px]
                                            ">
                                                {name}
                                            </p>

                                            <div className="
                                                mt-1
                                                flex
                                                min-w-0
                                                items-center
                                                gap-2
                                                text-xs
                                                text-gray-400
                                            ">
                                                {student.parent_name ? (
                                                    <>
                                                        <span className="truncate">
                                                            Ota-ona:{" "}
                                                            {
                                                                student.parent_name
                                                            }
                                                        </span>

                                                        {student.phone && (
                                                            <>
                                                                <span className="shrink-0">
                                                                    •
                                                                </span>

                                                                <span className="shrink-0">
                                                                    {
                                                                        student.phone
                                                                    }
                                                                </span>
                                                            </>
                                                        )}
                                                    </>
                                                ) : student.phone ? (
                                                    <span>
                                                        {
                                                            student.phone
                                                        }
                                                    </span>
                                                ) : student.email ? (
                                                    <span className="truncate">
                                                        {
                                                            student.email
                                                        }
                                                    </span>
                                                ) : (
                                                    <span>
                                                        O‘quvchi #
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ARROW */}

                                        <ChevronRight
                                            size={19}
                                            className="
                                                shrink-0
                                                text-gray-300
                                                transition
                                                group-hover:translate-x-0.5
                                                group-hover:text-gray-500
                                            "
                                        />
                                    </Link>
                                );
                            }
                        )}
                    </div>
                ) : (
                    <div className="py-14 text-center">
                        <UserRound
                            size={26}
                            className="mx-auto text-gray-300"
                        />

                        <p className="mt-3 text-sm font-semibold text-gray-700">
                            {search
                                ? "O‘quvchi topilmadi"
                                : "Bu sinfda o‘quvchilar yo‘q"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                            {search
                                ? `"${search}" bo‘yicha natija topilmadi.`
                                : "Faol o‘quvchilar shu yerda ko‘rinadi."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}