import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import {
  LayoutDashboard,
  Search,
  Clock,
  Phone,
  Users,
  BookUser,
  CalendarDays,
  LibraryBig,
  Podium,
  Pencil,
  Ruler,
  Menu,
  X,
  ClipboardList,
} from "lucide-react";

const generalItems = [
  { path: "/", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { path: "/track", label: "Track", icon: <Search size={18} /> },
  { path: "/timetable", label: "Timetable", icon: <Clock size={18} /> },
  { path: "/exam-schedule", label: "Exam Schedule", icon: <ClipboardList size={18} /> },
  { path: "/contact", label: "Contact", icon: <Phone size={18} /> },
];

const adminItems = [
  { path: "/students", label: "Students", icon: <Users size={18} /> },
  { path: "/teachers", label: "Teachers", icon: <BookUser size={18} /> },
  { path: "/semesters", label: "Semesters", icon: <CalendarDays size={18} /> },
  { path: "/courses", label: "Courses", icon: <LibraryBig size={18} /> },
  { path: "/results", label: "Results (CGPA)", icon: <Podium size={18} /> },
  {
    path: "/course-results",
    label: "Course Marks",
    icon: <Pencil size={18} />,
  },
  { path: "/grading-scale", label: "Grading Scale", icon: <Ruler size={18} /> },
];

function NavGroup({ label, items, onMobileClose }) {
  return (
    <div className="nav-group">
      <span className="nav-group-label">{label}</span>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          title={item.label}
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          onClick={() => {
            if (window.innerWidth <= 768) onMobileClose();
          }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar({ isOpen, onToggle }) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo-link">
            <img src={logo} alt="PUGC Logo" className="sidebar-logo" />
          </NavLink>
          <div className="sidebar-header-text">
            <h2>PU Gujranwala Campus</h2>
            <p>BSCS 2024-2028</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavGroup
            label="General"
            items={generalItems}
            onMobileClose={onToggle}
          />
          <NavGroup
            label="Academic"
            items={adminItems}
            onMobileClose={onToggle}
          />
        </nav>

        <div className="sidebar-user">
          {isAuthenticated ? (
            <>
              <span className="sidebar-user-name">{user?.username}</span>
              <button className="btn btn-sm btn-logout" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn btn-sm btn-login">
              Login
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
