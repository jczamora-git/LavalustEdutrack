<?php

/**
 * ReportController - Generate PDF reports for students
 * 
 * Handles generation of individual and bulk student grade PDF reports.
 * Uses the pdf_helper for PDF generation and template rendering.
 * Uses StudentModel for fetching student and grade data.
 */
class ReportController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        // Load StudentModel so we can use $this->StudentModel->get_all() etc.
        $this->call->model('StudentModel');
    }

    /**
     * Convert percentage grade (0-100) to letter grade (1.00-5.00 scale)
     * 
     * @param float $percentage Grade percentage (0-100)
     * @return string Letter grade (1.00, 1.25, 1.50, ..., 5.00)
     */
    private function transmute($percentage)
    {
        if ($percentage >= 97) return "1.00";
        if ($percentage >= 94) return "1.25";
        if ($percentage >= 91) return "1.50";
        if ($percentage >= 88) return "1.75";
        if ($percentage >= 85) return "2.00";
        if ($percentage >= 82) return "2.25";
        if ($percentage >= 79) return "2.50";
        if ($percentage >= 76) return "2.75";
        if ($percentage >= 75) return "3.00";
        return "5.00";
    }

    /**
     * Get students for PDF generation selector
     * GET /api/reports/students?section_id=X&year_level=Y&status=active
     */
    public function api_get_students()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $filters = [
                'section_id' => isset($_GET['section_id']) ? intval($_GET['section_id']) : null,
                'year_level' => isset($_GET['year_level']) ? trim($_GET['year_level']) : null,
                'status' => isset($_GET['status']) ? trim($_GET['status']) : 'active'
            ];

            // remove null filters
            $filters = array_filter($filters, function($v) { return $v !== null; });

            $students = $this->StudentModel->get_all($filters);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'students' => $students
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error fetching students: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Debug endpoint: See raw grades from database for a student
     * GET /api/reports/debug/student/{student_id}/grades?academic_period_ids=21,20
     */
    public function api_debug_student_grades($student_id)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            // Parse period IDs
            $periodIds = [];
            if (isset($_GET['academic_period_ids'])) {
                $csvIds = trim($_GET['academic_period_ids']);
                $periodIds = array_map('intval', array_filter(explode(',', $csvIds)));
            }

            // Fetch ALL raw grades with all columns
            $query = $this->db->table('final_grades')
                ->select('final_grades.*, subjects.course_code, subjects.course_name, academic_periods.period_type, academic_periods.school_year, academic_periods.semester')
                ->join('subjects', 'subjects.id = final_grades.subject_id')
                ->join('academic_periods', 'academic_periods.id = final_grades.academic_period_id')
                ->where('final_grades.student_id', $student_id)
                ->order_by('academic_periods.id', 'ASC')
                ->order_by('subjects.course_code', 'ASC');

            // Apply period filter if provided
            if (!empty($periodIds)) {
                $query->in('final_grades.academic_period_id', $periodIds);
            }

            $allGrades = $query->get_all() ?? [];

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'student_id' => $student_id,
                'period_ids_requested' => $periodIds,
                'total_grades_found' => count($allGrades),
                'raw_grades' => $allGrades
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error fetching grades: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Generate individual student grade report PDF
     * GET /api/reports/student/{student_id}/pdf?academic_period_ids=ID1,ID2&academic_period_id=ID1&template=standard
     * Accepts both academic_period_ids (CSV) and academic_period_id (single, for backward compat)
     */
    public function api_generate_student_report($student_id)
    {
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            // Parse academic period IDs: prefer academic_period_ids (CSV), fall back to academic_period_id
            $periodIds = [];
            if (isset($_GET['academic_period_ids'])) {
                $csvIds = trim($_GET['academic_period_ids']);
                $periodIds = array_map('intval', array_filter(explode(',', $csvIds)));
            } elseif (isset($_GET['academic_period_id'])) {
                $periodIds = [intval($_GET['academic_period_id'])];
            }

            $template = isset($_GET['template']) ? trim($_GET['template']) : 'standard';

            // Get student data
            $student = $this->StudentModel->get_student($student_id);
            if (!$student) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }

            // Get academic period info (use first period for display)
            $period = [];
            if (!empty($periodIds)) {
                $period = $this->db->table('academic_periods')->where('id', $periodIds[0])->get() ?? [];
            }

            // Get student's final grades from all specified periods, merged by subject
            $grades = [];
            if (!empty($periodIds)) {
                $allGrades = $this->db->table('final_grades')
                    ->select('final_grades.*, subjects.course_code, subjects.course_name, subjects.credits, academic_periods.period_type')
                    ->join('subjects', 'subjects.id = final_grades.subject_id')
                    ->join('academic_periods', 'academic_periods.id = final_grades.academic_period_id')
                    ->where('final_grades.student_id', $student_id)
                    ->in('final_grades.academic_period_id', $periodIds)
                    ->order_by('subjects.course_code', 'ASC')
                    ->get_all() ?? [];

                // Merge grades by subject: group midterm and final, then average
                $gradesMap = [];
                foreach ($allGrades as $g) {
                    $subjCode = $g['course_code'];
                    if (!isset($gradesMap[$subjCode])) {
                        $gradesMap[$subjCode] = [
                            'course_code' => $g['course_code'],
                            'course_name' => $g['course_name'],
                            'credits' => $g['credits'],
                            'midterm_grade' => '-',
                            'final_grade' => '-',
                            'final_grade_num' => 0,
                            'remarks' => 'INC',
                            'midterm_num' => null,
                            'final_num' => null
                        ];
                    }

                    // Populate midterm/final based on period_type (use final_grade_num which is numeric 0-100)
                    if (stripos($g['period_type'], 'Midterm') !== false) {
                        $gradesMap[$subjCode]['midterm_grade'] = $g['final_grade'] ?? '-';
                        $gradesMap[$subjCode]['midterm_num'] = floatval($g['final_grade_num'] ?? 0);
                    } elseif (stripos($g['period_type'], 'Final') !== false) {
                        $gradesMap[$subjCode]['final_grade'] = $g['final_grade'] ?? '-';
                        $gradesMap[$subjCode]['final_num'] = floatval($g['final_grade_num'] ?? 0);
                    }
                }

                // Calculate averaged final grades (numeric 0-100 scale, then convert using transmute)
                foreach ($gradesMap as &$g) {
                    $midNum = $g['midterm_num'] ?? 0;
                    $finalNum = $g['final_num'] ?? 0;
                    
                    // Average the numeric grades (0-100 scale)
                    if ($midNum > 0 && $finalNum > 0) {
                        $averagedPercent = ($midNum + $finalNum) / 2;
                    } elseif ($midNum > 0) {
                        $averagedPercent = $midNum;
                    } elseif ($finalNum > 0) {
                        $averagedPercent = $finalNum;
                    } else {
                        $averagedPercent = 0;
                    }
                    
                    // Store averaged numeric grade and convert to letter grade using transmute
                    $g['final_grade_num'] = round($averagedPercent, 2);
                    $letterGrade = ($averagedPercent > 0) ? $this->transmute($averagedPercent) : '5.00';
                    $g['final_grade'] = $letterGrade; // Store the letter grade (1.00-5.00) for display
                    
                    // Determine remarks based on numeric grade (typically 75+ passes)
                    if ($averagedPercent >= 75) {
                        $g['remarks'] = 'PASSED';
                    } elseif ($averagedPercent > 0) {
                        $g['remarks'] = 'FAILED';
                    }
                }
                $grades = array_values($gradesMap);
            }

            // Generate PDF using helper
            $pdf = generate_student_pdf($student, $grades, $period, $template);

            // Output PDF as attachment
            $filename = 'Grade_Report_' . ($student['student_id'] ?? $student_id) . '_' . date('Y-m-d') . '.pdf';
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . strlen($pdf));
            echo $pdf;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error generating report: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Generate bulk PDF reports for selected students
     * POST /api/reports/bulk/pdf
     * Body: { "student_ids": [1,2,3], "academic_period_ids": [10, 11], "academic_period_id": 10, "template": "standard" }
     * Accepts both academic_period_ids (array) and academic_period_id (single, for backward compat)
     */
    public function api_generate_bulk_reports()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);
            $student_ids = $input['student_ids'] ?? [];
            
            // Parse period IDs: prefer academic_period_ids (array), fall back to academic_period_id
            $periodIds = [];
            if (!empty($input['academic_period_ids']) && is_array($input['academic_period_ids'])) {
                $periodIds = array_map('intval', $input['academic_period_ids']);
            } elseif (isset($input['academic_period_id'])) {
                $periodIds = [intval($input['academic_period_id'])];
            }

            $template = $input['template'] ?? 'standard';

            if (empty($student_ids) || !is_array($student_ids)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No students selected or invalid format']);
                return;
            }

            // Fetch all students with grades merged from multiple periods
            $students = [];
            $gradesMap = [];

            foreach ($student_ids as $sid) {
                $student = $this->StudentModel->get_student($sid);
                if (!$student) continue;

                $students[] = $student;

                // Fetch grades for this student from all specified periods
                $studentGrades = [];
                if (!empty($periodIds)) {
                    $allGrades = $this->db->table('final_grades')
                        ->select('final_grades.*, subjects.course_code, subjects.course_name, subjects.credits, academic_periods.period_type')
                        ->join('subjects', 'subjects.id = final_grades.subject_id')
                        ->join('academic_periods', 'academic_periods.id = final_grades.academic_period_id')
                        ->where('final_grades.student_id', $sid)
                        ->in('final_grades.academic_period_id', $periodIds)
                        ->order_by('subjects.course_code', 'ASC')
                        ->get_all() ?? [];

                    // Merge grades by subject: group midterm and final, then average
                    $gradesBySubj = [];
                    foreach ($allGrades as $g) {
                        $subjCode = $g['course_code'];
                        if (!isset($gradesBySubj[$subjCode])) {
                            $gradesBySubj[$subjCode] = [
                                'course_code' => $g['course_code'],
                                'course_name' => $g['course_name'],
                                'credits' => $g['credits'],
                                'midterm_grade' => '-',
                                'final_grade' => '-',
                                'final_grade_num' => 0,
                                'remarks' => 'INC',
                                'midterm_num' => null,
                                'final_num' => null
                            ];
                        }

                        // Populate midterm/final based on period_type (use final_grade_num which is numeric 0-100)
                        if (stripos($g['period_type'], 'Midterm') !== false) {
                            $gradesBySubj[$subjCode]['midterm_grade'] = $g['final_grade'] ?? '-';
                            $gradesBySubj[$subjCode]['midterm_num'] = floatval($g['final_grade_num'] ?? 0);
                        } elseif (stripos($g['period_type'], 'Final') !== false) {
                            $gradesBySubj[$subjCode]['final_grade'] = $g['final_grade'] ?? '-';
                            $gradesBySubj[$subjCode]['final_num'] = floatval($g['final_grade_num'] ?? 0);
                        }
                    }

                    // Calculate averaged final grades (numeric 0-100 scale, then convert using transmute)
                    foreach ($gradesBySubj as &$g) {
                        $midNum = $g['midterm_num'] ?? 0;
                        $finalNum = $g['final_num'] ?? 0;
                        
                        // Average the numeric grades (0-100 scale)
                        if ($midNum > 0 && $finalNum > 0) {
                            $averagedPercent = ($midNum + $finalNum) / 2;
                        } elseif ($midNum > 0) {
                            $averagedPercent = $midNum;
                        } elseif ($finalNum > 0) {
                            $averagedPercent = $finalNum;
                        } else {
                            $averagedPercent = 0;
                        }
                        
                        // Store averaged numeric grade and convert to letter grade using transmute
                        $g['final_grade_num'] = round($averagedPercent, 2);
                        $letterGrade = ($averagedPercent > 0) ? $this->transmute($averagedPercent) : '5.00';
                        $g['final_grade'] = $letterGrade; // Store the letter grade (1.00-5.00) for display
                        
                        // Determine remarks based on numeric grade (typically 75+ passes)
                        if ($averagedPercent >= 75) {
                            $g['remarks'] = 'PASSED';
                        } elseif ($averagedPercent > 0) {
                            $g['remarks'] = 'FAILED';
                        }
                    }
                    $studentGrades = array_values($gradesBySubj);
                }

                $gradesMap[$sid] = $studentGrades;
            }

            if (empty($students)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'No valid students found']);
                return;
            }

            // Fetch academic period info (use first period for display)
            $period = [];
            if (!empty($periodIds)) {
                $period = $this->db->table('academic_periods')->where('id', $periodIds[0])->get() ?? [];
            }

            // Generate ZIP archive of PDFs using helper
            $zipContent = generate_bulk_pdf_zip($students, $gradesMap, $period, $template);

            // Output ZIP as attachment
            $filename = 'Grade_Reports_' . date('Y-m-d_H-i-s') . '.zip';
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . strlen($zipContent));
            echo $zipContent;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error generating bulk reports: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Note: PDF generation is now delegated to the pdf_helper.php
     * See generate_student_pdf() and generate_bulk_pdf_zip() functions
     */
}
