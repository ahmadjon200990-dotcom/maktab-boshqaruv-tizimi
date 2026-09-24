import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

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

const MONTHS_SHORT = [
    "Yanvar",
    "Fevral",
    "Mart",
    "Aprel",
    "May",
    "Iyun",
    "Iyul",
    "Avgust",
    "Sentabr",
    "Oktabr",
    "Noyabr",
    "Dekabr",
];

const WEEK_DAYS = [
    "Yakshanba",
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
];

const WEEK_DAYS_SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

const STATUS_OPTIONS = [
    {
        value: "all",
        label: "Barcha holatlar",
        description: "Barcha o‘quvchilar",
        icon: "fa-solid fa-users",
        color: "orange",
    },
    {
        value: "present",
        label: "Keldi",
        description: "Darsda qatnashgan",
        icon: "fa-solid fa-user-check",
        color: "green",
    },
    {
        value: "absent",
        label: "Kelmagan",
        description: "Darsga kelmagan",
        icon: "fa-solid fa-user-xmark",
        color: "red",
    },
    {
        value: "late",
        label: "Kechikdi",
        description: "Darsga kechikib kelgan",
        icon: "fa-solid fa-clock",
        color: "yellow",
    },
    {
        value: "excused",
        label: "Sababli",
        description: "Uzrli sabab bilan kelmagan",
        icon: "fa-solid fa-file-circle-check",
        color: "cyan",
    },
    {
        value: "not_marked",
        label: "Kiritilmagan",
        description: "Davomat hali kiritilmagan",
        icon: "fa-solid fa-minus",
        color: "slate",
    },
];

// Har bir o‘quvchi uchun avatar rangini navbat bilan tayinlaydi
const AVATAR_PALETTE = [
    { bg: "bg-orange-100", text: "text-orange-600" },
    { bg: "bg-emerald-100", text: "text-emerald-600" },
    { bg: "bg-sky-100", text: "text-sky-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-violet-100", text: "text-violet-600" },
    { bg: "bg-red-100", text: "text-red-600" },
    { bg: "bg-cyan-100", text: "text-cyan-600" },
    { bg: "bg-amber-100", text: "text-amber-600" },
];

// Sinf tanlash ro‘yxatidagi belgi ranglari (navbat bilan)
const CLASS_DOT_PALETTE = [
    "bg-emerald-500",
    "bg-red-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-pink-500",
];

function getLocalDate() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatUzbekDate(value) {
    if (!value) return "Sana tanlanmagan";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return `${date.getDate()}-${MONTHS[date.getMonth()]}, ${date.getFullYear()
        }-yil`;
}

// Mobil sarlavha uchun qisqa ko‘rinish: "19-sentabr"
function formatCompactDate(value) {
    if (!value) return "Sana tanlanmagan";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return `${date.getDate()}-${MONTHS[date.getMonth()]}`;
}

function formatShortDate(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return `${String(date.getDate()).padStart(2, "0")}.${String(
        date.getMonth() + 1
    ).padStart(2, "0")}.${date.getFullYear()}`;
}

function getDayName(value) {
    if (!value) return "";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return WEEK_DAYS[date.getDay()];
}

