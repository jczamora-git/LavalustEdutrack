<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Helper: pdf_helper.php
 * 
 * Provides reusable functions for generating PDF reports using mPDF library.
 * Supports student grade reports with customizable HTML templates.
 * 
 * mPDF features used:
 * - CSS stylesheets (inline and external via writeHTML)
 * - HTML to PDF conversion
 * - Multi-page documents
 * - Metadata and document properties
 */

use Mpdf\Mpdf;

/**
 * Generate a PDF from HTML content
 * 
 * @param string $html HTML content to render (can include inline CSS)
 * @param string $filename Output filename (without .pdf extension)
 * @param array $options mPDF configuration options
 * @return string Binary PDF content
 * @throws Exception if mPDF is not available or generation fails
 */
function generate_pdf_from_html($html, $filename = 'document', $options = [])
{
    // Check if mPDF is available
    if (!class_exists('Mpdf\Mpdf')) {
        throw new Exception('mPDF library not found. Please run `composer install` in the LavaLust app directory.');
    }

    try {
        // Default mPDF configuration
        $defaultConfig = [
            'mode' => 'utf-8',
            'format' => 'A4',
            'margin_left' => 15,
            'margin_right' => 15,
            'margin_top' => 15,
            'margin_bottom' => 15,
            'margin_header' => 9,
            'margin_footer' => 9,
            'tempDir' => sys_get_temp_dir(),
        ];

        // Merge with provided options
        $config = array_merge($defaultConfig, $options);

        // Initialize mPDF
        $mpdf = new Mpdf($config);

        // Set document properties
        $mpdf->SetCreator('EduTrack System');
        $mpdf->SetAuthor('EduTrack');
        $mpdf->SetTitle($filename);
        $mpdf->SetDefaultFont('Helvetica');

        // Write HTML to PDF (mPDF renders inline CSS automatically)
        $mpdf->WriteHTML($html);

        // Return PDF as binary string
        return $mpdf->Output('', 'S');

    } catch (Exception $e) {
        throw new Exception('PDF generation failed: ' . $e->getMessage());
    }
}

/**
 * Build HTML for a student grade report
 * 
 * @param array $student Student data (id, student_id, first_name, last_name, email, year_level, etc.)
 * @param array $grades Array of grade records (each with course_code, course_name, credits, midterm_grade, final_grade, final_grade_num, remarks)
 * @param array $period Academic period data (id, school_year, semester, period_type, start_date, end_date, etc.)
 * @param string $template Template type: 'standard' (all fields), 'summary' (GWA only), 'detailed' (with activity breakdown)
 * @return string HTML content ready for PDF generation
 */
