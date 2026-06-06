<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NID Online Copy verification Portal | এনআইডি অনলাইন কপি যাচাইকরণ</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        bangla: ['"Tiro Bangla"', 'serif']
                    }
                }
            }
        }
    </script>
    <!-- Tiro Bangla and Inter Google Web Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Font Awesome Release Icon Sets -->
    <link rel="stylesheet" href="https://site-assets.fontawesome.com/releases/v6.1.1/css/all.css">
    <!-- Direct physical PDF Generator -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    
    <style>
        .glowing-btn {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
        }
        .glowing-btn:hover {
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.7);
        }
        /* Styles to exclude from PDF export */
        @media print {
            .no-print {
                display: none !important;
            }
            body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .print-container {
                box-shadow: none !important;
                border: none !important;
                transform: none !important;
                margin: 0 !important;
            }
        }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased font-sans min-h-screen flex flex-col justify-between">

    <!-- HEADER NAVIGATION BAR -->
    <header class="bg-white shadow-sm border-b border-slate-100 no-print">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-lg shadow-md">
                    <i class="fa-solid fa-id-card"></i>
                </div>
                <div>
                    <h1 class="text-lg font-extrabold text-slate-900 leading-tight">NID Portal Gateway</h1>
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Election Commission Server Copy</p>
                </div>
            </div>
            
            <div id="user-header-details" class="hidden flex items-center gap-4">
                <div class="text-right">
                    <p id="header-username" class="text-sm font-bold text-slate-850">অননুমোদিত ব্যবহারকারী</p>
                    <p class="text-xs text-slate-500 font-bold">ব্যালেন্স: <span id="header-balance" class="text-emerald-600 font-extrabold">৳০.০০</span></p>
                </div>
                <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold" id="user-initial">
                    U
                </div>
                <!-- Admin Dashboard Entry Link -->
                <a href="admin.php" id="admin-panel-link" class="hidden px-4 py-2 text-xs bg-slate-900 text-white rounded-xl font-bold transition duration-200 hover:bg-slate-800 focus:ring-2 focus:ring-slate-900">
                    <i class="fa-solid fa-toolbox mr-1.5"></i> এডমিন
                </a>
            </div>
        </div>
    </header>

    <!-- MAIN PORTAL DASHBOARD WRAPPER -->
    <main class="max-w-7xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-8 no-print">
        
        <!-- STEP 1: AUTHENTICATION CONTAINER -->
        <div id="auth-section" class="w-full max-w-lg mx-auto bg-white p-8 rounded-[32px] border border-slate-150 shadow-xl shadow-slate-100/50 flex flex-col gap-6">
            <div class="text-center">
                <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-4 border border-blue-100">
                    <i class="fa-solid fa-key-skeleton"></i>
                </div>
                <h3 class="text-xl font-extrabold text-slate-900">এপিআই কী যাচাইকরণ</h3>
                <p class="text-sm text-slate-550 mt-1">পদ্ধতি সচল করতে আপনার এপিআই নিরাপত্তা কী প্রবেশ করুন।</p>
            </div>

            <div class="flex flex-col gap-2">
                <label class="text-xs font-bold text-slate-600 pl-1">API SECURITY KEY</label>
                <div class="relative flex items-center">
                    <i class="fa-solid fa-lock absolute left-4 text-slate-400"></i>
                    <input type="password" id="input-api-key" placeholder="nid_key_xxxxxxxx" class="w-full pl-11 pr-24 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition duration-300">
                    <button id="btn-verify-key" class="absolute right-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-sm active:scale-95">যাচাই</button>
                </div>
                <p id="auth-error-hint" class="text-xs text-rose-650 font-medium pl-1 hidden"><i class="fa-solid fa-triangle-exclamation mr-1"></i>প্রবেশকৃত নিরাপত্তা কী সঠিক নয়!</p>
            </div>

            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <i class="fa-brands fa-whatsapp text-emerald-500 text-3xl"></i>
                <div>
                    <h5 class="text-xs font-extrabold text-slate-800">এপিআই কী প্রয়োজন?</h5>
                    <p class="text-[11px] text-slate-500 mt-0.5">কী বা ব্যালেন্স ক্রয়ের জন্য হোয়াটসঅ্যাপ নম্বরে যোগাযোগ করুন।</p>
                    <a href="https://wa.me/+8801601519007" target="_blank" class="text-[11px] text-blue-650 font-bold hover:underline block mt-1">ক্লিক করুন হোয়াটসঅ্যাপ <i class="fa-solid fa-angle-right"></i></a>
                </div>
            </div>
        </div>

        <!-- STEP 2: NID RETRIEVAL DASHBOARD SHEET -->
        <div id="content-section" class="hidden flex flex-col gap-8">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <!-- FILTER UTILITY BLOCK -->
                <div class="lg:col-span-4 flex flex-col gap-6">
                    <div class="bg-white p-6 rounded-[28px] border border-slate-200 shadow-md flex flex-col gap-5">
                        <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <h4 class="text-base font-extrabold text-slate-950 flex items-center gap-2">
                                <i class="fa-solid fa-magnifying-glass text-blue-600"></i> সার্ভার কপি চেক
                            </h4>
                            <span class="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">৳৩.০০ চার্জ</span>
                        </div>

                        <!-- Search Form -->
                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-extrabold text-slate-650 pl-1">এনআইডি নম্বর (NID / Form No.)</label>
                                <input type="number" id="input-nid" placeholder="১০ বা ১৭ সংখ্যার জাতীয় পরিচয়পত্র নম্বর" class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-sans">
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-extrabold text-slate-650 pl-1">জন্ম তারিখ (YYYY-MM-DD)</label>
                                <input type="date" id="input-dob" class="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-sans">
                            </div>

                            <!-- Mode templates choices -->
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-extrabold text-slate-650 pl-1">ডকুমেন্ট সংস্করণ (Document Version)</label>
                                <div class="grid grid-cols-2 gap-3">
                                    <label class="border-2 border-slate-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer transition hover:bg-slate-50" id="lbl-v1">
                                        <input type="radio" name="doc-version" value="V1" checked class="hidden">
                                        <span class="text-xs font-bold text-slate-800">Version 1</span>
                                    </label>
                                    <label class="border-2 border-slate-200 rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer transition hover:bg-slate-50" id="lbl-v2">
                                        <input type="radio" name="doc-version" value="V2" class="hidden">
                                        <span class="text-xs font-bold text-slate-800">Version 2</span>
                                    </label>
                                </div>
                            </div>

                            <button id="btn-submit-search" class="w-full mt-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-100/50 text-sm glowing-btn">
                                <i class="fa-solid fa-magnifying-glass"></i> সার্ভার ডাটা খোঁজ করুন
                            </button>
                        </div>
                    </div>

                    <!-- HELPFUL CONTACT DETAILS -->
                    <div class="bg-slate-900 text-slate-300 p-6 rounded-[28px] flex flex-col gap-4">
                        <h4 class="text-white font-extrabold text-sm flex items-center gap-2">
                            <i class="fa-solid fa-circle-question text-amber-400"></i> জরুরি কন্টাক্ট এবং সাহায্য
                        </h4>
                        <p class="text-xs leading-relaxed text-slate-350">এনআইডি রি-প্রিন্ট বা ডাটা লোডে সমস্যা হলে হোয়াটসঅ্যাপ অথবা টেলিগ্রাম গ্রুপে যুক্ত হোন।</p>
                        <div class="flex flex-col gap-2.5 mt-1 text-xs">
                            <a href="https://wa.me/+8801601519007" target="_blank" class="flex items-center gap-2 text-emerald-400 font-bold hover:underline">
                                <i class="fa-brands fa-whatsapp text-base"></i> WhatsApp Support: +880 1601-519007
                            </a>
                            <a href="https://t.me/MrTools_BD" target="_blank" class="flex items-center gap-2 text-sky-400 font-bold hover:underline">
                                <i class="fa-brands fa-telegram text-base"></i> Telegram Channel: MrTools_BD
                            </a>
                        </div>
                    </div>
                </div>

                <!-- USER QUERY HISTORIES TRANS-LEDGER -->
                <div class="lg:col-span-8 flex flex-col gap-6">
                    <div class="bg-white p-6 rounded-[28px] border border-slate-200 shadow-md">
                        <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <h4 class="text-base font-extrabold text-slate-950 flex items-center gap-2">
                                <i class="fa-solid fa-history text-slate-600"></i> পূর্ববর্তী চেক হিস্ট্রি
                            </h4>
                            <span class="text-slate-500 text-xs font-bold font-sans">সর্বশেষ ১৫০ টি অনুসন্ধানের তথ্য</span>
                        </div>

                        <div class="overflow-x-auto mt-4 max-h-[420px]">
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                                        <th class="px-4 py-3 text-center">NID নম্বর</th>
                                        <th class="px-4 py-3 text-center">জন্ম তারিখ</th>
                                        <th class="px-4 py-3 text-center">সময়</th>
                                        <th class="px-4 py-3 text-center">চার্জ</th>
                                        <th class="px-4 py-3 text-center font-sans">IP Address</th>
                                        <th class="px-4 py-3 text-center">অ্যাকশন</th>
                                    </tr>
                                </thead>
                                <tbody id="history-rows" class="divide-y divide-slate-100">
                                    <tr>
                                        <td colspan="6" class="px-4 py-8 text-center text-slate-400 font-medium">কোনো হিস্ট্রি পাওয়া যায়নি। নতুন একটি অনুসন্ধান সম্পন্ন করুন।</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- PRINT SECTION PREVIEWS INTERFACE -->
    <!-- Renders the custom visual documents and download PDFs -->
    <section id="print-visualization-wrapper" class="hidden flex flex-col items-center justify-center p-4 bg-slate-50 flex-grow min-h-screen">
        
        <!-- PRINT HEADER UTILITY PANEL -->
        <div class="w-full max-w-4xl mx-auto flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-md border border-slate-150 mb-6 no-print">
            <button id="btn-back-to-web" class="flex items-center gap-2 text-slate-650 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl cursor-pointer font-bold text-xs">
                <i class="fa-solid fa-arrow-left"></i> প্রধান মেনু
            </button>
            <div class="flex items-center gap-3">
                <button id="btn-trigger-print" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl transition duration-250 cursor-pointer shadow-md text-xs flex items-center gap-1.5 active:scale-95">
                    <i class="fa-solid fa-print"></i> প্রিন্ট করুন
                </button>
                <button id="btn-trigger-pdf" class="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl transition duration-250 cursor-pointer shadow-md text-xs flex items-center gap-1.5 active:scale-95">
                    <i class="fa-solid fa-file-pdf"></i>পিডিএফ ডাউনলোড করুন
                </button>
            </div>
        </div>

        <!-- STRETCH DOCUMENT PREVIEW CANVAS -->
        <div class="w-full flex items-center justify-center p-2 bg-slate-200/50 rounded-[28px] border border-slate-300 shadow-inner overflow-auto max-w-[215mm]">
            
            <!-- VERSION 1 CANVAS DRAW -->
            <div id="doc-print-v1" class="hidden relative bg-white bg-no-repeat overflow-hidden select-text text-black shrink-0 shadow-lg" style="width: 210mm; height: 297mm; min-width: 210mm; min-height: 297mm;">
                <!-- Full Template Background Photo -->
                <img class="absolute left-0 top-0 w-full h-full select-none pointer-events-none" src="image.php?u=https://i.ibb.co.com/xtfMGQQH/vv2.jpg" alt="" draggable="false">

                <!-- Avatar Profile photo -->
                <img id="v1-avatar" src="" alt="" class="absolute object-cover select-none pointer-events-none" style="width: 130px; height: 151px; top: 187px; left: 333px; border-radius: 16px;" draggable="false">

                <!-- absolute Positioned Elements -->
                <p id="v1-nid" class="absolute text-[15px] font-medium font-sans" style="left: 264px; top: 400px;"></p>
                <p id="v1-pin" class="absolute text-[15px] font-sans" style="left: 264px; top: 428px;"></p>
                <p id="v1-form" class="absolute text-[15px] font-sans" style="left: 264px; top: 457px;"></p>
                <p id="v1-voter" class="absolute text-[15px] font-sans" style="left: 264px; top: 482px;"></p>
                <p id="v1-voterarea" class="absolute text-[15px] font-bangla" style="left: 264px; top: 510px;"></p>
                <p id="v1-namebn" class="absolute text-[15px] font-bold font-bangla" style="left: 264px; top: 567px;"></p>
                <p id="v1-nameen" class="absolute text-[15px] font-sans uppercase" style="left: 264px; top: 595px;"></p>
                <p id="v1-dob" class="absolute text-[15px] font-medium font-sans" style="left: 264px; top: 623px;"></p>
                <p id="v1-father" class="absolute text-[15px] font-bangla" style="left: 264px; top: 649px;"></p>
                <p id="v1-mother" class="absolute text-[15px] font-bangla" style="left: 264px; top: 677px;"></p>
                <p id="v1-spouse" class="absolute text-[15px] font-bangla" style="left: 264px; top: 703px;"></p>
                <p id="v1-gender" class="absolute text-[15px] font-sans" style="left: 264px; top: 762px;"></p>
                <p id="v1-religion" class="absolute text-[15px] font-bangla" style="left: 264px; top: 791px;"></p>
                <p id="v1-mobile" class="absolute text-[15px] font-sans" style="left: 264px; top: 819px;">01780222100</p>
                <p id="v1-birthplace" class="absolute text-[15px] font-bangla" style="left: 264px; top: 845px;"></p>
                
                <!-- Addresses details -->
                <p id="v1-pre-addr" class="absolute text-[12px] leading-[18px] max-w-[575px] font-bangla text-left" style="left: 110px; top: 902px;"></p>
                <p id="v1-per-addr" class="absolute text-[12px] leading-[18px] max-w-[575px] font-bangla text-left" style="left: 110px; top: 975px;"></p>
            </div>

            <!-- VERSION 2 CANVAS DRAW -->
            <div id="doc-print-v2" class="hidden relative bg-white overflow-hidden select-text text-black shrink-0 shadow-lg" style="width: 750px; height: 1065px; min-width: 750px; min-height: 1065px;">
                <!-- Full Template Background Photo -->
                <img class="absolute left-0 top-0 w-full h-full select-none pointer-events-none" src="image.php?u=https://i.ibb.co.com/7d5js9qH/v1.jpg" alt="" draggable="false">

                <div style="position: absolute; left: 30%; top: 8%; width: auto; font-size: 16px; color: rgb(255 224 0); font-weight: bold; font-family: sans-serif;">
                    National Identity Registration Wing (NIDW)
                </div>

                <div style="position: absolute; left: 37%; top: 11%; width: auto; font-size: 14px; color: rgb(255, 47, 161); font-weight: bold; font-family: sans-serif;">
                    Select Your Search Category
                </div>

                <div style="position: absolute; left: 45%; top: 12.8%; width: auto; font-size: 12px; color: rgb(8, 121, 4); font-family: sans-serif;">
                    Search By NID / Voter No.
                </div>

                <div style="position: absolute; left: 45%; top: 14.3%; width: auto; font-size: 12px; color: rgb(7, 119, 184); font-family: sans-serif;">
                    Search By Form No.
                </div>

                <div style="position: absolute; left: 30%; top: 16.9%; width: auto; font-size: 12px; color: rgb(252, 0, 0); font-weight: bold; font-family: sans-serif;">
                    NID or Voter No*
                </div>

                <div style="position: absolute; left: 45%; top: 16.9%; width: auto; font-size: 12px; color: rgb(143, 143, 143); font-family: sans-serif;">
                    NID
                </div>

                <div style="position: absolute; left: 62.9%; top: 17.1%; width: auto; font-size: 11px; color: rgb(255, 255, 255); font-family: sans-serif;">
                    Submit
                </div>

                <div style="position: absolute; left: 89%; top: 11.55%; width: auto; font-size: 11px; color: #fff; font-family: sans-serif;">
                    Home
                </div>

                <!-- National Identity copy details -->
                <div style="position: absolute; left: 37%; top: 27%; width: auto; font-size: 16px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;">
                    জাতীয় পরিচিতি তথ্য
                </div>

                <div style="position: absolute; left: 37%; top: 29.7%; width: auto; font-size: 13px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    জাতীয় পরিচয় পত্র নম্বর
                </div>

                <div id="v2-nid" style="position: absolute; left: 55%; top: 29.7%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-weight: 600; font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 32.5%; width: auto; font-size: 13px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    পিন নম্বর
                </div>

                <div id="v2-pin" style="position: absolute; left: 55%; top: 32.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 35%; width: auto; font-size: 13px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    পূর্ববর্তী পরিচয়পত্র নম্বর
                </div>

                <div id="v2-voter" style="position: absolute; left: 55%; top: 35%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 37.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    ভোটার এলাকা
                </div>

                <div id="v2-voterarea" style="position: absolute; left: 55%; top: 37.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <div style="position: absolute; left: 37%; top: 40.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    জন্মস্থান
                </div>

                <div id="v2-birthplace" style="position: absolute; left: 55%; top: 40.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <!-- Personal parameters -->
                <div style="position: absolute; left: 37%; top: 43%; width: auto; font-size: 16px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;">
                    ব্যক্তিগত তথ্য
                </div>

                <div style="position: absolute; left: 37%; top: 45.6%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    নাম (বাংলা)
                </div>

                <div id="v2-namebn" style="position: absolute; left: 55%; top: 45.6%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;"></div>

                <div style="position: absolute; left: 37%; top: 48.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    নাম (ইংরেজি)
                </div>

                <div id="v2-nameen" style="position: absolute; left: 55%; top: 48.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-weight: 500; font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 51%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    জন্ম তারিখ
                </div>

                <div id="v2-dob" style="position: absolute; left: 55%; top: 51%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 53.7%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    পিতার নাম
                </div>

                <div id="v2-father" style="position: absolute; left: 55%; top: 53.7%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <div style="position: absolute; left: 37%; top: 56.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    মাতার নাম
                </div>

                <div id="v2-mother" style="position: absolute; left: 55%; top: 56.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <!-- Secondary fields block -->
                <div style="position: absolute; left: 37%; top: 59%; width: auto; font-size: 16px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;">
                    অন্যান্য তথ্য
                </div>

                <div style="position: absolute; left: 37%; top: 62.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    লিঙ্গ
                </div>

                <div id="v2-gender" style="position: absolute; left: 55%; top: 62.2%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: sans-serif;"></div>

                <div style="position: absolute; left: 37%; top: 64.8%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    ধর্ম
                </div>

                <div id="v2-religion" style="position: absolute; left: 55%; top: 64.8%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <div style="position: absolute; left: 37%; top: 67.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    জন্মবার
                </div>

                <div id="v2-weekday" style="position: absolute; left: 55%; top: 67.5%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <div style="position: absolute; left: 37%; top: 70%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;">
                    বয়স
                </div>

                <div id="v2-age" style="position: absolute; left: 55%; top: 70%; width: auto; font-size: 14px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif;"></div>

                <!-- Addresses systems -->
                <div style="position: absolute; left: 37%; top: 73%; width: auto; font-size: 16px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;">
                    বর্তমান ঠিকানা
                </div>

                <div id="v2-pre-addr" style="position: absolute; left: 37%; top: 75.5%; width: 48%; font-size: 12px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; text-align: left;"></div>

                <div style="position: absolute; left: 37%; top: 82%; width: auto; font-size: 16px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; font-weight: bold;">
                    স্থায়ী ঠিকানা
                </div>

                <div id="v2-per-addr" style="position: absolute; left: 37%; top: 84.5%; width: 48%; font-size: 12px; color: rgb(7, 7, 7); font-family: 'Tiro Bangla', serif; text-align: left;"></div>

                <!-- Disclaimers footer -->
                <div style="position: absolute; top: 92%; width: 100%; font-size: 11px; text-align: center; color: rgb(255, 0, 0); font-family: 'Tiro Bangla', serif; font-weight: 500;">
                    উপরে প্রদর্শিত তথ্যসমূহ জাতীয় পরিচয়পত্র সংশ্লিষ্ট, ভোটার তালিকার সাথে সরাসরি সম্পর্কযুক্ত নয়।
                </div>

                <div style="position: absolute; top: 93.5%; width: 100%; text-align: center; font-size: 11px; color: rgb(3, 3, 3); font-family: sans-serif;">
                    This is Software Generated Report From Bangladesh Election Commission, Signature &amp; Seal Aren't Required.
                </div>

                <!-- profile placement coordinates -->
                <div style="position: absolute; left: 16%; top: 25.7%; width: auto;">
                    <img id="v2-avatar" src="" alt="User Copy" style="border-radius: 10px; object-fit: cover; width: 121px; height: 140px;" draggable="false">
                </div>

                <!-- Center Name box -->
                <div id="v2-sub-name" style="position: absolute; display: flex; font-weight: bold; left: 15.3%; top: 39.6%; height: 32px; width: 130px; font-size: 12px; color: rgb(7, 7, 7); align-items: center; justify-content: center; font-family: sans-serif; text-transform: uppercase;" align="center"></div>

                <!-- QR code stamp visual -->
                <div style="position: absolute; left: 15.5%; top: 44.0%; height: 32px; width: 130px; margin: auto; display: flex; justify-content: center;" align="center">
                    <img id="v2-qr" src="" style="height: 100px; width: 100px; display: block;" alt="Verify Qr" draggable="false">
                </div>
            </div>
            
        </div>
        
        <!-- FOOTER LABEL ON PRINT VIEW -->
        <p class="text-xs text-slate-500 font-medium py-6 no-print flex items-center gap-1">
            <i class="fa-solid fa-square-check text-slate-400"></i> এনআইডি পিডিএফ ডাউনলোড সার্ভার কপি সফলভাবে তৈরি করা হয়েছে।
        </p>
    </section>

    <!-- FOOTER COPYRIGHT PANEL -->
    <footer class="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium no-print">
        <p>© 2026 Bangladesh Election Commission. All data queries logged securely for verification audits.</p>
    </footer>

    <!-- POPUP LOADER SPINNER OVERLAY -->
    <div id="loader-overlay" class="fixed top-0 left-0 w-full h-full bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center hidden">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl flex flex-col items-center gap-4 text-center">
            <div class="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
            <div>
                <h5 class="text-sm font-extrabold text-slate-850">সার্ভার অনুসন্ধান চলছে...</h5>
                <p class="text-xs text-slate-500 mt-1">অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন</p>
            </div>
        </div>
    </div>

    <!-- ERROR DETAILS SHEET -->
    <div id="dialog-overlay" class="fixed top-0 left-0 w-full h-full bg-slate-900/60 z-[9999] hidden flex items-center justify-center p-4">
        <div class="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl relative text-center">
            <div class="w-16 h-16 rounded-full bg-rose-50 text-rose-550 border border-rose-100 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 class="text-xl font-extrabold text-slate-900">ত্রুটি দেখা দিয়েছে</h3>
            <p id="dialog-error-msg" class="text-sm text-slate-600 mt-2 font-medium leading-relaxed">জাতীয় পরিচয়পত্র নম্বর বা জন্ম তারিখ সঠিক দেয়া হয়নি!</p>
            <button id="btn-close-dialog" class="mt-6 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs px-8 py-3.5 rounded-xl transition shadow-md">ঠিক আছে</button>
        </div>
    </div>

    <!-- SYSTEM MODULE JS CODES -->
    <script>
        // Reactive core state
        let activeKey = localStorage.getItem('nid_api_key') || '';
        let currentRecord = null;
        let queryLogs = [];

        // UI DOM nodes
        const authSection = document.getElementById('auth-section');
        const contentSection = document.getElementById('content-section');
        const printSection = document.getElementById('print-visualization-wrapper');
        const headerDetails = document.getElementById('user-header-details');
        const headerUsername = document.getElementById('header-username');
        const headerBalance = document.getElementById('header-balance');
        const userInitial = document.getElementById('user-initial');
        const adminPanelLink = document.getElementById('admin-panel-link');
        const historyRows = document.getElementById('history-rows');
        const loaderOverlay = document.getElementById('loader-overlay');

        // Document templates nodes
        const docV1 = document.getElementById('doc-print-v1');
        const docV2 = document.getElementById('doc-print-v2');

        // Check active login on launch
        if (activeKey) {
            verifyApiKey(activeKey);
        }

        // Action: Validate API key details
        document.getElementById('btn-verify-key').addEventListener('click', () => {
            const val = document.getElementById('input-api-key').value.trim();
            if (val) {
                verifyApiKey(val);
            }
        });

        async function verifyApiKey(key) {
            loaderOverlay.classList.remove('hidden');
            try {
                const response = await fetch(`api.php?action=check-balance&key=${encodeURIComponent(key)}`);
                const res = await response.json();
                loaderOverlay.classList.add('hidden');

                if (res.success) {
                    activeKey = key;
                    localStorage.setItem('nid_api_key', key);
                    
                    // Unlock dashboards
                    authSection.classList.add('hidden');
                    contentSection.classList.remove('hidden');
                    headerDetails.classList.remove('hidden');
                    
                    // Update header status
                    headerUsername.textContent = res.username;
                    headerBalance.textContent = `৳${(res.balance_remaining * 3).toFixed(2)}`;
                    userInitial.textContent = res.username.substring(0, 1).toUpperCase();

                    if (res.role === 'admin') {
                        adminPanelLink.classList.remove('hidden');
                    } else {
                        adminPanelLink.classList.add('hidden');
                    }

                    fetchUserLogs();
                } else {
                    localStorage.removeItem('nid_api_key');
                    document.getElementById('auth-error-hint').classList.remove('hidden');
                }
            } catch (err) {
                loaderOverlay.classList.add('hidden');
                alert("API authentication failed. Network endpoint offline.");
            }
        }

        // Action: Retrieve logs
        async function fetchUserLogs() {
            try {
                const response = await fetch(`api.php?action=user-logs&key=${encodeURIComponent(activeKey)}`);
                const res = await response.json();
                if (res.success && res.logs && res.logs.length > 0) {
                    queryLogs = res.logs;
                    renderHistoryTable();
                }
            } catch (err) {}
        }

        function renderHistoryTable() {
            if (queryLogs.length === 0) return;
            
            historyRows.innerHTML = queryLogs.map(log => {
                const badge = log.status === 'success' 
                    ? '<span class="bg-emerald-55 hover:bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">সফল</span>'
                    : '<span class="bg-rose-50 text-rose-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold">ব্যর্থ</span>';
                
                const actionBtn = log.status === 'success'
                    ? `<button onclick="loadDirectLog(${log.id})" class="bg-slate-900 border border-slate-900 hover:bg-slate-850 text-white font-bold px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer">রি-প্রিন্ট</button>`
                    : '-';

                return `<tr>
                    <td class="px-4 py-3.5 text-center font-bold font-sans tracking-wide text-slate-800">${log.nid}</td>
                    <td class="px-4 py-3.5 text-center text-slate-500 font-semibold font-sans">${log.dob}</td>
                    <td class="px-4 py-3.5 text-center text-slate-400 font-medium font-sans">${log.created_at}</td>
                    <td class="px-4 py-3.5 text-center text-emerald-700 font-extrabold font-sans">${log.charge_amount}</td>
                    <td class="px-4 py-3.5 text-center font-sans font-semibold text-slate-500">${log.client_ip}</td>
                    <td class="px-4 py-3.5 text-center">${actionBtn}</td>
                </tr>`;
            }).join('');
        }

        // Action: Submit query request
        document.getElementById('btn-submit-search').addEventListener('click', async () => {
            const nid = document.getElementById('input-nid').value.trim();
            const dob = document.getElementById('input-dob').value.trim();
            const version = document.querySelector('input[name="doc-version"]:checked').value;

            if (!nid || !dob) {
                alert("এনআইডি এবং জন্ম তারিখ ফিল্ড পূরণ করুন!");
                return;
            }

            loaderOverlay.classList.remove('hidden');

            try {
                const response = await fetch('api.php?action=check-nid', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: activeKey, nid, dob, version })
                });
                
                const res = await response.json();
                loaderOverlay.classList.add('hidden');

                if (response.ok && res.success) {
                    // Update credit state
                    if (res.balance_remaining !== undefined) {
                        headerBalance.textContent = `৳${(res.balance_remaining * 3).toFixed(2)}`;
                    }
                    
                    displayReport(res['data-Info'], version);
                    fetchUserLogs(); // Refresh history log ledger
                } else {
                    document.getElementById('dialog-error-msg').textContent = res.message || 'The server rejected this lookup request.';
                    document.getElementById('dialog-overlay').classList.remove('hidden');
                }
            } catch (err) {
                loaderOverlay.classList.add('hidden');
                document.getElementById('dialog-error-msg').textContent = 'Network or syntax interface error failed to reach API gateway.';
                document.getElementById('dialog-overlay').classList.remove('hidden');
            }
        });

        // Close Error Dialogue
        document.getElementById('btn-close-dialog').addEventListener('click', () => {
            document.getElementById('dialog-overlay').classList.add('hidden');
        });

        // Action: Load and Reprint Log details
        window.loadDirectLog = function(id) {
            const log = queryLogs.find(l => l.id == id);
            if (!log) return;
            try {
                const payload = JSON.parse(log.response_json);
                if (payload && payload['data-Info']) {
                    const chosenMode = (payload['data-Info'].pin !== undefined && payload['data-Info'].presentHomeOrHoldingNo === undefined) ? 'V1' : 'V2';
                    displayReport(payload['data-Info'], chosenMode);
                }
            } catch (e) {
                alert("হিস্ট্রি ডাটা রিকোভারি ব্যর্থ হয়েছে!");
            }
        };

        // Render Canvas layout
        function displayReport(info, version) {
            currentRecord = info;
            
            // Toggle screen modules
            document.querySelector('header').classList.add('no-print');
            document.querySelector('main').classList.add('hidden');
            printSection.classList.remove('hidden');

            if (version === 'V1') {
                docV2.classList.add('hidden');
                docV1.classList.remove('hidden');

                document.getElementById('v1-avatar').src = info.photo || 'image.php?u=placeholder';
                document.getElementById('v1-nid').textContent = info.nationalId || '-';
                document.getElementById('v1-pin').textContent = info.pin || '-';
                document.getElementById('v1-form').textContent = info.formNumber || (info.pin ? info.pin.slice(-6) : '-');
                document.getElementById('v1-voter').textContent = info.oldId || '-';
                document.getElementById('v1-voterarea').textContent = info.voterArea || '-';
                document.getElementById('v1-namebn').textContent = info.nameBangla || '-';
                document.getElementById('v1-nameen').textContent = info.nameEnglish || '-';
                document.getElementById('v1-dob').textContent = info.dateOfBirth || '-';
                document.getElementById('v1-father').textContent = info.fatherName || '-';
                document.getElementById('v1-mother').textContent = info.motherName || '-';
                document.getElementById('v1-spouse').textContent = info.spouseName || '-';
                document.getElementById('v1-gender').textContent = info.gender || '-';
                document.getElementById('v1-religion').textContent = info.religion || '-';
                document.getElementById('v1-birthplace').textContent = info.birthPlace || '-';
                document.getElementById('v1-pre-addr').textContent = info.preAddress?.addressLine || '-';
                document.getElementById('v1-per-addr').textContent = info.perAddress?.addressLine || '-';
            } else {
                docV1.classList.add('hidden');
                docV2.classList.remove('hidden');

                document.getElementById('v2-avatar').src = info.photo || 'image.php?u=placeholder';
                document.getElementById('v2-nid').textContent = info.nationalId || '-';
                document.getElementById('v2-pin').textContent = info.pin || '-';
                document.getElementById('v2-voter').textContent = info.oldId || '-';
                document.getElementById('v2-voterarea').textContent = info.voterArea || '-';
                document.getElementById('v2-birthplace').textContent = info.birthPlace || '-';
                document.getElementById('v2-namebn').textContent = info.nameBangla || '-';
                document.getElementById('v2-nameen').textContent = info.nameEnglish || '-';
                document.getElementById('v2-dob').textContent = info.dateOfBirth || '-';
                document.getElementById('v2-father').textContent = info.fatherName || '-';
                document.getElementById('v2-mother').textContent = info.motherName || '-';
                document.getElementById('v2-gender').textContent = info.gender || '-';
                document.getElementById('v2-religion').textContent = info.religion || '-';
                document.getElementById('v2-weekday').textContent = info.occupation || 'Thursday';
                document.getElementById('v2-age').textContent = info.ageBangla || '২০ বছর, ৮ মাস, ৩০ দিন';
                document.getElementById('v2-pre-addr').textContent = info.preAddress?.addressLine || '-';
                document.getElementById('v2-per-addr').textContent = info.perAddress?.addressLine || '-';
                document.getElementById('v2-sub-name').textContent = info.nameEnglish || '';

                // Generate QR server stamp
                const qrData = `${info.nameEnglish || ''}⇋${info.nationalId || ''}⇋${info.dateOfBirth || ''}`;
                document.getElementById('v2-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
            }
        }

        // Action: Return to Dashboard
        document.getElementById('btn-back-to-web').addEventListener('click', () => {
            printSection.classList.add('hidden');
            document.querySelector('header').classList.remove('no-print');
            document.querySelector('main').classList.remove('hidden');
        });

        // Action: Run print
        document.getElementById('btn-trigger-print').addEventListener('click', () => {
            window.print();
        });

        // Action: Export Vector HTML2PDF
        document.getElementById('btn-trigger-pdf').addEventListener('click', () => {
            const version = docV1.classList.contains('hidden') ? 'V2' : 'V1';
            const element = version === 'V1' ? docV1 : docV2;
            const nidNum = currentRecord ? currentRecord.nationalId : 'nid_report';

            const opt = {
                margin: 0,
                filename: `${nidNum}_server_copy.pdf`,
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Version 2 uses dedicated dimension fits
            if (version === 'V2') {
                opt.jsPDF = { unit: 'px', format: [750, 1065], orientation: 'portrait' };
            }

            html2pdf().set(opt).from(element).save();
        });

        // Styling radio button choices toggles
        const rV1 = document.getElementById('lbl-v1');
        const rV2 = document.getElementById('lbl-v2');
        const radios = document.getElementsByName('doc-version');

        radios.forEach(rad => {
            rad.addEventListener('change', () => {
                if(rad.value === 'V1') {
                    rV1.classList.add('border-blue-600', 'bg-blue-50/20');
                    rV2.classList.remove('border-blue-600', 'bg-blue-50/20');
                } else {
                    rV2.classList.add('border-blue-600', 'bg-blue-50/20');
                    rV1.classList.remove('border-blue-600', 'bg-blue-50/20');
                }
            });
        });
        
        // Init trigger radio styles
        rV1.classList.add('border-blue-600', 'bg-blue-50/20');
    </script>
</body>
</html>
