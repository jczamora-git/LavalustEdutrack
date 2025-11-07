<?php

/**
 * StudentController - Manage student profiles
 * Handles CRUD operations for student records linked to users
 */
class StudentController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        // Use the framework invoker API (same pattern as other controllers)
        // to initialize database, models and libraries so the dynamic
        // properties (e.g., $this->db, $this->session, $this->StudentModel)
        // are properly registered on the controller instance.
        $this->call->database();
        $this->call->model('StudentModel');
        $this->call->model('UserModel');
        $this->call->library('session');
    }

    /**
     * Set JSON response headers
     */
    private function set_json_headers()
    {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
    }

    /**
     * Get last student ID for a given year (for ID generation)
     * GET /api/students/last-id?year=2025
     */
    public function api_get_last_id()
    {
        $this->set_json_headers();
        
        try {
            $year = $_GET['year'] ?? date('Y');
            
            // Use StudentModel helper to fetch last student ID
            $lastId = $this->StudentModel->get_last_student_id($year);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'last_id' => $lastId,
                'year' => $year
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
     * Get all students
     * GET /api/students
     */
    public function api_get_students()
    {
        $this->set_json_headers();

        // Check authorization
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        try {
            // Delegate query construction to the model (keeps controller thin)
            $filters = [];
            if (!empty($_GET['year_level'])) {
                $filters['year_level'] = $_GET['year_level'];
            }
            if (!empty($_GET['section_id'])) {
                $filters['section_id'] = $_GET['section_id'];
            }
            if (!empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            if (!empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            $students = $this->StudentModel->get_all($filters);

            echo json_encode([
                'success' => true,
                'data' => $students,
                'count' => is_array($students) ? count($students) : 0
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
     * Get single student by ID
     * GET /api/students/{id}
     */
    public function api_get_student($id = null)
    {
        $this->set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Student ID is required'
            ]);
            return;
        }

        try {
            $student = $this->StudentModel->get_student($id);

            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Student not found'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'data' => $student
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
     * Get student by user ID
     * GET /api/students/by-user/{user_id}
     */
    public function api_get_by_user_id($user_id = null)
    {
        $this->set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized'
            ]);
            return;
        }

        if (!$user_id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'User ID is required'
            ]);
            return;
        }

        try {
            $student = $this->StudentModel->get_by_user_id($user_id);

            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Student profile not found for this user'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'data' => $student
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
     * Create student profile (simple - only user_id, student_id, year_level, status)
     * POST /api/students
     */
    public function api_create_student()
    {
        $this->set_json_headers();
        
        // Check if user is admin
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            // Get raw POST data and decode JSON
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            
            $user_id = $json_data['user_id'] ?? null;
            $student_id = $json_data['student_id'] ?? '';
            $year_level = $json_data['year_level'] ?? '1st Year';
            $status = $json_data['status'] ?? 'active';

            // If student_id not provided, generate one using model helper
            if (empty($student_id)) {
                $student_id = $this->StudentModel->generate_student_id(date('Y'));
            } else {
                // Check if student_id already exists
                if ($this->StudentModel->student_id_exists($student_id)) {
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Student ID already exists'
                    ]);
                    return;
                }
            }

            // Insert student profile
            $studentData = [
                'user_id' => $user_id,
                'student_id' => $student_id,
                'year_level' => $year_level,
                'status' => $status,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $result = $this->db->table('students')->insert($studentData);

            if ($result) {
                // Fetch the created record to return
                $created = $this->db->table('students')->where('student_id', $student_id)->get();

                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Student profile created successfully',
                    'student' => $created
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create student profile'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Update student profile
     * PUT /api/students/{id}
     */
    public function api_update_student($id = null)
    {
        $this->set_json_headers();

        // Check if user is admin or teacher
        if (!$this->session->userdata('logged_in') || !in_array($this->session->userdata('role'), ['admin', 'teacher'])) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied'
            ]);
            return;
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Student ID is required'
            ]);
            return;
        }

        try {
            // Get raw POST data
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);

            // Check if student exists
            $student = $this->StudentModel->get_student($id);
            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Student not found'
                ]);
                return;
            }

            // Prepare update data
            $updateData = [];

            if (isset($json_data['studentId'])) {
                // Check if new student_id is already in use
                if ($json_data['studentId'] !== $student['student_id']) {
                    if ($this->StudentModel->student_id_exists($json_data['studentId'])) {
                        http_response_code(409);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Student ID already in use'
                        ]);
                        return;
                    }
                }
                $updateData['student_id'] = $json_data['studentId'];
            }

            if (isset($json_data['yearLevel'])) {
                $updateData['year_level'] = $json_data['yearLevel'];
            }

            if (isset($json_data['sectionId'])) {
                $updateData['section_id'] = $json_data['sectionId'];
            }

            if (isset($json_data['status'])) {
                $updateData['status'] = $json_data['status'];
            }

            if (empty($updateData)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'No data to update'
                ]);
                return;
            }

            // Update student
            $success = $this->StudentModel->update($id, $updateData);

            if ($success) {
                $updatedStudent = $this->StudentModel->get_student($id);

                echo json_encode([
                    'success' => true,
                    'message' => 'Student updated successfully',
                    'data' => $updatedStudent
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update student'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Delete student (admin only)
     * DELETE /api/students/{id}
     */
    public function api_delete_student($id = null)
    {
        $this->set_json_headers();

        // Check if user is admin
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        if (!$id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Student ID is required'
            ]);
            return;
        }

        try {
            // Check if student exists
            $student = $this->StudentModel->get_student($id);
            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Student not found'
                ]);
                return;
            }

            // Delete student profile and associated user
            $success = $this->StudentModel->delete($id);

            if ($success) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Student profile deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete student'
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get student statistics
     * GET /api/students/stats
     */
    public function api_get_stats()
    {
        $this->set_json_headers();

        // Check authorization
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            $stats = $this->StudentModel->get_stats();

            echo json_encode([
                'success' => true,
                'data' => $stats
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
