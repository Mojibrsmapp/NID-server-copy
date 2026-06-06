<?php
/**
 * Configuration & SQLite Database Initialization Module
 * Provides unified data structures, rate limits, and sanitizers.
 */

// Define SQLite database path (creates itself securely in workspace folder)
define('DB_FILE', __DIR__ . '/queries.sqlite');

// Rate limiting and charges constants
define('RATE_LIMIT_WINDOW_MS', 60000); // 1 minute
define('RATE_LIMIT_MAX', 30);          // Max 30 requests/min
define('CHARGE_AMOUNT', '৳3.00');
define('UPSTREAM_KEY', 'trial_test');

// Initialize of database context
try {
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Create users schema
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        balance_remaining INTEGER DEFAULT 100,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
    )");

    // Create query logging database schema 
    $db->exec("CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL,
        username TEXT,
        nid TEXT,
        dob TEXT,
        status TEXT,
        data_source TEXT,
        info_found INTEGER,
        balance_after INTEGER DEFAULT 0,
        charge_amount TEXT DEFAULT 'Failed (No Charge)',
        match_type TEXT DEFAULT 'Failed',
        response_time TEXT DEFAULT '0.00s',
        client_ip TEXT DEFAULT '127.0.0.1',
        photo_url TEXT DEFAULT '',
        response_json TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )");

    // Seed administrative API secret tokens if empty
    // Safety purge conflicting rows to avoid SQLite unique constraint errors
    $db->prepare("DELETE FROM users WHERE username = 'system_v1_admin' AND api_key != '32vhhhg'")->execute();
    $db->prepare("DELETE FROM users WHERE api_key = '32vhhhg' AND username != 'system_v1_admin'")->execute();

    $chkAdmin = $db->prepare("SELECT * FROM users WHERE api_key = ?");
    $chkAdmin->execute(['32vhhhg']);
    if ($chkAdmin->fetch() === false) {
        $seed = $db->prepare("INSERT INTO users (username, api_key, balance_remaining, role, status) VALUES (?, ?, ?, ?, ?)");
        $seed->execute(['system_v1_admin', '32vhhhg', 99999, 'admin', 'active']);
    }

} catch (Throwable $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database environment initialization failed: ' . $e->getMessage() . '. Please verify that PDO and PDO_SQLITE extensions are active on your PHP server, and that the directory is writeable (permit safe SQLite file creation).'
    ]);
    exit;
}

/**
 * Strips confidential remote domains from image strings, wrapping them safely in the local image streamer.
 */
function sanitizeString($str) {
    if (empty($str)) return $str;
    if (!is_string($str)) return $str;

    // Check if link is already proxied
    if (
        strpos($str, '/image.php') === 0 ||
        strpos($str, 'image.php') === 0 ||
        strpos($str, '/image?') === 0 ||
        strpos($str, 'image?') === 0
    ) {
        return $str;
    }

    if (strpos($str, 'api.nid-servercopy.com') !== false) {
        return "image.php?u=" . urlencode($str);
    }

    if (strpos($str, 'uploads/') === 0 || strpos($str, '/uploads/') === 0) {
        $cleanPath = ltrim($str, './');
        return "image.php?u=" . urlencode("https://api.nid-servercopy.com/" . $cleanPath);
    }

    return $str;
}

/**
 * Deep-scans nested response schemas so that all photos load over client proxy.
 */
function sanitizeResponseData($obj) {
    if (empty($obj)) return $obj;
    if (is_string($obj)) {
        return sanitizeString($obj);
    }
    if (is_array($obj)) {
        $copy = [];
        foreach ($obj as $key => $val) {
            $copy[$key] = sanitizeResponseData($val);
        }
        return $copy;
    }
    if (is_object($obj)) {
        $copy = new stdClass();
        foreach (get_object_vars($obj) as $key => $val) {
            $copy->{$key} = sanitizeResponseData($val);
        }
        return $copy;
    }
    return $obj;
}

/**
 * Executes a resilient HTTP request using cURL or fallback file_get_contents.
 */
function makeHttpRequest($url, $method = 'GET', $postData = null, $headers = []) {
    $useCurl = function_exists('curl_init');
    
    if ($useCurl) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($postData) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($postData) ? http_build_query($postData) : $postData);
            }
        }
        
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($response !== false) {
            return [
                'code' => $httpCode,
                'body' => $response
            ];
        }
    }
    
    // Stream Context Fallback
    $contextHeaders = [];
    foreach ($headers as $h) {
        $contextHeaders[] = $h;
    }
    
    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $contextHeaders) . "\r\n",
            'timeout' => 20,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
        ]
    ];
    
    if ($method === 'POST') {
        if ($postData) {
            $options['http']['content'] = is_array($postData) ? http_build_query($postData) : $postData;
            if (is_array($postData)) {
                $options['http']['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
            }
        }
    }
    
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    
    if ($response !== false) {
        $code = 200;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $headerLine) {
                if (preg_match('/HTTP\/\d+\.\d+\s+(\d+)/i', $headerLine, $matches)) {
                    $code = (int)$matches[1];
                    break;
                }
            }
        }
        return [
            'code' => $code,
            'body' => $response
        ];
    }
    
    return [
        'code' => 0,
        'body' => ''
    ];
}