function toDateValue(year, month, day) {
    const y = String(year).padStart(4, "0");
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Sanani kun birligida siljitadi (mobil sarlavhadagi < > tugmalari uchun)
function shiftDate(value, delta) {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    date.setDate(date.getDate() + delta);

    return toDateValue(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStudentName(student) {
    const fullName = `${student?.first_name || ""} ${student?.last_name || ""
        }`.trim();

    return fullName || "Noma’lum o‘quvchi";
}

function getInitials(name) {
    return (
        name
            .split(" ")
            .filter(Boolean)
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "O‘"
    );
}

function getAvatarColors(index) {
    return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}

function getClassName(student) {
    if (student?.classes?.name) {
        return student.classes.name;
    }

    if (student?.classes?.grade_level) {
        return `${student.classes.grade_level}-${student.classes.section || ""
            }`;
    }

    return "Sinf biriktirilmagan";
}

function getStatusInfo(status) {
    switch (status) {
        case "present":
            return {
                value: "present",
                label: "Keldi",
                description: "Darsda qatnashgan",
                icon: "fa-solid fa-check",
                dot: "bg-emerald-500",
                text: "text-emerald-700",
                background: "bg-emerald-50",
                border: "border-emerald-100",
                soft: "bg-emerald-100",
                ring: "ring-emerald-200",
            };

        case "absent":
        case "unexcused":
            return {
                value: "absent",
                label: "Kelmagan",
                description: "Darsga kelmagan",
                icon: "fa-solid fa-xmark",
                dot: "bg-red-500",
                text: "text-red-700",
                background: "bg-red-50",
                border: "border-red-100",
                soft: "bg-red-100",
                ring: "ring-red-200",
            };

        case "late":
            return {
                value: "late",
                label: "Kechikdi",
                description: "Darsga kechikib kelgan",
                icon: "fa-solid fa-clock",
                dot: "bg-amber-500",
                text: "text-amber-700",
                background: "bg-amber-50",
                border: "border-amber-100",
                soft: "bg-amber-100",
                ring: "ring-amber-200",
            };

        case "excused":
            return {
                value: "excused",
                label: "Sababli",
                description: "Uzrli sabab bilan kelmagan",
                icon: "fa-solid fa-file-circle-check",
                dot: "bg-cyan-500",
                text: "text-cyan-700",
                background: "bg-cyan-50",
                border: "border-cyan-100",
                soft: "bg-cyan-100",
                ring: "ring-cyan-200",
            };

        default:
            return {
                value: "not_marked",
                label: "Kiritilmagan",
                description: "Davomat hali kiritilmagan",
                icon: "fa-solid fa-minus",
                dot: "bg-slate-400",
                text: "text-slate-600",
                background: "bg-slate-50",
                border: "border-slate-200",
                soft: "bg-slate-100",
                ring: "ring-slate-200",
            };
    }
}

function StatusBadge({ status }) {
    const info = getStatusInfo(status);

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${info.background} ${info.border} ${info.text}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
            {info.label}
        </span>
    );
}

/*
  Mobil uchun statistika tugmasi.
  Bosilganda o‘sha holat bo‘yicha filtr qo‘yiladi — takroran bosilsa olib tashlanadi.
*/
function StatPill({ label, value, status, active, onClick }) {
    const info = getStatusInfo(status);

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-w-[92px] shrink-0 flex-col gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.97] ${active
                ? `${info.background} ${info.border} ring-2 ${info.ring}`
                : "border-slate-200 bg-white"
                }`}
        >
            <span className="flex items-center justify-between">
                <span className={`h-2 w-2 rounded-full ${info.dot}`} />

                {active && (
                    <i className="fa-solid fa-check text-[10px] text-slate-400" />
                )}
            </span>

            <span className="text-2xl font-extrabold leading-none text-slate-900">
                {value}
            </span>

            <span className="text-[11px] font-semibold text-slate-500">
                {label}
            </span>
        </button>
    );
}

function StatCard({ title, value, icon, color, description }) {
    const styles = {
        orange: {
            card: "border-orange-100 bg-orange-50/70",
            icon: "bg-orange-100 text-orange-600",
            value: "text-orange-600",
        },
        green: {
            card: "border-emerald-100 bg-emerald-50/70",
            icon: "bg-emerald-100 text-emerald-600",
            value: "text-emerald-600",
        },
        red: {
            card: "border-red-100 bg-red-50/70",
            icon: "bg-red-100 text-red-600",
            value: "text-red-600",
        },
        yellow: {
            card: "border-amber-100 bg-amber-50/70",
            icon: "bg-amber-100 text-amber-600",
            value: "text-amber-600",
        },
        cyan: {
            card: "border-cyan-100 bg-cyan-50/70",
            icon: "bg-cyan-100 text-cyan-600",
            value: "text-cyan-600",
        },
    };

    const style = styles[color] || styles.orange;

    return (
        <div
            className={`min-w-[145px] flex-1 rounded-2xl border p-3.5 sm:p-4 ${style.card}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}
                >
                    <i className={`${icon} text-sm`} />
                </div>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-500">{title}</p>

            <h3 className={`mt-1 text-2xl font-extrabold ${style.value}`}>
                {value}
            </h3>

            <p className="mt-1 text-[10px] leading-4 text-slate-400">
                {description}
            </p>
        </div>
    );
}

function FilterButton({ icon, title, value, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left transition active:scale-[0.98] hover:border-orange-200 hover:bg-orange-50/30"
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <i className={`${icon} text-sm`} />
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {title}
                </span>

                <span className="mt-0.5 block truncate text-sm font-bold text-slate-700">
                    {value}
                </span>
            </span>

            <i className="fa-solid fa-chevron-down shrink-0 text-xs text-slate-400" />
        </button>
    );
}

// Qo‘yilgan filtrni ko‘rsatuvchi va bir bosishda olib tashlaydigan chip
function FilterChip({ label, onRemove }) {
    return (
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 py-1.5 pl-3 pr-2 text-xs font-bold text-orange-700">
            {label}

            <button
                type="button"
                onClick={onRemove}
                aria-label={`${label} filtrini olib tashlash`}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-200/70 text-[9px] text-orange-700"
            >
                <i className="fa-solid fa-xmark" />
            </button>
        </span>
    );
}

