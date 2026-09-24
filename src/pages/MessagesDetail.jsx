import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Check,
    CheckCheck,
    Clock3,
    Copy,
    Reply,
    Forward,
    Pin,
    PinOff,
    CheckSquare,
    Square,
    Search,
    UserRound,
    ImagePlus,
    Loader2,
    Pencil,
    Send,
    Trash2,
    X,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// Ikki xabar orasidagi tanaffus shu qiymatdan kam bo‘lsa,
// ular bitta guruh sifatida zich joylashadi.
const GROUP_GAP_MS = 5 * 60 * 1000;

// Xabar serverga muvaffaqiyatli yozilib, 1 ta ✓ holatiga o‘tganda qisqa ovoz.
function playMessageSentSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        const now = context.currentTime;

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
        gain.connect(context.destination);

        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(980, now);
        oscillator.frequency.exponentialRampToValueAtTime(1280, now + 0.055);
        oscillator.connect(gain);
        oscillator.start(now);
        oscillator.stop(now + 0.09);

        oscillator.onended = () => context.close();
    } catch {
        // Brauzer ovozni bloklasa, xabar yuborilishi davom etadi.
    }
}

function toDayKey(value) {
    const date = new Date(value);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDayLabel(value) {
    const date = new Date(value);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (toDayKey(date) === toDayKey(today)) return "Bugun";
    if (toDayKey(date) === toDayKey(yesterday)) return "Kecha";

    return date.toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "long",
    });
}

function MessageSkeleton({ mine }) {
    return (
        <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
                className={`h-12 animate-pulse rounded-2xl bg-slate-200/70 ${mine ? "w-40" : "w-56"
                    }`}
            />
        </div>
    );
}

