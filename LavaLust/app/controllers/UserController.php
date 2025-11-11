<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class UserController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->call->model('UserModel');
        $this->call->library('session');
    }

    public function register()
    {
        if ($this->io->method() === 'post') {
            $userData = [
                'email' => $this->io->post('email'),
                'password' => $this->io->post('password'),
                'first_name' => $this->io->post('first_name'),
                'last_name' => $this->io->post('last_name'),
                'phone' => $this->io->post('phone'),
                'role' => $this->io->post('role', 'student'),
                'status' => 'active'
            ];

            // Basic validation
            if (empty($userData['email']) || empty($userData['password']) || 
                empty($userData['first_name']) || empty($userData['last_name'])) {
                $this->session->set_flashdata('error', 'All required fields must be filled out');
                redirect('auth/register');
                return;
            }

            // Validate email format
            if (!filter_var($userData['email'], FILTER_VALIDATE_EMAIL)) {
                $this->session->set_flashdata('error', 'Invalid email format');
                redirect('auth/register');
                return;
            }

            // Check password length
            if (strlen($userData['password']) < 6) {
                $this->session->set_flashdata('error', 'Password must be at least 6 characters long');
                redirect('auth/register');
                return;
            }

            // Check if email exists
            if ($this->UserModel->email_exists($userData['email'])) {
                $this->session->set_flashdata('error', 'Email is already registered');
                redirect('auth/register');
                return;
            }

            // Create user
            $userId = $this->UserModel->create($userData);

            if ($userId) {
                $this->session->set_flashdata('success', 'Registration successful! Please login.');
                redirect('auth/login');
            } else {
                $this->session->set_flashdata('error', 'Registration failed. Please try again.');
                redirect('auth/register');
            }
        }

        // Load registration view
        $data = [
            'error' => $this->session->flashdata('error'),
            'success' => $this->session->flashdata('success')
        ];
        $this->call->view('auth/register', $data);
    }

    public function login()
    {
        if ($this->io->method() === 'post') {
            $email = $this->io->post('email');
            $password = $this->io->post('password');

            // Basic validation
            if (empty($email) || empty($password)) {
                $this->session->set_flashdata('error', 'Email and password are required');
                redirect('auth/login');
                return;
            }

            // Verify credentials
            $user = $this->UserModel->verify_credentials($email, $password);

            if ($user) {
                // Set session data
                $this->session->set_userdata([
                    'user_id' => $user['id'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'logged_in' => true
                ]);

                // Redirect based on role
                switch($user['role']) {
                    case 'admin':
                        redirect('admin/dashboard');
                        break;
                    case 'teacher':
                        redirect('teacher/dashboard');
                        break;
                    case 'student':
                        redirect('student/dashboard');
                        break;
                    default:
                        redirect('dashboard');
                }
            } else {
                $this->session->set_flashdata('error', 'Invalid email or password');
                redirect('auth/login');
            }
        }

        // Load login view
        $data = [
            'error' => $this->session->flashdata('error'),
            'success' => $this->session->flashdata('success')
        ];
        $this->call->view('auth/login', $data);
    }

    public function logout()
    {
        $this->session->sess_destroy();
        redirect('auth/login');
    }

    // API Methods for JSON endpoints
    public function api_register()
    {
         api_set_json_headers();
        
        try {
            // Get raw POST data and decode JSON
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            
            // Extract data
            $email = $json_data['email'] ?? '';
            $password = $json_data['password'] ?? '';
            $first_name = $json_data['first_name'] ?? '';
            $last_name = $json_data['last_name'] ?? '';
            $phone = $json_data['phone'] ?? '';
            $role = $json_data['role'] ?? 'student';
            
            // Validation
            if (empty($email) || empty($password) || empty($first_name) || empty($last_name)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email, password, first name, and last name are required'
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
            
            // Check password length
            if (strlen($password) < 6) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Password must be at least 6 characters long'
                ]);
                return;
            }
            
            // Check if email exists
            if ($this->UserModel->email_exists($email)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email already registered'
                ]);
                return;
            }
            
            // Prepare user data
            $userData = [
                'email' => $email,
                'password' => $password,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'phone' => $phone,
                'role' => $role,
                'status' => 'active'
            ];
            
            // Create user
            $userId = $this->UserModel->create($userData);
            
            if ($userId) {
                // Get user data (without password)
                $user = $this->UserModel->find_by_id($userId);
                unset($user['password']);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'User registered successfully',
                    'user' => $user
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create user'
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

    public function api_login()
    {
         api_set_json_headers();
        
        try {
            // Get raw POST data and decode JSON
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            
            // Use JSON data if available, otherwise fall back to $_POST
            $email = $json_data['email'] ?? $this->io->post('email');
            $password = $json_data['password'] ?? $this->io->post('password');
            
            // Validation
            if (empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email and password are required'
                ]);
                return;
            }
            
            // Verify credentials
            $user = $this->UserModel->verify_credentials($email, $password);
            
            if (!$user) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid email or password'
                ]);
                return;
            }
            
            // Update last login
            $this->UserModel->update_last_login($user['id']);
            
            // Set session data
            $this->session->set_userdata([
                'user_id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'logged_in' => true
            ]);
            
            // Return success response
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => $user
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function api_logout()
    {
         api_set_json_headers();
        
        try {
            // Destroy session
            $this->session->sess_destroy();
            
            echo json_encode([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    public function me()
    {
         api_set_json_headers();
        
        // Check if user is logged in
        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Not authenticated'
            ]);
            return;
        }
        
        // Get user data from database
        $userId = $this->session->userdata('user_id');
        $user = $this->UserModel->find_by_id($userId);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            return;
        }
        
        // Remove sensitive data
        unset($user['password']);
        
        echo json_encode([
            'success' => true,
            'user' => $user
        ]);
    }

    public function check()
    {
         api_set_json_headers();
        
        $isAuthenticated = $this->session->userdata('logged_in') === true;
        
        echo json_encode([
            'success' => true,
            'authenticated' => $isAuthenticated,
            'user' => $isAuthenticated ? [
                'id' => $this->session->userdata('user_id'),
                'email' => $this->session->userdata('email'),
                'role' => $this->session->userdata('role'),
                'first_name' => $this->session->userdata('first_name'),
                'last_name' => $this->session->userdata('last_name')
            ] : null
        ]);
    }

    // ===================================
    // USER MANAGEMENT API ENDPOINTS
    // ===================================
    
    /**
     * Get all users with optional filters
     * GET /api/users
     */
    public function api_get_users()
    {
         api_set_json_headers();
        
        // Debug: Log session data
        error_log("Session data: " . json_encode([
            'logged_in' => $this->session->userdata('logged_in'),
            'role' => $this->session->userdata('role'),
            'user_id' => $this->session->userdata('user_id'),
            'session_id' => session_id()
        ]));
        
        // Check if user is admin
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.',
                'debug' => [
                    'logged_in' => $this->session->userdata('logged_in'),
                    'role' => $this->session->userdata('role')
                ]
            ]);
            return;
        }
        
        try {
            // Get query parameters safely
            $filters = [];
            
            // Check if 'role' parameter exists
            if (isset($_GET['role']) && !empty($_GET['role'])) {
                $filters['role'] = $_GET['role'];
            } else {
                $filters['role'] = 'all';
            }
            
            // Check if 'status' parameter exists
            if (isset($_GET['status']) && !empty($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            // Check if 'search' parameter exists
            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }
            
            $users = $this->UserModel->get_all($filters);
            
            // Remove passwords from all users
            foreach ($users as &$user) {
                unset($user['password']);
            }
            
            echo json_encode([
                'success' => true,
                'users' => $users,
                'count' => count($users)
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
     * Get single user by ID
     * GET /api/users/{id}
     */
    public function api_get_user($id)
    {
         api_set_json_headers();
        
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
            $user = $this->UserModel->find_by_id($id);
            
            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                return;
            }
            
            unset($user['password']);
            
            echo json_encode([
                'success' => true,
                'user' => $user
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
     * Create new user
     * POST /api/users
     */
    public function api_create_user()
    {
        api_set_json_headers();        
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
            
            // Extract and validate data
            $email = $json_data['email'] ?? '';
            $first_name = $json_data['firstName'] ?? '';
            $last_name = $json_data['lastName'] ?? '';
            $role = $json_data['role'] ?? 'student';
            $phone = $json_data['phone'] ?? '';
            $password = $json_data['password'] ?? 'password123'; // Default password
            
            // Validation
            if (empty($email) || empty($first_name) || empty($last_name)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email, first name, and last name are required'
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
            
            // Validate role
            if (!in_array($role, ['admin', 'teacher', 'student'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid role'
                ]);
                return;
            }
            
            // Check if email exists
            if ($this->UserModel->email_exists($email)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email already exists'
                ]);
                return;
            }
            
            // Prepare user data
            $userData = [
                'email' => $email,
                'password' => $password,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'phone' => $phone,
                'role' => $role,
                'status' => 'active'
            ];
            
            // Create user
            $userId = $this->UserModel->create($userData);
            
            if ($userId) {
                // Get created user
                $user = $this->UserModel->find_by_id($userId);
                unset($user['password']);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'User created successfully',
                    'user' => $user
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create user'
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
     * Update existing user
     * PUT /api/users/{id}
     */
    public function api_update_user($id)
    {
         api_set_json_headers();
        
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
            // Check if user exists
            $existingUser = $this->UserModel->find_by_id($id);
            if (!$existingUser) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                return;
            }
            
            // Get raw POST data and decode JSON
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            
            // Extract data
            $email = $json_data['email'] ?? '';
            $first_name = $json_data['firstName'] ?? '';
            $last_name = $json_data['lastName'] ?? '';
            $role = $json_data['role'] ?? '';
            $status = $json_data['status'] ?? '';
            $phone = $json_data['phone'] ?? '';
            
            // Validation
            if (empty($email) || empty($first_name) || empty($last_name)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email, first name, and last name are required'
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
            
            // Check if email exists (excluding current user)
            if ($this->UserModel->email_exists($email, $id)) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email already exists'
                ]);
                return;
            }
            
            // Prepare update data
            $updateData = [
                'email' => $email,
                'first_name' => $first_name,
                'last_name' => $last_name,
                'phone' => $phone
            ];
            
            // Only update role if provided and valid
            if (!empty($role) && in_array($role, ['admin', 'teacher', 'student'])) {
                $updateData['role'] = $role;
            }
            
            // Only update status if provided and valid
            if (!empty($status) && in_array($status, ['active', 'inactive'])) {
                $updateData['status'] = $status;
            }
            
            // Update user
            $result = $this->UserModel->update_user($id, $updateData);
            
            if ($result) {
                // Get updated user
                $user = $this->UserModel->find_by_id($id);
                unset($user['password']);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'User updated successfully',
                    'user' => $user
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update user'
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
     * Delete user (soft delete - set status to inactive)
     * DELETE /api/users/{id}
     */
    public function api_delete_user($id)
    {
         api_set_json_headers();
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
            // Check if user exists
            $user = $this->UserModel->find_by_id($id);
            if (!$user) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                return;
            }
            
            // Prevent admin from deleting themselves
            if ($id == $this->session->userdata('user_id')) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot delete your own account'
                ]);
                return;
            }
            
            // Soft delete (set status to inactive)
            $result = $this->UserModel->delete_user($id);
            
            if ($result) {
                echo json_encode([
                    'success' => true,
                    'message' => 'User deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete user'
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
}
