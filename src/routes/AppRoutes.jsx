import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

// =========================
// AUTH
// =========================

import Login from "../pages/auth/Login";

// =========================
// LAYOUT
// =========================

import MainLayout from "../components/layouts/MainLayout";

// =========================
// GUARDS
// =========================

import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

// =========================
// ADMIN PAGES
// =========================

import AdminDashboard from "../pages/admin/AdminDashboard";
import Students from "../pages/admin/Students";
import StudentDetail from "../pages/admin/StudentDetail";
import Teachers from "../pages/admin/Teachers";
import Classes from "../pages/admin/Classes";
import ClassDetail from "../pages/admin/ClassDetail";
import Attendance from "../pages/admin/Attendance";
import Settings from "../pages/admin/Settings";

// =========================
// SHARED MESSAGES
// =========================

import Messages from "../pages/Messages";
import MessageDetail from "../pages/MessagesDetail";

// =========================
// TEACHER PAGES
// =========================

import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import TeacherClasses from "../pages/teacher/TeacherClasses";
import TeacherSchedule from "../pages/teacher/TeacherSchedule";
import TeacherProfile from "../pages/teacher/TeacherProfile";
import TeacherSettings from "../pages/teacher/TeacherSettings";
import TeacherLessonDetail from "../pages/teacher/TeacherLessonDetail";
import TeacherLessonGrades from "../pages/teacher/TeacherLessonGrades";
import TeacherClassDetail from "../pages/teacher/TeacherClassDetail";
import TeacherStudentDetail from "../pages/teacher/TeacherStudentDetail";

import ParentLayout from "../components/parent/ParentLayout";
import ParentDashboard from "../pages/parent/ParentDashboard";
import ParentGrades from "../pages/parent/ParentGrades";
import ParentProfile from "../pages/parent/ParentProfile";

// =========================
// TEMP PAGE
// =========================

function Page({ title }) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800">
                {title}
            </h1>

            <p className="mt-2 text-slate-500">
                Bu sahifa hozircha tayyorlanmoqda.
            </p>
        </div>
    );
}

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>

                {/* =====================================================
                    LOGIN
                ===================================================== */}

                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* =====================================================
                    PROTECTED ROUTES
                ===================================================== */}

                <Route element={<ProtectedRoute />}>

                    {/* =================================================
                        ADMIN
                    ================================================= */}

                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={["admin"]}
                            />
                        }
                    >

                        {/* =========================
                            ADMIN MAIN LAYOUT
                        ========================= */}

                        <Route
                            path="/admin"
                            element={<MainLayout />}
                        >
                            {/* /admin */}
                            <Route
                                index
                                element={<AdminDashboard />}
                            />

                            {/* /admin/students */}
                            <Route
                                path="students"
                                element={<Students />}
                            />

                            {/* /admin/students/:id */}
                            <Route
                                path="students/:id"
                                element={<StudentDetail />}
                            />

                            {/* /admin/teachers */}
                            <Route
                                path="teachers"
                                element={<Teachers />}
                            />

                            {/* /admin/classes */}
                            <Route
                                path="classes"
                                element={<Classes />}
                            />

                            {/* /admin/classes/:classId */}
                            <Route
                                path="classes/:classId"
                                element={<ClassDetail />}
                            />

                            {/* /admin/attendance */}
                            <Route
                                path="attendance"
                                element={<Attendance />}
                            />

                            {/* /admin/messages */}
                            <Route
                                path="messages"
                                element={<Messages />}
                            />

                            {/* /admin/reports */}
                            <Route
                                path="reports"
                                element={
                                    <Page title="Hisobotlar" />
                                }
                            />

                            {/* /admin/settings */}
                            <Route
                                path="settings"
                                element={<Settings />}
                            />
                        </Route>

                        {/* =========================
                            ADMIN MESSAGE DETAIL

                            MainLayout YO'Q
                            Header/sidebar/bottom menu YO'Q
                        ========================= */}

                        <Route
                            path="/admin/messages/:id"
                            element={<MessageDetail />}
                        />

                    </Route>

                    {/* =================================================
                        TEACHER
                    ================================================= */}

                    <Route
                        element={
                            <RoleRoute
                                allowedRoles={["teacher"]}
                            />
                        }
                    >

                        {/* =========================
                            TEACHER MAIN LAYOUT
                        ========================= */}

                        <Route
                            path="/teacher"
                            element={<MainLayout />}
                        >
                            {/* /teacher */}
                            <Route
                                index
                                element={<TeacherDashboard />}
                            />

                            {/* /teacher/classes */}
                            <Route
                                path="classes"
                                element={<TeacherClasses />}
                            />

                            {/* /teacher/messages */}
                            <Route
                                path="messages"
                                element={<Messages />}
                            />

                            {/* /teacher/schedule */}
                            <Route
                                path="schedule"
                                element={<TeacherSchedule />}
                            />

                            {/* /teacher/lesson/:lessonId */}
                            <Route
                                path="lesson/:lessonId"
                                element={<TeacherLessonDetail />}
                            />

                            {/* /teacher/lesson/:lessonId/grades */}
                            <Route
                                path="lesson/:lessonId/grades"
                                element={<TeacherLessonGrades />}
                            />

                            {/* /teacher/profile */}
                            <Route
                                path="profile"
                                element={<TeacherProfile />}
                            />

                            {/* /teacher/settings */}
                            <Route
                                path="settings"
                                element={<TeacherSettings />}
                            />

                            {/* /teacher/classes/:classId */}
                            <Route
                                path="classes/:classId"
                                element={<TeacherClassDetail />}
                            />

                            {/* /teacher/classes/:classId/students/:studentId */}
                            <Route
                                path="classes/:classId/students/:studentId"
                                element={<TeacherStudentDetail />}
                            />
                        </Route>

                        {/* =========================
                            TEACHER MESSAGE DETAIL

                            MainLayout YO'Q
                            Header/sidebar/bottom menu YO'Q
                        ========================= */}

                        <Route
                            path="/teacher/messages/:id"
                            element={<MessageDetail />}
                        />

                    </Route>

                    <Route element={<RoleRoute allowedRoles={["parent"]} />}>
                        <Route path="/parent" element={<ParentLayout />}>
                            <Route index element={<ParentDashboard />} />
                            <Route path="messages" element={<Messages />} />
                            <Route path="grades" element={<ParentGrades />} />
                            <Route path="profile" element={<ParentProfile />} />
                        </Route>

                        <Route
                            path="/parent/messages/:id"
                            element={<MessageDetail />}
                        />
                    </Route>
                </Route>

                {/* =====================================================
                    DEFAULT
                ===================================================== */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

                {/* =====================================================
                    404
                ===================================================== */}



                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}