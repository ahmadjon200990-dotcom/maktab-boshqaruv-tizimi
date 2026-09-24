import { useEffect, useMemo, useRef, useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import * as Tone from "tone";

import { supabase } from "../../lib/supabase";

// ============================================================
// ADMIN NAVIGATION
// ============================================================

const adminNavigation = [
    {
        title: "Asosiy",
        href: "/admin",
        icon: "fa-solid fa-house",
    },
    {
        title: "O‘quvchilar",
        href: "/admin/students",
        icon: "fa-solid fa-user-graduate",
    },
    {
        title: "O‘qituvchilar",
        href: "/admin/teachers",
        icon: "fa-solid fa-chalkboard-user",
    },
    {
        title: "Sinflar",
        href: "/admin/classes",
        icon: "fa-solid fa-school",
    },
    {
        title: "Davomat",
        href: "/admin/attendance",
        icon: "fa-solid fa-calendar-check",
    },
    {
        title: "Xabarlar",
        href: "/admin/messages",
        icon: "fa-solid fa-envelope",
    },
    {
        title: "Hisobotlar",
        href: "/admin/reports",
        icon: "fa-solid fa-chart-column",
    },
    {
        title: "Sozlamalar",
        href: "/admin/settings",
        icon: "fa-solid fa-gear",
    },
];

// ============================================================
// TEACHER NAVIGATION
// ============================================================

const teacherNavigation = [
    {
        title: "Asosiy",
        href: "/teacher",
        icon: "fa-solid fa-house",
    },
    {
        title: "Sinflar",
        href: "/teacher/classes",
        icon: "fa-solid fa-school",
    },
    {
        title: "Dars jadvali",
        href: "/teacher/schedule",
        icon: "fa-solid fa-calendar-days",
    },
    {
        title: "Xabarlar",
        href: "/teacher/messages",
        icon: "fa-solid fa-envelope",
    },
    {
        title: "Profil",
        href: "/teacher/profile",
        icon: "fa-solid fa-user",
    },
];

// ============================================================
// INITIALS
// ============================================================

function getInitials(firstName, lastName) {
    const first = firstName?.trim()?.[0] || "";
    const last = lastName?.trim()?.[0] || "";

    const result = `${first}${last}`.toUpperCase();

    return result || "FO";
}

// ============================================================
// MESSAGE SOUND
// ============================================================

async function playIncomingMessageSound() {
    try {
        await Tone.start();

        const synth = new Tone.Synth({
            oscillator: {
                type: "sine",
            },
            envelope: {
                attack: 0.008,
                decay: 0.18,
                sustain: 0,
                release: 0.3,
            },
            volume: -10,
        }).toDestination();

        synth.triggerAttackRelease("A5", "8n");

        setTimeout(() => {
            synth.dispose();
        }, 600);
    } catch {
        // Ovoz ishlamasa, notification baribir chiqadi.
    }
}

async function playAnnouncementSound() {
    try {
        await Tone.start();

        const synth = new Tone.Synth({
            oscillator: {
                type: "sine",
            },
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0,
                release: 0.4,
            },
            volume: -7,
        }).toDestination();

        synth.triggerAttackRelease("E6", "8n");

        setTimeout(() => {
            synth.triggerAttackRelease("A6", "8n");
        }, 130);

        setTimeout(() => {
            synth.dispose();
        }, 800);
    } catch {
        // Ovoz ishlamasa notification baribir chiqadi.
    }
}

