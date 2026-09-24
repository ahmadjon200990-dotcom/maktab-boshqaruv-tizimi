import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    GraduationCap,
    Search,
    Users,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function TeacherClasses() {
    const [profile, setProfile] = useState(null);
    const [classes, setClasses] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadClasses();
    }, []);

    async function loadClasses() {
        try {
            setLoading(true);
            setError("");

            // 1. Login qilgan user
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                setError("Foydalanuvchi topilmadi.");
                return;
            }

            // 2. Teacher profile
            const { data: profileData, error: profileError } =
                await supabase
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

            if (profileError) throw profileError;

            setProfile(profileData);

            // 3. Teacherga biriktirilgan sinflar
            const { data: classData, error: classError } =
                await supabase
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
                    .eq("homeroom_teacher_id", user.id)
                    .eq("school_id", profileData.school_id)
                    .order("grade_level", {
                        ascending: true,
                    });

            if (classError) throw classError;

            // 4. Har bir sinfdagi o'quvchilar soni
            const classesWithStudents = await Promise.all(
                (classData || []).map(async (classItem) => {
                    const { count, error: countError } =
                        await supabase
                            .from("students")
                            .select("id", {
                                count: "exact",
                                head: true,
                            })
                            .eq("class_id", classItem.id)
                            .eq("is_active", true);

                    if (countError) {
                        console.error(
                            `Students count error for ${classItem.name}:`,
                            countError
                        );
                    }

                    return {
                        ...classItem,
                        studentCount: count || 0,
                    };
                })
            );

            setClasses(classesWithStudents);
        } catch (err) {
            console.error("TeacherClasses error:", err);

            setError(
                err?.message ||
                    "Sinflarni yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    const filteredClasses = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) return classes;

        return classes.filter((item) => {
            const className = `${item.grade_level}-${item.section || ""}`
                .toLowerCase();

            return (
                item.name?.toLowerCase().includes(value) ||
                className.includes(value)
            );
        });
    }, [classes, search]);

    const totalStudents = useMemo(() => {
        return classes.reduce(
            (total, item) => total + item.studentCount,
            0
        );
    }, [classes]);

    return (
        <div className="min-h-full bg-[#F7F7F7] px-3 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-7">
            <div className="mx-auto max-w-7xl">

                {/* HEADER */}
                <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                            <GraduationCap size={15} />
                            <span>O‘qituvchi paneli</span>
                        </div>

                        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                            Sinflar
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            Sizga biriktirilgan sinflar
                        </p>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full sm:w-64">
                        <Search
                            size={17}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            placeholder="Sinfni qidirish..."
                            className="h-10 w-full rounded-xl border border-black/[0.06] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-black/15 focus:ring-2 focus:ring-black/[0.03]"
                        />
                    </div>
                </div>

                {/* SMALL SUMMARY */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-3 py-2">
                        <GraduationCap
                            size={16}
                            className="text-gray-500"
                        />

                        <span className="text-sm text-gray-500">
                            Sinflar
                        </span>

                        <span className="text-sm font-semibold text-gray-950">
                            {classes.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-3 py-2">
                        <Users
                            size={16}
                            className="text-gray-500"
                        />

                        <span className="text-sm text-gray-500">
                            O‘quvchilar
                        </span>

                        <span className="text-sm font-semibold text-gray-950">
                            {totalStudents}
                        </span>
                    </div>
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-40 animate-pulse rounded-2xl border border-black/[0.05] bg-white"
                            />
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <div className="rounded-2xl border border-red-100 bg-white p-5">
                        <p className="text-sm font-medium text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={loadClasses}
                            className="mt-3 rounded-lg bg-gray-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-black"
                        >
                            Qayta urinish
                        </button>
                    </div>
                )}

                {/* EMPTY */}
                {!loading &&
                    !error &&
                    filteredClasses.length === 0 && (
                        <div className="rounded-2xl border border-black/[0.05] bg-white px-5 py-12 text-center">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                                <GraduationCap size={20} />
                            </div>

                            <h3 className="mt-3 text-base font-semibold text-gray-950">
                                {search
                                    ? "Sinf topilmadi"
                                    : "Sizga biriktirilgan sinf yo‘q"}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                {search
                                    ? `"${search}" bo‘yicha natija topilmadi.`
                                    : "Sinf biriktirilgandan keyin shu yerda ko‘rinadi."}
                            </p>
                        </div>
                    )}

                {/* CLASSES */}
                {!loading &&
                    !error &&
                    filteredClasses.length > 0 && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredClasses.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/teacher/classes/${item.id}`}
                                    className="group rounded-2xl border border-black/[0.05] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-black/[0.09] hover:shadow-lg hover:shadow-black/[0.03]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-950">
                                            {item.name}
                                        </div>

                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition group-hover:bg-gray-100 group-hover:text-gray-950">
                                            <ArrowRight size={17} />
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <h2 className="text-base font-semibold text-gray-950">
                                            {item.name}
                                        </h2>

                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {item.grade_level}-sinf
                                        </p>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Users size={14} />
                                            <span>
                                                {item.studentCount} o‘quvchi
                                            </span>
                                        </div>

                                        <span className="text-xs font-medium text-gray-400 transition group-hover:text-gray-700">
                                            Ochish
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
            </div>
        </div>
    );
}