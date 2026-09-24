import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const createEmptyForm = () => ({
    first_name: "",
    last_name: "",
    subject: "",
    phone: "",
    email: "",
    password: "",
});

function SelectField({
    label,
    value,
    onChange,
    options,
    placeholder = "Tanlang",
    disabled = false,
}) {
    return (
        <div className="w-full">
            {label && (
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {label}
                </label>
            )}

            <div className="relative">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                    <option value="">{placeholder}</option>

                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                <span className="pointer-events-none absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <i className="fa-solid fa-chevron-down text-xs" />
                </span>
            </div>
        </div>
    );
}

function InputField({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    required = false,
    disabled = false,
}) {
    return (
        <div className="w-full">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete={
                    type === "password" ? "new-password" : "off"
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
        </div>
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
        <div className="w-full">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
                Telefon
            </label>

            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-100">
                <div className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600">
                    +998
                </div>

                <input
                    type="tel"
                    value={value}
                    onChange={handlePhoneChange}
                    placeholder="901234567"
                    maxLength={9}
                    minLength={9}
                    inputMode="numeric"
                    disabled={disabled}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
            </div>

            <p className="mt-1 text-xs font-medium text-slate-400">
                9 ta raqam kiriting
            </p>
        </div>
    );
}

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

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [search, setSearch] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(createEmptyForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchTeachers = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const { data, error: teachersError } = await supabase
                .from("teachers")
                .select(
                    `
                    id,
                    first_name,
                    last_name,
                    subject,
                    specialization,
                    phone,
                    email,
                    created_at
                `
                )
                .order("created_at", {
                    ascending: false,
                });

            if (teachersError) {
                throw new Error(
                    teachersError.message ||
                    "O‘qituvchilarni yuklashda xatolik yuz berdi"
                );
            }

            setTeachers(data || []);
        } catch (err) {
            console.error("fetchTeachers error:", err);

            setError(
                err?.message ||
                "O‘qituvchilarni yuklashda xatolik yuz berdi"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const subjects = useMemo(() => {
        const uniqueSubjects = [
            ...new Set(
                teachers
                    .map(
                        (teacher) =>
                            teacher.subject || teacher.specialization
                    )
                    .filter(Boolean)
            ),
        ];

        return uniqueSubjects.sort((a, b) =>
            a.localeCompare(b, "uz")
        );
    }, [teachers]);

    const subjectOptions = subjects.map((subject) => ({
        value: subject,
        label: subject,
    }));

    const filteredTeachers = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        return teachers.filter((teacher) => {
            const fullName =
                `${teacher.first_name || ""} ${teacher.last_name || ""
                    }`.toLowerCase();

            const subject = (
                teacher.subject ||
                teacher.specialization ||
                ""
            ).toLowerCase();

            const phone = formatPhone(teacher.phone).toLowerCase();
            const email = (teacher.email || "").toLowerCase();

            const matchesSearch =
                !searchValue ||
                fullName.includes(searchValue) ||
                subject.includes(searchValue) ||
                phone.includes(searchValue) ||
                email.includes(searchValue);

            const teacherSubject =
                teacher.subject || teacher.specialization || "";

            const matchesSubject =
                !subjectFilter ||
                teacherSubject === subjectFilter;

            return matchesSearch && matchesSubject;
        });
    }, [teachers, search, subjectFilter]);

    function updateForm(field, value) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function openModal() {
        setError("");
        setSuccess("");
        setForm(createEmptyForm());
        setShowModal(true);
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setForm(createEmptyForm());
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const firstName = form.first_name.trim();
            const lastName = form.last_name.trim();
            const subject = form.subject.trim();
            const phone = form.phone.trim();
            const email = form.email.trim().toLowerCase();
            const password = form.password;

            if (
                !firstName ||
                !lastName ||
                !subject ||
                !email ||
                !password
            ) {
                throw new Error(
                    "Ism, familiya, fan, email va parolni to‘ldiring"
                );
            }

            if (phone && phone.length !== 9) {
                throw new Error(
                    "Telefon raqami 9 ta raqamdan iborat bo‘lishi kerak"
                );
            }

            if (password.length < 6) {
                throw new Error(
                    "Parol kamida 6 ta belgidan iborat bo‘lishi kerak"
                );
            }

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                throw new Error(
                    "Email manzilini to‘g‘ri kiriting"
                );
            }

            const {
                data: sessionData,
                error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
                throw new Error(
                    sessionError.message ||
                    "Sessionni tekshirishda xatolik yuz berdi"
                );
            }

            const accessToken =
                sessionData?.session?.access_token;

            if (!accessToken) {
                throw new Error(
                    "Tizimga kirish muddati tugagan. Iltimos, qaytadan login qiling."
                );
            }

            const {
                data,
                error: functionError,
            } = await supabase.functions.invoke("clever-action", {
                body: {
                    first_name: firstName,
                    last_name: lastName,
                    subject,
                    phone,
                    email,
                    password,
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            console.log("clever-action data:", data);
            console.log(
                "clever-action error:",
                functionError
            );

            if (functionError) {
                let detailedMessage =
                    functionError.message ||
                    "O‘qituvchi yaratish funksiyasi ishlamadi";

                if (functionError.context) {
                    try {
                        const responseText =
                            await functionError.context.text();

                        console.error(
                            "Edge Function server javobi:",
                            responseText
                        );

                        if (responseText) {
                            try {
                                const parsedResponse =
                                    JSON.parse(responseText);

                                detailedMessage =
                                    parsedResponse?.error ||
                                    parsedResponse?.message ||
                                    responseText;
                            } catch {
                                detailedMessage = responseText;
                            }
                        }
                    } catch (readError) {
                        console.error(
                            "Server xatosini o‘qishda xato:",
                            readError
                        );
                    }
                }

                throw new Error(detailedMessage);
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            setSuccess(
                "O‘qituvchi muvaffaqiyatli qo‘shildi"
            );

            setShowModal(false);
            setForm(createEmptyForm());

            await fetchTeachers();
        } catch (err) {
            console.error("handleSubmit error:", err);

            setError(
                err?.message ||
                "O‘qituvchi qo‘shishda xatolik yuz berdi"
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-full bg-slate-50 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:gap-5 xl:flex-row xl:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-orange-600 sm:mb-3 sm:text-sm">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        Maktab boshqaruv tizimi
                    </div>

                    <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                        O‘qituvchilar
                    </h1>

                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Maktabdagi barcha o‘qituvchilarni boshqaring
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openModal}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 active:scale-[0.98] sm:w-auto sm:py-4"
                >
                    <i className="fa-solid fa-plus" />
                    Yangi o‘qituvchi
                </button>
            </div>

            {/* Error */}
            {error && !showModal && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 sm:mb-6 sm:px-5 sm:py-4">
                    <i className="fa-solid fa-circle-exclamation mt-0.5" />
                    <span className="">{error}</span>
                </div>
            )}

            {/* Success */}
            {success && (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-600 sm:mb-6 sm:px-5 sm:py-4">
                    <i className="fa-solid fa-circle-check" />
                    {success}
                </div>
            )}

            {/* Statistics */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 sm:mb-6 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <i className="fa-solid fa-chalkboard-user text-lg sm:text-2xl" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 sm:text-4xl">
                        {teachers.length}
                    </h2>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:mt-2 sm:text-sm">
                        Jami o‘qituvchilar
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 sm:mb-6 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <i className="fa-solid fa-book-open text-lg sm:text-2xl" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 sm:text-4xl">
                        {subjects.length}
                    </h2>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:mt-2 sm:text-sm">
                        Turli fanlar soni
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-6 sm:rounded-3xl sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-[1fr_260px]">
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 sm:left-5" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Ism, familiya, fan, telefon yoki email orqali qidiring..."
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100 sm:py-4 sm:pl-12 sm:pr-5"
                        />
                    </div>

                    <SelectField
                        value={subjectFilter}
                        onChange={setSubjectFilter}
                        placeholder="Barcha fanlar"
                        options={subjectOptions}
                    />
                </div>
            </div>

            {/* List header */}
            <div className="mb-4 flex items-center justify-between px-1">
                <div>
                    <h2 className="font-black text-slate-900 sm:text-lg">
                        O‘qituvchilar ro‘yxati
                    </h2>

                    <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                        {filteredTeachers.length} ta o‘qituvchi topildi
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchTeachers}
                    disabled={loading}
                    title="Yangilash"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
                >
                    <i
                        className={`fa-solid fa-rotate-right ${loading ? "animate-spin" : ""
                            }`}
                    />
                </button>
            </div>

            {loading ? (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
                    <i className="fa-solid fa-spinner animate-spin text-3xl text-orange-500" />
                </div>
            ) : filteredTeachers.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm sm:rounded-3xl">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <i className="fa-solid fa-users-slash text-3xl" />
                    </div>

                    <h3 className="text-lg font-black text-slate-800">
                        O‘qituvchilar topilmadi
                    </h3>

                    <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                        Hozircha o‘qituvchilar mavjud emas yoki
                        qidiruv bo‘yicha natija topilmadi.
                    </p>
                </div>
            ) : (
                <>
                    {/* Mobil va planshet uchun — alohida kartalar */}
                    <div className="flex flex-col gap-2.5 md:hidden">
                        {filteredTeachers.map((teacher) => {
                            const fullName =
                                `${teacher.first_name || ""} ${teacher.last_name || ""
                                    }`.trim();

                            const initials =
                                `${teacher.first_name?.[0] || ""}${teacher.last_name?.[0] || ""
                                    }`.toUpperCase();

                            const teacherSubject =
                                teacher.subject ||
                                teacher.specialization ||
                                "";

                            return (
                                <div
                                    key={teacher.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-600">
                                            {initials || "O‘"}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-800">
                                                {fullName ||
                                                    "Noma’lum o‘qituvchi"}
                                            </p>

                                            <span className="mt-1 inline-flex rounded-lg bg-cyan-50 px-2 py-0.5 text-xs font-bold text-cyan-700">
                                                {teacherSubject ||
                                                    "Fan kiritilmagan"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-3 text-xs">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <i className="fa-solid fa-phone w-3.5 shrink-0 text-slate-400" />
                                            <span className="font-medium text-slate-600">
                                                {formatPhone(teacher.phone)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-slate-500">
                                            <i className="fa-solid fa-envelope w-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate font-medium text-slate-600">
                                                {teacher.email || "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop uchun jadval ko‘rinishi */}
                    <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left">
                                <thead className="bg-slate-50">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            O‘qituvchi
                                        </th>

                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Fan
                                        </th>

                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Telefon
                                        </th>

                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-wide text-slate-400">
                                            Email
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredTeachers.map((teacher) => {
                                        const fullName =
                                            `${teacher.first_name || ""} ${teacher.last_name || ""
                                                }`.trim();

                                        const initials =
                                            `${teacher.first_name?.[0] || ""}${teacher.last_name?.[0] || ""
                                                }`.toUpperCase();

                                        const teacherSubject =
                                            teacher.subject ||
                                            teacher.specialization ||
                                            "";

                                        return (
                                            <tr
                                                key={teacher.id}
                                                className="border-b border-slate-100 transition last:border-0 hover:bg-orange-50/40"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 font-black text-orange-600">
                                                            {initials || "O‘"}
                                                        </div>

                                                        <div>
                                                            <p className="font-bold text-slate-800">
                                                                {fullName ||
                                                                    "Noma’lum o‘qituvchi"}
                                                            </p>

                                                            <p className="mt-1 text-xs font-medium text-slate-400">
                                                                O‘qituvchi
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5">
                                                    <span className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">
                                                        {teacherSubject ||
                                                            "Fan kiritilmagan"}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                                                    {formatPhone(teacher.phone)}
                                                </td>

                                                <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                                                    {teacher.email || "—"}
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

            {/* Add Teacher Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6 sm:py-5">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 sm:text-2xl">
                                    Yangi o‘qituvchi
                                </h2>

                                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                                    O‘qituvchi ma’lumotlarini kiriting
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5 p-5 sm:p-6"
                        >
                            {error && (
                                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                                    <i className="fa-solid fa-circle-exclamation mt-0.5" />

                                    <span className="">
                                        {error}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <InputField
                                    label="Ism"
                                    placeholder="Masalan: Ahmad"
                                    value={form.first_name}
                                    onChange={(value) =>
                                        updateForm("first_name", value)
                                    }
                                    required
                                    disabled={saving}
                                />

                                <InputField
                                    label="Familiya"
                                    placeholder="Masalan: Aliyev"
                                    value={form.last_name}
                                    onChange={(value) =>
                                        updateForm("last_name", value)
                                    }
                                    required
                                    disabled={saving}
                                />

                                <InputField
                                    label="Fan"
                                    placeholder="Masalan: Matematika"
                                    value={form.subject}
                                    onChange={(value) =>
                                        updateForm("subject", value)
                                    }
                                    required
                                    disabled={saving}
                                />

                                <PhoneField
                                    value={form.phone}
                                    onChange={(value) =>
                                        updateForm("phone", value)
                                    }
                                    disabled={saving}
                                />

                                <InputField
                                    label="Email"
                                    type="email"
                                    placeholder="teacher@gmail.com"
                                    value={form.email}
                                    onChange={(value) =>
                                        updateForm("email", value)
                                    }
                                    required
                                    disabled={saving}
                                />

                                <InputField
                                    label="Parol"
                                    type="password"
                                    placeholder="Kamida 6 ta belgi"
                                    value={form.password}
                                    onChange={(value) =>
                                        updateForm("password", value)
                                    }
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
                                <i className="fa-solid fa-circle-info mr-2" />
                                O‘qituvchi keyinchalik shu email va parol
                                bilan tizimga kiradi.
                            </div>

                            <div className="sticky bottom-0 -mx-5 flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 pb-1 pt-4 sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="w-full rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                    Bekor qilish
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {saving ? (
                                        <>
                                            <i className="fa-solid fa-spinner animate-spin" />
                                            Saqlanmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check" />
                                            O‘qituvchini saqlash
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}