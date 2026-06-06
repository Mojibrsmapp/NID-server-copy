<?php
/**
 * Administration Workbench Gateway
 * Grants control over database records, user registries, balance allocations, and query ledgers.
 */

session_start();
require_once __DIR__ . '/config.php';

// Log out trigger
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    unset($_SESSION['admin_key']);
    header('Location: admin.php');
    exit;
}

// Key verification trigger
$authErrorMsg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_admin_key'])) {
    $enteredKey = trim($_POST['login_admin_key']);
    try {
        $stmt = $db->prepare("SELECT * FROM users WHERE api_key = ? AND role = 'admin' AND status = 'active'");
        $stmt->execute([$enteredKey]);
        $adm = $stmt->fetch();

        if ($adm !== false) {
            $_SESSION['admin_key'] = $enteredKey;
            header('Location: admin.php');
            exit;
        } else {
            $authErrorMsg = 'প্রবেশকৃত এডমিন কী সঠিক নয় অথবা অ্যাকাউন্টটি সচল নয়!';
        }
    } catch (PDOException $e) {
        $authErrorMsg = 'Database connection error: ' . $e->getMessage();
    }
}

// Validate active admin session keys
$isAdminAuthenticated = false;
$activeAdminUser = null;

if (isset($_SESSION['admin_key'])) {
    try {
        $stmt = $db->prepare("SELECT * FROM users WHERE api_key = ? AND role = 'admin' AND status = 'active'");
        $stmt->execute([$_SESSION['admin_key']]);
        $activeAdminUser = $stmt->fetch();
        if ($activeAdminUser !== false) {
            $isAdminAuthenticated = true;
        } else {
            unset($_SESSION['admin_key']); // Flush invalid keys
        }
    } catch (PDOException $e) {}
}

// -------------------------------------------------------------
// POST ACTIONS FOR USERS/REGISTRY MANAGEMENT
// -------------------------------------------------------------
$crudFeedback = '';
if ($isAdminAuthenticated && $_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // ACTION 1: REGISTER NEW USER KEY
    if (isset($_POST['crud_action']) && $_POST['crud_action'] === 'add_user') {
        $username = trim($_POST['username']);
        $apiKey = trim($_POST['api_key']);
        $balance = (int)$_POST['balance_remaining'];
        $role = trim($_POST['role']);
        $status = trim($_POST['status']);

        if (!empty($username) && !empty($apiKey)) {
            try {
                // Assert uniquely registered usernames/keys
                $chk = $db->prepare("SELECT COUNT(*) as cnt FROM users WHERE username = ? OR api_key = ?");
                $chk->execute([$username, $apiKey]);
                if ((int)$chk->fetch()['cnt'] > 0) {
                    $crudFeedback = 'ইউজারনেম অথবা এপিআই কি অলরেডি ডাটাবেজে উপস্থিত আছে!';
                } else {
                    $ins = $db->prepare("INSERT INTO users (username, api_key, balance_remaining, role, status) VALUES (?, ?, ?, ?, ?)");
                    $ins->execute([$username, $apiKey, $balance, $role, $status]);
                    $crudFeedback = 'নতুন ইউজার সফলভাবে রেজিস্ট্রেশন করা হয়েছে।';
                }
            } catch (PDOException $e) {
                $crudFeedback = 'ডাটা ইন্টিগ্রিটি ফেইলড: ' . $e->getMessage();
            }
        } else {
            $crudFeedback = 'দয়া করে ইউজারনেম এবং এপিআই কী ফিল্ড সম্পূর্ণ করুন!';
        }
    }

    // ACTION 2: UPDATE EXISTING USER DETAILS
    if (isset($_POST['crud_action']) && $_POST['crud_action'] === 'edit_user') {
        $id = (int)$_POST['user_id'];
        $username = trim($_POST['username']);
        $apiKey = trim($_POST['api_key']);
        $balance = (int)$_POST['balance_remaining'];
        $role = trim($_POST['role']);
        $status = trim($_POST['status']);

        try {
            $upd = $db->prepare("UPDATE users SET username = ?, api_key = ?, balance_remaining = ?, role = ?, status = ? WHERE id = ?");
            $upd->execute([$username, $apiKey, $balance, $role, $status, $id]);
            $crudFeedback = 'ইউজার কার্ড সফলভাবে আপডেট করা হয়েছে।';
        } catch (PDOException $e) {
            $crudFeedback = 'আপডেট ব্যর্থ হয়েছে! কোয়েরি ইরর: ' . $e->getMessage();
        }
    }

    // ACTION 3: DELETE / REVOKE REGISTERED ACCOUNT KEY
    if (isset($_POST['crud_action']) && $_POST['crud_action'] === 'delete_user') {
        $id = (int)$_POST['user_id'];
        
        // Guard checking: Cannot delete self logged in admin token
        if ($activeAdminUser['id'] == $id) {
            $crudFeedback = 'নিরাপত্তা ত্রুটি: নিজের সচল এডমিন এপিআই কী মুছে ফেলা সম্ভব নয়!';
        } else {
            try {
                $del = $db->prepare("DELETE FROM users WHERE id = ?");
                $del->execute([$id]);
                $crudFeedback = 'ইউজার এপিআই কি ডাটাবেজ থেকে মুছে ফেলা হয়েছে।';
            } catch (PDOException $e) {
                $crudFeedback = 'কোয়েরি এক্সিকিউশন বাধার সম্মুখীন হয়েছে: ' . $e->getMessage();
            }
        }
    }
}

