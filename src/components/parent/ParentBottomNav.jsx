import {
    Home,
    MessageCircle,
    GraduationCap,
    User,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
    {
        label: "Asosiy",
        path: "/parent",
        icon: Home,
    },
    {
        label: "Xabarlar",
        path: "/parent/messages",
        icon: MessageCircle,
    },
    {
        label: "Baholar",
        path: "/parent/grades",
        icon: GraduationCap,
    },
    {
        label: "Profil",
        path: "/parent/profile",
        icon: User,
    },
];

export default function ParentBottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
            <div className="grid grid-cols-4">
                {navItems.map(({ label, path, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === "/parent"}
                        className={({ isActive }) =>
                            `flex min-h-16 flex-col items-center justify-center gap-1 transition ${
                                isActive
                                    ? "text-blue-600"
                                    : "text-slate-500 hover:text-slate-700"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={21}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                <span className="text-[11px] font-medium">
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}