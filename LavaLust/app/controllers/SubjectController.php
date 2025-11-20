<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SubjectController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    
    private function is_admin()
    {
        return $this->session->userdata('logged_in') === true && 
               $this->session->userdata('role') === 'admin';
    }

    /**
     * GET /api/subjects
     */
    public function api_get_subjects()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $filters = [];
            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (!empty($_GET['category'])) {
                $filters['category'] = $_GET['category'];
            }
            if (!empty($_GET['year_level'])) {
                $filters['year_level'] = $_GET['year_level'];
            }
            if (!empty($_GET['semester'])) {
                $filters['semester'] = $_GET['semester'];
            }
            if (!empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            $subjects = $this->SubjectModel->get_all($filters);

            // If semester was provided and there are no results, try falling back
            // to year-only filtering (some data may have inconsistent semester labels)
            if ((empty($subjects) || count($subjects) === 0) && !empty($filters['semester']) && !empty($filters['year_level'])) {
                // remove semester filter and re-query
                $fallbackFilters = $filters;
                unset($fallbackFilters['semester']);
                $subjects = $this->SubjectModel->get_all($fallbackFilters);
            }

            echo json_encode(['success' => true, 'subjects' => $subjects, 'count' => count($subjects)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/subjects/{id}
     */
    public function api_get_subject($id)
    {
         api_set_json_headers();

        // Allow any authenticated user to fetch a single subject (students need this)
        if ($this->session->userdata('logged_in') !== true) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Login required.']);
            return;
        }

        try {
            $subject = $this->SubjectModel->find_by_id($id);
            if (!$subject) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Subject not found']);
                return;
            }

            echo json_encode(['success' => true, 'subject' => $subject]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * POST /api/subjects
     */
    public function api_create_subject()
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $course_code = trim($data['course_code'] ?? '');
            $course_name = trim($data['course_name'] ?? '');
            // description field removed from subjects table
            $credits = isset($data['credits']) ? (int)$data['credits'] : 3;
            $category = $data['category'] ?? 'Major';
            $year_level = $data['year_level'] ?? '1st Year';
            $semester = $data['semester'] ?? '1st Semester';
            $status = $data['status'] ?? 'active';

            if (empty($course_code) || empty($course_name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'course_code and course_name are required']);
                return;
            }

            if ($this->SubjectModel->course_code_exists($course_code)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Course code already exists']);
                return;
            }

            $subjectId = $this->SubjectModel->create([
                'course_code' => $course_code,
                'course_name' => $course_name,
                'credits' => $credits,
                'category' => $category,
                'year_level' => $year_level,
                'semester' => $semester,
                'status' => $status
            ]);

            if (!$subjectId) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create subject']);
                return;
            }

            $subject = $this->SubjectModel->find_by_id($subjectId);

            http_response_code(201);
            echo json_encode(['success' => true, 'message' => 'Subject created', 'subject' => $subject]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * PUT /api/subjects/{id}
     */
    public function api_update_subject($id)
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $existing = $this->SubjectModel->find_by_id($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Subject not found']);
                return;
            }

            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true) ?? [];

            $course_code = isset($data['course_code']) ? trim($data['course_code']) : $existing['course_code'];
            $course_name = isset($data['course_name']) ? trim($data['course_name']) : $existing['course_name'];
            // description removed from subjects table; do not attempt to read or write it
            $credits = isset($data['credits']) ? (int)$data['credits'] : $existing['credits'];
            $category = $data['category'] ?? $existing['category'];
            $year_level = $data['year_level'] ?? $existing['year_level'];
            $semester = $data['semester'] ?? $existing['semester'];
            $status = $data['status'] ?? $existing['status'];

            if (empty($course_code) || empty($course_name)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'course_code and course_name are required']);
                return;
            }

            if ($course_code !== $existing['course_code'] && $this->SubjectModel->course_code_exists($course_code, $id)) {
                http_response_code(409);
                echo json_encode(['success' => false, 'message' => 'Course code already exists']);
                return;
            }

            $updated = $this->SubjectModel->update_subject($id, [
                'course_code' => $course_code,
                'course_name' => $course_name,
                'credits' => $credits,
                'category' => $category,
                'year_level' => $year_level,
                'semester' => $semester,
                'status' => $status
            ]);

            if (!$updated) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update subject']);
                return;
            }

            $subject = $this->SubjectModel->find_by_id($id);
            echo json_encode(['success' => true, 'message' => 'Subject updated', 'subject' => $subject]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * DELETE /api/subjects/{id}
     */
    public function api_delete_subject($id)
    {
         api_set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
            return;
        }

        try {
            $existing = $this->SubjectModel->find_by_id($id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Subject not found']);
                return;
            }

            $deleted = $this->SubjectModel->delete_subject($id);

            if ($deleted) {
                echo json_encode(['success' => true, 'message' => 'Subject deleted']);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to delete subject']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/subjects/for-student
     * Student-accessible endpoint: returns subjects filtered by year_level and semester
     * Expects query params: year_level (numeric), semester (e.g. '1st' or '1')
     */
    public function api_get_for_student()
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Not authenticated']);
            return;
        }

        try {
            $filters = [];

            // Normalize year_level: accept numeric (1, '1') or strings like '1st', '1st Year'
            if (!empty($_GET['year_level'])) {
                $rawYear = trim((string)$_GET['year_level']);
                $yearNum = null;
                if (is_numeric($rawYear)) {
                    $yearNum = (int)$rawYear;
                } else {
                    // try to extract a number from strings like '1st', '1st Year'
                    if (preg_match('/(\d+)/', $rawYear, $m)) {
                        $yearNum = (int)$m[1];
                    }
                }

                if ($yearNum !== null && $yearNum >= 1 && $yearNum <= 4) {
                    // Convert to DB representation (e.g., '1st Year')
                    $suffix = 'th';
                    if ($yearNum % 10 === 1 && $yearNum % 100 !== 11) $suffix = 'st';
                    elseif ($yearNum % 10 === 2 && $yearNum % 100 !== 12) $suffix = 'nd';
                    elseif ($yearNum % 10 === 3 && $yearNum % 100 !== 13) $suffix = 'rd';
                    $filters['year_level'] = $yearNum . $suffix . ' Year';
                } else {
                    // pass-through (maybe already '1st Year')
                    $filters['year_level'] = $rawYear;
                }
            }

            // Normalize semester: accept '1', '1st', '1st Semester', '2', '2nd', '2nd Semester', 'summer'
            if (!empty($_GET['semester'])) {
                $rawSem = trim((string)$_GET['semester']);
                $low = strtolower($rawSem);
                $semNormalized = null;

                if (preg_match('/^\s*1(st)?/i', $rawSem) || $low === '1') {
                    $semNormalized = '1st Semester';
                } elseif (preg_match('/^\s*2(nd)?/i', $rawSem) || $low === '2') {
                    $semNormalized = '2nd Semester';
                } elseif (strpos($low, 'summer') !== false) {
                    $semNormalized = 'Summer';
                } elseif (stripos($rawSem, 'first') !== false) {
                    $semNormalized = '1st Semester';
                } elseif (stripos($rawSem, 'second') !== false) {
                    $semNormalized = '2nd Semester';
                }

                $filters['semester'] = $semNormalized ?? $rawSem;
            }

            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (!empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            // First attempt using provided filters
            $subjects = $this->SubjectModel->get_all($filters);

            // If semester was provided and there are no results, try falling back
            // to year-only filtering (some data may have inconsistent semester labels)
            if ((empty($subjects) || count($subjects) === 0) && !empty($filters['semester']) && !empty($filters['year_level'])) {
                $fallback = $filters;
                unset($fallback['semester']);
                $subjects = $this->SubjectModel->get_all($fallback);
            }

            echo json_encode(['success' => true, 'subjects' => $subjects, 'count' => count($subjects)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }
}
