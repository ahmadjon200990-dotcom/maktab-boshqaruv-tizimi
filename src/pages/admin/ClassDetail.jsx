import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function ClassDetail() {
  const { classId } = useParams();

  const [classInfo, setClassInfo] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClassDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!classId) {
        setError("Sinf ID raqami topilmadi.");
        return;
      }

      // 1. Sinf ma'lumotlarini olish
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
          homeroom_teacher_id
        `)
        .eq("id", classId)
        .maybeSingle();

      if (classError) {
        throw classError;
      }

      if (!classData) {
        setError("Sinf topilmadi.");
        return;
      }

      // 2. Sinf rahbarini olish
      let teacherData = null;

      if (classData.homeroom_teacher_id) {
        const {
          data: selectedTeacher,
          error: teacherError,
        } = await supabase
          .from("teachers")
          .select(`
            id,
            first_name,
            last_name,
            subject,
            phone
          `)
          .eq("id", classData.homeroom_teacher_id)
          .maybeSingle();

        if (teacherError) {
          console.error("Sinf rahbarini olishda xatolik:", teacherError);
        } else {
          teacherData = selectedTeacher;
        }
      }

      // 3. Sinfdagi o'quvchilarni olish
      // DIQQAT:
      // Bu yerda email va created_at ishlatilmaydi.
      const {
        data: studentsData,
        error: studentsError,
      } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          class_id
        `)
        .eq("class_id", classId)
        .order("last_name", { ascending: true });

      if (studentsError) {
        throw studentsError;
      }

      setClassInfo(classData);
      setTeacher(teacherData);
      setStudents(studentsData || []);
    } catch (err) {
      console.error("Class details error:", err);

      setError(
        err.message ||
        "Sinf ma'lumotlarini yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassDetails();
  }, [fetchClassDetails]);

  const getTeacherName = () => {
    if (!teacher) {
      return "Biriktirilmagan";
    }

    const fullName = `${teacher.first_name || ""} ${teacher.last_name || ""
      }`.trim();

    return fullName || "Noma’lum o‘qituvchi";
  };

  const getStudentName = (student) => {
    if (!student) {
      return "Noma’lum o‘quvchi";
    }

    const fullName = `${student.first_name || ""} ${student.last_name || ""
      }`.trim();

    return fullName || "Noma’lum o‘quvchi";
  };

  const getInitials = (name) => {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() || "O‘"
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#f5f7fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />

          <p className="text-sm font-medium text-slate-500">
            Sinf ma’lumotlari yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[500px] bg-[#f5f7fb] p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 sm:h-16 sm:w-16">
            <i className="fa-solid fa-triangle-exclamation text-xl sm:text-2xl" />
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900 sm:mt-5 sm:text-2xl">
            Xatolik yuz berdi
          </h2>

          <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-600">
            {error}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={fetchClassDetails}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <i className="fa-solid fa-rotate-right" />
              Qayta urinish
            </button>

            <Link
              to="/admin/classes"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              <i className="fa-solid fa-arrow-left" />
              Sinflarga qaytish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm sm:rounded-3xl sm:p-8">
        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
          Sinf topilmadi
        </h2>

        <Link
          to="/admin/classes"
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white sm:w-fit"
        >
          Sinflarga qaytish
        </Link>
      </div>
    );
  }

  const classTitle =
    classInfo.name ||
    `${classInfo.grade_level || ""}${classInfo.section || ""}` ||
    "Noma’lum sinf";

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 sm:gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:mb-3 sm:text-sm">
              <Link
                to="/admin/classes"
                className="transition hover:text-orange-500"
              >
                Sinflar
              </Link>

              <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 sm:text-xs" />

              <span className="truncate font-medium text-slate-700">
                {classTitle}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              {classTitle}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sinf haqida umumiy ma’lumotlar va o‘quvchilar ro‘yxati
            </p>
          </div>

          <Link
            to="/admin/classes"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 sm:w-fit"
          >
            <i className="fa-solid fa-arrow-left" />
            Orqaga
          </Link>
        </div>

        {/* Main class profile */}
        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:mb-6 sm:rounded-3xl">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 sm:h-2" />

          <div className="p-4 sm:p-5 md:p-8">
            <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 md:gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 sm:h-20 sm:w-20 sm:rounded-3xl">
                  <i className="fa-solid fa-school text-xl sm:text-3xl" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400 sm:text-sm">
                    Maktab sinfi
                  </p>

                  <h2 className="mt-1 truncate text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
                    {classTitle}
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">
                    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
                      <i className="fa-solid fa-users mr-1" />
                      {students.length} ta o‘quvchi
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      Faol sinf
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Sinf rahbari
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-600 sm:h-11 sm:w-11">
                    {getInitials(getTeacherName())}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">
                      {getTeacherName()}
                    </p>

                    {teacher?.subject && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {teacher.subject}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  Sinf nomi
                </p>

                <h3 className="mt-1 truncate text-lg font-bold text-slate-900 sm:mt-2 sm:text-2xl">
                  {classTitle}
                </h3>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 sm:h-12 sm:w-12">
                <i className="fa-solid fa-school text-base sm:text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  Sinf rahbari
                </p>

                <h3 className="mt-1 truncate text-base font-bold text-slate-900 sm:mt-2 sm:text-xl">
                  {getTeacherName()}
                </h3>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-600 sm:h-12 sm:w-12">
                <i className="fa-solid fa-user-tie text-base sm:text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  O‘quvchilar soni
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-900 sm:mt-2 sm:text-3xl">
                  {students.length}
                </h3>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 sm:h-12 sm:w-12">
                <i className="fa-solid fa-users text-base sm:text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Students section */}
        <div className="mb-4 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
              O‘quvchilar ro‘yxati
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Ushbu sinfga biriktirilgan o‘quvchilar
            </p>
          </div>

          <Link
            to="/admin/students"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 sm:w-fit"
          >
            <i className="fa-solid fa-users" />
            O‘quvchilarni boshqarish
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:rounded-3xl sm:p-10 md:p-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 sm:h-20 sm:w-20 sm:text-3xl">
              <i className="fa-solid fa-users" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-800 sm:mt-5 sm:text-xl">
              O‘quvchilar mavjud emas
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hozircha bu sinfga hech qanday o‘quvchi biriktirilmagan.
            </p>
          </div>
        ) : (
          <>
            {/* Mobil va planshet uchun — alohida kartalar */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {students.map((student, index) => {
                const studentName = getStudentName(student);

                return (
                  <Link
                    key={student.id}
                    to={`/admin/students/${student.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:border-orange-200 active:bg-orange-50/50"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-400">
                      {index + 1}
                    </span>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                      {getInitials(studentName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {studentName}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {student.phone || "Telefon kiritilmagan"}
                      </p>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop uchun jadval ko‘rinishi */}
            <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-4">№</th>
                      <th className="px-5 py-4">O‘quvchi</th>
                      <th className="px-5 py-4">Telefon</th>
                      <th className="px-5 py-4 text-right">Amallar</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, index) => {
                      const studentName = getStudentName(student);

                      return (
                        <tr
                          key={student.id}
                          className="transition hover:bg-orange-50/40"
                        >
                          <td className="px-5 py-4 text-sm font-medium text-slate-400">
                            {index + 1}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                                {getInitials(studentName)}
                              </div>

                              <div>
                                <Link
                                  to={`/admin/students/${student.id}`}
                                  className="font-bold text-slate-800 transition hover:text-orange-500"
                                >
                                  {studentName}
                                </Link>

                                <p className="mt-1 text-xs text-slate-400">
                                  Maktab o‘quvchisi
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {student.phone || "Kiritilmagan"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              to={`/admin/students/${student.id}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition hover:bg-orange-500 hover:text-white"
                              title="O‘quvchini ko‘rish"
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}