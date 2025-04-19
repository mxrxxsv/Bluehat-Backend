import React, { useState, useRef, useEffect } from "react";

const ChatPage = () => {

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const sidebarRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                sidebarRef.current &&
                !sidebarRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsSidebarOpen(false);
                setDropdownOpen(false);
            }
        };


        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const messages = [
        {
            name: 'Bonnie Green',
            time: '11:46',
            content: 'Hello',
            status: 'Delivered',
            sender: "other",
        },
        {
            name: 'Bonnie Green',
            time: '11:56',
            content: 'Pwede ka ba gumawa ng april 12? ipapagawa ko sana TV ko ayaw gumana.',
            status: 'Delivered',
            sender: "other",
        },
        {
            name: 'You',
            time: '12:23',
            content: 'Hi',
            status: 'Sent',
            sender: "me",
        },
        {
            name: 'You',
            time: '12:23',
            content: 'Sure! I’m available on April 12.',
            status: 'Sent',
            sender: "me",
        },
        {
            name: 'You',
            time: '12:23',
            content: 'ano po ba sira ng TV niyo?',
            status: 'Sent',
            sender: "me",
        }

    ];

    const handleToggleDropdown = (index) => {
        setDropdownOpen(dropdownOpen === index ? null : index);
    };



    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const openModal = (e) => {
        e.preventDefault();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    return (
        <>
            {/* <div className="mt-23 md:mt-0 ml-6 md:ml-10 ,w-70 md:w-10 flex flex-row">
                <p className="text-[32px] font-medium text-sky-500">Message</p>

                <button className="ml-25 md:ml-300 p-3 bg-sky-500 rounded-[12px] text-[#f6f6f6] cursor-pointer shadow-sm"
                    onClick={openModal}
                >Hire Now</button>
            </div> */}

            <div className="flex flex-row mt-30">
                <p className="text-[32px] text-left font-medium text-sky-500  pl-6 md:pl-13">Message</p>

                <button className="ml-4 md:ml-300 p-3 bg-sky-500 rounded-[12px] text-[#f6f6f6] cursor-pointer shadow-sm z-30"
                    onClick={openModal}
                >Hire Now</button>
            </div>

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="relative right-42 p-2 mt-2 ms-3 text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 z-35"
            >
                <span className="sr-only">Open sidebar</span>
                <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        clipRule="evenodd"
                        fillRule="evenodd"
                        d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
                    />
                </svg>
            </button>


            <aside
                ref={sidebarRef}
                id="default-sidebar"
                className={`absolute top-50 md:top-48 left-0 z-40 w-full md:w-65 h-134 transition-transform bg-white md:bg-[#f4f6f6] md:opacity-100 opacity-98 shadow-md ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full' 
                    } sm:translate-x-0 overflow-clip`}
                aria-label="Sidebar"
            >
                <div class="h-full px-3 overflow-y-auto">
                    <ul class="space-y-2 font-medium">

                        <li>
                            <a href="#" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-dark hover:bg-blue-200 group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>

                                <span class="flex-1 ms-3 whitespace-nowrap">Bonnie Green</span>
                                <span class="inline-flex items-center justify-center w-3 h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">2</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-dark hover:bg-blue-200 group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>

                                <span class="flex-1 ms-3 whitespace-nowrap">Mike</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-dark hover:bg-blue-200 group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>

                                <span class="flex-1 ms-3 whitespace-nowrap">Kenneth</span>
                            </a>
                        </li>
                        <li>
                            <a href="#" class="flex items-center p-2 text-gray-900 rounded-lg dark:text-dark hover:bg-blue-200 group">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>

                                <span class="flex-1 ms-3 whitespace-nowrap">Paul</span>
                            </a>
                        </li>


                    </ul>
                </div>
            </aside>


            <div class="p-4 sm:ml-64 overflow-hidden">
          
                    <div className="h-[300px] md:h-[400px] overflow-y-auto px-2">

                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-2.5 mb-4 relative ${msg.sender === 'me' ? 'justify-end text-left' : ''}`}>
                                <div className="flex flex-col gap-1 w-full max-w-[320px]">
                                    <div className={`flex items-center space-x-2 rtl:space-x-reverse ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                                        <span className={`text-sm font-semibold ${msg.sender === 'me' ? 'text-black' : 'text-gray-900'}`}>
                                            {msg.sender === 'me' ? 'You' : msg.name}
                                        </span>
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{msg.time}</span>
                                    </div>
                                    <div className={`flex flex-col leading-1.5 p-4 border-gray-200 ${msg.sender === 'me' ? 'bg-gray-200 rounded-s-xl rounded-ee-xl' : 'bg-sky-500 rounded-e-xl rounded-es-xl'}`}>
                                        <p className={`text-sm font-normal text-left ${msg.sender === 'me' ? 'text-gray-900 dark:text-black' : 'text-white'}`}>{msg.content}</p>
                                    </div>
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{msg.status}</span>
                                </div>

                                <button
                                    onClick={() => handleToggleDropdown(index)}
                                    className="inline-flex self-center items-center p-2 text-sm font-medium text-center text-gray-900 rounded-lg cursor-pointer"
                                    type="button"
                                >
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 4 15">
                                        <path d="M3.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6.041a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5.959a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
                                    </svg>
                                </button>

                                {dropdownOpen === index && (
                                    <div ref={dropdownRef} className={`absolute ${msg.sender === 'me' ? 'md:left-130' : ''} right-10 top-5 md:right-130 md:top-5 z-10 bg-white divide-y divide-gray-100 rounded-lg shadow-sm w-40 dark:bg-gray-700 dark:divide-gray-600`}>
                                        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                                            {['Reply', 'Forward', 'Copy', 'Report', 'Delete'].map((action, i) => (
                                                <li key={i}>
                                                    <button
                                                        onClick={() => {
                                                            console.log(`${action} clicked for message index ${index}`);
                                                            setDropdownOpen(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                                                    >
                                                        {action}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}


                        {/*  */}

                </div>

                <div className="bg-white h-16 md:w-240 p-2 m-2 rounded-[30px] shadow-md md:mx-0">

                    <form class="flex items-center max-w-sm">
                        <div class="relative w-full">
                            <input type="text" id="simple-search" class="bg-gray-50 text-gray-900 text-sm block w-full md:w-220 ps-10 p-2.5 text-[16px] rounded-[20px]" placeholder="Write your message" required />
                        </div>
                        <button type="submit" class="md:ml-125 p-2.5 ms-2 text-sm font-medium text-white bg-sky-600 rounded-[100px] border hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>

                </div>
            </div>


            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-white bg-opacity-80">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-11/12 max-w-md text-center">
                        <h2 className="text-xl font-semibold mb-4">Hire this worker?</h2>
                        <p className="mb-6 text-gray-600">A confirmation from the worker is needed to complete the hiring process.</p>
                        <div className="flex justify-center gap-4">

                            <button
                                onClick={closeModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg shadow-sm"
                            >
                                Not now
                            </button>

                            <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg shadow-sm">
                                Yes
                            </button>

                        </div>
                    </div>
                </div>
            )}

        </>
    );

}

export default ChatPage;