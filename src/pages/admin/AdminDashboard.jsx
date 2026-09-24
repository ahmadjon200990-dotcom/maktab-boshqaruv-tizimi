import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
  });

  const [attendance, setAttendance] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = useMemo(() => {
    const date = new Date();

    const months = [
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

    return `${date.getDate()}-${months[date.getMonth()]}, ${date.getFullYear()}`;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      try {
        const [
          studentsResult,
          teachersResult,
          classesResult,
          attendanceResult,
        ] = await Promise.all([
          supabase
            .from("students")
            .select("*", { count: "exact", head: true }),

          supabase
            .from("teachers")
            .select("*", { count: "exact", head: true }),

          supabase
            .from("classes")
            .select("*", { count: "exact", head: true }),

          supabase.from("attendance").select("*"),
        ]);

        const results = [
          studentsResult,
          teachersResult,
          classesResult,
          attendanceResult,
        ];

        const failedResult = results.find((result) => result.error);

        if (failedResult?.error) {
          throw failedResult.error;
        }

        const studentsCount = studentsResult.count ?? 0;
        const teachersCount = teachersResult.count ?? 0;
        const classesCount = classesResult.count ?? 0;
        const attendanceRows = attendanceResult.data ?? [];

        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");

        const todayDate = `${year}-${month}-${day}`;

        /*
          Attendance jadvalidagi sana ustunini avtomatik topishga harakat qiladi.
          Qo‘llab-quvvatlanadigan nomlar:
          date, attendance_date, marked_date, created_at
        */
        const getDateValue = (row) => {
          const possibleDateKeys = [
            "date",
            "attendance_date",
            "marked_date",
            "day",
            "created_at",
          ];

          const key = possibleDateKeys.find(
            (item) => row[item] !== undefined && row[item] !== null
          );

          if (!key) return null;

          return String(row[key]).slice(0, 10);
        };

        /*
          Status ustunini avtomatik topishga harakat qiladi.
          Qo‘llab-quvvatlanadigan nomlar:
          status, attendance_status, present, is_present
        */
        const getStatusValue = (row) => {
          const possibleStatusKeys = [
            "status",
            "attendance_status",
            "present",
            "is_present",
          ];

          const key = possibleStatusKeys.find(
            (item) => row[item] !== undefined && row[item] !== null
          );

          if (!key) return null;

          return row[key];
        };

        const todayRows = attendanceRows.filter((row) => {
          const rowDate = getDateValue(row);

          /*
            Agar jadvalda sana ustuni bo‘lmasa,
            barcha davomat yozuvlari hisoblanadi.
          */
          if (!rowDate) return true;

          return rowDate === todayDate;
        });

        let presentCount = 0;
        let absentCount = 0;

        todayRows.forEach((row) => {
          const status = getStatusValue(row);

          if (typeof status === "boolean") {
            if (status) {
              presentCount += 1;
            } else {
              absentCount += 1;
            }

            return;
          }

          const normalizedStatus = String(status ?? "")
            .toLowerCase()
            .trim();

          const presentStatuses = [
            "present",
            "kelgan",
            "keldi",
            "bor",
            "true",
            "1",
            "active",
          ];

          const absentStatuses = [
            "absent",
            "kelmagan",
            "kelmadi",
            "yo‘q",
            "yo'q",
            "false",
            "0",
          ];

          if (presentStatuses.includes(normalizedStatus)) {
            presentCount += 1;
          } else if (absentStatuses.includes(normalizedStatus)) {
            absentCount += 1;
          }
        });

        const totalAttendance = presentCount + absentCount;

        const percentage =
          totalAttendance > 0
            ? Math.round((presentCount / totalAttendance) * 100)
            : 0;

        if (mounted) {
          setStats({
            students: studentsCount,
            teachers: teachersCount,
            classes: classesCount,
          });

          setAttendance({
            present: presentCount,
            absent: absentCount,
            total: totalAttendance,
            percentage,
          });
        }
      } catch (err) {
        console.error("Dashboard ma’lumotlarini olishda xato:", err);

        if (mounted) {
          setError(
            "Supabase ma’lumotlarini olishda xatolik yuz berdi. Console oynasini tekshiring."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const statCards = [
    {
      title: "Jami o‘quvchilar",
      value: stats.students,
      description: "",
      icon: "fa-solid fa-users",
      color: "orange",
    },
    {
      title: "O‘qituvchilar",
      value: stats.teachers,
      description: "",
      icon: "fa-solid fa-chalkboard-user",
      color: "cyan",
    },
    {
      title: "Sinflar",
      value: stats.classes,
      description: "",
      icon: "fa-solid fa-school",
      color: "yellow",
    },
    {
      title: "Bugungi davomat",
      value: `${attendance.percentage}%`,
      description: "Bugungi kelgan o‘quvchilar foizi",
      icon: "fa-solid fa-calendar-check",
      color: "green",
    },
  ];

  const quickActions = [
    {
      title: "O‘quvchi qo‘shish",
      description: "Yangi o‘quvchi ro‘yxatdan o‘tkazish",
      icon: "fa-solid fa-user-plus",
      path: "/admin/students",
      color: "orange",
    },
    {
      title: "O‘qituvchi qo‘shish",
      description: "Yangi o‘qituvchi ma’lumotlarini kiritish",
      icon: "fa-solid fa-chalkboard-user",
      path: "/admin/teachers",
      color: "cyan",
    },
    {
      title: "Sinf yaratish",
      description: "Yangi sinf ochish",
      icon: "fa-solid fa-school",
      path: "/admin/classes",
      color: "yellow",
    },
    {
      title: "Davomatni ko‘rish",
      description: "Bugungi davomatni tekshirish",
      icon: "fa-solid fa-calendar-check",
      path: "/admin/attendance",
      color: "green",
    },
  ];

  // Rang variantlari — StatCard va tezkor amallar uchun umumiy
  const COLOR_STYLES = {
    orange: {
      card: "border-orange-100 bg-orange-50/70",
      icon: "bg-orange-100 text-orange-600",
      value: "text-orange-600",
      solid: "bg-orange-500",
    },
    cyan: {
      card: "border-cyan-100 bg-cyan-50/70",
      icon: "bg-cyan-100 text-cyan-600",
      value: "text-cyan-600",
      solid: "bg-cyan-500",
    },
    yellow: {
      card: "border-amber-100 bg-amber-50/70",
      icon: "bg-amber-100 text-amber-600",
      value: "text-amber-600",
      solid: "bg-amber-500",
    },
    green: {
      card: "border-emerald-100 bg-emerald-50/70",
      icon: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-600",
      solid: "bg-emerald-500",
    },
  };

  return (
    <div className="bg-[#f7f9fc] pb-6">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-4 sm:px-5 sm:py-6 lg:px-7 lg:space-y-6">
        {/* Sarlavha */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold text-orange-500 sm:text-sm">
              Xush kelibsiz, Admin!
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Asosiy sahifa
            </h1>

            <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
              Maktab boshqaruv tizimining umumiy holati.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <i className="fa-solid fa-calendar-days text-sm" />
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Bugun
              </p>

              <p className="truncate text-sm font-extrabold capitalize text-slate-700">
                {today}
              </p>
            </div>
          </div>
        </header>

        {/* Xatolik */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <i className="fa-solid fa-circle-exclamation mt-0.5" />
            <p className="leading-5">{error}</p>
          </div>
        )}

        {/* Statistikalar */}
        <section>
          <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-4">
            {statCards.map((stat) => {
              const style = COLOR_STYLES[stat.color] || COLOR_STYLES.orange;

              return (
                <div
                  key={stat.title}
                  className={`min-w-[150px] flex-1 rounded-3xl border p-4 sm:p-5 ${style.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${style.icon}`}
                    >
                      <i className={stat.icon} />
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {stat.title}
                  </p>

                  <h2
                    className={`mt-1 text-2xl font-extrabold sm:text-3xl ${style.value}`}
                  >
                    {loading ? "..." : stat.value}
                  </h2>

                  {stat.description && (
                    <p className="mt-1 text-[10px] leading-4 text-slate-400">
                      {stat.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Tezkor amallar */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-extrabold text-slate-800 sm:text-xl">
              Tezkor amallar
            </h2>

            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Kerakli bo‘limga tezda o‘ting.
            </p>
          </div>

          {/* Mobil: ro‘yxat ko‘rinishi */}
          <div className="space-y-2.5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-2.5 sm:hidden">
            {quickActions.map((action) => {
              const style = COLOR_STYLES[action.color] || COLOR_STYLES.orange;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition active:bg-slate-50"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${style.solid}`}
                  >
                    <i className={action.icon} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-800">
                      {action.title}
                    </span>

                    <span className="mt-0.5 block truncate text-xs text-slate-400">
                      {action.description}
                    </span>
                  </span>

                  <i className="fa-solid fa-chevron-right shrink-0 text-xs text-slate-300" />
                </button>
              );
            })}
          </div>

          {/* Desktop: kartochkalar */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const style = COLOR_STYLES[action.color] || COLOR_STYLES.orange;

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white ${style.solid}`}
                  >
                    <i className={action.icon} />
                  </div>

                  <h3 className="mt-4 font-extrabold text-slate-800">
                    {action.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {action.description}
                  </p>

                  <div className="mt-4 text-sm font-bold text-orange-500">
                    Kirish
                    <i className="fa-solid fa-arrow-right ml-2 transition group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Pastki ma’lumotlar */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Davomat */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-800 sm:text-lg">
                  Bugungi davomat
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Bugungi kunda o‘quvchilarning davomat holati
                </p>
              </div>

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <i className="fa-solid fa-calendar-check text-lg" />
              </span>
            </div>

            {/* Kelgan / kelmagan sonlari */}
            <div className="mt-5 grid grid-cols-2 divide-x divide-slate-200 rounded-2xl bg-slate-50 p-4 sm:p-5">
              <div className="pr-3 sm:pr-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                  <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Kelganlar
                  </span>
                </div>

                <p className="mt-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">
                  {loading ? "..." : attendance.present}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">o‘quvchi</p>
              </div>

              <div className="pl-3 sm:pl-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                  <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                    Kelmaganlar
                  </span>
                </div>

                <p className="mt-2 text-2xl font-extrabold text-slate-800 sm:text-3xl">
                  {loading ? "..." : attendance.absent}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">o‘quvchi</p>
              </div>
            </div>

            {/* Progress chizig‘i */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                  Davomat ko‘rsatkichi
                </span>

                <span className="text-sm font-extrabold text-slate-700">
                  {loading ? "..." : `${attendance.percentage}%`}
                </span>
              </div>

              <div className="h-3.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{
                    width: `${loading ? 0 : attendance.percentage}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[11px] leading-4 text-slate-400">
                Kelganlar soni jami davomat yozuvlariga nisbatan hisoblanadi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/attendance")}
              className="mt-5 inline-flex items-center text-sm font-bold text-orange-500 transition hover:text-orange-600"
            >
              Davomatni ko‘rish
              <i className="fa-solid fa-arrow-right ml-2" />
            </button>
          </section>

          {/* Tizim holati */}
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-800 sm:text-lg">
                  Tizim holati
                </h2>

                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  Maktab tizimining umumiy holati
                </p>
              </div>

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-500">
                <i className="fa-solid fa-server text-lg" />
              </span>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${loading
                        ? "bg-amber-500"
                        : error
                          ? "bg-red-500"
                          : "bg-emerald-500"
                      }`}
                  />

                  <span className="text-xs font-bold text-slate-700 sm:text-sm">
                    Supabase ulanishi
                  </span>
                </div>

                <span
                  className={`text-xs font-extrabold sm:text-sm ${loading
                      ? "text-amber-600"
                      : error
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                >
                  {loading ? "Tekshirilmoqda" : error ? "Xatolik" : "Faol"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                  <span className="text-xs font-bold text-slate-700 sm:text-sm">
                    Autentifikatsiya
                  </span>
                </div>

                <span className="text-xs font-extrabold text-emerald-600 sm:text-sm">
                  Faol
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                  <span className="text-xs font-bold text-slate-700 sm:text-sm">
                    Admin panel
                  </span>
                </div>

                <span className="text-xs font-extrabold text-emerald-600 sm:text-sm">
                  Faol
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}