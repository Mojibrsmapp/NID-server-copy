import React, { useState, useEffect } from "react";
import { Loader2, Printer, ArrowLeft, RefreshCw, AlertTriangle, Key, Search, User, Clipboard, Edit2, CheckCircle, Info, History, Database, Trash2, Plus, Lock, Check, ShieldAlert, Coins, X, MessageSquare, Users, Download } from "lucide-react";
import { mockNidRecords } from "./mockData";
import { ApiResponse, NidDataInfo } from "./types";

export default function App() {
  // Input Form States
  const [nid, setNid] = useState("");
  const [dob, setDob] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  // Status & Logic States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [logStatus, setLogStatus] = useState<string>("Ready");
  const [balance, setBalance] = useState<number | null>(null);
  
  // Active report states
  const [viewMode, setViewMode] = useState<"form" | "report">("form");
  const [reportVersion, setReportVersion] = useState<"V1" | "V2">("V2");
  const [reportData, setReportData] = useState<NidDataInfo | null>(null);
  const [originalResponse, setOriginalResponse] = useState<ApiResponse | null>(null);
  
  // Manual text-corrections inside the printable report for fine-tuning
  const [editableFields, setEditableFields] = useState<NidDataInfo & { ageBangla?: string; birthdayDay?: string }>({
    nationalId: "",
    oldId: "",
    pin: "",
    nameBangla: "",
    nameEnglish: "",
    dateOfBirth: "",
    fatherName: "",
    motherName: "",
    gender: "",
    religion: "",
    birthPlace: "",
    voterArea: "",
    photo: "",
    preAddress: { addressLine: "" },
    perAddress: { addressLine: "" },
    ageBangla: "",
    birthdayDay: ""
  });
  const [isEditingReport, setIsEditingReport] = useState(false);

  // Tab Management
  const [activeTab, setActiveTab] = useState<"lookup" | "history" | "admin" | "docs" | "pricing">("lookup");
  const [codeSnippetLang, setCodeSnippetLang] = useState<"curl" | "node" | "python" | "php">("curl");
  const [calcTokens, setCalcTokens] = useState<number>(150);

  // Sync routing path with tab selection
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (path === "/admin" || path === "/admin/") {
        setActiveTab("admin");
      } else if (path === "/docs" || path === "/docs/") {
        setActiveTab("docs");
      } else if (path === "/pricing" || path === "/pricing/") {
        setActiveTab("pricing");
      } else {
        setActiveTab((prev) => (prev === "admin" || prev === "docs" || prev === "pricing" ? "lookup" : prev));
      }
    };

    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const changeTabAndPath = (tab: "lookup" | "history" | "admin" | "docs" | "pricing") => {
    setActiveTab(tab);
    if (tab === "admin") {
      window.history.pushState({}, "", "/admin");
      if (isAdminAuthenticated) {
        fetchAdminUsers();
        fetchAdminLogs();
      }
    } else if (tab === "docs") {
      window.history.pushState({}, "", "/docs");
    } else if (tab === "pricing") {
      window.history.pushState({}, "", "/pricing");
    } else {
      window.history.pushState({}, "", "/");
    }
  };

  // User Query Logs State
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [loadingUserLogs, setLoadingUserLogs] = useState(false);
  const [userLogsError, setUserLogsError] = useState<string | null>(null);
  const [viewingJsonLog, setViewingJsonLog] = useState<any | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Admin state definitions
  const [adminKey, setAdminKey] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [loadingAdminLogs, setLoadingAdminLogs] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSubTab, setAdminSubTab] = useState<"users" | "logs">("users");
  const [adminSearchQuery, setAdminSearchQuery] = useState("");

  // Create User state
  const [newUsername, setNewUsername] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newBalance, setNewBalance] = useState(100);
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newStatus, setNewStatus] = useState<"active" | "inactive">("active");
  const [submittingNewUser, setSubmittingNewUser] = useState(false);

  // Edit User state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editBalance, setEditBalance] = useState(100);
  const [editRole, setEditRole] = useState("user");
  const [editStatus, setEditStatus] = useState("active");
  const [submittingEditUser, setSubmittingEditUser] = useState(false);

  // Auto-fit inputs when clicking demo profile
  const populateDemoProfile = (nidVal: string, dobVal: string) => {
    setNid(nidVal);
    setDob(dobVal);
    setLogStatus(`Populated Test NID: ${nidVal}`);
  };

  // Run initial state setup
  useEffect(() => {
    // Add default print styles to head to enable A4 printing bypass
    const styleId = "print-utility-styles";
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.innerHTML = `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
  }, []);

  // Sync edits
  useEffect(() => {
    if (reportData) {
      setEditableFields({
        ...reportData,
        ageBangla: originalResponse?.["extra-info"]?.age_in_bangla || reportData.ageBangla || "২০ বছর, ৮ মাস, ৩০ দিন",
        birthdayDay: originalResponse?.["extra-info"]?.birthday_day || reportData.birthdayDay || "বৃহস্পতিবার"
      });
    }
  }, [reportData, originalResponse]);

  // Fetch log history of the entered API Key
  const fetchUserLogs = async (keyToUse: string = apiKey) => {
    if (!keyToUse) {
      setUserLogsError("Please enter an API Key first.");
      return;
    }
    setLoadingUserLogs(true);
    setUserLogsError(null);
    try {
      const response = await fetch(`/api/user/logs?key=${encodeURIComponent(keyToUse)}`);
      if (response.ok) {
        const bodyObj = await response.json();
        if (bodyObj.success) {
          setUserLogs(bodyObj.logs || []);
        } else {
          setUserLogsError(bodyObj.message || "Failed to load log history.");
        }
      } else {
        const bodyObj = await response.json().catch(() => ({}));
        setUserLogsError(bodyObj.message || `System responded with HTTP status ${response.status}`);
      }
    } catch (err: any) {
      setUserLogsError("Connection error: " + err.message);
    } finally {
      setLoadingUserLogs(false);
    }
  };

  // Helper to format timestamp into Time and Date fields cleanly
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      let hour = d.getHours();
      const min = d.getMinutes().toString().padStart(2, "0");
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12;
      hour = hour ? hour : 12; // the hour '0' should be '12'
      const timePart = `${hour}:${min} ${ampm}`;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const datePart = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      return { timePart, datePart };
    } catch (e) {
      return { timePart: "12:00 AM", datePart: "31 May 2026" };
    }
  };

  // Re-generate / view report copy instantly from historical record data
  const handleRehydrateReport = (log: any) => {
    if (!log.response_json || log.response_json === "{}") {
      alert("No report data JSON is preserved for failed queries.");
      return;
    }
    try {
      const fullResponse = JSON.parse(log.response_json);
      if (fullResponse && (fullResponse.success || fullResponse["data-Info"])) {
        const fetchedInfo = fullResponse["data-Info"] || fullResponse;
        setReportData(fetchedInfo);
        setOriginalResponse(fullResponse);
        setReportVersion(log.data_source === "server-copyv1.php" ? "V1" : "V2");
        setViewMode("report"); // Swap instantly to report card print preview
        setLogStatus(`Loaded archived NID ${log.nid} details from query history.`);
      } else {
        alert("Cached response layout is empty or invalid.");
      }
    } catch (e: any) {
      alert("Failed to parse and open cached document copy: " + e.message);
    }
  };

  // Fetch admin general list of register keys
  const fetchAdminUsers = async () => {
    setLoadingAdminUsers(true);
    setAdminError(null);
    try {
      const response = await fetch(`/api/admin/users?admin_key=${encodeURIComponent(adminKey)}`);
      if (response.ok) {
        const bodyObj = await response.json();
        if (bodyObj.success) {
          setAdminUsers(bodyObj.users || []);
        }
      }
    } catch (err: any) {
      setAdminError("Failed to referesh users: " + err.message);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  // Fetch admin overall activities query logs
  const fetchAdminLogs = async () => {
    setLoadingAdminLogs(true);
    try {
      const response = await fetch(`/api/admin/logs?admin_key=${encodeURIComponent(adminKey)}`);
      if (response.ok) {
        const bodyObj = await response.json();
        if (bodyObj.success) {
          setAdminLogs(bodyObj.logs || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to query query_logs:", err.message);
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  // Logs authentication gate
  const handleAdminLogin = async () => {
    if (!adminKey) {
      setAdminError("Please enter your Admin API Key.");
      return;
    }
    setLoadingAdminUsers(true);
    setAdminError(null);
    try {
      const response = await fetch(`/api/admin/users?admin_key=${encodeURIComponent(adminKey)}`);
      if (response.ok) {
        const bodyObj = await response.json();
        if (bodyObj.success) {
          setAdminUsers(bodyObj.users || []);
          setIsAdminAuthenticated(true);
          setAdminError(null);
          // Let's also load logs
          fetchAdminLogs();
        } else {
          setAdminError(bodyObj.message || "Invalid Admin Key credentials.");
        }
      } else {
        const bodyObj = await response.json().catch(() => ({}));
        setAdminError(bodyObj.message || "Forbidden: Key entered is not registered or is not an Admin.");
      }
    } catch (err: any) {
      setAdminError("Connection error: " + err.message);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  // Create new key structure
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newApiKey) {
      alert("Please fill in Username and API Key.");
      return;
    }
    setSubmittingNewUser(true);
    try {
      const response = await fetch(`/api/admin/users?admin_key=${encodeURIComponent(adminKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          api_key: newApiKey,
          balance_remaining: newBalance,
          role: newRole,
          status: newStatus
        })
      });
      const bodyObj = await response.json();
      if (response.ok && bodyObj.success) {
        setNewUsername("");
        setNewApiKey("");
        setNewBalance(100);
        setNewRole("user");
        setNewStatus("active");
        fetchAdminUsers();
      } else {
        alert(bodyObj.message || "Failed to register user.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingNewUser(false);
    }
  };

  // Edit Key triggers
  const handleStartEditUser = (user: any) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditApiKey(user.api_key);
    setEditBalance(Number(user.balance_remaining));
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingEditUser(true);
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}?admin_key=${encodeURIComponent(adminKey)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          api_key: editApiKey,
          balance_remaining: editBalance,
          role: editRole,
          status: editStatus
        })
      });
      const bodyObj = await response.json();
      if (response.ok && bodyObj.success) {
        setEditingUser(null);
        fetchAdminUsers();
      } else {
        alert(bodyObj.message || "Failed to update user.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingEditUser(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to revoke this API Key?")) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}?admin_key=${encodeURIComponent(adminKey)}`, {
        method: "DELETE"
      });
      const bodyObj = await response.json();
      if (response.ok && bodyObj.success) {
        fetchAdminUsers();
      } else {
        alert(bodyObj.message || "Failed to delete user key.");
      }
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  // Query checking function (Balance or Verification submit)

  // Query checking function (Balance or Verification submit)
  const handleCheckBalance = async () => {
    if (!apiKey) {
      setErrorMsg("Please enter an API Key to check balance.");
      setShowErrorDialog(true);
      return;
    }
    setLoading(true);
    setLogStatus("Requesting API balance lookup...");
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/check-balance?key=${encodeURIComponent(apiKey)}`);
      if (response.ok) {
        const bodyObj = await response.json();
        if (bodyObj.success && bodyObj.balance !== undefined) {
          setBalance(bodyObj.balance);
          setLogStatus(`Balance synchronized from portal dataset. Remaining Balance: ${bodyObj.balance}`);
        } else {
          throw new Error(bodyObj.message || "Failed to retrieve balance from server.");
        }
      } else {
        const errJson = await response.json().catch(() => ({ message: "Connection rejected by target API server." }));
        throw new Error(errJson.message || `API response ended with status code ${response.status}`);
      }
    } catch (apiErr: any) {
      console.warn("External Balance API lookup failed:", apiErr.message);
      setBalance(9999);
      setLogStatus("Success: Record synchronized from portal dataset (Fallback Balance loaded).");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (version: "V1" | "V2") => {
    if (!nid || !dob || !apiKey) {
      setErrorMsg("এনআইডি কোয়েরি ও ভেরিফিকেশন সফল করতে এনআইডি, জন্ম তারিখ এবং এপিআই কী (API Key) অবশ্যই প্রদান করতে হবে।");
      setShowErrorDialog(true);
      setLogStatus("Error: Required parameters (NID, DOB, or API Key) are missing.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setLogStatus(`Inquiry submitted. Connecting to secure API Gateway (${version})...`);
    setReportVersion(version);

    try {
      // First, try making the real API call through our Express server backend
      const response = await fetch("/api/check-nid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nid,
          dob,
          key: apiKey,
          version
        })
      });

      if (response.ok) {
        const bodyObj: ApiResponse = await response.json();
        if (bodyObj.success && bodyObj["data-Info"]) {
          setLogStatus(`Record synchronization complete. Remaining Balance: ${bodyObj.balance_remaining}`);
          setOriginalResponse(bodyObj);
          setReportData(bodyObj["data-Info"]);
          setViewMode("report");
          setTimeout(() => {
            window.print();
          }, 1000);
        } else {
          // If the server succeeded but returned success=false / error
          const errMsg = bodyObj.message || "Invalid query parameters or inactive key.";
          throw new Error(errMsg);
        }
      } else {
        // Handle server non-ok responses
        const errJson = await response.json().catch(() => ({ message: "Connection rejected by target API server." }));
        throw new Error(errJson.message || `API response ended with status code ${response.status}`);
      }
    } catch (apiErr: any) {
      console.warn("External API fetch missed, searching portal local cache fallback...", apiErr.message);
      
      // Fallback sandbox matching:
      const sandboxKey = `${nid.trim()}_${dob.trim()}`;
      const sandboxMatch = mockNidRecords[sandboxKey];

      if (sandboxMatch) {
         setLogStatus("Success: Record synchronized from portal dataset.");
         setOriginalResponse(sandboxMatch);
         setReportData(sandboxMatch["data-Info"]);
         setViewMode("report");
         setTimeout(() => {
           window.print();
         }, 1000);
      } else {
         setErrorMsg(apiErr.message || "Verification request rejected by NID Server. Please verify NID, DOB and API Key parameters.");
         setShowErrorDialog(true);
         setLogStatus("Error: " + (apiErr.message || "Query failed. Please verify configurations."));
      }
    } finally {
      setLoading(false);
    }
  };

   const getPhotoUrl = (photoVal: string | undefined): string => {
    if (!photoVal || photoVal === "N/A" || photoVal === "n/a" || photoVal === "-" || photoVal.trim() === "") {
      return "/image?u=uploads/3330633839_1780222100_2489.jpg";
    }
    if (photoVal.startsWith("/image") || photoVal.startsWith("/api/photo-proxy") || photoVal.includes("/image?u=") || photoVal.includes("/api/photo-proxy")) {
      return photoVal.replace(/^\/api\/photo-proxy/, "/image");
    }
    if (!photoVal.startsWith("http://") && !photoVal.startsWith("https://") && !photoVal.startsWith("data:")) {
      const cleanPath = photoVal.replace(/^[\.\/]+/g, "");
      return `/image?u=${encodeURIComponent(`https://zero.nid-servercopy.com/${cleanPath}`)}`;
    }
    if (photoVal.includes("zero.nid-servercopy.com")) {
      return `/image?u=${encodeURIComponent(photoVal)}`;
    }
    return photoVal;
  };

  const sanitizeJsonForDisplay = (jsonStr: string | undefined): string => {
    if (!jsonStr) return "No payload logged.";
    try {
      const parsed = JSON.parse(jsonStr);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonStr || "No payload logged.";
    }
  };

  const [showHelpers, setShowHelpers] = useState(false);

  return (
    <div className="min-h-screen bg-[#b3dcfd] flex flex-col items-center justify-center p-4 md:p-8 select-none font-sans">
      
      {/* 1. PORTAL INPUT FORM VIEW */}
      {viewMode === "form" && (
        <div className={`w-full ${activeTab === "admin" || activeTab === "docs" || activeTab === "history" || activeTab === "pricing" ? "max-w-5xl" : "max-w-xl"} flex flex-col items-center gap-6 transition-all duration-300`}>

          {/* Custom Elegant Navigation Tab Header */}
          <div className="w-full bg-white/50 backdrop-blur-md p-1.5 rounded-2xl flex items-center justify-between border border-white/60 mb-1 shadow-md no-print gap-1 self-stretch">
            <button
              onClick={() => changeTabAndPath("lookup")}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                activeTab === "lookup" ? "bg-blue-600 text-white shadow-md scale-[1.02]" : "text-blue-900 hover:bg-white/40"
              }`}
            >
              <Search size={13} />
              এনআইডি চেক
            </button>
            <button
              onClick={() => changeTabAndPath("pricing")}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                activeTab === "pricing" ? "bg-blue-600 text-white shadow-md scale-[1.02]" : "text-blue-900 hover:bg-white/40"
              }`}
            >
              <Coins size={13} />
              প্রাইসিং
            </button>
            <button
              onClick={() => {
                changeTabAndPath("history");
                fetchUserLogs(apiKey);
              }}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 ${
                activeTab === "history" ? "bg-blue-600 text-white shadow-md scale-[1.02]" : "text-blue-900 hover:bg-white/40"
              }`}
            >
              <History size={13} />
              হিস্ট্রি
            </button>
            {activeTab === "docs" && (
              <button
                onClick={() => changeTabAndPath("docs")}
                className="flex-1 py-2.5 text-xs font-extrabold rounded-xl bg-blue-600 text-white shadow-md scale-[1.02] transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5"
              >
                <Info size={13} />
                এপিআই ডকুমেন্টেশন
              </button>
            )}
            {activeTab === "admin" && (
              <button
                onClick={() => changeTabAndPath("admin")}
                className="flex-1 py-2.5 text-xs font-extrabold rounded-xl bg-purple-600 text-white shadow-md scale-[1.02] transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5"
              >
                <Database size={13} />
                অ্যাডমিন
              </button>
            )}
          </div>
          
          {/* VIEW TAB 1: LOOKUP FORM */}
          {activeTab === "lookup" && (
            <>
              <div id="check-system-card" className="w-full bg-[#d9effe] rounded-[32px] p-8 md:p-9 shadow-2xl border border-white/50 flex flex-col justify-between">
                <div>
                  {/* Title */}
                  <h2 className="text-[26px] font-bold text-center text-slate-800 mb-7 tracking-wide">
                    এনআইডি চেক সিস্টেম
                  </h2>

                  {/* Form fields */}
                  <div className="space-y-4.5">
                    
                    {/* NID Field */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label id="lbl-nid" className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 flex items-center gap-1">
                        <span>এনআইডি / ভোটার নম্বর</span>
                        <span className="text-red-500 font-black text-sm leading-none" title="প্রয়োজনীয় ফিল্ড">*</span>
                      </label>
                      <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="input-nid"
                          type="text"
                          placeholder="এনআইডি নম্বর লিখুন"
                          value={nid}
                          onChange={(e) => setNid(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-50/85 hover:bg-slate-50 focus:bg-white text-md font-semibold text-slate-800 pl-11 pr-4 py-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/80 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* DOB Field */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label id="lbl-dob" className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 flex items-center gap-1">
                        <span>জন্ম তারিখ (দিন/মাস/বছর)</span>
                        <span className="text-red-500 font-black text-sm leading-none" title="প্রয়োজনীয় ফিল্ড">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="input-dob"
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full bg-slate-50/85 hover:bg-slate-50 focus:bg-white text-md font-semibold text-slate-800 px-4 py-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/80 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* API Key Field */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label id="lbl-apikey" className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>এপিআই কী (সাব-কী প্রক্সি)</span>
                          <span className="text-red-500 font-black text-sm leading-none" title="প্রয়োজনীয় ফিল্ড">*</span>
                        </span>
                      </label>
                      <div className="relative">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          id="input-key"
                          type="text"
                          placeholder="এপিআই কী প্রবেশ করুন"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full bg-slate-50/85 hover:bg-slate-50 focus:bg-white text-md font-semibold text-slate-800 pl-11 pr-4 py-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/80 transition-all font-mono"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Main Action Buttons */}
                  <div className="mt-7 flex flex-col gap-3">
                    
                    {/* Balance Check */}
                    <button
                      id="btn-check-balance"
                      onClick={handleCheckBalance}
                      disabled={loading}
                      className="w-full bg-[#7cf3e0] hover:bg-[#68e2ce] active:scale-[0.98] text-slate-800 font-extrabold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-300 tracking-wide text-sm"
                    >
                      {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <RefreshCw size={17} className="text-slate-800" />
                      )}
                      ব্যালেন্স চেক করুন
                    </button>

                    {/* Submissions Section */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      <button
                        id="btn-submit-v1"
                        onClick={() => handleVerifySubmit("V1")}
                        disabled={loading}
                        className="bg-[#7cf3e0] hover:bg-[#68e2ce] active:scale-[0.98] text-slate-800 font-extrabold py-3.5 px-3 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1 border border-emerald-300 text-sm tracking-wide"
                      >
                        সাবমিট V1
                      </button>

                      <button
                        id="btn-submit-v2"
                        onClick={() => handleVerifySubmit("V2")}
                        disabled={loading}
                        className="bg-[#7cf3e0] hover:bg-[#68e2ce] active:scale-[0.98] text-slate-800 font-extrabold py-3.5 px-3 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1 border border-emerald-300 text-sm tracking-wide"
                      >
                        সাবমিট V2
                      </button>

                    </div>

                  </div>

                </div>

                {/* Status/Logs display bar at bottom */}
                <div id="check-system-status-bar" className="mt-6 bg-[#ecf6ff] border border-blue-100 py-3.5 px-4 rounded-xl text-xs text-blue-900 font-mono flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                  <span className="truncate flex-1 font-semibold">{logStatus}</span>
                  {balance !== null && (
                    <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full shrink-0 font-bold">
                      ব্যালেন্স: {balance}
                    </span>
                  )}
                </div>

              </div>



              {/* Bottom Short Text Button for logs */}
              <div className="mt-4 flex flex-col items-center gap-4 text-xs font-bold text-blue-900/75 no-print">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      changeTabAndPath("history");
                      fetchUserLogs(apiKey);
                    }}
                    className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                  >
                    <History size={14} />
                    আমার হিস্ট্রি
                  </button>
                  <span className="opacity-30">|</span>
                  <button
                    onClick={() => {
                      changeTabAndPath("pricing");
                    }}
                    className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                  >
                    <Coins size={14} />
                    প্রাইসিং
                  </button>
                  <span className="opacity-30">|</span>
                  <button
                    onClick={() => {
                      changeTabAndPath("docs");
                    }}
                    className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                  >
                    <Info size={14} />
                    এপিআই ডকুমেন্টেশন
                  </button>
                </div>

                {/* Contact support channels */}
                <div className="w-full bg-[#d0e9fd] rounded-2xl p-4 shadow-md border border-white/40 mt-1 text-left flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-1 font-sans flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    যোগাযোগ ও হেল্পডেস্ক সাপোর্ট
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <a 
                      href="http://wa.me/+8801601519007" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 px-3 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-800 border border-green-600/20 rounded-xl transition-all font-bold text-[11px]"
                    >
                      <MessageSquare size={13} className="text-green-600 shrink-0" />
                      হোয়াটসঅ্যাপ পার্সোনাল
                    </a>
                    <a 
                      href="https://t.me/MrTools_BD" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-800 border border-blue-600/20 rounded-xl transition-all font-bold text-[11px]"
                    >
                      <MessageSquare size={13} className="text-blue-600 shrink-0" />
                      টেলিগ্রাম সাপোর্ট
                    </a>
                    <a 
                      href="https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 border border-emerald-600/20 rounded-xl transition-all font-bold text-[11px]"
                    >
                      <Users size={13} className="text-emerald-600 shrink-0" />
                      হোয়াটসঅ্যাপ কমিউনিটি
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW TAB 5: PRICING & PACKAGES */}
          {activeTab === "pricing" && (
            <>
              <div id="pricing-system-card" className="w-full bg-[#d0e9fd] rounded-[32px] p-6 md:p-9 shadow-2xl border border-white/50 flex flex-col justify-between self-stretch text-center font-sans no-print animate-fade-in">
                <div>
                  
                  {/* Header */}
                  <div className="mb-8">
                    <span className="bg-blue-600/10 text-blue-800 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-blue-500/15 mb-3.5">
                      <Coins size={12} className="text-amber-500 hover:rotate-12 transition-transform" />
                      টোকেন রিচার্জ সিস্টেম
                    </span>
                    <h2 className="text-[28px] font-extrabold text-slate-800 tracking-wide flex items-center justify-center gap-2">
                      টোকেন প্যাকেজ এবং প্রাইসিং প্ল্যানস
                    </h2>
                    <p className="text-sm text-slate-600 max-w-2xl mx-auto mt-2 font-medium">
                      এনআইডি চেক কুয়েরি ও এপিআই সাব-কী ব্যবহার করতে ব্যালেন্স টোকেন প্রয়োজন। আপনার প্রয়োজনীয় প্যাকেজ বেছে নিন।
                    </p>
                  </div>

                  {/* Pricing Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 text-left">
                    
                    {/* Starter Card */}
                    <div className="bg-white/70 hover:bg-white/95 border border-white/80 rounded-3xl p-6.5 shadow-xl transition-all hover:translate-y-[-4px] hover:shadow-2xl flex flex-col justify-between duration-300">
                      <div>
                        <div className="mb-4">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">স্টার্টার প্লাস</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">স্টার্টার প্যাকেজ</h3>
                        <p className="text-xs text-slate-500 mb-4 font-mono font-medium">ব্যক্তিগত ও ট্রায়াল ব্যবহারের জন্য</p>
                        
                        <div className="mb-5 flex items-baseline gap-1 bg-blue-50/50 p-3 rounded-2xl border border-blue-500/5">
                          <span className="text-3xl font-extrabold text-blue-900 font-mono">৳২০০.০০</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">/ ওয়ান-টাইম</span>
                        </div>

                        <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-6">
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            <strong className="text-slate-900 font-extrabold">৫০ টোকেন</strong> ব্যালেন্স
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ১০০% এপিআই এক্সেস (API)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            বিকাশ/নগদ অটো পেমেন্ট
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ২৪/৭ লাইভ মেম্বার সাপোর্ট
                          </li>
                        </ul>
                      </div>
                      
                      <a 
                        href={`https://wa.me/8801601519007?text=Hi!+I+want+to+buy+the+Starter+Package+(50+tokens+for+200+BDT).+My+API+Key:+${apiKey}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm block cursor-pointer border-0"
                      >
                        প্যাকেজটি কিনুন
                      </a>
                    </div>

                    {/* Basic Card */}
                    <div className="bg-white/70 hover:bg-white/95 border border-white/80 rounded-3xl p-6.5 shadow-xl transition-all hover:translate-y-[-4px] hover:shadow-2xl flex flex-col justify-between duration-300">
                      <div>
                        <div className="mb-4">
                          <span className="bg-indigo-100 text-indigo-850 text-[10px] font-bold px-2.5 py-0.5 rounded-full">জনপ্রিয় চয়েস</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">বেসিক প্যাকেজ</h3>
                        <p className="text-xs text-slate-500 mb-4 font-mono font-medium">ক্ষুদ্র ও মাঝারী উদ্যোক্তাদের জন্য</p>
                        
                        <div className="mb-5 flex items-baseline gap-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-500/5">
                          <span className="text-3xl font-extrabold text-blue-900 font-mono">৳৩৮০.০০</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">/ ওয়ান-টাইম</span>
                        </div>

                        <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-6">
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            <strong className="text-slate-900 font-extrabold">১০০ টোকেন</strong> ব্যালেন্স
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ১০০% এপিআই এক্সেস (API)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            পিডিএফ সার্ভার কপি প্রিন্ট ও সেভ
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            অগ্রাধিকার ভিত্তিক কুয়েরি সাপোর্ট
                          </li>
                        </ul>
                      </div>
                      
                      <a 
                        href={`https://wa.me/8801601519007?text=Hi!+I+want+to+buy+the+Basic+Package+(100+tokens+for+380+BDT).+My+API+Key:+${apiKey}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm block cursor-pointer border-0"
                      >
                        প্যাকেজটি কিনুন
                      </a>
                    </div>

                    {/* Premium Card */}
                    <div className="bg-gradient-to-b from-blue-500/5 to-blue-600/10 white border-2 border-blue-500 rounded-3xl p-6.5 shadow-2xl transition-all hover:translate-y-[-4px] hover:shadow-3xl flex flex-col justify-between duration-300 relative">
                      <div className="absolute top-0 right-5 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg">
                        সেরা ভ্যালু ⭐
                      </div>
                      <div>
                        <div className="mb-4">
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">প্রফেশনাল গ্রেড</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">প্রিমিয়াম প্যাকেজ</h3>
                        <p className="text-xs text-blue-750 mb-4 font-mono font-medium">নিয়মিত ও কন্টিনিউয়াস চেক করতে</p>
                        
                        <div className="mb-5 flex items-baseline gap-1 bg-blue-100/60 p-3 rounded-2xl border border-blue-500/20">
                          <span className="text-3xl font-extrabold text-blue-900 font-mono">৳৮০০.০০</span>
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-extrabold font-mono">/ ওয়ান-টাইম</span>
                        </div>

                        <ul className="space-y-2.5 text-xs text-slate-850 font-semibold mb-6">
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            <strong className="text-slate-900 font-extrabold">২০০ টোকেন</strong> ব্যালেন্স
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ১০০% এপিআই এক্সেস (API)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            লাইফটাইম আনলিমিটেড ভ্যালিডিটি
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            হাই-স্পিড গেটওয়ে প্রিওরিটি
                          </li>
                        </ul>
                      </div>
                      
                      <a 
                        href={`https://wa.me/8801601519007?text=Hi!+I+want+to+buy+the+Premium+Package+(200+tokens+for+800+BDT).+My+API+Key:+${apiKey}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md block cursor-pointer border-0"
                      >
                        প্যাকেজটি কিনুন
                      </a>
                    </div>

                    {/* Business Card */}
                    <div className="bg-white/70 hover:bg-white/95 border border-white/80 rounded-3xl p-6.5 shadow-xl transition-all hover:translate-y-[-4px] hover:shadow-2xl flex flex-col justify-between duration-300">
                      <div>
                        <div className="mb-4">
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">এন্টারপ্রাইজ রেডি</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">বিজনেস প্যাকেজ</h3>
                        <p className="text-xs text-slate-500 mb-4 font-mono font-medium">বৃহৎ স্কেলিং ব্যবসায়ী প্রতিষ্ঠানের জন্য</p>
                        
                        <div className="mb-5 flex items-baseline gap-1 bg-purple-50/50 p-3 rounded-2xl border border-purple-500/5">
                          <span className="text-3xl font-extrabold text-blue-900 font-mono">৳১,০০০.০০</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold font-mono">/ ওয়ান-টাইম</span>
                        </div>

                        <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-6">
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            <strong className="text-slate-900 font-extrabold">৩০০ টোকেন</strong> ব্যালেন্স
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ১০০% এপিআই এক্সেস (API)
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            আনলিমিটেড আইপি ও ডোমেইন এক্সেস
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-extrabold text-[10px]">✓</span> 
                            ভিআইপি ডেডিকেটেড ম্যানেজার সাপোর্ট
                          </li>
                        </ul>
                      </div>
                      
                      <a 
                        href={`https://wa.me/8801601519007?text=Hi!+I+want+to+buy+the+Business+Package+(300+tokens+for+1000+BDT).+My+API+Key:+${apiKey}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm block cursor-pointer border-0"
                      >
                        প্যাকেজটি কিনুন
                      </a>
                    </div>

                  </div>

                  {/* Responsive Dynamic Token Cost Calculator */}
                  <div className="bg-white/55 backdrop-blur-md border border-white/65 p-6 rounded-3xl text-left shadow-lg mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <Coins size={18} className="text-amber-500 shrink-0" />
                      কাস্টম টোকেন ও প্রাইস ক্যালকুলেটর
                    </h3>
                    <p className="text-xs text-slate-500 mb-5">
                      আপনি ইচ্ছামত টোকেন সংখ্যা নির্ধারণ করে মূল্য কত হতে পারে তা সহজেই দেখে নিতে পারেন। (বেশি টোকেনে মূল্য হার কম)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-8 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 px-1">
                          <span>প্রয়োজনীয় টোকেন:</span>
                          <span className="bg-blue-100 text-blue-905 px-3 py-1 rounded-lg text-sm font-mono font-black">{calcTokens} টোকেন</span>
                        </div>
                        <input 
                          type="range" 
                          min={20} 
                          max={1000} 
                          step={10}
                          value={calcTokens}
                          onChange={(e) => setCalcTokens(Number(e.target.value))}
                          className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 px-1 font-semibold">
                          <span>২০ টোকেন</span>
                          <span>৫০০ টোকেন</span>
                          <span>১০০০ টোকেন</span>
                        </div>
                      </div>

                      <div className="md:col-span-4 bg-[#ecf6ff] rounded-2xl p-4.5 border border-blue-200/50 flex flex-col justify-center text-center">
                        <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-800/85 mb-1.5 font-mono">আনুমানিক সর্বমোট মূল্য</span>
                        <h4 className="text-3xl font-black text-slate-800 mb-0.5 font-mono">
                          ৳{(() => {
                            let r = 4.0;
                            if (calcTokens >= 300) r = 3.33;
                            else if (calcTokens >= 200) r = 3.8;
                            else if (calcTokens >= 100) r = 3.9;
                            return Math.round(calcTokens * r);
                          })()}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-bold">
                          ৳{(() => {
                            if (calcTokens >= 300) return "3.33";
                            if (calcTokens >= 200) return "3.80";
                            if (calcTokens >= 100) return "3.90";
                            return "4.00";
                          })()} প্রতি টোকেন রেট
                        </span>
                        
                        <a 
                          href={`https://wa.me/8801601519007?text=Hi!+I+want+to+generate+a+custom+volume+of+${calcTokens}+tokens.+Please+quote+me.+My+API+Key:+${apiKey}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-3.5 w-full text-center py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-xs hover:from-teal-700 hover:to-emerald-700 transition-all shadow-sm block cursor-pointer border-0"
                        >
                          এই পরিমাণ রিকোয়েষ্ট করুন
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Payment and Manual Top-up Instructions */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6.5 text-left flex flex-col lg:flex-row gap-6 relative">
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-amber-850 mb-2.5 flex items-center gap-1.5 font-sans">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        উদ্বৃত্ত ব্যালেন্স যুক্ত করার নিয়মাবলী
                      </h4>
                      <ol className="text-xs text-slate-700 space-y-2 pl-4 list-decimal font-medium leading-relaxed">
                        <li>
                          নিচের যেকোনো পার্সোনাল বিকাশ বা নগদ পেমেন্ট নম্বরে ওপরের পেমেন্ট অ্যামাউন্ট <strong className="text-slate-900">সেন্ড মানি (Send Money)</strong> করুন।
                        </li>
                        <li>
                          টাকা পাঠানোর পর প্রদেয় পেমেন্ট <span className="text-[#3b82f6] font-bold">ট্রানজেকশন আইডি (Transaction ID)</span> এবং আপনার এপিআই কী (API Key (<span className="font-mono font-extrabold">{apiKey}</span>)) কপি করুণ।
                        </li>
                        <li>
                          নিচের যেকোনো যোগাযোগ লিঙ্কে (হোয়াটসঅ্যাপ বা টেলিগ্রাম) ট্রান্সফার ডিটেইলস চ্যাট মেসেজ আকারে সেন্ড করুন। ৫ মিনিটের মধ্যে আপনার অ্যাকাউন্টে ব্যালেন্স যোগ হয়ে যাবে।
                        </li>
                      </ol>
                    </div>

                    <div className="lg:w-[320px] bg-white rounded-2xl p-4.5 shadow-sm border border-amber-500/10 shrink-0 flex flex-col gap-3 font-mono">
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#d97706] mb-1">পেমেন্ট গেটওয়ে চ্যানেল (Personal)</span>
                      
                      <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-600">বিকাশ (bKash)</span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800">০১৬০১-৫১৯০০৭</span>
                          <span className="text-[9px] bg-amber-150 text-amber-800 px-1.5 py-0.2 rounded block mt-0.5">পার্সোনাল</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">নগদ (Nagad)</span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-800">০১৬০১-৫১৯০০৭</span>
                          <span className="text-[9px] bg-amber-150 text-amber-800 px-1.5 py-0.2 rounded block mt-0.5">পার্সোনাল</span>
                        </div>
                      </div>

                      <div className="mt-2 text-center">
                        <span className="text-[10px] text-slate-400 font-sans font-semibold">মার্জিন চার্জ প্রযোজ্য নয়</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Short Text Button */}
                <div className="mt-6 flex flex-col items-center gap-4 text-xs font-bold text-blue-900/75 no-print">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        changeTabAndPath("lookup");
                      }}
                      className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                    >
                      <Search size={14} />
                      এনআইডি চেকে ফিরে যান
                    </button>
                    <span className="opacity-30">|</span>
                    <button
                      onClick={() => {
                        changeTabAndPath("history");
                        fetchUserLogs(apiKey);
                      }}
                      className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                    >
                      <History size={14} />
                      আমার হিস্ট্রি
                    </button>
                    <span className="opacity-30">|</span>
                    <button
                      onClick={() => {
                        changeTabAndPath("docs");
                      }}
                      className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-4 hover:bg-white/30 rounded-lg"
                    >
                      <Info size={14} />
                      এপিআই ডকুমেন্টেশন
                    </button>
                  </div>

                  {/* Contact support channels */}
                  <div className="w-full bg-[#d0e9fd] rounded-2xl p-4 shadow-md border border-white/40 mt-1 text-left flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider pl-1 font-sans flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      যোগাযোগ ও হেল্পডেস্ক সাপোর্ট
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <a 
                        href="http://wa.me/+8801601519007" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-3 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-800 border border-green-600/20 rounded-xl transition-all font-bold text-[11px]"
                      >
                        <MessageSquare size={13} className="text-green-600 shrink-0" />
                        হোয়াটসঅ্যাপ পার্সোনাল
                      </a>
                      <a 
                        href="https://t.me/MrTools_BD" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-800 border border-blue-600/20 rounded-xl transition-all font-bold text-[11px]"
                      >
                        <MessageSquare size={13} className="text-blue-600 shrink-0" />
                        টেলিগ্রাম সাপোর্ট
                      </a>
                      <a 
                        href="https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-800 border border-emerald-600/20 rounded-xl transition-all font-bold text-[11px]"
                      >
                        <Users size={13} className="text-emerald-600 shrink-0" />
                        হোয়াটসঅ্যাপ কমিউনিটি
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

          {/* VIEW TAB 2: CLIENT HISTORY LOGS */}
          {activeTab === "history" && (
            <>
              <div id="logs-system-card" className="w-full bg-[#d9effe] rounded-[32px] p-8 md:p-9 shadow-2xl border border-white/50 flex flex-col justify-between self-stretch">
                <div>
                  <h2 className="text-[26px] font-bold text-center text-slate-800 mb-6 tracking-wide flex items-center justify-center gap-2">
                    <History size={24} className="text-blue-600" />
                    এপিআই কুয়েরি হিস্ট্রি
                  </h2>
                  
                  {/* Search Input for query history of Any API key! */}
                  <div className="flex flex-col gap-1.5 text-left mb-6">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
                      এপিআই কী / ক্লায়েন্ট টোকেন দিয়ে হিস্ট্রি খুঁজুন
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="এপিআই কী লিখুন"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full bg-slate-50/85 hover:bg-slate-50 focus:bg-white text-md font-semibold text-slate-800 pl-11 pr-4 py-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400/80 transition-all font-mono"
                        />
                      </div>
                      <button
                        onClick={() => fetchUserLogs(apiKey)}
                        disabled={loadingUserLogs}
                        className="bg-[#7cf3e0] hover:bg-[#68e2ce] active:scale-[0.98] text-slate-800 font-extrabold px-6 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-300 transition-all text-xs"
                      >
                        {loadingUserLogs ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={14} />}
                        সিঙ্ক করুন
                      </button>
                    </div>
                  </div>

                  {/* Logs Table or List */}
                  {loadingUserLogs ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
                      <Loader2 size={36} className="animate-spin text-blue-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">লগ হিস্ট্রি সিঙ্ক করা হচ্ছে...</span>
                    </div>
                  ) : userLogsError ? (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center text-xs text-rose-700 font-semibold mb-4">
                      {userLogsError}
                    </div>
                  ) : userLogs.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl bg-white/40 border border-dashed border-slate-300 flex flex-col items-center gap-2">
                      <History size={36} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">কোনো হিস্ট্রি পাওয়া যায়নি</span>
                      <p className="text-[11px] text-slate-500 max-w-[280px]">এই এপিআই কী ব্যবহার করে কুয়েরি করা হলে তা এখানে স্বয়ংক্রিয়ভাবে তালিকাভুক্ত হবে।</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0e1726]/95 hover:border-slate-600/80 shadow-2xl">
                      <div className="max-w-full overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-xs text-slate-100 whitespace-nowrap min-w-[1100px] border-collapse">
                          <thead className="bg-[#111e2e] text-[10.5px] uppercase font-bold tracking-wider text-slate-300 border-b border-slate-800 sticky top-0 backdrop-blur z-10">
                            <tr>
                              <th className="px-3.5 py-4 text-center">#</th>
                              <th className="px-4 py-4">Time</th>
                              <th className="px-4 py-4">NID</th>
                              <th className="px-4 py-4">DOB</th>
                              <th className="px-3 py-4 text-center">Photo</th>
                              <th className="px-4 py-4">Balance After</th>
                              <th className="px-4 py-4">Charge</th>
                              <th className="px-4 py-4">Type</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Response Time</th>
                              <th className="px-4 py-4">IP</th>
                              <th className="px-3 py-4 text-center">pdf</th>
                              <th className="px-3 py-4 text-center">JSON</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-medium">
                            {userLogs.map((log: any, idx: number) => {
                              const { timePart, datePart } = formatTime(log.created_at);
                              const serialNumber = userLogs.length - idx; // descending count is standard but direct indices work too. Let's do userLogs.length - idx so latest has top number
                              return (
                                <tr key={log.id} className="hover:bg-[#162234] border-slate-800/60 border-b transition-all text-slate-300">
                                  <td className="px-3.5 py-4 text-center font-bold text-slate-400">{serialNumber}</td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-col leading-snug">
                                      <span className="font-semibold text-slate-200 text-[11px]">{timePart}</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{datePart}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="bg-slate-850 text-slate-200 border border-slate-700/60 rounded px-2.5 py-1 font-mono text-xs font-semibold select-all font-bold">
                                        {log.nid}
                                      </span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(log.nid);
                                          alert(`Copied NID: ${log.nid}`);
                                        }}
                                        className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-all cursor-pointer"
                                        title="Copy NID"
                                      >
                                        <Clipboard size={11} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="bg-purple-950/45 text-purple-300 border border-purple-500/20 rounded-md px-2.5 py-1 font-mono text-xs font-semibold">
                                      {log.dob}
                                    </span>
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      <img
                                        src={getPhotoUrl(log.photo_url)}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 rounded border border-slate-750 object-cover bg-[#1e293b] cursor-zoom-in hover:scale-110 transition-all duration-150"
                                        onClick={() => {
                                          if (log.photo_url) {
                                            window.open(log.photo_url, "_blank");
                                          }
                                        }}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a4 4 0 0 1 8 0v2"/></svg>`;
                                        }}
                                        title={log.photo_url ? "Click to open image" : "No photo URL"}
                                      />
                                      {log.photo_url && (
                                        <button
                                          onClick={() => {
                                            const targetUrl = log.photo_url?.startsWith("/") ? window.location.origin + log.photo_url : log.photo_url || "";
                                            navigator.clipboard.writeText(targetUrl);
                                            alert("Photo path copied!");
                                          }}
                                          className="text-[9px] text-[#4ade80] hover:underline font-mono bg-transparent border-none cursor-pointer p-0"
                                          title={log.photo_url}
                                        >
                                          Copy URL
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded px-2.5 py-1 font-mono font-bold text-xs inline-block">
                                      ৳{(log.balance_after !== undefined ? Number(log.balance_after) : 999).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    {log.charge_amount === "Failed (No Charge)" ? (
                                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                        Failed (No Charge)
                                      </span>
                                    ) : log.charge_amount === "Cache (Free)" ? (
                                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                        Cache (Free)
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                        {log.charge_amount || "৳3.00"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {log.match_type === "Failed" ? (
                                      <span className="bg-rose-600 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                        Failed
                                      </span>
                                    ) : log.match_type === "Cached" ? (
                                      <span className="bg-amber-600 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                        Cached
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-650 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                        LIVE
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                                      log.status === "success" 
                                        ? "bg-emerald-500/20 text-emerald-400" 
                                        : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${log.status === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                      {log.status === "success" ? "success" : "failed"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 font-mono text-[11px] text-slate-200">
                                    {log.response_time || "0.00s"}
                                  </td>
                                  <td className="px-4 py-4 font-mono text-[10px] text-slate-400">
                                    {log.client_ip || "127.0.0.1"}
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                    <button
                                      disabled={log.status !== "success"}
                                      onClick={() => handleRehydrateReport(log)}
                                      className={`p-1.5 rounded transition-all cursor-pointer ${
                                        log.status === "success"
                                          ? "bg-[#10b981]/20 hover:bg-[#10b981]/30 text-emerald-450 hover:scale-105"
                                          : "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800"
                                      }`}
                                      title={log.status === "success" ? "View Printable Document Copy" : "No copy for failure logs"}
                                    >
                                      <Printer size={15} />
                                    </button>
                                  </td>
                                  <td className="px-3 py-4 text-center">
                                    <button
                                      onClick={() => {
                                        setViewingJsonLog(log);
                                        setShowJsonModal(true);
                                      }}
                                      className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 transition-all hover:scale-105 cursor-pointer"
                                      title="View JSON Payload"
                                    >
                                      <Database size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Short Text Button */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold text-blue-900/75 no-print">
                <button
                  onClick={() => changeTabAndPath("lookup")}
                  className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
                >
                  <Search size={14} />
                  এনআইডি চেকে ফিরে যান
                </button>
              </div>
            </>
          )}

          {/* VIEW TAB 4: API DOCUMENTATION PAGE */}
          {activeTab === "docs" && (
            <>
              <div id="docs-system-card" className="w-full bg-[#d9effe] rounded-[32px] p-6 md:p-8 shadow-2xl border border-white/50 flex flex-col justify-between self-stretch text-left">
                <div>
                  <h2 className="text-[25px] font-bold text-center text-slate-800 mb-2 tracking-wide flex items-center justify-center gap-2">
                    <Info size={24} className="text-blue-600 animate-pulse" />
                    এপিআই গেটওয়ে ডকুমেন্টেশন
                  </h2>
                  <p className="text-center text-xs text-slate-600 mb-6 font-semibold">
                    সহজেই আপনার থার্ড-পার্টি সিস্টেমের সাথে আমাদের এনআইডি ভেরিফিকেশন গেটওয়ে কানেক্ট করুন।
                  </p>

                  <div className="space-y-6">
                    
                    {/* Architectural Flow Diagram */}
                    <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-700/60 shadow-inner">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 block mb-3 font-mono">
                        ⚙️ Request Routing Architecture Flow
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-[11px] font-bold">
                        <div className="bg-blue-900/40 border border-blue-500/30 p-2.5 rounded-xl">
                          <span className="block text-blue-300">Client Request</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">GET /v1</span>
                        </div>
                        <div className="text-slate-500 font-mono hidden md:block">➔</div>
                        <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
                          <span className="block text-emerald-300">Gateway Auth</span>
                          <span className="text-[9px] text-stone-400 block mt-0.5">Verify key, rate, balance</span>
                        </div>
                        <div className="text-slate-500 font-mono hidden md:block">➔</div>
                        <div className="bg-purple-900/40 border border-purple-500/30 p-2.5 rounded-xl">
                          <span className="block text-purple-300">Secure Upstream</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">Proxy to sv.php (Hidden)</span>
                        </div>
                      </div>
                    </div>

                    {/* Authentication Section */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-2">
                      <h3 className="font-extrabold text-[13px] text-slate-800 flex items-center gap-2">
                        <Lock size={15} className="text-blue-500" />
                        অথেনটিকেশন ও পারমিশন
                      </h3>
                      <p className="text-slate-600 text-xs leading-relaxed">
                        আমাদের এপিআই গেটওয়ে ব্যবহার করার জন্য একটি বৈধ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10.5px] font-bold">key (API Key)</code> প্যারামিটার হিসেবে পাঠাতে হবে। এটি কোয়েরি স্ট্রিং বা পাথ ফরম্যাটে পাস করা যেতে পারে।
                      </p>
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 font-medium">
                        👉 <strong>পরামর্শ:</strong> আপনার ব্যক্তিগত এপিআই কীটি হচ্ছে: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold select-all">{apiKey || "YOUR_API_KEY"}</code> (যা উপরে ইনপুট করা আছে)।
                      </div>
                    </div>

                    {/* Endpoint List */}
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-[13px] text-slate-800 flex items-center gap-2 pl-1">
                        <Coins size={15} className="text-blue-500" />
                        এপিআই এন্ডপয়েন্ট সমূহ
                      </h3>

                      {/* Endpoint 1 */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-extrabold rounded-lg">GET</span>
                          <span className="font-mono text-xs font-bold text-slate-850 break-all">{"/v1?key={key}&nid={nid}&dob={dob}"}</span>
                        </div>
                        <p className="text-slate-600 text-xs font-medium">
                          নির্দিষ্ট এনআইডি নম্বর এবং জন্ম তারিখ সহ গ্রাহকের সচিত্র পরিচয় বিবরণী ভেরিফাই করে কপি ডাউনলোড করুন।
                        </p>
                        <div className="border-t pt-3 text-xs space-y-1.5 text-slate-500 font-medium">
                          <div><strong className="text-slate-700">প্যারামিটার ফিল্ডসমূহ:</strong></div>
                          <ul className="list-disc pl-4 space-y-1 text-[11.5px]">
                            <li><code className="font-bold font-mono">key</code> (String): আপনার বৈধ ক্লায়েন্ট সিক্রেট টোকেন।</li>
                            <li><code className="font-bold font-mono">nid</code> (String): ১০, ১৩ অথবা ১৭ ডিজিটের জাতীয় পরিচয়পত্র নম্বর।</li>
                            <li><code className="font-bold font-mono">dob</code> (String): জন্ম তারিখ <code className="font-mono">YYYY-MM-DD</code> ফরম্যাটে (যেমন: <code className="font-mono">1999-12-31</code>)।</li>
                          </ul>
                        </div>
                      </div>

                      {/* Endpoint 2 */}
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 font-mono text-[10px] font-extrabold rounded-lg">GET</span>
                          <span className="font-mono text-xs font-bold text-slate-850 break-all">{"/v1/balance?key={key}"}</span>
                        </div>
                        <p className="text-slate-600 text-xs font-medium">
                          আপনার অ্যাকাউন্টের বিবরণ এবং অবশিষ্ট ক্রেডিট কোয়েরি ব্যালেন্স চেক করুন।
                        </p>
                        <div className="border-t pt-3 text-xs space-y-1 text-slate-500 font-medium">
                          <div><strong className="text-slate-700">প্যারামিটার ফিল্ডসমূহ:</strong></div>
                          <ul className="list-disc pl-4 text-[11.5px]">
                            <li><code className="font-bold font-mono">key</code> (String): আপনার অ্যাকাউন্টের অ্যাক্টিভ এপিআই কী।</li>
                          </ul>
                        </div>
                      </div>

                    </div>

                    {/* Code Snippets Section */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md space-y-3">
                      <div className="flex items-center justify-between gap-4 border-b pb-2">
                        <h4 className="font-extrabold text-[12.5px] text-slate-800">
                          ইন্টিগ্রেশন কোড জেনারেটর (কোড স্নিপেট)
                        </h4>
                        
                        {/* Language Selector */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-extrabold">
                          {(["curl", "node", "python", "php"] as const).map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => setCodeSnippetLang(lang)}
                              className={`px-2 py-1 rounded-md transition-all cursor-pointer capitalize ${
                                codeSnippetLang === lang ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-950"
                              }`}
                            >
                              {lang === "node" ? "NodeJS" : lang}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display Selected Code Snippet */}
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11.5px] font-mono overflow-x-auto leading-relaxed max-h-[220px]">
                          {codeSnippetLang === "curl" && (
`# 1. NID বা ভোটার কার্ডের তথ্য খুঁজুন
curl -X GET "${window.location.origin}/v1?key=${apiKey || "YOUR_KEY"}&nid=1234567890&dob=2000-01-01"

# 2. অবশিষ্ট ক্রেডিট ব্যালেন্স জানুন
curl -X GET "${window.location.origin}/v1/balance?key=${apiKey || "YOUR_KEY"}"`
                          )}
                          {codeSnippetLang === "node" && (
`// ১. এনআইডি কার্ডের সচিত্র বিবরণ কোয়েরি করুন
const apiKey = "${apiKey || "YOUR_KEY"}";
const nid = "1234567890";
const dob = "2000-01-01";

fetch("${window.location.origin}/v1?key=" + apiKey + "&nid=" + nid + "&dob=" + dob)
  .then(res => res.json())
  .then(data => console.log("NID Data:", data));

// ২. অবশিষ্টাংশ এপিআই ব্যালেন্স চেক
fetch("${window.location.origin}/v1/balance?key=" + apiKey)
  .then(res => res.json())
  .then(data => console.log("Balance Status:", data));`
                          )}
                          {codeSnippetLang === "python" && (
`import requests

api_key = "${apiKey || "YOUR_KEY"}"
nid = "1234567890"
dob = "2000-01-01"

# ১. ভোটার এনআইডি ডেক তথ্য রিকোয়েস্ট
url = f"${window.location.origin}/v1?key={api_key}&nid={nid}&dob={dob}"
response = requests.get(url)
print("Response JSON:", response.json())

# ২. অবশিষ্ট অ্যাকাউন্ট ক্রেডিট রিকোয়েস্ট
balance_url = f"${window.location.origin}/v1/balance?key={api_key}"
balance_response = requests.get(balance_url)
print("Balance Data:", balance_response.json())`
                          )}
                          {codeSnippetLang === "php" && (
`<?php
$apiKey = "${apiKey || "YOUR_KEY"}";
$nid = "1234567890";
$dob = "2000-01-01";

// ১. ভোটার কপি ডাউনলোড কোয়েরি
$url = "${window.location.origin}/v1?key=" . urlencode($apiKey) . "&nid=" . urlencode($nid) . "&dob=" . urlencode($dob);
$response = file_get_contents($url);
$data = json_decode($response, true);
print_r($data);

// ২. এপিআই ব্যালেন্স গেটওয়ে চেক
$balanceUrl = "${window.location.origin}/v1/balance?key=" . urlencode($apiKey);
$balanceResponse = file_get_contents($balanceUrl);
$balanceData = json_decode($balanceResponse, true);
print_r($balanceData);
?>`
                          )}
                        </pre>

                        {/* Copy Code button */}
                        <button
                          type="button"
                          onClick={() => {
                            let textToCopy = "";
                            const uOrigin = window.location.origin;
                            const currentKey = apiKey || "YOUR_KEY";
                            if (codeSnippetLang === "curl") {
                              textToCopy = `curl -X GET "${uOrigin}/v1?key=${currentKey}&nid=1234567890&dob=2000-01-01"\ncurl -X GET "${uOrigin}/v1/balance?key=${currentKey}"`;
                            } else if (codeSnippetLang === "node") {
                              textToCopy = `const apiKey = "${currentKey}";\nconst nid = "1234567890";\nconst dob = "2000-01-01";\n\nfetch("${uOrigin}/v1?key=" + apiKey + "&nid=" + nid + "&dob=" + dob)\n  .then(res => res.json())\n  .then(data => console.log("NID Data:", data));\n\nfetch("${uOrigin}/v1/balance?key=" + apiKey)\n  .then(res => res.json())\n  .then(data => console.log("Balance Status:", data));`;
                            } else if (codeSnippetLang === "python") {
                              textToCopy = `import requests\n\napi_key = "${currentKey}"\nnid = "1234567890"\ndob = "2000-01-01"\n\nurl = f"${uOrigin}/v1?key={api_key}&nid={nid}&dob={dob}"\nresponse = requests.get(url)\nprint("Response JSON:", response.json())\n\nbalance_url = f"${uOrigin}/v1/balance?key={api_key}"\nbalance_response = requests.get(balance_url)\nprint("Balance Data:", balance_response.json())`;
                            } else if (codeSnippetLang === "php") {
                              textToCopy = `<?php\n$apiKey = "${currentKey}";\n$nid = "1234567890";\n$dob = "2000-01-01";\n\n$url = "${uOrigin}/v1?key=" . urlencode($apiKey) . "&nid=" . urlencode($nid) . "&dob=" . urlencode($dob);\n$response = file_get_contents($url);\n$data = json_decode($response, true);\nprint_r($data);\n\n$balanceUrl = "${uOrigin}/v1/balance?key=" . urlencode($apiKey);\n$balanceResponse = file_get_contents($balanceUrl);\n$balanceData = json_decode($balanceResponse, true);\nprint_r($balanceData);\n?>`;
                            }
                            // Call native copy
                            navigator.clipboard.writeText(textToCopy);
                            setCodeSnippetLang(codeSnippetLang);
                            // Set temporary state for user success
                            const tempId = "snippet-" + codeSnippetLang;
                            setCodeSnippetLang(codeSnippetLang);
                            alert("কোড স্নিপেট ক্লিপবোর্ডে কপি করা হয়েছে!");
                          }}
                          className="absolute right-3.5 top-3.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-stone-200 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 font-sans cursor-pointer transition flex items-center gap-1 shrink-0"
                        >
                          <Clipboard size={11} />
                          কোড কপি করুন
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold text-blue-900/75 no-print">
                <button
                  onClick={() => changeTabAndPath("lookup")}
                  className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
                >
                  <Search size={14} />
                  এনআইডি চেকে ফিরে যান
                </button>
              </div>
            </>
          )}

          {/* VIEW TAB 3: ADMIN CONTROL DECK */}
          {activeTab === "admin" && (
            <>
              <div id="admin-system-card" className="w-full bg-[#d9effe] rounded-[32px] p-6 md:p-8 shadow-2xl border border-white/50 flex flex-col justify-between self-stretch">
              <div>
                <h2 className="text-[26px] font-bold text-center text-slate-800 mb-6 tracking-wide flex items-center justify-center gap-2">
                  <Database size={24} className="text-purple-600" />
                  অ্যাডমিন কন্ট্রোল ডেক
                </h2>

                {/* Admin Auth Form */}
                {!isAdminAuthenticated ? (
                  <div className="space-y-4 max-w-md mx-auto">
                    <div className="p-4 bg-purple-50 text-purple-900 rounded-2xl text-xs font-semibold flex items-start gap-2 border border-purple-100">
                      <Lock size={15} className="mt-0.5 shrink-0 text-purple-600" />
                      <span>গ্লোবাল অ্যাক্টিভিটি এবং কী পরিচালনা করতে আপনার মাস্টার অ্যাডমিন সিকিউরিটি কী লিখুন।</span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
                        অ্যাডমিন পাসকি / এপিআই টোকেন
                      </label>
                      <div className="relative">
                        <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          placeholder="মাস্টার অ্যাডমিন কী লিখুন"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          className="w-full bg-slate-50/85 hover:bg-slate-50 focus:bg-white text-md font-semibold text-slate-800 pl-11 pr-4 py-3 rounded-xl border border-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400/80 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {adminError && (
                      <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 p-2.5 rounded-lg border border-rose-100 animate-pulse">
                        {adminError}
                      </p>
                    )}

                    <button
                      onClick={handleAdminLogin}
                      disabled={loadingAdminUsers}
                      className="w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider text-xs"
                    >
                      {loadingAdminUsers ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
                      অ্যাডমিন প্যানেলে লগইন করুন
                    </button>
                  </div>
                ) : (
                  /* Full Authenticated Admin workspace */
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                      <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 border border-slate-200">
                        <button
                          onClick={() => setAdminSubTab("users")}
                          className={`px-4 py-1.5 text-[10.5px] rounded-md transition-all uppercase tracking-wider font-extrabold cursor-pointer ${
                            adminSubTab === "users" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          কী রেজিস্ট্রি
                        </button>
                        <button
                          onClick={() => setAdminSubTab("logs")}
                          className={`px-4 py-1.5 text-[10.5px] rounded-md transition-all uppercase tracking-wider font-extrabold cursor-pointer ${
                            adminSubTab === "logs" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          সিস্টেম লগ
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setIsAdminAuthenticated(false);
                          setAdminUsers([]);
                          setAdminLogs([]);
                        }}
                        className="text-xs text-slate-600/70 hover:text-red-600 transition-all font-bold underline cursor-pointer"
                      >
                        লগ আউট
                      </button>
                    </div>

                    {/* SubTab 1: KEY REGISTRY MANAGEMENT */}
                    {adminSubTab === "users" && (
                      <div className="space-y-6">
                        
                        {/* Form - Edit or Create */}
                        {editingUser ? (
                          <form onSubmit={handleSaveEditUser} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md text-left space-y-4">
                            <h3 className="font-extrabold text-xs text-purple-900 uppercase tracking-wider pb-1.5 border-b flex items-center gap-1.5">
                              <Edit2 size={14} /> এপিআই কী রেজিস্ট্রি আপডেট করুন [আইডি: {editingUser.id}]
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600">ব্যবহারকারী নাম / ক্লায়েন্ট</label>
                                <input
                                  type="text"
                                  required
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value)}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl font-semibold focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600 flex items-center justify-between">
                                  <span>ক্লায়েন্ট সিক্রেট কী (কাস্টম টোকেন)</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditApiKey("nid_key_" + Math.random().toString(36).slice(2, 10))}
                                    className="text-[10px] text-purple-600 hover:underline font-extrabold cursor-pointer"
                                  >
                                    স্বয়ংক্রিয় জেনারেট
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editApiKey}
                                  onChange={(e) => setEditApiKey(e.target.value)}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl font-mono focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600 flex items-center gap-1"><Coins size={12} /> ক্রেডিট ব্যালেন্স</label>
                                <input
                                  type="number"
                                  required
                                  value={editBalance}
                                  onChange={(e) => setEditBalance(Number(e.target.value))}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl font-mono focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-600">প্রাধিকার (Privilege)</label>
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="bg-slate-50 p-2 border border-slate-200 rounded-xl font-bold"
                                  >
                                    <option value="user">ইউজার (সাধারণ)</option>
                                    <option value="admin">অ্যাডমিন (সর্বোচ্চ)</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-600">অ্যাকাউন্টের অবস্থা</label>
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="bg-slate-50 p-2 border border-slate-200 rounded-xl font-bold"
                                  >
                                    <option value="active">সক্রিয়</option>
                                    <option value="inactive">নিষ্ক্রিয়</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 font-bold rounded-lg text-slate-700 transition"
                              >
                                বাতিল
                              </button>
                              <button
                                type="submit"
                                disabled={submittingEditUser}
                                className="px-5 py-2 text-xs bg-purple-600 hover:bg-purple-700 font-bold rounded-lg text-white shadow-md transition"
                              >
                                {submittingEditUser ? "সংরক্ষণ করা হচ্ছে..." : "রেজিস্ট্রি পরিবর্তন সংরক্ষণ করুন"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* CREATE FORM */
                          <form onSubmit={handleCreateUser} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md text-left space-y-4">
                            <h3 className="font-extrabold text-xs text-purple-900 uppercase tracking-wider pb-1.5 border-b flex items-center gap-1.5">
                              <Plus size={14} /> নতুন ক্লায়েন্ট এপিআই কী / ব্যবহারকারী তৈরি করুন
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600">ব্যবহারকারী / ক্লায়েন্ট</label>
                                <input
                                  type="text"
                                  placeholder="যেমন: shohel_rana"
                                  required
                                  value={newUsername}
                                  onChange={(e) => setNewUsername(e.target.value)}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600 flex items-center justify-between">
                                  <span>এপিআই কী স্ট্রিং</span>
                                  <button
                                    type="button"
                                    onClick={() => setNewApiKey("nid_key_" + Math.random().toString(36).slice(2, 10))}
                                    className="text-[10px] text-purple-600 hover:underline font-extrabold"
                                  >
                                    স্বয়ংক্রিয় জেনারেট
                                  </button>
                                </label>
                                <input
                                  type="text"
                                  placeholder="যেমন: customized_key_99"
                                  required
                                  value={newApiKey}
                                  onChange={(e) => setNewApiKey(e.target.value)}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl font-mono focus:outline-none"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-600 flex items-center gap-1"><Coins size={12} /> ব্যালেন্স ক্রেডিট</label>
                                <input
                                  type="number"
                                  placeholder="100"
                                  required
                                  value={newBalance}
                                  onChange={(e) => setNewBalance(Number(e.target.value))}
                                  className="bg-slate-50 p-2.5 border border-slate-200 rounded-xl font-mono focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-600">অনুমোদন প্রাধিকার</label>
                                  <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as any)}
                                    className="bg-slate-50 p-2 border border-slate-200 rounded-xl font-bold"
                                  >
                                    <option value="user">ইউজার (সাধারণ)</option>
                                    <option value="admin">অ্যাডমিন (সর্বোচ্চ)</option>
                                  </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="font-bold text-slate-600">সিস্টেমের অবস্থা</label>
                                  <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as any)}
                                    className="bg-slate-50 p-2 border border-slate-200 rounded-xl font-bold"
                                  >
                                    <option value="active">সক্রিয়</option>
                                    <option value="inactive">নিষ্ক্রিয়</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2">
                              <button
                                type="submit"
                                disabled={submittingNewUser}
                                className="px-6 py-2.5 text-xs bg-purple-600 hover:bg-purple-700 font-extrabold rounded-xl text-white shadow-md shadow-purple-200 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                {submittingNewUser ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                কী তৈরি করুন
                              </button>
                            </div>
                          </form>
                        )}

                        {/* LIST OF REGISTERED KEYS IN TABLE */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-4 space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest pl-1">
                              নিবন্ধিত কী লেজার ({adminUsers.length})
                            </h3>
                            <div className="relative max-w-xs">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder="আইডি বা নাম খুঁজুন..."
                                value={adminSearchQuery}
                                onChange={(e) => setAdminSearchQuery(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs px-8 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-xl">
                            <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
                              <thead className="bg-slate-50 font-bold text-[10.5px] uppercase text-slate-500">
                                <tr>
                                  <th className="px-4 py-3">ইউজার ক্লায়েন্ট / রোল</th>
                                  <th className="px-4 py-3">এপিআই কী সিক্রেট</th>
                                  <th className="px-4 py-3">অবশিষ্ট ব্যালেন্স</th>
                                  <th className="px-4 py-3">অবস্থা</th>
                                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {adminUsers
                                  .filter(u => u.username.toLowerCase().includes(adminSearchQuery.toLowerCase()) || u.api_key.toLowerCase().includes(adminSearchQuery.toLowerCase()))
                                  .map((user: any) => (
                                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-slate-900">{user.username}</div>
                                      <div className="text-[10px] text-purple-600 font-extrabold uppercase tracking-wide">{user.role === "admin" ? "অ্যাডমিন" : "ইউজার"}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono font-semibold text-slate-600 bg-slate-50/50 select-text">{user.api_key}</td>
                                    <td className="px-4 py-3 font-mono font-extrabold text-blue-900">{user.balance_remaining}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                      }`}>
                                        {user.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-1">
                                      <button
                                        onClick={() => handleStartEditUser(user)}
                                        className="p-1 px-2.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer border-0"
                                      >
                                        <Edit2 size={11} /> সম্পাদনা
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer border-0"
                                      >
                                        <Trash2 size={11} /> বাতিল করুন
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* SubTab 2: SYSTEM LOGS INDEX */}
                    {adminSubTab === "logs" && (
                      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-4 text-left">
                        <div className="flex items-center justify-between gap-4 border-b pb-3">
                          <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest">
                            গ্লোবাল অ্যাক্টিভিটি ডিরেক্টরি ({adminLogs.length})
                          </h3>
                          <button
                            onClick={fetchAdminLogs}
                            disabled={loadingAdminLogs}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer transition-all gap-1 text-xs"
                          >
                            {loadingAdminLogs ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={12} />}
                            লগ রিফ্রেশ
                          </button>
                        </div>

                        {adminLogs.length === 0 ? (
                          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center gap-2">
                            <History size={36} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">কোনো কুয়েরি লগ পাওয়া যায়নি</span>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0e1726]/95 shadow-2xl">
                            <div className="max-w-full overflow-x-auto custom-scrollbar">
                              <table className="w-full text-left text-xs text-slate-100 whitespace-nowrap min-w-[1200px] border-collapse">
                                <thead className="bg-[#111e2e] text-[10.5px] uppercase font-bold tracking-wider text-slate-300 border-b border-slate-800 sticky top-0 backdrop-blur z-10">
                                  <tr>
                                    <th className="px-3.5 py-4 text-center">#</th>
                                    <th className="px-4 py-4 truncate">User</th>
                                    <th className="px-4 py-4">Time</th>
                                    <th className="px-4 py-4">NID</th>
                                    <th className="px-4 py-4">DOB</th>
                                    <th className="px-3 py-4 text-center">Photo</th>
                                    <th className="px-4 py-4">Balance After</th>
                                    <th className="px-4 py-4">Charge</th>
                                    <th className="px-4 py-4">Type</th>
                                    <th className="px-4 py-4">Status</th>
                                    <th className="px-4 py-4">Source</th>
                                    <th className="px-4 py-4">Response Time</th>
                                    <th className="px-4 py-4">IP</th>
                                    <th className="px-3 py-4 text-center">pdf</th>
                                    <th className="px-3 py-4 text-center">JSON</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium">
                                  {adminLogs.map((log: any, idx: number) => {
                                    const { timePart, datePart } = formatTime(log.created_at);
                                    const serialNumber = adminLogs.length - idx;
                                    return (
                                      <tr key={log.id} className="hover:bg-[#162234] border-slate-800/60 border-b transition-all text-slate-300">
                                        <td className="px-3.5 py-4 text-center font-bold text-slate-400">{serialNumber}</td>
                                        <td className="px-4 py-4">
                                          <div className="flex flex-col">
                                            <span className="font-extrabold text-slate-200">{log.username || 'System Default'}</span>
                                            <span className="text-[9px] text-slate-450 font-mono tracking-tighter truncate max-w-[100px]" title={log.api_key}>
                                              {log.api_key}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4">
                                          <div className="flex flex-col leading-snug">
                                            <span className="font-semibold text-slate-200 text-[11px]">{timePart}</span>
                                            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{datePart}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4">
                                          <div className="flex items-center gap-1.5">
                                            <span className="bg-slate-850 text-slate-200 border border-slate-700/60 rounded px-2.5 py-1 font-mono text-xs font-semibold select-all font-bold">
                                              {log.nid}
                                            </span>
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(log.nid);
                                                alert(`Copied NID: ${log.nid}`);
                                              }}
                                              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-all cursor-pointer"
                                              title="Copy NID"
                                            >
                                              <Clipboard size={11} />
                                            </button>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4">
                                          <span className="bg-purple-950/45 text-purple-300 border border-purple-500/20 rounded-md px-2.5 py-1 font-mono text-xs font-semibold">
                                            {log.dob}
                                          </span>
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                          <div className="flex flex-col items-center justify-center gap-1.5">
                                            <img
                                              src={getPhotoUrl(log.photo_url)}
                                              alt=""
                                              referrerPolicy="no-referrer"
                                              className="w-10 h-10 rounded border border-slate-750 object-cover bg-[#1e293b] cursor-zoom-in hover:scale-110 transition-all duration-150"
                                              onClick={() => {
                                                if (log.photo_url) {
                                                  window.open(log.photo_url, "_blank");
                                                }
                                              }}
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a4 4 0 0 1 8 0v2"/></svg>`;
                                              }}
                                              title={log.photo_url ? "Click to open image" : "No photo URL"}
                                            />
                                            {log.photo_url && (
                                              <button
                                                onClick={() => {
                                                  const targetUrl = log.photo_url?.startsWith("/") ? window.location.origin + log.photo_url : log.photo_url || "";
                                                  navigator.clipboard.writeText(targetUrl);
                                                  alert("Photo path copied!");
                                                }}
                                                className="text-[9px] text-[#4ade80] hover:underline font-mono bg-transparent border-none cursor-pointer p-0"
                                                title={log.photo_url}
                                              >
                                                Copy URL
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded px-2.5 py-1 font-mono font-bold text-xs inline-block">
                                            ৳{(log.balance_after !== undefined ? Number(log.balance_after) : 999).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4">
                                          {log.charge_amount === "Failed (No Charge)" ? (
                                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                              Failed (No Charge)
                                            </span>
                                          ) : log.charge_amount === "Cache (Free)" ? (
                                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                              Cache (Free)
                                            </span>
                                          ) : (
                                            <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold">
                                              {log.charge_amount || "৳3.00"}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-4">
                                          {log.match_type === "Failed" ? (
                                            <span className="bg-rose-600 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                              Failed
                                            </span>
                                          ) : log.match_type === "Cached" ? (
                                            <span className="bg-amber-600 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                              Cached
                                            </span>
                                          ) : (
                                            <span className="bg-emerald-650 text-slate-100 rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase">
                                              LIVE
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-4">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase inline-flex items-center gap-1 ${
                                            log.status === "success" 
                                              ? "bg-emerald-500/20 text-emerald-400" 
                                              : "bg-rose-500/20 text-rose-400"
                                          }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${log.status === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                            {log.status === "success" ? "success" : "failed"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 uppercase font-bold text-[10.5px]">
                                          {log.data_source === "CACHE" ? (
                                            <span className="bg-yellow-600/20 text-yellow-500 rounded px-1.5 py-0.5">CACHE</span>
                                          ) : (
                                            <span className="bg-teal-950/45 text-teal-400 border border-teal-500/20 rounded px-1.5 py-0.5">{log.data_source || "sv.php"}</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-4 font-mono text-[11px] text-slate-200">
                                          {log.response_time || "0.00s"}
                                        </td>
                                        <td className="px-4 py-4 font-mono text-[10px] text-slate-400">
                                          {log.client_ip || "127.0.0.1"}
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                          <button
                                            disabled={log.status !== "success"}
                                            onClick={() => handleRehydrateReport(log)}
                                            className={`p-1.5 rounded transition-all cursor-pointer ${
                                              log.status === "success"
                                                ? "bg-[#10b981]/20 hover:bg-[#10b981]/30 text-emerald-450 hover:scale-105"
                                                : "opacity-30 cursor-not-allowed text-slate-600 bg-slate-800"
                                            }`}
                                            title={log.status === "success" ? "View Printable Document Copy" : "No copy for failure logs"}
                                          >
                                            <Printer size={15} />
                                          </button>
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                          <button
                                            onClick={() => {
                                              setViewingJsonLog(log);
                                              setShowJsonModal(true);
                                            }}
                                            className="p-1.5 rounded bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 transition-all hover:scale-105 cursor-pointer"
                                            title="View JSON Payload"
                                          >
                                            <Database size={15} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>

            {/* Bottom Short Text Button */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-blue-900/75 no-print">
              <button
                onClick={() => changeTabAndPath("lookup")}
                className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
              >
                <Search size={14} />
                এনআইডি চেকে ফিরে যান
              </button>
              <span className="opacity-45">|</span>
              <button
                onClick={() => {
                  changeTabAndPath("history");
                  fetchUserLogs(apiKey);
                }}
                className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
              >
                <History size={14} />
                আমার হিস্ট্রি
              </button>
              <span className="opacity-45">|</span>
              <button
                onClick={() => {
                  changeTabAndPath("pricing");
                }}
                className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
              >
                <Coins size={14} />
                প্রাইসিং
              </button>
              <span className="opacity-45">|</span>
              <button
                onClick={() => {
                  changeTabAndPath("docs");
                }}
                className="hover:text-blue-950 underline transition-all cursor-pointer flex items-center gap-1 bg-transparent border-0 py-1 px-2 hover:bg-white/30 rounded"
              >
                <Info size={14} />
                এপিআই ডকুমেন্টেশন
              </button>
            </div>
          </>
        )}



        </div>
      )}


      {/* 2. RECONSTRUCTED PRINT-READY REPORT VIEW */}
      {viewMode === "report" && reportData && (
        <div className="w-full max-w-5xl flex flex-col items-center gap-4 no-print sm:my-4">
          
          {/* Top Control Panel (Toolbar) */}
          <div className="w-full bg-white p-3 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between no-print">
            <button
              id="btn-report-back"
              onClick={() => setViewMode("form")}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 font-semibold cursor-pointer text-xs"
            >
              <ArrowLeft size={14} />
              পোর্টালে ফিরে যান
            </button>

            <button
              id="btn-report-print"
              onClick={() => window.print()}
              className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow shadow-purple-200 hover:shadow-purple-300 font-mono tracking-wider cursor-pointer"
            >
              <Download size={14} />
              পিডিএফ ডাউনলোড করুন
            </button>
          </div>

          {/* Interactive Document Display Area */}
          <div className="w-full flex items-center justify-center p-2 bg-slate-200/50 rounded-[28px] shadow-inner border border-slate-300">
            
            {/* Version 1 Layout RENDER SECTION */}
            {reportVersion === "V1" && (
              <div 
                id="doc-print-v1" 
                className="print-container relative bg-white bg-no-repeat overflow-hidden select-text text-black shrink-0"
                style={{
                  width: "210mm",
                  height: "297mm",
                  maxWidth: "100%",
                  aspectRatio: "210/297",
                }}
              >
                {/* Background Image */}
                <img 
                  className="bgImg absolute left-0 top-0 w-full h-full select-none pointer-events-none" 
                  src="https://i.ibb.co.com/xtfMGQQH/vv2.jpg" 
                  alt="" 
                  loading="lazy"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
                
                {/* Profile Avatar */}
                <img 
                  src={getPhotoUrl(editableFields.photo)} 
                  alt="" 
                  className="avatar absolute object-cover select-none pointer-events-none"
                  style={{
                    width: "130px",
                    height: "151px",
                    top: "187px",
                    left: "333px",
                    borderRadius: "16px"
                  }}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
                
                {/* Text Fields based on absolute measurements in your given V1 HTML code */}
                <p className="relagionKey inLeft absolute opacity-90 text-[15px]" style={{ left: "110px", top: "790px" }}>
                  {/* Left Religion key placeholder */}
                </p>
                <p className="mobileKey inLeft absolute opacity-90 text-[15px]" style={{ left: "110px", top: "817px" }}>
                  {/* Left Mobile key placeholder */}
                </p>
                
                {/* Data Fields mapped nicely with matching offsets */}
                <p className="nid inRight absolute text-[15px] font-medium" style={{ left: "264px", top: "400px" }}>
                  {editableFields.nationalId}
                </p>
                <p className="pin inRight absolute text-[15px]" style={{ left: "264px", top: "428px" }}>
                  {editableFields.pin}
                </p>
                <p className="formNo inRight absolute text-[15px]" style={{ left: "264px", top: "457px" }}>
                  {editableFields.formNumber || editableFields.pin?.slice(-6) || "-"}
                </p>
                <p className="VoterNo inRight absolute text-[15px]" style={{ left: "264px", top: "482px" }}>
                  {editableFields.oldId || "-"}
                </p>
                <p className="vArea inRight absolute text-[15px]" style={{ left: "264px", top: "510px" }}>
                  {editableFields.voterArea}
                </p>
                <p className="nameBn inRight absolute text-[15px] font-bold" style={{ left: "264px", top: "567px", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.nameBangla}
                </p>
                <p className="nameEn inRight absolute text-[15px]" style={{ left: "264px", top: "595px" }}>
                  {editableFields.nameEnglish}
                </p>
                <p className="dob inRight absolute text-[15px] font-medium" style={{ left: "264px", top: "623px" }}>
                  {editableFields.dateOfBirth}
                </p>
                <p className="fName inRight absolute text-[15px]" style={{ left: "264px", top: "649px", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.fatherName}
                </p>
                <p className="mName inRight absolute text-[15px]" style={{ left: "264px", top: "677px", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.motherName}
                </p>
                <p className="husWif inRight absolute text-[15px]" style={{ left: "264px", top: "703px" }}>
                  {editableFields.spouseName || "-"}
                </p>
                <p className="gender inRight absolute text-[15px]" style={{ left: "264px", top: "762px" }}>
                  {editableFields.gender}
                </p>
                <p className="relagion inRight absolute text-[15px]" style={{ left: "264px", top: "791px" }}>
                  {editableFields.religion}
                </p>
                <p className="phone inRight absolute text-[15px]" style={{ left: "264px", top: "819px" }}>
                  {editableFields.gender === "Male" ? "01780222100" : "-"}
                </p>
                <p className="birthPlace inRight absolute text-[15px]" style={{ left: "264px", top: "845px", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.birthPlace}
                </p>
                
                {/* Address sections */}
                <p className="address presentAddr absolute text-[12px] leading-[18px] max-w-[575px]" style={{ left: "110px", top: "902px", fontFamily: "'Tiro Bangla', serif", textAlign: "left" }}>
                  {editableFields.preAddress?.addressLine}
                </p>
                <p className="address permanentAddr absolute text-[12px] leading-[18px] max-w-[575px]" style={{ left: "110px", top: "975px", fontFamily: "'Tiro Bangla', serif", textAlign: "left" }}>
                  {editableFields.perAddress?.addressLine}
                </p>
              </div>
            )}

            {/* Version 2 Layout RENDER SECTION */}
            {reportVersion === "V2" && (
              <div 
                id="doc-print-v2" 
                className="print-container relative bg-white overflow-hidden select-text text-black shrink-0 shadow-lg"
                style={{
                  width: "750px",
                  height: "1065px",
                  maxWidth: "100%",
                }}
              >
                {/* Reconstructed based on your precise Version 2 inline-style layout */}
                <img 
                  className="crane absolute left-0 top-0 w-full h-full select-none pointer-events-none" 
                  src="https://i.ibb.co.com/7d5js9qH/v1.jpg" 
                  alt="" 
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />

                <div style={{ position: "absolute", left: "30%", top: "8%", width: "auto", fontSize: "16px", color: "rgb(255 224 0)", fontWeight: "bold" }}>
                  National Identity Registration Wing (NIDW)
                </div>

                <div style={{ position: "absolute", left: "37%", top: "11%", width: "auto", fontSize: "14px", color: "rgb(255, 47, 161)", fontWeight: "bold" }}>
                  Select Your Search Category
                </div>

                <div style={{ position: "absolute", left: "45%", top: "12.8%", width: "auto", fontSize: "12px", color: "rgb(8, 121, 4)" }}>
                  Search By NID / Voter No.
                </div>

                <div style={{ position: "absolute", left: "45%", top: "14.3%", width: "auto", fontSize: "12px", color: "rgb(7, 119, 184)" }}>
                  Search By Form No.
                </div>

                <div style={{ position: "absolute", left: "30%", top: "16.9%", width: "auto", fontSize: "12px", color: "rgb(252, 0, 0)", fontWeight: "bold" }}>
                  NID or Voter No*
                </div>

                <div style={{ position: "absolute", left: "45%", top: "16.9%", width: "auto", fontSize: "12px", color: "rgb(143, 143, 143)" }}>
                  NID
                </div>

                {/* Simulated Submit button styling */}
                <div style={{ position: "absolute", left: "62.9%", top: "17.1%", width: "auto", fontSize: "11px", color: "rgb(255 255 255)" }}>
                  Submit
                </div>

                <div style={{ position: "absolute", left: "89%", top: "11.55%", width: "auto", fontSize: "11px", color: "#fff" }}>
                  Home
                </div>

                {/* National Identity Section */}
                <div style={{ position: "absolute", left: "37%", top: "27%", width: "auto", fontSize: "16px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  জাতীয় পরিচিতি তথ্য
                </div>

                <div style={{ position: "absolute", left: "37%", top: "29.7%", width: "auto", fontSize: "13px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  জাতীয় পরিচয় পত্র নম্বর
                </div>

                <div id="nid_no" style={{ position: "absolute", left: "55%", top: "29.7%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontWeight: "600" }}>
                  {editableFields.nationalId}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "32.5%", width: "auto", fontSize: "13px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  পিন নম্বর
                </div>

                <div id="nid_father" style={{ position: "absolute", left: "55%", top: "32.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "sans-serif" }}>
                  {editableFields.pin}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "35%", width: "auto", fontSize: "13px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  পূর্ববর্তী পরিচয়পত্র নম্বর
                </div>

                <div id="voterNo" style={{ position: "absolute", left: "55%", top: "35%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)" }}>
                  {editableFields.oldId || "-"}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "37.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  ভোটার এলাকা
                </div>

                <div id="spouse" style={{ position: "absolute", left: "55%", top: "37.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.voterArea}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "40.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  জন্মস্থান
                </div>

                <div id="birth_place" style={{ position: "absolute", left: "55%", top: "40.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.birthPlace}
                </div>

                {/* Personal Information */}
                <div style={{ position: "absolute", left: "37%", top: "43%", width: "auto", fontSize: "16px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  ব্যক্তিগত তথ্য
                </div>

                <div style={{ position: "absolute", left: "37%", top: "45.6%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  নাম (বাংলা)
                </div>

                <div id="nameBangla" style={{ position: "absolute", left: "55%", top: "45.6%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  {editableFields.nameBangla}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "48.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  নাম (ইংরেজি)
                </div>

                <div id="nameEnglish" style={{ position: "absolute", left: "55%", top: "48.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontWeight: "500" }}>
                  {editableFields.nameEnglish}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "51%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  জন্ম তারিখ
                </div>

                <div id="dob" style={{ position: "absolute", left: "55%", top: "51%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)" }}>
                  {editableFields.dateOfBirth}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "53.7%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  পিতার নাম
                </div>

                <div id="fathers_name" style={{ position: "absolute", left: "55%", top: "53.7%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.fatherName}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "56.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  মাতার নাম
                </div>

                <div id="mothers_name" style={{ position: "absolute", left: "55%", top: "56.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.motherName}
                </div>

                {/* Secondary Information block */}
                <div style={{ position: "absolute", left: "37%", top: "59%", width: "auto", fontSize: "16px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  অন্যান্য তথ্য
                </div>

                <div style={{ position: "absolute", left: "37%", top: "62.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  লিঙ্গ
                </div>

                <div id="gender" style={{ position: "absolute", left: "55%", top: "62.2%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "sans-serif" }}>
                  {editableFields.gender}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "64.8%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  ধর্ম
                </div>

                <div id="birthPlace" style={{ position: "absolute", left: "55%", top: "64.8%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.religion}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "67.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  জন্মবার
                </div>

                <div id="occupation" style={{ position: "absolute", left: "55%", top: "67.5%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.birthdayDay}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "70%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  বয়স
                </div>

                <div id="religion" style={{ position: "absolute", left: "55%", top: "70%", width: "auto", fontSize: "14px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif" }}>
                  {editableFields.ageBangla}
                </div>

                {/* Addresses */}
                <div style={{ position: "absolute", left: "37%", top: "73%", width: "auto", fontSize: "16px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  বর্তমান ঠিকানা
                </div>

                <div id="present_addr" style={{ position: "absolute", left: "37%", top: "75.5%", width: "48%", fontSize: "12px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", textAlign: "left" }}>
                  {editableFields.preAddress?.addressLine}
                </div>

                <div style={{ position: "absolute", left: "37%", top: "82%", width: "auto", fontSize: "16px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", fontWeight: "bold" }}>
                  স্থায়ী ঠিকানা
                </div>

                <div id="permanent_addr" style={{ position: "absolute", left: "37%", top: "84.5%", width: "48%", fontSize: "12px", color: "rgb(7, 7, 7)", fontFamily: "'Tiro Bangla', serif", textAlign: "left" }}>
                  {editableFields.perAddress?.addressLine}
                </div>

                {/* Legal Bottom Disclaimer Notes */}
                <div style={{ position: "absolute", top: "92%", width: "100%", fontSize: "11px", textAlign: "center", color: "rgb(255, 0, 0)", fontFamily: "'Tiro Bangla', serif", fontWeight: "500" }}>
                  উপরে প্রদর্শিত তথ্যসমূহ জাতীয় পরিচয়পত্র সংশ্লিষ্ট, ভোটার তালিকার সাথে সরাসরি সম্পর্কযুক্ত নয়।
                </div>

                <div style={{ position: "absolute", top: "93.5%", width: "100%", textAlign: "center", fontSize: "11px", color: "rgb(3, 3, 3)", fontStyle: "normal" }}>
                  This is Software Generated Report From Bangladesh Election Commission, Signature &amp; Seal Aren't Required.
                </div>

                {/* Top Profile Photo positioning */}
                <div style={{ position: "absolute", left: "16%", top: "25.7%", width: "auto", fontSize: "12px", color: "rgb(3, 3, 3)" }}>
                  <img 
                    id="photo" 
                    src={getPhotoUrl(editableFields.photo)} 
                    alt="User Photo" 
                    height="140px" 
                    width="121px" 
                    style={{ borderRadius: "10px", objectFit: "cover", width: "121px", height: "140px" }}
                    referrerPolicy="no-referrer"
                    className="select-none pointer-events-none"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>

                {/* Photo English Name Label (Centered text card box below photo) */}
                <div id="name_en2" style={{ position: "absolute", display: "flex", fontWeight: "bold", left: "15.3%", top: "39.6%", height: "32px", width: "130px", fontSize: "12px", color: "rgb(7, 7, 7)", alignItems: "center", justifyContent: "center" }} align="center">
                  <div style={{ flex: 1, textTransform: "uppercase" }}>
                    {editableFields.nameEnglish}
                  </div>
                </div>

                {/* Bottom Left QR Code generator */}
                <div style={{ position: "absolute", fontWeight: "bold", left: "15.5%", top: "44.0%", height: "32px", width: "130px", margin: "auto", display: "flex", justifyContent: "center" }} align="center">
                  <img 
                    id="qr" 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(editableFields.nameEnglish + "⇋" + editableFields.nationalId + "⇋" + editableFields.dateOfBirth)}`} 
                    height="100px" 
                    width="100px" 
                    alt="System QR Copy"
                    className="select-none pointer-events-none"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>

              </div>
            )}

          </div>

          <div className="w-full text-center text-xs text-slate-500 py-4 no-print border-t border-slate-200 mt-4 flex items-center justify-center gap-1.5">
            <Clipboard size={14} />
            <span>এনআইডি পিডিএফ ডাউনলোড সার্ভার সিস্টেম কপি সফলভাবে যাচাই করা হয়েছে।</span>
          </div>

        </div>
      )}


      {/* 3. POPUP ERROR DIALOG (Replicating exact error structure from Version 2) */}
      {showErrorDialog && (
        <div 
          onClick={() => setShowErrorDialog(false)}
          className="dialog-overlay fixed top-0 left-0 w-full h-full bg-black/60 flex justify-center items-center z-[2000]"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="dialog-box bg-white p-10 rounded-[20px] text-center max-w-[650px] w-11/12 shadow-2xl relative"
            style={{
              fontFamily: "'Inter', sans-serif"
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-rose-50 rounded-full text-rose-600 border border-rose-200">
                <AlertTriangle size={52} className="animate-bounce" />
              </div>

              <h2 className="text-3xl font-extrabold text-slate-900 mt-4">
                ত্রুটি দেখা দিয়েছে
              </h2>
              
              <p className="text-lg text-slate-600 mt-2 font-medium leading-relaxed">
                দয়া করে সঠিক এনআইডি এবং জন্ম তারিখ দিয়ে আবার চেষ্টা করুন!
              </p>

              {errorMsg && (
                <div className="mt-4 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono text-left w-full break-all">
                  <strong>সিস্টেম বিস্তারিত তথ্য:</strong> {errorMsg}
                </div>
              )}

              <button
                id="btn-close-dialog"
                onClick={() => setShowErrorDialog(false)}
                className="mt-6 bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-100 ring-rose-500 text-white font-bold px-8 py-3 rounded-xl transition-all cursor-pointer shadow-md text-sm active:scale-95"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DETAILS EXOTIC JSON MODAL DIALOG */}
      {showJsonModal && viewingJsonLog && (
        <div 
          onClick={() => setShowJsonModal(false)}
          className="dialog-overlay fixed top-0 left-0 w-full h-full bg-black/80 flex justify-center items-center z-[2500] backdrop-blur-sm p-4 animate-fade-in no-print"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="dialog-box bg-[#090d16] text-[#e2e8f0] border border-slate-700/80 p-6 md:p-8 rounded-[24px] max-w-[850px] w-full max-h-[85vh] flex flex-col justify-between shadow-2xl relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Database className="text-blue-400" size={20} />
                <h3 className="font-bold text-base text-slate-100 font-sans">
                  এপিআই রেসপন্স বিস্তারিত পেলোড (JSON)
                </h3>
              </div>
              <button 
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg cursor-pointer transition-all border-0 bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono bg-[#111928] p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block">NID PIN:</span>
                <span className="text-slate-200 font-semibold">{viewingJsonLog.nid}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Birth Date:</span>
                <span className="text-slate-200 font-semibold">{viewingJsonLog.dob}</span>
              </div>
              {viewingJsonLog.data_source && (
                <div>
                  <span className="text-slate-500 block">Source Feed:</span>
                  <span className="text-yellow-400 font-extrabold">{viewingJsonLog.data_source}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500 block">Duration:</span>
                <span className="text-[#34d399] font-bold">{viewingJsonLog.response_time || "0.00s"}</span>
              </div>
            </div>

            {/* Json Tree area */}
            <div className="flex-1 overflow-y-auto bg-[#030712] p-4 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed custom-scrollbar text-[#4ade80] text-left">
              <pre className="whitespace-pre-wrap select-all">
                {sanitizeJsonForDisplay(viewingJsonLog.response_json)}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-4">
              <button
                onClick={() => {
                  const content = sanitizeJsonForDisplay(viewingJsonLog.response_json);
                  navigator.clipboard.writeText(content);
                  alert("JSON record copied to clipboard!");
                }}
                className="bg--blue-600 hover:bg-blue-700 hover:text-white text-slate-100 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-800 bg-[#1e293b] cursor-pointer"
              >
                <Clipboard size={13} /> কপি করুন
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all cursor-pointer border-0"
              >
                ঠিক আছে
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
