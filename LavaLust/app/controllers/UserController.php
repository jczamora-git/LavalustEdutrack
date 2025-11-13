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
                // If role is student, create student profile with auto-generated ID
                if ($role === 'student') {
                    $this->call->model('StudentModel');
                    
                    // Generate student ID using current year
                    $currentYear = date('Y');
                    $studentId = $this->StudentModel->generate_student_id($currentYear);
                    
                    // Create student record
                    $studentData = [
                        'user_id' => $userId,
                        'student_id' => $studentId,
                        'year_level' => 1, // Default to first year
                        'section_id' => null,
                        'status' => 'active',
                        'created_at' => date('Y-m-d H:i:s'),
                        'updated_at' => date('Y-m-d H:i:s')
                    ];
                    
                    $studentCreated = $this->db->table('students')->insert($studentData);
                    
                    if (!$studentCreated) {
                        // Log the error but don't fail the registration
                        error_log('Failed to create student profile for user ID: ' . $userId);
                    }
                }
                
                // Send welcome email
                $this->call->helper('mail');
                $this->call->helper('email_templates');
                
                $welcomeSubject = 'Welcome to Mindoro State University Portal - EduTrack PH';
                $portalUrl = 'http://localhost:5174/auth';
                $logoUrl = 'http://localhost:5174/logo.png';
                $welcomeBody = generate_welcome_email($first_name, $email, $role, $portalUrl, $logoUrl);
                
                $emailResult = sendNotif($email, $welcomeSubject, $welcomeBody);
                
                if (!$emailResult['success']) {
                    // Log email failure but don't fail the registration
                    error_log('Failed to send welcome email to: ' . $email . ' - ' . $emailResult['message']);
                }
                
                // Get user data (without password)
                $user = $this->UserModel->find_by_id($userId);
                unset($user['password']);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'User registered successfully',
                    'user' => $user,
                    'email_result' => $emailResult // include email send result for frontend
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

    /**
     * Request a password reset link to be sent to the user's email
     * POST /api/auth/request-reset
     */
    public function api_request_password_reset()
    {
        api_set_json_headers();

        try {
            $raw_input = file_get_contents('php://input');
            $json_data = json_decode($raw_input, true);
            $email = trim($json_data['email'] ?? '');

            if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Please provide a valid email address.'
                ]);
                return;
            }

            // Always respond with success message to avoid email enumeration
            $genericResponse = [
                'success' => true,
                'message' => 'If that email exists in our system, a password reset link has been sent.'
            ];

            // Find user by email
            $user = $this->UserModel->find_by_email($email);
            if (!$user) {
                echo json_encode($genericResponse);
                return;
            }

            // Generate secure token and expiry (24 hours)
            $token = bin2hex(random_bytes(16));
            $expiresAt = date('Y-m-d H:i:s', time() + 86400);

            // Store token in password_resets table
            try {
                $this->db->table('password_resets')->insert([
                    'email' => $email,
                    'token' => $token,
                    'expires_at' => $expiresAt,
                    'used' => 0,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            } catch (Exception $e) {
                // Log and continue — insertion failure shouldn't stop email send attempt
                error_log('Failed to insert password reset token: ' . $e->getMessage());
            }

            // Prepare email
            $this->call->helper('mail');
            $this->call->helper('email_templates');

            $resetUrl = sprintf('http://localhost:5174/auth/reset?token=%s', $token);
            $logoUrl = 'http://localhost:5174/logo.png';
            $subject = 'EduTrack Password Reset Request';
            $body = generate_password_reset_email($user['first_name'] ?? $user['email'], $resetUrl, $logoUrl);

            $emailResult = sendNotif($email, $subject, $body);

            if (!$emailResult['success']) {
                // Log but don't reveal details to client
                error_log('Password reset email failed: ' . $emailResult['message']);
            }

            echo json_encode($genericResponse);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Render a simple password reset page (GET) or handle form POST
     * URL: /auth/reset?token=...
     */
    public function reset()
    {
        // If POST, process the form submission server-side (non-API)
        if ($this->io->method() === 'post') {
            $token = $this->io->post('token');
            $newPassword = $this->io->post('password');

            // Simple validation
            if (empty($token) || empty($newPassword) || strlen($newPassword) < 6) {
                $this->session->set_flashdata('error', 'Invalid token or password. Password must be at least 6 characters.');
                redirect('auth/reset?token=' . urlencode($token));
                return;
            }

            // Delegate to API handler logic by calling api_reset_password via internal call
            $_POST = ['token' => $token, 'password' => $newPassword];
            $this->api_reset_password();
            return;
        }

        // For GET, display the form view and pass token
        $token = $this->io->get('token');
        $data = ['token' => $token, 'error' => $this->session->flashdata('error'), 'success' => $this->session->flashdata('success')];
        $this->call->view('auth/reset_password', $data);
    }

    /**
     * API: reset password using token
     * POST /api/auth/reset-password
     * Body JSON: { token, password }
     */
    public function api_reset_password()
    {
        api_set_json_headers();

        try {
            // Read raw input once and decode
            $raw_input = file_get_contents('php://input');
            error_log('Reset password raw input: ' . $raw_input);
            
            $json_data = json_decode($raw_input, true);
            error_log('Decoded JSON data: ' . json_encode($json_data));

            // Extract token and password from JSON (prefer JSON over POST for API calls)
            $token = isset($json_data['token']) ? trim($json_data['token']) : '';
            $newPassword = isset($json_data['password']) ? $json_data['password'] : '';

            error_log('Token: ' . $token . ', Password length: ' . strlen($newPassword));

            if (empty($token) || empty($newPassword) || strlen($newPassword) < 6) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid token or password (min 6 chars).']);
                return;
            }

            // Find token record
            error_log('Looking for token in password_resets table: ' . $token);
            $reset = $this->db->table('password_resets')->where('token', $token)->get();
            
            if (!$reset) {
                error_log('Token not found in database');
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid or expired token.']);
                return;
            }

            error_log('Token found: ' . json_encode($reset));

            // Check expiry and usage
            if ((int)$reset['used'] === 1) {
                error_log('Token already used');
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Token has already been used.']);
                return;
            }

            $expiresAt = strtotime($reset['expires_at']);
            if ($expiresAt === false || $expiresAt < time()) {
                error_log('Token expired. Expires at: ' . $reset['expires_at'] . ', Current time: ' . date('Y-m-d H:i:s'));
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Token has expired.']);
                return;
            }

            $email = $reset['email'];
            error_log('Finding user by email: ' . $email);
            $user = $this->UserModel->find_by_email($email);
            
            if (!$user) {
                error_log('User not found with email: ' . $email);
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'User not found.']);
                return;
            }

            error_log('User found: ' . $user['id']);

            // Update password (update_user will hash it)
            error_log('Updating password for user ID: ' . $user['id']);
            
            $updated = $this->UserModel->update_user($user['id'], ['password' => $newPassword]);

            if (!$updated) {
                error_log('Failed to update password for user ID: ' . $user['id']);
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
                return;
            }

            error_log('Password updated successfully for user ID: ' . $user['id']);

            // Mark token as used
            $tokenUpdate = $this->db->table('password_resets')->where('id', $reset['id'])->update([
                'used' => 1,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            error_log('Token marked as used: ' . ($tokenUpdate ? 'success' : 'failed'));

            echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
        } catch (Exception $e) {
            error_log('Exception in api_reset_password: ' . $e->getMessage() . ' | ' . $e->getTraceAsString());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Send welcome email to newly created user
     * POST /api/auth/send-welcome-email
     */
    public function api_send_welcome_email()
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

            // Extract data
            $email = $json_data['email'] ?? '';
            $firstName = $json_data['firstName'] ?? '';
            $lastName = $json_data['lastName'] ?? '';
            $password = $json_data['password'] ?? '';
            $role = $json_data['role'] ?? 'student';

            // Validate required fields
            if (empty($email) || empty($firstName) || empty($lastName) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email, name, password, and role are required'
                ]);
                return;
            }

            // Load mail helpers
            $this->call->helper('mail_helper');
            $this->call->helper('email_templates_helper');

            // Generate welcome email using template
            $portalUrl = 'http://localhost:5174/auth';
            $emailBody = generate_welcome_email_with_credentials($firstName, $email, $role, $password, $portalUrl);

            // Send email
            $result = sendNotif($email, 'Your EduTrack Account Has Been Created', $emailBody);

            if ($result['success']) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Welcome email sent successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to send welcome email'
                ]);
            }
        } catch (Exception $e) {
            error_log('Exception in api_send_welcome_email: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }
}