function build_student_report_html($student, $grades = [], $period = [], $template = 'standard')
{
    $html = '<style>
        body { 
            font-family: "Helvetica", "Arial", sans-serif; 
            line-height: 1.6;
            color: #333;
        }
        
        h1 { 
            color: #1e40af; 
            text-align: center; 
            margin: 0 0 5px 0;
            font-size: 24px;
        }
        
        h2 { 
            color: #1e40af; 
            font-size: 14px; 
            margin-top: 20px; 
            margin-bottom: 10px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 5px;
        }
        
        .header { 
            text-align: center; 
            margin-bottom: 25px; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 15px;
        }
        
        .header .school-name { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1e40af; 
            margin-bottom: 5px;
        }
        
        .header .report-title { 
            font-size: 16px; 
            color: #4b5563; 
            margin-top: 8px;
        }
        
        .period-info {
            font-size: 11px;
            color: #6b7280;
            margin-top: 8px;
        }
        
        .info-section { 
            margin-bottom: 20px;
            padding: 0;
        }
        
        .info-row { 
            margin: 6px 0; 
            font-size: 11px;
        }
        
        .info-label { 
            font-weight: bold; 
            color: #374151; 
            width: 150px; 
            display: inline-block;
        }
        
        table.grades { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 12px;
            font-size: 10px;
        }
        
        table.grades th { 
            background-color: #2563eb; 
            color: white; 
            padding: 8px; 
            text-align: left;
            font-weight: bold;
        }
        
        table.grades td { 
            padding: 6px 8px; 
            border-bottom: 1px solid #e5e7eb;
        }
        
        table.grades tr:nth-child(even) { 
            background-color: #f9fafb;
        }
        
        .passed {
            color: #10b981;
            font-weight: bold;
        }
        
        .failed {
            color: #ef4444;
            font-weight: bold;
        }
        
        .summary { 
            margin-top: 20px; 
            padding: 12px; 
            background-color: #eff6ff; 
            border-radius: 4px;
            border-left: 4px solid #2563eb;
            font-size: 11px;
        }
        
        .summary .label { 
            font-weight: bold; 
            color: #1e40af;
        }
        
        .summary-row {
            margin: 6px 0;
        }
        
        .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 9px; 
            color: #6b7280; 
            border-top: 1px solid #d1d5db; 
            padding-top: 10px;
        }
        
        .no-data {
            color: #6b7280;
            font-size: 11px;
            font-style: italic;
        }
    </style>';

    // Header section
    $html .= '<div class="header">';
    $html .= '<div class="school-name">MCC EduTrack System</div>';
    $html .= '<div class="report-title">Student Grade Report</div>';
    
    if (!empty($period)) {
        $periodName = $period['school_year'] ?? '';
        $periodTerm = $period['semester'] ?? '';
        if ($periodName || $periodTerm) {
            $html .= '<div class="period-info">' . htmlspecialchars($periodName . ' • ' . $periodTerm) . '</div>';
        }
    }
    
    $html .= '</div>';

    // Student information section
    $html .= '<div class="info-section">';
    $html .= '<h2>Student Information</h2>';
    $html .= '<div class="info-row"><span class="info-label">Student ID:</span> ' . htmlspecialchars($student['student_id'] ?? 'N/A') . '</div>';
    $html .= '<div class="info-row"><span class="info-label">Full Name:</span> ' . htmlspecialchars(trim(($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? ''))) . '</div>';
    $html .= '<div class="info-row"><span class="info-label">Email:</span> ' . htmlspecialchars($student['email'] ?? 'N/A') . '</div>';
    $html .= '<div class="info-row"><span class="info-label">Year Level:</span> ' . htmlspecialchars($student['year_level'] ?? 'N/A') . '</div>';
    $html .= '<div class="info-row"><span class="info-label">Report Generated:</span> ' . date('F d, Y H:i A') . '</div>';
    $html .= '</div>';

    // Academic performance section (varies by template)
    $html .= '<div class="info-section">';
    $html .= '<h2>Academic Performance</h2>';

    if (empty($grades)) {
        $html .= '<p class="no-data">No grades recorded for this period.</p>';
    } else {
        if ($template === 'summary') {
            // Summary template: only show GWA
            $html .= build_gwa_summary($grades);
        } elseif ($template === 'detailed') {
            // Detailed template: full table + activities
            $html .= build_grades_table($grades);
            $html .= build_gwa_summary($grades);
        } else {
            // Standard template: full table + GWA
            $html .= build_grades_table($grades);
            $html .= build_gwa_summary($grades);
        }
    }

    $html .= '</div>';

    // Footer
    $html .= '<div class="footer">';
    $html .= 'This is a computer-generated document from EduTrack. No signature required.<br>';
    $html .= '© ' . date('Y') . ' Metropolitan Computer College. All rights reserved.';
    $html .= '</div>';

    return $html;
}

/**
 * Build grades table HTML
 * 
 * @param array $grades Grade records
 * @return string HTML table
 */
function build_grades_table($grades)
{
    $html = '<table class="grades">';
    $html .= '<thead><tr>';
    $html .= '<th style="width: 12%;">Code</th>';
    $html .= '<th style="width: 35%;">Course Name</th>';
    $html .= '<th style="width: 8%;">Units</th>';
    $html .= '<th style="width: 12%;">Midterm</th>';
    $html .= '<th style="width: 12%;">Final</th>';
    $html .= '<th style="width: 10%;">Remarks</th>';
    $html .= '</tr></thead>';
    $html .= '<tbody>';

    foreach ($grades as $grade) {
        $html .= '<tr>';
        $html .= '<td>' . htmlspecialchars($grade['course_code'] ?? '') . '</td>';
        $html .= '<td>' . htmlspecialchars($grade['course_name'] ?? '') . '</td>';
        $html .= '<td>' . htmlspecialchars($grade['credits'] ?? '3') . '</td>';
        
        // Display midterm (numeric percent from midterm_num stored as midterm_grade display)
        $midtermDisplay = (isset($grade['midterm_grade'])) ? htmlspecialchars($grade['midterm_grade']) : '-';
        $html .= '<td>' . $midtermDisplay . '</td>';
        
        // Display final (letter grade 1.00-5.00 from transmute() stored in final_grade)
        $finalGrade = $grade['final_grade'] ?? '-';
        $finalDisplay = (is_string($finalGrade) && strlen($finalGrade) > 0) ? htmlspecialchars($finalGrade) : '-';
        $html .= '<td>' . $finalDisplay . '</td>';
        
        // Remarks based on the numeric average (final_grade_num)
        $finalGradeNum = floatval($grade['final_grade_num'] ?? 0);
        $remarks = ($finalGradeNum >= 75) ? 'PASSED' : (($finalGradeNum > 0) ? 'FAILED' : 'INC');
        $remarkClass = ($remarks === 'PASSED') ? 'passed' : 'failed';
        
        $html .= '<td class="' . $remarkClass . '">' . $remarks . '</td>';
        $html .= '</tr>';
    }

    $html .= '</tbody>';
    $html .= '</table>';

    return $html;
}

