import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import * as Tone from "tone";
import { supabase } from "../../lib/supabase";
import ParentHeader from "./ParentHeader";
import ParentBottomNav from "./ParentBottomNav";

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

export default function ParentLayout() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // ============================================================
    // ACTIVE ANNOUNCEMENT
    // ============================================================

    const [activeAnnouncement, setActiveAnnouncement] = useState(null);
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [announcementLoading, setAnnouncementLoading] = useState(false);
    const [visibleAnnouncements, setVisibleAnnouncements] = useState([]);
    const [announcementIndex, setAnnouncementIndex] = useState(0);
    const [announcementNotification, setAnnouncementNotification] =
        useState(null);

    const announcementAutoOpenedRef = useRef(false);
    const announcementIdsRef = useRef(new Set());
    const announcementNotificationTimerRef = useRef(null);

    // ============================================================
    // LOAD CURRENT USER
    // ============================================================

    useEffect(() => {
        let mounted = true;

        async function initialize() {
            try {
                setLoading(true);

                const {
                    data: { user: authUser },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) throw userError;

                if (!mounted) return;

                if (!authUser) {
                    setUser(null);
                    setProfile(null);
                    return;
                }

                setUser(authUser);

                const { data: profileData, error: profileError } =
                    await supabase
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

                if (profileError) throw profileError;

                if (!mounted) return;

                setProfile(profileData || null);
            } catch (error) {
                console.error("ParentLayout profile error:", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        initialize();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;

            if (!session?.user) {
                setUser(null);
                setProfile(null);
                setLoading(false);
                return;
            }

            setUser(session.user);
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    // ============================================================
    // RESET ANNOUNCEMENTS WHEN USER CHANGES
    // ============================================================

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

    // ============================================================
    // LOAD ACTIVE ANNOUNCEMENTS
    // ============================================================

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
                        created_at
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
                    if (announcement.target_type === "school") {
                        return true;
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

                const creatorIds = [
                    ...new Set(
                        filtered
                            .map((item) => item.created_by)
                            .filter(Boolean)
                    ),
                ];

                let creatorRoles = {};

                if (creatorIds.length) {
                    const { data: creators } = await supabase
                        .from("profiles")
                        .select("id, role")
                        .in("id", creatorIds);

                    creatorRoles = Object.fromEntries(
                        (creators || []).map((creator) => [
                            creator.id,
                            creator.role,
                        ])
                    );
                }

                const roleOrder = {
                    teacher: 0,
                    admin: 1,
                };

                const sorted = [...filtered]
                    .map((announcement) => ({
                        ...announcement,
                        creator_role:
                            creatorRoles[announcement.created_by] || "",
                    }))
                    .sort((a, b) => {
                        const roleDiff =
                            (roleOrder[a.creator_role] ?? 2) -
                            (roleOrder[b.creator_role] ?? 2);

                        if (roleDiff !== 0) return roleDiff;

                        return (
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                        );
                    });

                if (!mounted) return;

                announcementIdsRef.current = new Set(
                    sorted.map((announcement) => announcement.id)
                );

                setVisibleAnnouncements(sorted);
                setAnnouncementIndex(0);
                setActiveAnnouncement(sorted[0] || null);

                if (
                    sorted[0] &&
                    !announcementAutoOpenedRef.current
                ) {
                    announcementAutoOpenedRef.current = true;
                    setShowAnnouncement(true);
                }
            } catch (error) {
                console.error("Announcement load error:", error);
            } finally {
                if (mounted) {
                    setAnnouncementLoading(false);
                }
            }
        };

        loadActiveAnnouncements();

        return () => {
            mounted = false;
        };
    }, [
        user?.id,
        profile?.school_id,
        profile?.role,
        profile?.student_id,
    ]);

    // ============================================================
    // AUTO CHANGE BETWEEN ACTIVE ANNOUNCEMENTS
    // ============================================================

    useEffect(() => {
        if (visibleAnnouncements.length <= 1) return;

        const interval = window.setInterval(() => {
            setAnnouncementIndex((current) => {
                const next =
                    (current + 1) % visibleAnnouncements.length;

                setActiveAnnouncement(
                    visibleAnnouncements[next]
                );

                return next;
            });
        }, 5000);

        return () => window.clearInterval(interval);
    }, [visibleAnnouncements]);

    // ============================================================
    // ANNOUNCEMENT REALTIME
    // ============================================================

    useEffect(() => {
        if (!user?.id || !profile?.school_id) return;

        const channel = supabase
            .channel(`parent-announcements-${user.id}`)
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
                            created_at
                        `)
                        .eq("school_id", profile.school_id)
                        .eq("is_active", true)
                        .eq("is_published", true)
                        .order("created_at", { ascending: true });

                    if (error) {
                        console.error(
                            "Announcement realtime load error:",
                            error
                        );
                        return;
                    }

                    let studentClassId = null;

                    if (
                        profile.role === "parent" &&
                        profile.student_id
                    ) {
                        const { data: student } = await supabase
                            .from("students")
                            .select("class_id")
                            .eq("id", profile.student_id)
                            .maybeSingle();

                        studentClassId = student?.class_id || null;
                    }

                    const filtered = (data || []).filter(
                        (announcement) => {
                            if (
                                announcement.target_type === "school"
                            ) {
                                return true;
                            }

                            if (
                                announcement.target_type === "parents"
                            ) {
                                return profile.role === "parent";
                            }

                            if (
                                announcement.target_type ===
                                "class_parents"
                            ) {
                                return (
                                    profile.role === "parent" &&
                                    !!studentClassId &&
                                    announcement.class_id ===
                                    studentClassId
                                );
                            }

                            return false;
                        }
                    );

                    const creatorIds = [
                        ...new Set(
                            filtered
                                .map((item) => item.created_by)
                                .filter(Boolean)
                        ),
                    ];

                    let creatorRoles = {};

                    if (creatorIds.length) {
                        const { data: creators } = await supabase
                            .from("profiles")
                            .select("id, role")
                            .in("id", creatorIds);

                        creatorRoles = Object.fromEntries(
                            (creators || []).map((creator) => [
                                creator.id,
                                creator.role,
                            ])
                        );
                    }

                    const roleOrder = {
                        teacher: 0,
                        admin: 1,
                    };

                    const sorted = [...filtered]
                        .map((announcement) => ({
                            ...announcement,
                            creator_role:
                                creatorRoles[
                                announcement.created_by
                                ] || "",
                        }))
                        .sort((a, b) => {
                            const roleDiff =
                                (roleOrder[a.creator_role] ?? 2) -
                                (roleOrder[b.creator_role] ?? 2);

                            if (roleDiff !== 0) return roleDiff;

                            return (
                                new Date(a.created_at).getTime() -
                                new Date(b.created_at).getTime()
                            );
                        });

                    const previousIds =
                        announcementIdsRef.current;

                    const newAnnouncement = sorted.find(
                        (announcement) =>
                            !previousIds.has(announcement.id)
                    );

                    sorted.forEach((announcement) => {
                        previousIds.add(announcement.id);
                    });

                    if (
                        newAnnouncement &&
                        newAnnouncement.created_by !== user.id
                    ) {
                        setAnnouncementNotification(
                            newAnnouncement
                        );

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
                        const next =
                            current >= sorted.length ? 0 : current;

                        setActiveAnnouncement(sorted[next]);

                        return next;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [
        user?.id,
        profile?.school_id,
        profile?.role,
        profile?.student_id,
    ]);

    // ============================================================
    // LOCK BACKGROUND SCROLL WHEN ANNOUNCEMENT MODAL IS OPEN
    // ============================================================

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
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
            document.body.style.overflow = "";
        };
    }, [showAnnouncement]);

    // ============================================================
    // ANNOUNCEMENT NOTIFICATION
    // ============================================================

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

    // ============================================================
    // ACTIVE ANNOUNCEMENT BANNER
    // ============================================================

    const announcementView = activeAnnouncement ? (
        <button
            type="button"
            onClick={() => setShowAnnouncement(true)}
            className="
                group
                sticky
                top-16
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
                            {announcementIndex + 1}/
                            {visibleAnnouncements.length}
                        </span>
                    )}

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] text-[#777] transition group-hover:bg-orange-50 group-hover:text-orange-500">
                        <i className="fa-solid fa-chevron-right text-[10px]" />
                    </div>
                </div>
            </div>
        </button>
    ) : null;

    // ============================================================
    // ANNOUNCEMENT MODAL
    // ============================================================

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
                                onClick={() =>
                                    setShowAnnouncement(false)
                                }
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
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAnnouncementIndex(
                                            (current) => {
                                                const next =
                                                    (current -
                                                        1 +
                                                        visibleAnnouncements.length) %
                                                    visibleAnnouncements.length;

                                                setActiveAnnouncement(
                                                    visibleAnnouncements[
                                                    next
                                                    ]
                                                );

                                                return next;
                                            }
                                        );
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                                    aria-label="Oldingi e’lon"
                                >
                                    <i className="fa-solid fa-chevron-left text-[10px]" />
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {visibleAnnouncements.map(
                                        (announcement, index) => (
                                            <button
                                                key={announcement.id}
                                                type="button"
                                                onClick={() => {
                                                    setAnnouncementIndex(
                                                        index
                                                    );
                                                    setActiveAnnouncement(
                                                        announcement
                                                    );
                                                }}
                                                className={`h-2 rounded-full transition-all ${index ===
                                                    announcementIndex
                                                    ? "w-6 bg-orange-500"
                                                    : "w-2 bg-slate-200"
                                                    }`}
                                                aria-label={`${index + 1}-e’lon`}
                                            />
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAnnouncementIndex(
                                            (current) => {
                                                const next =
                                                    (current + 1) %
                                                    visibleAnnouncements.length;

                                                setActiveAnnouncement(
                                                    visibleAnnouncements[
                                                    next
                                                    ]
                                                );

                                                return next;
                                            }
                                        );
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                                    aria-label="Keyingi e’lon"
                                >
                                    <i className="fa-solid fa-chevron-right text-[10px]" />
                                </button>
                            </div>
                        )}

                        <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-5">
                            {activeAnnouncement.image_url && (
                                <img
                                    src={activeAnnouncement.image_url}
                                    alt=""
                                    className="mb-5 max-h-80 w-full rounded-2xl object-cover"
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
                                onClick={() =>
                                    setShowAnnouncement(false)
                                }
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
                        </div>
                    </div>
                </div>
            </div>
        ) : null;

    // ============================================================
    // ANNOUNCEMENT ANIMATION
    // ============================================================

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

    if (loading && !profile) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
                <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                        <i className="fa-solid fa-school text-[16px]" />
                    </div>

                    <p className="mt-3 text-[11px] font-bold text-[#8A8A8A]">
                        Yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {announcementNotificationView}
            {announcementModal}
            {announcementAnimationStyle}

            <ParentHeader />

            {announcementView}

            <main className="min-h-[calc(100vh-4rem)] pb-20 md:pb-0">
                <Outlet />
            </main>

            <ParentBottomNav />
        </div>
    );
}
