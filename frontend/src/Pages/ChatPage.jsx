import { io } from "socket.io-client";
import React, { useState, useRef, useEffect } from "react";
import {
    getConversations,
    createOrGetConversation,
    getMessages,
    sendMessageREST,
    getUserInfo,
    updateMessageREST,
    deleteMessageREST
} from "../api/message.jsx";
import { useParams, useLocation } from "react-router-dom";
import { checkAuth } from "../api/auth.jsx";



const ChatPage = () => {
    const { contactId } = useParams();
    const location = useLocation();

    const messagesEndRef = useRef(null);


    const [contactNames, setContactNames] = useState({});
    const [contactProfiles, setContactProfiles] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const sidebarRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const socket = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [selectedContactId, setSelectedContactId] = useState(contactId || null);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const [currentUser, setCurrentUser] = useState(null);

    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [messageMenuOpen, setMessageMenuOpen] = useState(null);



    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ---------- Helpers ----------
    const idToString = (id) => {
        if (!id) return null;
        if (typeof id === "string") return id;
        if (typeof id === "object") {
            if ("_id" in id) return String(id._id);
            if (typeof id.toHexString === "function") return id.toHexString();
            try {
                return String(id);
            } catch {
                return null;
            }
        }
        return String(id);
    };

    const getCredentialIdFromUser = (user) => {
        if (!user) return null;
        if (user.credentialId) return idToString(user.credentialId);
        if (user._id) return idToString(user._id);
        if (user.id) return String(user.id);
        return null;
    };

    // ---------- socket.io ----------
    useEffect(() => {
        socket.current = io("http://localhost:5000", { withCredentials: true });

        socket.current.on("receiveMessage", (msg) => {
            if (!msg) return;
            const convId = idToString(msg.conversationId);

            if (convId === idToString(currentConversationId)) {
                setMessages((prev) => {
                    if (!prev.some((m) => idToString(m._id) === idToString(msg._id))) {
                        return [...prev, msg];
                    }
                    return prev;
                });
            } else {
                setConversations((prevConvs) =>
                    prevConvs.map((c) =>
                        idToString(c._id) === convId
                            ? { ...c, lastMessage: msg, unread: (c.unread || 0) + 1 }
                            : c
                    )
                );
            }

            setConversations((prevConvs) => {
                const updated = prevConvs.map((c) =>
                    idToString(c._id) === convId
                        ? { ...c, lastMessage: msg, updatedAt: new Date().toISOString() }
                        : c
                );
                return [...updated].sort(
                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                );
            });
        });

        return () => {
            socket.current.disconnect();
        };
    }, [currentConversationId]);

    // ---------- init current user + conversations ----------
    useEffect(() => {
        const init = async () => {
            try {
                const userRes = await checkAuth();
                const user = userRes?.data?.data;
                setCurrentUser(user || null);

                const myCredId = getCredentialIdFromUser(user);

                // 🟢 Register this user to the socket connection
                if (myCredId && socket.current) {
                    socket.current.emit("registerUser", myCredId);
                    console.log("✅ Registered user to socket:", myCredId);
                }

                if (myCredId) socket.current.emit("registerUser", currentConversationId);

                const res = await getConversations();
                const convArray = Array.isArray(res?.data?.data) ? res.data.data : [];

                const mapped = convArray.map((conv) => {
                    const me = conv.participants.find(
                        (p) => idToString(p.credentialId) === myCredId
                    );
                    const other =
                        conv.participants.find(
                            (p) => idToString(p.credentialId) !== myCredId
                        ) || conv.participants[0];

                    return {
                        ...conv,
                        me,
                        other,
                        _id: idToString(conv._id),
                    };
                });

                setConversations(mapped);

                if (contactId) {
                    setSelectedContactId(contactId);
                } else if (mapped.length > 0) {
                    setSelectedContactId(idToString(mapped[0].other?.credentialId));
                } else {
                    setSelectedContactId(null);
                }
            } catch (err) {
                console.error("Init chat failed:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [contactId]);

    // ---------- fetch display names ----------
    useEffect(() => {

        const fetchProfiles = async () => {
            const toFetch = [];
            for (const conv of conversations) {
                const otherCred = idToString(conv.other?.credentialId);
                if (otherCred && !contactProfiles[otherCred]) toFetch.push(otherCred);
            }
            if (!toFetch.length) return;

            const results = await Promise.all(
                toFetch.map((credId) =>
                    getUserInfo(credId)
                        .then((r) => ({
                            credId,
                            name: r?.data?.data?.user?.fullName || "Unnamed",
                            profilePicture: r?.data?.data?.user?.profilePicture || null,
                        }))
                        .catch(() => ({ credId, name: "Unnamed", profilePicture: null }))
                )
            );

            const namesMap = {};
            const profilesMap = {};
            for (const r of results) {
                namesMap[r.credId] = r.name;
                profilesMap[r.credId] = r.profilePicture;
            }

            setContactNames((prev) => ({ ...prev, ...namesMap }));
            setContactProfiles((prev) => ({ ...prev, ...profilesMap }));
        };

        fetchProfiles();
    }, [conversations]);


    // ---------- select/create conversation ----------
    useEffect(() => {
        const initConversation = async () => {
            if (!selectedContactId) {
                setCurrentConversationId(null);
                setMessages([]);
                return;
            }

            // Find existing conversation metadata
            const existingConv = conversations.find(
                (c) => idToString(c.other?.credentialId) === selectedContactId
            );

            if (existingConv) {
                setCurrentConversationId(idToString(existingConv._id));
                // Fetch messages for this conversation
                try {
                    const msgsRes = await getMessages(existingConv._id);
                    const msgs = Array.isArray(msgsRes?.data?.data) ? msgsRes.data.data : [];
                    setMessages(msgs);
                } catch (err) {
                    console.error("Failed to fetch messages:", err);
                    setMessages([]);
                }
                return;
            }

            // Create or get conversation from backend
            try {
                const res = await createOrGetConversation({
                    participantCredentialId: selectedContactId,
                    participantUserType: "client",
                });

                const conv = res?.data?.data;
                if (!conv?._id) return;

                setCurrentConversationId(idToString(conv._id));

                const msgsRes = await getMessages(conv._id);
                const msgs = Array.isArray(msgsRes?.data?.data) ? msgsRes.data.data : [];
                setMessages(msgs);

                // Add conversation metadata to conversations state
                setConversations((prev) => {
                    if (prev.some(c => idToString(c._id) === idToString(conv._id))) return prev;
                    return [...prev, conv];
                });

            } catch (err) {
                console.error("Load conversation failed:", err);
            }
        };

        initConversation();
    }, [selectedContactId]);


    // ---------- join socket room when conversation changes ----------
    useEffect(() => {
        if (currentConversationId && socket.current) {
            socket.current.emit("joinConversation", currentConversationId);
        }
    }, [currentConversationId]);


    // ---------- send message ----------
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContactId || !currentConversationId) return;

        if (editingMessageId) {
            // Editing existing message
            try {
                const res = await updateMessageREST(editingMessageId, { content: newMessage });
                const updatedMessage = res?.data?.data;
                setMessages((prev) =>
                    prev.map((m) => (idToString(m._id) === idToString(editingMessageId) ? updatedMessage : m))
                );
                socket.current.emit("editMessage", updatedMessage);
            } catch (err) {
                console.error("Failed to update message:", err);
            } finally {
                setEditingMessageId(null);
                setEditContent("");
                setNewMessage("");
            }
            return;
        }

        try {
            const msgData = {
                toCredentialId: selectedContactId,
                content: newMessage,
                conversationId: currentConversationId,
            };

            const saved = await sendMessageREST(msgData);
            const sent = saved?.data?.data?.message;
            if (!sent) return;

            const optimistic = { ...sent, _id: Date.now().toString() };
            setMessages((prev) => [...prev, optimistic]);

            setConversations((prevConvs) =>
                prevConvs.map((c) =>
                    idToString(c._id) === idToString(currentConversationId)
                        ? { ...c, lastMessage: optimistic }
                        : c
                )
            );

            socket.current.emit("sendMessage", sent);
            setNewMessage("");
        } catch (err) {
            console.error("Send message failed:", err);
        }
    };

    // ---------- Update and Delete handler ---------- 

    // Update message
    const handleUpdateMessage = async (messageId) => {
        if (!editContent.trim()) return;
        try {
            const res = await updateMessageREST(messageId, { content: editContent });
            const updatedMessage = res?.data?.data;
            setMessages((prev) =>
                prev.map((m) => (idToString(m._id) === idToString(messageId) ? updatedMessage : m))
            );
            setEditingMessageId(null);
            setEditContent("");
            socket.current.emit("editMessage", updatedMessage);
        } catch (err) {
            console.error("Failed to update message:", err);
        }
    };

    // Delete message
    const handleDeleteMessage = async (messageId) => {
        try {
            await deleteMessageREST(messageId);
            setMessages((prev) => prev.filter((m) => idToString(m._id) !== idToString(messageId)));
            socket.current.emit("deleteMessage", { _id: messageId, conversationId: currentConversationId });
        } catch (err) {
            console.error("Failed to delete message:", err);
        }
    };



    // ---------- click outside ----------
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                sidebarRef.current &&
                !sidebarRef.current.contains(e.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setIsSidebarOpen(false);
                setDropdownOpen(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) return <div className="text-center mt-10">Loading chat...</div>;

    const openModal = (e) => {
        e.preventDefault();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };





    return (
        <>
            {/* SIDEBAR */}
            <aside
                ref={sidebarRef}
                className={`absolute top-55 md:top-48 left-0 z-40 w-full md:w-65 h-134 transition-transform bg-white md:bg-[#f4f6f6] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } sm:translate-x-0 overflow-clip h-full md:h-[500px]`}
                aria-label="Sidebar"
            >
                <div className="h-full px-3 overflow-y-auto">
                    <ul className="space-y-2 font-medium">
                        {conversations.map((conv) => {
                            const otherCred = idToString(conv?.other?.credentialId);
                            const name = contactNames[otherCred] || "Unnamed";
                            const profile = contactProfiles[otherCred]?.url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

                            return (
                                <li key={conv._id}>
                                    <button
                                        onClick={() => setSelectedContactId(otherCred)}
                                        className={`flex items-center w-full p-3 text-gray-900 rounded-lg border-b-2 border-gray-300 hover:bg-[#f0f0f0] hover:shadow-sm cursor-pointer ${selectedContactId === otherCred ? "bg-gray-100" : ""}`}
                                    >
                                        <img
                                            src={profile}
                                            alt={name}
                                            className="w-8 h-8 rounded-full mr-2 object-cover"
                                        />
                                        {name}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>

            {/* MAIN CHAT AREA */}
            <div className="w-full h-full">
                <div className="flex flex-row items-center justify-between mt-8 px-6 md:px-12 mt-30">
                    <p className="text-[24px] md:text-[32px] font-medium text-sky-500">Message</p>
                    {currentUser?.userType === "client" && (
                        <button
                            className="p-2 bg-sky-500 rounded-[12px] text-white cursor-pointer shadow-sm"
                            onClick={() => setShowModal(true)}
                        >
                            Hire Now
                        </button>
                    )}
                </div>

                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="relative right-42 p-2 mt-2 ms-3 text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 z-35"
                >
                    <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            clipRule="evenodd"
                            fillRule="evenodd"
                            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 
                            10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 
                            1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 
                            0 01.75-.75h14.5a.75.75 0 010 
                            1.5H2.75A.75.75 0 012 10z"
                        />
                    </svg>
                </button>

                {/* CHAT MESSAGES */}
                <div className="p-4 sm:ml-64 overflow-hidden">
                    <div className="h-full md:h-[400px] overflow-y-auto px-2">
                        {messages.map((msg, index) => {
                            const senderCred = idToString(msg?.sender?.credentialId);
                            const currentCred = getCredentialIdFromUser(currentUser);
                            const isMe = senderCred && currentCred && senderCred === currentCred;
                            return (
                                <div
                                    key={index}
                                    className={`flex items-start gap-2.5 mb-4 ${isMe ? "justify-end" : ""}`}
                                >
                                    {!isMe && (
                                        <img
                                            src={contactProfiles[idToString(msg?.sender?.credentialId)]?.url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
                                            alt={contactNames[idToString(msg?.sender?.credentialId)] || "Unnamed"}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    )}
                                    <div className={`flex flex-col gap-1 max-w-[320px] ${isMe ? "items-end" : "items-start"}`}>
                                        <div className="flex items-center justify-between space-x-2">
                                            <span className={`text-sm font-semibold ${isMe ? "text-black" : "text-gray-900"}`}>
                                                {isMe ? "You" : contactNames[idToString(msg?.sender?.credentialId)] || "Unnamed"}
                                            </span>

                                            {/* Three-dot menu */}
                                            {isMe && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setMessageMenuOpen(messageMenuOpen === index ? null : index)}
                                                        className="text-gray-400 hover:text-gray-600 px-2"
                                                    >
                                                        &#x22EE; {/* Vertical ellipsis */}
                                                    </button>
                                                    {messageMenuOpen === index && (
                                                        <div className="absolute right-0 top-6 bg-white shadow-lg rounded-md z-50">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingMessageId(msg._id);
                                                                    setEditContent(msg.content);
                                                                    setNewMessage(msg.content);
                                                                    setMessageMenuOpen(null);
                                                                }}
                                                                className="block px-4 py-2 hover:bg-gray-100 w-full text-left cursor-pointer"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg._id)}
                                                                className="block px-4 py-2 hover:bg-gray-100 w-full text-left text-red-600 cursor-pointer"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Content / Edit Input */}
                                        <div className={`inline-block leading-1.5 p-4 ${isMe ? "bg-sky-500 rounded-s-xl rounded-ee-xl self-end" : "bg-gray-200 rounded-e-xl rounded-es-xl self-start"}`}>
                                            {editingMessageId === msg._id ? (
                                                <div className="flex items-center gap-2">
                                                    {/* <input
                                                        type="text"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="px-2 py-1 rounded-md flex-1 outline-none text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateMessage(msg._id)}
                                                        className="text-sky-500 font-semibold text-sm"
                                                    >
                                                        Save
                                                    </button> */}
                                                    <button
                                                        onClick={() => {
                                                            setEditingMessageId(null); 
                                                            setEditContent("");         
                                                            setNewMessage("");          
                                                        }}
                                                        className="text-white font-semibold text-sm"
                                                    >
                                                        Cancel
                                                    </button>

                                                </div>
                                            ) : (
                                                <p className={`text-sm font-normal ${isMe ? "text-white" : "text-gray-900"}`}>
                                                    {msg.content}
                                                </p>
                                            )}
                                        </div>

                                        <span className="text-[12px] font-normal text-gray-500">
                                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                        </span>
                                    </div>
                                </div>


                            );
                        })}

                        {/* Scroll anchor */}
                        <div ref={messagesEndRef}></div>
                    </div>

                    {/* INPUT */}
                    <div className="bg-white h-16 w-full p-2 m-2 rounded-[30px] shadow-md md:mx-0 md:mt-12">
                        <form onSubmit={handleSendMessage} className="flex items-center w-full">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={editingMessageId ? "Edit your message..." : "Type your message..."}
                                className="flex-1 px-4 py-2 border-none outline-none rounded-[30px]"
                            />

                            <button
                                type="submit"
                                className="ml-2 p-2.5 text-sm font-medium text-white bg-sky-600 rounded-full border hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 flex items-center justify-center cursor-pointer"
                            >
                                {editingMessageId ? "Save" : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                )}
                            </button>

                        </form>
                    </div>
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
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg shadow-sm cursor-pointer"
                            >
                                Not now
                            </button>

                            <button className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg shadow-sm cursor-pointer">
                                Yes
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatPage;
