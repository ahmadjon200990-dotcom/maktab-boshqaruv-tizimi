import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ParentHeader() {
    const [studentName, setStudentName] =
        useState("O‘quvchi");

    useEffect(() => {
        loadStudentName();
    }, []);

    async function loadStudentName() {
        try {
            // ================================
            // CURRENT USER
            // ================================

            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                return;
            }

            // ================================
            // PARENT PROFILE
            // ================================

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(`
                    id,
                    role,
                    student_id
                `)
                .eq("id", user.id)
                .eq("role", "parent")
                .maybeSingle();

            if (profileError || !profile?.student_id) {
                return;
            }

            // ================================
            // STUDENT
            // ================================

            const {
                data: student,
                error: studentError,
            } = await supabase
                .from("students")
                .select(`
                    first_name,
                    last_name
                `)
                .eq("id", profile.student_id)
                .maybeSingle();

            if (studentError || !student) {
                return;
            }

            const fullName = `${student.first_name || ""} ${
                student.last_name || ""
            }`.trim();

            if (fullName) {
                setStudentName(fullName);
            }
        } catch (error) {
            console.error(
                "Parent header student error:",
                error
            );
        }
    }

    return (
        <header
            className="
                sticky
                top-0
                z-40
                flex
                h-16
                items-center
                justify-between
                border-b
                border-slate-200
                bg-white/95
                px-4
                backdrop-blur-md
                md:px-6
            "
        >
            {/* BOLA ISMI */}

            <h1
                className="
                    min-w-0
                    truncate
                    text-[15px]
                    font-bold
                    text-slate-900
                    md:text-[17px]
                "
            >
                {studentName}
            </h1>

            {/* BELL */}

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
                    rounded-full
                    text-slate-600
                    transition
                    hover:bg-slate-100
                    hover:text-slate-900
                "
            >
                <Bell size={21} />
            </button>
        </header>
    );
}