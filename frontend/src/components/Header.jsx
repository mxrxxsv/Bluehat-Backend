import { useRef } from "react";
import { Bell, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/BlueHat_logo.png";
import profile from "../assets/client.png";
import { checkAuth, Logout } from "../api/auth";

const Header = () => {
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();
  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const excludeAuthPages = ["/setup-2fa", "/verify-email"];

    if (excludeAuthPages.includes(location.pathname)) {
      console.log("Skipping auth check for:", location.pathname);
      return; // Don't check auth on these pages
    }
    checkAuth()
      .then((res) => setUser(res.data.data))
      .catch(() => {
        const publicPages = [
          "/",
          "/home",
          "/login",
          "/signup",
          "/workersignup",
          "/clientsignup",
          "/forgetpass",
          "/workerquestion",
        ];
        if (!publicPages.includes(location.pathname)) {
          navigate("/login");
        }
      });
  }, [location.pathname, navigate]);

  // Sample notifications
  const notifications = [
    "Your task was marked as completed.",
    "New job posting available in your area.",
    "New update available for your profile.",
  ];

  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path) => currentPath === path;

  const authPages = ["/home", "/"];
  const opPages = [
    "/signup",
    "/login",
    "/workersignup",
    "/clientsignup",
    "/forgetpass",
    "/workerquestion",
    "/setup-2fa",
  ];
  // const authPages = ["/HomePage", "/FindWork", "/JobDetail", "/FindWorker", "/AdsPage", "/WorkerPortfolio", "/ChatPage"];
  const showAuthButtons = authPages.includes(currentPath);
  const hideOp = opPages.includes(currentPath);

  const goToProfile = () => {
    setShowDropdown(false);
    navigate("/profile");
  };

  const handleLogout = async () => {
    try {
      await Logout();
      setShowDropdown(false);
      navigate("/home");
    } catch (err) {
      alert("Logout failed");
    }
  };

  return (
    <header className="w-full z-20 top-0 start-0 pt-4 fixed top-0 bg-[#f4f6f6]">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto pt-4 p-2">
        <Link
          to={user ? "/find-work" : "/home"}
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <img
            src={logo}
            className="h-15 w-28 md:h-20 md:w-40"
            alt="Flowbite Logo"
          />
        </Link>

        {hideOp ? (
          <></>
        ) : (
          <>
            <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
              {showAuthButtons ? (
                <>
                  <div className="w-20 pt-1 md:pt-0 md:w-43 flex flex-row gap-1 md:gap-1">
                    <Link
                      to="/login"
                      className="hidden md:block text-[#252525] mr-4 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2 text-center border-2 border-sky-400 rounded-[20px] shadow-sm hover:bg-sky-400 hover:text-white cursor-pointer hover:shadow-md hidden md:flex"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      className="text-white bg-sky-500 hover:bg-blue-400 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-[10px] text-sm px-3 py-2 shadow-sm hover:shadow-md"
                    >
                      Sign up
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-25 pt-1 md:pt-0 md:w-43 flex flex-row gap-5 md:gap-2 hidden md:flex">
                    <Link to="/chat">
                      <Mail className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
                    </Link>

                    <Bell
                      className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer"
                      onClick={handleNotificationClick}
                    />

                    {showNotifications && (
                      <div
                        ref={notificationRef}
                        className="absolute right-30 mt-10 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-100"
                      >
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

                    <span className="pl-4 text-gray-700 text-[16px] font-medium">
                      {user?.fname || user?.email}
                    </span>

                    <div className="relative" ref={dropdownRef}>
                      <img
                        src={profile}
                        alt="Profile"
                        className="pb-2 h-8 w-8 rounded-full object-cover cursor-pointer"
                        onClick={() => setShowDropdown(!showDropdown)}
                      />
                      {showDropdown && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <ul className="py-2 text-sm text-gray-700">
                            <li>
                              <button
                                onClick={goToProfile}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                              >
                                Profile
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={handleLogout}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                              >
                                Logout
                              </button>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                aria-controls="navbar-sticky"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className="w-5 h-5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 17 14"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M1 1h15M1 7h15M1 13h15"
                  />
                </svg>
              </button>
            </div>
            <nav
              className={`items-left pb-4 justify-between w-full md:flex md:w-auto md:order-1 ${
                isOpen ? "block" : "hidden"
              } bg-white`}
              id="navbar-sticky"
            >
              <ul className="flex flex-col p-4 md:p-0 mt-4 font-regular border border-gray-100 rounded-lg md:space-x-8 rtl:space-x-reverse md:flex-row bg-[#f4f6f6] text-left">
                <li>
                  <Link
                    to="/find-work"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${
                      isActive("/find-work")
                        ? "text-sky-500"
                        : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                    }`}
                  >
                    Find Work
                  </Link>
                </li>
                <li>
                  <Link
                    to="/find-workers"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${
                      isActive("/find-workers")
                        ? "text-sky-500"
                        : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                    }`}
                  >
                    Find Worker
                  </Link>
                </li>
                <li>
                  <Link
                    to="/ads"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${
                      isActive("/ads")
                        ? "text-sky-500"
                        : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                    }`}
                  >
                    Advertisement
                  </Link>
                </li>
              </ul>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
