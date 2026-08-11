<?php
/**
 * Live portfolio scanner — reads assets/portfolio/* and returns JSON.
 * Drop a folder or image into assets/portfolio and refresh the page.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

$root = dirname(__DIR__);
$portfolioDir = $root . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'portfolio';
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

function portfolio_label(string $folder): string
{
    $acronyms = [
        'ai' => 'AI',
        'bmi' => 'BMI',
        'saas' => 'SaaS',
        'ui' => 'UI',
        'ux' => 'UX',
    ];
    $spaced = str_replace(['_', '-'], ' ', $folder);
    $words = preg_split('/\s+/', mb_strtolower($spaced)) ?: [];
    $out = [];
    foreach ($words as $word) {
        if ($word === '') {
            continue;
        }
        $out[] = $acronyms[$word] ?? (mb_strtoupper(mb_substr($word, 0, 1)) . mb_substr($word, 1));
    }
    return implode(' ', $out);
}

function portfolio_src(string $folder, string $file): string
{
    $encode = static function (string $part): string {
        return str_replace('%2F', '/', rawurlencode($part));
    };
    return 'assets/portfolio/' . $encode($folder) . '/' . $encode($file);
}

function natural_cmp(string $a, string $b): int
{
    return strnatcasecmp($a, $b);
}

if (!is_dir($portfolioDir)) {
    http_response_code(404);
    echo json_encode(
        ['categories' => [], 'items' => [], 'error' => 'Portfolio folder not found'],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

$categories = [];
$items = [];

$dirs = array_values(array_filter(scandir($portfolioDir) ?: [], static function ($name) use ($portfolioDir) {
    if ($name === '.' || $name === '..' || $name[0] === '.') {
        return false;
    }
    return is_dir($portfolioDir . DIRECTORY_SEPARATOR . $name);
}));

usort($dirs, 'natural_cmp');

foreach ($dirs as $folder) {
    $path = $portfolioDir . DIRECTORY_SEPARATOR . $folder;
    $files = array_values(array_filter(scandir($path) ?: [], static function ($file) use ($path, $allowed) {
        if ($file === '.' || $file === '..' || $file[0] === '.') {
            return false;
        }
        $full = $path . DIRECTORY_SEPARATOR . $file;
        if (!is_file($full)) {
            return false;
        }
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        return in_array($ext, $allowed, true);
    }));

    usort($files, 'natural_cmp');
    if (!$files) {
        continue;
    }

    $label = portfolio_label($folder);
    $catItems = [];

    foreach ($files as $file) {
        $base = pathinfo($file, PATHINFO_FILENAME);
        $title = portfolio_label($base);
        $item = [
            'src' => portfolio_src($folder, $file),
            'name' => $file,
            'title' => $title,
            'alt' => $label . ' — ' . $title,
            'category' => $folder,
            'categoryLabel' => $label,
        ];
        $catItems[] = $item;
        $items[] = $item;
    }

    $categories[] = [
        'id' => $folder,
        'label' => $label,
        'count' => count($catItems),
        'items' => $catItems,
    ];
}

echo json_encode(
    [
        'generatedAt' => gmdate('c'),
        'categories' => $categories,
        'items' => $items,
    ],
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
);
