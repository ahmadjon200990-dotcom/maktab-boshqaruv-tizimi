import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const StudentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [classInfo, setClassInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        const getStudent = async () => {
            try {
                setLoading(true);
                setErrorMessage("");

                if (!id) {
                    setErrorMessage("O‘quvchi ID raqami topilmadi.");
                    return;
                }

                // O‘quvchini olish
                const { data: studentData, error: studentError } = await supabase
                    .from("students")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();

                if (studentError) {
                    throw studentError;
                }

                if (!studentData) {
                    setErrorMessage("O‘quvchi topilmadi.");
                    return;
                }

                let selectedClass = null;

                // Sinfni class_id orqali olish
                if (studentData.class_id) {
                    const { data: classData, error: classError } = await supabase
                        .from("classes")
                        .select("id, name")
                        .eq("id", studentData.class_id)
                        .maybeSingle();

                    if (classError) {
                        console.error("Sinfni olishda xatolik:", classError);
                    } else {
                        selectedClass = classData;
                    }
                }

                if (isMounted) {
                    setStudent(studentData);
                    setClassInfo(selectedClass);
                }
            } catch (error) {
                console.error("O‘quvchini olishda xatolik:", error);

                if (isMounted) {
                    setStudent(null);
                    setErrorMessage(
                        "O‘quvchi ma’lumotlarini yuklashda xatolik yuz berdi."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getStudent();

        return () => {
            isMounted = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-[500px] items-center justify-center bg-[#f5f7fb]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />

                    <p className="text-sm font-medium text-slate-500">
                        O‘quvchi ma’lumotlari yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="min-h-[500px] bg-[#f5f7fb] p-4 md:p-6">
                <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:rounded-3xl sm:p-8 md:p-12">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 sm:h-20 sm:w-20">
                        <i className="fa-solid fa-user-slash text-2xl sm:text-3xl" />
                    </div>

                    <h2 className="mt-5 text-xl font-bold text-slate-900 sm:mt-6 sm:text-2xl">
                        O‘quvchi topilmadi
                    </h2>

                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                        {errorMessage ||
                            "Ushbu o‘quvchi haqida ma’lumot mavjud emas."}
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 sm:mt-7 sm:w-auto"
                    >
                        <i className="fa-solid fa-arrow-left" />
                        Orqaga qaytish
                    </button>
                </div>
            </div>
        );
    }

    const firstName = student.first_name || "";
    const lastName = student.last_name || "";
    const middleName = student.middle_name || "";

    const fullName =
        `${firstName} ${lastName} ${middleName}`
            .replace(/\s+/g, " ")
            .trim() || "Ism ko‘rsatilmagan";

    const className =
        classInfo?.name ||
        student.class_name ||
        student.class ||
        student.grade ||
        student.class_number ||
        "Sinf biriktirilmagan";

    const phone = student.phone || student.phone_number || "Kiritilmagan";

    const initials = fullName
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="min-h-screen bg-[#f5f7fb] p-3 sm:p-4 md:p-6">
            <div className="mx-auto max-w-[1500px]">
                {/* Page heading */}
                <div className="mb-5 sm:mb-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-orange-500 sm:mb-4"
                    >
                        <i className="fa-solid fa-arrow-left" />
                        O‘quvchilar ro‘yxati
                    </button>

                    <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
                        O‘quvchi profili
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        O‘quvchi haqida umumiy ma’lumotlar
                    </p>
                </div>

                {/* Profile card */}
                <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:mb-6 sm:rounded-3xl">
                    {/* Top color line */}
                    <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 sm:h-2" />

                    <div className="p-4 sm:p-5 md:p-8">
                        <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
                            {/* User info */}
                            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 text-xl font-bold text-orange-600 ring-4 ring-orange-50 sm:h-24 sm:w-24 sm:rounded-3xl sm:text-3xl sm:ring-8">
                                    {initials || "O‘"}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                        <h2 className="break-words text-lg font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
                                            {fullName}
                                        </h2>

                                        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 sm:px-4 sm:py-2 sm:text-sm">
                                            <i className="fa-solid fa-school" />
                                            {className}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Maktab o‘quvchisi
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
                                        <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                                            <i className="fa-solid fa-user-graduate text-orange-500" />
                                            O‘quvchi
                                        </span>

                                        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            Faol o‘quvchi
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Profile side info */}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 xl:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-medium text-slate-400">
                                        Sinfi
                                    </p>

                                    <p className="mt-1 truncate font-bold text-slate-800">
                                        {className}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-medium text-slate-400">
                                        Holati
                                    </p>

                                    <p className="mt-1 font-bold text-emerald-600">
                                        Faol
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main content */}
                <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3 xl:gap-6">
                    {/* Information card */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-5 md:p-6">
                        <div className="mb-5 flex items-center gap-3 sm:mb-6">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 sm:h-12 sm:w-12">
                                <i className="fa-solid fa-user text-base sm:text-lg" />
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                    Ma’lumotlar
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                                    O‘quvchi haqida ma’lumot
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 sm:space-y-5">
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Ism va familiya
                                </p>

                                <p className="font-semibold text-slate-800">
                                    {fullName}
                                </p>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Sinfi
                                </p>

                                <p className="font-semibold text-slate-800">
                                    {className}
                                </p>
                            </div>

                            <div className="h-px bg-slate-100" />

                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Telefon raqami
                                </p>

                                <div className="flex items-center gap-2">
                                    <i className="fa-solid fa-phone text-sm text-orange-500" />

                                    <p className="font-semibold text-slate-800">
                                        {phone}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Grades card */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-5 md:p-6">
                        <div className="mb-5 flex items-center gap-3 sm:mb-6">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 sm:h-12 sm:w-12">
                                <i className="fa-solid fa-graduation-cap text-base sm:text-lg" />
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                    Baholar
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                                    O‘quvchining baholari
                                </p>
                            </div>
                        </div>

                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center sm:min-h-[260px] sm:px-6 md:min-h-[300px]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-cyan-300 shadow-sm sm:h-20 sm:w-20">
                                <i className="fa-solid fa-chart-column text-2xl sm:text-3xl" />
                            </div>

                            <h4 className="mt-4 text-sm font-bold text-slate-700 sm:mt-5 sm:text-base">
                                Hozircha baholar yo‘q
                            </h4>

                            <p className="mt-2 max-w-xs text-xs leading-6 text-slate-400 sm:text-sm">
                                O‘qituvchi baholarni kiritgandan keyin ular shu bo‘limda
                                ko‘rinadi.
                            </p>

                            <span className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-400 shadow-sm sm:mt-5">
                                Tez orada
                            </span>
                        </div>
                    </section>

                    {/* Attendance card */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-5 md:p-6">
                        <div className="mb-5 flex items-center gap-3 sm:mb-6">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 sm:h-12 sm:w-12">
                                <i className="fa-solid fa-calendar-check text-base sm:text-lg" />
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                    Davomat
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
                                    O‘quvchining davomat holati
                                </p>
                            </div>
                        </div>

                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center sm:min-h-[260px] sm:px-6 md:min-h-[300px]">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-purple-300 shadow-sm sm:h-20 sm:w-20">
                                <i className="fa-solid fa-calendar-days text-2xl sm:text-3xl" />
                            </div>

                            <h4 className="mt-4 text-sm font-bold text-slate-700 sm:mt-5 sm:text-base">
                                Hozircha davomat yo‘q
                            </h4>

                            <p className="mt-2 max-w-xs text-xs leading-6 text-slate-400 sm:text-sm">
                                O‘quvchining davomat ma’lumotlari kiritilgandan keyin shu
                                bo‘limda ko‘rinadi.
                            </p>

                            <span className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-400 shadow-sm sm:mt-5">
                                Tez orada
                            </span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StudentDetail;