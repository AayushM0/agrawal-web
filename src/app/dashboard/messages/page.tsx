"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession } from "@/actions/auth";
import { getConversations, getMessages, sendMessage, respondToRequest, reportConversation } from "@/actions/chat";
import { getMemberProfile } from "@/actions/search";
import { useChatRealtime } from "@/hooks/useChatRealtime";

function MessagesDashboardContent() {
  const searchParams = useSearchParams();
  const initialRecipientId = searchParams.get("recipient");

  const [activeTab, setActiveTab] = useState<"active" | "requests">("active");
  const [conversations, setConversations] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Report Modal State
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState<"financial_fraud" | "harassment" | "spam" | "impersonation" | "other">("financial_fraud");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Load session to get current member ID for private notifications
  useEffect(() => {
    async function loadCurrentMember() {
      try {
        const session = await getSession();
        if (session?.userId) {
          setCurrentMemberId(session.userId);
        }
      } catch (e) {
        console.error("Failed to load session:", e);
      }
    }
    loadCurrentMember();
  }, []);

  // Pusher Realtime WebSocket Connection
  const { isConnected: isRealtimeConnected } = useChatRealtime({
    conversationId: selectedConv?.id || null,
    currentMemberId,
    onNewMessage: (incomingMsg) => {
      // Guard against appending messages from other rooms
      if (selectedConv?.id && String(incomingMsg.conversationId || incomingMsg.conversation_id) !== String(selectedConv.id)) {
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(incomingMsg.id))) {
          return prev;
        }
        return [...prev, incomingMsg];
      });
      fetchConversationList();
    },
    onConversationUpdate: (updatedConv) => {
      setSelectedConv((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: updatedConv.status || prev.status,
          lastMessageAt: updatedConv.last_message_at || updatedConv.lastMessageAt || prev.lastMessageAt,
          lastMessagePreview: updatedConv.last_message_preview || updatedConv.lastMessagePreview || prev.lastMessagePreview,
        };
      });
      fetchConversationList();
    },
    onSidebarRefresh: () => {
      fetchConversationList();
    },
  });

  const fetchConversationList = async () => {
    try {
      const res = await getConversations();
      if (res.success) {
        setConversations(res.active || []);
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesForConv = async (convId: string, isPoll = false) => {
    try {
      // Pause network polling when tab is backgrounded
      if (isPoll && typeof document !== "undefined" && document.hidden) return;

      const res = await getMessages(convId);
      if (res.success && res.messages) {
        const fetchedMessages = res.messages;
        
        setMessages((prevMessages) => {
          // If message count and last message ID haven't changed, don't trigger re-render
          const prevLastId = prevMessages[prevMessages.length - 1]?.id;
          const newLastId = fetchedMessages[fetchedMessages.length - 1]?.id;
          if (prevMessages.length === fetchedMessages.length && prevLastId === newLastId) {
            return prevMessages;
          }

          return fetchedMessages;
        });

        if (res.conversation) {
          setSelectedConv((prev: any) => {
            if (!prev) return res.conversation;
            return {
              ...prev,
              status: res.conversation.status || prev.status,
              lastMessageAt: res.conversation.last_message_at || res.conversation.lastMessageAt || prev.lastMessageAt,
              lastMessagePreview: res.conversation.last_message_preview || res.conversation.lastMessagePreview || prev.lastMessagePreview,
            };
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to load messages:", err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await getConversations();
        const currentActive = res.active || [];
        const currentRequests = res.requests || [];
        if (res.success) {
          setConversations(currentActive);
          setRequests(currentRequests);
        }

        // If recipient query param is present
        if (initialRecipientId) {
          const existing = [...currentActive, ...currentRequests].find(
            (c: any) => String(c.otherParticipant?.id) === String(initialRecipientId)
          );
          if (existing) {
            setSelectedConv(existing);
            setActiveTab(existing.status === "pending" && !existing.isInitiator ? "requests" : "active");
          } else {
            // Fetch recipient's profile to initialize draft conversation
            const profRes = await getMemberProfile(initialRecipientId);
            if (profRes.success && profRes.data) {
              const prof = profRes.data;
              setSelectedConv({
                id: null,
                isNewDraft: true,
                status: "new",
                isInitiator: true,
                otherParticipant: {
                  id: prof.id,
                  fullName: prof.fullName,
                  gotra: prof.gotra,
                  city: prof.currentCity,
                  photoUrl: prof.photoUrl,
                  householdCode: prof.householdCode,
                },
              });
              setMessages([]);
            } else {
              setError("Recipient member profile not found.");
            }
          }
        }
      } catch (err: any) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [initialRecipientId]);

  // Load active conversation & manage polling fallback
  useEffect(() => {
    if (!selectedConv?.id) return;
    fetchMessagesForConv(selectedConv.id, false);

    // If WebSocket is active, 0 DB queries needed!
    if (isRealtimeConnected) return;

    const interval = setInterval(() => {
      fetchMessagesForConv(selectedConv.id, true);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedConv?.id, isRealtimeConnected]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending) return;

    setError(null);
    setSending(true);

    try {
      const recipientId = selectedConv?.otherParticipant?.id || initialRecipientId;
      const res = await sendMessage({
        recipientMemberId: recipientId,
        messageBody: newMessageText,
        conversationId: selectedConv?.id || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to send message");
      } else {
        setNewMessageText("");
        if (res.conversationId) {
          setSelectedConv((prev: any) => ({
            ...prev,
            id: res.conversationId,
            isNewDraft: false,
            status: "pending",
            isInitiator: true,
          }));
          await fetchMessagesForConv(res.conversationId);
        } else if (selectedConv?.id) {
          await fetchMessagesForConv(selectedConv.id);
        }
        await fetchConversationList();
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleRespondRequest = async (action: "accept" | "decline" | "block") => {
    if (!selectedConv?.id) return;
    try {
      const res = await respondToRequest({ conversationId: selectedConv.id, action });
      if (res.success) {
        await fetchConversationList();
        if (action === "accept") {
          setSelectedConv((prev: any) => ({ ...prev, status: "accepted" }));
        } else {
          setSelectedConv(null);
        }
      }
    } catch (err) {
      console.error("Failed to respond to request:", err);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv?.id) return;
    try {
      const res = await reportConversation({
        conversationId: selectedConv.id,
        reason: reportReason,
        details: reportDetails,
      });
      if (res.success) {
        setReportSubmitted(true);
        setTimeout(() => {
          setIsReporting(false);
          setReportSubmitted(false);
          setReportDetails("");
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8DCC4] mb-6">
          <div>
            <div className="flex items-center space-x-2 text-sm text-[#7A1E28] mb-1">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="font-semibold text-[#800020]">Community Messages</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1810]">
              Member-to-Member Directory Chat
            </h1>
          </div>
          <Link
            href="/directory"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium text-[#800020] bg-[#F5ECE0] border border-[#D4AF37]/40 rounded-lg hover:bg-[#EBDDCB] transition"
          >
            🔍 Browse Directory
          </Link>
        </div>

        {/* Prominent Trust & Safety Banner */}
        <div className="bg-gradient-to-r from-[#FFF9E6] to-[#FFF3D6] border-l-4 border-[#D4AF37] p-4 rounded-r-lg shadow-sm mb-6 flex items-start space-x-3">
          <div className="text-xl">🔒</div>
          <div className="text-sm text-[#5C4813]">
            <span className="font-bold text-[#800020]">Trust & Community Safety: </span>
            Direct phone numbers and email addresses remain 100% protected. Never share banking credentials, OTPs, or financial transactions over directory messaging. Report any suspicious solicitations immediately.
          </div>
        </div>

        {/* Messaging Container */}
        <div className="bg-white rounded-xl shadow-md border border-[#E8DCC4] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
          {/* Left Sidebar: Conversations & Requests */}
          <div className="md:col-span-4 border-r border-[#E8DCC4] flex flex-col bg-[#FAF6F0]/40">
            {/* Tabs */}
            <div className="grid grid-cols-2 border-b border-[#E8DCC4] text-center font-medium text-sm">
              <button
                onClick={() => setActiveTab("active")}
                className={`py-3 transition border-b-2 ${
                  activeTab === "active"
                    ? "border-[#800020] text-[#800020] bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Messages ({conversations.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`py-3 transition border-b-2 relative ${
                  activeTab === "requests"
                    ? "border-[#800020] text-[#800020] bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Requests ({requests.length})
                {requests.length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#800020] text-white">
                    {requests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F0E6D8]">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading messages...</div>
              ) : activeTab === "active" ? (
                conversations.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    <p className="mb-2">No active conversations yet.</p>
                    <p className="text-xs text-gray-400">Search the directory to start connecting!</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const isSelected = selectedConv?.id === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConv(conv)}
                        className={`w-full text-left p-4 flex items-center space-x-3 transition ${
                          isSelected ? "bg-[#F5ECE0] border-l-4 border-[#800020]" : "hover:bg-[#FAF6F0]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#800020] text-[#D4AF37] flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                          {conv.otherParticipant?.photoUrl ? (
                            <img src={conv.otherParticipant.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            conv.otherParticipant?.fullName?.charAt(0) || "M"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-sm text-[#2A1810] truncate">
                              {conv.otherParticipant?.fullName}
                            </span>
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#800020] text-white rounded-full">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{conv.lastMessagePreview || "Started conversation"}</p>
                          <span className="text-[10px] text-gray-400 mt-0.5 inline-block">
                            {conv.otherParticipant?.gotra ? `Gotra: ${conv.otherParticipant.gotra}` : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              ) : requests.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No pending message requests.</div>
              ) : (
                requests.map((req) => {
                  const isSelected = selectedConv?.id === req.id;
                  return (
                    <button
                      key={req.id}
                      onClick={() => setSelectedConv(req)}
                      className={`w-full text-left p-4 flex items-center space-x-3 transition ${
                        isSelected ? "bg-[#F5ECE0] border-l-4 border-[#800020]" : "hover:bg-[#FAF6F0]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#D4AF37] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                        {req.otherParticipant?.fullName?.charAt(0) || "R"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-[#2A1810] block truncate">
                          {req.otherParticipant?.fullName}
                        </span>
                        <p className="text-xs text-gray-500 truncate">{req.lastMessagePreview || "Sent you a message request"}</p>
                        <span className="text-[10px] text-[#800020] font-medium">Click to review request</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Window */}
          <div className="md:col-span-8 flex flex-col h-[620px] bg-white">
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-[#E8DCC4] flex items-center justify-between bg-[#FDFBF7]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#800020] text-[#D4AF37] flex items-center justify-center font-bold text-sm overflow-hidden">
                      {selectedConv.otherParticipant?.photoUrl ? (
                        <img src={selectedConv.otherParticipant.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedConv.otherParticipant?.fullName?.charAt(0) || "M"
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-[#2A1810] text-base">
                        {selectedConv.otherParticipant?.fullName}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {selectedConv.otherParticipant?.gotra && <span>Gotra: {selectedConv.otherParticipant.gotra}</span>}
                        {selectedConv.otherParticipant?.city && <span>• {selectedConv.otherParticipant.city}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isRealtimeConnected && (
                      <span className="flex items-center space-x-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Live</span>
                      </span>
                    )}

                    <button
                      onClick={() => setIsReporting(true)}
                      className="text-xs text-red-700 hover:text-red-900 border border-red-200 px-2.5 py-1 rounded hover:bg-red-50 transition"
                    >
                      🚩 Report Chat
                    </button>
                  </div>
                </div>

                {/* Draft New Conversation Notice Banner */}
                {selectedConv.isNewDraft && (
                  <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <div>
                      🌱 <b>New Connection:</b> You are starting a conversation with <b>{selectedConv.otherParticipant?.fullName}</b>. Type your message below to send an introductory connection request.
                    </div>
                  </div>
                )}

                {/* Message Request Acceptance Banner (If in Pending State & Caller is Recipient) */}
                {selectedConv.status === "pending" && !selectedConv.isInitiator && !selectedConv.isNewDraft && (
                  <div className="p-4 bg-[#FFF8EE] border-b border-[#EBDDCB] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-[#6B4716]">
                      <span className="font-semibold text-[#800020]">{selectedConv.otherParticipant?.fullName}</span> wants to connect with you. Accept to allow continuous chatting.
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRespondRequest("accept")}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#800020] hover:bg-[#68001A] rounded transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondRequest("decline")}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondRequest("block")}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Request Waiting Banner (If in Pending State & Caller is Initiator) */}
                {selectedConv.status === "pending" && selectedConv.isInitiator && !selectedConv.isNewDraft && (
                  <div className="p-3 bg-[#F5ECE0] border-b border-[#E8DCC4] text-xs text-[#5C4813] text-center">
                    ⏳ Message request sent. Awaiting acceptance from {selectedConv.otherParticipant?.fullName}.
                  </div>
                )}

                {/* Messages List */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#FAF6F0]/20">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400">
                      Send a respectful greeting to introduce yourself.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = String(msg.senderId) !== String(selectedConv.otherParticipant?.id);
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isMe
                                ? "bg-[#800020] text-white rounded-br-none"
                                : "bg-white border border-[#E8DCC4] text-[#2A1810] rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.messageBody}</p>

                            {/* In-Stream Anti-Fraud Warning */}
                            {msg.isFlagged && (
                              <div className="mt-2 text-[11px] bg-red-100 border border-red-300 text-red-800 p-2 rounded flex items-center space-x-1.5">
                                <span>⚠️</span>
                                <span><b>Safety Alert:</b> {msg.flagReason || "Potential payment solicitation. Never send money."}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 px-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="px-6 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 font-medium">
                    ⚠️ {error}
                  </div>
                )}

                {/* Message Input Box */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E8DCC4] bg-white flex items-center space-x-3">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={2000}
                    disabled={selectedConv.status === "blocked" || (selectedConv.status === "pending" && selectedConv.isInitiator && messages.length > 0)}
                    className="flex-1 px-4 py-2.5 text-sm border border-[#D4AF37]/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800020] bg-[#FAF6F0]/30 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessageText.trim() || selectedConv.status === "blocked"}
                    className="px-5 py-2.5 bg-[#800020] text-[#D4AF37] font-bold text-sm rounded-xl hover:bg-[#68001A] transition disabled:opacity-50 flex items-center space-x-1"
                  >
                    <span>{sending ? "..." : "Send"}</span>
                    <span>✉️</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <h3 className="font-serif font-bold text-lg text-gray-700 mb-1">Start or Select a Conversation</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-5">
                  Choose an existing message thread on the left, or browse the verified directory to connect with Agarwal community members.
                </p>
                <Link
                  href="/directory"
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#800020] hover:bg-[#68001A] shadow-md transition"
                >
                  🔍 Browse Directory Members →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Conversation Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#E8DCC4]">
            <h3 className="text-lg font-serif font-bold text-[#800020] mb-2">Report Conversation</h3>
            <p className="text-xs text-gray-600 mb-4">
              Our Trust & Safety moderators will review an immutable thread snapshot. False reporting is against community guidelines.
            </p>

            {reportSubmitted ? (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-center text-sm font-semibold">
                ✓ Report submitted to administrators. Thank you for keeping our community safe.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e: any) => setReportReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#800020] outline-none"
                  >
                    <option value="financial_fraud">Financial Fraud / Unsolicited Payment Request</option>
                    <option value="harassment">Harassment or Abusive Conduct</option>
                    <option value="spam">Commercial Spam or Unsolicited Marketing</option>
                    <option value="impersonation">Identity Impersonation</option>
                    <option value="other">Other Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Details (Optional)</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe what occurred..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#800020] outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg transition"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-[#800020] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-[#800020]">Loading Community Messages...</p>
          </div>
        </div>
      }
    >
      <MessagesDashboardContent />
    </Suspense>
  );
}
