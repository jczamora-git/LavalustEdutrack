<?php

/**
 * FinalGradesController - Manage final grades submission
 * Handles submission of final grades to the final_grades table
 */
class FinalGradesController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Submit final grades for a course/section/period
     * POST /api/final-grades/submit
     * 
     * Body: {
     *   "subject_id": 6,
     *   "section_id": 1,
     *   "academic_period_id": 10,
     *   "term": "Midterm",
     *   "grades": [
     *     {"student_id": 5, "final_grade_num": 87.5, "final_grade": "1.50"},
     *     ...
     *   ]
     * }
     */
    public function api_submit_grades()
    {
        api_set_json_headers();

        // Check authorization - must be logged in and be a teacher
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        $user_id = $this->session->userdata('user_id');
        $role = $this->session->userdata('role');

        if ($role !== 'teacher') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Only teachers can submit grades'
            ]);
            return;
        }

        try {
            $input = json_decode(file_get_contents('php://input'), true);

            if (!$input) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid input'
                ]);
                return;
            }

            $subject_id = $input['subject_id'] ?? null;
            $section_id = $input['section_id'] ?? null;
            $academic_period_id = $input['academic_period_id'] ?? null;
            $term = $input['term'] ?? null;
            $grades = $input['grades'] ?? [];

            // Validate required fields
            if (!$subject_id || !$section_id || !$academic_period_id || !$term || empty($grades)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields'
                ]);
                return;
            }

            // Resolve teacher record (teacher.id) from current session user_id
            $teacher = $this->TeacherModel->get_by_user_id($user_id);
            if (empty($teacher) || empty($teacher['id'])) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Teacher profile not found for current user'
                ]);
                return;
            }

            $teacher_id = $teacher['id'];

            // Verify teacher assignment for this subject/section using raw SQL
            // Note: academic_period_id is not part of teacher_subjects, only subject + section matters
            $stmt = $this->db->raw(
                "SELECT ts.* FROM teacher_subjects ts
                 JOIN teacher_subject_sections tss ON ts.id = tss.teacher_subject_id
                 WHERE ts.teacher_id = ? AND ts.subject_id = ? AND tss.section_id = ?",
                [$teacher_id, $subject_id, $section_id]
            );

            // LavaLust raw returns PDOStatement; fetch a row to check existence
            $assignment = null;
            if ($stmt) {
                try {
                    $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
                } catch (Exception $e) {
                    $assignment = null;
                }
            }

            if (empty($assignment)) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'You are not assigned to teach this subject/section'
                ]);
                return;
            }

            // Insert or update grades
            $inserted = 0;
            $updated = 0;
            $errors = [];

            foreach ($grades as $grade_data) {
                $student_id = $grade_data['student_id'] ?? null;
                $final_grade_num = $grade_data['final_grade_num'] ?? null;
                $final_grade = $grade_data['final_grade'] ?? null;

                if (!$student_id || !$final_grade) {
                    $errors[] = "Invalid grade data for student {$student_id}";
                    continue;
                }

                // Check if grade already exists
                $existing = $this->FinalGradesModel->grade_exists($student_id, $subject_id, $academic_period_id, $term);

                if ($existing) {
                    // Update existing grade
                    $update_data = [
                        'final_grade' => $final_grade,
                        'final_grade_num' => $final_grade_num,
                        'submitted_by' => $user_id,
                        'submitted_at' => date('Y-m-d H:i:s'),
                        'status' => 'submitted'
                    ];
                    
                    $update_result = $this->FinalGradesModel->update_by_combo(
                        $student_id,
                        $subject_id,
                        $academic_period_id,
                        $term,
                        $update_data
                    );
                    
                    if ($update_result) {
                        $updated++;
                    } else {
                        $errors[] = "Failed to update grade for student {$student_id}";
                    }
                } else {
                    // Insert new grade
                    $insert_data = [
                        'student_id' => $student_id,
                        'subject_id' => $subject_id,
                        'section_id' => $section_id,
                        'academic_period_id' => $academic_period_id,
                        'term' => $term,
                        'final_grade' => $final_grade,
                        'final_grade_num' => $final_grade_num,
                        'status' => 'submitted',
                        'submitted_by' => $user_id,
                        'submitted_at' => date('Y-m-d H:i:s')
                    ];
                    
                    $insert_result = $this->FinalGradesModel->create($insert_data);
                    
                    if ($insert_result) {
                        $inserted++;
                    } else {
                        $errors[] = "Failed to insert grade for student {$student_id}";
                    }
                }
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => "Grades submitted successfully ({$inserted} inserted, {$updated} updated)",
                'inserted' => $inserted,
                'updated' => $updated,
                'errors' => $errors
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get final grades for a student in a subject/period
     * GET /api/final-grades?student_id=5&subject_id=6&academic_period_id=10
     */
    public function api_get_final_grades()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            $filters = [];
            
            if (!empty($_GET['student_id'])) {
                $filters['student_id'] = $_GET['student_id'];
            }
            if (!empty($_GET['subject_id'])) {
                $filters['subject_id'] = $_GET['subject_id'];
            }
            if (!empty($_GET['academic_period_id'])) {
                $filters['academic_period_id'] = $_GET['academic_period_id'];
            }

            $result = $this->FinalGradesModel->get_grades($filters);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $result ?? [],
                'count' => is_array($result) ? count($result) : 0
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }
}
?>
