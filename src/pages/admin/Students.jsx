import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const createEmptyForm = () => ({
    first_name: "",
    last_name: "",
    class_id: "",
    phone: "",
    parent_email: "",
    parent_password: "",
});

function formatPhone(phone) {
    if (!phone) return "—";

    const digits = String(phone).replace(/\D/g, "");

    let localNumber = digits;

    if (digits.startsWith("998")) {
        localNumber = digits.slice(3);
    }

    if (localNumber.length === 9) {
        return `+998 ${localNumber.slice(0, 2)} ${localNumber.slice(
            2,
            5
        )} ${localNumber.slice(5, 7)} ${localNumber.slice(7, 9)}`;
    }

    return phone;
}

function getStudentName(student) {
    const fullName = `${student?.first_name || ""} ${student?.last_name || ""
        }`.trim();

    return fullName || "Noma’lum o‘quvchi";
}

function getStudentInitials(student) {
    const firstName = student?.first_name?.trim() || "";
    const lastName = student?.last_name?.trim() || "";

    const firstInitial = firstName.charAt(0);
    const lastInitial = lastName.charAt(0);

    return (
        `${firstInitial}${lastInitial}`.toUpperCase() || "O"
    );
}

function PhoneField({
    value,
    onChange,
    disabled = false,
}) {
    function handlePhoneChange(event) {
        const onlyDigits = event.target.value
            .replace(/\D/g, "")
            .slice(0, 9);

        onChange(onlyDigits);
    }

    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                Telefon raqam
            </label>

            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10">
                <div className="flex shrink-0 items-center border-r border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-600">
                    +998
                </div>

                <input
                    type="tel"
                    value={value}
                    onChange={handlePhoneChange}
                    placeholder="901234567"
                    maxLength={9}
                    inputMode="numeric"
                    disabled={disabled}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
            </div>

            <p className="mt-1 text-xs font-medium text-slate-400">
                9 ta raqam kiriting
            </p>
        </div>
    );
}

