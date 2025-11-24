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

    /**
     * Get student grades summary across all courses for active academic period
     * GET /api/student/grades-summary?student_id=93&academic_period_id=20
     * 
     * Flow:
     * 1. Get student's section and year_level
     * 2. Find subjects assigned to that section/year_level in active period
     * 3. Get teacher assignments for those subjects
     * 4. Fetch activities for those subjects in the period
     * 5. Get grades for student on those activities
     * 
     * Returns grades grouped by course with weighted averages:
     * - Written Works: 30% (quiz, assignment, other)
     * - Performance Tasks: 40% (laboratory, project, performance)
     * - Exam: 30% (final exam only)
     */
    public function api_grades_summary()
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
            // Get parameters
            $studentId = $_GET['student_id'] ?? null;
            $academicPeriodId = $_GET['academic_period_id'] ?? null;

            // Validate required parameters
            if (!$studentId || !$academicPeriodId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required parameters: student_id and academic_period_id'
                ]);
                return;
            }

            // Step 1: Get student's section and year_level
            $student = $this->db->table('students')
                ->where('id', $studentId)
                ->get();

            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Student not found'
                ]);
                return;
            }

            $studentSection = $student['section_id'] ?? null;
            $studentYearLevel = $student['year_level'] ?? null;

            error_log('=== GRADES SUMMARY DEBUG ===');
            error_log('Student ID: ' . $studentId);
            error_log('Student Section: ' . $studentSection);
            error_log('Student Year Level: ' . $studentYearLevel);
            error_log('Academic Period ID: ' . $academicPeriodId);

            if (!$studentSection || !$studentYearLevel) {
                error_log('Missing student section or year level');
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
                return;
            }

            // Step 2-6: Use raw SQL to get all courses with activities and grades
            // Properly joins: subjects -> teacher_subjects -> teacher_subject_sections -> activities -> activity_grades
            // Includes courses without activities
            $query = "
                SELECT 
                    sub.id as course_id,
                    sub.course_code,
                    sub.course_name,
                    a.id as activity_id,
                    a.title as activity_title,
                    a.type as activity_type,
                    a.max_score,
                    a.academic_period_id,
                    ap.period_type,
                    COALESCE(ag.grade, NULL) as grade
                FROM subjects sub
                INNER JOIN teacher_subjects ts ON ts.subject_id = sub.id
                INNER JOIN teacher_subject_sections tss ON tss.teacher_subject_id = ts.id
                LEFT JOIN activities a ON a.course_id = sub.id AND a.section_id = tss.section_id AND a.academic_period_id IS NOT NULL
                LEFT JOIN academic_periods ap ON ap.id = a.academic_period_id
                LEFT JOIN activity_grades ag ON ag.activity_id = a.id AND ag.student_id = ?
                WHERE sub.year_level = ?
                    AND tss.section_id = ?
                ORDER BY sub.id, ap.period_type, a.type, a.id
            ";

            // Prepare bind parameters
            $bindParams = [$studentId, $studentYearLevel, $studentSection];

            $stmt = $this->db->raw($query, $bindParams);
            $allResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$allResults || !is_array($allResults) || empty($allResults)) {
                error_log('No results from raw SQL query');
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
                return;
            }

            error_log('Raw query returned ' . count($allResults) . ' rows');

            // Organize results by course
            $courseGrades = [];
            
            foreach ($allResults as $row) {
                $courseId = $row['course_id'];
                
                // Initialize course if not exists
                if (!isset($courseGrades[$courseId])) {
                    $courseGrades[$courseId] = [
                        'course_id' => $courseId,
                        'course_code' => $row['course_code'],
                        'course_name' => $row['course_name'],
                        'written_works' => [],
                        'performance_tasks' => [],
                        'exam' => null
                    ];
                }

                // Skip if no activity data (from LEFT JOIN)
                if ($row['activity_id'] === null) {
                    continue;
                }

                $activityId = $row['activity_id'];
                $type = $row['activity_type'];
                $maxScore = $row['max_score'];
                $gradeValue = $row['grade'];
                $periodType = $row['period_type'];

                // Convert grade to percentage
                $percentage = ($gradeValue !== null && $maxScore > 0) ? ($gradeValue / $maxScore) * 100 : 0;

                $activityData = [
                    'activity_id' => $activityId,
                    'title' => $row['activity_title'],
                    'score' => $gradeValue,
                    'max_score' => $maxScore,
                    'percentage' => round($percentage, 2)
                ];

                // Categorize by type
                $activityType = strtolower($type);
                if (in_array($activityType, ['quiz', 'assignment', 'other'])) {
                    $courseGrades[$courseId]['written_works'][] = $activityData;
                } elseif (in_array($activityType, ['laboratory', 'project', 'performance'])) {
                    $courseGrades[$courseId]['performance_tasks'][] = $activityData;
                } elseif ($activityType === 'exam') {
                    if ($courseGrades[$courseId]['exam'] === null || 
                        $activityId > $courseGrades[$courseId]['exam']['activity_id']) {
                        $courseGrades[$courseId]['exam'] = $activityData;
                    }
                }
            }

            error_log('Course grades grouped: ' . count($courseGrades));

            // Compute weighted grades for each course
            $result = [];
            
            foreach ($courseGrades as $course) {
                // Calculate average for each component
                $writtenAvg = $this->calculate_component_average($course['written_works']);
                $performanceAvg = $this->calculate_component_average($course['performance_tasks']);
                $examScore = $course['exam'] ? $course['exam']['percentage'] : null;
                
                // Calculate final grade using weights: 30% Written, 40% Performance, 30% Exam
                $finalGrade = null;
                if ($writtenAvg !== null && $performanceAvg !== null && $examScore !== null) {
                    $finalGrade = round(
                        ($writtenAvg * 0.30) + ($performanceAvg * 0.40) + ($examScore * 0.30),
                        2
                    );
                }
                
                $result[] = [
                    'course_code' => $course['course_code'],
                    'course_name' => $course['course_name'],
                    'course_id' => $course['course_id'],
                    'midterm_grade' => $finalGrade,
                    'components' => [
                        'written_works' => [
                            'average' => $writtenAvg,
                            'weight' => 0.30,
                            'activities' => $course['written_works']
                        ],
                        'performance_tasks' => [
                            'average' => $performanceAvg,
                            'weight' => 0.40,
                            'activities' => $course['performance_tasks']
                        ],
                        'exam' => [
                            'score' => $examScore,
                            'weight' => 0.30,
                            'activity' => $course['exam']
                        ]
                    ]
                ];
            }

            error_log('Final result count: ' . count($result));
            error_log('=== END DEBUG ===');
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $result,
                'count' => count($result)
            ]);

        } catch (Exception $e) {
            error_log('Exception in api_grades_summary: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Server error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * GET /api/students/{id}/courses
     * Returns courses (subjects) assigned to the student based on section and year level
     * Filters subjects by student's year_level and active semester.
     */
    public function api_get_courses_for_student($studentId = null)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        if (!$studentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Student id is required']);
            return;
        }

        try {
            // Step 1: Load student record
            $student = $this->db->table('students')->where('id', $studentId)->get();
            if (!$student) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }

            $studentYearLevel = $student['year_level'] ?? null;
            $studentSection = $student['section_id'] ?? null;

            // Step 2: Resolve active academic period and normalized semester
            $activePeriod = $this->db->table('academic_periods')->where('status', 'active')->get();
            $semesterNormalized = null;
            if ($activePeriod && !empty($activePeriod['semester'])) {
                $sem = $activePeriod['semester'];
                if (preg_match('/^(\d+)/', $sem, $m)) {
                    $semesterNormalized = intval($m[1]) === 1 ? '1st Semester' : '2nd Semester';
                } else {
                    // fallback: use raw value (e.g., 'Summer')
                    $semesterNormalized = $sem;
                }
            }

            $courses = [];

            // If student has a section, try to fetch assigned subjects for that section
            if (!empty($studentSection)) {
                // Use join to get subjects assigned to this section and match year_level + semester
                $sql = "
                    SELECT DISTINCT sub.*, ts.id AS teacher_subject_id, ts.teacher_id
                    FROM subjects sub
                    INNER JOIN teacher_subjects ts ON ts.subject_id = sub.id
                    INNER JOIN teacher_subject_sections tss ON tss.teacher_subject_id = ts.id
                    WHERE tss.section_id = ?
                ";

                $params = [$studentSection];

                // add year_level filter if present
                if (!empty($studentYearLevel)) {
                    $sql .= " AND sub.year_level = ?";
                    $params[] = $studentYearLevel;
                }

                // add semester filter if resolved
                if (!empty($semesterNormalized)) {
                    $sql .= " AND (sub.semester = ? OR sub.semester LIKE ?)";
                    $params[] = $semesterNormalized;
                    $params[] = '%' . $semesterNormalized . '%';
                }

                $sql .= " ORDER BY sub.course_code, sub.course_name";

                $stmt = $this->db->raw($sql, $params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($rows)) {
                    foreach ($rows as $r) {
                        $courses[] = [
                            'id' => $r['id'],
                            'course_code' => $r['course_code'] ?? $r['code'] ?? null,
                            'course_name' => $r['course_name'] ?? $r['title'] ?? null,
                            'year_level' => $r['year_level'] ?? null,
                            'semester' => $r['semester'] ?? null,
                            'teacher_subject_id' => $r['teacher_subject_id'] ?? null,
                            'teacher_id' => $r['teacher_id'] ?? null,
                        ];
                    }
                }
            }

            // If no courses found via assignment, fall back to subjects filtered by year_level + semester
            if (empty($courses)) {
                $filters = [];
                if (!empty($studentYearLevel)) $filters['year_level'] = $studentYearLevel;
                if (!empty($semesterNormalized)) $filters['semester'] = $semesterNormalized;

                $subjects = $this->SubjectModel->get_all($filters);
                if (!empty($subjects)) {
                    foreach ($subjects as $s) {
                        $courses[] = [
                            'id' => $s['id'],
                            'course_code' => $s['course_code'] ?? $s['code'] ?? null,
                            'course_name' => $s['course_name'] ?? $s['title'] ?? null,
                            'year_level' => $s['year_level'] ?? null,
                            'semester' => $s['semester'] ?? null,
                            'teacher_subject_id' => null,
                            'teacher_id' => null,
                        ];
                    }
                }
            }

            echo json_encode(['success' => true, 'courses' => $courses, 'count' => count($courses), 'active_period' => $activePeriod]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/students/{id}/courses/teachers
     * Returns teacher assignments for the student's courses bound to the student's section
     */
    public function api_get_course_teachers($studentId = null)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        if (!$studentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Student id is required']);
            return;
        }

        try {
            // Load student
            $student = $this->db->table('students')->where('id', $studentId)->get();
            if (!$student) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }

            $studentSection = $student['section_id'] ?? null;

            // First, get the list of subject IDs for the student using existing helper (courses endpoint logic)
            $coursesResp = $this->api_get_courses_for_student_internal($student);
            $subjectIds = array_map(function($c){ return $c['id']; }, $coursesResp);

            // Build SQL to fetch teacher assignments for these subjects, prioritizing assignments linked to student's section
            $sql = "
                SELECT ts.id AS teacher_subject_id,
                       ts.teacher_id,
                       t.user_id AS teacher_user_id,
                       u.first_name AS teacher_first_name,
                       u.last_name AS teacher_last_name,
                       u.email AS teacher_email,
                       u.phone AS teacher_phone,
                       t.employee_id,
                       sub.id AS subject_id,
                       sub.course_code,
                       sub.course_name,
                       tss.section_id,
                       sec.name AS section_name
                FROM teacher_subjects ts
                LEFT JOIN teachers t ON t.id = ts.teacher_id
                LEFT JOIN users u ON u.id = t.user_id
                LEFT JOIN subjects sub ON sub.id = ts.subject_id
                LEFT JOIN teacher_subject_sections tss ON tss.teacher_subject_id = ts.id
                LEFT JOIN sections sec ON sec.id = tss.section_id
                WHERE ts.subject_id IN (" . implode(',', array_map('intval', $subjectIds ?: [0])) . ")
            ";

            // If studentSection is present, prefer rows for that section by adding ORDER BY
            if (!empty($studentSection)) {
                $sql .= " ORDER BY (CASE WHEN tss.section_id = " . intval($studentSection) . " THEN 0 ELSE 1 END), sub.course_code";
            } else {
                $sql .= " ORDER BY sub.course_code";
            }

            $stmt = $this->db->raw($sql, []);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $result = [];
            foreach ($rows as $r) {
                $sid = $r['subject_id'];
                $tsid = $r['teacher_subject_id'];
                if (!isset($result[$sid])) $result[$sid] = ['subject_id'=>$sid,'course_code'=>$r['course_code'],'course_name'=>$r['course_name'],'assignments'=>[]];

                $result[$sid]['assignments'][] = [
                    'teacher_subject_id' => $tsid,
                    'teacher_id' => $r['teacher_id'],
                    'teacher' => [
                        'id' => $r['teacher_id'],
                        'user_id' => $r['teacher_user_id'],
                        'first_name' => $r['teacher_first_name'],
                        'last_name' => $r['teacher_last_name'],
                        'email' => $r['teacher_email'],
                        'phone' => $r['teacher_phone'],
                        'employee_id' => $r['employee_id']
                    ],
                    'section' => [ 'id' => $r['section_id'], 'name' => $r['section_name'] ]
                ];
            }

            // Reformat result
            $out = array_values($result);

            echo json_encode(['success' => true, 'teachers_by_subject' => $out, 'count' => count($out)]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Internal helper: returns array of course rows for a student (id, course_code, course_name)
     */
    private function api_get_courses_for_student_internal($student)
    {
        $studentYearLevel = $student['year_level'] ?? null;
        $studentSection = $student['section_id'] ?? null;

        // Try to get assigned courses via teacher_subjects -> teacher_subject_sections
        $sql = "
            SELECT DISTINCT sub.id, sub.course_code, sub.course_name
            FROM subjects sub
            INNER JOIN teacher_subjects ts ON ts.subject_id = sub.id
            INNER JOIN teacher_subject_sections tss ON tss.teacher_subject_id = ts.id
            WHERE 1=1
        ";
        $params = [];
        if (!empty($studentSection)) {
            $sql .= " AND tss.section_id = ?";
            $params[] = $studentSection;
        }
        if (!empty($studentYearLevel)) {
            $sql .= " AND sub.year_level = ?";
            $params[] = $studentYearLevel;
        }
        $sql .= " ORDER BY sub.course_code";

        $stmt = $this->db->raw($sql, $params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $rows ?: [];
    }

    /**
     * GET /api/students/{id}/activities
     * Query params:
     * - course_id (required) : subject id
     * - period_type (required) : e.g., 'Midterm', 'Final'
     *
     * Returns activities for the given student filtered by:
     * - subject/course id
     * - student's section_id
     * - subject.year_level matches student.year_level
     * - active academic period matching subject semester + provided period_type
     * - only include the grade rows for the provided student_id
     */
    public function api_get_activities_for_student($studentId = null)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        if (!$studentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Student id is required']);
            return;
        }

        $courseId = $_GET['course_id'] ?? ($_GET['subject_id'] ?? null);
        $periodType = $_GET['period_type'] ?? null;

        if (empty($courseId) || empty($periodType)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required query params: course_id and period_type']);
            return;
        }

        try {
            // Load student
            $student = $this->db->table('students')->where('id', $studentId)->get();
            if (!$student) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }

            $studentSection = $student['section_id'] ?? null;
            $studentYearLevel = $student['year_level'] ?? null;

            // Load subject/course
            $subject = $this->db->table('subjects')->where('id', $courseId)->get();
            if (!$subject) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Subject/course not found']);
                return;
            }

            // Check year level mismatch but do not abort — include a warning if they differ
            $yearMismatch = false;
            if (!empty($subject['year_level']) && !empty($studentYearLevel) && $subject['year_level'] !== $studentYearLevel) {
                $yearMismatch = true;
            }

            // Determine semester to match academic period
            $subjectSemester = $subject['semester'] ?? null;
            $semesterNormalized = null;
            if (!empty($subjectSemester) && preg_match('/^(\d+)/', $subjectSemester, $m)) {
                $semesterNormalized = intval($m[1]) === 1 ? '1st Semester' : '2nd Semester';
            } else {
                $semesterNormalized = $subjectSemester;
            }

            // Find active academic period for this semester and period_type
            $academicPeriod = null;
            if (!empty($semesterNormalized)) {
                $academicPeriod = $this->db->table('academic_periods')
                    ->where('status', 'active')
                    ->where('period_type', $periodType)
                    ->where('semester', $semesterNormalized)
                    ->get();
            }

            // Fallback: look for active period with period_type only
            if (!$academicPeriod) {
                $academicPeriod = $this->db->table('academic_periods')
                    ->where('status', 'active')
                    ->where('period_type', $periodType)
                    ->get();
            }

            if (!$academicPeriod || empty($academicPeriod['id'])) {
                // No active academic period found
                echo json_encode(['success' => true, 'activities' => [], 'count' => 0, 'message' => 'No active academic period found for the given semester/period_type']);
                return;
            }

            $academicPeriodId = $academicPeriod['id'];

            // Ensure we have a section to filter by
            if (empty($studentSection)) {
                echo json_encode(['success' => true, 'activities' => [], 'count' => 0, 'message' => 'Student has no assigned section']);
                return;
            }

                        // Fetch activities for this course, section, academic period and student grade
                        $sql = "
                                SELECT a.*, ag.id AS grade_id, ag.student_id AS graded_student_id, ag.grade AS student_grade
                                FROM activities a
                                LEFT JOIN activity_grades ag ON ag.activity_id = a.id AND ag.student_id = ?
                                WHERE a.course_id = ?
                                    AND a.academic_period_id = ?
                                    AND a.section_id = ?
                                ORDER BY a.type, a.id
                        ";

            $stmt = $this->db->raw($sql, [$studentId, $courseId, $academicPeriodId, $studentSection]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$rows) $rows = [];

            // Normalize activity output
            $activities = [];
            foreach ($rows as $r) {
                $activities[] = [
                    'id' => $r['id'],
                    'title' => $r['title'] ?? $r['name'] ?? null,
                    'description' => $r['description'] ?? null,
                    'type' => $r['type'] ?? null,
                    'max_score' => $r['max_score'] ?? $r['maxScore'] ?? null,
                    'date_due' => $r['date_due'] ?? $r['due_date'] ?? null,
                    'academic_period_id' => $r['academic_period_id'] ?? null,
                    'section_id' => $r['section_id'] ?? null,
                    'student_grade' => $r['student_grade'] !== null ? $r['student_grade'] : null,
                    'grade_id' => $r['grade_id'] ?? null
                ];
            }

            $response = ['success' => true, 'activities' => $activities, 'count' => count($activities), 'academic_period' => $academicPeriod];
            if ($yearMismatch) {
                $response['warning'] = 'Subject year_level does not match student year_level';
                $response['subject_year_level'] = $subject['year_level'];
                $response['student_year_level'] = $studentYearLevel;
            }

            echo json_encode($response);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * GET /api/students/{id}/courses-activities
     * Returns all courses for the student and activities (with student's grade) for the active academic period
     */
    public function api_get_courses_activities($studentId = null)
    {
        api_set_json_headers();

        if (!$this->session->userdata('logged_in')) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            return;
        }

        if (!$studentId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Student id is required']);
            return;
        }

        try {
            // Load student
            $student = $this->db->table('students')->where('id', $studentId)->get();
            if (!$student) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Student not found']);
                return;
            }

            $studentSection = $student['section_id'] ?? null;
            $studentYearLevel = $student['year_level'] ?? null;

            if (empty($studentSection)) {
                echo json_encode(['success' => true, 'courses' => [], 'activities_by_course' => [], 'count' => 0, 'message' => 'Student has no assigned section']);
                return;
            }

            // Active academic period
            $activePeriod = $this->db->table('academic_periods')->where('status', 'active')->get();
            if (!$activePeriod || empty($activePeriod['id'])) {
                echo json_encode(['success' => true, 'courses' => [], 'activities_by_course' => [], 'count' => 0, 'message' => 'No active academic period']);
                return;
            }

            $academicPeriodId = $activePeriod['id'];

            // Get student's courses using internal helper (tries teacher assignments for section first)
            $courseRows = $this->api_get_courses_for_student_internal($student);

            // Fallback to SubjectModel if none found
            if (empty($courseRows)) {
                $filters = [];
                if (!empty($studentYearLevel)) $filters['year_level'] = $studentYearLevel;
                // try to match semester to activePeriod if available
                if (!empty($activePeriod['semester'])) $filters['semester'] = $activePeriod['semester'];
                $subjects = $this->SubjectModel->get_all($filters);
                foreach ($subjects as $s) {
                    $courseRows[] = ['id' => $s['id'], 'course_code' => $s['course_code'] ?? $s['code'] ?? null, 'course_name' => $s['course_name'] ?? $s['title'] ?? null];
                }
            }

            if (empty($courseRows)) {
                echo json_encode(['success' => true, 'courses' => [], 'activities_by_course' => [], 'count' => 0]);
                return;
            }

            $subjectIds = array_map(function($c){ return (int)$c['id']; }, $courseRows);

            // Build IN clause placeholders
            $placeholders = implode(',', array_fill(0, count($subjectIds), '?'));

            // Query activities with student grades in one query
            $sql = "SELECT a.*, ag.grade as student_grade, ag.status as grade_status, ag.id as grade_id
                    FROM activities a
                    LEFT JOIN activity_grades ag ON a.id = ag.activity_id AND ag.student_id = ?
                    WHERE a.course_id IN ($placeholders)
                      AND a.academic_period_id = ?
                      AND a.section_id = ?
                    ORDER BY a.course_id, a.type, a.id";

            $params = array_merge([$studentId], $subjectIds, [$academicPeriodId, $studentSection]);

            $stmt = $this->db->raw($sql, $params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$rows) $rows = [];

            // Group activities by course_id
            $activitiesByCourse = [];
            $totalActivities = 0;
            foreach ($rows as $r) {
                $cid = (int)$r['course_id'];
                if (!isset($activitiesByCourse[$cid])) $activitiesByCourse[$cid] = [];

                $activitiesByCourse[$cid][] = [
                    'id' => $r['id'],
                    'title' => $r['title'] ?? null,
                    'type' => $r['type'] ?? null,
                    'max_score' => $r['max_score'] ?? null,
                    'due_at' => $r['due_at'] ?? null,
                    'academic_period_id' => $r['academic_period_id'] ?? null,
                    'section_id' => $r['section_id'] ?? null,
                    'student_grade' => $r['student_grade'] !== null ? $r['student_grade'] : null,
                    'grade_status' => $r['grade_status'] ?? null,
                    'grade_id' => $r['grade_id'] ?? null
                ];
                $totalActivities++;
            }

            // Map courses output
            $coursesOut = array_map(function($c){
                return [
                    'id' => (int)$c['id'],
                    'course_code' => $c['course_code'] ?? null,
                    'course_name' => $c['course_name'] ?? null
                ];
            }, $courseRows);

            // Convert activitiesByCourse to array of objects
            $activitiesByCourseArr = [];
            foreach ($coursesOut as $c) {
                $cid = $c['id'];
                $activitiesByCourseArr[] = [
                    'course_id' => $cid,
                    'course_code' => $c['course_code'],
                    'course_name' => $c['course_name'],
                    'activities' => $activitiesByCourse[$cid] ?? []
                ];
            }

            echo json_encode([
                'success' => true,
                'courses' => $coursesOut,
                'activities_by_course' => $activitiesByCourseArr,
                'count_courses' => count($coursesOut),
                'count_activities' => $totalActivities,
                'academic_period' => $activePeriod
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
        }
    }

    /**
     * Helper function to calculate average percentage for a component
     */
    private function calculate_component_average($activities)
    {
        if (empty($activities)) {
            return null;
        }
        
        $totalPercentage = 0;
        foreach ($activities as $activity) {
            $totalPercentage += $activity['percentage'];
        }
        
        return round($totalPercentage / count($activities), 2);
    }
}
