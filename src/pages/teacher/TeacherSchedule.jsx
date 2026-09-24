import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    Clock3,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Lock,
    CircleCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const DAYS = [
    { value: 1, label: "Dushanba", short: "Du" },
    { value: 2, label: "Seshanba", short: "Se" },
    { value: 3, label: "Chorshanba", short: "Cho" },
    { value: 4, label: "Payshanba", short: "Pa" },
    { value: 5, label: "Juma", short: "Ju" },
    { value: 6, label: "Shanba", short: "Sha" },
];

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

const WEEKDAYS = [
    "Yakshanba",
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
];

/*
|--------------------------------------------------------------------------
| REAL MODE
|--------------------------------------------------------------------------
| false -> haqiqiy vaqt va kun bo'yicha ishlaydi
|
| Dars:
| - faqat bugungi kunda
| - dars boshlangandan keyin
| ochiladi.
*/
const TEST_MODE = false;

function getTodayWeekday() {
    const day = new Date().getDay();

    return day === 0 ? 7 : day;
}

function formatTime(time) {
    if (!time) return "";

    return time.slice(0, 5);
}

function formatDate(date) {
    return `${date.getDate()}-${
        MONTHS[date.getMonth()]
    }, ${WEEKDAYS[date.getDay()]}`;
}

/*
|--------------------------------------------------------------------------
| "08:00:00" -> 480
| "13:30:00" -> 810
|--------------------------------------------------------------------------
*/
function timeToMinutes(time) {
    if (!time) return 0;

    const [hours, minutes] = time
        .slice(0, 5)
        .split(":")
        .map(Number);

    return hours * 60 + minutes;
}