/**
 * Build GWA (General Weighted Average) summary HTML
 * 
 * @param array $grades Grade records (final_grade_num is numeric 0-100 average, final_grade is 1.00-5.00 letter grade)
 * @return string HTML summary
 */
function build_gwa_summary($grades)
{
    $totalUnits = 0;
    $totalGradePoints = 0;

    foreach ($grades as $grade) {
        // Use final_grade_num which is the numeric 0-100 average
        $finalGradeNum = floatval($grade['final_grade_num'] ?? 0);
        if ($finalGradeNum > 0) {
            $units = floatval($grade['credits'] ?? 3);
            $totalUnits += $units;
            $totalGradePoints += ($finalGradeNum * $units);
        }
    }

    $html = '<div class="summary">';
    
    if ($totalUnits > 0) {
        // GWA is calculated on 0-100 scale
        $gwaNumeric = $totalGradePoints / $totalUnits;
        
        // Convert GWA to 1.00-5.00 letter grade scale using same transmute logic
        if ($gwaNumeric >= 97) $gwaLetter = "1.00";
        elseif ($gwaNumeric >= 94) $gwaLetter = "1.25";
        elseif ($gwaNumeric >= 91) $gwaLetter = "1.50";
        elseif ($gwaNumeric >= 88) $gwaLetter = "1.75";
        elseif ($gwaNumeric >= 85) $gwaLetter = "2.00";
        elseif ($gwaNumeric >= 82) $gwaLetter = "2.25";
        elseif ($gwaNumeric >= 79) $gwaLetter = "2.50";
        elseif ($gwaNumeric >= 76) $gwaLetter = "2.75";
        elseif ($gwaNumeric >= 75) $gwaLetter = "3.00";
        else $gwaLetter = "5.00";
        
        $html .= '<div class="summary-row"><span class="label">Total Units:</span> ' . number_format($totalUnits, 2) . '</div>';
        $html .= '<div class="summary-row"><span class="label">General Weighted Average (GWA):</span> <strong>' . $gwaLetter . '</strong></div>';
        
        // GWA interpretation based on 1.00-5.00 scale
        if ($gwaLetter <= "1.50") {
            $interpretation = 'Excellent Performance';
        } elseif ($gwaLetter <= "2.00") {
            $interpretation = 'Very Good Performance';
        } elseif ($gwaLetter <= "2.50") {
            $interpretation = 'Good Performance';
        } elseif ($gwaLetter <= "3.00") {
            $interpretation = 'Satisfactory Performance';
        } else {
            $interpretation = 'Below Average Performance';
        }
        $html .= '<div class="summary-row"><span class="label">Status:</span> ' . $interpretation . '</div>';
    } else {
        $html .= '<p class="no-data">Insufficient data to calculate GWA.</p>';
    }
    
    $html .= '</div>';

    return $html;
}

/**
 * Generate a single student PDF report
 * 
 * @param array $student Student data
 * @param array $grades Grade records (can be empty)
 * @param array $period Academic period data (can be empty)
 * @param string $template Report template type
 * @return string Binary PDF content
 * @throws Exception on generation failure
 */
function generate_student_pdf($student, $grades = [], $period = [], $template = 'standard')
{
    $html = build_student_report_html($student, $grades, $period, $template);
    return generate_pdf_from_html($html, 'Grade_Report_' . ($student['student_id'] ?? 'report'));
}

/**
 * Generate bulk PDF reports as a ZIP archive
 * 
 * @param array $students Array of student records
 * @param array $gradesMap Keyed array where each key is student_id and value is array of grades
 * @param array $period Academic period data
 * @param string $template Report template type
 * @return string Binary ZIP content
 * @throws Exception on generation failure
 */
function generate_bulk_pdf_zip($students, $gradesMap = [], $period = [], $template = 'standard')
{
    if (!class_exists('ZipArchive')) {
        throw new Exception('ZipArchive extension not available.');
    }

    $zip = new ZipArchive();
    $zipFilename = tempnam(sys_get_temp_dir(), 'reports_') . '.zip';

    if ($zip->open($zipFilename, ZipArchive::CREATE) !== TRUE) {
        throw new Exception('Could not create ZIP archive.');
    }

    try {
        foreach ($students as $student) {
            $studentId = $student['id'] ?? null;
            $grades = $gradesMap[$studentId] ?? [];

            $pdf = generate_student_pdf($student, $grades, $period, $template);
            $filename = 'Grade_Report_' . ($student['student_id'] ?? $student['id']) . '.pdf';
            $zip->addFromString($filename, $pdf);
        }

        $zip->close();

        // Read ZIP content and return as binary
        $zipContent = file_get_contents($zipFilename);
        unlink($zipFilename);

        return $zipContent;

    } catch (Exception $e) {
        $zip->close();
        if (file_exists($zipFilename)) {
            unlink($zipFilename);
        }
        throw $e;
    }
}
?>
