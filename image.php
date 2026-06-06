<?php
/**
 * Image Stream Proxy Module
 * Safely routes and streams profile images, signatures, and backgrounds.
 */

if (!isset($_GET['u']) || empty($_GET['u'])) {
    http_response_code(400);
    die("No secure target image parameter provided.");
}

$targetUrl = $_GET['u'];

// Unwrap nested references repeatedly
while (
    strpos($targetUrl, 'image.php?') !== false || 
    strpos($targetUrl, '/image?') !== false || 
    strpos($targetUrl, '/api/photo-proxy') !== false
) {
    if (preg_match('/[?&]u=([^&]+)/', $targetUrl, $m)) {
        $targetUrl = urldecode($m[1]);
    } elseif (preg_match('/[?&]url=([^&]+)/', $targetUrl, $m)) {
        $targetUrl = urldecode($m[1]);
    } elseif (preg_match('/[?&]path=([^&]+)/', $targetUrl, $m)) {
        $targetUrl = "https://api.nid-servercopy.com/" . ltrim(urldecode($m[1]), '/');
    } else {
        break;
    }
}

// Convert relative pathways to upstream servers
if (strpos($targetUrl, 'http://') !== 0 && strpos($targetUrl, 'https://') !== 0) {
    $targetUrl = "https://api.nid-servercopy.com/" . ltrim($targetUrl, './');
}

// Initiate network handshake with Referer spoofing
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
curl_setopt($ch, CURLOPT_REFERER, "https://api.nid-servercopy.com/");
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($httpCode == 200 && !empty($data)) {
    // Deliver content as stream cacheable for 1 day
    header("Content-Type: " . ($contentType ?: "image/jpeg"));
    header("Cache-Control: public, max-age=86400");
    echo $data;
} else {
    http_response_code(502);
    die("Upstream network fetch error. Server responded with: " . $httpCode);
}