export default function Students() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(createEmptyForm);

    async function fetchData() {
        try {
            setLoading(true);
            setError("");

            const [
                { data: studentsData, error: studentsError },
                { data: classesData, error: classesError },
            ] = await Promise.all([
                supabase
                    .from("students")
                    .select(`
                        id,
                        first_name,
                        last_name,
                        phone,
                        class_id,
                        created_at,
                        classes (
                            id,
                            name,
                            grade_level,
                            section
                        )
                    `)
                    .order("created_at", {
                        ascending: false,
                    }),

                supabase
                    .from("classes")
                    .select(`
                        id,
                        name,
                        grade_level,
                        section
                    `)
                    .order("grade_level", {
                        ascending: true,
                    })
                    .order("name", {
                        ascending: true,
                    }),
            ]);

            if (studentsError) {
                throw studentsError;
            }

            if (classesError) {
                throw classesError;
            }

            setStudents(studentsData || []);
            setClasses(classesData || []);
        } catch (err) {
            console.error("fetchData error:", err);

            setError(
                err.message ||
                "Ma’lumotlarni yuklashda xatolik yuz berdi"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return students.filter((student) => {
            const fullName = getStudentName(student).toLowerCase();

            const phone = formatPhone(student.phone).toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                fullName.includes(normalizedSearch) ||
                phone.includes(normalizedSearch);

            const matchesClass =
                classFilter === "all" ||
                student.class_id === classFilter;

            return matchesSearch && matchesClass;
        });
    }, [students, search, classFilter]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setForm(createEmptyForm());
        setError("");
    }

    function openModal() {
        setError("");
        setSuccess("");
        setForm(createEmptyForm());
        setShowModal(true);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) return;

        setError("");
        setSuccess("");

        if (
            !form.first_name.trim() ||
            !form.last_name.trim() ||
            !form.class_id ||
            !form.parent_email.trim() ||
            !form.parent_password
        ) {
            setError("Barcha majburiy maydonlarni to‘ldiring");
            return;
        }

        if (form.phone && form.phone.length !== 9) {
            setError(
                "Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak"
            );
            return;
        }

        if (form.parent_password.length < 6) {
            setError(
                "Parol kamida 6 ta belgidan iborat bo‘lishi kerak"
            );
            return;
        }

        try {
            setSaving(true);

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                throw new Error(
                    "Admin foydalanuvchisi topilmadi"
                );
            }

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("school_id")
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            if (!profile?.school_id) {
                throw new Error(
                    "Admin uchun school_id topilmadi"
                );
            }

            const { error: insertError } = await supabase
                .from("students")
                .insert({
                    first_name: form.first_name.trim(),
                    last_name: form.last_name.trim(),
                    class_id: form.class_id,
                    phone: form.phone.trim() || null,
                    school_id: profile.school_id,
                    created_by: user.id,
                });

            if (insertError) {
                throw insertError;
            }

            setSuccess(
                "O‘quvchi muvaffaqiyatli qo‘shildi."
            );

            setShowModal(false);
            setForm(createEmptyForm());

            await fetchData();
        } catch (err) {
            console.error("handleSubmit error:", err);

            setError(
                err.message ||
                "O‘quvchini qo‘shishda xatolik yuz berdi"
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="min-h-screen bg-slate-50 px-3 py-5 sm:px-4 sm:py-6 md:px-8">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:gap-5 lg:flex-row lg:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-orange-600 sm:text-sm">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Maktab boshqaruv tizimi
                    </div>

                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                        O‘quvchilar
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Maktabdagi barcha o‘quvchilarni boshqaring
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openModal}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 active:scale-[0.98] sm:w-auto"
                >
                    <i className="fa-solid fa-plus" />
                    Yangi o‘quvchi
                </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                            <i className="fa-solid fa-users text-base sm:text-lg" />
                        </div>
                    </div>

                    <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                        {students.length}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                        Jami o‘quvchilar
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                            <i className="fa-solid fa-filter text-base sm:text-lg" />
                        </div>
                    </div>

                    <p className="text-2xl font-black text-slate-900 sm:text-3xl">
                        {filteredStudents.length}
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                        Filterdan keyingi natija
                    </p>
                </div>
            </div>

            {error && !showModal && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    <i className="fa-solid fa-circle-exclamation mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                    <i className="fa-solid fa-circle-check mt-0.5" />
                    <span>{success}</span>
                </div>
            )}

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-6 sm:rounded-3xl sm:p-4 md:p-5">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_260px]">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Ism, familiya yoki telefon orqali qidiring..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
                        />
                    </div>

                    <select
                        value={classFilter}
                        onChange={(event) =>
                            setClassFilter(event.target.value)
                        }
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white"
                    >
                        <option value="all">
                            Barcha sinflar
                        </option>

                        {classes.map((item) => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.name}
                                {item.section
                                    ? ` — ${item.section}`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-4 flex items-center justify-between px-1">
                <div>
                    <h2 className="font-black text-slate-900">
                        O‘quvchilar ro‘yxati
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        {filteredStudents.length} ta o‘quvchi topildi
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    title="Yangilash"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                >
                    <i
                        className={`fa-solid fa-rotate-right ${loading ? "animate-spin" : ""
                            }`}
                    />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-16 shadow-sm sm:rounded-3xl sm:py-20">
                    <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />

                    <p className="text-sm font-medium text-slate-500">
                        O‘quvchilar yuklanmoqda...
                    </p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm sm:rounded-3xl sm:py-20">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl text-slate-400">
                        <i className="fa-solid fa-user-group" />
                    </div>

                    <h3 className="font-bold text-slate-800">
                        O‘quvchilar topilmadi
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                        Qidiruv yoki sinf filterini o‘zgartirib ko‘ring.
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobil va planshet uchun — alohida, bo‘sh joy bilan ajratilgan kartalar */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {filteredStudents.map((student) => {
                            const studentName = getStudentName(student);

                            return (
                                <Link
                                    key={student.id}
                                    to={`/admin/students/${student.id}`}
                                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:border-orange-200 active:bg-orange-50/50"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
                                        {getStudentInitials(student)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-800">
                                            {studentName}
                                        </p>

                                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                                            <span className="truncate font-semibold text-slate-600">
                                                {student.classes?.name ||
                                                    "Sinf belgilanmagan"}
                                            </span>

                                            <span className="text-slate-300">
                                                •
                                            </span>

                                            <span className="truncate">
                                                {formatPhone(student.phone)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                        <i className="fa-solid fa-chevron-right text-xs" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Desktop uchun jadval ko‘rinishi */}
                    <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
                        <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left">
                                <thead className="bg-slate-50">
                                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-5 py-4 font-black">
                                            O‘quvchi
                                        </th>

                                        <th className="px-5 py-4 font-black">
                                            Sinf
                                        </th>

                                        <th className="px-5 py-4 font-black">
                                            Telefon
                                        </th>

                                        <th className="px-5 py-4 text-right font-black">
                                            Amallar
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map((student) => {
                                        const studentName =
                                            getStudentName(student);

                                        return (
                                            <tr
                                                key={student.id}
                                                className="transition hover:bg-orange-50/40"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-sm font-black text-orange-600">
                                                            {getStudentInitials(
                                                                student
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Link
                                                                to={`/admin/students/${student.id}`}
                                                                className="font-bold text-slate-800 transition hover:text-orange-600"
                                                            >
                                                                {studentName}
                                                            </Link>

                                                            <p className="mt-1 text-xs text-slate-400">
                                                                O‘quvchi profili
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-700">
                                                        {student.classes?.name ||
                                                            "Sinf belgilanmagan"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                                                    {formatPhone(
                                                        student.phone
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        to={`/admin/students/${student.id}`}
                                                        className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                                                    >
                                                        Ko‘rish
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-[28px]">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                                    Yangi o‘quvchi
                                </h2>

                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                    O‘quvchi va ota-ona ma’lumotlarini kiriting
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <i className="fa-solid fa-xmark text-lg" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 p-5 sm:p-6"
                        >
                            {error && (
                                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                    <i className="fa-solid fa-circle-exclamation mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Ism *
                                    </label>

                                    <input
                                        type="text"
                                        name="first_name"
                                        value={form.first_name}
                                        onChange={handleChange}
                                        placeholder="O‘quvchi ismi"
                                        required
                                        disabled={saving}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-orange-500 focus:bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Familiya *
                                    </label>

                                    <input
                                        type="text"
                                        name="last_name"
                                        value={form.last_name}
                                        onChange={handleChange}
                                        placeholder="O‘quvchi familiyasi"
                                        required
                                        disabled={saving}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-orange-500 focus:bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Sinf tanlash *
                                    </label>

                                    <select
                                        name="class_id"
                                        value={form.class_id}
                                        onChange={handleChange}
                                        required
                                        disabled={saving}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-500 focus:bg-white"
                                    >
                                        <option value="">
                                            Sinfni tanlang
                                        </option>

                                        {classes.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name}
                                                {item.section
                                                    ? ` — ${item.section}`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <PhoneField
                                    value={form.phone}
                                    onChange={(value) =>
                                        setForm((previous) => ({
                                            ...previous,
                                            phone: value,
                                        }))
                                    }
                                    disabled={saving}
                                />

                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Ota-ona emaili *
                                    </label>

                                    <input
                                        type="email"
                                        name="parent_email"
                                        value={form.parent_email}
                                        onChange={handleChange}
                                        placeholder="otaona@gmail.com"
                                        required
                                        disabled={saving}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-orange-500 focus:bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Ota-ona paroli *
                                    </label>

                                    <input
                                        type="password"
                                        name="parent_password"
                                        value={form.parent_password}
                                        onChange={handleChange}
                                        placeholder="Kamida 6 ta belgi"
                                        required
                                        disabled={saving}
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-orange-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                                Email va parol hozircha forma orqali olinadi.
                                Ota-ona accountini yaratish keyingi bosqichda
                                ulanadi.
                            </div>

                            <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                                >
                                    Bekor qilish
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full rounded-2xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60 sm:w-auto"
                                >
                                    {saving
                                        ? "Saqlanmoqda..."
                                        : "O‘quvchini saqlash"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}