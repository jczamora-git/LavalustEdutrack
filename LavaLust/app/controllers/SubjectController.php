<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SubjectController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->call->model('SubjectModel');
        $this->call->library('session');
    }

    private function set_json_headers()
    {
        $allowed_origins = [
            'http://localhost:5174',
            'http://localhost:3000',
            'http://localhost:5173'
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
        }

        header('Content-Type: application/json');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Allow-Credentials: true');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
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
        $this->set_json_headers();

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
        $this->set_json_headers();

        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access denied. Admin only.']);
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
        $this->set_json_headers();

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
            $description = $data['description'] ?? null;
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
                'description' => $description,
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
        $this->set_json_headers();

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
            $description = $data['description'] ?? $existing['description'];
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
                'description' => $description,
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
        $this->set_json_headers();

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
}
