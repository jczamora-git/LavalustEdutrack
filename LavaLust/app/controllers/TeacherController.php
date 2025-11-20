<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class TeacherController extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }
    /**
     * Check if user is admin
     * @return bool
     */
    private function is_admin()
    {
        return $this->session->userdata('logged_in') === true && 
               $this->session->userdata('role') === 'admin';
    }

    /**
     * Get last employee ID for a given year (for ID generation)
     * GET /api/teachers/last-id?year=2025
     */
    public function api_get_last_id()
    {
         api_set_json_headers();
        
        try {
            $year = $_GET['year'] ?? date('Y');
            
            // Use the TeacherModel to fetch the last employee_id for the year
            $lastId = $this->TeacherModel->get_last_employee_id($year);

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
     * Get all teachers with optional filters
     * GET /api/teachers
     */
    public function api_get_teachers()
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            // Get query parameters safely
            $filters = [];
            
            if (isset($_GET['status']) && !empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }
            
            $teachers = $this->TeacherModel->get_all($filters);
            
            echo json_encode([
                'success' => true,
                'teachers' => $teachers,
                'count' => count($teachers)
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
     * Get single teacher by ID
     * GET /api/teachers/{id}
     */
    public function api_get_teacher($id)
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            $teacher = $this->TeacherModel->find_by_id($id);
            
            if (!$teacher) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Teacher not found'
                ]);
                return;
            }
            
            // Get assigned courses
            $courses = $this->TeacherModel->get_assigned_courses($id);
            $teacher['assigned_courses'] = $courses;
            
            echo json_encode([
                'success' => true,
                'teacher' => $teacher
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
     * GET /api/teachers/{id}/public
     * Student-accessible: returns basic teacher profile for public/student views
     */
    public function api_get_public_teacher($id)
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
            $teacher = $this->TeacherModel->find_by_id($id);

            if (!$teacher) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Teacher not found'
                ]);
                return;
            }

            // Minimal public profile
            $public = [
                'id' => $teacher['id'] ?? null,
                'first_name' => $teacher['first_name'] ?? null,
                'last_name' => $teacher['last_name'] ?? null,
                'email' => $teacher['email'] ?? null,
                'phone' => $teacher['phone'] ?? null,
                'employee_id' => $teacher['employee_id'] ?? null,
            ];

            // Optionally include assigned courses for context (teacher_subjects)
            $public['assigned_courses'] = $this->TeacherModel->get_assigned_courses($teacher['id']);

            echo json_encode([
                'success' => true,
                'teacher' => $public
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
     * Create new teacher
     * POST /api/teachers
     * 
     * Supports two modes:
     * 1. Simple profile creation (from React frontend): {user_id, employee_id}
     * 2. Full teacher creation: {firstName, lastName, email, employeeId, phone, assignedCourses}
     */
    public function api_create_teacher()
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
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
            
            // Check if this is simple profile creation (from React frontend)
            $user_id = $json_data['user_id'] ?? null;
            $employee_id = $json_data['employee_id'] ?? '';
            
            if ($user_id && $employee_id && !isset($json_data['firstName'])) {
                // Simple profile creation mode
                return $this->create_teacher_profile($user_id, $employee_id);
            }
            
            // Full teacher creation mode
            $first_name = $json_data['firstName'] ?? '';
            $last_name = $json_data['lastName'] ?? '';
            $email = $json_data['email'] ?? '';
            $employee_id = $json_data['employeeId'] ?? '';
            $phone = $json_data['phone'] ?? '';
            $assigned_courses = $json_data['assignedCourses'] ?? [];
            
            // Validation
            if (empty($first_name) || empty($last_name) || empty($email) || empty($employee_id)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'First name, last name, email, and employee ID are required'
                ]);
                return;
            }
            
            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid email format'
                ]);
                return;
            }
            
            // Check if email exists
            if ($this->TeacherModel->email_exists($email)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email already exists'
                ]);
                return;
            }
            
            // Check if employee ID exists
            if ($this->TeacherModel->employee_id_exists($employee_id)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Employee ID already exists'
                ]);
                return;
            }
            
            // Prepare teacher data
            $teacherData = [
                'first_name' => $first_name,
                'last_name' => $last_name,
                'email' => $email,
                'employee_id' => $employee_id,
                'phone' => $phone,
                'status' => 'active'
            ];
            
            // Create teacher
            $teacherId = $this->TeacherModel->create($teacherData);
            
            if (!$teacherId) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create teacher'
                ]);
                return;
            }
            
            // Assign courses if provided
            if (!empty($assigned_courses) && is_array($assigned_courses)) {
                foreach ($assigned_courses as $course) {
                    $course_code = $course['course'] ?? '';
                    $sections = $course['sections'] ?? [];
                    
                    if (!empty($course_code)) {
                        $sections_str = implode(',', $sections);
                        $this->TeacherModel->assign_course($teacherId, $course_code, $sections_str);
                    }
                }
            }
            
            // Get created teacher with courses
            $teacher = $this->TeacherModel->find_by_id($teacherId);
            $teacher['assigned_courses'] = $this->TeacherModel->get_assigned_courses($teacherId);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Teacher created successfully',
                'teacher' => $teacher
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
     * Create teacher profile (simple - only user_id and employee_id)
     * Called from api_create_teacher when receiving {user_id, employee_id}
     */
    private function create_teacher_profile($user_id, $employee_id)
    {
        try {
            // Validate inputs
            if (empty($user_id) || empty($employee_id)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'user_id and employee_id are required'
                ]);
                return;
            }

            // Check if employee ID already exists
            if ($this->TeacherModel->employee_id_exists($employee_id)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Employee ID already exists'
                ]);
                return;
            }

            // Insert teacher profile
            $teacherData = [
                'user_id' => $user_id,
                'employee_id' => $employee_id,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $result = $this->db->table('teachers')->insert($teacherData);

            if ($result) {
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Teacher profile created successfully',
                    'user_id' => $user_id,
                    'employee_id' => $employee_id
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create teacher profile'
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
     * Update existing teacher
     * PUT /api/teachers/{id}
     */
    public function api_update_teacher($id)
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            // Check if teacher exists
            $existingTeacher = $this->TeacherModel->find_by_id($id);
            if (!$existingTeacher) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Teacher not found'
                ]);
                return;
            }
            
            // Get raw PUT data and decode JSON
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            
            // Extract data
            $first_name = $json_data['firstName'] ?? '';
            $last_name = $json_data['lastName'] ?? '';
            $email = $json_data['email'] ?? '';
            $employee_id = $json_data['employeeId'] ?? '';
            $phone = $json_data['phone'] ?? '';
            $status = $json_data['status'] ?? '';
            $assigned_courses = $json_data['assignedCourses'] ?? [];
            
            // Validation
            if (empty($first_name) || empty($last_name) || empty($email) || empty($employee_id)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'First name, last name, email, and employee ID are required'
                ]);
                return;
            }
            
            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid email format'
                ]);
                return;
            }
            
            // Check if email exists (excluding current teacher)
            if ($email !== $existingTeacher['email'] && $this->TeacherModel->email_exists($email, $id)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email already exists'
                ]);
                return;
            }
            
            // Check if employee ID exists (excluding current teacher)
            if ($employee_id !== $existingTeacher['employee_id'] && $this->TeacherModel->employee_id_exists($employee_id, $id)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Employee ID already exists'
                ]);
                return;
            }
            
            // Prepare update data
            $updateData = [
                'first_name' => $first_name,
                'last_name' => $last_name,
                'email' => $email,
                'employee_id' => $employee_id,
                'phone' => $phone
            ];
            
            // Only update status if provided and valid
            if (!empty($status) && in_array($status, ['active', 'inactive'])) {
                $updateData['status'] = $status;
            }
            
            // Update teacher
            $result = $this->TeacherModel->update_teacher($id, $updateData);
            
            if (!$result) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update teacher'
                ]);
                return;
            }
            
            // Update course assignments if provided
            if (!empty($assigned_courses) && is_array($assigned_courses)) {
                // Get current assignments
                $currentCourses = $this->TeacherModel->get_assigned_courses($id);
                $currentCourseCodes = array_column($currentCourses, 'course_code');
                
                // New course codes from request
                $newCourseCodes = [];
                foreach ($assigned_courses as $course) {
                    $newCourseCodes[] = $course['course'] ?? '';
                }
                $newCourseCodes = array_filter($newCourseCodes);
                
                // Remove courses that are no longer assigned
                foreach ($currentCourseCodes as $oldCode) {
                    if (!in_array($oldCode, $newCourseCodes)) {
                        $this->TeacherModel->remove_course_assignment($id, $oldCode);
                    }
                }
                
                // Add or update courses
                foreach ($assigned_courses as $course) {
                    $course_code = $course['course'] ?? '';
                    $sections = $course['sections'] ?? [];
                    
                    if (!empty($course_code)) {
                        $sections_str = implode(',', $sections);
                        $this->TeacherModel->assign_course($id, $course_code, $sections_str);
                    }
                }
            }
            
            // Get updated teacher
            $teacher = $this->TeacherModel->find_by_id($id);
            $teacher['assigned_courses'] = $this->TeacherModel->get_assigned_courses($id);
            
            echo json_encode([
                'success' => true,
                'message' => 'Teacher updated successfully',
                'teacher' => $teacher
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
     * Delete teacher (soft delete - set status to inactive)
     * DELETE /api/teachers/{id}
     */
    public function api_delete_teacher($id)
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            // Check if teacher exists
            $teacher = $this->TeacherModel->find_by_id($id);
            if (!$teacher) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Teacher not found'
                ]);
                return;
            }
            
            // Soft delete (set status to inactive)
            $result = $this->TeacherModel->delete_teacher($id);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Teacher deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete teacher'
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
     * Get teacher statistics
     * GET /api/teachers/stats
     */
    public function api_teacher_stats()
    {
         api_set_json_headers();
        
        // Check if user is admin
        if (!$this->is_admin()) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }
        
        try {
            $counts = $this->TeacherModel->get_teacher_counts();
            
            echo json_encode([
                'success' => true,
                'stats' => $counts
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
