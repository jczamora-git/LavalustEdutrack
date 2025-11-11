<?php
// Generate 300 fake students and write using the project's spreadsheet helper (PhpSpreadsheet)
// This file uses the helper function write_spreadsheet() implemented in app/helpers/spreadsheet_helper.php

require_once __DIR__ . '/../helpers/spreadsheet_helper.php';

$firstNames = [
    "Juan", "Maria", "Luis", "Ana", "Carlos", "Sofia", "Miguel", "Isabella", "Elena", "Jorge",
    "Cristina", "Ricardo", "Gabriela", "Andres", "Valentina", "Diego", "Camila", "Felipe", "Lucia", "Sebastian",
    "Ava", "Nathan", "Chloe", "Marcus", "Zoe", "Leo", "Stella", "Oscar", "Nina", "Axel",
    "Ellie", "Dylan", "Lily", "Ian", "Sophia", "Julian", "Emma", "Brian", "Mia", "Victor"
];

$lastNames = [
    "Garcia", "Reyes", "Cruz", "Torres", "Lim", "Tan", "Diaz", "Sy", "Castro", "Navarro",
    "Perez", "Santos", "Delgado", "Fernandez", "Mendoza", "Go", "Aquino", "Bautista", "Villanueva", "Uy",
    "Ramos", "Alvarez", "Huang", "Ocampo", "Salazar", "Gomez", "Dela Cruz", "Delos Santos", "Medina", "Pineda",
    "Lozano", "Bravo", "Quinto", "Rivera", "Santiago", "Ignacio", "Katindig", "Manalo", "Beltran", "Ortega"
];

$yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

$rows = [];
for ($i = 0; $i < 300; $i++) {
    $firstName = $firstNames[array_rand($firstNames)];
    $lastName = $lastNames[array_rand($lastNames)];
    $yearLevel = $yearLevels[array_rand($yearLevels)];
    $email = strtolower(str_replace(' ', '.', $firstName . '.' . $lastName)) . '@mcc.edu.ph';

    $rows[] = [
        'Student ID' => '',
        'First Name' => $firstName,
        'Last Name' => $lastName,
        'Email' => $email,
        'Year Level' => $yearLevel
    ];
}

$filePath = __DIR__ . '/students_export_extended.xlsx';

try {
    $ok = write_spreadsheet($rows, $filePath, 'Xlsx');
    if ($ok) {
        echo "Generated 300 students in: " . $filePath . PHP_EOL;
    } else {
        echo "write_spreadsheet returned false" . PHP_EOL;
    }
} catch (Exception $e) {
    echo "Error generating spreadsheet: " . $e->getMessage() . PHP_EOL;
}

?>