export default function MessageDetail() {
    const { id: conversationId } = useParams();
    const navigate = useNavigate();

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const longPressTimer = useRef(null);
    // Birinchi yuklanishda silliq emas, darrov pastga tushamiz
    const firstScrollDone = useRef(false);

    const [currentUser, setCurrentUser] = useState(null);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [profile, setProfile] = useState(null);
    const [messages, setMessages] = useState([]);
    const [otherUserOnline, setOtherUserOnline] = useState(false);

    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [imageDraft, setImageDraft] = useState(null);

    const [selectedMessage, setSelectedMessage] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState([]);
    const [forwardMessage, setForwardMessage] = useState(null);
    const [forwardContacts, setForwardContacts] = useState([]);
    const [forwardSearch, setForwardSearch] = useState("");
    const [forwardLoading, setForwardLoading] = useState(false);

    const [deleteModal, setDeleteModal] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Rasmni to‘liq ekranda ko‘rish
    const [previewImage, setPreviewImage] = useState(null);
    // Nusxa olindi degan qisqa xabar
    const [toast, setToast] = useState("");
    // Rasm hajmi/turi xatosi — alert() o‘rniga
    const [uploadError, setUploadError] = useState("");

    // -----------------------------
    // CURRENT USER
    // -----------------------------
    const getCurrentUser = useCallback(async () => {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            console.error("Current user error:", error);
            return null;
        }

        setCurrentUser(user);

        const { data: myProfile, error: myProfileError } = await supabase
            .from("profiles")
            .select("id, school_id, role, first_name, last_name, full_name, email, subject, avatar_url, student_id")
            .eq("id", user.id)
            .maybeSingle();

        if (!myProfileError && myProfile) {
            setCurrentProfile(myProfile);
        }

        return user;
    }, []);

    // -----------------------------
    // LOAD CHAT USER
    // -----------------------------
    const loadChatProfile = useCallback(async () => {
        if (!conversationId || !currentUser?.id) return;

        const { data: conversation, error: conversationError } = await supabase
            .from("conversations")
            .select("id, title, created_by")
            .eq("id", conversationId)
            .single();

        if (conversationError) {
            console.error("Conversation error:", conversationError);
            return;
        }

        if (conversation.created_by && conversation.created_by !== currentUser.id) {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, role, avatar_url")
                .eq("id", conversation.created_by)
                .single();

            if (!error && data) {
                setProfile(data);
                return;
            }
        }

        const { data: chatMessages, error: messageError } = await supabase
            .from("messages")
            .select("sender_id")
            .eq("conversation_id", conversationId)
            .neq("sender_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(1);

        if (!messageError && chatMessages?.[0]?.sender_id) {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, first_name, last_name, role, avatar_url")
                .eq("id", chatMessages[0].sender_id)
                .single();

            if (!error && data) {
                setProfile(data);
                return;
            }
        }

        const fallbackName =
            conversation.title?.replace(/^Chat:\s*/i, "").trim() ||
            "Suhbat";

        setProfile({
            id: null,
            first_name: fallbackName,
            last_name: "",
            role: "student",
            avatar_url: null,
        });
    }, [conversationId, currentUser?.id]);

    // -----------------------------
    // LOAD MESSAGES
    // -----------------------------
    const loadMessages = useCallback(async () => {
        if (!conversationId) return;

        setLoading(true);

        const { data, error } = await supabase
            .from("messages")
            .select(
                `
        id,
        conversation_id,
        sender_id,
        message_type,
        content,
        attachment_url,
        is_read,
        reply_to_message_id,
        is_pinned,
        created_at
      `
            )
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Messages error:", error);
            setLoading(false);
            return;
        }

        setMessages(data || []);
        setLoading(false);
    }, [conversationId]);

    // Chat ochilganda bizga kelgan barcha o‘qilmagan
    // xabarlarni avtomatik o‘qilgan deb belgilaymiz.
    const markMessagesAsRead = useCallback(async () => {
        if (!conversationId || !currentUser?.id) return;

        // Bir odam bilan eski/duplikat 1:1 chatlar bo‘lishi mumkin.
        // Odamning chatini ochganda shu odamga tegishli barcha unread
        // xabarlarni o‘qilgan deb belgilaymiz.
        const { data: myRows, error: myRowsError } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", currentUser.id);

        if (myRowsError) {
            console.error("My conversations error:", myRowsError);
            return;
        }

        const myConversationIds = [
            ...new Set(
                (myRows || [])
                    .map((row) => row.conversation_id)
                    .filter(Boolean)
            ),
        ];

        if (myConversationIds.length === 0) return;

        // Ochilgan conversationdagi boshqa participant(lar).
        const { data: currentParticipants, error: currentParticipantsError } =
            await supabase
                .from("conversation_participants")
                .select("user_id")
                .eq("conversation_id", conversationId)
                .neq("user_id", currentUser.id);

        if (currentParticipantsError) {
            console.error(
                "Current conversation participants error:",
                currentParticipantsError
            );
            return;
        }

        const otherUserIds = [
            ...new Set(
                (currentParticipants || [])
                    .map((row) => row.user_id)
                    .filter(Boolean)
            ),
        ];

        let targetConversationIds = [conversationId];

        // Faqat 1:1 chatda contactning eski conversationlarini ham qo‘shamiz.
        if (otherUserIds.length === 1) {
            const otherUserId = otherUserIds[0];

            const { data: contactRows, error: contactRowsError } =
                await supabase
                    .from("conversation_participants")
                    .select("conversation_id")
                    .eq("user_id", otherUserId)
                    .in("conversation_id", myConversationIds);

            if (contactRowsError) {
                console.error("Contact conversations error:", contactRowsError);
                return;
            }

            targetConversationIds = [
                ...new Set(
                    (contactRows || [])
                        .map((row) => row.conversation_id)
                        .filter(Boolean)
                ),
            ];

            if (!targetConversationIds.includes(conversationId)) {
                targetConversationIds.push(conversationId);
            }
        }

        const { data: updatedMessages, error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .in("conversation_id", targetConversationIds)
            .neq("sender_id", currentUser.id)
            .eq("is_read", false)
            .select("id, conversation_id");

        if (error) {
            console.error("Mark as read error:", error);
            return;
        }

        const updatedIds = new Set(
            (updatedMessages || []).map((message) => message.id)
        );

        if (updatedIds.size > 0) {
            setMessages((previous) =>
                previous.map((message) =>
                    updatedIds.has(message.id)
                        ? { ...message, is_read: true }
                        : message
                )
            );
        }
    }, [conversationId, currentUser?.id]);

    // -----------------------------
    // INITIAL LOAD
    // -----------------------------
    useEffect(() => {
        getCurrentUser();
    }, [getCurrentUser]);

    useEffect(() => {
        if (!currentUser?.id) return;

        const loadChat = async () => {
            await loadChatProfile();
            await loadMessages();
            await markMessagesAsRead();
        };

        loadChat();
    }, [
        currentUser?.id,
        loadChatProfile,
        loadMessages,
        markMessagesAsRead,
    ]);

    // -----------------------------
    // REALTIME MESSAGES + ONLINE
    // -----------------------------
    useEffect(() => {
        if (!conversationId || !currentUser?.id) return;

        const channel = supabase
            .channel(`chat-${conversationId}`, {
                config: {
                    presence: {
                        key: currentUser.id,
                    },
                },
            })
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    if (payload.eventType === "INSERT") {
                        setMessages((previous) => {
                            const exists = previous.some(
                                (message) => message.id === payload.new.id
                            );

                            if (exists) {
                                return previous;
                            }

                            return [...previous, payload.new];
                        });

                        // Chat ochiq turgan paytda yangi kelgan xabarni
                        // darhol o‘qilgan deb belgilaymiz.
                        if (
                            payload.new.sender_id &&
                            payload.new.sender_id !== currentUser.id &&
                            !payload.new.is_read
                        ) {
                            await markMessagesAsRead();
                        }
                    }

                    if (payload.eventType === "UPDATE") {
                        setMessages((previous) =>
                            previous.map((message) =>
                                message.id === payload.new.id
                                    ? payload.new
                                    : message
                            )
                        );
                    }

                    if (payload.eventType === "DELETE") {
                        setMessages((previous) =>
                            previous.filter(
                                (message) => message.id !== payload.old.id
                            )
                        );
                    }
                }
            )
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();

                const otherOnline = Object.keys(state).some(
                    (userId) => userId !== currentUser.id
                );

                setOtherUserOnline(otherOnline);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        user_id: currentUser.id,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            setOtherUserOnline(false);
            supabase.removeChannel(channel);
        };
    }, [conversationId, currentUser?.id, markMessagesAsRead]);

    // -----------------------------
    // AUTO SCROLL
    // -----------------------------
    useEffect(() => {
        if (loading) return;

        messagesEndRef.current?.scrollIntoView({
            behavior: firstScrollDone.current ? "smooth" : "auto",
        });

        firstScrollDone.current = true;
    }, [messages, loading]);

    // Matn maydoni yozilgan matnga qarab o‘sadi
    useEffect(() => {
        const element = textareaRef.current;

        if (!element) return;

        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, 132)}px`;
    }, [text]);

    // Qisqa xabarlarni avtomatik yopish
    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => setToast(""), 2000);

        return () => clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        if (!uploadError) return;

        const timer = setTimeout(() => setUploadError(""), 4000);

        return () => clearTimeout(timer);
    }, [uploadError]);

    // Escape bilan ochiq oynalarni yopish
    useEffect(() => {
        const handleKeyUp = (event) => {
            if (event.key !== "Escape") return;

            setPreviewImage(null);
            setSelectedMessage(null);
            setDeleteModal(null);
            setForwardMessage(null);
            setReplyToMessage(null);
            setSelectionMode(false);
            setSelectedMessages([]);
        };

        document.addEventListener("keyup", handleKeyUp);

        return () => document.removeEventListener("keyup", handleKeyUp);
    }, []);

    // -----------------------------
    // FORMAT TIME
    // -----------------------------
    const formatTime = (date) => {
        if (!date) return "";

        return new Date(date).toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    /*
      Xabarlarni ko‘rsatishga tayyorlaymiz:
      kun ajratgichi kerakmi va oldingi xabar bilan bir guruhdami.
    */
    const preparedMessages = useMemo(() => {
        return messages.map((message, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];

            const showDaySeparator =
                !previous ||
                toDayKey(previous.created_at) !== toDayKey(message.created_at);

            const sameSenderAsPrevious =
                previous &&
                previous.sender_id === message.sender_id &&
                new Date(message.created_at) - new Date(previous.created_at) <
                GROUP_GAP_MS &&
                !showDaySeparator;

            const sameSenderAsNext =
                next &&
                next.sender_id === message.sender_id &&
                new Date(next.created_at) - new Date(message.created_at) <
                GROUP_GAP_MS &&
                toDayKey(next.created_at) === toDayKey(message.created_at);

            return {
                ...message,
                showDaySeparator,
                isGroupStart: !sameSenderAsPrevious,
                isGroupEnd: !sameSenderAsNext,
            };
        });
    }, [messages]);

    // -----------------------------
    // SEND MESSAGE
    // -----------------------------
    const sendMessage = async () => {
        const cleanText = text.trim();

        if ((!cleanText && !imageDraft) || !currentUser?.id || !conversationId || sending) {
            return;
        }

        setSending(true);

        if (editingMessage) {
            if (!cleanText) {
                setSending(false);
                return;
            }

            const { error } = await supabase
                .from("messages")
                .update({
                    content: cleanText,
                })
                .eq("id", editingMessage.id)
                .eq("sender_id", currentUser.id);

            if (error) {
                console.error("Edit message error:", error);
                setToast("Xabarni tahrirlab bo‘lmadi");
            } else {
                setMessages((previous) =>
                    previous.map((message) =>
                        message.id === editingMessage.id
                            ? { ...message, content: cleanText }
                            : message
                    )
                );
            }

            setEditingMessage(null);
            setText("");
            setSending(false);
            return;
        }

        const draftImage = imageDraft;
        const draftReply = replyToMessage;
        const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const now = new Date().toISOString();

        // Xabarni server javobini kutmasdan darhol ekranga chiqaramiz.
        const optimisticMessage = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: currentUser.id,
            message_type: draftImage ? "image" : "text",
            content: cleanText || null,
            attachment_url: draftImage?.previewUrl || null,
            is_read: false,
            is_pinned: false,
            reply_to_message_id: draftReply?.id || null,
            created_at: now,
            _sending: true,
        };

        setMessages((previous) => [...previous, optimisticMessage]);
        setText("");
        setReplyToMessage(null);
        setImageDraft(null);

        try {
            let attachmentUrl = null;

            if (draftImage) {
                const fileExt = draftImage.file.name.split(".").pop();
                const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
                const filePath = `${conversationId}/${fileName}`;

                const { error: storageError } = await supabase.storage
                    .from("chat-images")
                    .upload(filePath, draftImage.file, {
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (storageError) throw storageError;

                const { data: publicUrlData } = supabase.storage
                    .from("chat-images")
                    .getPublicUrl(filePath);

                attachmentUrl = publicUrlData?.publicUrl || null;

                if (!attachmentUrl) {
                    throw new Error("Rasm manzili olinmadi.");
                }
            }

            const { data, error } = await supabase
                .from("messages")
                .insert({
                    conversation_id: conversationId,
                    sender_id: currentUser.id,
                    message_type: draftImage ? "image" : "text",
                    content: cleanText || null,
                    attachment_url: attachmentUrl,
                    is_read: false,
                    reply_to_message_id: draftReply?.id || null,
                    is_pinned: false,
                })
                .select()
                .single();

            if (error) throw error;

            setMessages((previous) => {
                const alreadyAddedByRealtime = previous.some(
                    (message) => message.id === data.id
                );

                return previous
                    .filter((message) => message.id !== tempId)
                    .map((message) =>
                        message.id === data.id
                            ? { ...data, _sending: false }
                            : message
                    )
                    .concat(alreadyAddedByRealtime ? [] : [{ ...data, _sending: false }]);
            });

            if (draftImage?.previewUrl) {
                URL.revokeObjectURL(draftImage.previewUrl);
            }

            // Xabar serverga yozildi va UI'da 1 ta ✓ ko‘rinadi.
            playMessageSentSound();
        } catch (error) {
            console.error("Send message error:", error);
            setMessages((previous) =>
                previous.filter((message) => message.id !== tempId)
            );

            if (draftImage) {
                setImageDraft(draftImage);
            }
            if (draftReply) {
                setReplyToMessage(draftReply);
            }
            setText(cleanText);
            setToast("Xabar yuborilmadi. Qayta urinib ko‘ring.");
        } finally {
            setSending(false);
        }
    };

    // -----------------------------
    // ENTER TO SEND
    // -----------------------------
    const handleKeyDown = (event) => {
        // Telefonda Enter — yangi qator, klaviaturadagina yuboradi
        const hasKeyboard =
            typeof window !== "undefined" &&
            window.matchMedia("(pointer: fine)").matches;

        if (!hasKeyboard) return;

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    // -----------------------------
    // COPY MESSAGE
    // -----------------------------
    const copyMessage = async (message) => {
        if (!message?.content) return;

        try {
            await navigator.clipboard.writeText(message.content);
            setToast("Nusxa olindi");
        } catch (error) {
            console.error("Copy error:", error);
        }

        setSelectedMessage(null);
    };

    // -----------------------------
    // START EDIT
    // -----------------------------
    const startEditing = (message) => {
        setEditingMessage(message);
        setText(message.content || "");
        setSelectedMessage(null);

        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    // -----------------------------
    // CANCEL EDIT
    // -----------------------------
    const cancelEditing = () => {
        setEditingMessage(null);
        setReplyToMessage(null);
        setText("");
    };

    // -----------------------------
    // DELETE MESSAGE
    // -----------------------------
    const deleteMessage = async () => {
        if (!deleteModal?.id) return;

        const messageId = deleteModal.id;

        const { error } = await supabase
            .from("messages")
            .delete()
            .eq("id", messageId)
            .eq("sender_id", currentUser.id);

        if (error) {
            console.error("Delete message error:", error);
            return;
        }

        setMessages((previous) =>
            previous.filter((message) => message.id !== messageId)
        );

        setDeleteModal(null);
        setSelectedMessage(null);
    };

    // -----------------------------
    // IMAGE DRAFT
    // -----------------------------
    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];

        if (!file || !currentUser?.id || !conversationId) return;

        if (!file.type.startsWith("image/")) {
            setUploadError("Faqat rasm faylini tanlang.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError("Rasm hajmi 5 MB dan oshmasligi kerak.");
            event.target.value = "";
            return;
        }

        setUploadError("");

        if (imageDraft?.previewUrl) {
            URL.revokeObjectURL(imageDraft.previewUrl);
        }

        const previewUrl = URL.createObjectURL(file);
        setImageDraft({ file, previewUrl });
        event.target.value = "";

        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const removeImageDraft = () => {
        if (imageDraft?.previewUrl) {
            URL.revokeObjectURL(imageDraft.previewUrl);
        }
        setImageDraft(null);
    };

    // -----------------------------
    // LONG PRESS (mobil uchun)
    // -----------------------------
    const startLongPress = (messageId) => {
        longPressTimer.current = setTimeout(() => {
            setSelectedMessage(messageId);

            if (navigator.vibrate) {
                navigator.vibrate(12);
            }
        }, 420);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // -----------------------------
    // REPLY / PIN / SELECTION / FORWARD
    // -----------------------------
    const startReply = (message) => {
        if (!message) return;
        setReplyToMessage(message);
        setSelectedMessage(null);
        setEditingMessage(null);
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const toggleSelectionMode = (message = null) => {
        setSelectedMessage(null);
        setSelectionMode(true);
        if (message) {
            setSelectedMessages((previous) =>
                previous.includes(message.id)
                    ? previous.filter((id) => id !== message.id)
                    : [...previous, message.id]
            );
        }
    };

    const toggleMessageSelection = (messageId) => {
        setSelectedMessages((previous) => {
            const exists = previous.includes(messageId);
            const next = exists
                ? previous.filter((id) => id !== messageId)
                : [...previous, messageId];

            if (next.length === 0) {
                setSelectionMode(false);
            }
            return next;
        });
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedMessages([]);
    };

    const pinMessage = async (message) => {
        if (!message?.id) return;

        const nextPinned = !message.is_pinned;
        const { data, error } = await supabase
            .from("messages")
            .update({ is_pinned: nextPinned })
            .eq("id", message.id)
            .select("id, is_pinned")
            .single();

        if (error) {
            console.error("Pin message error:", error);
            setToast("Xabarni qadab bo‘lmadi");
            return;
        }

        setMessages((previous) =>
            previous.map((item) =>
                item.id === message.id ? { ...item, is_pinned: data.is_pinned } : item
            )
        );
        setSelectedMessage(null);
        setToast(nextPinned ? "Xabar qadaldi" : "Xabar qadog‘i olindi");
    };

    const deleteSelectedMessages = async () => {
        if (!currentUser?.id || selectedMessages.length === 0) return;

        const ids = [...selectedMessages];
        const { error } = await supabase
            .from("messages")
            .delete()
            .in("id", ids);

        if (error) {
            console.error("Delete selected messages error:", error);
            setToast("Xabarlarni o‘chirib bo‘lmadi");
            return;
        }

        setMessages((previous) => previous.filter((message) => !ids.includes(message.id)));
        setDeleteModal(null);
        exitSelectionMode();
        setToast("Xabarlar o‘chirildi");
    };

    const loadForwardContacts = async () => {
        if (!currentProfile?.school_id) return;

        setForwardLoading(true);
        try {
            let query = supabase
                .from("profiles")
                .select("id, school_id, role, first_name, last_name, full_name, email, subject, avatar_url")
                .eq("school_id", currentProfile.school_id)
                .neq("id", currentUser.id);

            if (currentProfile.role === "admin") {
                query = query.eq("role", "teacher");
            } else if (currentProfile.role === "teacher") {
                query = query.in("role", ["admin", "parent"]);
            } else {
                query = query.in("role", ["admin", "teacher"]);
            }

            const { data, error } = await query.order("first_name", { ascending: true });
            if (error) throw error;

            const contacts = (data || []).map((item) => ({
                ...item,
                fullName:
                    item.full_name ||
                    `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                    item.email ||
                    "Foydalanuvchi",
            }));

            setForwardContacts(contacts);
        } catch (error) {
            console.error("Forward contacts error:", error);
            setToast("Odamlar ro‘yxatini yuklab bo‘lmadi");
        } finally {
            setForwardLoading(false);
        }
    };

    const openForward = async (message) => {
        if (!message) return;
        setSelectedMessage(null);
        setForwardSearch("");
        setForwardMessage(message);
        await loadForwardContacts();
    };

    const getOrCreateConversation = async (contact) => {
        const participantKey = [currentUser.id, contact.id].sort().join(":");
        const conversationTitle = `Chat: ${participantKey}`;

        const { data: existing, error: existingError } = await supabase
            .from("conversations")
            .select("id")
            .eq("school_id", currentProfile.school_id)
            .eq("title", conversationTitle)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing?.id) return existing.id;

        const { data: conversation, error: conversationError } = await supabase
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
                { conversation_id: conversation.id, user_id: currentUser.id },
                { conversation_id: conversation.id, user_id: contact.id },
            ]);

        if (participantsError) {
            await supabase.from("conversations").delete().eq("id", conversation.id);
            throw participantsError;
        }

        return conversation.id;
    };

    const forwardSelectedMessage = async (contact) => {
        if (!forwardMessage || !contact?.id || !currentUser?.id || !currentProfile?.school_id) return;

        try {
            setForwardLoading(true);
            const targetConversationId = await getOrCreateConversation(contact);

            const { error } = await supabase.from("messages").insert({
                conversation_id: targetConversationId,
                sender_id: currentUser.id,
                message_type: forwardMessage.message_type || "text",
                content: forwardMessage.content || null,
                attachment_url: forwardMessage.attachment_url || null,
                is_read: false,
                reply_to_message_id: null,
                is_pinned: false,
            });

            if (error) throw error;

            setForwardMessage(null);
            setToast(`Xabar ${contact.fullName} ga yuborildi`);
        } catch (error) {
            console.error("Forward message error:", error);
            setToast("Xabarni uzatib bo‘lmadi");
        } finally {
            setForwardLoading(false);
        }
    };

    // -----------------------------
    // USER NAME
    // -----------------------------
    const fullName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : "Foydalanuvchi";

    const initials =
        `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}` ||
        "U";

    const roleLabel =
        profile?.role === "teacher"
            ? "O‘qituvchi"
            : profile?.role === "admin"
                ? "Administrator"
                : profile?.role === "student"
                    ? "O‘quvchi"
                    : "Ota-ona";

    const activeMessage = messages.find(
        (message) => message.id === selectedMessage
    );

    const pinnedMessage = [...messages].reverse().find((message) => message.is_pinned);

    const filteredForwardContacts = forwardContacts.filter((contact) => {
        const value = forwardSearch.toLowerCase().trim();
        if (!value) return true;
        return (
            contact.fullName.toLowerCase().includes(value) ||
            (contact.email || "").toLowerCase().includes(value)
        );
    });

    return (
        <div className="flex h-[100dvh] min-h-0 flex-col bg-[#f1f5f9]">
            {/* SARLAVHA */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 sm:h-[76px] sm:px-5">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Orqaga"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:scale-95"
                >
                    <ArrowLeft size={22} />
                </button>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-sm font-extrabold text-orange-600 sm:h-11 sm:w-11">
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={fullName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        initials.toUpperCase()
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-extrabold leading-tight text-slate-900 sm:text-base">
                        {fullName}
                    </h2>

                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs text-slate-500">
                            {roleLabel}
                        </span>

                        <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${otherUserOnline
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                                }`}
                        />

                        <span
                            className={`text-[10px] font-semibold ${otherUserOnline
                                ? "text-emerald-600"
                                : "text-slate-400"
                                }`}
                        >
                            {otherUserOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>
            </header>

            {pinnedMessage && !selectionMode && (
                <button
                    type="button"
                    onClick={() => {
                        document.getElementById(`message-${pinnedMessage.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="flex w-full items-center gap-2 border-b border-orange-100 bg-orange-50 px-4 py-2 text-left"
                >
                    <Pin size={15} className="shrink-0 text-orange-500" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-orange-600">Qadalgan xabar</p>
                        <p className="truncate text-xs text-slate-600">{pinnedMessage.content || "Rasm"}</p>
                    </div>
                </button>
            )}

            {/* TANLASH REJIMI */}
            {selectionMode && (
                <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
                    <button type="button" onClick={exitSelectionMode} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100">
                        <X size={20} />
                    </button>
                    <div className="flex-1 text-sm font-extrabold text-slate-800">{selectedMessages.length} ta tanlandi</div>
                    <button
                        type="button"
                        disabled={selectedMessages.length === 0}
                        onClick={() => setDeleteModal({ bulk: true })}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-40"
                    >
                        <Trash2 size={17} />
                        Chatni tozalash
                    </button>
                </div>
            )}

            {/* XABARLAR */}
            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
                <div className="mx-auto flex max-w-3xl flex-col">
                    {loading ? (
                        <div className="flex flex-col gap-3 pt-4">
                            <MessageSkeleton />
                            <MessageSkeleton mine />
                            <MessageSkeleton />
                            <MessageSkeleton mine />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                                <Send size={22} />
                            </div>

                            <h3 className="mt-4 font-extrabold text-slate-800">
                                Suhbat hali boshlanmagan
                            </h3>

                            <p className="mt-1.5 max-w-xs text-sm leading-6 text-slate-500">
                                {fullName} ga birinchi xabarni yozing.
                            </p>
                        </div>
                    ) : (
                        preparedMessages.map((message) => {
                            const isMine = message.sender_id === currentUser?.id;
                            const isImage =
                                message.message_type === "image" &&
                                message.attachment_url;

                            return (
                                <div key={message.id}>
                                    {message.showDaySeparator && (
                                        <div className="my-4 flex justify-center">
                                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                                                {formatDayLabel(message.created_at)}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        className={`flex ${isMine ? "justify-end" : "justify-start"
                                            } ${message.isGroupEnd ? "mb-2.5" : "mb-0.5"}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectionMode) {
                                                    toggleMessageSelection(message.id);
                                                    return;
                                                }

                                                if (isImage) {
                                                    setPreviewImage(message.attachment_url);
                                                    return;
                                                }

                                                setSelectedMessage(
                                                    selectedMessage === message.id
                                                        ? null
                                                        : message.id
                                                );
                                            }}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                if (selectionMode) {
                                                    toggleMessageSelection(message.id);
                                                } else {
                                                    setSelectedMessage(message.id);
                                                }
                                            }}
                                            onTouchStart={() =>
                                                selectionMode
                                                    ? undefined
                                                    : startLongPress(message.id)
                                            }
                                            onTouchEnd={cancelLongPress}
                                            onTouchMove={cancelLongPress}
                                            className={`
                                                relative max-w-[85%] text-left shadow-sm transition
                                                active:scale-[0.99] sm:max-w-[68%]
                                                ${selectionMode && selectedMessages.includes(message.id) ? "ring-4 ring-orange-300/60" : ""}
                                                ${isImage
                                                    ? "overflow-hidden rounded-2xl"
                                                    : "rounded-2xl px-3.5 py-2.5"
                                                }
                                                ${isMine
                                                    ? "bg-orange-500 text-white"
                                                    : "border border-slate-200 bg-white text-slate-800"
                                                }
                                                ${isMine && message.isGroupEnd
                                                    ? "rounded-br-md"
                                                    : ""
                                                }
                                                ${!isMine && message.isGroupEnd
                                                    ? "rounded-bl-md"
                                                    : ""
                                                }
                                            `}
                                        >
                                            {selectionMode && (
                                                <div className={`absolute z-20 ${isMine ? "-left-8" : "-right-8"} top-1/2 -translate-y-1/2 text-orange-500`}>
                                                    {selectedMessages.includes(message.id) ? (
                                                        <CheckSquare size={22} fill="currentColor" className="text-orange-500" />
                                                    ) : (
                                                        <Square size={22} className="text-slate-400" />
                                                    )}
                                                </div>
                                            )}

                                            {message.reply_to_message_id && (
                                                <div className={`mb-2 rounded-xl border-l-2 px-2.5 py-1.5 text-xs ${isMine ? "border-white/60 bg-white/10 text-white/90" : "border-orange-400 bg-slate-50 text-slate-500"}`}>
                                                    <p className="font-bold">Javob</p>
                                                    <p className="truncate">
                                                        {messages.find((item) => item.id === message.reply_to_message_id)?.content || "Xabar"}
                                                    </p>
                                                </div>
                                            )}

                                            {isImage && (
                                                <img
                                                    src={message.attachment_url}
                                                    alt="Yuborilgan rasm"
                                                    loading="lazy"
                                                    className="max-h-72 w-full object-cover"
                                                />
                                            )}

                                            {message.content && (
                                                <p
                                                    className={`whitespace-pre-wrap wrap-break-words text-[15px] leading-6 ${isImage ? "px-3.5 pt-2.5" : ""
                                                        }`}
                                                >
                                                    {message.content}
                                                </p>
                                            )}

                                            <div
                                                className={`
                                                    flex items-center justify-end gap-1 text-[10px]
                                                    ${isImage
                                                        ? "px-3.5 pb-2 pt-1"
                                                        : "mt-0.5"
                                                    }
                                                    ${isMine
                                                        ? "text-orange-100"
                                                        : "text-slate-400"
                                                    }
                                                `}
                                            >
                                                <span>{formatTime(message.created_at)}</span>

                                                {isMine &&
                                                    (message._sending ? (
                                                        <Clock3 size={12} />
                                                    ) : message.is_read ? (
                                                        <CheckCheck size={13} />
                                                    ) : (
                                                        <Check size={13} />
                                                    ))}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* XATO XABARI */}
            {uploadError && (
                <div className="px-3 pb-2 sm:px-6">
                    <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                        {uploadError}
                    </div>
                </div>
            )}

            {/* YOZISH MAYDONI */}
            <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-6">
                <div className="mx-auto max-w-3xl">
                    {replyToMessage && !editingMessage && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border-l-[3px] border-orange-400 bg-orange-50 px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <Reply size={15} className="shrink-0 text-orange-500" />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-orange-600">Javob yozish</p>
                                    <p className="truncate text-xs text-slate-500">{replyToMessage.content || "Rasm"}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReplyToMessage(null)}
                                aria-label="Javobni bekor qilish"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-orange-100"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    {editingMessage && (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border-l-[3px] border-orange-400 bg-orange-50 px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <Pencil size={15} className="shrink-0 text-orange-500" />

                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-orange-600">
                                        Tahrirlanmoqda
                                    </p>

                                    <p className="truncate text-xs text-slate-500">
                                        {editingMessage.content}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={cancelEditing}
                                aria-label="Tahrirni bekor qilish"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-orange-100"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    )}

                    {imageDraft && (
                        <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                            <div className="relative w-fit overflow-hidden rounded-xl">
                                <img
                                    src={imageDraft.previewUrl}
                                    alt="Tanlangan rasm"
                                    className="max-h-48 max-w-[240px] rounded-xl object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={removeImageDraft}
                                    aria-label="Rasmni olib tashlash"
                                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-sm backdrop-blur-sm"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            disabled={sending}
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="Rasm yuborish"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            <ImagePlus size={21} />
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />

                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            placeholder={
                                editingMessage ? "Xabarni tahrirlang" : "Xabar yozing"
                            }
                            className="
                                max-h-[132px] min-h-[44px] flex-1 resize-none
                                rounded-2xl border border-slate-200 bg-slate-50
                                px-4 py-2.5 text-[15px] leading-6 text-slate-800
                                outline-none transition placeholder:text-slate-400
                                focus:border-orange-300 focus:bg-white
                                focus:ring-4 focus:ring-orange-500/10
                            "
                        />

                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={(!text.trim() && !imageDraft) || sending}
                            aria-label={editingMessage ? "Saqlash" : "Yuborish"}
                            className="
                                flex h-11 w-11 shrink-0 items-center justify-center
                                rounded-xl bg-orange-500 text-white shadow-sm
                                transition hover:bg-orange-600 active:scale-95
                                disabled:cursor-not-allowed disabled:opacity-40
                            "
                        >
                            {editingMessage ? (
                                <Check size={20} />
                            ) : (
                                <Send size={19} />
                            )}
                        </button>
                    </div>
                </div>
            </footer>

            {/* XABAR AMALLARI */}
            {activeMessage && !selectionMode && (
                <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
                    <button type="button" aria-label="Yopish" onClick={() => setSelectedMessage(null)} className="absolute inset-0 cursor-default" />
                    <div className="relative z-10 w-full overflow-hidden rounded-t-[26px] bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xs sm:rounded-2xl sm:pb-2">
                        <div className="flex justify-center pt-3 sm:hidden"><span className="h-1.5 w-12 rounded-full bg-slate-200" /></div>
                        {activeMessage.content && (
                            <p className="line-clamp-2 border-b border-slate-100 px-5 py-3 text-xs leading-5 text-slate-400">{activeMessage.content}</p>
                        )}
                        <div className="py-1">
                            <button type="button" onClick={() => startReply(activeMessage)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                                <Reply size={18} className="text-slate-400" /> Javob yozish
                            </button>
                            {activeMessage.content && (
                                <button type="button" onClick={() => copyMessage(activeMessage)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                                    <Copy size={18} className="text-slate-400" /> Nusxalash
                                </button>
                            )}
                            <button type="button" onClick={() => pinMessage(activeMessage)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                                {activeMessage.is_pinned ? <PinOff size={18} className="text-slate-400" /> : <Pin size={18} className="text-slate-400" />}
                                {activeMessage.is_pinned ? "Qadog‘ini olish" : "Qadash"}
                            </button>
                            <button type="button" onClick={() => openForward(activeMessage)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                                <Forward size={18} className="text-slate-400" /> Uzatish
                            </button>
                            {activeMessage.sender_id === currentUser?.id && (
                                <button type="button" onClick={() => { setDeleteModal(activeMessage); setSelectedMessage(null); }} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-red-600 active:bg-red-50">
                                    <Trash2 size={18} /> O‘chirish
                                </button>
                            )}
                            <button type="button" onClick={() => toggleSelectionMode(activeMessage)} className="flex w-full items-center gap-3.5 px-5 py-3.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                                <CheckSquare size={18} className="text-slate-400" /> Tanlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RASMNI TO‘LIQ KO‘RISH */}
            {previewImage && (
                <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/90 p-4">
                    <button
                        type="button"
                        aria-label="Yopish"
                        onClick={() => setPreviewImage(null)}
                        className="absolute inset-0 cursor-default"
                    />

                    <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        aria-label="Yopish"
                        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
                    >
                        <X size={20} />
                    </button>

                    <img
                        src={previewImage}
                        alt="Rasm"
                        className="relative z-[5] max-h-full max-w-full rounded-xl object-contain"
                    />
                </div>
            )}

            {/* O‘CHIRISH TASDIG‘I */}
            {deleteModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4">
                    <button type="button" aria-label="Yopish" onClick={() => setDeleteModal(null)} className="absolute inset-0 cursor-default" />
                    <div className="relative z-10 w-full rounded-t-[26px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><Trash2 size={20} /></div>
                            <div className="min-w-0">
                                <h3 className="font-extrabold text-slate-900">{deleteModal.bulk ? "Xabarlarni o‘chirish" : "Xabarni o‘chirish"}</h3>
                                <p className="text-sm text-slate-500">{deleteModal.bulk ? `${selectedMessages.length} ta xabar o‘chiriladi.` : "Bu amalni qaytarib bo‘lmaydi."}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button type="button" onClick={() => setDeleteModal(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Bekor qilish</button>
                            <button type="button" onClick={deleteModal.bulk ? deleteSelectedMessages : deleteMessage} className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600">O‘chirish</button>
                        </div>
                    </div>
                </div>
            )}

            {/* UZATISH */}
            {forwardMessage && (
                <div className="fixed inset-0 z-[105] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4">
                    <button type="button" aria-label="Yopish" onClick={() => setForwardMessage(null)} className="absolute inset-0 cursor-default" />
                    <div className="relative z-10 flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
                        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                            <button type="button" onClick={() => setForwardMessage(null)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100"><X size={19} /></button>
                            <div className="min-w-0 flex-1"><h3 className="font-extrabold text-slate-900">Uzatish</h3><p className="truncate text-xs text-slate-500">Odamni tanlang</p></div>
                        </div>
                        <div className="border-b border-slate-100 px-4 py-3">
                            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5">
                                <Search size={17} className="text-slate-400" />
                                <input value={forwardSearch} onChange={(event) => setForwardSearch(event.target.value)} placeholder="Qidirish" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {forwardLoading ? (
                                <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 size={22} className="animate-spin" /></div>
                            ) : filteredForwardContacts.length === 0 ? (
                                <div className="py-10 text-center text-sm text-slate-400">Odam topilmadi</div>
                            ) : (
                                filteredForwardContacts.map((contact) => {
                                    const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() || "U";
                                    return (
                                        <button key={contact.id} type="button" onClick={() => forwardSelectedMessage(contact)} disabled={forwardLoading} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 disabled:opacity-50">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-sm font-extrabold text-orange-600">
                                                {contact.avatar_url ? <img src={contact.avatar_url} alt={contact.fullName} className="h-full w-full object-cover" /> : initials}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-slate-800">{contact.fullName}</p>
                                                <p className="truncate text-xs text-slate-400">{contact.email || contact.subject || "Foydalanuvchi"}</p>
                                            </div>
                                            <Forward size={17} className="shrink-0 text-slate-300" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QISQA XABAR */}
            {toast && (
                <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[120] flex justify-center px-4">
                    <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-xl">
                        <Check size={16} className="text-emerald-400" />
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
}