// ============================================================
// MAIN LAYOUT
// ============================================================

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [unreadMessageCount, setUnreadMessageCount] = useState(0);
    const [messageNotification, setMessageNotification] = useState(null);

    // ========================================================
    // ACTIVE ANNOUNCEMENT
    // ========================================================

    const [activeAnnouncement, setActiveAnnouncement] = useState(null);
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
    const [announcementIndex, setAnnouncementIndex] = useState(0);
    const [announcementNotification, setAnnouncementNotification] = useState(null);
    const announcementAutoOpenedRef = useRef(false);
    const announcementIdsRef = useRef(new Set());
    const announcementNotificationTimerRef = useRef(null);
    // ========================================================
    // LOAD CURRENT USER
    // ========================================================

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            try {
                setLoading(true);

                const {
                    data: { user: authUser },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) {
                    throw userError;
                }

                if (!mounted) return;

                if (!authUser) {
                    setUser(null);
                    setProfile(null);
                    return;
                }

                setUser(authUser);

                const {
                    data: profileData,
                    error: profileError,
                } = await supabase
                    .from("profiles")
                    .select(`
                        id,
                        first_name,
                        last_name,
                        full_name,
                        email,
                        role,
                        school_id,
                        phone,
                        avatar_url,
                        subject,
                        student_id
                    `)
                    .eq("id", authUser.id)
                    .maybeSingle();

                if (profileError) {
                    throw profileError;
                }

                if (!mounted) return;

                setProfile(profileData || null);
            } catch (error) {
                console.error(
                    "MainLayout profile error:",
                    error
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;

                if (!session?.user) {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                setUser(session.user);
            }
        );

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    // ========================================================
    // UNREAD MESSAGES + REALTIME NOTIFICATION
    // ========================================================

    useEffect(() => {
        if (!user?.id) {
            setUnreadMessageCount(0);
            return;
        }

        let mounted = true;
        let notificationTimer;

        const loadUnreadMessages = async () => {
            const { count, error } = await supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .neq("sender_id", user.id)
                .eq("is_read", false);

            if (error) {
                console.error("Unread messages error:", error);
                return;
            }

            if (mounted) setUnreadMessageCount(count || 0);
        };

        const showMessageNotification = async (message) => {
            if (!message?.sender_id || message.sender_id === user.id) return;

            const parts = location.pathname.split("/").filter(Boolean);
            const currentConversationId =
                (parts[0] === "admin" || parts[0] === "teacher") &&
                    parts[1] === "messages"
                    ? parts[2]
                    : null;

            if (currentConversationId === message.conversation_id) return;

            const { data: sender } = await supabase
                .from("profiles")
                .select("first_name, last_name, full_name")
                .eq("id", message.sender_id)
                .maybeSingle();

            const senderName =
                `${sender?.first_name || ""} ${sender?.last_name || ""}`.trim() ||
                sender?.full_name ||
                "Yangi xabar";

            const preview =
                message.content?.trim() ||
                (message.message_type === "image" ? "Rasm yuborildi" : "Yangi xabar");

            if (!mounted) return;

            setMessageNotification({
                senderName,
                preview,
                conversationId: message.conversation_id,
            });

            // Faqat boshqa sahifada yoki boshqa chatda turganda ovoz chiqadi.
            playIncomingMessageSound();

            window.clearTimeout(notificationTimer);
            notificationTimer = window.setTimeout(() => {
                if (mounted) setMessageNotification(null);
            }, 5000);
        };

        loadUnreadMessages();

        const channel = supabase
            .channel(`main-layout-messages-${user.id}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "messages" },
                async (payload) => {
                    await loadUnreadMessages();

                    if (
                        payload.eventType === "INSERT" &&
                        payload.new?.sender_id !== user.id &&
                        payload.new?.is_read === false
                    ) {
                        await showMessageNotification(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            window.clearTimeout(notificationTimer);
            supabase.removeChannel(channel);
        };
    }, [user?.id, location.pathname]);

    // ========================================================
    // ACTIVE ANNOUNCEMENT
    // ========================================================

    useEffect(() => {
        announcementAutoOpenedRef.current = false;
        announcementIdsRef.current = new Set();
        window.clearTimeout(announcementNotificationTimerRef.current);
        setAnnouncementNotification(null);
        setShowAnnouncement(false);
        setActiveAnnouncement(null);
        setVisibleAnnouncements([]);
        setAnnouncementIndex(0);
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id || !profile?.school_id) {
            setActiveAnnouncement(null);
            setVisibleAnnouncements([]);
            setAnnouncementIndex(0);
            return;
        }

        let mounted = true;

        const loadActiveAnnouncements = async () => {
            try {
                setAnnouncementLoading(true);

                const { data, error } = await supabase
                    .from("announcements")
                    .select(`
                        id, school_id, created_by, title, content,
                        target_type, class_id, announcement_type, image_url,
                        is_active, is_published, published_at, created_at
                    `)
                    .eq("school_id", profile.school_id)
                    .eq("is_active", true)
                    .eq("is_published", true)
                    .order("created_at", { ascending: true });

                if (error) {
                    console.error("Active announcements error:", error);
                    return;
                }

                let studentClassId = null;
                if (profile.role === "parent" && profile.student_id) {
                    const { data: student } = await supabase
                        .from("students")
                        .select("class_id")
                        .eq("id", profile.student_id)
                        .maybeSingle();
                    studentClassId = student?.class_id || null;
                }

                const filtered = (data || []).filter((announcement) => {

                    if (
                        profile.role === "admin" &&
                        announcement.created_by === profile.id
                    ) {
                        return false;
                    }

                    if (announcement.target_type === "school") return true;

                    if (announcement.target_type === "teachers") {
                        return profile.role === "teacher";
                    }

                    if (announcement.target_type === "parents") {
                        return profile.role === "parent";
                    }

                    if (announcement.target_type === "class_parents") {
                        return (
                            profile.role === "parent" &&
                            !!studentClassId &&
                            announcement.class_id === studentClassId
                        );
                    }

                    return false;
                });

                const creatorIds = [...new Set(filtered.map((item) => item.created_by).filter(Boolean))];
                let creatorRoles = {};
                if (creatorIds.length) {
                    const { data: creators } = await supabase
                        .from("profiles")
                        .select("id, role")
                        .in("id", creatorIds);
                    creatorRoles = Object.fromEntries(
                        (creators || []).map((creator) => [creator.id, creator.role])
                    );
                }

                const roleOrder = { teacher: 0, admin: 1 };
                const sorted = [...filtered]
                    .map((announcement) => ({
                        ...announcement,
                        creator_role: creatorRoles[announcement.created_by] || "",
                    }))
                    .sort((a, b) => {
                        const roleDiff = (roleOrder[a.creator_role] ?? 2) - (roleOrder[b.creator_role] ?? 2);
                        if (roleDiff !== 0) return roleDiff;
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    });

                if (!mounted) return;

                announcementIdsRef.current = new Set(
                    sorted.map((announcement) => announcement.id)
                );
                setVisibleAnnouncements(sorted);
                setAnnouncementIndex(0);
                setActiveAnnouncement(sorted[0] || null);

                if (sorted[0] && !announcementAutoOpenedRef.current) {
                    announcementAutoOpenedRef.current = true;
                    setShowAnnouncement(true);
                }
            } catch (error) {
                console.error("Announcement load error:", error);
            } finally {
                if (mounted) setAnnouncementLoading(false);
            }
        };


        loadActiveAnnouncements();
        return () => { mounted = false; };
    }, [user?.id, profile?.school_id, profile?.role, profile?.student_id]);

    // Bir nechta faol e'lon bo'lsa, har 5 soniyada keyingi e'longa o'tadi.
    useEffect(() => {
        if (visibleAnnouncements.length <= 1) return;
        const interval = window.setInterval(() => {
            setAnnouncementIndex((current) => {
                const next = (current + 1) % visibleAnnouncements.length;
                setActiveAnnouncement(visibleAnnouncements[next]);
                return next;
            });
        }, 5000);
        return () => window.clearInterval(interval);
    }, [visibleAnnouncements]);

    // ========================================================
    // ANNOUNCEMENT REALTIME
    // ========================================================

    useEffect(() => {
        if (!user?.id || !profile?.school_id) return;

        const channel = supabase
            .channel(`announcements-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "announcements",
                    filter: `school_id=eq.${profile.school_id}`,
                },
                async () => {
                    const { data, error } = await supabase
                        .from("announcements")
                        .select(`
                            id, school_id, created_by, title, content,
                            target_type, class_id, announcement_type, image_url,
                            is_active, is_published, published_at, created_at
                        `)
                        .eq("school_id", profile.school_id)
                        .eq("is_active", true)
                        .eq("is_published", true)
                        .order("created_at", { ascending: true });

                    if (error) {
                        console.error("Announcement realtime load error:", error);
                        return;
                    }

                    let studentClassId = null;
                    if (profile.role === "parent" && profile.student_id) {
                        const { data: student } = await supabase
                            .from("students")
                            .select("class_id")
                            .eq("id", profile.student_id)
                            .maybeSingle();
                        studentClassId = student?.class_id || null;
                    }

                    const filtered = (data || []).filter((announcement) => {

                        if (
                            profile.role === "admin" &&
                            announcement.created_by === profile.id
                        ) {
                            return false;
                        }

                        if (announcement.target_type === "school") return true;

                        if (announcement.target_type === "teachers") {
                            return profile.role === "teacher";
                        }

                        if (announcement.target_type === "parents") {
                            return profile.role === "parent";
                        }

                        if (announcement.target_type === "class_parents") {
                            return (
                                profile.role === "parent" &&
                                !!studentClassId &&
                                announcement.class_id === studentClassId
                            );
                        }

                        return false;
                    });

                    const creatorIds = [...new Set(filtered.map((item) => item.created_by).filter(Boolean))];
                    let creatorRoles = {};
                    if (creatorIds.length) {
                        const { data: creators } = await supabase
                            .from("profiles")
                            .select("id, role")
                            .in("id", creatorIds);
                        creatorRoles = Object.fromEntries(
                            (creators || []).map((creator) => [creator.id, creator.role])
                        );
                    }

                    const roleOrder = { teacher: 0, admin: 1 };
                    const sorted = [...filtered]
                        .map((announcement) => ({
                            ...announcement,
                            creator_role: creatorRoles[announcement.created_by] || "",
                        }))
                        .sort((a, b) => {
                            const roleDiff = (roleOrder[a.creator_role] ?? 2) - (roleOrder[b.creator_role] ?? 2);
                            if (roleDiff !== 0) return roleDiff;
                            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        });

                    // ====================================================
                    // YANGI E'LON NOTIFICATION
                    // ====================================================

                    const previousIds = announcementIdsRef.current;

                    const newAnnouncement = sorted.find(
                        (announcement) => !previousIds.has(announcement.id)
                    );

                    // Avval mavjud e'lonlarni eslab qolamiz
                    sorted.forEach((announcement) => {
                        previousIds.add(announcement.id);
                    });

                    if (
                        newAnnouncement &&
                        newAnnouncement.created_by !== user.id
                    ) {
                        setAnnouncementNotification(newAnnouncement);

                        playAnnouncementSound();

                        window.clearTimeout(
                            announcementNotificationTimerRef.current
                        );

                        announcementNotificationTimerRef.current =
                            window.setTimeout(() => {
                                setAnnouncementNotification(null);
                            }, 7000);
                    }

                    setVisibleAnnouncements(sorted);
                    if (!sorted.length) {
                        setAnnouncementIndex(0);
                        setActiveAnnouncement(null);
                        return;
                    }

                    setAnnouncementIndex((current) => {
                        const next = current >= sorted.length ? 0 : current;
                        setActiveAnnouncement(sorted[next]);
                        return next;
                    });
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id, profile?.school_id, profile?.role, profile?.student_id]);

    // E’lon oynasi ochilganda orqa sahifa sirg‘almasin.
    useEffect(() => {
        if (!showAnnouncement) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowAnnouncement(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [showAnnouncement]);

    // ========================================================
    // RELOAD PROFILE WHEN USER CHANGES
    // ========================================================

    useEffect(() => {
        if (!user?.id) return;

        async function reloadProfile() {
            try {
                const {
                    data,
                    error,
                } = await supabase
                    .from("profiles")
                    .select(`
                        id,
                        first_name,
                        last_name,
                        full_name,
                        email,
                        role,
                        school_id,
                        phone,
                        avatar_url,
                        subject,
                        student_id
                    `)
                    .eq("id", user.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                setProfile(data || null);
            } catch (error) {
                console.error(
                    "Profile reload error:",
                    error
                );
            }
        }

        reloadProfile();
    }, [user?.id]);

    // ========================================================
    // ROLE
    // ========================================================

    const role =
        profile?.role ||
        localStorage.getItem("role") ||
        "";

    const isAdmin = role === "admin";
    const isTeacher = role === "teacher";

    // ========================================================
    // NAVIGATION
    // ========================================================

    const navigation = useMemo(() => {
        if (isAdmin) {
            return adminNavigation;
        }

        if (isTeacher) {
            return teacherNavigation;
        }

        return [];
    }, [isAdmin, isTeacher]);

    // ========================================================
    // MESSAGE DETAIL
    // ========================================================

    const isMessageDetail =
        /^\/(teacher|admin)\/messages\/[^/]+$/.test(
            location.pathname
        );

    // ========================================================
    // MESSAGE NOTIFICATION UI
    // ========================================================

    const announcementNotificationView =
        announcementNotification ? (
            <div
                className="
                fixed
                left-1/2
                top-4
                z-150
                w-[calc(100%-24px)]
                max-w-107
                -translate-x-1/2
                overflow-hidden
                rounded-[22px]
                border
                border-black/6
                bg-white
                shadow-[0_18px_60px_rgba(0,0,0,0.18)]
                animate-[slideDown_0.3s_ease-out]
            "
            >
                <button
                    type="button"
                    onClick={() => {
                        setActiveAnnouncement(
                            announcementNotification
                        );

                        setShowAnnouncement(true);
                        setAnnouncementNotification(null);

                        window.clearTimeout(
                            announcementNotificationTimerRef.current
                        );
                    }}
                    className="
                    flex
                    w-full
                    items-center
                    gap-3
                    p-3
                    text-left
                "
                >
                    <div
                        className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-black
                        text-white
                    "
                    >
                        <i className="fa-solid fa-bullhorn text-[15px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black text-[#EF4444]">
                            YANGI E’LON
                        </p>

                        <p className="mt-0.5 truncate text-[13px] font-black text-black">
                            {announcementNotification.title}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-[#8A8A8A]">
                            Batafsil ko‘rish uchun bosing
                        </p>
                    </div>
                </button>

                {/* X — faqat notificationni yopadi */}
                <button
                    type="button"
                    onClick={() => {
                        setAnnouncementNotification(null);

                        window.clearTimeout(
                            announcementNotificationTimerRef.current
                        );
                    }}
                    className="
                    absolute
                    right-2
                    top-2
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-black/5
                    text-[#777]
                    transition
                    hover:bg-black/10
                "
                >
                    <i className="fa-solid fa-xmark text-[10px]" />
                </button>
            </div>
        ) : null;

    const messageNotificationView = messageNotification ? (
        <button
            type="button"
            onClick={() => {
                const basePath = isTeacher ? "/teacher/messages" : "/admin/messages";
                navigate(`${basePath}/${messageNotification.conversationId}`);
                setMessageNotification(null);
            }}
            className="fixed left-1/2 top-4 z-100 w-[calc(100%-24px)] max-w-95 -translate-x-1/2 rounded-2xl border border-black/6 bg-white p-3 text-left shadow-[0_16px_50px_rgba(0,0,0,0.16)]"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                    <i className="fa-solid fa-envelope text-[13px]" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-black text-black">
                        {messageNotification.senderName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#777]">
                        {messageNotification.preview}
                    </p>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-[#999]" />
            </div>
        </button>
    ) : null;

    // ========================================================
    // FULL SCREEN PAGES
    // ========================================================

    const isTeacherFullScreen =
        isTeacher &&
        (
            location.pathname === "/teacher/profile" ||
            location.pathname === "/teacher/settings"
        );

    const isAdminFullScreen =
        isAdmin &&
        location.pathname === "/admin/settings";

    // ========================================================
    // NAME
    // ========================================================

    const firstName =
        profile?.first_name?.trim() ||
        profile?.full_name
            ?.trim()
            ?.split(" ")[0] ||
        (
            isAdmin
                ? "Admin"
                : "O‘qituvchi"
        );

    const lastName =
        profile?.last_name?.trim() ||
        "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    const initials = useMemo(
        () =>
            getInitials(
                profile?.first_name,
                profile?.last_name
            ),
        [
            profile?.first_name,
            profile?.last_name,
        ]
    );

    // ========================================================
    // ROLE LABELS
    // ========================================================

    const roleLabel = isAdmin
        ? "Administrator"
        : isTeacher
            ? "O‘qituvchi"
            : "Foydalanuvchi";

    const panelLabel = isAdmin
        ? "Admin paneli"
        : "O‘qituvchi paneli";

    // ========================================================
    // ACTIVE PAGE
    // ========================================================

    function isActive(href) {
        if (href === "/admin") {
            return location.pathname === "/admin";
        }

        if (href === "/teacher") {
            return location.pathname === "/teacher";
        }

        return location.pathname.startsWith(href);
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    async function handleLogout() {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error(
                "Logout error:",
                error
            );
        } finally {
            localStorage.removeItem(
                "accessToken"
            );

            localStorage.removeItem(
                "userId"
            );

            localStorage.removeItem(
                "userEmail"
            );

            localStorage.removeItem(
                "email"
            );

            localStorage.removeItem(
                "userRole"
            );

            localStorage.removeItem(
                "role"
            );

            localStorage.removeItem(
                "profile"
            );

            navigate("/login", {
                replace: true,
            });
        }
    }

    // ========================================================
    // CANCEL ANNOUNCEMENT
    // ========================================================

    async function cancelAnnouncement() {
        if (!activeAnnouncement?.id || !user?.id) return;

        const canCancel =
            isAdmin ||
            activeAnnouncement.created_by === user.id;

        if (!canCancel) return;

        try {
            setAnnouncementLoading(true);

            const { error } = await supabase
                .from("announcements")
                .update({
                    is_active: false,
                    canceled_at: new Date().toISOString(),
                })
                .eq("id", activeAnnouncement.id);

            if (error) {
                throw error;
            }

            const remaining = visibleAnnouncements.filter(
                (announcement) => announcement.id !== activeAnnouncement.id
            );
            setVisibleAnnouncements(remaining);

            if (remaining.length) {
                const nextIndex = Math.min(announcementIndex, remaining.length - 1);
                setAnnouncementIndex(nextIndex);
                setActiveAnnouncement(remaining[nextIndex]);
            } else {
                setAnnouncementIndex(0);
                setActiveAnnouncement(null);
            }

            setShowAnnouncement(false);
        } catch (error) {
            console.error(
                "Cancel announcement error:",
                error
            );
        } finally {
            setAnnouncementLoading(false);
        }
    }

    // ========================================================
    // ANNOUNCEMENT UI
    // ========================================================

    const announcementView = activeAnnouncement ? (
        <button
            type="button"
            onClick={() => setShowAnnouncement(true)}
            className="
                group
                sticky
                top-17
                lg:top-0
                z-35
                mx-auto
                mt-4
                mb-4
                flex
                w-[calc(100%-24px)]
                max-w-175
                items-center
                gap-3
                overflow-hidden
                rounded-[20px]
                border
                border-orange-300/70
                bg-linear-to-r
                from-orange-500
                via-red-500
                to-rose-500
                p-px
                text-left
                shadow-[0_14px_45px_rgba(239,68,68,0.30)]
                transition-all
                duration-300
                hover:scale-[1.01]
                active:scale-[0.99]
            "
        >
            <div
                className="
                    flex
                    min-w-0
                    flex-1
                    items-center
                    gap-3
                    rounded-[19px]
                    bg-white
                    px-4
                    py-3
                "
            >
                <div
                    className="
                        relative
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-linear-to-br
                        from-orange-500
                        to-red-500
                        text-white
                        shadow-lg
                    "
                >
                    <i className="fa-solid fa-bullhorn text-[15px]" />

                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-red-500" />
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-orange-600">
                            Maktab e’loni
                        </p>

                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[8px] font-black text-red-600">
                            MUHIM
                        </span>
                    </div>

                    <p className="mt-0.5 truncate text-[13px] font-black text-black">
                        {activeAnnouncement.title}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] font-medium text-[#8A8A8A]">
                        Batafsil ko‘rish uchun bosing
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {visibleAnnouncements.length > 1 && (
                        <span className="rounded-full bg-orange-50 px-2 py-1 text-[9px] font-black text-orange-600">
                            {announcementIndex + 1}/{visibleAnnouncements.length}
                        </span>
                    )}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] text-[#777] transition group-hover:bg-orange-50 group-hover:text-orange-500">
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                    </div>
                </div>
            </div>
        </button>
    ) : null;

    const announcementModal =
        showAnnouncement && activeAnnouncement ? (
            <div className="fixed inset-0 z-200 bg-black/70 p-3 backdrop-blur-md sm:p-5">
                <div className="flex min-h-full items-center justify-center">
                    <div
                        className="
                            relative
                            w-full
                            max-w-170
                            max-h-[92vh]
                            overflow-hidden
                            rounded-[30px]
                            border
                            border-white/20
                            bg-white
                            shadow-[0_35px_120px_rgba(0,0,0,0.45)]
                            animate-[announcementIn_.35s_ease-out]
                        "
                    >
                        <div
                            className="
                                relative
                                flex
                                items-center
                                justify-between
                                overflow-hidden
                                border-b
                                border-black/6
                                bg-linear-to-r
                                from-orange-500
                                via-red-500
                                to-rose-500
                                px-5
                                py-4
                                text-white
                            "
                        >
                            <div className="absolute -right-10 -top-16 h-36 w-36 rounded-full bg-white/10" />
                            <div className="absolute -bottom-20 left-20 h-32 w-32 rounded-full bg-white/10" />
                            <div className="flex items-center gap-3">
                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-white/20
                                        text-white
                                        shadow-lg
                                        backdrop-blur-md
                                    "
                                >
                                    <i className="fa-solid fa-bullhorn text-[14px]" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-black text-white">
                                            Maktab e’loni
                                        </p>

                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-black backdrop-blur-md">
                                            MUHIM
                                        </span>
                                    </div>

                                    <p className="text-[10px] text-white/75">
                                        Faol e’lon
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowAnnouncement(false)}
                                className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-white/15
                                    text-white
                                    backdrop-blur-md
                                    transition
                                    hover:bg-white/25
                                "
                                aria-label="E’lonni yopish"
                            >
                                <i className="fa-solid fa-xmark text-[14px]" />
                            </button>
                        </div>

                        {visibleAnnouncements.length > 1 && (
                            <div className="flex items-center justify-center gap-2 border-b border-black/5 bg-white px-5 py-3">
                                <button type="button" onClick={() => {
                                    setAnnouncementIndex((current) => {
                                        const next = (current - 1 + visibleAnnouncements.length) % visibleAnnouncements.length;
                                        setActiveAnnouncement(visibleAnnouncements[next]);
                                        return next;
                                    });
                                }} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600" aria-label="Oldingi e’lon">
                                    <i className="fa-solid fa-chevron-left text-[10px]" />
                                </button>
                                <div className="flex items-center gap-1.5">
                                    {visibleAnnouncements.map((announcement, index) => (
                                        <button key={announcement.id} type="button" onClick={() => { setAnnouncementIndex(index); setActiveAnnouncement(announcement); }} className={`h-2 rounded-full transition-all ${index === announcementIndex ? "w-6 bg-orange-500" : "w-2 bg-slate-200"}`} aria-label={`${index + 1}-e’lon`} />
                                    ))}
                                </div>
                                <button type="button" onClick={() => {
                                    setAnnouncementIndex((current) => {
                                        const next = (current + 1) % visibleAnnouncements.length;
                                        setActiveAnnouncement(visibleAnnouncements[next]);
                                        return next;
                                    });
                                }} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600" aria-label="Keyingi e’lon">
                                    <i className="fa-solid fa-chevron-right text-[10px]" />
                                </button>
                            </div>
                        )}

                        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-5">
                            {activeAnnouncement.image_url && (
                                <img
                                    src={activeAnnouncement.image_url}
                                    alt=""
                                    className="
                                        mb-5
                                        max-h-80
                                        w-full
                                        rounded-2xl
                                        object-cover
                                    "
                                />
                            )}

                            <div className="rounded-2xl bg-orange-50 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-orange-600">
                                    E’lon mavzusi
                                </p>

                                <h2 className="mt-1 text-[24px] font-black tracking-tight text-black sm:text-[28px]">
                                    {activeAnnouncement.title}
                                </h2>
                            </div>

                            <div className="mt-5 rounded-2xl border border-black/5 bg-[#FAFAFA] p-5">
                                <p className="whitespace-pre-wrap text-[14px] leading-7 text-[#555]">
                                    {activeAnnouncement.content}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowAnnouncement(false)}
                                className="
                                    mt-6
                                    flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-2xl
                                    bg-linear-to-r
                                    from-orange-500
                                    to-red-500
                                    px-4
                                    py-3.5
                                    text-[13px]
                                    font-black
                                    text-white
                                    shadow-lg
                                    shadow-orange-500/20
                                    transition
                                    hover:brightness-105
                                    active:scale-[0.99]
                                "
                            >
                                <i className="fa-solid fa-check text-[12px]" />
                                Tushunarli
                            </button>

                            {(isAdmin ||
                                activeAnnouncement.created_by === user?.id) && (
                                    <button
                                        type="button"
                                        onClick={cancelAnnouncement}
                                        disabled={announcementLoading}
                                        className="
                                        mt-3
                                        flex
                                        w-full
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-2xl
                                        bg-[#FFF0F0]
                                        px-4
                                        py-3
                                        text-[12px]
                                        font-black
                                        text-[#EF4444]
                                        disabled:opacity-50
                                    "
                                    >
                                        <i className="fa-solid fa-ban text-[12px]" />
                                        {announcementLoading
                                            ? "Bekor qilinmoqda..."
                                            : "E’lonni bekor qilish"}
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        ) : null;

    // ========================================================
    // ANNOUNCEMENT ANIMATION
    // ========================================================

    const announcementAnimationStyle = (
        <style>{`
            @keyframes slideDown {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -14px);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }

            @keyframes announcementIn {
                0% {
                    opacity: 0;
                    transform: scale(0.92) translateY(24px);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
        `}</style>
    );

    // ========================================================
    // SETTINGS
    // ========================================================

    function handleSettings() {
        if (isAdmin) {
            navigate("/admin/settings");
        }
    }

    // ========================================================
    // MESSAGES
    // ========================================================

    function handleMessages() {
        if (isAdmin) {
            navigate("/admin/messages");
        }

        if (isTeacher) {
            navigate("/teacher/messages");
        }
    }

    // ========================================================
    // FULL SCREEN
    // ========================================================

    if (isMessageDetail) {
        return (
            <>
                {announcementNotificationView}
                {messageNotificationView}
                {announcementModal}
                {announcementAnimationStyle}
                <main className="h-dvh min-h-0 overflow-hidden bg-[#F7F7F7]">
                    {announcementView}
                    <Outlet />
                </main>
            </>
        );
    }

    if (isTeacherFullScreen || isAdminFullScreen) {
        return (
            <>
                {announcementNotificationView}
                {messageNotificationView}
                {announcementModal}
                {announcementAnimationStyle}
                <main className="min-h-dvh overflow-x-hidden overflow-y-auto bg-[#F7F7F7]">
                    {announcementView}
                    <Outlet />
                </main>
            </>
        );
    }

    // ========================================================
    // LOADING
    // ========================================================

    if (loading && !profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
                <div className="flex flex-col items-center">
                    <div
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-2xl
                            bg-black
                            text-white
                        "
                    >
                        <i className="fa-solid fa-school text-[16px]" />
                    </div>

                    <p
                        className="
                            mt-3
                            text-[11px]
                            font-bold
                            text-[#8A8A8A]
                        "
                    >
                        Yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    // ========================================================
    // UNKNOWN ROLE
    // ========================================================

    if (!isAdmin && !isTeacher) {
        return (
            <main className="flex min-h-screen flex-col">
                <Outlet />
            </main>
        );
    }

    // ========================================================
    // MAIN LAYOUT
    // ========================================================

    return (
        <div
            className="
                min-h-screen
                bg-[#F7F7F7]
                text-black
            "
        >
            {announcementNotificationView}
            {messageNotificationView}
            {announcementModal}
            {announcementAnimationStyle}
            <div className="flex min-h-screen">

                {/* ==================================================
                    DESKTOP SIDEBAR
                ================================================== */}

                <aside
                    className="
                        fixed
                        left-0
                        top-0
                        z-40
                        hidden
                        h-screen
                        w-62
                        flex-col
                        border-r
                        border-black/6
                        bg-white
                        px-4
                        py-5
                        lg:flex
                    "
                >

                    {/* ==================================================
                        LOGO
                    ================================================== */}

                    <div className="px-2">

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    isAdmin
                                        ? "/admin"
                                        : "/teacher"
                                )
                            }
                            className="
                                flex
                                w-full
                                items-center
                                gap-3
                                text-left
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-black
                                    text-white
                                "
                            >
                                <i className="fa-solid fa-school text-[17px]" />
                            </div>

                            <div className="min-w-0">

                                <p
                                    className="
                                        truncate
                                        text-[14px]
                                        font-black
                                        tracking-[-0.2px]
                                    "
                                >
                                    Maktab
                                </p>

                                <p
                                    className="
                                        truncate
                                        text-[10px]
                                        font-medium
                                        text-[#8A8A8A]
                                    "
                                >
                                    {panelLabel}
                                </p>

                            </div>
                        </button>

                    </div>

                    {/* ==================================================
                        PROFILE
                    ================================================== */}

                    <div
                        className="
                            mt-6
                            rounded-[20px]
                            border
                            border-black/6
                            bg-[#F7F7F7]
                            p-3
                        "
                    >
                        <div className="flex items-center gap-3">

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    shrink-0
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-[14px]
                                    bg-black
                                    text-[11px]
                                    font-black
                                    text-white
                                "
                            >
                                {profile?.avatar_url ? (
                                    <img
                                        src={
                                            profile.avatar_url
                                        }
                                        alt=""
                                        className="
                                            h-full
                                            w-full
                                            object-cover
                                        "
                                    />
                                ) : (
                                    initials
                                )}
                            </div>

                            <div className="min-w-0">

                                <p
                                    className="
                                        truncate
                                        text-[12px]
                                        font-black
                                        text-black
                                    "
                                >
                                    {loading
                                        ? "Yuklanmoqda..."
                                        : fullName}
                                </p>

                                <p
                                    className="
                                        truncate
                                        text-[9px]
                                        font-medium
                                        text-[#8A8A8A]
                                    "
                                >
                                    {roleLabel}
                                </p>

                            </div>

                        </div>
                    </div>

                    {/* ==================================================
                        NAVIGATION TITLE
                    ================================================== */}

                    <div className="mt-7 px-2">

                        <p
                            className="
                                text-[9px]
                                font-black
                                uppercase
                                tracking-[0.12em]
                                text-[#A3A3A3]
                            "
                        >
                            Asosiy menyu
                        </p>

                    </div>

                    {/* ==================================================
                        NAVIGATION
                    ================================================== */}

                    <nav className="mt-2 flex flex-col gap-1">

                        {navigation.map((item) => {
                            const active =
                                isActive(item.href);

                            return (
                                <NavLink
                                    key={item.href}
                                    to={item.href}
                                    className={`
                                        group
                                        flex
                                        items-center
                                        gap-3
                                        rounded-2xl
                                        px-3
                                        py-3
                                        transition-all
                                        ${active
                                            ? "bg-black text-white"
                                            : "text-[#737373] hover:bg-[#F7F7F7] hover:text-black"
                                        }
                                    `}
                                >

                                    <div
                                        className={`
                                            flex
                                            h-8
                                            w-8
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            transition
                                            ${active
                                                ? "bg-white/10"
                                                : "bg-transparent"
                                            }
                                        `}
                                    >
                                        <i
                                            className={`
                                                ${item.icon}
                                                text-[13px]
                                                ${active
                                                    ? "text-white"
                                                    : "text-[#737373] group-hover:text-black"
                                                }
                                            `}
                                        />
                                    </div>

                                    <span
                                        className="
                                            text-[11px]
                                            font-bold
                                        "
                                    >
                                        {item.title}
                                    </span>

                                    {active && (
                                        <i
                                            className="
                                                fa-solid
                                                fa-chevron-right
                                                ml-auto
                                                text-[8px]
                                                text-white/50
                                            "
                                        />
                                    )}

                                </NavLink>
                            );
                        })}

                    </nav>

                    {/* ==================================================
                        LOGOUT
                    ================================================== */}

                    <div className="mt-auto">

                        <div
                            className="
                                mb-3
                                h-px
                                bg-black/6
                            "
                        />

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="
                                group
                                flex
                                w-full
                                items-center
                                gap-3
                                rounded-2xl
                                px-3
                                py-3
                                text-[#737373]
                                transition
                                hover:bg-[#FFF0F0]
                                hover:text-[#EF4444]
                            "
                        >

                            <div
                                className="
                                    flex
                                    h-8
                                    w-8
                                    items-center
                                    justify-center
                                    rounded-xl
                                "
                            >
                                <i className="fa-solid fa-right-from-bracket text-[13px]" />
                            </div>

                            <span
                                className="
                                    text-[11px]
                                    font-bold
                                "
                            >
                                Chiqish
                            </span>

                        </button>

                    </div>

                </aside>

                {/* ==================================================
                    MAIN CONTENT
                ================================================== */}

                <main
                    className="
                        min-h-screen
                        min-w-0
                        flex-1
                        lg:ml-62
                    "
                >

                    {/* ==================================================
                        MOBILE HEADER
                    ================================================== */}

                    <header
                        className="
                            sticky
                            top-0
                            z-30
                            border-b
                            border-black/6
                            bg-white/90
                            px-4
                            py-3
                            backdrop-blur-xl
                            lg:hidden
                        "
                    >

                        <div className="flex items-center justify-between">

                            {/* USER */}

                            <div
                                className="
                                    flex
                                    min-w-0
                                    items-center
                                    gap-3
                                "
                            >

                                <div
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        overflow-hidden
                                        rounded-[14px]
                                        bg-black
                                        text-[10px]
                                        font-black
                                        text-white
                                    "
                                >
                                    {profile?.avatar_url ? (
                                        <img
                                            src={
                                                profile.avatar_url
                                            }
                                            alt=""
                                            className="
                                                h-full
                                                w-full
                                                object-cover
                                            "
                                        />
                                    ) : (
                                        initials
                                    )}
                                </div>

                                <div className="min-w-0">

                                    <p
                                        className="
                                            truncate
                                            text-[12px]
                                            font-black
                                            text-black
                                        "
                                    >
                                        Assalomu alaykum,{" "}
                                        {firstName}
                                    </p>

                                    <p
                                        className="
                                            mt-0.5
                                            text-[9px]
                                            font-medium
                                            text-[#8A8A8A]
                                        "
                                    >
                                        {panelLabel}
                                    </p>

                                </div>

                            </div>

                            {/* ==================================================
                                HEADER ACTIONS
                            ================================================== */}

                            <div className="flex items-center gap-2">

                                {/* BILDIRISHNOMA
                                    ADMIN + TEACHER
                                */}

                                <button
                                    type="button"
                                    className="
                                        relative
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-[14px]
                                        border
                                        border-black/6
                                        bg-white
                                    "
                                >
                                    <i className="fa-regular fa-bell text-[15px]" />

                                    <span
                                        className="
                                            absolute
                                            right-2
                                            top-1.75
                                            h-1.5
                                            w-1.5
                                            rounded-full
                                            bg-[#EF4444]
                                            ring-2
                                            ring-white
                                        "
                                    />
                                </button>

                                {/* ==================================================
                                    ADMIN ONLY:
                                    SETTINGS
                                ================================================== */}

                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={
                                            handleSettings
                                        }
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-[14px]
                                            border
                                            border-black/6
                                            bg-white
                                        "
                                    >
                                        <i className="fa-solid fa-gear text-[14px]" />
                                    </button>
                                )}

                                {/* ==================================================
                                    ADMIN ONLY:
                                    MESSAGES
                                ================================================== */}

                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={handleMessages}
                                        className="
            relative
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-[14px]
            border
            border-black/6
            bg-white
        "
                                    >
                                        <i className="fa-solid fa-envelope text-[14px]" />

                                        {unreadMessageCount > 0 && (
                                            <span className="absolute -right-1 -top-1 flex min-h-4.25 min-w-4.25 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
                                                {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                                            </span>
                                        )}
                                    </button>
                                )}

                            </div>

                        </div>

                    </header>

                    {announcementView}

                    {/* ==================================================
                        CONTENT
                    ================================================== */}

                    <div
                        className="
                            mx-auto
                            w-full
                            max-w-300
                            px-4
                            py-5
                            pb-25
                            sm:px-5
                            sm:py-6
                            lg:px-8
                            lg:py-8
                            lg:pb-8
                        "
                    >
                        <Outlet />
                    </div>

                </main>

                {/* ==================================================
                    MOBILE BOTTOM NAVIGATION
                ================================================== */}

                <nav
                    className="
                        fixed
                        bottom-0
                        left-0
                        right-0
                        z-50
                        border-t
                        border-black/6
                        bg-white/95
                        px-2
                        py-2
                        backdrop-blur-xl
                        lg:hidden
                    "
                >

                    <div
                        className="
                            mx-auto
                            flex
                            max-w-md
                            items-center
                            justify-around
                        "
                    >

                        {/* ==================================================
                            ADMIN MOBILE NAV
                        ================================================== */}

                        {isAdmin &&
                            adminNavigation
                                .slice(0, 5)
                                .map((item) => {
                                    const active =
                                        isActive(
                                            item.href
                                        );

                                    return (
                                        <NavLink
                                            key={
                                                item.href
                                            }
                                            to={
                                                item.href
                                            }
                                            className="
                                                flex
                                                min-w-15
                                                flex-col
                                                items-center
                                                justify-center
                                                gap-1
                                                rounded-2xl
                                                px-1
                                                py-1.5
                                            "
                                        >

                                            <div
                                                className={`
                                                    flex
                                                    h-8
                                                    w-8
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    ${active
                                                        ? "bg-black text-white"
                                                        : "text-[#8A8A8A]"
                                                    }
                                                `}
                                            >
                                                <i
                                                    className={`
                                                        ${item.icon}
                                                        text-[13px]
                                                    `}
                                                />
                                            </div>

                                            <span
                                                className={`
                                                    max-w-15
                                                    truncate
                                                    text-[8px]
                                                    font-bold
                                                    ${active
                                                        ? "text-black"
                                                        : "text-[#8A8A8A]"
                                                    }
                                                `}
                                            >
                                                {
                                                    item.title
                                                }
                                            </span>

                                        </NavLink>
                                    );
                                })}

                        {/* ==================================================
                            TEACHER MOBILE NAV
                        ================================================== */}

                        {isTeacher &&
                            teacherNavigation
                                .slice(0, 4)
                                .map((item) => {
                                    const active =
                                        isActive(
                                            item.href
                                        );

                                    return (
                                        <NavLink
                                            key={
                                                item.href
                                            }
                                            to={
                                                item.href
                                            }
                                            className="
                                                flex
                                                min-w-17
                                                flex-col
                                                items-center
                                                justify-center
                                                gap-1
                                                rounded-2xl
                                                px-2
                                                py-1.5
                                            "
                                        >

                                            <div
                                                className={`
                                                    flex
                                                    h-8
                                                    w-8
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    ${active
                                                        ? "bg-black text-white"
                                                        : "text-[#8A8A8A]"
                                                    }
                                                `}
                                            >
                                                <i
                                                    className={`
                                                        ${item.icon}
                                                        text-[13px]
                                                    `}
                                                />
                                            </div>

                                            <span
                                                className={`
                                                    text-[8px]
                                                    font-bold
                                                    ${active
                                                        ? "text-black"
                                                        : "text-[#8A8A8A]"
                                                    }
                                                `}
                                            >
                                                {
                                                    item.title
                                                }
                                            </span>

                                        </NavLink>
                                    );
                                })}

                        {/* ==================================================
                            TEACHER PROFILE
                        ================================================== */}

                        {isTeacher && (
                            <NavLink
                                to="/teacher/profile"
                                className="
                                    flex
                                    min-w-17
                                    flex-col
                                    items-center
                                    justify-center
                                    gap-1
                                    rounded-2xl
                                    px-2
                                    py-1.5
                                "
                            >

                                <div
                                    className={`
                                        flex
                                        h-8
                                        w-8
                                        items-center
                                        justify-center
                                        overflow-hidden
                                        rounded-xl
                                        text-[9px]
                                        font-black
                                        ${isActive(
                                        "/teacher/profile"
                                    )
                                            ? "bg-black text-white"
                                            : "bg-[#F2F2F2] text-black"
                                        }
                                    `}
                                >
                                    {profile?.avatar_url ? (
                                        <img
                                            src={
                                                profile.avatar_url
                                            }
                                            alt=""
                                            className="
                                                h-full
                                                w-full
                                                object-cover
                                            "
                                        />
                                    ) : (
                                        initials
                                    )}
                                </div>

                                <span
                                    className={`
                                        text-[8px]
                                        font-bold
                                        ${isActive(
                                        "/teacher/profile"
                                    )
                                            ? "text-black"
                                            : "text-[#8A8A8A]"
                                        }
                                    `}
                                >
                                    Profil
                                </span>

                            </NavLink>
                        )}

                    </div>

                </nav>

            </div>
        </div>
    );
}