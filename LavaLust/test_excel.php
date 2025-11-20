<?php
// Minimal test: generate Excel and output directly
require __DIR__ . '/app/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

// Clear all buffers
while (ob_get_level()) {
    ob_end_clean();
}

// Create spreadsheet
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setCellValue('A1', 'Hello World');

// Set headers
header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="test.xlsx"');
header('Cache-Control: max-age=0');

// Output
$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