/**
 * Scrapes fallback HTML structures from Election Commission raw feeds into the standard lookup response format.
 */
function parseNidHtml($html) {
    $result = [
        "nationalId" => "",
        "oldId" => "",
        "pin" => "",
        "nameBangla" => "",
        "nameEnglish" => "",
        "dateOfBirth" => "",
        "fatherName" => "",
        "motherName" => "",
        "gender" => "",
        "religion" => "Islam",
        "birthPlace" => "",
        "voterArea" => "",
        "voterNumber" => "",
        "formNumber" => "",
        "occupation" => "Thursday",
        "photo" => "",
        "preAddress" => ["addressLine" => ""],
        "perAddress" => ["addressLine" => ""],
        "ageBangla" => "২০ বছর, ৮ মাস, ৩০ দিন",
        "birthdayDay" => ""
    ];

    $extractId = function($id) use ($html) {
        if (preg_match('/id="' . preg_quote($id, '/') . '"[^>]*>([\s\S]*?)<\//i', $html, $matches)) {
            return trim(strip_tags($matches[1]));
        }
        return "";
    };

    $extractClass = function($className) use ($html) {
        if (preg_match('/class="[^"]*' . preg_quote($className, '/') . '[^"]*"[^>]*>([\s\S]*?)<\//i', $html, $matches)) {
            return trim(strip_tags($matches[1]));
        }
        return "";
    };

    $extractImageSrc = function($keyword) use ($html) {
        if (preg_match_all('/<img\s+([^>]+)>/i', $html, $matches)) {
            foreach ($matches[1] as $attrsStr) {
                if (preg_match('/(?:id|class)\s*=\s*["\']?[^"\'>]*(?:' . preg_quote($keyword, '/') . ')[^"\'>]*["\']?/i', $attrsStr)) {
                    if (preg_match('/src\s*=\s*["\']([^"\']+)["\']/i', $attrsStr, $srcMatch)) {
                        return trim($srcMatch[1]);
                    }
                }
            }
        }
        return "";
    };

    $result['nationalId'] = $extractId("nid_no") ?: $extractClass("nid");
    $result['pin'] = $extractId("nid_father") ?: $extractClass("pin") ?: $extractClass("pinNo");
    $result['oldId'] = $extractId("voterNo") ?: $extractClass("VoterNo");
    $result['voterArea'] = $extractId("spouse") ?: $extractClass("vArea");
    $result['birthPlace'] = $extractId("birth_place") ?: $extractClass("birthPlace");
    $result['nameBangla'] = $extractId("nameBangla") ?: $extractClass("nameBn");
    $result['nameEnglish'] = $extractId("nameEnglish") ?: $extractClass("nameEn");
    $result['dateOfBirth'] = $extractId("dob") ?: $extractClass("dob");
    $result['fatherName'] = $extractId("fathers_name") ?: $extractClass("fName");
    $result['motherName'] = $extractId("mothers_name") ?: $extractClass("mName");
    $result['gender'] = $extractId("gender") ?: $extractClass("gender");

    $result['religion'] = $extractId("birthPlace") ?: $extractClass("relagion") ?: "Islam";
    $result['occupation'] = $extractId("occupation") ?: $extractClass("occupation") ?: "Thursday";
    $result['ageBangla'] = $extractId("religion") ?: $extractClass("religionKey") ?: "২০ বছর, ৮ মাস, ৩০ দিন";

    $rawPhoto = $extractImageSrc("photo") ?: $extractImageSrc("avatar") ?: "";
    if ($rawPhoto) {
        if (strpos($rawPhoto, 'http://') !== 0 && strpos($rawPhoto, 'https://') !== 0 && strpos($rawPhoto, 'data:') !== 0) {
            $cleanPath = ltrim($rawPhoto, './');
            $rawPhoto = "image.php?u=" . urlencode("https://api.nid-servercopy.com/" . $cleanPath);
        } elseif (strpos($rawPhoto, 'https://api.nid-servercopy.com/') === 0) {
            $rawPhoto = "image.php?u=" . urlencode($rawPhoto);
        }
    }
    $result['photo'] = $rawPhoto;

    $result['preAddress']['addressLine'] = $extractId("present_addr") ?: $extractClass("presentAddr");
    $result['perAddress']['addressLine'] = $extractId("permanent_addr") ?: $extractClass("permanentAddr");

    if (empty($result['nationalId']) && empty($result['nameBangla']) && empty($result['nameEnglish'])) {
        return null; // Parse structural failure
    }

    return $result;
}
