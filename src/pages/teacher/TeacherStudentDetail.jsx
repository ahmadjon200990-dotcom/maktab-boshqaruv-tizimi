import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    ChevronRight,
    GraduationCap,
    Mail,
    MessageSquare,
    Phone,
    UserRound,
    Users,
} from "lucide-react";

import { supabase } from "../../lib/supabase";

export default function TeacherStudentDetail() {
    const { classId, studentId } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [classInfo, setClassInfo] = useState(null);
    const [parent, setParent] = useState(null);

    const [loading, setLoading] = useState(true);
    const [messageLoading, setMessageLoading] = useState(false);
    const [error, setError] = useState("");

    // =========================================================
    // LOAD DATA
    // =========================================================

    useEffect(() => {
        loadStudent();
    }, [classId, studentId]);

    async function loadStudent() {
        try {
            setLoading(true);
            setError("");
            setParent(null);

            // -----------------------------------------------------
            // CURRENT USER
            // -----------------------------------------------------

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

            // -----------------------------------------------------
            // CURRENT TEACHER PROFILE
            // -----------------------------------------------------

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

            // -----------------------------------------------------
            // CLASS
            // -----------------------------------------------------

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
                    homeroom_teacher_id
                `)
                .eq("id", classId)
                .eq("school_id", profile.school_id)
                .single();

            if (classError) {
                throw classError;
            }

            // -----------------------------------------------------
            // TEACHER ACCESS
            // -----------------------------------------------------

            if (classData.homeroom_teacher_id !== user.id) {
                throw new Error(
                    "Bu sinf sizga biriktirilmagan."
                );
            }

            setClassInfo(classData);

            // -----------------------------------------------------
            // STUDENT
            // -----------------------------------------------------

            const {
                data: studentData,
                error: studentError,
            } = await supabase
                .from("students")
                .select("*")
                .eq("id", studentId)
                .eq("class_id", classId)
                .eq("school_id", profile.school_id)
                .single();

            if (studentError) {
                throw studentError;
            }

            setStudent(studentData);

            // -----------------------------------------------------
            // PARENT
            // -----------------------------------------------------
            // V1:
            // Parent profile ichidagi student_id orqali topiladi.
            // parent_students yoki students.parent_id ishlatilmaydi.
            // -----------------------------------------------------

            const {
                data: parentData,
                error: parentError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    school_id,
                    role,
                    full_name,
                    first_name,
                    last_name,
                    email,
                    phone,
                    avatar_url
                `)
                .eq("student_id", studentId)
                .eq("school_id", profile.school_id)
                .eq("role", "parent")
                .maybeSingle();

            if (parentError) {
                console.warn(
                    "Parent loading error:",
                    parentError
                );
            }

            setParent(parentData || null);
        } catch (err) {
            console.error(
                "TeacherStudentDetail error:",
                err
            );

            setError(
                err?.message ||
                    "O‘quvchi ma’lumotlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    // =========================================================
    // STUDENT NAME
    // =========================================================

    const studentName = useMemo(() => {
        if (!student) {
            return "O‘quvchi";
        }

        if (student.full_name) {
            return student.full_name;
        }

        const fullName =
            `${student.first_name || ""} ${
                student.last_name || ""
            }`.trim();

        if (fullName) {
            return fullName;
        }

        return (
            student.name ||
            student.email ||
            "Noma'lum o‘quvchi"
        );
    }, [student]);

    // =========================================================
    // PARENT NAME
    // =========================================================

    const parentName = useMemo(() => {
        if (!parent) {
            return null;
        }

        if (parent.full_name) {
            return parent.full_name;
        }

        const fullName =
            `${parent.first_name || ""} ${
                parent.last_name || ""
            }`.trim();

        return (
            fullName ||
            parent.email ||
            "Ota-ona"
        );
    }, [parent]);

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
    // DATE
    // =========================================================

    function formatDate(value) {
        if (!value) {
            return null;
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString(
            "uz-UZ",
            {
                day: "2-digit",
                month: "long",
                year: "numeric",
            }
        );
    }

    // =========================================================
    // SEND MESSAGE
    // =========================================================

    async function handleSendMessage() {
        if (!parent?.id) {
            return;
        }

        try {
            setMessageLoading(true);
            setError("");

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

            // -----------------------------------------------------
            // CURRENT USER PROFILE
            // -----------------------------------------------------

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("id, school_id, full_name")
                .eq("id", user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            // -----------------------------------------------------
            // FIND MY CONVERSATIONS
            // -----------------------------------------------------

            const {
                data: myParticipants,
                error: myParticipantsError,
            } = await supabase
                .from("conversation_participants")
                .select("conversation_id")
                .eq("user_id", user.id);

            if (myParticipantsError) {
                throw myParticipantsError;
            }

            const conversationIds =
                (myParticipants || []).map(
                    (item) => item.conversation_id
                );

            let existingConversation = null;

            // -----------------------------------------------------
            // FIND EXISTING CHAT WITH PARENT
            // -----------------------------------------------------

            if (conversationIds.length) {
                const {
                    data: targetParticipants,
                    error: targetError,
                } = await supabase
                    .from("conversation_participants")
                    .select("conversation_id")
                    .eq("user_id", parent.id)
                    .in(
                        "conversation_id",
                        conversationIds
                    );

                if (targetError) {
                    throw targetError;
                }

                if (targetParticipants?.length) {
                    existingConversation =
                        targetParticipants[0]
                            .conversation_id;
                }
            }

            // -----------------------------------------------------
            // EXISTING CHAT
            // -----------------------------------------------------

            if (existingConversation) {
                navigate(
                    `/teacher/messages/${existingConversation}`
                );

                return;
            }

            // -----------------------------------------------------
            // CREATE CONVERSATION
            // -----------------------------------------------------

            const title =
                `${profile.full_name || "O‘qituvchi"} — ${parentName}`;

            const {
                data: conversation,
                error: conversationError,
            } = await supabase
                .from("conversations")
                .insert({
                    school_id: profile.school_id,
                    title,
                    created_by: user.id,
                })
                .select("id")
                .single();

            if (conversationError) {
                throw conversationError;
            }

            // -----------------------------------------------------
            // PARTICIPANTS
            // -----------------------------------------------------

            const {
                error: participantsError,
            } = await supabase
                .from("conversation_participants")
                .insert([
                    {
                        conversation_id:
                            conversation.id,
                        user_id: user.id,
                    },
                    {
                        conversation_id:
                            conversation.id,
                        user_id: parent.id,
                    },
                ]);

            if (participantsError) {
                throw participantsError;
            }

            navigate(
                `/teacher/messages/${conversation.id}`
            );
        } catch (err) {
            console.error(
                "Message opening error:",
                err
            );

            setError(
                err?.message ||
                    "Xabar oynasini ochishda xatolik yuz berdi."
            );
        } finally {
            setMessageLoading(false);
        }
    }

    // =========================================================
    // INFO ITEM
    // =========================================================

    function InfoItem({
        icon: Icon,
        label,
        value,
        href,
    }) {
        if (!value) {
            return null;
        }

        const content = (
            <>
                <div
                    className="
                        flex h-10 w-10
                        shrink-0
                        items-center justify-center
                        rounded-xl
                        bg-gray-100
                        text-gray-500
                        sm:h-11
                        sm:w-11
                    "
                >
                    <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        {label}
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                        {value}
                    </p>
                </div>

                {href && (
                    <ChevronRight
                        size={17}
                        className="shrink-0 text-gray-300"
                    />
                )}
            </>
        );

        if (href) {
            return (
                <a
                    href={href}
                    className="
                        flex items-center gap-3
                        border-b border-black/[0.06]
                        py-4
                        transition
                        hover:bg-black/[0.02]
                        active:bg-black/[0.04]
                    "
                >
                    {content}
                </a>
            );
        }

        return (
            <div className="flex items-center gap-3 border-b border-black/[0.06] py-4 last:border-b-0">
                {content}
            </div>
        );
    }

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="min-h-full bg-[#F7F7F7] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto max-w-4xl animate-pulse">
                    <div className="h-4 w-32 rounded bg-gray-200" />

                    <div className="mt-7 flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gray-200 sm:h-20 sm:w-20" />

                        <div className="min-w-0">
                            <div className="h-7 w-48 rounded bg-gray-200" />
                            <div className="mt-2 h-4 w-28 rounded bg-gray-200" />
                        </div>
                    </div>

                    <div className="mt-8 h-14 rounded-2xl bg-gray-200" />

                    <div className="mt-8 space-y-5">
                        <div className="h-5 w-48 rounded bg-gray-200" />

                        <div className="space-y-1">
                            <div className="h-16 rounded bg-gray-200" />
                            <div className="h-16 rounded bg-gray-200" />
                            <div className="h-16 rounded bg-gray-200" />
                        </div>
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
                <div className="mx-auto max-w-4xl">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/teacher/classes/${classId}`
                            )
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-gray-950"
                    >
                        <ArrowLeft size={17} />
                        Sinfga qaytish
                    </button>

                    <div className="mt-8">
                        <p className="font-semibold text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadStudent}
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
            <div className="mx-auto max-w-4xl">

                {/* BACK */}

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            `/teacher/classes/${classId}`
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
                    {classInfo?.name || "Sinf"} ga qaytish
                </button>

                {/* PROFILE HEADER */}

                <div className="mt-7">
                    <div className="flex items-start gap-4 sm:items-center">

                        {/* AVATAR */}

                        <div
                            className="
                                flex
                                h-16 w-16
                                shrink-0
                                items-center justify-center
                                rounded-full
                                bg-orange-100
                                text-lg
                                font-extrabold
                                text-orange-600
                                sm:h-20
                                sm:w-20
                                sm:text-xl
                            "
                        >
                            {getInitials(studentName)}
                        </div>

                        {/* NAME */}

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                <GraduationCap size={15} />

                                <span>
                                    {classInfo?.name}
                                </span>
                            </div>

                            <h1
                                className="
                                    mt-1
                                    break-words
                                    text-2xl
                                    font-bold
                                    tracking-tight
                                    text-gray-950
                                    sm:text-3xl
                                "
                            >
                                {studentName}
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                O‘quvchi
                            </p>
                        </div>
                    </div>

                    {/* MESSAGE BUTTON */}

                    <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={
                            messageLoading ||
                            !parent?.id
                        }
                        className="
                            mt-5
                            flex
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-2xl
                            bg-orange-500
                            px-4
                            py-3.5
                            text-sm
                            font-bold
                            text-white
                            shadow-sm
                            transition
                            hover:bg-orange-600
                            active:scale-[0.99]
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            sm:w-auto
                            sm:min-w-[190px]
                        "
                    >
                        <MessageSquare size={18} />

                        {messageLoading
                            ? "Ochilyapti..."
                            : parent?.id
                            ? "Xabar yuborish"
                            : "Ota-ona biriktirilmagan"}
                    </button>
                </div>

                {/* ERROR MESSAGE */}

                {error && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                {/* STUDENT INFORMATION */}

                <section className="mt-9">
                    <div className="flex items-center gap-2">
                        <UserRound
                            size={17}
                            className="text-gray-400"
                        />

                        <h2 className="text-sm font-bold text-gray-900">
                            O‘quvchi ma’lumotlari
                        </h2>
                    </div>

                    <div className="mt-2">
                        <InfoItem
                            icon={UserRound}
                            label="F.I.Sh."
                            value={studentName}
                        />

                        <InfoItem
                            icon={GraduationCap}
                            label="Sinf"
                            value={classInfo?.name}
                        />

                        <InfoItem
                            icon={CalendarDays}
                            label="Tug‘ilgan sana"
                            value={formatDate(
                                student.birth_date ||
                                    student.date_of_birth ||
                                    student.birthday
                            )}
                        />

                        <InfoItem
                            icon={Mail}
                            label="Email"
                            value={student.email}
                            href={
                                student.email
                                    ? `mailto:${student.email}`
                                    : undefined
                            }
                        />

                        <InfoItem
                            icon={Phone}
                            label="Telefon"
                            value={
                                student.phone ||
                                student.phone_number
                            }
                            href={
                                student.phone ||
                                student.phone_number
                                    ? `tel:${
                                          student.phone ||
                                          student.phone_number
                                      }`
                                    : undefined
                            }
                        />
                    </div>
                </section>

                {/* PARENT */}

                <section className="mt-9">
                    <div className="flex items-center gap-2">
                        <Users
                            size={17}
                            className="text-gray-400"
                        />

                        <h2 className="text-sm font-bold text-gray-900">
                            Ota-ona
                        </h2>
                    </div>

                    {parent ? (
                        <div className="mt-2">
                            <div className="flex items-center gap-3 border-b border-black/[0.06] py-4">
                                <div
                                    className="
                                        flex h-11 w-11
                                        shrink-0
                                        items-center justify-center
                                        rounded-full
                                        bg-blue-100
                                        text-sm
                                        font-bold
                                        text-blue-600
                                    "
                                >
                                    {getInitials(parentName)}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-gray-900">
                                        {parentName}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                        Ota-ona
                                    </p>
                                </div>

                                <ChevronRight
                                    size={17}
                                    className="text-gray-300"
                                />
                            </div>

                            <InfoItem
                                icon={Mail}
                                label="Email"
                                value={parent.email}
                                href={
                                    parent.email
                                        ? `mailto:${parent.email}`
                                        : undefined
                                }
                            />

                            <InfoItem
                                icon={Phone}
                                label="Telefon"
                                value={parent.phone}
                                href={
                                    parent.phone
                                        ? `tel:${parent.phone}`
                                        : undefined
                                }
                            />
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-gray-400">
                            Bu o‘quvchiga ota-ona profili
                            biriktirilmagan.
                        </p>
                    )}
                </section>

                {/* MOBILE BOTTOM SPACE */}

                <div className="h-6 sm:h-8" />
            </div>
        </div>
    );
}