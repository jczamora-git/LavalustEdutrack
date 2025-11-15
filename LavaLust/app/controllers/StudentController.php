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
    }

    /**
     * Set JSON response headers
     */
    

    /**
     * Get last student ID for a given year (for ID generation)
     * GET /api/students/last-id?year=2025
     */
    public function api_get_last_id()
    {
         api_set_json_headers();
        
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
         api_set_json_headers();

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
            if (!empty($_GET['include_grades'])) {
                $filters['include_grades'] = $_GET['include_grades'];
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
         api_set_json_headers();

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
         api_set_json_headers();

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
         api_set_json_headers();

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

            if (array_key_exists('studentId', $json_data)) {
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

            if (array_key_exists('yearLevel', $json_data)) {
                $updateData['year_level'] = $json_data['yearLevel'];
            }

            if (array_key_exists('sectionId', $json_data)) {
                $updateData['section_id'] = $json_data['sectionId'];
            }

            if (array_key_exists('status', $json_data)) {
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
         api_set_json_headers();

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

    /**
     * Import students from Excel/CSV file
     * POST /api/students/import
     * 
     * Expected columns (case-insensitive):
     * - Student ID (optional - will auto-generate if blank)
     * - First Name (required)
     * - Last Name (required)
     * - Email (required)
     * - Year Level (required - e.g., "1st Year", "2nd Year", etc.)
     * 
     * Returns summary: { inserted, skipped, errors: [...] }
     */
    public function api_import_students()
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
            // Check if file was uploaded
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'No file uploaded or upload error occurred'
                ]);
                return;
            }

            $file = $_FILES['file'];
            $fileTmp = $file['tmp_name'];
            $fileName = $file['name'];
            $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

            // Validate file extension
            $allowedExt = ['xlsx', 'xls', 'csv'];
            if (!in_array($fileExt, $allowedExt)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'
                ]);
                return;
            }

            // Load spreadsheet helper
            $this->call->helper('spreadsheet');

            // Read spreadsheet
            $rows = read_spreadsheet($fileTmp);

            if (empty($rows)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'No data found in file'
                ]);
                return;
            }

            // Validate required columns (Student ID is optional)
            $requiredColumns = ['First Name', 'Last Name', 'Email', 'Year Level'];
            $validation = validate_required_columns($rows, $requiredColumns);

            if (!$validation['valid']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => $validation['message'],
                    'missing_columns' => $validation['missing']
                ]);
                return;
            }

            // Process rows
            $inserted = 0;
            $skipped = 0;
            $errors = [];
            $currentYear = date('Y');

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2; // +2 because index is 0-based and header is row 1

                try {
                    // Extract values (case-insensitive)
                    $studentId = trim(get_row_value($row, 'Student ID') ?? '');
                    $firstName = trim(get_row_value($row, 'First Name') ?? '');
                    $lastName = trim(get_row_value($row, 'Last Name') ?? '');
                    $email = trim(get_row_value($row, 'Email') ?? '');
                    $yearLevel = trim(get_row_value($row, 'Year Level') ?? '');

                    // Validate required fields
                    if (empty($firstName) || empty($lastName) || empty($email) || empty($yearLevel)) {
                        $errors[] = "Row {$rowNumber}: Missing required fields (First Name, Last Name, Email, or Year Level)";
                        $skipped++;
                        continue;
                    }

                    // Validate email format
                    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                        $errors[] = "Row {$rowNumber}: Invalid email format ({$email})";
                        $skipped++;
                        continue;
                    }

                    // Check if email already exists in users table
                    $existingUser = $this->db->table('users')->where('email', $email)->get();
                    if ($existingUser) {
                        $errors[] = "Row {$rowNumber}: Email already exists ({$email})";
                        $skipped++;
                        continue;
                    }

                    // Generate student ID if not provided
                    if (empty($studentId)) {
                        $studentId = $this->StudentModel->generate_student_id($currentYear);
                    } else {
                        // Check if provided student ID already exists
                        if ($this->StudentModel->student_id_exists($studentId)) {
                            $errors[] = "Row {$rowNumber}: Student ID already exists ({$studentId})";
                            $skipped++;
                            continue;
                        }
                    }

                    // Normalize year level (accept variations like "1", "1st Year", "First Year", etc.)
                    $yearLevelNormalized = $this->normalize_year_level($yearLevel);
                    if (!$yearLevelNormalized) {
                        $errors[] = "Row {$rowNumber}: Invalid year level ({$yearLevel}). Expected: 1st Year, 2nd Year, 3rd Year, or 4th Year";
                        $skipped++;
                        continue;
                    }

                    // Create user account
                    $userData = [
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $email,
                        'password' => password_hash('demo123', PASSWORD_BCRYPT), // Default password
                        'role' => 'student',
                        'status' => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ];

                    $userId = $this->db->table('users')->insert($userData);

                    if (!$userId) {
                        $errors[] = "Row {$rowNumber}: Failed to create user account for {$firstName} {$lastName}";
                        $skipped++;
                        continue;
                    }

                    // Create student profile
                    $studentData = [
                        'user_id' => $userId,
                        'student_id' => $studentId,
                        'year_level' => $yearLevelNormalized,
                        'status' => 'active',
                        'created_at' => date('Y-m-d H:i:s')
                    ];

                    $result = $this->db->table('students')->insert($studentData);

                    if ($result) {
                        $inserted++;
                    } else {
                        // Rollback user creation if student profile fails
                        $this->db->table('users')->where('id', $userId)->delete();
                        $errors[] = "Row {$rowNumber}: Failed to create student profile for {$firstName} {$lastName}";
                        $skipped++;
                    }

                } catch (Exception $e) {
                    $errors[] = "Row {$rowNumber}: " . $e->getMessage();
                    $skipped++;
                }
            }

            // Return summary
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => "Import completed: {$inserted} inserted, {$skipped} skipped",
                'inserted' => $inserted,
                'skipped' => $skipped,
                'total_rows' => count($rows),
                'errors' => $errors
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Normalize year level input to standard format
     * Accepts: "1", "1st", "1st Year", "First Year", etc.
     * Returns: "1st Year", "2nd Year", "3rd Year", or "4th Year"
     */
    private function normalize_year_level($input)
    {
        $input = strtolower(trim($input));
        
        // Map variations to standard format
        $yearMap = [
            '1' => '1st Year',
            '1st' => '1st Year',
            '1st year' => '1st Year',
            'first' => '1st Year',
            'first year' => '1st Year',
            '2' => '2nd Year',
            '2nd' => '2nd Year',
            '2nd year' => '2nd Year',
            'second' => '2nd Year',
            'second year' => '2nd Year',
            '3' => '3rd Year',
            '3rd' => '3rd Year',
            '3rd year' => '3rd Year',
            'third' => '3rd Year',
            'third year' => '3rd Year',
            '4' => '4th Year',
            '4th' => '4th Year',
            '4th year' => '4th Year',
            'fourth' => '4th Year',
            'fourth year' => '4th Year',
        ];

        return $yearMap[$input] ?? null;
    }

    /**
     * Export students as CSV
     * GET /api/students/export
     *
     * Produces a CSV with columns: Student ID, First Name, Last Name, Email, Year Level
     * Sorted by year level (1st → 4th) then by last name (A → Z)
     */
    public function api_export_students()
    {
        // Check authorization
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Access denied. Admin only.'
            ]);
            return;
        }

        try {
            // Fetch all students
            $students = $this->StudentModel->get_all([]);
            if (!is_array($students)) $students = [];

            // Prepare rows
            $prepared = [];
            foreach ($students as $s) {
                $studentId = $s['student_id'] ?? $s['studentId'] ?? '';
                $firstName = $s['first_name'] ?? $s['firstName'] ?? ($s['name'] ?? '');
                $lastName = $s['last_name'] ?? $s['lastName'] ?? '';
                $email = $s['email'] ?? $s['user_email'] ?? '';
                $yearLevel = $s['year_level'] ?? $s['yearLevel'] ?? '';

                $prepared[] = [
                    'student_id' => $studentId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'year_level' => $yearLevel,
                ];
            }

            // Sorting helper
            $yearOrder = function($val) {
                $norm = $this->normalize_year_level($val);
                switch ($norm) {
                    case '1st Year': return 1;
                    case '2nd Year': return 2;
                    case '3rd Year': return 3;
                    case '4th Year': return 4;
                    default: return 99;
                }
            };

            usort($prepared, function($a, $b) use ($yearOrder) {
                $ya = $yearOrder($a['year_level']);
                $yb = $yearOrder($b['year_level']);
                if ($ya !== $yb) return $ya - $yb;
                return strcasecmp($a['last_name'] ?? '', $b['last_name'] ?? '');
            });

            // Send CSV headers
            $now = date('Ymd_His');
            $filename = "students_export_{$now}.csv";
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            $output = fopen('php://output', 'w');
            fputcsv($output, ['Student ID', 'First Name', 'Last Name', 'Email', 'Year Level']);

            foreach ($prepared as $row) {
                fputcsv($output, [
                    $row['student_id'],
                    $row['first_name'],
                    $row['last_name'],
                    $row['email'],
                    $row['year_level']
                ]);
            }

            fclose($output);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Export failed: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Send welcome email to newly created student
     * POST /api/students/send-welcome-email
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
            $studentId = $json_data['studentId'] ?? '';
            $yearLevel = $json_data['yearLevel'] ?? '';

            // Validate required fields
            if (empty($email) || empty($firstName) || empty($lastName) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Email, name, password are required'
                ]);
                return;
            }

            // Load mail helpers
            $this->call->helper('mail_helper');
            $this->call->helper('email_templates_helper');

            // Generate welcome email using template
            $portalUrl = 'http://localhost:5174/auth';
            $emailBody = generate_student_welcome_email_with_credentials(
                $firstName,
                $email,
                $password,
                $studentId,
                $yearLevel,
                $portalUrl
            );

            // Send email
            $result = sendNotif($email, 'Your EduTrack Student Account Has Been Created', $emailBody);

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
