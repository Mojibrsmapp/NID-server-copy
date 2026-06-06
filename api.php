<?php
/**
 * Main API Routing & Verification Controller
 * Bridges clients to database registries, rate limits, caches, and live upstream queries.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Key");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

try {
    // Detect action path
    $requestUri = $_SERVER['REQUEST_URI'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Resolve action name from folder routes (e.g. /api/check-balance)
if (empty($action)) {
    if (strpos($requestUri, 'check-balance') !== false) {
        $action = 'check-balance';
    } elseif (strpos($requestUri, 'check-nid') !== false) {
        $action = 'check-nid';
    } elseif (strpos($requestUri, 'user/logs') !== false || strpos($requestUri, 'user-logs') !== false) {
        $action = 'user-logs';
    }
}

// Client IP extractor
$clientIp = '127.0.0.1';
if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $clientIp = $_SERVER['HTTP_CF_CONNECTING_IP'];
} elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $clientIp = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
} elseif (isset($_SERVER['REMOTE_ADDR'])) {
    $clientIp = $_SERVER['REMOTE_ADDR'];
}
$clientIp = trim($clientIp);

// -------------------------------------------------------------
// ACTION: CHECK KEY BALANCE
// -------------------------------------------------------------
if ($action === 'check-balance') {
    $key = isset($_GET['key']) ? trim($_GET['key']) : '';
    if (empty($key)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'API Key is required.']);
        exit;
    }

    try {
        $stmt = $db->prepare("SELECT username, balance_remaining, role, status FROM users WHERE api_key = ?");
        $stmt->execute([$key]);
        $user = $stmt->fetch();

        if ($user === false) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid API Key. Access denied.']);
            exit;
        }

        if ($user['status'] !== 'active') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'This API Key has been deactivated.']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'username' => $user['username'],
            'balance_remaining' => (int)$user['balance_remaining'],
            'role' => $user['role'],
            'status' => $user['status']
        ]);
        exit;

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database failure: ' . $e->getMessage()]);
        exit;
    }
}

// -------------------------------------------------------------
// ACTION: USER LOGS HISTORY SEARCH
// -------------------------------------------------------------
if ($action === 'user-logs') {
    $key = isset($_GET['key']) ? trim($_GET['key']) : '';
    if (empty($key)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'API Key is required to view logs.']);
        exit;
    }

    try {
        $stmt = $db->prepare("SELECT username, status FROM users WHERE api_key = ?");
        $stmt->execute([$key]);
        $user = $stmt->fetch();

        if ($user === false) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid or inactive API Key structure.']);
            exit;
        }

        if ($user['status'] !== 'active') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Your API Key is deactivated.']);
            exit;
        }

        $stmtLogs = $db->prepare("SELECT id, nid, dob, status, balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json, created_at FROM query_logs WHERE api_key = ? ORDER BY id DESC LIMIT 150");
        $stmtLogs->execute([$key]);
        $logs = $stmtLogs->fetchAll();

        $sanitizedLogs = [];
        foreach ($logs as $log) {
            $copy = $log;
            // Map labels for user outputs
            if ($copy['match_type'] === 'Cached') {
                $copy['match_type'] = 'LIVE';
            }
            if ($copy['charge_amount'] === 'Cache (Free)') {
                $copy['charge_amount'] = '৳3.00';
            }
            
            $copy['photo_url'] = sanitizeString($copy['photo_url']);
            
            if (!empty($copy['response_json'])) {
                $decoded = json_decode($copy['response_json'], true);
                if ($decoded) {
                    $sanitized = sanitizeResponseData($decoded);
                    $copy['response_json'] = json_encode($sanitized);
                } else {
                    $copy['response_json'] = sanitizeString($copy['response_json']);
                }
            }
            $sanitizedLogs[] = $copy;
        }

        echo json_encode([
            'success' => true,
            'username' => $user['username'],
            'logs' => $sanitizedLogs
        ]);
        exit;

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database failure: ' . $e->getMessage()]);
        exit;
    }
}

// -------------------------------------------------------------
// ACTION: QUERY LIVE NID SERVER COPY
// -------------------------------------------------------------
if ($action === 'check-nid') {
    // Read JSON parameters
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $nid = isset($input['nid']) ? trim($input['nid']) : '';
    $dob = isset($input['dob']) ? trim($input['dob']) : '';
    $key = isset($input['key']) ? trim($input['key']) : '';
    $version = isset($input['version']) ? trim($input['version']) : 'V1';

    if (empty($nid) || empty($dob) || empty($key)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please provide NID, Date of Birth (YYYY-MM-DD), and API Key parameters.'
        ]);
        exit;
    }

    $startTime = microtime(true);

    try {
        // Authenticate Key
        $stmt = $db->prepare("SELECT * FROM users WHERE api_key = ?");
        $stmt->execute([$key]);
        $dbUser = $stmt->fetch();

        if ($dbUser === false) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid API Key. Access denied.']);
            exit;
        }

        if ($dbUser['status'] !== 'active') {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'This API Key has been deactivated.']);
            exit;
        }

        // Rate Limiter Checks (max 30 queries in last 1 minute)
        $rateStmt = $db->prepare("SELECT COUNT(*) as requests FROM query_logs WHERE api_key = ? AND created_at >= datetime('now', '-1 minute')");
        $rateStmt->execute([$key]);
        $rateRecord = $rateStmt->fetch();
        $recentCount = (int)$rateRecord['requests'];

        header("X-RateLimit-Limit: " . RATE_LIMIT_MAX);
        header("X-RateLimit-Remaining: " . max(0, RATE_LIMIT_MAX - $recentCount));
        header("X-RateLimit-Reset: 60");

        if ($recentCount >= RATE_LIMIT_MAX) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'message' => "Too many requests. Please slow down. Rate limit is " . RATE_LIMIT_MAX . " requests/minute. Try again in a moment."
            ]);
            exit;
        }

        $currentBalance = (int)$dbUser['balance_remaining'];
        if ($currentBalance <= 0) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Your API Key has insufficient balance (0 credits remaining).'
            ]);
            exit;
        }

        // --- SMART LOCAL HISTORY CACHE LOOKUP ---
        // Instantly loads previous successes to avoid duplicate API charges
        $cacheStmt = $db->prepare("SELECT * FROM query_logs WHERE nid = ? AND dob = ? AND status = 'success' AND response_json IS NOT NULL AND response_json != '' ORDER BY id DESC LIMIT 1");
        $cacheStmt->execute([$nid, $dob]);
        $cachedLog = $cacheStmt->fetch();

        if ($cachedLog !== false) {
            $responseData = json_decode($cachedLog['response_json'], true);
            if ($responseData && isset($responseData['success']) && $responseData['success']) {
                
                $responseData = sanitizeResponseData($responseData);
                $sanitizedPhoto = sanitizeString($cachedLog['photo_url'] ?: '');

                // Deduct 1 Credit
                $newUserBalance = $currentBalance - 1;
                $updStmt = $db->prepare("UPDATE users SET balance_remaining = ? WHERE id = ?");
                $updStmt->execute([$newUserBalance, $dbUser['id']]);

                // Record transaction logs
                $logIns = $db->prepare("INSERT INTO query_logs (
                    api_key, username, nid, dob, status, data_source, info_found, 
                    balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $logIns->execute([
                    $key, $dbUser['username'], $nid, $dob, 'success', 'CACHE', 1,
                    $newUserBalance, CHARGE_AMOUNT, 'Cached', '0.00s', $clientIp, $sanitizedPhoto, json_encode($responseData)
                ]);

                // Adjust balance inside response object
                $responseData['balance_remaining'] = $newUserBalance;
                $responseData['Contact-Info'] = [
                    "Contact With Me WhatsApp" => "https://wa.me/+8801601519007",
                    "Contact With Me Telegram" => "https://t.me/MrTools_BD",
                    "Join Our WhatsApp Community Group" => "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
                ];

                echo json_encode($responseData);
                exit;
            }
        }

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database lookup failure: ' . $e->getMessage()]);
        exit;
    }

    // --- LIVE FETCH PIPELINE ---
    $querySuccess = false;
    $responseData = null;
    $usedDataSource = 'sv.php';

    // Upstream secret bridge key
    $masterUpstreamKey = UPSTREAM_KEY;

    // 1. Primary Query: Supreme sv.php Live JSON Endpoint
    $svUrl = "https://api.nid-servercopy.com/sv.php?key=" . urlencode($masterUpstreamKey) . "&nid=" . urlencode($nid) . "&dob=" . urlencode($dob);

    $svResponse = makeHttpRequest($svUrl, 'GET', null, [
        "accept: application/json, text/plain, */*",
        "accept-language: en-GB,en-US;q=0.9,en;q=0.8,bn;q=0.6"
    ]);

    if ($svResponse['code'] == 200 && $svResponse['body']) {
        $jsonDec = json_decode($svResponse['body'], true);
        if ($jsonDec && (isset($jsonDec['success']) || isset($jsonDec['data-Info']))) {
            if (!isset($jsonDec['success'])) {
                $jsonDec['success'] = true;
            }
            $responseData = $jsonDec;
            $querySuccess = true;
            $usedDataSource = 'sv.php';
        }
    }

    // 2. Fallback Secondary Query: Standard Web/Scraper Forms
    if (!$querySuccess) {
        $scriptName = ($version === 'V2') ? 'server-copyv2.php' : 'server-copyv1.php';
        $fallbackUrl = "https://api.nid-servercopy.com/" . $scriptName;

        $postFields = [
            'nid' => $nid,
            'dob' => $dob,
            'key' => $masterUpstreamKey
        ];

        $fallResponse = makeHttpRequest($fallbackUrl, 'POST', $postFields, [
            "accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "accept-language: en-GB,en-US;q=0.9,en;q=0.8,bn;q=0.6"
        ]);

        if ($fallResponse['code'] == 200 && !empty($fallResponse['body'])) {
            $fallResult = $fallResponse['body'];
            // Confirm we didn't receive an access block
            if (
                strpos($fallResult, 'nid or dob number not provided') === false && 
                strpos($fallResult, 'Please Provide Nid and Dob Parameters') === false
            ) {
                // If return output is JSON format
                $jsonDec = json_decode($fallResult, true);
                if ($jsonDec && (isset($jsonDec['success']) || isset($jsonDec['data-Info']))) {
                    $responseData = $jsonDec;
                    $querySuccess = true;
                    $usedDataSource = $scriptName;
                } else {
                    // It is an HTML document layout. Trigger custom parser
                    $parsed = parseNidHtml($fallResult);
                    if ($parsed) {
                        $responseData = [
                            "success" => true,
                            "data-Info" => $parsed,
                            "id-summary" => [
                                "10_digit_nid" => $parsed['nationalId'],
                                "13_digit_oldid" => $parsed['oldId'],
                                "17_digit_pin" => $parsed['pin']
                            ],
                            "extra-info" => [
                                "birthday_day" => $parsed['birthdayDay'] ?: "Thursday",
                                "age_in_bangla" => $parsed['ageBangla'] ?: "২০ বছর, ৮ মাস, ৩০ দিন"
                            ]
                        ];
                        $querySuccess = true;
                        $usedDataSource = $scriptName;
                    }
                }
            }
        }
    }

    // Log Query Outputs and apply charge deductions
    $durationSec = number_format(microtime(true) - $startTime, 2) . 's';

    if ($querySuccess && $responseData) {
        $responseData = sanitizeResponseData($responseData);

        $responseData['Contact-Info'] = [
            "Contact With Me WhatsApp" => "https://wa.me/+8801601519007",
            "Contact With Me Telegram" => "https://t.me/MrTools_BD",
            "Join Our WhatsApp Community Group" => "https://chat.whatsapp.com/LIZFWhn5Xir2nr4B3NwlA5"
        ];

        try {
            // Apply cost balance deductions
            $newUserBalance = $currentBalance - 1;
            $updBal = $db->prepare("UPDATE users SET balance_remaining = ? WHERE id = ?");
            $updBal->execute([$newUserBalance, $dbUser['id']]);

            $photoRef = isset($responseData['data-Info']['photo']) ? $responseData['data-Info']['photo'] : '';

            // Write active transaction
            $logIns = $db->prepare("INSERT INTO query_logs (
                api_key, username, nid, dob, status, data_source, info_found, 
                balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $logIns->execute([
                $key, $dbUser['username'], $nid, $dob, 'success', $usedDataSource, 1,
                $newUserBalance, CHARGE_AMOUNT, 'LIVE', $durationSec, $clientIp, $photoRef, json_encode($responseData)
            ]);

            $responseData['balance_remaining'] = $newUserBalance;
            echo json_encode($responseData);
            exit;

        } catch (PDOException $e) {
            // Still present valid record response to user even if DB log write errors out
            $responseData['balance_remaining'] = $currentBalance - 1;
            echo json_encode($responseData);
            exit;
        }
    } else {
        // Search server returned empty match
        try {
            $logFail = $db->prepare("INSERT INTO query_logs (
                api_key, username, nid, dob, status, data_source, info_found, 
                balance_after, charge_amount, match_type, response_time, client_ip, photo_url, response_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $logFail->execute([
                $key, $dbUser['username'], $nid, $dob, 'failed', $version, 0,
                $currentBalance, 'Failed (No Charge)', 'Failed', $durationSec, $clientIp, '', '{}'
            ]);
        } catch (PDOException $e) {}

        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => 'The lookup server returned no match. Please double-check NID digit count, DOB format accuracy, and try again.'
        ]);
        exit;
    }
}

// Reach here if no routing endpoints matched
http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Endpoint action not resolved.']);
exit;

} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'API System Error: ' . $t->getMessage() . ' inside ' . basename($t->getFile()) . ' on line ' . $t->getLine()
    ]);
    exit;
}
