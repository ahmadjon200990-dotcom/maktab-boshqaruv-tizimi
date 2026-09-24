import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const initialForm = {
    grade_level: "",
    section: "",
    homeroom_teacher_id: "",
};

const gradeOptions = Array.from({ length: 11 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}-sinf`,
}));

const sectionOptions = [
    { value: "A", label: "A" },
    { value: "B", label: "B" },
    { value: "D", label: "D" },
    { value: "E", label: "E" },
];

// Statistika kartochkalari uchun rang variantlari
const COLOR_STYLES = {
    orange: {
        card: "border-orange-100 bg-orange-50/70",
        icon: "bg-orange-100 text-orange-600",
        value: "text-orange-600",
    },
    cyan: {
        card: "border-cyan-100 bg-cyan-50/70",
        icon: "bg-cyan-100 text-cyan-600",
        value: "text-cyan-600",
    },
    yellow: {
        card: "border-amber-100 bg-amber-50/70",
        icon: "bg-amber-100 text-amber-600",
        value: "text-amber-600",
    },
};

function SelectField({
    label,
    value,
    onChange,
    options,
    placeholder = "Tanlang",
    required = false,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
            >
                <option value="">{placeholder}</option>

                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function getTeacherName(teacher) {
    if (!teacher) return "Biriktirilmagan";

    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""
        }`.trim();

    return fullName || "Noma’lum o‘qituvchi";
}

