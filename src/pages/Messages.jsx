import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    X,
    ChevronRight,
    Megaphone,
    Loader2,
    AlertCircle,
    RotateCw,
    Check,
    MessageSquare,
    CalendarDays,
    Clock3,
    UsersRound,
    Pencil,
    Trash2,
    ChevronDown,
    Save,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// Avatar ranglari — ism bo‘yicha barqaror tanlanadi, shunda
// bir o‘qituvchi har safar bir xil rangda ko‘rinadi.
// Telegram uslubidagi to‘yingan gradient doiralar.
const AVATAR_PALETTE = [
    { bg: "bg-orange-100", text: "text-orange-600" },
    { bg: "bg-emerald-100", text: "text-emerald-600" },
    { bg: "bg-sky-100", text: "text-sky-600" },
    { bg: "bg-violet-100", text: "text-violet-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-amber-100", text: "text-amber-600" },
    { bg: "bg-cyan-100", text: "text-cyan-600" },
];

function getAvatarColors(name) {
    let sum = 0;

    for (let i = 0; i < name.length; i += 1) {
        sum += name.charCodeAt(i);
    }

    return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function ContactRowSkeleton() {
    return (
        <div className="flex animate-pulse items-center gap-3 px-4 py-3.5 sm:px-5">
            <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200" />

            <div className="min-w-0 flex-1">
                <div className="h-3 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-2.5 w-24 rounded bg-slate-100" />
            </div>
        </div>
    );
}

export default function Messages() {
    const navigate = useNavigate();

    const [contacts, setContacts] = useState([]);
    const contactsRef = useRef([]);
    contactsRef.current = contacts;

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    // Qaysi o‘qituvchi chati ochilayotganini saqlaymiz —
    // shunda faqat o‘sha qatorda yuklanish ko‘rinadi.
    const [openingContactId, setOpeningContactId] = useState(null);
    const [error, setError] = useState("");

    const [currentUser, setCurrentUser] = useState(null);
    const [currentProfile, setCurrentProfile] = useState(null);

    // Har bir kontakt bo‘yicha o‘qilmagan xabarlar soni.
    // contact.id — chatdagi haqiqiy recipient/sender profile ID.
    const [unreadCounts, setUnreadCounts] = useState({});

    // Kontaktlarning oxirgi chat faolligi.
    // Shu qiymat bo‘yicha eng oxirgi gaplashilgan odam tepaga chiqadi.
    const [lastMessageTimes, setLastMessageTimes] = useState({});

    const [showAnnouncementModal, setShowAnnouncementModal] =
        useState(false);

    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementText, setAnnouncementText] = useState("");
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [announcementError, setAnnouncementError] = useState("");

    // ADMIN: e’lon auditoriyasi
    const [announcementTarget, setAnnouncementTarget] = useState("school");

    // O‘QITUVCHI: tayyor e’lon + rahbar sinf + sana/soat
    const [announcementType, setAnnouncementType] =
        useState("parent_meeting");
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [selectedTeacherClassId, setSelectedTeacherClassId] = useState("");
    const [meetingDateText, setMeetingDateText] = useState("");
    const [meetingTime, setMeetingTime] = useState("");

    // ADMIN: mavjud e’lonlar oynasi va tahrirlash
    const [showAnnouncementsList, setShowAnnouncementsList] = useState(false);
    const [adminAnnouncements, setAdminAnnouncements] = useState([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editClassId, setEditClassId] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // E’lon saqlangandan keyin qisqa tasdiq xabari
    const [toast, setToast] = useState("");

    // =====================================================
    // CURRENT USER VA XABAR KONTAKTLARINI OLISH
    // =====================================================

    useEffect(() => {
        loadContacts();
    }, []);

    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => setToast(""), 3000);

        return () => clearTimeout(timer);
    }, [toast]);

    // O‘QITUVCHINING RAHBARLIK QILAYOTGAN SINFLARI
    useEffect(() => {
        if (currentProfile?.role !== "teacher" || !currentUser?.id) return;

        async function loadTeacherClasses() {
            try {
                const { data, error } = await supabase
                    .from("classes")
                    .select("id, name, grade_level, section")
                    .eq("homeroom_teacher_id", currentUser.id)
                    .eq("school_id", currentProfile.school_id)
                    .order("grade_level", { ascending: true })
                    .order("section", { ascending: true });

                if (error) throw error;

                setTeacherClasses(data || []);

                if (!selectedTeacherClassId && data?.[0]?.id) {
                    setSelectedTeacherClassId(data[0].id);
                }
            } catch (error) {
                console.error("Teacher announcement classes error:", error);
            }
        }

        loadTeacherClasses();
    }, [currentProfile?.role, currentProfile?.school_id, currentUser?.id]);

    // Modal ochiq bo‘lganda orqadagi sahifa sirg‘almasin
    useEffect(() => {
        const anyModalOpen =
            showAnnouncementModal ||
            showAnnouncementsList ||
            !!editingAnnouncement;

        if (!anyModalOpen) return;

        const handleKeyDown = (event) => {
            if (event.key !== "Escape") return;

            if (editingAnnouncement) {
                setEditingAnnouncement(null);
                return;
            }

            if (showAnnouncementsList) {
                setShowAnnouncementsList(false);
                return;
            }

            setShowAnnouncementModal(false);
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [showAnnouncementModal, showAnnouncementsList, editingAnnouncement]);

    // =====================================================
    // CHAT HOLATI: UNREAD + OXIRGI XABAR VAQTI
    // =====================================================

    async function loadChatMeta(userId, contactList) {
        if (!userId || !Array.isArray(contactList) || contactList.length === 0) {
            setUnreadCounts({});
            setLastMessageTimes({});
            return;
        }

        try {
            // Joriy foydalanuvchi qatnashgan barcha chatlarni topamiz.
            const { data: myParticipants, error: participantsError } =
                await supabase
                    .from("conversation_participants")
                    .select("conversation_id")
                    .eq("user_id", userId);

            if (participantsError) throw participantsError;

            const conversationIds = [
                ...new Set(
                    (myParticipants || [])
                        .map((item) => item.conversation_id)
                        .filter(Boolean)
                ),
            ];

            if (conversationIds.length === 0) {
                setUnreadCounts({});
                setLastMessageTimes({});
                return;
            }

            // Shu chatlardagi barcha participantlarni olamiz.
            // Keyin conversation -> contact bog‘lanishini tuzamiz.
            const { data: participants, error: allParticipantsError } =
                await supabase
                    .from("conversation_participants")
                    .select("conversation_id, user_id")
                    .in("conversation_id", conversationIds);

            if (allParticipantsError) throw allParticipantsError;

            const contactIds = new Set(contactList.map((contact) => contact.id));

            const conversationToContact = new Map();

            for (const participant of participants || []) {
                if (
                    participant.user_id !== userId &&
                    contactIds.has(participant.user_id)
                ) {
                    conversationToContact.set(
                        participant.conversation_id,
                        participant.user_id
                    );
                }
            }

            if (conversationToContact.size === 0) {
                setUnreadCounts({});
                setLastMessageTimes({});
                return;
            }

            const relevantConversationIds = [
                ...conversationToContact.keys(),
            ];

            // Oxirgi xabarlar va unread xabarlar shu yerdan hisoblanadi.
            const { data: chatMessages, error: messagesError } =
                await supabase
                    .from("messages")
                    .select(
                        "id, conversation_id, sender_id, is_read, created_at"
                    )
                    .in("conversation_id", relevantConversationIds)
                    .order("created_at", { ascending: false });

            if (messagesError) throw messagesError;

            const nextUnreadCounts = {};
            const nextLastMessageTimes = {};

            for (const message of chatMessages || []) {
                const contactId = conversationToContact.get(
                    message.conversation_id
                );

                if (!contactId) continue;

                // Bir kontakt bir nechta eski chatga ega bo‘lsa ham,
                // eng oxirgi xabar va unreadlar umumiy hisoblanadi.
                if (!nextLastMessageTimes[contactId]) {
                    nextLastMessageTimes[contactId] = message.created_at;
                }

                if (
                    message.sender_id === contactId &&
                    message.is_read === false
                ) {
                    nextUnreadCounts[contactId] =
                        (nextUnreadCounts[contactId] || 0) + 1;
                }
            }

            setUnreadCounts(nextUnreadCounts);
            setLastMessageTimes(nextLastMessageTimes);

            // Oxirgi xabar vaqtiga qarab kontaktlar tartibini yangilaymiz.
            setContacts((previous) => sortContactsByActivity(
                previous,
                nextLastMessageTimes
            ));
        } catch (metaError) {
            console.error("Chat meta loading error:", metaError);
        }
    }

    function sortContactsByActivity(contactList, activityMap = lastMessageTimes) {
        return [...contactList].sort((a, b) => {
            const aTime = activityMap[a.id]
                ? new Date(activityMap[a.id]).getTime()
                : 0;

            const bTime = activityMap[b.id]
                ? new Date(activityMap[b.id]).getTime()
                : 0;

            if (aTime !== bTime) {
                return bTime - aTime;
            }

            // Hali hech qachon yozishilmagan kontaktlar uchun
            // avvalgi ism bo‘yicha tartib saqlanadi.
            return (a.fullName || "").localeCompare(
                b.fullName || "",
                "uz"
            );
        });
    }

    async function loadContacts() {
        try {
            setLoading(true);
            setError("");

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                setError("Tizimga kirish kerak.");
                return;
            }

            setCurrentUser(user);

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select(`
                    id,
                    school_id,
                    role,
                    first_name,
                    last_name,
                    full_name,
                    email,
                    subject,
                    avatar_url,
                    student_id
                `)
                .eq("id", user.id)
                .single();

            if (profileError) throw profileError;

            setCurrentProfile(profile);

            // ADMIN: faqat o‘qituvchilar bilan yozishadi.
            if (profile.role === "admin") {
                const { data, error } = await supabase
                    .from("profiles")
                    .select(`
                        id,
                        school_id,
                        role,
                        first_name,
                        last_name,
                        full_name,
                        email,
                        subject,
                        avatar_url
                    `)
                    .eq("school_id", profile.school_id)
                    .eq("role", "teacher")
                    .order("first_name", { ascending: true });

                if (error) throw error;

                const formattedContacts = formatContacts(data || [], "teacher");
                setContacts(formattedContacts);
                await loadChatMeta(user.id, formattedContacts);
                return;
            }

            // PARENT: faqat O‘Z O‘QUVCHISINING RAHBARI bilan yozishadi.
            // Rahbar = o‘quvchining sinfidagi homeroom_teacher.
            // Parent boshqa admin, teacher yoki parent bilan yozisha olmaydi.
            if (profile.role === "parent") {
                if (!profile.student_id) {
                    setContacts([]);
                    setError("Ota-ona profiliga o‘quvchi biriktirilmagan.");
                    return;
                }

                // 1. Ota-onaga biriktirilgan o‘quvchini olamiz.
                const { data: student, error: studentError } = await supabase
                    .from("students")
                    .select("id, class_id")
                    .eq("id", profile.student_id)
                    .maybeSingle();

                if (studentError) throw studentError;

                if (!student?.class_id) {
                    setContacts([]);
                    setError("O‘quvchining sinfi topilmadi.");
                    return;
                }

                // 2. O‘quvchining sinfidagi rahbar o‘qituvchini topamiz.
                const { data: classData, error: classError } = await supabase
                    .from("classes")
                    .select("id, homeroom_teacher_id")
                    .eq("id", student.class_id)
                    .eq("school_id", profile.school_id)
                    .maybeSingle();

                if (classError) throw classError;

                if (!classData?.homeroom_teacher_id) {
                    setContacts([]);
                    setError("O‘quvchining rahbari biriktirilmagan.");
                    return;
                }

                // 3. Faqat shu rahbarning profile'ini olamiz.
                const { data: teacher, error: teacherError } = await supabase
                    .from("profiles")
                    .select(`
                        id,
                        school_id,
                        role,
                        first_name,
                        last_name,
                        full_name,
                        email,
                        subject,
                        avatar_url
                    `)
                    .eq("id", classData.homeroom_teacher_id)
                    .eq("school_id", profile.school_id)
                    .eq("role", "teacher")
                    .maybeSingle();

                if (teacherError) throw teacherError;

                const formattedContacts = teacher
                    ? formatContacts([teacher], "teacher")
                    : [];

                setContacts(formattedContacts);
                await loadChatMeta(user.id, formattedContacts);
                return;
            }

            // TEACHER: faqat o‘zi rahbarlik qilayotgan sinf(lar)dagi
            // o‘quvchilar bilan bog‘lanadi. V1 arxitekturasi sabab
            // chatning haqiqiy recipienti shu o‘quvchiga bog‘langan
            // ota-ona profile hisoblanadi.
            if (profile.role === "teacher") {
                const { data: homeroomClasses, error: classesError } =
                    await supabase
                        .from("classes")
                        .select("id, name, grade_level, section")
                        .eq("homeroom_teacher_id", user.id)
                        .eq("school_id", profile.school_id)
                        .order("grade_level", { ascending: true })
                        .order("section", { ascending: true });

                if (classesError) throw classesError;

                const classIds = (homeroomClasses || [])
                    .map((item) => item.id)
                    .filter(Boolean);

                let students = [];

                if (classIds.length > 0) {
                    const { data: studentsData, error: studentsError } =
                        await supabase
                            .from("students")
                            .select(`
                                id,
                                class_id,
                                first_name,
                                last_name,
                                student_number,
                                avatar_url
                            `)
                            .in("class_id", classIds)
                            .eq("school_id", profile.school_id)
                            .eq("is_active", true)
                            .order("first_name", { ascending: true })
                            .order("last_name", { ascending: true });

                    if (studentsError) throw studentsError;
                    students = studentsData || [];
                }

                // O‘qituvchi uchun adminlar ham chiqadi.
                // Teacher: Adminlar + faqat o‘zi rahbarlik
                // qilayotgan sinfdagi o‘quvchilar.
                const { data: adminData, error: adminError } =
                    await supabase
                        .from("profiles")
                        .select(`
                            id,
                            school_id,
                            role,
                            first_name,
                            last_name,
                            full_name,
                            email,
                            phone,
                            avatar_url,
                            subject
                        `)
                        .eq("school_id", profile.school_id)
                        .eq("role", "admin")
                        .order("first_name", { ascending: true });

                if (adminError) throw adminError;

                const adminContacts = formatContacts(
                    adminData || [],
                    "admin"
                );

                const studentIds = students.map((student) => student.id);

                let parents = [];

                if (studentIds.length > 0) {
                    const { data: parentData, error: parentError } =
                        await supabase
                            .from("profiles")
                            .select(`
                                id,
                                school_id,
                                role,
                                first_name,
                                last_name,
                                full_name,
                                email,
                                phone,
                                avatar_url,
                                student_id
                            `)
                            .eq("school_id", profile.school_id)
                            .eq("role", "parent")
                            .in("student_id", studentIds);

                    if (parentError) throw parentError;
                    parents = parentData || [];
                }

                const studentById = new Map(
                    students.map((student) => [student.id, student])
                );

                const classById = new Map(
                    (homeroomClasses || []).map((item) => [item.id, item])
                );

                // Har bir o‘quvchining V1 dagi bog‘langan ota-ona accountini
                // topamiz. UI'da esa ota-ona emas, o‘quvchining o‘zi chiqadi.
                const studentContacts = parents
                    .map((parent) => {
                        const student = studentById.get(parent.student_id);
                        if (!student) return null;

                        const studentName =
                            `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
                            student.student_number ||
                            "O‘quvchi";

                        const studentInitials =
                            `${student.first_name?.[0] || ""}${student.last_name?.[0] || ""}`.toUpperCase() ||
                            "O‘";

                        const studentClass = classById.get(student.class_id);
                        const className =
                            studentClass?.name ||
                            (studentClass
                                ? `${studentClass.grade_level}-${studentClass.section}`
                                : "Sinf");

                        return {
                            ...parent,
                            type: "student",
                            studentId: student.id,
                            classId: student.class_id,
                            fullName: studentName,
                            contactName: studentName,
                            parentName:
                                parent.full_name ||
                                `${parent.first_name || ""} ${parent.last_name || ""}`.trim() ||
                                parent.email ||
                                "Ota-ona",
                            initials: studentInitials,
                            avatar_url: student.avatar_url || parent.avatar_url,
                            subtitle: className,
                        };
                    })
                    .filter(Boolean);

                const formattedContacts = [
                    ...adminContacts,
                    ...studentContacts,
                ];

                setContacts(formattedContacts);
                await loadChatMeta(user.id, formattedContacts);
                return;
            }

            setContacts([]);
        } catch (err) {
            console.error("Contacts loading error:", err);
            setError(
                err?.message || "Xabarlar kontaktlarini yuklashda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    }

    function formatContacts(items, type) {
        return items.map((item) => {
            const fullName =
                item.full_name ||
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                item.email ||
                "Noma’lum foydalanuvchi";

            const initials = fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")
                .toUpperCase();

            return {
                ...item,
                type,
                fullName,
                contactName: fullName,
                initials: initials || "U",
                subtitle:
                    type === "teacher"
                        ? item.subject || item.email || "O‘qituvchi"
                        : "Administrator",
            };
        });
    }

    // =====================================================
    // REALTIME: YANGI XABAR / O‘QILDI / O‘CHIRILDI
    // =====================================================

    useEffect(() => {
        if (!currentUser?.id || contacts.length === 0) return;

        let channel;

        const subscribe = async () => {
            const { data: participantRows, error: participantError } =
                await supabase
                    .from("conversation_participants")
                    .select("conversation_id")
                    .eq("user_id", currentUser.id);

            if (participantError) {
                console.error("Realtime participant error:", participantError);
                return;
            }

            const conversationIds = [
                ...new Set(
                    (participantRows || [])
                        .map((item) => item.conversation_id)
                        .filter(Boolean)
                ),
            ];

            if (conversationIds.length === 0) return;

            channel = supabase
                .channel(`messages-list-${currentUser.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "messages",
                    },
                    async (payload) => {
                        const conversationId =
                            payload.new?.conversation_id ||
                            payload.old?.conversation_id;

                        if (
                            !conversationId ||
                            !conversationIds.includes(conversationId)
                        ) {
                            return;
                        }

                        // Xabar kelishi, o‘qilishi yoki o‘chirilishi bilan
                        // unread va oxirgi xabar tartibini qayta hisoblaymiz.
                        await loadChatMeta(currentUser.id, contactsRef.current);
                    }
                )
                .subscribe();
        };

        subscribe();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [currentUser?.id, contacts.length]);

    // =====================================================
    // SEARCH
    // =====================================================

    const filteredContacts = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return contacts;
        }

        return contacts.filter((contact) => {
            return (
                contact.contactName.toLowerCase().includes(searchValue) ||
                (contact.fullName || "").toLowerCase().includes(searchValue) ||
                (contact.subject || "").toLowerCase().includes(searchValue) ||
                (contact.email || "").toLowerCase().includes(searchValue) ||
                (contact.parentName || "").toLowerCase().includes(searchValue)
            );
        });
    }, [search, contacts]);

    // Harflar bo‘yicha guruhlash/A-Z indeks olib tashlandi.
    // Kontaktlar oxirgi yozishilgan vaqt bo‘yicha tartiblanadi.
    const sortedContacts = useMemo(() => {
        return sortContactsByActivity(filteredContacts, lastMessageTimes);
    }, [filteredContacts, lastMessageTimes]);

    // =====================================================
    // CHAT OCHISH
    // =====================================================

    async function openContactChat(contact) {
        if (!currentUser || !currentProfile) {
            setError("Foydalanuvchi ma’lumotlari topilmadi.");
            return;
        }

        if (openingContactId) return;

        try {
            setOpeningContactId(contact.id);
            setError("");

            const rolePath =
                currentProfile.role === "admin"
                    ? "/admin"
                    : currentProfile.role === "parent"
                        ? "/parent"
                        : "/teacher";

            const myName =
                currentProfile.full_name ||
                `${currentProfile.first_name || ""} ${currentProfile.last_name || ""}`.trim() ||
                currentProfile.email ||
                "Foydalanuvchi";

            const contactName =
                contact.contactName ||
                contact.fullName ||
                contact.email ||
                "Foydalanuvchi";

            // Bitta juftlik uchun doim bir xil kalit.
            const participantKey = [currentUser.id, contact.id]
                .sort()
                .join(":");
            const conversationTitle = `Chat: ${participantKey}`;

            // -------------------------------------------------
            // 1. Yangi formatdagi deterministic chat
            // -------------------------------------------------
            const { data: keyedConversation, error: keyedError } =
                await supabase
                    .from("conversations")
                    .select("id")
                    .eq("school_id", currentProfile.school_id)
                    .eq("title", conversationTitle)
                    .maybeSingle();

            if (keyedError) throw keyedError;

            if (keyedConversation?.id) {
                navigate(`${rolePath}/messages/${keyedConversation.id}`);
                return;
            }

            // -------------------------------------------------
            // 2. Eski chatlarni title + creator bo‘yicha qidirish
            // -------------------------------------------------
            const oldTitles = [
                `Chat: ${contactName}`,
                `${myName} — ${contactName}`,
                `Chat: ${myName}`,
                `${contactName} — ${myName}`,
            ];

            const { data: oldConversations, error: oldError } =
                await supabase
                    .from("conversations")
                    .select("id, title, created_by, created_at")
                    .eq("school_id", currentProfile.school_id)
                    .in("title", oldTitles)
                    .order("created_at", { ascending: false });

            if (oldError) throw oldError;

            const matchingOld = (oldConversations || []).find(
                (conversation) =>
                    conversation.created_by === currentUser.id ||
                    conversation.created_by === contact.id
            );

            if (matchingOld?.id) {
                navigate(`${rolePath}/messages/${matchingOld.id}`);
                return;
            }

            // -------------------------------------------------
            // 3. Joriy user qatnashgan conversationlarni olish.
            //    Agar contact allaqachon shu chatga xabar yuborgan
            //    bo‘lsa, aynan o‘sha conversationni qaytaramiz.
            // -------------------------------------------------
            const { data: myParticipants, error: participantsLoadError } =
                await supabase
                    .from("conversation_participants")
                    .select("conversation_id")
                    .eq("user_id", currentUser.id);

            if (participantsLoadError) throw participantsLoadError;

            const myConversationIds = [
                ...new Set(
                    (myParticipants || [])
                        .map((item) => item.conversation_id)
                        .filter(Boolean)
                ),
            ];

            if (myConversationIds.length > 0) {
                // Supabase .in() uchun juda katta massiv yubormaslik uchun
                // mavjud conversationlarni bo‘lib tekshiramiz.
                const chunkSize = 100;

                for (let i = 0; i < myConversationIds.length; i += chunkSize) {
                    const chunk = myConversationIds.slice(i, i + chunkSize);

                    const { data: contactMessages, error: contactMessagesError } =
                        await supabase
                            .from("messages")
                            .select("conversation_id, created_at")
                            .in("conversation_id", chunk)
                            .eq("sender_id", contact.id)
                            .order("created_at", { ascending: false })
                            .limit(1);

                    if (contactMessagesError) throw contactMessagesError;

                    if (contactMessages?.[0]?.conversation_id) {
                        navigate(
                            `${rolePath}/messages/${contactMessages[0].conversation_id}`
                        );
                        return;
                    }
                }
            }

            // -------------------------------------------------
            // 4. Hech qanday mavjud chat topilmadi — yangi yaratamiz.
            // -------------------------------------------------
            const { data: newConversation, error: conversationError } =
                await supabase
                    .from("conversations")
                    .insert({
                        school_id: currentProfile.school_id,
                        title: conversationTitle,
                        created_by: currentUser.id,
                    })
                    .select("id")
                    .single();

            if (conversationError) throw conversationError;

            const { error: participantsError } = await supabase
                .from("conversation_participants")
                .insert([
                    {
                        conversation_id: newConversation.id,
                        user_id: currentUser.id,
                    },
                    {
                        conversation_id: newConversation.id,
                        user_id: contact.id,
                    },
                ]);

            if (participantsError) {
                await supabase
                    .from("conversations")
                    .delete()
                    .eq("id", newConversation.id);

                throw participantsError;
            }

            navigate(`${rolePath}/messages/${newConversation.id}`);
        } catch (err) {
            console.error("Open chat error:", err);
            setError(
                err?.message ||
                "Chatni ochishda xatolik yuz berdi. Qayta urinib ko‘ring."
            );
        } finally {
            setOpeningContactId(null);
        }
    }

    // =====================================================
    // ANNOUNCEMENTLAR
    // =====================================================

    function getClassLabel(classItem) {
        if (!classItem) return "Sinf";
        return (
            classItem.name ||
            `${classItem.grade_level || ""}-${classItem.section || ""}`.replace(
                /^-|-$/g,
                ""
            ) ||
            "Sinf"
        );
    }

    function openAnnouncementComposer() {
        setAnnouncementError("");
        setAnnouncementTitle("");
        setAnnouncementText("");
        setAnnouncementTarget("school");
        setAnnouncementType("parent_meeting");
        setMeetingDateText("");
        setMeetingTime("");

        if (currentProfile?.role === "teacher" && teacherClasses.length > 0) {
            setSelectedTeacherClassId(
                (previous) => previous || teacherClasses[0].id
            );
        }

        setShowAnnouncementModal(true);
    }

    async function loadAdminAnnouncements() {
        if (!currentProfile?.school_id || !currentUser?.id) return;

        try {
            setLoadingAnnouncements(true);

            let query = supabase
                .from("announcements")
                .select(`
                    id,
                    school_id,
                    created_by,
                    title,
                    content,
                    target_type,
                    class_id,
                    announcement_type,
                    image_url,
                    is_active,
                    is_published,
                    published_at,
                    created_at,
                    updated_at
                `)
                .eq("school_id", currentProfile.school_id)
                .eq("is_active", true)
                .eq("is_published", true);

            if (currentProfile.role === "teacher") {
                query = query.eq("created_by", currentUser.id);
            }

            const { data, error } = await query.order("created_at", {
                ascending: false,
            });

            if (error) throw error;

            setAdminAnnouncements(data || []);
        } catch (error) {
            console.error("Announcements load error:", error);
            setToast("E’lonlarni yuklab bo‘lmadi");
        } finally {
            setLoadingAnnouncements(false);
        }
    }

    function getTargetLabel(targetType) {
        if (targetType === "school") return "Butun maktab";
        if (targetType === "teachers") return "O‘qituvchilar";
        if (targetType === "parents") return "Ota-onalar";
        if (targetType === "class_parents") return "Sinf ota-onalari";
        return "Maktab";
    }

    async function createAnnouncement() {
        if (!currentUser || !currentProfile) {
            setAnnouncementError("Foydalanuvchi ma’lumotlari topilmadi.");
            return;
        }

        let title = announcementTitle.trim();
        let content = announcementText.trim();
        let targetType = announcementTarget;
        let classId = null;
        let type = "custom";

        // TEACHER: faqat o‘zi rahbarlik qilayotgan sinf ota-onalariga yuboradi.
        if (currentProfile.role === "teacher") {
            const selectedClass = teacherClasses.find(
                (item) => item.id === selectedTeacherClassId
            );

            if (!selectedClass) {
                setAnnouncementError(
                    "Avval rahbarlik qilayotgan sinfni tanlang."
                );
                return;
            }

            targetType = "class_parents";
            classId = selectedClass.id;

            if (announcementType === "parent_meeting") {
                if (!meetingDateText.trim() || !meetingTime.trim()) {
                    setAnnouncementError(
                        "Majlis sanasi va soatini kiriting."
                    );
                    return;
                }

                title = "Ota-onalar majlisi";
                content =
                    `${getClassLabel(selectedClass)} sinf ota-onalari uchun ota-onalar majlisi.

` +
                    `Sana: ${meetingDateText.trim()}
` +
                    `Soat: ${meetingTime.trim()}

` +
                    `Hurmatli ota-onalar, majlisda qatnashishingizni so‘raymiz.`;
                type = "parent_meeting";
            } else {
                type = "custom";
            }
        }

        if (!title || !content) {
            setAnnouncementError(
                "E’lon sarlavhasi va matnini to‘ldiring."
            );
            return;
        }

        try {
            setAnnouncementLoading(true);
            setAnnouncementError("");

            const { error: insertError } = await supabase
                .from("announcements")
                .insert({
                    created_by: currentUser.id,
                    school_id: currentProfile.school_id,
                    title,
                    content,
                    target_type: targetType,
                    class_id: classId,
                    announcement_type: type,
                    image_url: null,
                    is_active: true,
                    is_published: true,
                    published_at: new Date().toISOString(),
                });

            if (insertError) throw insertError;

            setAnnouncementTitle("");
            setAnnouncementText("");
            setMeetingDateText("");
            setMeetingTime("");
            setShowAnnouncementModal(false);

            await loadAdminAnnouncements();

            setToast("E’lon yuborildi");
        } catch (err) {
            console.error("Announcement error:", err);
            setAnnouncementError(
                err?.message || "E’lonni saqlashda xatolik yuz berdi."
            );
        } finally {
            setAnnouncementLoading(false);
        }
    }

    async function deleteAnnouncement(id) {
        const confirmed = window.confirm(
            "Bu e’lonni o‘chirishni xohlaysizmi?"
        );

        if (!confirmed || !currentProfile?.school_id) return;

        try {
            setAnnouncementLoading(true);

            const { error } = await supabase
                .from("announcements")
                .update({
                    is_active: false,
                    canceled_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("school_id", currentProfile.school_id)
                .eq(
                    currentProfile.role === "teacher"
                        ? "created_by"
                        : "school_id",
                    currentProfile.role === "teacher"
                        ? currentUser.id
                        : currentProfile.school_id
                );

            if (error) throw error;

            setAdminAnnouncements((previous) =>
                previous.filter((item) => item.id !== id)
            );

            setToast("E’lon o‘chirildi");
        } catch (error) {
            console.error("Delete announcement error:", error);
            setToast("E’lonni o‘chirib bo‘lmadi");
        } finally {
            setAnnouncementLoading(false);
        }
    }

    function startEditAnnouncement(announcement) {
        if (!announcement) return;

        if (
            currentProfile?.role === "teacher" &&
            announcement.created_by !== currentUser?.id
        ) {
            return;
        }

        setEditingAnnouncement(announcement);
        setEditTitle(announcement.title || "");
        setEditContent(announcement.content || "");
        setEditClassId(announcement.class_id || "");
    }

    async function updateAnnouncement() {
        const title = editTitle.trim();
        const content = editContent.trim();

        if (!editingAnnouncement || !title || !content) return;

        try {
            setSavingEdit(true);

            const { data, error } = await supabase
                .from("announcements")
                .update({
                    title,
                    content,
                    class_id:
                        currentProfile?.role === "teacher"
                            ? editClassId || editingAnnouncement.class_id
                            : editingAnnouncement.class_id,
                    target_type:
                        currentProfile?.role === "teacher"
                            ? "class_parents"
                            : editingAnnouncement.target_type,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", editingAnnouncement.id)
                .eq("school_id", currentProfile.school_id)
                .eq(
                    currentProfile?.role === "teacher"
                        ? "created_by"
                        : "school_id",
                    currentProfile?.role === "teacher"
                        ? currentUser.id
                        : currentProfile.school_id
                )
                .select(`
                    id,
                    school_id,
                    created_by,
                    title,
                    content,
                    target_type,
                    class_id,
                    announcement_type,
                    image_url,
                    is_active,
                    is_published,
                    published_at,
                    created_at,
                    updated_at
                `)
                .single();

            if (error) throw error;

            setAdminAnnouncements((previous) =>
                previous.map((item) =>
                    item.id === editingAnnouncement.id
                        ? { ...item, ...data }
                        : item
                )
            );

            setEditingAnnouncement(null);
            setToast("E’lon yangilandi");
        } catch (error) {
            console.error("Update announcement error:", error);
            setToast("E’lonni tahrirlashda xatolik");
        } finally {
            setSavingEdit(false);
        }
    }

    const canSubmitAnnouncement =
        currentProfile?.role === "teacher"
            ? !!selectedTeacherClassId &&
            (announcementType === "parent_meeting"
                ? !!meetingDateText.trim() && !!meetingTime.trim()
                : !!announcementTitle.trim() && !!announcementText.trim())
            : !!announcementTitle.trim() && !!announcementText.trim();

    return (
        <>
            <section className="pb-6">
                {/* SARLAVHA VA QIDIRUV — original Messages dizayni */}
                <div className="sticky top-0 z-20 -mx-3 bg-[#f7f9fc] px-3 pb-3 pt-1 sm:mx-0 sm:px-0 sm:pt-0">
                    <div className="flex items-center justify-between gap-4 pt-3 sm:pt-0">
                        <div className="min-w-0">
                            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                Xabarlar
                            </h1>

                            <p className="mt-0.5 text-sm text-slate-500">
                                {currentProfile?.role === "parent"
                                    ? "Farzandingizning rahbari bilan bog‘laning"
                                    : currentProfile?.role === "admin"
                                        ? "O‘qituvchilar bilan bog‘laning"
                                        : "Rahbarlik qilayotgan sinf bilan bog‘laning"}
                            </p>
                        </div>

                        {(currentProfile?.role === "admin" || currentProfile?.role === "teacher") && (
                            <button
                                type="button"
                                onClick={openAnnouncementComposer}
                                aria-label={currentProfile?.role === "teacher" ? "E’lon berish" : "Maktabga e’lon berish"}
                                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-3 text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 active:scale-95 sm:px-4"
                            >
                                <Megaphone size={19} strokeWidth={2.2} />
                                <span className="hidden text-sm font-bold sm:inline">E’lon berish</span>
                            </button>
                        )}
                    </div>

                    <div className="relative mt-3">
                        <Search
                            size={19}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Ism yoki email bo‘yicha qidiring"
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm font-medium text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10"
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Qidiruvni tozalash"
                                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 shrink-0" size={18} />
                            <div className="min-w-0 flex-1">
                                <p className="font-bold">Ma’lumot yuklanmadi</p>
                                <p className="mt-1 wrap-break-words text-xs leading-5">{error}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={loadContacts}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-red-700 shadow-sm sm:w-auto sm:px-4"
                        >
                            <RotateCw size={14} />
                            Qayta urinish
                        </button>
                    </div>
                )}

                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                        <h2 className="text-sm font-extrabold text-slate-900">
                            {currentProfile?.role === "admin"
                                ? "O‘qituvchilar"
                                : currentProfile?.role === "parent"
                                    ? "Farzandingizning rahbari"
                                    : "Muloqotlar"}
                        </h2>
                        <span className="text-xs font-bold text-slate-400">
                            {loading ? "..." : `${filteredContacts.length} ta`}
                        </span>
                    </div>

                    {loading ? (
                        <div className="divide-y divide-slate-100">
                            <ContactRowSkeleton />
                            <ContactRowSkeleton />
                            <ContactRowSkeleton />
                            <ContactRowSkeleton />
                        </div>
                    ) : sortedContacts.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {sortedContacts.map((contact) => {
                                const colors = getAvatarColors(contact.fullName || contact.contactName || "U");
                                const isOpening = openingContactId === contact.id;
                                const unreadCount = unreadCounts[contact.id] || 0;

                                return (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        disabled={!!openingContactId}
                                        onClick={() => openContactChat(contact)}
                                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-slate-50 hover:bg-orange-50/40 disabled:cursor-not-allowed sm:px-5"
                                    >
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-extrabold ${colors.bg} ${colors.text}`}>
                                            {contact.avatar_url ? (
                                                <img src={contact.avatar_url} alt={contact.fullName} className="h-full w-full object-cover" />
                                            ) : (
                                                contact.initials
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className={`truncate text-[15px] ${unreadCount > 0 ? "font-extrabold text-slate-900" : "font-bold text-slate-800"}`}>
                                                    {contact.fullName}
                                                </p>
                                                {unreadCount > 0 && (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-extrabold text-white">
                                                        {unreadCount > 99 ? "99+" : unreadCount}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {contact.email || contact.subtitle || (contact.role === "parent" ? "Ota-ona" : contact.role === "admin" ? "Administrator" : "O‘qituvchi")}
                                            </p>
                                        </div>

                                        {isOpening ? (
                                            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-orange-600">
                                                <Loader2 size={15} className="animate-spin" />
                                                Ochilmoqda
                                            </span>
                                        ) : (
                                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                {search ? <Search size={24} /> : <MessageSquare size={24} />}
                            </div>
                            <h3 className="mt-4 font-extrabold text-slate-800">
                                {search ? "Kontakt topilmadi" : currentProfile?.role === "admin" ? "Hozircha o‘qituvchi yo‘q" : "Hozircha kontakt yo‘q"}
                            </h3>
                            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-slate-500">
                                {search
                                    ? "Boshqa ism yoki email bo‘yicha qidirib ko‘ring."
                                    : currentProfile?.role === "parent"
                                        ? "Farzandingizning rahbari hali biriktirilmagan."
                                        : currentProfile?.role === "admin"
                                            ? "Maktabga o‘qituvchi qo‘shilgach, ular shu yerda paydo bo‘ladi."
                                            : "Muloqot qilishingiz mumkin bo‘lgan foydalanuvchilar shu yerda ko‘rinadi."}
                            </p>
                            {search && (
                                <button type="button" onClick={() => setSearch("")} className="mt-5 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600">
                                    Qidiruvni tozalash
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* TASDIQ XABARI */}
            {toast && (
                <div className="pointer-events-none fixed inset-x-0 bottom-6 z-120 flex justify-center px-4">
                    <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
                        <Check size={16} className="text-emerald-400" />
                        {toast}
                    </div>
                </div>
            )}

            {/* =====================================================
                E’LON BERISH OYNASI
            ===================================================== */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 z-150 flex flex-col bg-white">
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                        <button
                            type="button"
                            disabled={announcementLoading}
                            onClick={() => setShowAnnouncementModal(false)}
                            className="px-3 py-1.5 text-[16px] text-[#33409E] disabled:opacity-50"
                        >
                            Bekor qilish
                        </button>

                        <h2 className="text-[16px] font-semibold text-slate-900">
                            {currentProfile?.role === "teacher"
                                ? "Sinfga e’lon"
                                : "Maktabga e’lon"}
                        </h2>

                        <div className="flex items-center gap-1">
                            {(currentProfile?.role === "admin" ||
                                currentProfile?.role === "teacher") && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAnnouncementModal(false);
                                            loadAdminAnnouncements();
                                            setShowAnnouncementsList(true);
                                        }}
                                        className="
                                        rounded-full bg-[#33409E]/10
                                        px-3 py-1.5 text-[13px] font-bold
                                        text-[#33409E] transition
                                        active:scale-95
                                    "
                                    >
                                        E’lonlar
                                    </button>
                                )}

                            <button
                                type="button"
                                disabled={
                                    announcementLoading ||
                                    !canSubmitAnnouncement
                                }
                                onClick={createAnnouncement}
                                className="
                                    flex items-center gap-1.5 px-3 py-1.5
                                    text-[16px] font-semibold text-[#33409E]
                                    disabled:text-slate-300
                                "
                            >
                                {announcementLoading && (
                                    <Loader2 size={15} className="animate-spin" />
                                )}
                                Yuborish
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {announcementError && (
                            <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-xs leading-5 text-red-700">
                                <AlertCircle className="mt-0.5 shrink-0" size={15} />
                                <p>{announcementError}</p>
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-2 pb-2 pt-7">
                            <div className="
                                relative flex h-16 w-16 items-center justify-center
                                rounded-full bg-linear-to-br from-orange-400
                                to-red-500 text-white shadow-xl shadow-orange-500/25
                            ">
                                <Megaphone size={28} />

                                <span className="absolute -right-0.5 -top-0.5 h-4 w-4 animate-ping rounded-full bg-red-500" />
                                <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-red-500 ring-2 ring-white" />
                            </div>

                            <p className="text-[13px] font-semibold text-slate-500">
                                {currentProfile?.role === "teacher"
                                    ? "Rahbarlik qilayotgan sinf ota-onalariga"
                                    : "Maktab foydalanuvchilariga"}
                            </p>
                        </div>

                        {currentProfile?.role === "teacher" ? (
                            <div className="mx-4 mt-5 space-y-3">
                                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <p className="mb-2 text-[12px] font-bold text-slate-500">
                                        E’lon turi
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            ["parent_meeting", "Ota-onalar majlisi"],
                                            ["custom", "Boshqa"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setAnnouncementType(value)}
                                                className={`rounded-2xl border px-3 py-3 text-[11px] font-bold transition ${announcementType === value
                                                    ? "border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                                    : "border-slate-200 bg-white text-slate-500 hover:border-orange-200"
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl bg-slate-100">
                                    <div className="border-b border-white px-4 py-3">
                                        <p className="mb-1 text-[11px] font-bold text-slate-400">
                                            Rahbarlik qilayotgan sinf
                                        </p>
                                        <div className="relative">
                                            <select
                                                value={selectedTeacherClassId}
                                                onChange={(event) => setSelectedTeacherClassId(event.target.value)}
                                                className="w-full appearance-none bg-transparent pr-8 text-[16px] font-semibold text-slate-900 outline-none"
                                            >
                                                <option value="">Sinfni tanlang</option>
                                                {teacherClasses.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {getClassLabel(item)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={18} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>

                                    {announcementType === "parent_meeting" && (
                                        <>
                                            <div className="border-b border-white px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={16} className="text-orange-500" />
                                                    <input
                                                        type="text"
                                                        value={meetingDateText}
                                                        onChange={(event) => setMeetingDateText(event.target.value)}
                                                        placeholder="Masalan: 12-sentabr"
                                                        className="w-full bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Clock3 size={16} className="text-orange-500" />
                                                    <input
                                                        type="text"
                                                        value={meetingTime}
                                                        onChange={(event) => setMeetingTime(event.target.value)}
                                                        placeholder="Masalan: 15:00"
                                                        className="w-full bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {announcementType === "parent_meeting" ? (
                                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm">
                                                <Megaphone size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-black text-slate-900">
                                                    Ota-onalar majlisi
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-orange-700">
                                                    Sana va vaqtni kiriting — tayyor matn avtomatik tuziladi.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-2xl bg-slate-100">
                                        <div className="border-b border-white px-4 py-3">
                                            <input
                                                type="text"
                                                value={announcementTitle}
                                                onChange={(event) => setAnnouncementTitle(event.target.value)}
                                                placeholder="Sarlavha"
                                                className="w-full bg-transparent text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
                                            />
                                        </div>
                                        <div className="px-4 py-3">
                                            <textarea
                                                rows={5}
                                                value={announcementText}
                                                onChange={(event) => setAnnouncementText(event.target.value)}
                                                placeholder="E’lon matni"
                                                className="w-full resize-none bg-transparent text-[16px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <UsersRound size={17} className="text-[#33409E]" />
                                        <span className="text-[12px] font-bold text-[#33409E]">
                                            Faqat tanlangan sinf ota-onalari
                                        </span>
                                    </div>
                                    <p className="mt-2 text-[13px] leading-5 text-slate-500">
                                        E’lon boshqa sinflarga yuborilmaydi.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mx-4 mt-5 space-y-4">
                                <div className="overflow-hidden rounded-2xl bg-slate-100">
                                    <div className="border-b border-white px-4 py-3">
                                        <input
                                            id="announcement-title"
                                            type="text"
                                            value={announcementTitle}
                                            onChange={(event) =>
                                                setAnnouncementTitle(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Sarlavha"
                                            className="
                                                w-full bg-transparent text-[16px]
                                                text-slate-900 outline-none
                                                placeholder:text-slate-400
                                            "
                                        />
                                    </div>

                                    <div className="px-4 py-3">
                                        <textarea
                                            id="announcement-text"
                                            rows={5}
                                            value={announcementText}
                                            onChange={(event) =>
                                                setAnnouncementText(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="E’lon matni"
                                            className="
                                                w-full resize-none bg-transparent
                                                text-[16px] leading-6 text-slate-900
                                                outline-none placeholder:text-slate-400
                                            "
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 px-1 text-[12px] font-bold text-slate-500">
                                        Kimlarga yuborish
                                    </p>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            ["teachers", "O‘qituvchilar"],
                                            ["parents", "Ota-onalar"],
                                            ["school", "Butun maktab"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() =>
                                                    setAnnouncementTarget(value)
                                                }
                                                className={`
                                                    rounded-2xl border px-2 py-3
                                                    text-[11px] font-bold transition
                                                    ${announcementTarget === value
                                                        ? "border-[#33409E] bg-[#33409E] text-white shadow-lg shadow-[#33409E]/20"
                                                        : "border-slate-200 bg-white text-slate-500 hover:border-[#33409E]/30"
                                                    }
                                                `}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-[#33409E]/5 p-4">
                                    <p className="text-[12px] font-bold text-[#33409E]">
                                        {getTargetLabel(announcementTarget)}
                                    </p>
                                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                                        E’lon yuborilgandan keyin tegishli
                                        foydalanuvchilarning ekranida ko‘zga
                                        tashlanadigan tarzda chiqadi.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =====================================================
                ADMIN — E’LONLAR RO‘YXATI
            ===================================================== */}
            {showAnnouncementsList &&
                (currentProfile?.role === "admin" ||
                    currentProfile?.role === "teacher") && (
                    <div className="fixed inset-0 z-170 flex items-center justify-center p-4">
                        <button
                            type="button"
                            aria-label="E’lonlar oynasini yopish"
                            onClick={() => setShowAnnouncementsList(false)}
                            className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
                        />

                        <div className="
                        relative z-10 flex max-h-[82vh] w-full max-w-145
                        flex-col overflow-hidden rounded-[28px] border border-white/60
                        bg-[#F8F9FC] shadow-[0_35px_110px_rgba(0,0,0,0.3)]
                    ">
                            <div className="
                            flex shrink-0 items-center justify-between
                            border-b border-slate-200 bg-white px-5 py-4
                        ">
                                <div className="flex items-center gap-3">
                                    <div className="
                                    flex h-11 w-11 items-center justify-center
                                    rounded-2xl bg-[#33409E]/10 text-[#33409E]
                                ">
                                        <Megaphone size={19} />
                                    </div>

                                    <div>
                                        <h2 className="text-[18px] font-black text-slate-900">
                                            E’lonlar
                                        </h2>
                                        <p className="text-[11px] text-slate-400">
                                            {currentProfile?.role === "teacher"
                                                ? "O‘zingiz yuborgan faol e’lonlar"
                                                : "Maktabdagi faol e’lonlarni boshqarish"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowAnnouncementsList(false)}
                                    className="
                                    flex h-9 w-9 items-center justify-center
                                    rounded-full bg-slate-100 text-slate-500
                                    transition hover:bg-slate-200 active:scale-95
                                "
                                >
                                    <X size={17} />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                                {loadingAnnouncements ? (
                                    <div className="flex min-h-62 items-center justify-center">
                                        <Loader2
                                            size={28}
                                            className="animate-spin text-[#33409E]"
                                        />
                                    </div>
                                ) : adminAnnouncements.length === 0 ? (
                                    <div className="flex min-h-62 flex-col items-center justify-center text-center">
                                        <div className="
                                        flex h-16 w-16 items-center justify-center
                                        rounded-[22px] bg-white text-slate-300 shadow-sm
                                    ">
                                            <Megaphone size={25} />
                                        </div>

                                        <h3 className="mt-4 text-[16px] font-black text-slate-800">
                                            Hozircha e’lon yo‘q
                                        </h3>

                                        <p className="mt-1 max-w-70 text-[12px] leading-5 text-slate-400">
                                            Yuborilgan faol e’lonlar shu yerda ko‘rinadi.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {adminAnnouncements.map((announcement) => (
                                            <div
                                                key={announcement.id}
                                                className="
                                                overflow-hidden rounded-[22px]
                                                border border-slate-200 bg-white
                                                shadow-sm transition
                                                hover:shadow-md
                                            "
                                            >
                                                <div className="p-4">
                                                    <div className="flex gap-3">
                                                        <div className="
                                                        flex h-11 w-11 shrink-0
                                                        items-center justify-center
                                                        rounded-2xl bg-linear-to-br
                                                        from-orange-400 to-red-500
                                                        text-white shadow-lg
                                                    ">
                                                            <Megaphone size={17} />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h3 className="truncate text-[15px] font-black text-slate-900">
                                                                    {announcement.title}
                                                                </h3>

                                                                <span className="
                                                                shrink-0 rounded-full
                                                                bg-emerald-50 px-2 py-1
                                                                text-[9px] font-black
                                                                text-emerald-600
                                                            ">
                                                                    Faol
                                                                </span>
                                                            </div>

                                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                <span className="
                                                                rounded-full bg-[#33409E]/10
                                                                px-2.5 py-1 text-[10px]
                                                                font-bold text-[#33409E]
                                                            ">
                                                                    {getTargetLabel(
                                                                        announcement.target_type
                                                                    )}
                                                                </span>

                                                                <span className="text-[10px] text-slate-400">
                                                                    {new Date(
                                                                        announcement.created_at
                                                                    ).toLocaleDateString("uz-UZ")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="
                                                    mt-3 whitespace-pre-wrap
                                                    text-[13px] leading-5 text-slate-500
                                                ">
                                                        {announcement.content}
                                                    </p>
                                                </div>

                                                <div className="flex border-t border-slate-100 bg-slate-50/70">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEditAnnouncement(
                                                                announcement
                                                            )
                                                        }
                                                        className="
                                                        flex flex-1 items-center
                                                        justify-center gap-2 py-3.5
                                                        text-[12px] font-bold
                                                        text-[#33409E] transition
                                                        hover:bg-[#33409E]/5
                                                    "
                                                    >
                                                        <Pencil size={14} />
                                                        Tahrirlash
                                                    </button>

                                                    <div className="w-px bg-slate-200" />

                                                    <button
                                                        type="button"
                                                        disabled={announcementLoading}
                                                        onClick={() =>
                                                            deleteAnnouncement(
                                                                announcement.id
                                                            )
                                                        }
                                                        className="
                                                        flex flex-1 items-center
                                                        justify-center gap-2 py-3.5
                                                        text-[12px] font-bold
                                                        text-red-500 transition
                                                        hover:bg-red-50
                                                        disabled:opacity-50
                                                    "
                                                    >
                                                        <Trash2 size={14} />
                                                        O‘chirish
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            {/* =====================================================
                ADMIN — E’LON TAHRIRLASH
            ===================================================== */}
            {editingAnnouncement &&
                (currentProfile?.role === "admin" ||
                    currentProfile?.role === "teacher") && (
                    <div className="fixed inset-0 z-190 flex items-center justify-center p-4">
                        <button
                            type="button"
                            aria-label="Tahrirlash oynasini yopish"
                            onClick={() => setEditingAnnouncement(null)}
                            className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
                        />

                        <div className="
                        relative z-10 w-full max-w-130 overflow-hidden
                        rounded-[28px] bg-white shadow-[0_35px_110px_rgba(0,0,0,0.3)]
                    ">
                            <div className="
                            flex items-center justify-between
                            border-b border-slate-100 px-5 py-4
                        ">
                                <div>
                                    <h2 className="text-[18px] font-black text-slate-900">
                                        E’lonni tahrirlash
                                    </h2>
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        Sarlavha va izohni o‘zgartiring
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEditingAnnouncement(null)}
                                    className="
                                    flex h-9 w-9 items-center justify-center
                                    rounded-full bg-slate-100 text-slate-500
                                "
                                >
                                    <X size={17} />
                                </button>
                            </div>

                            <div className="space-y-4 p-5">
                                <div>
                                    <label className="mb-2 block text-[12px] font-bold text-slate-600">
                                        Sarlavha
                                    </label>

                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(event) =>
                                            setEditTitle(event.target.value)
                                        }
                                        className="
                                        h-12 w-full rounded-2xl
                                        border border-slate-200 bg-slate-50
                                        px-4 text-[14px] font-semibold
                                        text-slate-900 outline-none transition
                                        focus:border-[#33409E]
                                        focus:ring-4 focus:ring-[#33409E]/10
                                    "
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[12px] font-bold text-slate-600">
                                        Izoh / e’lon matni
                                    </label>

                                    <textarea
                                        rows={7}
                                        value={editContent}
                                        onChange={(event) =>
                                            setEditContent(event.target.value)
                                        }
                                        className="
                                        w-full resize-none rounded-2xl
                                        border border-slate-200 bg-slate-50
                                        px-4 py-3.5 text-[14px] leading-6
                                        text-slate-900 outline-none transition
                                        focus:border-[#33409E]
                                        focus:ring-4 focus:ring-[#33409E]/10
                                    "
                                    />
                                </div>

                                {currentProfile?.role === "teacher" && (
                                    <div>
                                        <label className="mb-2 block text-[12px] font-bold text-slate-600">
                                            Sinf
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={editClassId}
                                                onChange={(event) => setEditClassId(event.target.value)}
                                                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-[14px] font-semibold text-slate-900 outline-none focus:border-[#33409E] focus:ring-4 focus:ring-[#33409E]/10"
                                            >
                                                <option value="">Sinfni tanlang</option>
                                                {teacherClasses.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {getClassLabel(item)}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={
                                        savingEdit ||
                                        !editTitle.trim() ||
                                        !editContent.trim()
                                    }
                                    onClick={updateAnnouncement}
                                    className="
                                    flex w-full items-center justify-center
                                    gap-2 rounded-2xl bg-[#33409E] py-3.5
                                    text-[13px] font-black text-white
                                    shadow-lg shadow-[#33409E]/20
                                    transition hover:brightness-105
                                    active:scale-[0.99] disabled:opacity-50
                                "
                                >
                                    {savingEdit ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Saqlash
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </>
    );
}