// Gather information metrics for active dashboard renders
$usersList = [];
$logsHistory = [];

if ($isAdminAuthenticated) {
    try {
        $usersList = $db->query("SELECT * FROM users ORDER BY id DESC")->fetchAll();
        $logsHistory = $db->query("SELECT * FROM query_logs ORDER BY id DESC LIMIT 200")->fetchAll();
    } catch (PDOException $e) {}
}
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Administrator Panel Gateway | এডমিন ম্যানেজমেন্ট প্যানেল</title>
    <!-- Tailwind CSS Engine -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Typography Framework -->
    <link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet font-sans">
    <link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.1.1/css/all.css">
    <style>
        body { font-family: 'Inter', 'Tiro Bangla', sans-serif; }
    </style>
</head>
<body class="bg-slate-100 text-slate-800 antialiased min-h-screen flex flex-col justify-between">

    <!-- ADMIN LOCKOUT FORM SCREEN (IF NOT AUTHENTICATED) -->
    <?php if (!$isAdminAuthenticated): ?>
    <div class="max-w-md w-full mx-auto my-auto p-4">
        <div class="bg-white p-8 rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col gap-6">
            <div class="text-center">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">
                    <i class="fa-solid fa-user-shield"></i>
                </div>
                <h3 class="text-2xl font-extrabold text-slate-950">মাস্টার লগইন</h3>
                <p class="text-sm text-slate-500 mt-1.5">এডমিনিস্ট্রেশন কার্যক্রমে প্রবেশের জন্য মাস্টার কী দিন।</p>
            </div>

            <form action="admin.php" method="POST" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-600 pl-1 uppercase tracking-wider">ADMIN MASTER KEY</label>
                    <div class="relative flex items-center">
                        <i class="fa-solid fa-fingerprint absolute left-4 text-slate-400"></i>
                        <input type="password" name="login_admin_key" placeholder="••••••••••••••" required class="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono">
                    </div>
                </div>

                <?php if (!empty($authErrorMsg)): ?>
                    <p class="text-xs text-rose-600 font-bold pl-1 leading-snug"><i class="fa-solid fa-triangle-exclamation mr-1.5"></i><?php echo htmlspecialchars($authErrorMsg); ?></p>
                <?php endif; ?>

                <button type="submit" class="w-full mt-2 py-4 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-2xl text-sm transition shadow-lg shadow-amber-100 cursor-pointer">
                    নিরাপদ প্রমাণীকরণ <i class="fa-solid fa-angle-right ml-1"></i>
                </button>
            </form>

            <div class="border-t border-slate-100 pt-4 text-center">
                <a href="index.php" class="text-xs text-slate-500 hover:text-slate-800 font-semibold"><i class="fa-solid fa-arrow-left mr-1.5"></i> প্রধান পোর্টালে ফিরে যান</a>
            </div>
        </div>
    </div>

    <!-- CORE ADMIN WORKSPACE VIEW (IF SUCCESSFUL) -->
    <?php else: ?>
    
    <!-- NAVIGATION BAR -->
    <header class="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center text-lg font-extrabold shadow-md">
                    <i class="fa-solid fa-toolbox"></i>
                </div>
                <div>
                    <h1 class="text-base font-extrabold text-white tracking-tight">Admin Workbench</h1>
                    <p class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Master Control Dashboard v2.0</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="text-right">
                    <p class="text-xs font-bold text-slate-200"><i class="fa-solid fa-circle text-[8px] text-emerald-400 animate-pulse mr-1"></i><?php echo htmlspecialchars($activeAdminUser['username']); ?></p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Role: Admin Group</p>
                </div>
                <a href="index.php" class="bg-indigo-650 hover:bg-slate-800 text-white border border-slate-800 text-xs px-4 py-2.5 rounded-xl font-bold transition">
                    <i class="fa-solid fa-desktop mr-1.5"></i> লাইভ সাইট
                </a>
                <a href="admin.php?action=logout" class="bg-rose-600 hover:bg-rose-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-md">
                    <i class="fa-solid fa-right-from-bracket mr-1.5"></i> লগআউট
                </a>
            </div>
        </div>
    </header>

    <!-- CONTENT WRAPPER -->
    <main class="max-w-7xl mx-auto px-6 py-10 w-full flex flex-col gap-10">

        <!-- STATUS FEEDBACK SHEET -->
        <?php if (!empty($crudFeedback)): ?>
        <div class="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl text-amber-800 text-xs font-bold flex items-center justify-between">
            <span><i class="fa-solid fa-bell mr-2"></i><?php echo htmlspecialchars($crudFeedback); ?></span>
            <button onclick="this.parentElement.remove()" class="text-amber-500 hover:text-amber-800"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <?php endif; ?>

        <!-- SECTION 1: USERS REGISTER & CREATION CONTROL -->
        <div class="bg-white p-6 rounded-[28px] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col gap-6">
            <div class="border-b border-slate-150 pb-4 flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-user-group text-amber-500"></i> সকল রেজিস্টার্ড ক্রোম এপিআই গ্রাহক</h3>
                    <p class="text-xs text-slate-500 mt-1">ব্যালেন্স টোকেন সমন্বয়, রোল পরিবর্তন ও গ্রাহক নিরাপত্তা এপিআই কী রেস্ট্রিকশন প্যানেল।</p>
                </div>
                
                <!-- Toggle creation modal trigger buttons -->
                <button onclick="toggleUserRegistrationModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-user-plus"></i> নতুন এপিআই কি তৈরি করুন
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-55 border-b border-slate-150 text-slate-600 font-bold font-mono">
                            <th class="px-4 py-3">ID</th>
                            <th class="px-4 py-3">ইউজারনেম</th>
                            <th class="px-4 py-3">ব্যবহারকারীর API KEY (কপিযোগ্য)</th>
                            <th class="px-4 py-3">বাকি ব্যালেন্স টোকেন</th>
                            <th class="px-4 py-3">গ্রুপ রোল</th>
                            <th class="px-4 py-3">স্ট্যাটাস</th>
                            <th class="px-4 py-3 text-center">সম্পাদনা অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($usersList as $user): ?>
                        <tr class="hover:bg-slate-50/50">
                            <td class="px-4 py-3.5 text-slate-400 font-mono"><?php echo $user['id']; ?></td>
                            <td class="px-4 py-3.5 font-bold text-slate-900"><?php echo htmlspecialchars($user['username']); ?></td>
                            <td class="px-4 py-3.5 font-mono font-semibold select-all text-blue-600"><?php echo htmlspecialchars($user['api_key']); ?></td>
                            <td class="px-4 py-3.5 text-center font-bold text-slate-800 <?php echo $user['balance_remaining'] <= 5 ? 'text-amber-600' : 'text-slate-800';?>">
                                <?php echo (int)$user['balance_remaining']; ?>
                            </td>
                            <td class="px-4 py-3.5">
                                <?php if ($user['role'] === 'admin'): ?>
                                    <span class="bg-amber-100 text-amber-800 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                <?php else: ?>
                                    <span class="bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">User</span>
                                <?php endif; ?>
                            </td>
                            <td class="px-4 py-3.5">
                                <?php if ($user['status'] === 'active'): ?>
                                    <span class="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">ACTIVE</span>
                                <?php else: ?>
                                    <span class="bg-rose-50 text-rose-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">BLOCKED</span>
                                <?php endif; ?>
                            </td>
                            <td class="px-4 py-3.5 flex items-center justify-center gap-2">
                                <button onclick="triggerUserEdit(<?php echo htmlspecialchars(json_encode($user)); ?>)" class="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer">এডডিট</button>
                                
                                <form action="admin.php" method="POST" onsubmit="return confirm('নিশ্চিতভাবে এই নিরাপত্তা কী বাতিল বা রিমুভ করতে চান?')">
                                    <input type="hidden" name="crud_action" value="delete_user">
                                    <input type="hidden" name="user_id" value="<?php echo $user['id']; ?>">
                                    <button type="submit" class="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer">ডিলিট</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SECTION 2: LIVE SYSTEM QUERY TRANSACTION LEDGER -->
        <div class="bg-white p-6 rounded-[28px] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col gap-6">
            <div>
                <h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2"><i class="fa-solid fa-list-check text-slate-700"></i> গ্লোবাল ট্রানজেকশন কাস্টমার কোয়েরি লগ</h3>
                <p class="text-xs text-slate-500 mt-1">সিস্টেম এপিআই দ্বারা সম্পন্ন হওয়া সর্বশেষ ২০০ টি সফল ও ব্যর্থ অনুসন্ধানের ডাটাবেজ ট্র্যাক রেকর্ডসমূহ।</p>
            </div>

            <div class="overflow-x-auto max-h-[550px]">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold font-mono">
                            <th class="px-4 py-3">লগ ID</th>
                            <th class="px-4 py-3">ইউজারনেম</th>
                            <th class="px-4 py-3">NID নম্বর</th>
                            <th class="px-4 py-3">জন্ম তারিখ</th>
                            <th class="px-4 py-3">সোর্স / মেথড</th>
                            <th class="px-4 py-3">অবস্থা</th>
                            <th class="px-4 py-3">চার্জড ব্যালেন্স</th>
                            <th class="px-4 py-3">কোয়েরি অবশিষ্টাংশ</th>
                            <th class="px-4 py-3">গতি</th>
                            <th class="px-4 py-3 font-sans text-center">IP Address</th>
                            <th class="px-4 py-3 text-center">তারিখ ও সময়</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($logsHistory as $log): ?>
                        <tr class="hover:bg-slate-50/50">
                            <td class="px-4 py-3 text-slate-400 font-mono"><?php echo $log['id']; ?></td>
                            <td class="px-4 py-3 font-semibold text-slate-800"><?php echo htmlspecialchars($log['username'] ?: ''); ?></td>
                            <td class="px-4 py-3 font-bold font-mono select-all"><?php echo htmlspecialchars($log['nid']); ?></td>
                            <td class="px-4 py-3 font-mono text-slate-500"><?php echo htmlspecialchars($log['dob']); ?></td>
                            <td class="px-4 py-3 text-indigo-700 font-bold"><?php echo htmlspecialchars($log['data_source'] ?: 'API'); ?></td>
                            <td class="px-4 py-3">
                                <?php if ($log['status'] === 'success'): ?>
                                    <span class="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold">SUCCESS</span>
                                <?php else: ?>
                                    <span class="bg-rose-50 text-rose-800 text-[9px] px-2 py-0.5 rounded-full font-bold">FAILED</span>
                                <?php endif; ?>
                            </td>
                            <td class="px-4 py-3 text-emerald-700 font-extrabold"><?php echo htmlspecialchars($log['charge_amount']); ?></td>
                            <td class="px-4 py-3 font-bold text-center text-slate-500"><?php echo $log['balance_after']; ?></td>
                            <td class="px-4 py-3 font-mono text-slate-400 font-semibold"><?php echo htmlspecialchars($log['response_time']); ?></td>
                            <td class="px-4 py-3 font-mono font-semibold text-slate-550 text-center"><?php echo htmlspecialchars($log['client_ip']); ?></td>
                            <td class="px-4 py-3 text-slate-400 font-medium text-center"><?php echo htmlspecialchars($log['created_at']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </main>

    <!-- FLOATING POPUP DIALOG: ADD/REGISTER NEW USER KEY -->
    <div id="modal-add-user" class="fixed top-0 left-0 w-full h-full bg-slate-900/60 z-[9999] hidden flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-[32px] max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xl font-extrabold text-slate-900"><i class="fa-solid fa-key-skeleton text-blue-600 mr-1"></i> নতুন নিরাপত্তা চাবি তৈরি</h3>
                <button onclick="toggleUserRegistrationModal()" class="text-slate-400 hover:text-slate-700 text-lg"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <form action="admin.php" method="POST" class="flex flex-col gap-4">
                <input type="hidden" name="crud_action" value="add_user">

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase">ব্যবহারকারীর নাম (Username)</label>
                    <input type="text" name="username" placeholder="উদাঃ mamun_cyber" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase">এপিআই সিকিউরিটি কী (API KEY)</label>
                    <div class="flex gap-2">
                        <input type="text" id="add-user-apikey-field" name="api_key" placeholder="nid_key_xxxxxxxx" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono">
                        <button type="button" onclick="generateRandomKey('add-user-apikey-field')" class="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer">তৈরি</button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-650 pl-1 uppercase">বাকি টোকেন ব্যালেন্স</label>
                        <input type="number" name="balance_remaining" value="100" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold font-mono">
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-650 pl-1 uppercase">ব্যবহারকারী গ্রুপ</label>
                        <select name="role" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                            <option value="user" selected>General User</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase">অ্যাক্টিভেশন স্ট্যাটাস</label>
                    <select name="status" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-emerald-750">
                        <option value="active" selected>ACTIVE (সচল)</option>
                        <option value="inactive">DISABLED (সাময়িক বরখাস্ত)</option>
                    </select>
                </div>

                <button type="submit" class="w-full mt-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-100 cursor-pointer">
                    নতুন চাবি সংরক্ষণ করুন <i class="fa-solid fa-save ml-1"></i>
                </button>
            </form>
        </div>
    </div>

    <!-- FLOATING POPUP DIALOG: EDIT/UPDATE USER KEY METADATA -->
    <div id="modal-edit-user" class="fixed top-0 left-0 w-full h-full bg-slate-900/60 z-[9999] hidden flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-[32px] max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="text-xl font-extrabold text-slate-900"><i class="fa-solid fa-user-edit text-indigo-600 mr-1"></i> ব্যবহারকারী তথ্য সম্পাদন</h3>
                <button onclick="toggleUserEditModal()" class="text-slate-400 hover:text-slate-700 text-lg"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <form action="admin.php" method="POST" class="flex flex-col gap-4">
                <input type="hidden" name="crud_action" value="edit_user">
                <input type="hidden" id="edit-user-id" name="user_id">

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase font-mono">ব্যবহারকারীর নাম (Username)</label>
                    <input type="text" id="edit-user-username" name="username" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase font-mono">গ্রাহক নিরাপত্তা চাবি (API KEY)</label>
                    <div class="flex gap-2">
                        <input type="text" id="edit-user-apikey" name="api_key" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono">
                        <button type="button" onclick="generateRandomKey('edit-user-apikey')" class="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer">তৈরি</button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-650 pl-1 uppercase font-mono">বাকি টোকেন ব্যালেন্স</label>
                        <input type="number" id="edit-user-balance" name="balance_remaining" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold font-mono">
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="text-xs font-bold text-slate-650 pl-1 uppercase font-mono">ব্যবহারকারী গ্রুপ</label>
                        <select id="edit-user-role" name="role" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                            <option value="user">General User</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-bold text-slate-650 pl-1 uppercase font-mono">অ্যাক্টিভেশন স্ট্যাটাস</label>
                    <select id="edit-user-status" name="status" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                        <option value="active">ACTIVE (ব্যবহারকারী সচল)</option>
                        <option value="inactive">DISABLED (ব্যবহারকারী বরখাস্ত)</option>
                    </select>
                </div>

                <button type="submit" class="w-full mt-4 py-3.5 bg-indigo-650 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-150 cursor-pointer">
                    সম্পাদিত তথ্য সংরক্ষণ করুন <i class="fa-solid fa-save ml-1"></i>
                </button>
            </form>
        </div>
    </div>

    <!-- GLOBAL COMPLEMENTARY SCRIPTS -->
    <script>
        const regModal = document.getElementById('modal-add-user');
        const editModal = document.getElementById('modal-edit-user');

        function toggleUserRegistrationModal() {
            regModal.classList.toggle('hidden');
            if(!regModal.classList.contains('hidden')){
                generateRandomKey('add-user-apikey-field');
            }
        }

        function toggleUserEditModal() {
            editModal.classList.toggle('hidden');
        }

        // Generate strong secure random hex API Keys
        function generateRandomKey(fieldId) {
            const randomHex = Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
            document.getElementById(fieldId).value = "nid_key_" + randomHex;
        }

        // Open editing form prefilled with parameters
        function triggerUserEdit(user) {
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-user-username').value = user.username;
            document.getElementById('edit-user-apikey').value = user.api_key;
            document.getElementById('edit-user-balance').value = user.balance_remaining;
            document.getElementById('edit-user-role').value = user.role;
            document.getElementById('edit-user-status').value = user.status;
            
            editModal.classList.remove('hidden');
        }
    </script>
    <?php endif; ?>

    <!-- COPYRIGHT PANEL -->
    <footer class="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-550 font-semibold">
        <p class="text-slate-400">© 2026 Admin Panel Verification Center. Authorized administrators access only.</p>
    </footer>

</body>
</html>