// Pastdan chiquvchi oyna — mobilda pastdan, katta ekranda markazda modal
function BottomSheet({ open, title, subtitle, onClose, children }) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <button
                type="button"
                aria-label="Oynani yopish"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
            />

            <div className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
                <div className="flex justify-center pt-3 sm:hidden">
                    <span className="h-1.5 w-12 rounded-full bg-slate-200" />
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black text-slate-900 sm:text-2xl">
                            {title}
                        </h2>

                        {subtitle && (
                            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-500 sm:h-10 sm:w-10"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

// Sinf qatori — mobil ro‘yxatda ishlatiladi
function ClassRow({ item, teacher, onOpen }) {
    const className = item.name || `${item.grade_level}-${item.section}`;

    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-orange-50/30"
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                <i className="fa-solid fa-school text-base" />
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-800">
                    {className}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-400">
                    {teacher
                        ? getTeacherName(teacher)
                        : "Sinf rahbari biriktirilmagan"}
                </p>
            </div>

            <span className="shrink-0 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-black text-orange-600">
                {item.grade_level}-{item.section}
            </span>

            <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300" />
        </button>
    );
}

export default function Classes() {
    const navigate = useNavigate();

    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);

    const [schoolId, setSchoolId] = useState("");
    const [academicYear, setAcademicYear] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(initialForm);

    const [search, setSearch] = useState("");
    const [gradeFilter, setGradeFilter] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function getCurrentUserData() {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (!user) {
            throw new Error("Foydalanuvchi tizimga kirmagan");
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, school_id, first_name, last_name, role")
            .eq("id", user.id)
            .single();

        if (profileError) {
            throw profileError;
        }

        if (!profile?.school_id) {
            throw new Error(
                "Profilingizga school_id biriktirilmagan. Profiles jadvalini tekshiring."
            );
        }

        return {
            user,
            profile,
        };
    }

    async function fetchAcademicYear(currentSchoolId) {
        const { data, error: academicYearError } = await supabase
            .from("academic_years")
            .select("id, school_id, name, start_date, end_date, is_active")
            .eq("school_id", currentSchoolId)
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (academicYearError) {
            throw academicYearError;
        }

        if (!data) {
            throw new Error(
                "Faol o‘quv yili topilmadi. Avval academic_years jadvaliga o‘quv yili qo‘shing."
            );
        }

        setAcademicYear(data);

        return data;
    }

    async function fetchTeachers(currentSchoolId) {
        const { data, error: teachersError } = await supabase
            .from("teachers")
            .select(
                `
        id,
        first_name,
        last_name,
        subject,
        phone,
        email
      `
            )
            .eq("school_id", currentSchoolId)
            .order("first_name", { ascending: true });

        if (teachersError) {
            throw teachersError;
        }

        setTeachers(data || []);
    }

    async function fetchClasses(currentSchoolId, academicYearId) {
        const { data, error: classesError } = await supabase
            .from("classes")
            .select(
                `
        id,
        school_id,
        academic_year_id,
        name,
        grade_level,
        section,
        homeroom_teacher_id,
        created_at
      `
            )
            .eq("school_id", currentSchoolId)
            .eq("academic_year_id", academicYearId)
            .order("grade_level", { ascending: true })
            .order("section", { ascending: true });

        if (classesError) {
            throw classesError;
        }

        setClasses(data || []);
    }

    async function loadPage() {
        try {
            setLoading(true);
            setError("");

            const { profile } = await getCurrentUserData();

            setSchoolId(profile.school_id);

            const currentAcademicYear = await fetchAcademicYear(
                profile.school_id
            );

            await Promise.all([
                fetchTeachers(profile.school_id),
                fetchClasses(profile.school_id, currentAcademicYear.id),
            ]);
        } catch (err) {
            console.error("Classes page error:", err);

            setError(
                err.message || "Sinflarni yuklashda xatolik yuz berdi"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPage();
    }, []);

    function updateForm(field, value) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function openCreateModal() {
        setForm(initialForm);
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setForm(initialForm);
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!schoolId) {
            setError("Maktab aniqlanmadi");
            return;
        }

        if (!academicYear?.id) {
            setError("Faol o‘quv yili topilmadi");
            return;
        }

        if (!form.grade_level) {
            setError("Sinf darajasini tanlang");
            return;
        }

        if (!form.section) {
            setError("Sinf bo‘limini tanlang");
            return;
        }

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
                throw new Error("Foydalanuvchi topilmadi");
            }

            const generatedClassName = `${form.grade_level}-${form.section}`;

            const duplicateClass = classes.some(
                (item) =>
                    String(item.grade_level) === String(form.grade_level) &&
                    item.section === form.section
            );

            if (duplicateClass) {
                throw new Error(
                    `${generatedClassName} sinfi allaqachon mavjud`
                );
            }

            const insertPayload = {
                school_id: schoolId,
                academic_year_id: academicYear.id,
                name: generatedClassName,
                grade_level: Number(form.grade_level),
                section: form.section,
                homeroom_teacher_id:
                    form.homeroom_teacher_id || null,
                created_by: user.id,
            };

            const { error: insertError } = await supabase
                .from("classes")
                .insert(insertPayload);

            if (insertError) {
                throw insertError;
            }

            setSuccess(
                `${generatedClassName} sinfi muvaffaqiyatli qo‘shildi`
            );

            setShowModal(false);
            setForm(initialForm);

            await fetchClasses(schoolId, academicYear.id);
        } catch (err) {
            console.error("Class insert error:", err);

            setError(
                err.message || "Sinf qo‘shishda xatolik yuz berdi"
            );
        } finally {
            setSaving(false);
        }
    }

    function getTeacherById(teacherId) {
        return teachers.find((teacher) => teacher.id === teacherId);
    }

    function openClassDetail(classId) {
        navigate(`/admin/classes/${classId}`);
    }

    const filteredClasses = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        return classes.filter((item) => {
            const teacher = getTeacherById(item.homeroom_teacher_id);

            const teacherName = getTeacherName(teacher).toLowerCase();

            const className = (
                item.name || `${item.grade_level}-${item.section}`
            ).toLowerCase();

            const matchesSearch =
                !searchValue ||
                className.includes(searchValue) ||
                teacherName.includes(searchValue);

            const matchesGrade =
                !gradeFilter ||
                String(item.grade_level) === String(gradeFilter);

            return matchesSearch && matchesGrade;
        });
    }, [classes, teachers, search, gradeFilter]);

    const totalClasses = classes.length;

    const assignedTeachersCount = classes.filter(
        (item) => item.homeroom_teacher_id
    ).length;

    return (
        <div className="min-h-full bg-[#f7f9fc] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1440px]">
                {/* HEADER */}
                <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:items-center">
                    <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-orange-600 sm:mb-3 sm:text-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 sm:h-2 sm:w-2" />
                            Maktab boshqaruv tizimi
                        </div>

                        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            Sinflar
                        </h1>

                        <p className="mt-1.5 text-xs font-medium text-slate-500 sm:mt-2 sm:text-sm">
                            Maktabdagi barcha sinflarni boshqaring
                        </p>

                        {academicYear && (
                            <div className="mt-2.5 inline-flex rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 sm:mt-3 sm:px-4 sm:py-2 sm:text-sm">
                                O‘quv yili: {academicYear.name}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex h-11 w-11 shrink-0 items-center justify-center gap-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 active:scale-[0.98] sm:h-auto sm:w-auto sm:px-6 sm:py-4"
                    >
                        <i className="fa-solid fa-plus" />
                        <span className="hidden text-sm font-bold sm:inline">
                            Sinf qo‘shish
                        </span>
                    </button>
                </div>

                {/* ERROR */}
                {error && !showModal && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 sm:mb-6 sm:px-5 sm:py-4">
                        <i className="fa-solid fa-circle-exclamation mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* SUCCESS */}
                {success && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-600 sm:mb-6 sm:px-5 sm:py-4">
                        <i className="fa-solid fa-circle-check mt-0.5" />
                        <span>{success}</span>
                    </div>
                )}

                {/* STATISTICS */}
                <div className="mb-5 flex gap-3 overflow-x-auto pb-1 sm:mb-6 sm:grid sm:grid-cols-3 sm:overflow-visible">
                    <div
                        className={`min-w-[160px] flex-1 rounded-3xl border p-4 sm:p-6 ${COLOR_STYLES.orange.card}`}
                    >
                        <div className="mb-3 flex items-center justify-between sm:mb-5">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${COLOR_STYLES.orange.icon}`}
                            >
                                <i className="fa-solid fa-school text-lg sm:text-2xl" />
                            </div>
                        </div>

                        <h2
                            className={`text-2xl font-black sm:text-4xl ${COLOR_STYLES.orange.value}`}
                        >
                            {totalClasses}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:mt-2 sm:text-sm">
                            Jami sinflar soni
                        </p>
                    </div>

                    <div
                        className={`min-w-[160px] flex-1 rounded-3xl border p-4 sm:p-6 ${COLOR_STYLES.cyan.card}`}
                    >
                        <div className="mb-3 flex items-center justify-between sm:mb-5">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${COLOR_STYLES.cyan.icon}`}
                            >
                                <i className="fa-solid fa-chalkboard-user text-lg sm:text-2xl" />
                            </div>
                        </div>

                        <h2
                            className={`text-2xl font-black sm:text-4xl ${COLOR_STYLES.cyan.value}`}
                        >
                            {assignedTeachersCount}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:mt-2 sm:text-sm">
                            Biriktirilgan rahbarlar
                        </p>
                    </div>

                    <div
                        className={`min-w-[160px] flex-1 rounded-3xl border p-4 sm:p-6 ${COLOR_STYLES.yellow.card}`}
                    >
                        <div className="mb-3 flex items-center justify-between sm:mb-5">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${COLOR_STYLES.yellow.icon}`}
                            >
                                <i className="fa-solid fa-filter text-lg sm:text-2xl" />
                            </div>
                        </div>

                        <h2
                            className={`text-2xl font-black sm:text-4xl ${COLOR_STYLES.yellow.value}`}
                        >
                            {filteredClasses.length}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-slate-500 sm:mt-2 sm:text-sm">
                            Qidiruv natijalari
                        </p>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm sm:mb-6 sm:p-5">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 sm:left-5" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Sinf yoki sinf rahbari bo‘yicha qidiring..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 sm:py-4 sm:pl-12 sm:pr-5"
                        />
                    </div>

                    {/* Mobil: chip ko‘rinishidagi daraja filtri */}
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 sm:hidden">
                        <button
                            type="button"
                            onClick={() => setGradeFilter("")}
                            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${gradeFilter === ""
                                ? "bg-orange-500 text-white"
                                : "bg-slate-100 text-slate-500"
                                }`}
                        >
                            Barchasi
                        </button>

                        {gradeOptions.map((grade) => (
                            <button
                                key={grade.value}
                                type="button"
                                onClick={() => setGradeFilter(grade.value)}
                                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${gradeFilter === grade.value
                                    ? "bg-orange-500 text-white"
                                    : "bg-slate-100 text-slate-500"
                                    }`}
                            >
                                {grade.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop: dropdown daraja filtri */}
                    <select
                        value={gradeFilter}
                        onChange={(event) => setGradeFilter(event.target.value)}
                        className="mt-3 hidden w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 sm:block sm:w-64"
                    >
                        <option value="">Barcha sinflar</option>

                        {gradeOptions.map((grade) => (
                            <option key={grade.value} value={grade.value}>
                                {grade.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* CLASSES LIST */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
                        <div>
                            <h2 className="text-base font-black text-slate-900 sm:text-lg">
                                Sinflar ro‘yxati
                            </h2>

                            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                                {filteredClasses.length} ta sinf topildi
                            </p>
                        </div>

                        <button
                            onClick={loadPage}
                            className="flex h-10 w-10 items-center justify-center self-end rounded-xl border border-slate-200 text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 sm:h-11 sm:w-11 sm:self-auto"
                            title="Yangilash"
                        >
                            <i className="fa-solid fa-rotate-right" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <i className="fa-solid fa-spinner animate-spin text-3xl text-orange-500" />
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <i className="fa-solid fa-school text-3xl" />
                            </div>

                            <h3 className="text-lg font-black text-slate-800">
                                Sinflar topilmadi
                            </h3>

                            <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                                Hozircha sinflar mavjud emas yoki qidiruv bo‘yicha
                                natija topilmadi.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Mobil ro‘yxat */}
                            <div className="divide-y divide-slate-100 lg:hidden">
                                {filteredClasses.map((item) => (
                                    <ClassRow
                                        key={item.id}
                                        item={item}
                                        teacher={getTeacherById(
                                            item.homeroom_teacher_id
                                        )}
                                        onOpen={() => openClassDetail(item.id)}
                                    />
                                ))}
                            </div>

                            {/* Desktop jadval */}
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-212 text-left">
                                    <thead className="bg-slate-50">
                                        <tr className="border-b border-slate-100">
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                №
                                            </th>

                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                Sinf
                                            </th>

                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                Daraja
                                            </th>

                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                Bo‘lim
                                            </th>

                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                Sinf rahbari
                                            </th>

                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                                Amallar
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredClasses.map((item, index) => {
                                            const teacher = getTeacherById(
                                                item.homeroom_teacher_id
                                            );

                                            const className =
                                                item.name ||
                                                `${item.grade_level}-${item.section}`;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="border-b border-slate-100 transition last:border-0 hover:bg-orange-50/40"
                                                >
                                                    <td className="px-6 py-5 text-sm font-bold text-slate-400">
                                                        {index + 1}
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                                                                <i className="fa-solid fa-school text-lg" />
                                                            </div>

                                                            <div>
                                                                <p className="font-black text-slate-800">
                                                                    {className}
                                                                </p>

                                                                <p className="mt-1 text-xs font-medium text-slate-400">
                                                                    Sinf
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-5 text-sm font-bold text-slate-600">
                                                        {item.grade_level}-sinf
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <span className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-600">
                                                            {item.section}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        {teacher ? (
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">
                                                                    {getTeacherName(teacher)}
                                                                </p>

                                                                {teacher.subject && (
                                                                    <p className="mt-1 text-xs text-slate-400">
                                                                        {teacher.subject}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                                                                Biriktirilmagan
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <button
                                                            onClick={() =>
                                                                openClassDetail(item.id)
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-50 px-4 py-2.5 text-xs font-black text-cyan-700 transition hover:bg-cyan-100"
                                                        >
                                                            <i className="fa-solid fa-arrow-right" />
                                                            Sinfni ko‘rish
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CREATE CLASS SHEET / MODAL */}
            <BottomSheet
                open={showModal}
                title="Yangi sinf qo‘shish"
                subtitle="Sinf ma’lumotlarini kiriting"
                onClose={closeModal}
            >
                <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                    {error && (
                        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                            <i className="fa-solid fa-circle-exclamation mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <SelectField
                            label="Sinf darajasi"
                            value={form.grade_level}
                            onChange={(value) => updateForm("grade_level", value)}
                            options={gradeOptions}
                            placeholder="Sinfni tanlang"
                            required
                        />

                        <SelectField
                            label="Bo‘lim"
                            value={form.section}
                            onChange={(value) => updateForm("section", value)}
                            options={sectionOptions}
                            placeholder="Bo‘limni tanlang"
                            required
                        />
                    </div>

                    {form.grade_level && form.section && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                                Sinf nomi
                            </p>

                            <p className="mt-1 text-2xl font-black text-orange-700">
                                {form.grade_level}-{form.section}
                            </p>

                            <p className="mt-1 text-xs font-medium text-orange-600">
                                Sinf nomi avtomatik yaratiladi
                            </p>
                        </div>
                    )}

                    <SelectField
                        label="Sinf rahbari"
                        value={form.homeroom_teacher_id}
                        onChange={(value) =>
                            updateForm("homeroom_teacher_id", value)
                        }
                        placeholder="Biriktirilmagan"
                        options={teachers.map((teacher) => ({
                            value: teacher.id,
                            label: `${getTeacherName(teacher)}${teacher.subject ? ` — ${teacher.subject}` : ""
                                }`,
                        }))}
                    />

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                        <i className="fa-solid fa-circle-info mr-2 text-orange-500" />
                        Sinf avtomatik ravishda faol o‘quv yiliga biriktiriladi.
                    </div>

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeModal}
                            disabled={saving}
                            className="rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Bekor qilish
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <i className="fa-solid fa-spinner animate-spin" />
                                    Saqlanmoqda...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check" />
                                    Sinfni saqlash
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </BottomSheet>
        </div>
    );
}