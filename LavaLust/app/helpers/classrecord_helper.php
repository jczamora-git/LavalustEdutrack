<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Export class record to CSV file
 * Uses the same pattern as StudentController::api_export_students()
 * 
 * @param array $courseInfo Course information
 * @param array $studentRows Array of student data rows (already formatted)
 * @param array $activities Array of activities categorized by type
 * @param string $filename Output filename
 * @return void Outputs CSV file directly to browser
 */
function export_class_record_csv($courseInfo, $studentRows, $activities, $filename)
{
    // Sanitize filename
    $filename = preg_replace('/[^A-Za-z0-9_. -]/', '', $filename);
    if (!preg_match('/\.csv$/i', $filename)) {
        $filename .= '.csv';
    }
    
    // Set CSV headers
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    // Open output stream
    $output = fopen('php://output', 'w');
    
    // Write UTF-8 BOM for Excel compatibility
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Write course information header rows
    $courseName = $courseInfo['course_name'] ?? 'N/A';
    $courseCode = $courseInfo['course_code'] ?? '';
    $teacherName = $courseInfo['teacher_name'] ?? 'N/A';
    $sectionName = $courseInfo['section_name'] ?? 'N/A';
    $periodInfo = $courseInfo['period_info'] ?? '';
    
    fputcsv($output, [$courseCode . ' - ' . $courseName]);
    fputcsv($output, ['Teacher: ' . $teacherName . ' | Section: ' . $sectionName]);
    if ($periodInfo) {
        fputcsv($output, [$periodInfo]);
    }
    fputcsv($output, ['Total Students: ' . count($studentRows)]);
    fputcsv($output, ['Legend: HPS = Highest Possible Score, PS = Percentage Score, WS = Weighted Score']);
    fputcsv($output, []); // Blank row
    
    // Build column headers
    $headers = ['No', 'Student ID', 'Name'];
    
    // Written Works columns
    $written = $activities['written'] ?? [];
    foreach ($written as $idx => $act) {
        $headers[] = 'W' . ($idx + 1);
    }
    $headers[] = 'Written Total';
    $headers[] = 'Written PS';
    $headers[] = 'Written WS';
    
    // Performance Tasks columns
    $performance = $activities['performance'] ?? [];
    foreach ($performance as $idx => $act) {
        $headers[] = 'P' . ($idx + 1);
    }
    $headers[] = 'Performance Total';
    $headers[] = 'Performance PS';
    $headers[] = 'Performance WS';
    
    // Exam columns
    $exam = $activities['exam'] ?? [];
    if (!empty($exam)) {
        $headers[] = 'Exam Score';
        $headers[] = 'Exam PS';
        $headers[] = 'Exam WS';
    }
    
    // Final grade columns
    $headers[] = 'Initial Grade';
    $headers[] = 'Final Grade';
    
    // Write column headers
    fputcsv($output, $headers);
    
    // Write student data rows
    foreach ($studentRows as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    exit;
}