function BottomSheet({ open, title, subtitle, children, onClose, footer }) {
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-5">
            <button
                type="button"
                aria-label="Oynani yopish"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
            />

            <div className="relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[85vh] sm:max-w-md sm:rounded-[28px]">
                <div className="flex justify-center pt-3 sm:hidden">
                    <span className="h-1.5 w-12 rounded-full bg-slate-200" />
                </div>

                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <h3 className="truncate text-lg font-extrabold text-slate-900">
                            {title}
                        </h3>

                        {subtitle && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Yopish"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">{children}</div>

                {footer && (
                    <div className="border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyState({ onReset, hasFilters }) {
    return (
        <div className="px-5 py-12 text-center sm:py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                <i className="fa-solid fa-calendar-xmark text-2xl" />
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-800">
                O‘quvchi topilmadi
            </h3>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
                {hasFilters
                    ? "Tanlangan sana, sinf yoki holat bo‘yicha mos o‘quvchi yo‘q. Filtrlarni kengaytirib ko‘ring."
                    : "Bu sana uchun hali ma’lumot kiritilmagan."}
            </p>

            {hasFilters && (
                <button
                    type="button"
                    onClick={onReset}
                    className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                    Filtrlarni tozalash
                </button>
            )}
        </div>
    );
}

function LoadingCard() {
    return (
        <div className="flex animate-pulse items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
            <div className="h-11 w-11 rounded-2xl bg-slate-200" />

            <div className="flex-1">
                <div className="h-3 w-36 rounded bg-slate-200" />
                <div className="mt-2 h-2.5 w-24 rounded bg-slate-100" />
            </div>

            <div className="h-7 w-20 rounded-full bg-slate-100" />
        </div>
    );
}

/*
  Mobil ro‘yxat qatori.
  Chap tomonda rangli holat chizig‘i, o‘ngda holat belgisi turadi —
  shunday qilib davomat ro‘yxatga qaraganda darrov o‘qiladi.
*/
function StudentRow({ student, index, onOpen }) {
    const colors = getAvatarColors(index);
    const info = getStatusInfo(student.status);

    return (
        <button
            type="button"
            onClick={() => onOpen(student)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50"
        >
            <span className="relative flex shrink-0">
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-extrabold ${colors.bg} ${colors.text}`}
                >
                    {getInitials(student.fullName)}
                </span>

                <span
                    className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[8px] text-white ${info.dot}`}
                >
                    <i className={info.icon} />
                </span>
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-slate-800">
                    {student.fullName}
                </span>

                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <span className="truncate">{student.className}</span>

                    {student.student_number && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span className="shrink-0">{student.student_number}</span>
                        </>
                    )}
                </span>
            </span>

            <span className={`shrink-0 text-[11px] font-bold ${info.text}`}>
                {info.label}
            </span>
        </button>
    );
}

export default function Attendance() {
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [attendance, setAttendance] = useState([]);

    const [selectedDate, setSelectedDate] = useState(getLocalDate());
    const [classFilter, setClassFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Mobil ko‘rinishdagi oynalar: "filters" | "calendar" | "preview" | null
    const [activeSheet, setActiveSheet] = useState(null);
    const [previewStudent, setPreviewStudent] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);

    // Umumiy "Filtrlar" oynasi uchun vaqtinchalik (qoralama) qiymatlar
    const [draftClassFilter, setDraftClassFilter] = useState("all");
    const [draftStatusFilter, setDraftStatusFilter] = useState("all");

    // Kalendar oynasi uchun holat
    const [calendarCursor, setCalendarCursor] = useState(() => {
        const date = new Date(`${getLocalDate()}T00:00:00`);
        return { year: date.getFullYear(), month: date.getMonth() };
    });
    const [calendarDraft, setCalendarDraft] = useState(selectedDate);

    async function loadData(date = selectedDate) {
        try {
            setError("");
            setLoading(true);

            const [
                { data: studentsData, error: studentsError },
                { data: classesData, error: classesError },
                { data: attendanceData, error: attendanceError },
            ] = await Promise.all([
                supabase
                    .from("students")
                    .select(`
            id,
            first_name,
            last_name,
            student_number,
            phone,
            class_id,
            is_active,
            classes (
              id,
              name,
              grade_level,
              section
            )
          `)
                    .eq("is_active", true)
                    .order("first_name", { ascending: true }),

                supabase
                    .from("classes")
                    .select("id, name, grade_level, section")
                    .order("grade_level", { ascending: true })
                    .order("section", { ascending: true }),

                supabase
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
                    .eq("attendance_date", date),
            ]);

            if (studentsError) throw studentsError;
            if (classesError) throw classesError;
            if (attendanceError) throw attendanceError;

            setStudents(studentsData || []);
            setClasses(classesData || []);
            setAttendance(attendanceData || []);
        } catch (err) {
            console.error("Davomat yuklashda xatolik:", err);

            setError(
                err.message ||
                "Davomat ma’lumotlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate]);

    const attendanceByStudent = useMemo(() => {
        const result = {};

        for (const row of attendance) {
            if (!row.student_id) continue;

            /*
              Agar bir o‘quvchiga bir kunda bir nechta davomat yozuvi bo‘lsa,
              oxirgi yozuv olinadi.
            */
            result[row.student_id] = row;
        }

        return result;
    }, [attendance]);

    const rows = useMemo(() => {
        return students.map((student) => {
            const attendanceRow = attendanceByStudent[student.id];

            return {
                ...student,
                fullName: getStudentName(student),
                className: getClassName(student),
                status: attendanceRow?.status || "not_marked",
                reason: attendanceRow?.reason || "",
                attendanceId: attendanceRow?.id || null,
                markedAt: attendanceRow?.created_at || null,
            };
        });
    }, [students, attendanceByStudent]);

    const statistics = useMemo(() => {
        return {
            total: rows.length,

            present: rows.filter((item) => item.status === "present").length,

            absent: rows.filter(
                (item) =>
                    item.status === "absent" || item.status === "unexcused"
            ).length,

            late: rows.filter((item) => item.status === "late").length,

            excused: rows.filter((item) => item.status === "excused").length,

            notMarked: rows.filter((item) => item.status === "not_marked").length,
        };
    }, [rows]);

    // Darsda qatnashganlar ulushi (kechikkanlar ham qatnashgan hisoblanadi)
    const attendanceRate = useMemo(() => {
        const marked = statistics.total - statistics.notMarked;

        if (marked <= 0) return 0;

        return Math.round(
            ((statistics.present + statistics.late) / marked) * 100
        );
    }, [statistics]);

    const selectedClassName = useMemo(() => {
        if (classFilter === "all") return "Barcha sinflar";

        const selectedClass = classes.find(
            (item) => String(item.id) === String(classFilter)
        );

        if (!selectedClass) return "Sinf tanlanmagan";

        return (
            selectedClass.name ||
            `${selectedClass.grade_level}-${selectedClass.section || ""}`
        );
    }, [classes, classFilter]);

    const selectedStatusName = useMemo(() => {
        return (
            STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label ||
            "Barcha holatlar"
        );
    }, [statusFilter]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (classFilter !== "all") count += 1;
        if (statusFilter !== "all") count += 1;
        return count;
    }, [classFilter, statusFilter]);

    const filteredRows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return rows
            .filter((student) => {
                const fullName = student.fullName.toLowerCase();

                const studentNumber = String(
                    student.student_number || ""
                ).toLowerCase();

                const matchesSearch =
                    !normalizedSearch ||
                    fullName.includes(normalizedSearch) ||
                    studentNumber.includes(normalizedSearch);

                const matchesClass =
                    classFilter === "all" ||
                    String(student.class_id) === String(classFilter);

                const matchesStatus =
                    statusFilter === "all" ||
                    (statusFilter === "absent"
                        ? student.status === "absent" ||
                        student.status === "unexcused"
                        : student.status === statusFilter);

                return matchesSearch && matchesClass && matchesStatus;
            })
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "uz"));
    }, [rows, search, classFilter, statusFilter]);

    // Faqat qidiruv matniga mos ro‘yxat (sinf/holat filtrisiz) — qidiruv oynasi uchun
    const searchResults = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return [];

        return rows
            .filter((student) => {
                const fullName = student.fullName.toLowerCase();
                const studentNumber = String(
                    student.student_number || ""
                ).toLowerCase();

                return (
                    fullName.includes(normalizedSearch) ||
                    studentNumber.includes(normalizedSearch)
                );
            })
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "uz"));
    }, [rows, search]);

    function clearFilters() {
        setSearch("");
        setClassFilter("all");
        setStatusFilter("all");
    }

    function handleRefresh() {
        setRefreshing(true);
        loadData(selectedDate);
    }

    function openStudentProfile(studentId) {
        setPreviewStudent(null);
        setActiveSheet(null);
        navigate(`/admin/students/${studentId}`);
    }

    function openPreview(student) {
        setPreviewStudent(student);
        setActiveSheet("preview");
    }

    // Statistika tugmasi orqali holat filtrini almashtirish
    function toggleStatusFilter(value) {
        setStatusFilter((prev) => (prev === value ? "all" : value));
    }

    // "Filtrlar" oynasini ochish — joriy filtrlarni qoralamaga nusxalaydi
    function openFilterSheet() {
        setDraftClassFilter(classFilter);
        setDraftStatusFilter(statusFilter);
        setActiveSheet("filters");
    }

    function applyFilterSheet() {
        setClassFilter(draftClassFilter);
        setStatusFilter(draftStatusFilter);
        setActiveSheet(null);
    }

    function resetFilterSheet() {
        setDraftClassFilter("all");
        setDraftStatusFilter("all");
    }

    // Kalendar oynasini ochish — joriy sanaga o‘rnatadi
    function openCalendarSheet() {
        const date = new Date(`${selectedDate}T00:00:00`);
        setCalendarCursor({ year: date.getFullYear(), month: date.getMonth() });
        setCalendarDraft(selectedDate);
        setActiveSheet("calendar");
    }

    function changeCalendarMonth(delta) {
        setCalendarCursor((prev) => {
            let month = prev.month + delta;
            let year = prev.year;

            if (month < 0) {
                month = 11;
                year -= 1;
            } else if (month > 11) {
                month = 0;
                year += 1;
            }

            return { year, month };
        });
    }

    function confirmCalendarSelection() {
        setSelectedDate(calendarDraft);
        setActiveSheet(null);
    }

    const isToday = selectedDate === getLocalDate();

    return (
        <div className="min-h-full bg-[#f7f9fc]">
            {/* ============================= MOBIL KO‘RINISH ============================= */}
            <div className="pb-10 lg:hidden">
                {/* Tepa panel: sarlavha + sana navigatsiyasi */}
                <header className="sticky top-0 z-30 bg-white">
                    <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
                        <button
                            type="button"
                            aria-label="Menyu"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
                        >
                            <i className="fa-solid fa-bars" />
                        </button>

                        <div className="min-w-0 text-center">
                            <h1 className="text-[17px] font-extrabold leading-tight text-slate-900">
                                Davomat
                            </h1>

                            <p className="text-[11px] font-semibold text-slate-400">
                                Faqat ko‘rish rejimi
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading || refreshing}
                            aria-label="Yangilash"
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-60"
                        >
                            <i
                                className={`fa-solid fa-rotate-right ${refreshing ? "animate-spin" : ""
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Sana boshqaruvi: kun orqaga / oldinga va kalendar */}
                    <div className="flex items-center gap-2 px-4 pb-3">
                        <button
                            type="button"
                            aria-label="Oldingi kun"
                            onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 active:scale-95"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" />
                        </button>

                        <button
                            type="button"
                            onClick={openCalendarSheet}
                            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 active:scale-[0.98]"
                        >
                            <i className="fa-solid fa-calendar-days text-xs text-orange-500" />

                            <span className="truncate text-sm font-extrabold text-slate-800">
                                {formatCompactDate(selectedDate)}
                            </span>

                            <span className="truncate text-[11px] font-semibold text-slate-400">
                                {isToday ? "Bugun" : getDayName(selectedDate)}
                            </span>
                        </button>

                        <button
                            type="button"
                            aria-label="Keyingi kun"
                            onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 active:scale-95"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" />
                        </button>
                    </div>

                    {/* Qidiruv va filtr */}
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 pb-3">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-slate-100 px-3.5 text-left"
                        >
                            <i className="fa-solid fa-magnifying-glass text-sm text-slate-400" />

                            <span
                                className={`truncate text-sm font-semibold ${search ? "text-slate-700" : "text-slate-400"
                                    }`}
                            >
                                {search || "Ism yoki raqam bo‘yicha qidiring"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={openFilterSheet}
                            aria-label="Filtrlar"
                            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${activeFilterCount > 0
                                ? "bg-orange-500 text-white"
                                : "bg-slate-100 text-slate-600"
                                }`}
                        >
                            <i className="fa-solid fa-sliders text-sm" />

                            {activeFilterCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Xulosa kartasi: qatnashish ulushi */}
                <section className="px-4 pt-4">
                    <div className="rounded-3xl bg-slate-900 p-4 text-white">
                        <div className="flex items-end justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400">
                                    Darsda qatnashish
                                </p>

                                <p className="mt-1 text-4xl font-extrabold leading-none">
                                    {attendanceRate}
                                    <span className="text-lg font-bold text-slate-400">%</span>
                                </p>
                            </div>

                            <div className="shrink-0 text-right text-[11px] font-semibold text-slate-400">
                                <p>
                                    <span className="text-white">{statistics.total}</span> ta
                                    o‘quvchi
                                </p>

                                <p className="mt-1">
                                    <span className="text-white">{statistics.notMarked}</span> ta
                                    kiritilmagan
                                </p>
                            </div>
                        </div>

                        <div className="mt-3.5 flex h-2 overflow-hidden rounded-full bg-slate-700">
                            <span
                                className="bg-emerald-400 transition-all"
                                style={{
                                    width: `${statistics.total
                                        ? (statistics.present / statistics.total) * 100
                                        : 0
                                        }%`,
                                }}
                            />
                            <span
                                className="bg-amber-400 transition-all"
                                style={{
                                    width: `${statistics.total
                                        ? (statistics.late / statistics.total) * 100
                                        : 0
                                        }%`,
                                }}
                            />
                            <span
                                className="bg-cyan-400 transition-all"
                                style={{
                                    width: `${statistics.total
                                        ? (statistics.excused / statistics.total) * 100
                                        : 0
                                        }%`,
                                }}
                            />
                            <span
                                className="bg-red-400 transition-all"
                                style={{
                                    width: `${statistics.total
                                        ? (statistics.absent / statistics.total) * 100
                                        : 0
                                        }%`,
                                }}
                            />
                        </div>

                        <p className="mt-2.5 text-[11px] text-slate-400">
                            {formatUzbekDate(selectedDate)} · {selectedClassName}
                        </p>
                    </div>
                </section>

                {/* Holat bo‘yicha tez filtr */}
                <section className="mt-4">
                    <div className="flex gap-2 overflow-x-auto px-4 pb-1">
                        <StatPill
                            label="Keldi"
                            value={statistics.present}
                            status="present"
                            active={statusFilter === "present"}
                            onClick={() => toggleStatusFilter("present")}
                        />

                        <StatPill
                            label="Kelmagan"
                            value={statistics.absent}
                            status="absent"
                            active={statusFilter === "absent"}
                            onClick={() => toggleStatusFilter("absent")}
                        />

                        <StatPill
                            label="Kechikdi"
                            value={statistics.late}
                            status="late"
                            active={statusFilter === "late"}
                            onClick={() => toggleStatusFilter("late")}
                        />

                        <StatPill
                            label="Sababli"
                            value={statistics.excused}
                            status="excused"
                            active={statusFilter === "excused"}
                            onClick={() => toggleStatusFilter("excused")}
                        />

                        <StatPill
                            label="Kiritilmagan"
                            value={statistics.notMarked}
                            status="not_marked"
                            active={statusFilter === "not_marked"}
                            onClick={() => toggleStatusFilter("not_marked")}
                        />
                    </div>
                </section>

                {/* Qo‘yilgan filtrlar */}
                {(activeFilterCount > 0 || search) && (
                    <div className="mt-3 flex items-center gap-2 overflow-x-auto px-4">
                        {search && (
                            <FilterChip
                                label={`“${search}”`}
                                onRemove={() => setSearch("")}
                            />
                        )}

                        {classFilter !== "all" && (
                            <FilterChip
                                label={selectedClassName}
                                onRemove={() => setClassFilter("all")}
                            />
                        )}

                        {statusFilter !== "all" && (
                            <FilterChip
                                label={selectedStatusName}
                                onRemove={() => setStatusFilter("all")}
                            />
                        )}

                        <button
                            type="button"
                            onClick={clearFilters}
                            className="shrink-0 px-1 text-xs font-bold text-slate-400"
                        >
                            Tozalash
                        </button>
                    </div>
                )}

                {/* Xatolik */}
                {error && (
                    <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <div className="flex items-start gap-3">
                            <i className="fa-solid fa-circle-exclamation mt-0.5" />

                            <div className="min-w-0 flex-1">
                                <p className="font-extrabold">Ma’lumot yuklanmadi</p>
                                <p className="mt-1 break-words text-xs leading-5">{error}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadData(selectedDate)}
                            className="mt-3 w-full rounded-xl bg-white py-2.5 text-xs font-bold text-red-700 shadow-sm"
                        >
                            Qayta urinish
                        </button>
                    </div>
                )}

                {/* O‘quvchilar ro‘yxati */}
                <section className="mt-4 overflow-hidden rounded-t-3xl bg-white">
                    <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
                        <h2 className="text-sm font-extrabold text-slate-800">
                            O‘quvchilar
                        </h2>

                        <span className="text-xs font-bold text-slate-400">
                            {filteredRows.length} ta
                        </span>
                    </div>

                    {loading ? (
                        <div className="mt-2">
                            <LoadingCard />
                            <LoadingCard />
                            <LoadingCard />
                            <LoadingCard />
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <EmptyState
                            onReset={clearFilters}
                            hasFilters={activeFilterCount > 0 || !!search}
                        />
                    ) : (
                        <div className="mt-2 divide-y divide-slate-100">
                            {filteredRows.map((student, index) => (
                                <StudentRow
                                    key={student.id}
                                    student={student}
                                    index={index}
                                    onOpen={openPreview}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ============================= DESKTOP KO‘RINISH ============================= */}
            <div className="hidden px-3 py-4 sm:px-5 sm:py-6 lg:block lg:px-7">
                <div className="mx-auto w-full max-w-[1440px]">
                    {/* Header */}
                    <header className="mb-5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                                <i className="fa-solid fa-house" />
                                <span>/</span>
                                <span>Davomat</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                    Davomat
                                </h1>

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Faqat ko‘rish
                                </span>
                            </div>

                            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm">
                                O‘qituvchilar kiritgan tayyor davomatni ko‘ring, filterlang va
                                o‘quvchi profiliga o‘ting.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading || refreshing}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-60 sm:h-12 sm:w-auto sm:gap-2 sm:px-4"
                        >
                            <i
                                className={`fa-solid fa-rotate-right ${refreshing ? "animate-spin" : ""
                                    }`}
                            />

                            <span className="hidden text-sm font-bold sm:inline">
                                Yangilash
                            </span>
                        </button>
                    </header>

                    {/* Sana */}
                    <section className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                    <i className="fa-solid fa-calendar-days text-lg" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        Tanlangan sana
                                    </p>

                                    <p className="mt-1 truncate text-sm font-extrabold text-slate-800 sm:text-base">
                                        {formatUzbekDate(selectedDate)}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {getDayName(selectedDate)}
                                    </p>
                                </div>
                            </div>

                            <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-orange-200 hover:text-orange-500">
                                <i className="fa-solid fa-calendar-plus" />

                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(event) => setSelectedDate(event.target.value)}
                                    className="sr-only"
                                />
                            </label>
                        </div>
                    </section>

                    {/* Filterlar */}
                    <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-800">
                                    Filterlar
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-400">
                                    Kerakli ma’lumotni tez toping
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-xs font-bold text-slate-400 transition hover:text-orange-500"
                            >
                                <i className="fa-solid fa-rotate-left mr-1" />
                                Tozalash
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            <FilterButton
                                icon="fa-solid fa-calendar-days"
                                title="Sana"
                                value={formatShortDate(selectedDate)}
                                onClick={openCalendarSheet}
                            />

                            <FilterButton
                                icon="fa-solid fa-school"
                                title="Sinf"
                                value={selectedClassName}
                                onClick={openFilterSheet}
                            />

                            <FilterButton
                                icon="fa-solid fa-filter"
                                title="Davomat holati"
                                value={selectedStatusName}
                                onClick={openFilterSheet}
                            />

                            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                    <i className="fa-solid fa-magnifying-glass text-sm" />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        Qidiruv
                                    </span>

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="O‘quvchini qidiring..."
                                        className="mt-0.5 w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                                    />
                                </span>
                            </label>
                        </div>
                    </section>

                    {/* Statistikalar */}
                    <section className="mb-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-base font-extrabold text-slate-800">
                                Umumiy holat
                            </h2>

                            <span className="text-xs font-semibold text-slate-400">
                                {selectedClassName}
                            </span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-5">
                            <StatCard
                                title="Jami o‘quvchilar"
                                value={statistics.total}
                                icon="fa-solid fa-users"
                                color="orange"
                                description="Tanlangan sinfdagi jami"
                            />

                            <StatCard
                                title="Keldi"
                                value={statistics.present}
                                icon="fa-solid fa-user-check"
                                color="green"
                                description="Darsda qatnashganlar"
                            />

                            <StatCard
                                title="Kelmagan"
                                value={statistics.absent}
                                icon="fa-solid fa-user-xmark"
                                color="red"
                                description="Darsga kelmaganlar"
                            />

                            <StatCard
                                title="Kechikdi"
                                value={statistics.late}
                                icon="fa-solid fa-clock"
                                color="yellow"
                                description="Kechikib kelganlar"
                            />

                            <StatCard
                                title="Sababli"
                                value={statistics.excused}
                                icon="fa-solid fa-file-circle-check"
                                color="cyan"
                                description="Uzrli sabab bilan"
                            />
                        </div>
                    </section>

                    {/* Xatolik */}
                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <i className="fa-solid fa-circle-exclamation mt-0.5" />

                            <div className="min-w-0 flex-1">
                                <p className="font-extrabold">Xatolik yuz berdi</p>
                                <p className="mt-1 break-words text-xs leading-5">{error}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => loadData(selectedDate)}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm"
                            >
                                Qayta urinish
                            </button>
                        </div>
                    )}

                    {/* O‘quvchilar ro‘yxati */}
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-extrabold text-slate-800">
                                        O‘quvchilar
                                    </h2>

                                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-600">
                                        {filteredRows.length} ta
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-400">
                                    {formatUzbekDate(selectedDate)} uchun tayyor davomat
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                <i className="fa-solid fa-database text-orange-500" />
                                Supabase
                            </div>
                        </div>

                        {loading ? (
                            <div>
                                <LoadingCard />
                                <LoadingCard />
                                <LoadingCard />
                                <LoadingCard />
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <EmptyState
                                onReset={clearFilters}
                                hasFilters={activeFilterCount > 0 || !!search}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-left">
                                            <th className="px-5 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                                №
                                            </th>

                                            <th className="px-3 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                                O‘quvchi
                                            </th>

                                            <th className="px-3 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                                Sinf
                                            </th>

                                            <th className="px-3 py-4 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                                                Holati
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredRows.map((student, index) => (
                                            <tr
                                                key={student.id}
                                                onClick={() => openStudentProfile(student.id)}
                                                className="cursor-pointer border-t border-slate-100 transition hover:bg-orange-50/30"
                                            >
                                                <td className="px-5 py-4 text-xs font-bold text-slate-400">
                                                    {String(index + 1).padStart(2, "0")}
                                                </td>

                                                <td className="px-3 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${getAvatarColors(index).bg
                                                                } ${getAvatarColors(index).text}`}
                                                        >
                                                            {getInitials(student.fullName)}
                                                        </div>

                                                        <p className="max-w-[220px] truncate text-sm font-extrabold text-slate-800">
                                                            {student.fullName}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-4">
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-extrabold text-slate-600">
                                                        {student.className}
                                                    </span>
                                                </td>

                                                <td className="px-3 py-4">
                                                    <StatusBadge status={student.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Keldi
                                </span>

                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-red-500" />
                                    Kelmagan
                                </span>

                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Kechikdi
                                </span>

                                <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                    Sababli
                                </span>
                            </div>

                            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                <i className="fa-solid fa-database text-orange-500" />
                                Ma’lumotlar Supabase’dan olinadi
                            </span>
                        </div>
                    </section>
                </div>
            </div>

            {/* ============================= UMUMIY OYNALAR ============================= */}

            {/* Filtrlar oynasi (Sinf + Davomat holati birga) */}
            <BottomSheet
                open={activeSheet === "filters"}
                title="Filtrlar"
                subtitle={formatUzbekDate(selectedDate)}
                onClose={() => setActiveSheet(null)}
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilterSheet}
                            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-extrabold text-slate-500 transition hover:bg-slate-50"
                        >
                            Tozalash
                        </button>

                        <button
                            type="button"
                            onClick={applyFilterSheet}
                            className="flex-1 rounded-2xl bg-orange-500 py-3 text-sm font-extrabold text-white transition hover:bg-orange-600"
                        >
                            Qo‘llash
                        </button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Sinf */}
                    <div>
                        <p className="mb-2.5 text-sm font-extrabold text-slate-800">
                            Sinf
                        </p>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setDraftClassFilter("all")}
                                className={`rounded-full border px-3.5 py-2 text-sm font-bold transition ${draftClassFilter === "all"
                                    ? "border-orange-300 bg-orange-50 text-orange-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                    }`}
                            >
                                Barcha sinflar
                            </button>

                            {classes.map((item, index) => {
                                const name =
                                    item.name || `${item.grade_level}-${item.section || ""}`;

                                const isSelected =
                                    String(draftClassFilter) === String(item.id);

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setDraftClassFilter(item.id)}
                                        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${isSelected
                                            ? "border-orange-300 bg-orange-50 text-orange-700"
                                            : "border-slate-200 bg-white text-slate-600"
                                            }`}
                                    >
                                        <span
                                            className={`h-2 w-2 shrink-0 rounded-full ${CLASS_DOT_PALETTE[index % CLASS_DOT_PALETTE.length]
                                                }`}
                                        />
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Davomat holati */}
                    <div>
                        <p className="mb-2.5 text-sm font-extrabold text-slate-800">
                            Davomat holati
                        </p>

                        <div className="space-y-2">
                            {STATUS_OPTIONS.map((item) => {
                                const isSelected = draftStatusFilter === item.value;
                                const info = getStatusInfo(item.value);

                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setDraftStatusFilter(item.value)}
                                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${isSelected
                                            ? "border-orange-300 bg-orange-50"
                                            : "border-slate-200 bg-white hover:bg-slate-50"
                                            }`}
                                    >
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${info.soft} ${info.text}`}
                                        >
                                            <i className={`${item.icon} text-xs`} />
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-slate-700">
                                                {item.label}
                                            </span>

                                            <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                                                {item.description}
                                            </span>
                                        </span>

                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-orange-400">
                                            {isSelected && (
                                                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </BottomSheet>

            {/* Sana tanlash — to‘liq kalendar */}
            <BottomSheet
                open={activeSheet === "calendar"}
                title="Sana tanlash"
                onClose={() => setActiveSheet(null)}
                footer={
                    <button
                        type="button"
                        onClick={confirmCalendarSelection}
                        className="w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-extrabold text-white transition hover:bg-orange-600"
                    >
                        {formatUzbekDate(calendarDraft)} ni ko‘rish
                    </button>
                }
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            aria-label="Oldingi oy"
                            onClick={() => changeCalendarMonth(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                        >
                            <i className="fa-solid fa-chevron-left text-xs" />
                        </button>

                        <p className="text-sm font-extrabold text-slate-800">
                            {MONTHS_SHORT[calendarCursor.month]} {calendarCursor.year}
                        </p>

                        <button
                            type="button"
                            aria-label="Keyingi oy"
                            onClick={() => changeCalendarMonth(1)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                        >
                            <i className="fa-solid fa-chevron-right text-xs" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                        {WEEK_DAYS_SHORT.map((day) => (
                            <span
                                key={day}
                                className="py-1 text-[11px] font-bold text-slate-400"
                            >
                                {day}
                            </span>
                        ))}

                        {(() => {
                            const firstWeekday = new Date(
                                calendarCursor.year,
                                calendarCursor.month,
                                1
                            ).getDay();

                            const daysInMonth = new Date(
                                calendarCursor.year,
                                calendarCursor.month + 1,
                                0
                            ).getDate();

                            const cells = [];

                            for (let i = 0; i < firstWeekday; i += 1) {
                                cells.push(<span key={`pad-${i}`} />);
                            }

                            for (let day = 1; day <= daysInMonth; day += 1) {
                                const value = toDateValue(
                                    calendarCursor.year,
                                    calendarCursor.month,
                                    day
                                );

                                const isSelected = value === calendarDraft;
                                const isCurrentDay = value === getLocalDate();

                                cells.push(
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setCalendarDraft(value)}
                                        className={`flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition ${isSelected
                                            ? "bg-orange-500 text-white"
                                            : isCurrentDay
                                                ? "border border-orange-300 text-orange-600"
                                                : "text-slate-600 hover:bg-orange-50"
                                            }`}
                                    >
                                        {day}
                                    </button>
                                );
                            }

                            return cells;
                        })()}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const today = getLocalDate();
                            const date = new Date(`${today}T00:00:00`);
                            setCalendarCursor({
                                year: date.getFullYear(),
                                month: date.getMonth(),
                            });
                            setCalendarDraft(today);
                        }}
                        className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-extrabold text-slate-500 hover:bg-slate-50"
                    >
                        Bugunga qaytish
                    </button>
                </div>
            </BottomSheet>

            {/* O‘quvchi tez ko‘rish oynasi */}
            <BottomSheet
                open={activeSheet === "preview" && !!previewStudent}
                title="O‘quvchi"
                subtitle={formatUzbekDate(selectedDate)}
                onClose={() => setActiveSheet(null)}
                footer={
                    previewStudent && (
                        <button
                            type="button"
                            onClick={() => openStudentProfile(previewStudent.id)}
                            className="w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-extrabold text-white transition hover:bg-orange-600"
                        >
                            To‘liq profilni ochish
                        </button>
                    )
                }
            >
                {previewStudent && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-4">
                            <div
                                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${getAvatarColors(
                                    filteredRows.findIndex(
                                        (item) => item.id === previewStudent.id
                                    )
                                ).bg
                                    } ${getAvatarColors(
                                        filteredRows.findIndex(
                                            (item) => item.id === previewStudent.id
                                        )
                                    ).text
                                    }`}
                            >
                                {getInitials(previewStudent.fullName)}
                            </div>

                            <div className="min-w-0">
                                <h4 className="truncate text-lg font-extrabold text-slate-900">
                                    {previewStudent.fullName}
                                </h4>

                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">
                                    {previewStudent.className}
                                    {previewStudent.student_number
                                        ? ` · ${previewStudent.student_number}`
                                        : ""}
                                </p>

                                <div className="mt-2">
                                    <StatusBadge status={previewStudent.status} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
                                    <i className="fa-solid fa-phone text-sm" />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        Telefon raqami
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
                                        {previewStudent.phone || "Kiritilmagan"}
                                    </p>
                                </div>

                                {previewStudent.phone && (
                                    <a
                                        href={`tel:${previewStudent.phone}`}
                                        className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-bold text-orange-600 shadow-sm"
                                    >
                                        Qo‘ng‘iroq
                                    </a>
                                )}
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
                                    <i className="fa-solid fa-note-sticky text-sm" />
                                </span>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        Bugungi izoh
                                    </p>
                                    <p className="mt-0.5 text-sm font-bold text-slate-700">
                                        {previewStudent.reason || "Izoh yozilmagan"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </BottomSheet>

            {/* To‘liq ekranli qidiruv */}
            {searchOpen && (
                <div className="fixed inset-0 z-[110] flex flex-col bg-white lg:hidden">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setSearchOpen(false)}
                            aria-label="Orqaga"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
                        >
                            <i className="fa-solid fa-arrow-left" />
                        </button>

                        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl bg-slate-100 px-3.5">
                            <i className="fa-solid fa-magnifying-glass text-sm text-slate-400" />

                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Ism yoki raqam bo‘yicha qidiring"
                                className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Qidiruvni tozalash"
                                    className="text-slate-400"
                                >
                                    <i className="fa-solid fa-circle-xmark" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!search.trim() ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">
                                O‘quvchi ismini yoki raqamini yozing
                            </p>
                        ) : searchResults.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-slate-400">
                                “{search}” bo‘yicha hech kim topilmadi
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {searchResults.map((student, index) => (
                                    <StudentRow
                                        key={student.id}
                                        student={student}
                                        index={index}
                                        onOpen={(item) => {
                                            setSearchOpen(false);
                                            openPreview(item);
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}