export default function TeacherSchedule() {
    const navigate = useNavigate();

    const [lessons, setLessons] = useState([]);

    /*
    | O'qituvchi kirganda avtomatik bugungi kun tanlanadi.
    |
    | Yakshanba maktab jadvalida yo'q.
    | Shuning uchun yakshanba kuni Dushanba
    | ko'rsatiladi.
    */
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = getTodayWeekday();

        return today <= 6 ? today : 1;
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /*
    | Hozirgi vaqt.
    | Har 10 sekundda yangilanadi.
    */
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 10000);

        return () => clearInterval(timer);
    }, []);

    /*
    | Kun o'zgarganda avtomatik yangi kunni tanlaydi.
    */
    useEffect(() => {
        const todayWeekday = getTodayWeekday();

        if (todayWeekday <= 6) {
            setSelectedDay(todayWeekday);
        }
    }, [now]);

    /*
    | Jadvalni Supabase'dan olish.
    */
    useEffect(() => {
        loadSchedule();
    }, []);

    async function loadSchedule() {
        try {
            setLoading(true);
            setError("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) {
                throw userError;
            }

            if (!user) {
                throw new Error("Foydalanuvchi topilmadi.");
            }

            const {
                data,
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
                .eq("teacher_id", user.id)
                .order("weekday", {
                    ascending: true,
                })
                .order("shift", {
                    ascending: true,
                })
                .order("lesson_number", {
                    ascending: true,
                });

            if (lessonsError) {
                throw lessonsError;
            }

            setLessons(data || []);
        } catch (err) {
            console.error(
                "Teacher schedule error:",
                err
            );

            setError(
                err?.message ||
                    "Dars jadvalini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Tanlangan kunning darslari
    |--------------------------------------------------------------------------
    */
    const selectedLessons = useMemo(() => {
        return lessons
            .filter(
                (lesson) =>
                    lesson.weekday === selectedDay
            )
            .sort((a, b) => {
                if (a.shift !== b.shift) {
                    return a.shift - b.shift;
                }

                return (
                    a.lesson_number -
                    b.lesson_number
                );
            });
    }, [lessons, selectedDay]);

    /*
    |--------------------------------------------------------------------------
    | Bugungi kun
    |--------------------------------------------------------------------------
    */
    const todayWeekday = getTodayWeekday();

    /*
    |--------------------------------------------------------------------------
    | Tanlangan kun bugungi kunmi?
    |--------------------------------------------------------------------------
    */
    const isToday = selectedDay === todayWeekday;

    /*
    |--------------------------------------------------------------------------
    | Hozirgi vaqt minutlarda
    |--------------------------------------------------------------------------
    */
    const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

    /*
    |--------------------------------------------------------------------------
    | Dars boshlanganmi?
    |--------------------------------------------------------------------------
    */
    function isLessonStarted(lesson) {
        const lessonStart = timeToMinutes(
            lesson.start_time
        );

        return currentMinutes >= lessonStart;
    }

    /*
    |--------------------------------------------------------------------------
    | Dars tugaganmi?
    |--------------------------------------------------------------------------
    */
    function isLessonFinished(lesson) {
        const lessonEnd = timeToMinutes(
            lesson.end_time
        );

        return currentMinutes >= lessonEnd;
    }

    /*
    |--------------------------------------------------------------------------
    | Darsga kirish mumkinmi?
    |--------------------------------------------------------------------------
    */
    function canEditLesson(lesson) {
        /*
        | TEST MODE:
        | faqat test uchun barcha darslar ochiq.
        */
        if (TEST_MODE) {
            return true;
        }

        /*
        | REAL MODE:
        |
        | Faqat:
        | - bugungi dars
        | - dars boshlangan
        | - dars hali tugamagan
        */
        return (
            isToday &&
            isLessonStarted(lesson) &&
            !isLessonFinished(lesson)
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Dars qulflanganmi?
    |--------------------------------------------------------------------------
    */
    function isLocked(lesson) {
        if (TEST_MODE) {
            return false;
        }

        /*
        | Bugungi dars hali boshlanmagan.
        */
        if (
            isToday &&
            !isLessonStarted(lesson)
        ) {
            return true;
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Dars tugaganmi (badge uchun)
    |--------------------------------------------------------------------------
    */
    function isDone(lesson) {
        if (TEST_MODE) {
            return false;
        }

        return isToday && isLessonFinished(lesson);
    }

    /*
    |--------------------------------------------------------------------------
    | O'tgan yoki kelajakdagi kun
    |--------------------------------------------------------------------------
    */
    function isReadOnlyDay() {
        return !isToday;
    }

    /*
    |--------------------------------------------------------------------------
    | Kunlarni almashtirish
    |--------------------------------------------------------------------------
    */
    const currentDayIndex = DAYS.findIndex(
        (day) => day.value === selectedDay
    );

    function previousDay() {
        if (currentDayIndex <= 0) {
            setSelectedDay(
                DAYS[DAYS.length - 1].value
            );

            return;
        }

        setSelectedDay(
            DAYS[currentDayIndex - 1].value
        );
    }

    function nextDay() {
        if (
            currentDayIndex ===
            DAYS.length - 1
        ) {
            setSelectedDay(DAYS[0].value);

            return;
        }

        setSelectedDay(
            DAYS[currentDayIndex + 1].value
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Smenalar
    |--------------------------------------------------------------------------
    */
    const firstShiftLessons =
        selectedLessons.filter(
            (lesson) => lesson.shift === 1
        );

    const secondShiftLessons =
        selectedLessons.filter(
            (lesson) => lesson.shift === 2
        );

    /*
    |--------------------------------------------------------------------------
    | Bitta dars card'i
    |--------------------------------------------------------------------------
    */
    function LessonRow({ lesson, isLast }) {
        const locked = isLocked(lesson);
        const editable = canEditLesson(lesson);
        const done = isDone(lesson);

        const readOnly = TEST_MODE
            ? false
            : isReadOnlyDay();

        function openLesson() {
            if (!editable) return;

            navigate(
                `/teacher/lesson/${lesson.id}`
            );
        }

        function handleKeyDown(event) {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                openLesson();
            }
        }

        return (
            <div
                role="button"
                tabIndex={editable ? 0 : -1}
                onClick={openLesson}
                onKeyDown={handleKeyDown}
                className={`
                    group
                    relative
                    flex
                    items-center
                    gap-3.5
                    px-4
                    py-3.5
                    transition-colors
                    duration-150
                    sm:gap-4
                    sm:px-5
                    ${!isLast ? "border-b border-slate-100" : ""}
                    ${
                        editable
                            ? "cursor-pointer hover:bg-[#EEF1FB] focus:outline-none focus-visible:bg-[#EEF1FB]"
                            : "cursor-default"
                    }
                `}
            >
                {/* ACTIVE INDICATOR BAR */}
                {editable && (
                    <span className="absolute left-0 top-0 h-full w-[3px] bg-[#33409E]" />
                )}

                {/* TIME */}
                <div className="flex w-14 shrink-0 flex-col items-start sm:w-[72px]">
                    <p
                        className={`
                            text-[13px]
                            font-semibold
                            tabular-nums
                            sm:text-sm
                            ${
                                locked
                                    ? "text-slate-300"
                                    : done
                                    ? "text-slate-400"
                                    : "text-slate-900"
                            }
                        `}
                    >
                        {formatTime(lesson.start_time)}
                    </p>

                    <p
                        className={`
                            text-[11px]
                            tabular-nums
                            ${
                                locked
                                    ? "text-slate-300"
                                    : "text-slate-400"
                            }
                        `}
                    >
                        {formatTime(lesson.end_time)}
                    </p>
                </div>

                {/* LESSON NUMBER DOT */}
                <div
                    className={`
                        flex
                        h-6
                        w-6
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-[11px]
                        font-bold
                        ${
                            locked
                                ? "bg-slate-100 text-slate-300"
                                : "bg-[#33409E]/10 text-[#33409E]"
                        }
                    `}
                >
                    {lesson.lesson_number}
                </div>

                {/* SUBJECT + CLASS */}
                <div className="min-w-0 flex-1">
                    <h2
                        className={`
                            truncate
                            text-[15px]
                            font-semibold
                            leading-tight
                            ${
                                locked
                                    ? "text-slate-300"
                                    : done
                                    ? "text-slate-500"
                                    : "text-slate-900"
                            }
                        `}
                    >
                        {lesson.subjects?.name}
                    </h2>

                    <div
                        className={`
                            mt-1
                            flex
                            flex-wrap
                            items-center
                            gap-x-3
                            gap-y-0.5
                            text-[12.5px]
                            ${
                                locked
                                    ? "text-slate-300"
                                    : "text-slate-400"
                            }
                        `}
                    >
                        <span>{lesson.classes?.name}</span>

                        {lesson.room && (
                            <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {lesson.room}
                            </span>
                        )}
                    </div>
                </div>

                {/* STATUS */}
                <div className="shrink-0">
                    {locked ? (
                        <Lock
                            size={16}
                            strokeWidth={2}
                            className="text-slate-300"
                        />
                    ) : done ? (
                        <CircleCheck
                            size={18}
                            strokeWidth={2}
                            className="text-slate-300"
                        />
                    ) : editable ? (
                        <span className="rounded-full bg-[#33409E] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-[#33409E]/20">
                            Ochiq
                        </span>
                    ) : readOnly ? (
                        <span className="text-[11px] font-medium text-slate-300">
                            Ko‘rish
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Shift section
    |--------------------------------------------------------------------------
    */
    function ShiftSection({
        title,
        lessons: shiftLessons,
        subtitle,
    }) {
        return (
            <section className="mb-6">
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-400">
                            {title}
                        </h2>
                        <span className="text-xs text-slate-300">
                            {subtitle}
                        </span>
                    </div>

                    <span className="text-xs font-medium text-slate-400">
                        {shiftLessons.length} ta dars
                    </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                    {shiftLessons.length > 0 ? (
                        shiftLessons.map(
                            (lesson, index) => (
                                <LessonRow
                                    key={lesson.id}
                                    lesson={lesson}
                                    isLast={
                                        index ===
                                        shiftLessons.length - 1
                                    }
                                />
                            )
                        )
                    ) : (
                        <div className="py-8 text-center text-sm text-slate-300">
                            Bu smenada dars yo‘q
                        </div>
                    )}
                </div>
            </section>
        );
    }

    return (
        <div className="min-h-full bg-[#F5F6F8] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-4xl">
                {/* HEADER */}
                <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
                            <CalendarDays size={14} />
                            <span>O‘qituvchi paneli</span>
                        </div>

                        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-slate-900 sm:text-[28px]">
                            Dars jadvali
                        </h1>
                    </div>

                    <p className="text-[13px] text-slate-400">
                        {formatDate(now)}
                    </p>
                </div>

                {/* DAYS */}
                <div className="mb-5 flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm shadow-slate-900/[0.03]">
                    <button
                        onClick={previousDay}
                        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-50 hover:text-slate-600"
                        aria-label="Oldingi kun"
                    >
                        <ChevronLeft size={17} />
                    </button>

                    <div className="grid min-w-0 flex-1 grid-cols-6 gap-1">
                        {DAYS.map((day) => {
                            const active =
                                selectedDay === day.value;
                            const isCurrentDay =
                                todayWeekday === day.value;

                            return (
                                <button
                                    key={day.value}
                                    onClick={() =>
                                        setSelectedDay(day.value)
                                    }
                                    className={`
                                        relative
                                        flex
                                        flex-col
                                        items-center
                                        gap-0.5
                                        rounded-xl
                                        py-2
                                        text-[13px]
                                        font-semibold
                                        transition
                                        sm:text-sm
                                        ${
                                            active
                                                ? "bg-[#33409E] text-white"
                                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                        }
                                    `}
                                >
                                    <span className="sm:hidden">
                                        {day.short}
                                    </span>
                                    <span className="hidden sm:inline">
                                        {day.label}
                                    </span>

                                    {isCurrentDay && !active && (
                                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#33409E]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={nextDay}
                        className="flex h-9 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-50 hover:text-slate-600"
                        aria-label="Keyingi kun"
                    >
                        <ChevronRight size={17} />
                    </button>
                </div>

                {/* READ ONLY INFO */}
                {!loading &&
                    !error &&
                    !TEST_MODE &&
                    selectedDay !== todayWeekday && (
                        <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-[13px] text-slate-400">
                            <Lock
                                size={14}
                                className="shrink-0 text-slate-300"
                            />
                            <span>
                                Bu kun faqat ko‘rish uchun. Baho va
                                davomat faqat bugungi darslarda
                                ochiladi.
                            </span>
                        </div>
                    )}

                {/* LOADING */}
                {loading && (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-[68px] animate-pulse rounded-2xl bg-white"
                            />
                        ))}
                    </div>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <div className="rounded-2xl border border-red-100 bg-white p-4">
                        <p className="text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            onClick={loadSchedule}
                            className="mt-3 rounded-xl bg-[#33409E] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#2A3480]"
                        >
                            Qayta urinish
                        </button>
                    </div>
                )}

                {/* SCHEDULE */}
                {!loading && !error && (
                    <>
                        {selectedLessons.length > 0 ? (
                            <>
                                {firstShiftLessons.length > 0 && (
                                    <ShiftSection
                                        title="1-smena"
                                        subtitle="Ertalabki darslar"
                                        lessons={firstShiftLessons}
                                    />
                                )}

                                {secondShiftLessons.length > 0 && (
                                    <ShiftSection
                                        title="2-smena"
                                        subtitle="Tushdan keyingi darslar"
                                        lessons={secondShiftLessons}
                                    />
                                )}

                                <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                                    <span>Jami darslar</span>
                                    <span className="font-semibold text-slate-500">
                                        {selectedLessons.length}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                                    <CalendarDays size={20} />
                                </div>

                                <h3 className="mt-3 text-base font-semibold text-slate-900">
                                    Bugun dars yo‘q
                                </h3>

                                <p className="mt-1 text-sm text-slate-400">
                                    Bu kun uchun sizga dars
                                    biriktirilmagan.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}