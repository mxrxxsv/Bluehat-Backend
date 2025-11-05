import { io } from "socket.io-client";
import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessageREST,
  getUserInfo,
  updateMessageREST,
  deleteMessageREST,
} from "../api/message.jsx";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getProfile } from "../api/profile.jsx";
import {
  getClientContracts,
  getWorkerContracts,
  startWork as startWorkAPI,
  completeWork as completeWorkAPI,
  confirmWorkCompletion as confirmWorkCompletionAPI,
} from "../api/feedback.jsx";
import { markApplicationAgreement as markApplicationAgreementAPI } from "../api/jobApplication.jsx";
import {
  markInvitationAgreement as markInvitationAgreementAPI,
  getMyInvitations,
  getMySentInvitations,
} from "../api/applications.jsx";
import { baseURL } from "../utils/appMode";

const ChatPage = () => {
  const { contactId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);

  const [contactNames, setContactNames] = useState({});
  const [contactProfiles, setContactProfiles] = useState({});
  const [contactProfileIds, setContactProfileIds] = useState({});
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
  const [contractBanner, setContractBanner] = useState(null);
  const [contracts, setContracts] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [messageMenuOpen, setMessageMenuOpen] = useState(null);
  // Transient toast after clicking "I Agree"
  const [showAgreeToast, setShowAgreeToast] = useState(false);
  const [agreeToastMessage, setAgreeToastMessage] = useState("");
  const agreeToastTimer = useRef(null);

  // Pull agreement context from navigation state or sessionStorage (fallback)
  const agreementContextFromState =
    (location.state && location.state.agreementContext) || null;
  let persistedAgreementContext = null;
  try {
    const raw = sessionStorage.getItem("chatAgreementContext");
    if (raw) persistedAgreementContext = JSON.parse(raw);
  } catch (_) { }
  const agreementContext =
    agreementContextFromState || persistedAgreementContext;
  const hasAgreement = Boolean(agreementContext);
  // Allow forcibly suppressing the discussion banner once a contract is detected
  const [suppressAgreementBanner, setSuppressAgreementBanner] = useState(false);
  const showAgreementBanner =
    hasAgreement && !contractBanner && !suppressAgreementBanner;
  // Track whether current user already agreed (persist per context)
  const [selfAgreed, setSelfAgreed] = useState(false);
  const getSelfAgreedKey = (ctx) =>
    ctx ? `chatAgreementSelfAgreed:${ctx.kind}:${ctx.id}` : null;
  useEffect(() => {
    if (!hasAgreement) return;
    try {
      const key = getSelfAgreedKey(agreementContext);
      if (key) {
        const v = sessionStorage.getItem(key);
        const agreed = v === "true";
        setSelfAgreed(agreed);
        // If user already agreed previously, suppress the banner immediately
        if (agreed) setSuppressAgreementBanner(true);
      }
    } catch (_) { }
  }, [hasAgreement, agreementContext?.kind, agreementContext?.id]);

  // Note: Do not clear persisted agreement context immediately; keep it to ensure banner persists across async re-renders.

  useEffect(() => {
    // Keep sidebar closed on mobile by default; open on desktop when no banners/toasts
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (
      contractBanner ||
      showAgreeToast ||
      agreeToastMessage ||
      showAgreementBanner
    ) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(!isMobile);
    }
  }, [contractBanner, showAgreeToast, agreeToastMessage, showAgreementBanner]);

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
    socket.current = io(baseURL, { withCredentials: true });

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

    // Listen for editMessage
    socket.current.on("editMessage", (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) =>
          idToString(m._id) === idToString(updatedMsg._id) ? updatedMsg : m
        )
      );
    });

    // Listen for deleteMessage
    socket.current.on("deleteMessage", (deleted) => {
      setMessages((prev) =>
        prev.filter((m) => idToString(m._id) !== idToString(deleted._id))
      );
    });

    return () => {
      socket.current.disconnect();
    };
  }, [currentConversationId]);

  // ---------- init current user + conversations ----------
  useEffect(() => {
    const init = async () => {
      try {
  const userRes = await getProfile();
        const user = userRes?.data?.data;
        setCurrentUser(user || null);

        const myCredId = getCredentialIdFromUser(user);

        // 🟢 Register this user to the socket connection
        if (myCredId && socket.current) {
          socket.current.emit("registerUser", myCredId);
        }

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

        // Prefer explicit target from navigation state
        const st = location.state || {};
        if (st?.targetCredentialId) {
          setSelectedContactId(String(st.targetCredentialId));
        } else if (contactId) {
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

  // ---------- load contracts for banner ----------
  useEffect(() => {
    const loadContracts = async () => {
      try {
        if (!currentUser) return;
        const list =
          currentUser.userType === "client"
            ? await getClientContracts()
            : await getWorkerContracts();
        setContracts(list || []);

        const st = location.state || {};
        if (st.contractId) {
          const c = (list || []).find(
            (x) => String(x._id) === String(st.contractId)
          );
          if (c) setContractBanner(c);
          return;
        }

        if (selectedContactId) {
          const filtered = (list || []).filter((c) => {
            const otherCredId =
              currentUser.userType === "client"
                ? c.workerId?.credentialId
                : c.clientId?.credentialId;
            return (
              otherCredId && String(otherCredId) === String(selectedContactId)
            );
          });
          filtered.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setContractBanner(filtered[0] || null);
        }
      } catch (e) {
        console.warn("Failed to load contracts for banner:", e);
      }
    };
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, selectedContactId]);

  // Helper to refresh contracts on demand (e.g., after agreeing)
  const refreshContracts = async () => {
    try {
      if (!currentUser) return;
      const list =
        currentUser.userType === "client"
          ? await getClientContracts()
          : await getWorkerContracts();
      setContracts(list || []);

      const st = location.state || {};
      if (st.contractId) {
        const c = (list || []).find(
          (x) => String(x._id) === String(st.contractId)
        );
        if (c) {
          setContractBanner(c);
          return c;
        }
      }

      if (selectedContactId) {
        const filtered = (list || []).filter((c) => {
          const otherCredId =
            currentUser.userType === "client"
              ? c.workerId?.credentialId
              : c.clientId?.credentialId;
          return (
            otherCredId && String(otherCredId) === String(selectedContactId)
          );
        });
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const found = filtered[0] || null;
        setContractBanner(found);
        return found;
      }
      return null;
    } catch (e) {
      console.warn("Failed to refresh contracts:", e);
      return null;
    }
  };

  // When a contract appears, clear any persisted agreement flags so UI moves to contract banner cleanly
  useEffect(() => {
    if (contractBanner) {
      // Suppress discussion banner as soon as a contract is present
      setSuppressAgreementBanner(true);
      try {
        sessionStorage.removeItem("chatAgreementContext");
        const key = getSelfAgreedKey(agreementContext);
        if (key) sessionStorage.removeItem(key);
      } catch (_) { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractBanner]);

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
              profileId: r?.data?.data?.user?._id || null,
            }))
            .catch(() => ({ credId, name: "Unnamed", profilePicture: null }))
        )
      );

      const namesMap = {};
      const profilesMap = {};
      const profileIdsMap = {};
      for (const r of results) {
        namesMap[r.credId] = r.name;
        profilesMap[r.credId] = r.profilePicture;
        if (r.profileId) profileIdsMap[r.credId] = r.profileId;
      }

      setContactNames((prev) => ({ ...prev, ...namesMap }));
      setContactProfiles((prev) => ({ ...prev, ...profilesMap }));
      if (Object.keys(profileIdsMap).length) {
        setContactProfileIds((prev) => ({ ...prev, ...profileIdsMap }));
      }
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
          const msgs = Array.isArray(msgsRes?.data?.data)
            ? msgsRes.data.data
            : [];
          setMessages(msgs);
        } catch (err) {
          console.error("Failed to fetch messages:", err);
          setMessages([]);
        }
        return;
      }

      // Create or get conversation from backend
      try {
        // determine participant user type based on current user
        let participantUserType = "client";
        if (currentUser?.userType === "client") participantUserType = "worker";
        if (currentUser?.userType === "worker") participantUserType = "client";

        const res = await createOrGetConversation({
          participantCredentialId: selectedContactId,
          participantUserType,
        });

        const conv = res?.data?.data;

        // Validate response
        if (!conv || !conv._id) {
          console.error("Failed to create or fetch conversation:", res);
          return; // stop further execution
        }

        const convId = idToString(conv._id);
        setCurrentConversationId(convId);

        // Fetch messages safely
        try {
          const msgsRes = await getMessages(convId);
          const msgs = Array.isArray(msgsRes?.data?.data)
            ? msgsRes.data.data
            : [];
          setMessages(msgs);
        } catch (msgErr) {
          console.error("Failed to fetch messages:", msgErr);
          setMessages([]);
        }

        // Add conversation metadata to conversations state
        setConversations((prev) => {
          if (prev.some((c) => idToString(c._id) === convId)) return prev;
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
    if (!newMessage.trim() || !selectedContactId || !currentConversationId)
      return;

    if (editingMessageId) {
      // Editing existing message
      try {
        const res = await updateMessageREST(editingMessageId, {
          content: newMessage,
        });
        const updatedMessage = res?.data?.data;
        setMessages((prev) =>
          prev.map((m) =>
            idToString(m._id) === idToString(editingMessageId)
              ? updatedMessage
              : m
          )
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
      if (!currentConversationId) {
        console.warn("Cannot send message: conversationId is null");
        return;
      }

      const msgData = {
        toCredentialId: selectedContactId,
        content: newMessage,
        conversationId: currentConversationId, // now guaranteed valid
      };

      const saved = await sendMessageREST(msgData);

      const sent = saved?.data?.data?.message;
      if (!sent) return;

      // Use the backend message directly
      setMessages((prev) => [...prev, sent]);

      setConversations((prevConvs) =>
        prevConvs.map((c) =>
          idToString(c._id) === idToString(currentConversationId)
            ? { ...c, lastMessage: sent }
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
        prev.map((m) =>
          idToString(m._id) === idToString(messageId) ? updatedMessage : m
        )
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
      setMessages((prev) =>
        prev.filter((m) => idToString(m._id) !== idToString(messageId))
      );
      socket.current.emit("deleteMessage", {
        _id: messageId,
        conversationId: currentConversationId,
      });
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

  // Cleanup toast timer when unmounting (must be before any conditional return to preserve hooks order)
  useEffect(() => {
    return () => {
      if (agreeToastTimer.current) clearTimeout(agreeToastTimer.current);
    };
  }, []);

  // Helper: Close discussion banner as soon as either party agrees
  const checkBothAgreedAndSuppress = async () => {
    if (!agreementContext) return false;
    try {
      if (agreementContext.kind === "application") {
        const resp = await axios.get(
          `${baseURL}/applications/debug/${agreementContext.id}`,
          { withCredentials: true }
        );
        const data = resp?.data?.data;
        // Close banner if either side has agreed (client or worker)
        const either = Boolean(data?.clientAgreed || data?.workerAgreed);
        if (either) {
          setSuppressAgreementBanner(true);
          try {
            sessionStorage.removeItem("chatAgreementContext");
            const key = getSelfAgreedKey(agreementContext);
            if (key) sessionStorage.removeItem(key);
          } catch (_) { }
          return true;
        }
      } else if (agreementContext.kind === "invitation") {
        if (!currentUser) return false;
        const list =
          currentUser.userType === "worker"
            ? await getMyInvitations()
            : await getMySentInvitations();
        const inv = (list || []).find(
          (x) => String(x._id || x.id) === String(agreementContext.id)
        );
        // Close banner if either side has agreed
        const either = Boolean(inv?.clientAgreed || inv?.workerAgreed);
        if (either) {
          setSuppressAgreementBanner(true);
          try {
            sessionStorage.removeItem("chatAgreementContext");
            const key = getSelfAgreedKey(agreementContext);
            if (key) sessionStorage.removeItem(key);
          } catch (_) { }
          return true;
        }
      }
    } catch (e) {
      console.warn("Agreement both-agreed check failed:", e);
    }
    return false;
  };

  // Periodically verify agreement while in discussion to auto-hide banner as soon as both agreed
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const loop = async () => {
      if (cancelled) return;
      if (!hasAgreement || suppressAgreementBanner || contractBanner) return;
      const closed = await checkBothAgreedAndSuppress();
      if (closed) {
        setTimeout(() => {
          try {
            refreshContracts();
          } catch (_) { }
        }, 250);
        return;
      }
      timer = setTimeout(loop, 1500);
    };
    loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasAgreement,
    agreementContext?.id,
    agreementContext?.kind,
    currentUser,
    selectedContactId,
    contractBanner,
    suppressAgreementBanner,
  ]);

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
        // duration-300
        className={`absolute top-50 md:top-48 left-0 z-10 w-full md:w-65 h-134 transition-transform bg-white/20 backdrop-blur-md border border-white/30 md:bg-[#f4f6f6] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } overflow-hidden h-[600px] md:h-[500px]`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 overflow-y-auto">
          <ul className="font-medium">
            {conversations.map((conv) => {
              const otherCred = idToString(conv?.other?.credentialId);
              const name = contactNames[otherCred] || "Unnamed";
              const profile =
                contactProfiles[otherCred]?.url ||
                "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

              return (
                <li key={conv._id}>
                  <button
                    onClick={() => {
                      setSelectedContactId(otherCred);

                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center w-full p-3 text-gray-900 rounded-md border-b-2 border-gray-300 hover:bg-[#f0f0f0] hover:shadow-sm text-left cursor-pointer ${selectedContactId === otherCred ? "bg-gray-100" : ""
                      }`}
                  >
                    <img
                      src={profile}
                      alt={name}
                      className="w-8 h-8 rounded-full mr-2 object-cover"
                    />
                    <span className="line-clamp-1">{name}</span>
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
          <div className="flex items-left flex-col ">
            <button
              onClick={() => navigate(-1)}
              className="md:hidden flex items-center gap-2 text-[#55b3f3] hover:text-sky-500 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <p className="text-[24px] md:text-[32px] font-medium text-sky-500">
              Message
            </p>
          </div>
          {/* {currentUser?.userType === "client" && (
                        <button
                            className="p-2 bg-sky-500 rounded-[12px] text-white cursor-pointer shadow-sm"
                            onClick={() => setShowModal(true)}
                        >
                            Hire Now
                        </button>
                    )} */}
        </div>

        <div className="flex items-center pl-4">
          {/* Sidebar Toggle Button */}
          {!contractBanner && !showAgreeToast && !agreeToastMessage && (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => {
                if (!contractBanner && !showAgreeToast && !agreeToastMessage) {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              disabled={contractBanner || showAgreeToast || agreeToastMessage}
              className={`p-2 rounded-lg sm:hidden focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200
                            ${contractBanner ||
                  showAgreeToast ||
                  agreeToastMessage
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-100"
                }`}
            >
              <svg
                className="w-6 h-6"
                aria-hidden="true"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 
                                    1.5H2.75A.75.75 0 012 4.75zm0 
                                    10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 
                                    1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 
                                    0 01.75-.75h14.5a.75.75 0 010 
                                    1.5H2.75A.75.75 0 012 10z"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Success toast after agreement */}
        {showAgreeToast && (
          <div className="p-4 sm:ml-64">
            <div className="bg-green-50 border border-green-200 rounded-xl shadow-sm p-3 mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-green-800">
                {agreeToastMessage || "Your agreement has been recorded."}
              </div>
              <button
                onClick={() => setShowAgreeToast(false)}
                className="ml-3 px-2 py-1 text-green-700 border border-green-300 rounded cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* CONTRACT BANNER (hidden only if discussion banner is showing) */}
        {!showAgreementBanner && contractBanner && (
          <div className="p-4 sm:ml-64">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-left">
                <div className="text-sm text-gray-500">Contract</div>
                <div className="text-base font-semibold text-[#252525]">
                  {contractBanner.jobId?.description?.slice(0, 60) ||
                    contractBanner.description?.slice(0, 60) ||
                    "Work Contract"}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {" "}
                  <span className="font-semibold">Status: </span>{" "}
                  <span className="font-medium">
                    {(contractBanner.contractStatus || "").replaceAll("_", " ")}
                  </span>{" "}
                  • <span className="font-semibold">Rate:</span>{" "}
                  <span className="font-medium">
                    ₱{contractBanner.agreedRate}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUser?.userType === "worker" &&
                  contractBanner.contractStatus === "active" && (
                    <button
                      onClick={async () => {
                        try {
                          await startWorkAPI(contractBanner._id);
                          setContractBanner((prev) =>
                            prev
                              ? {
                                ...prev,
                                contractStatus: "in_progress",
                                startDate: new Date().toISOString(),
                              }
                              : prev
                          );
                          setAgreeToastMessage("Work started");
                          setShowAgreeToast(true);
                        } catch (e) {
                          setAgreeToastMessage(e.message || "Failed to start work");
                          setShowAgreeToast(true);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-sky-500 text-white cursor-pointer"
                    >
                      Start Work
                    </button>
                  )}
                {currentUser?.userType === "worker" &&
                  contractBanner.contractStatus === "in_progress" && (
                    <button
                      onClick={async () => {
                        try {
                          await completeWorkAPI(contractBanner._id);
                          setContractBanner((prev) =>
                            prev
                              ? {
                                ...prev,
                                contractStatus:
                                  "awaiting_client_confirmation",
                                workerCompletedAt: new Date().toISOString(),
                              }
                              : prev
                          );
                          setAgreeToastMessage("Marked completed");
                          setShowAgreeToast(true);
                        } catch (e) {
                          setAgreeToastMessage(e.message || "Failed to complete work");
                          setShowAgreeToast(true);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-sky-500 text-white cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                {currentUser?.userType === "client" &&
                  contractBanner.contractStatus ===
                  "awaiting_client_confirmation" && (
                    <button
                      onClick={async () => {
                        try {
                          await confirmWorkCompletionAPI(contractBanner._id);
                          setContractBanner((prev) =>
                            prev
                              ? {
                                ...prev,
                                contractStatus: "completed",
                                completedAt: new Date().toISOString(),
                                actualEndDate: new Date().toISOString(),
                                clientConfirmedAt: new Date().toISOString(),
                              }
                              : prev
                          );
                          setAgreeToastMessage("Confirmed completion");
                          setShowAgreeToast(true);
                        } catch (e) {
                          setAgreeToastMessage(e.message || "Failed to confirm completion");
                          setShowAgreeToast(true);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-green-600 text-white cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                <button
                  onClick={() => navigate("/contracts")}
                  className="px-3 py-2 bg-[#55b3f3] text-white rounded-md border border-[#55b3f3] cursor-pointer shadow-sm hover:bg-sky-500"
                >
                  Open Contracts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCUSSION / AGREEMENT BANNER (takes precedence) */}
        {showAgreementBanner && (
          <div className="p-4 sm:ml-64">
            <div
              className={`${selfAgreed
                ? "bg-blue-50 border-blue-200"
                : "bg-yellow-50 border-yellow-200"
                } border rounded-xl shadow-sm p-4 mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3`}
            >
              <div className="text-left">
                {/* Hide the self-agreed "Waiting for the other party" line; only show when not agreed */}
                {!selfAgreed && (
                  <div className={`text-sm text-yellow-700`}>In discussion</div>
                )}
                <div className="text-base font-semibold text-gray-800">
                  {selectedContactId
                    ? contactNames[selectedContactId] || "Your contact"
                    : "Your contact"}
                </div>
                {/* Hide the self-agreed explanatory line; keep only the pre-agreement prompt */}
                {!selfAgreed && (
                  <div className="text-sm text-gray-600 mt-1">
                    Please indicate if you agree to proceed. A work contract will be created once both parties agree.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!selfAgreed && (
                  <button
                    onClick={async () => {
                      try {
                        if (agreementContext.kind === "application") {
                          await markApplicationAgreementAPI(
                            agreementContext.id,
                            true
                          );
                        } else if (agreementContext.kind === "invitation") {
                          await markInvitationAgreementAPI(
                            agreementContext.id,
                            { agreed: true }
                          );
                        }

                        setSelfAgreed(true);
                        // Hide the discussion banner immediately in favor of a transient toast
                        setSuppressAgreementBanner(true);

                        // Hide and clear persisted agreement context immediately
                        try {
                          sessionStorage.removeItem("chatAgreementContext");
                          const key = getSelfAgreedKey(agreementContext);
                          if (key) sessionStorage.removeItem(key);
                        } catch (_) { }

                        // Show a transient success toast for 10 seconds
                        try {
                          if (agreeToastTimer.current)
                            clearTimeout(agreeToastTimer.current);
                        } catch (_) { }
                        setAgreeToastMessage(
                          "You agreed — waiting for the other party."
                        );
                        setShowAgreeToast(true);
                        agreeToastTimer.current = setTimeout(
                          () => setShowAgreeToast(false),
                          10000
                        );

                        // 🔹 Refresh contracts and try to suppress banner immediately when contract exists
                        const c = await refreshContracts();
                        if (c) {
                          setSuppressAgreementBanner(true);
                          try {
                            sessionStorage.removeItem("chatAgreementContext");
                            const key = getSelfAgreedKey(agreementContext);
                            if (key) sessionStorage.removeItem(key);
                          } catch (_) { }
                        } else {
                          // If contract not created yet, verify agreement state directly
                          const both = await checkBothAgreedAndSuppress();
                          if (both) {
                            setSuppressAgreementBanner(true);
                          }
                        }

                        // Retry once after a short delay in case contract creation is slightly delayed
                        setTimeout(async () => {
                          try {
                            const c2 = await refreshContracts();
                            if (c2) {
                              setSuppressAgreementBanner(true);
                              try {
                                sessionStorage.removeItem(
                                  "chatAgreementContext"
                                );
                                const key = getSelfAgreedKey(agreementContext);
                                if (key) sessionStorage.removeItem(key);
                              } catch (_) { }
                            } else {
                              const both2 = await checkBothAgreedAndSuppress();
                              if (both2) setSuppressAgreementBanner(true);
                            }
                          } catch (_) { }
                        }, 1500);
                      } catch (e) {
                        setAgreeToastMessage(e.message || "Failed to mark agreement");
                        setShowAgreeToast(true);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-green-500 text-white cursor-pointer hover:bg-green-600"
                  >
                    I Agree
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      if (agreementContext.kind === "application") {
                        await markApplicationAgreementAPI(
                          agreementContext.id,
                          false
                        );
                      } else if (agreementContext.kind === "invitation") {
                        await markInvitationAgreementAPI(agreementContext.id, {
                          agreed: false,
                        });
                      }
                      setSelfAgreed(false);
                      try {
                        const key = getSelfAgreedKey(agreementContext);
                        if (key) sessionStorage.removeItem(key);
                      } catch (_) { }
                      setAgreeToastMessage("Noted. You can continue the discussion in chat.");
                      setShowAgreeToast(true);
                    } catch (e) {
                      setAgreeToastMessage(e.message || "Failed to update agreement");
                      setShowAgreeToast(true);
                    }
                  }}
                  className="px-3 py-2 rounded-lg border cursor-pointer hover:bg-[#f4f6f6] hover:shadow-sm border-gray-400 text-gray-700 bg-white"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHAT MESSAGES */}
        <div className="p-4 sm:ml-64 overflow-hidden">
          <div
            className={`${
              // shrink the chat area if any banner or toast is showing
              contractBanner || showAgreeToast || showAgreementBanner
                ? "h-[340px] md:h-[250px]"
                : "h-full md:h-[400px]"
              } overflow-y-auto px-2 transition-all duration-300 text-left`}
          >
            {messages.map((msg, index) => {
              const senderCred = idToString(msg?.sender?.credentialId);
              const currentCred = getCredentialIdFromUser(currentUser);
              const isMe =
                senderCred && currentCred && senderCred === currentCred;
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2.5 mb-4 ${isMe ? "justify-end" : ""
                    }`}
                >
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        const otherId = idToString(msg?.sender?.credentialId);
                        const pid = otherId ? contactProfileIds[otherId] : null;
                        if (!pid || !currentUser) return;
                        const path = currentUser.userType === "client" ? `/worker/${pid}` : `/client/${pid}`;
                        navigate(path);
                      }}
                      className="shrink-0"
                      aria-label="Open profile"
                    >
                      <img
                        src={
                          contactProfiles[idToString(msg?.sender?.credentialId)]?.url ||
                          "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                        }
                        alt={
                          contactNames[idToString(msg?.sender?.credentialId)] ||
                          "Unnamed"
                        }
                        className="w-8 h-8 rounded-full object-cover cursor-pointer"
                      />
                    </button>
                  )}
                  <div
                    className={`flex flex-col gap-1 max-w-[320px] ${isMe ? "items-end" : "items-start"
                      }`}
                  >
                    <div className="flex items-center justify-between space-x-2">
                      {isMe ? (
                        <span className="text-sm font-semibold text-black">You</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const otherId = idToString(msg?.sender?.credentialId);
                            const pid = otherId ? contactProfileIds[otherId] : null;
                            if (!pid || !currentUser) return;
                            const path = currentUser.userType === "client" ? `/worker/${pid}` : `/client/${pid}`;
                            navigate(path);
                          }}
                          className="text-sm font-semibold text-gray-900 hover:underline text-left"
                        >
                          {contactNames[idToString(msg?.sender?.credentialId)] || "Unnamed"}
                        </button>
                      )}

                      {/* Three-dot menu */}
                      {isMe && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMessageMenuOpen(
                                messageMenuOpen === index ? null : index
                              )
                            }
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
                    <div
                      className={`inline-block leading-1.5 p-4 ${isMe
                        ? "bg-sky-500 rounded-s-xl rounded-ee-xl self-end"
                        : "bg-gray-200 rounded-e-xl rounded-es-xl self-start"
                        }`}
                    >
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
                        <p
                          className={`text-sm font-normal ${isMe ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {msg.content}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row gap-2">
                      <span className="text-[12px] font-normal text-gray-500">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : ""}
                      </span>
                      {msg.updatedAt &&
                        new Date(msg.updatedAt) > new Date(msg.createdAt) && (
                          <span className="text-[12px] text-gray-400 italic">
                            edited
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Scroll anchor */}
            <div ref={messagesEndRef}></div>
          </div>

          {/* INPUT */}
          <div className="bg-white h-16 w-full p-2 m-2 rounded-[30px] shadow-md md:mx-0 md:mt-12">
            <form
              onSubmit={handleSendMessage}
              className="flex items-center w-full"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                maxLength={100}
                placeholder={
                  editingMessageId
                    ? "Edit your message..."
                    : "Type your message..."
                }
                className="flex-1 px-4 py-2 border-none outline-none rounded-[30px]"
              />

              <button
                type="submit"
                className="ml-2 p-2.5 text-sm font-medium text-white bg-sky-600 rounded-full border hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 flex items-center justify-center cursor-pointer"
              >
                {editingMessageId ? (
                  "Save"
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                    />
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
            <p className="mb-6 text-gray-600">
              A confirmation from the worker is needed to complete the hiring
              process.
            </p>
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
