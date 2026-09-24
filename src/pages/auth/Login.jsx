import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import Input from "../../components/ui/Input";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError("");

        const loginEmail = email.trim().toLowerCase();

        if (!loginEmail || !password) {
            setError("Email va parolni kiriting.");
            return;
        }

        try {
            setLoading(true);

            /*
             * ----------------------------------------
             * 1. LOGIN
             * ----------------------------------------
             */

            const { data, error: loginError } =
                await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password,
                });

            if (loginError) {
                throw new Error(
                    loginError.message ||
                    "Email yoki parol noto‘g‘ri."
                );
            }

            const user = data?.user;
            const session = data?.session;

            if (!user || !session) {
                throw new Error(
                    "Foydalanuvchi sessiyasi topilmadi."
                );
            }

            /*
             * ----------------------------------------
             * 2. PROFILE VA ROLE
             * ----------------------------------------
             */

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    role,
                    school_id,
                    first_name,
                    last_name,
                    full_name,
                    email,
                    phone,
                    avatar_url,
                    subject
                `)
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) {
                await supabase.auth.signOut();

                throw new Error(
                    "Foydalanuvchi profilini yuklashda xatolik yuz berdi."
                );
            }

            if (!profile) {
                await supabase.auth.signOut();

                throw new Error(
                    "Foydalanuvchi profili topilmadi."
                );
            }

            const role = profile.role;

            if (!role) {
                await supabase.auth.signOut();

                throw new Error(
                    "Foydalanuvchiga rol biriktirilmagan."
                );
            }

            /*
             * ----------------------------------------
             * 3. FAQAT KERAKLI LOCAL STORAGE
             * ----------------------------------------
             */

            localStorage.setItem(
                "accessToken",
                session.access_token
            );

            localStorage.setItem(
                "userId",
                user.id
            );

            localStorage.setItem(
                "userEmail",
                profile.email ||
                user.email ||
                loginEmail
            );

            localStorage.setItem(
                "role",
                role
            );

            /*
             * Profil ma'lumotlarini ham saqlab qo'yamiz.
             * MainLayout ularni Supabase'dan qayta oladi,
             * shuning uchun bu faqat qo'shimcha qulaylik.
             */

            localStorage.setItem(
                "profile",
                JSON.stringify(profile)
            );

            /*
             * ----------------------------------------
             * 4. ROLE BO'YICHA YO'NALTIRISH
             * ----------------------------------------
             */

            switch (role) {
                case "admin":
                    navigate("/admin", {
                        replace: true,
                    });
                    break;

                case "teacher":
                    navigate("/teacher", {
                        replace: true,
                    });
                    break;

                case "parent":
                    navigate("/parent", {
                        replace: true,
                    });
                    break;

                default:
                    await supabase.auth.signOut();

                    localStorage.removeItem(
                        "accessToken"
                    );
                    localStorage.removeItem("userId");
                    localStorage.removeItem("userEmail");
                    localStorage.removeItem("role");
                    localStorage.removeItem("profile");

                    throw new Error(
                        `Noma'lum foydalanuvchi roli: ${role}`
                    );
            }
        } catch (err) {
            console.error("LOGIN ERROR:", err);

            setError(
                err?.message ||
                "Tizimga kirishda xatolik yuz berdi."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] px-4">
            <div className="w-full max-w-sm rounded-[24px] border border-black/[0.06] bg-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                        <i className="fa-solid fa-school text-[18px]" />
                    </div>

                    <h1 className="mt-4 text-xl font-black text-black">
                        Tizimga kirish
                    </h1>

                    <p className="mt-1 text-sm font-medium text-[#8A8A8A]">
                        Maktab boshqaruv tizimi
                    </p>
                </div>

                <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                >
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        placeholder="email@maktab.uz"
                        autoComplete="username"
                        required
                    />

                    <Input
                        label="Parol"
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        placeholder="********"
                        autoComplete="current-password"
                        required
                    />

                    {error && (
                        <div className="rounded-xl bg-[#FFF0F0] px-3 py-2.5">
                            <p className="text-sm font-medium leading-5 text-[#EF4444]">
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-[16px] bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading
                            ? "Kirilmoqda..."
                            : "Kirish"}
                    </button>
                </form>
            </div>
        </div>
    );
}