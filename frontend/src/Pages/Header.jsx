import { Bell, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from '../assets/BlueHat_logo.png';
import profile from '../assets/client.png';

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


  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;


  const authPages = ["/home", "/"];
  const opPages = ["/signup", "/login"];
  // const authPages = ["/HomePage", "/FindWork", "/JobDetail", "/FindWorker", "/AdsPage", "/WorkerPortfolio", "/ChatPage"];
  const showAuthButtons = authPages.includes(currentPath);
  const hideOp = opPages.includes(currentPath);

  return (
    // <header className="w-full bg-white shadow">
    //   <div className="w-full px-6 py-3 flex items-center justify-between">
    //     {/* Left - Logo */}
    //     <div className="flex items-center gap-2">
    //       <img src={logo} alt="Logo" className="h-8 w-8" />
    //       <span className="font-semibold text-lg">Fixit</span>
    //     </div>

    //     {/* Center - Navigation Links */}
    //     <nav className="hidden md:flex gap-6 text-gray-700">
    //       <Link to="/find-work" className="hover:text-blue-600">
    //         Find Work
    //       </Link>
    //       <Link to="/find-workers" className="hover:text-blue-600">
    //         Find Workers
    //       </Link>
    //       <Link to="/ads" className="hover:text-blue-600">
    //         Advertisement
    //       </Link>
    //     </nav>

    //     {/* Right - Icons and User Info */}
    //     <div className="flex items-center gap-4 relative">
    //       <Mail className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
    //       <Bell
    //         className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer"
    //         onClick={handleNotificationClick} // Handle Bell icon click
    //       />

    //       {/* Notification dropdown */}
    //       {showNotifications && (
    //         <div className="absolute right-30 mt-70 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-10">
    //           <div className="p-4 text-sm text-gray-700">
    //             <p className="font-semibold mb-2">Notifications</p>
    //             <ul className="space-y-2">
    //               {notifications.map((notification, index) => (
    //                 <li
    //                   key={index}
    //                   className="p-2 hover:bg-gray-100 rounded-md text-left"
    //                 >
    //                   {notification}
    //                 </li>
    //               ))}
    //             </ul>
    //           </div>
    //         </div>
    //       )}

    //       <div className="flex items-center gap-2">
    //         <span className="text-gray-700 font-medium">
    //           Chlyde Adrian Benavidez
    //         </span>
    //         <img
    //           src="/user-profile.jpg"
    //           alt="Profile"
    //           className="h-8 w-8 rounded-full object-cover"
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </header>


    <header className="w-full z-20 top-0 start-0 pt-4 fixed top-0 bg-[#f4f6f6]">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto pt-4 p-2">
        <Link to="/home" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src={logo} className="h-15 w-28 md:h-20 md:w-40" alt="Flowbite Logo" />
        </Link>

        {hideOp ? (
          <>

          </>
        ) : (
          <>

            <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">

              {showAuthButtons ? (
                <>
                  <div className="w-25 pt-1 md:pt-0 md:w-43 flex flex-row gap-5 md:gap-2 hidden md:flex">
                    <Link to="/login" className='hidden md:block text-[#252525] mr-4 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-3 py-2 text-center border-2 border-sky-400 rounded-[20px] shadow-xs hover:bg-sky-400 hover:text-white cursor-pointer hover:shadow-md'>Log in</Link>
                    <Link
                      to="/signup"
                      className="text-white bg-sky-500 hover:bg-sky-400 focus:ring-1 focus:outline-none focus:ring-blue-300 font-medium rounded-[10px] text-sm px-3 py-2 shadow-xs hover:shadow-md"
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
                      <div className="absolute right-30 mt-10 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-100">
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
                      User
                    </span>
                    <img
                      src={profile}
                      alt="Profile"
                      className="pb-2 h-8 w-8 rounded-full object-cover"
                    />


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
                <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15" />
                </svg>
              </button>
            </div>
            <nav className={`items-left pb-4 justify-between w-full md:flex md:w-auto md:order-1 ${isOpen ? "block" : "hidden"} bg-white`} id="navbar-sticky">
              <ul className="flex flex-col p-4 md:p-0 mt-4 font-regular border border-gray-100 rounded-lg md:space-x-8 rtl:space-x-reverse md:flex-row bg-[#f4f6f6]">
                <li>
                  <Link to="/find-work" className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/find-work")
                    ? "text-sky-500"
                    : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"}`}
                  >Find Work</Link>
                </li>
                <li>
                  <Link to="/find-workers" className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/find-workers")
                    ? "text-sky-500"
                    : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"}`}
                  >Find Worker</Link>
                </li>
                <li>
                  <Link to="/ads" className={`block py-2 px-3 rounded-sm md:p-0 ${isActive("/ads")
                    ? "text-sky-500"
                    : "text-neutral-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-sky-500"}`}
                  >Advertisement</Link>
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
