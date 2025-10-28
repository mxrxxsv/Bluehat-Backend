import { useRef } from "react";
import { Bell, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/BlueHat_logo.png";
import profile from "../assets/client.png";
import { checkAuth, Logout } from "../api/auth";
import { io } from "socket.io-client";
import { baseURL } from "../utils/appMode";

const Header = () => {
  const [user, setUser] = useState(null);
  const [menuLabel, setMenuLabel] = useState("Applications");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const profileDropdownRef = useRef(null); // desktop profile dropdown container
  const profileDropdownMobileRef = useRef(null); // mobile profile dropdown container
  const notificationRef = useRef(null);
  const navMenuRef = useRef(null); // mobile nav container
  const burgerButtonRef = useRef(null); // hamburger button
  const isOpenRef = useRef(false); // mirror latest isOpen for outside-click
  const location = useLocation();
  const currentPath = location.pathname;
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathnameRef = useRef(location.pathname);


  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInDesktopProfile = profileDropdownRef.current?.contains(event.target);
      const clickedInMobileProfile = profileDropdownMobileRef.current?.contains(event.target);
      const clickedInAnyProfile = clickedInDesktopProfile || clickedInMobileProfile;

      if (!clickedInAnyProfile) {
        setShowDropdown(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }

      // Close mobile hamburger menu when clicking outside of menu and burger
      if (isOpenRef.current) {
        const clickedInsideNav = navMenuRef.current?.contains(event.target);
        const clickedBurger = burgerButtonRef.current?.contains(event.target);
        if (!clickedInsideNav && !clickedBurger) {
          setIsOpen(false);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setShowDropdown(false);
        setShowNotifications(false);
        setIsOpen(false);
      }
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
        setShowNotifications(false);
        setIsOpen(false);
      }
    };

    // Use click for outside detection so inner links still receive the click
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeydown);
    };

  }, []);


  useEffect(() => {
    const excludeAuthPages = ["/setup-2fa", "/verify-email"];
    if (excludeAuthPages.includes(location.pathname)) return;

    checkAuth()
      .then((res) => {
        if (res.data.success) {
          const user = res.data.data;
          setUser(user);

          if (user.userType === "worker") setMenuLabel("My Applications");
          else if (user.userType === "client") setMenuLabel("Applications Received");
          else setMenuLabel("Applications");

          // Setup socket.io for real-time message indicator
          try {
            if (!socketRef.current) {
              const s = io(baseURL, { withCredentials: true });
              socketRef.current = s;
              // Register this credential to receive personal events
              const credId = user?.credentialId || user?._id || user?.id;
              if (credId) s.emit("registerUser", String(credId));

              s.on("receiveMessage", (msg) => {
                // Ignore if it's from self
                const senderCred =
                  msg?.sender?.credentialId || msg?.senderCredentialId || msg?.fromCredentialId;
                const selfCred = user?.credentialId || user?._id || user?.id;
                if (selfCred && senderCred && String(senderCred) === String(selfCred)) return;

                // If currently viewing chat, don't increase unread
                if (pathnameRef.current && pathnameRef.current.startsWith("/chat")) return;
                setUnreadCount((c) => c + 1);
              });

              // Optional: handle cleanup on reconnects
              s.on("disconnect", () => {
                // keep unread count; connection will auto-retry
              });
            }
          } catch (_) {
            // fail-safe: ignore socket setup errors
          }
        }
      })
      // .catch(() => {
      //   const publicPages = [
      //     "/", "/home", "/login", "/signup",
      //     "/workersignup", "/clientsignup", "/forgetpass", "/workerquestion", "/reset-password"
      //   ];
      //   if (!publicPages.includes(location.pathname)) {
      //     navigate("/login");
      //   }
      // })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [location.pathname, navigate]);

  // Clear unread indicator when navigating to chat
  useEffect(() => {
    pathnameRef.current = location.pathname;
    if (location.pathname.startsWith("/chat")) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);


  // Sample notifications
  const notifications = [
    "Your task was marked as completed.",
    "New job posting available in your area.",
    "New update available for your profile.",
  ];

  const [isOpen, setIsOpen] = useState(false);

  // Keep ref synced with latest isOpen for event listeners
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const isActive = (path) => currentPath === path;

  const authPages = ["/home", "/"];
  const opPages = [
    "/signup",
    "/login",
    "/workersignup",
    "/clientsignup",
    "/forgetpass",
    "/workerquestion",
    "/reset-password",
    "/setup-2fa",
  ];
  // const authPages = ["/HomePage", "/FindWork", "/JobDetail", "/FindWorker", "/AdsPage", "/WorkerPortfolio", "/ChatPage"];
  const showAuthButtons = !user;
  const hideOp = opPages.includes(currentPath);

  const goToProfile = (e) => {
    e.stopPropagation();
    setIsOpen(false)
    setShowDropdown(false);
    navigate("/profile");
  };

  const handleLogout = async (e) => {
    e.stopPropagation();
    try {
      await Logout();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnreadCount(0);
      setUser(null);
      setShowDropdown(false);
      navigate("/home");
    } catch (err) {
      alert("Logout failed");
    }
  };


  if (authLoading) {
    return (
      <header className="w-full fixed top-0 left-0 z-20 bg-[#f4f6f6] h-[80px]">

      </header>
    );
  }


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
                      className="text-white bg-[#55b3f3] hover:bg-sky-600 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-[10px] text-sm px-4 py-2 shadow-sm hover:shadow-md"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      className="hidden md:block text-[#252525] mr-4 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2 text-center border-2 border-sky-400 rounded-[20px] shadow-sm hover:bg-sky-400 hover:text-white cursor-pointer hover:shadow-md hidden md:flex"

                    >
                      Sign up
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-25 pt-1 md:pt-0 md:w-43 flex flex-row gap-5 md:gap-2 hidden md:flex">
                    <Link to="/chat" onClick={() => setUnreadCount(0)} className="relative">
                      <Mail className="mt-1.5 w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-3 px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>

                    <Bell
                      className="mt-1.5 w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotifications((prev) => !prev);
                      }}
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

                    <span className="text-gray-700 text-[16px] font-medium">
                      {/* {user?.fname || user?.email} */}
                    </span>

                    <div className="relative z-[1050]" ref={profileDropdownRef}>
                      {/* <img
                        src={profile}
                        alt="Profile"
                        className="pb-2 h-8 w-8 rounded-full object-cover cursor-pointer"
                        onClick={() => setShowDropdown(!showDropdown)}
                      /> */}
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            user?.image ||
                            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                          }
                          alt="Avatar"
                          className="w-8 h-8 rounded-full object-cover cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(!showDropdown);
                          }}
                        />
                      </div>
                      {showDropdown && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                          <ul className="py-2 text-sm text-gray-700">
                            <li>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToProfile(e);
                                }}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              >
                                Profile
                              </button>
                            </li>
                            {/* <li>
                              <Link
                                to="/applications"
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              >
                                {user?.userType === "worker"
                                  ? "My Applications"
                                  : "Applications Received"}
                              </Link>
                            </li>
                            <li>
                              <Link
                                to="/contracts"
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              >
                                My Contracts
                              </Link>
                            </li> */}
                            <li>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLogout(e);
                                }}
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 cursor-pointer"
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

              {/* Mobile Messages & Notifications */}
              {!showAuthButtons && (
                <div className="flex md:hidden items-center gap-1">
                  <Link to="/chat" onClick={() => setUnreadCount(0)} className="relative">
                    <Mail className="w-6 h-6 text-gray-700 hover:text-blue-500 cursor-pointer" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] leading-3 px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <Bell
                      className="w-6 h-6 text-gray-700 hover:text-blue-500 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotifications((prev) => !prev);
                      }}
                    />

                    {showNotifications && (
                      <div
                        ref={notificationRef}
                        className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-50"
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
                  </div>
                </div>
              )}


              <button
                type="button"
                className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                aria-controls="navbar-sticky"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                ref={burgerButtonRef}
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
              className={`pb-4 justify-between w-full md:flex md:w-auto md:order-1 ${isOpen ? "block" : "hidden"
                } bg-white`}
              id="navbar-sticky"
              ref={navMenuRef}
            >
              <ul className="flex flex-col p-4 md:p-0 mt-4 font-regular border border-gray-100 rounded-lg md:space-x-8 rtl:space-x-reverse md:flex-row bg-[#f4f6f6] text-left relative">
                {/* Mobile Profile Avatar beside first link */}
                {!showAuthButtons && (
                  <div className="absolute right-4 top-3 md:hidden" ref={profileDropdownMobileRef}>
                    <img
                      src={
                        user?.image ||
                        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                      }
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover cursor-pointer"
                      onClick={() => setShowDropdown(!showDropdown)}
                    />

                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <ul className="py-2 text-sm text-gray-700">
                          <li>
                            <button
                              onClick={(e) => goToProfile(e)}
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
                )}

                <li>
                  <Link
                    onClick={() => setIsOpen(false)}
                    to="/find-work"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/find-work")
                      ? "text-sky-500"
                      : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                      }`}
                  >
                    Find Work
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={() => setIsOpen(false)}
                    to="/find-workers"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/find-workers")
                      ? "text-sky-500"
                      : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                      }`}
                  >
                    Find Worker
                  </Link>
                </li>
                <li>
                  <Link
                    onClick={() => setIsOpen(false)}
                    to="/ads"
                    className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/ads")
                      ? "text-sky-500"
                      : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                      }`}
                  >
                    Advertisement
                  </Link>
                </li>

                {user && (
                  <>
                    <li>
                      <Link
                        onClick={() => setIsOpen(false)}
                        to="/applications"
                        className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/applications")
                          ? "text-sky-500"
                          : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                          }`}
                      >
                        {user?.userType === "worker"
                          ? "Applications"
                          : "Applications"}
                      </Link>
                    </li>
                    <li>
                      <Link
                        onClick={() => setIsOpen(false)}
                        to="/contracts"
                        className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/contracts")
                          ? "text-sky-500"
                          : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"
                          }`}
                      >
                        My Contracts
                      </Link>
                    </li>
                  </>
                )}

              </ul>
            </nav>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
