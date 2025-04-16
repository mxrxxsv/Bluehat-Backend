import { Bell, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Header = () => {
  // State to handle notifications visibility
  const [showNotifications, setShowNotifications] = useState(false);

  // Toggle notifications visibility
  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  // Sample notifications
  const notifications = [
    "Your task was marked as completed.",
    "New job posting available in your area.",
    "New update available for your profile.",
  ];

  return (
    <header className="w-full bg-white shadow">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* Left - Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8" />
          <span className="font-semibold text-lg">Fixit</span>
        </div>

        {/* Center - Navigation Links */}
        <nav className="hidden md:flex gap-6 text-gray-700">
          <Link to="/find-work" className="hover:text-blue-600">
            Find Work
          </Link>
          <Link to="/find-workers" className="hover:text-blue-600">
            Find Workers
          </Link>
          <Link to="/ads" className="hover:text-blue-600">
            Advertisement
          </Link>
        </nav>

        {/* Right - Icons and User Info */}
        <div className="flex items-center gap-4 relative">
          <Mail className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
          <Bell
            className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer"
            onClick={handleNotificationClick} // Handle Bell icon click
          />

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-30 mt-70 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-10">
              <div className="p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">Notifications</p>
                <ul className="space-y-2">
                  {notifications.map((notification, index) => (
                    <li
                      key={index}
                      className="p-2 hover:bg-gray-100 rounded-md text-left"
                    >
                      {notification}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">
              Chlyde Adrian Benavidez
            </span>
            <img
              src="/user-profile.jpg"
              alt="Profile"
              className="h-8 w-8 rounded-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
