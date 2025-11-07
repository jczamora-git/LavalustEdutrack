<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * User Model
 * Handles all user-related database operations
 */
class UserModel extends Model
{
    protected $table = 'users';
    
    /**
     * Find user by email
     * @param string $email
     * @return array|null
     */
    public function find_by_email($email)
    {
        return $this->db->table($this->table)
                        ->where('email', $email)
                        ->get();
    }
    
    /**
     * Find user by ID
     * @param int $id
     * @return array|null
     */
    public function find_by_id($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->get();
    }
    
    /**
     * Create new user
     * @param array $data
     * @return int|bool Returns user ID on success, false on failure
     */
    public function create($data)
    {
        // Hash password before storing
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        // Insert into database  
        $result = $this->db->table($this->table)->insert($data);
        
        if ($result) {
            return $this->db->last_id();
        }
        
        return false;
    }
    
    /**
     * Update user information
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update_user($id, $data)
    {
        // Update timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        // If password is being updated, hash it
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }
        
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update($data);
    }
    
    /**
     * Check if email already exists
     * @param string $email
     * @param int|null $exclude_id User ID to exclude from check (for updates)
     * @return bool
     */
    public function email_exists($email, $exclude_id = null)
    {
        $query = $this->db->table($this->table)
                          ->where('email', $email);
        
        if ($exclude_id) {
            // Use proper operator syntax: column, operator, value
            $query->where('id', '!=', $exclude_id);
        }
        
        $result = $query->get();
        
        // Return true only if we have a valid result
        return !empty($result);
    }
    
    /**
     * Verify user credentials
     * @param string $email
     * @param string $password
     * @return array|bool Returns user data on success, false on failure
     */
    public function verify_credentials($email, $password)
    {
        $user = $this->find_by_email($email);
        
        if (!$user) {
            return false;
        }
        
        // Check if user is active
        if ($user['status'] !== 'active') {
            return false;
        }
        
        // Verify password
        if (password_verify($password, $user['password'])) {
            // Remove password from returned data
            unset($user['password']);
            return $user;
        }
        
        return false;
    }
    
    /**
     * Update last login time
     * @param int $user_id
     * @return bool
     */
    public function update_last_login($user_id)
    {
        return $this->db->table($this->table)
                        ->where('id', $user_id)
                        ->update([
                            'updated_at' => date('Y-m-d H:i:s')
                        ]);
    }
    
    /**
     * Get all users (with optional filters)
     * @param array $filters
     * @return array
     */
    public function get_all($filters = [])
    {
        $query = $this->db->table($this->table)
                          ->select('id, email, role, first_name, last_name, phone, status, created_at, updated_at');
        
        // Apply filters
        if (isset($filters['role']) && $filters['role'] !== 'all') {
            $query->where('role', $filters['role']);
        }
        
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        
        // Search functionality
        if (isset($filters['search']) && !empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where("(first_name LIKE '$search' OR last_name LIKE '$search' OR email LIKE '$search')");
        }
        
        // Order by most recent first
        $query->order_by('created_at', 'DESC');
        
        return $query->get_all();
    }
    
    /**
     * Delete user (soft delete by setting status to inactive)
     * @param int $id
     * @return bool
     */
    public function delete_user($id)
    {
        return $this->db->table($this->table)
                        ->where('id', $id)
                        ->update([
                            'status' => 'inactive',
                            'updated_at' => date('Y-m-d H:i:s')
                        ]);
    }

    /**
     * Generate unique student ID
     * Format: MCC{year}-{5-digit-number}
     * Example: MCC2025-00001
     */
    private function generate_student_id()
    {
        $year = date('Y');
        $pattern = 'MCC' . $year . '-%';
        
        try {
            error_log("Searching for existing student IDs with pattern: $pattern");
            
            // Use raw query for LIKE with pattern matching
            $query = "SELECT student_id FROM students WHERE student_id LIKE ? ORDER BY id DESC LIMIT 1";
            $stmt = $this->db->raw($query, [$pattern]);
            $lastStudent = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            error_log("Last student query result: " . json_encode($lastStudent));
            
            if ($lastStudent && preg_match('/MCC' . $year . '-(\d+)/', $lastStudent['student_id'], $matches)) {
                $nextNum = intval($matches[1]) + 1;
            } else {
                $nextNum = 1;
            }
            
            $generatedId = 'MCC' . $year . '-' . str_pad($nextNum, 5, '0', STR_PAD_LEFT);
            error_log("Generated student ID: $generatedId");
            return $generatedId;
        } catch (Exception $e) {
            error_log("Error generating student ID: " . $e->getMessage());
            // Fallback to simple sequential ID
            return 'MCC' . $year . '-00001';
        }
    }

    /**
     * Generate unique employee ID
     * Format: EMP{year}-{3-digit-number}
     * Example: EMP2025-001
     */
    private function generate_employee_id()
    {
        $year = date('Y');
        $pattern = 'EMP' . $year . '-%';
        
        try {
            error_log("Searching for existing employee IDs with pattern: $pattern");
            
            // Use raw query for LIKE with pattern matching
            $query = "SELECT employee_id FROM teachers WHERE employee_id LIKE ? ORDER BY id DESC LIMIT 1";
            $stmt = $this->db->raw($query, [$pattern]);
            $lastEmployee = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            error_log("Last employee query result: " . json_encode($lastEmployee));
            
            if ($lastEmployee && preg_match('/EMP' . $year . '-(\d+)/', $lastEmployee['employee_id'], $matches)) {
                $nextNum = intval($matches[1]) + 1;
            } else {
                $nextNum = 1;
            }
            
            $generatedId = 'EMP' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
            error_log("Generated employee ID: $generatedId");
            return $generatedId;
        } catch (Exception $e) {
            error_log("Error generating employee ID: " . $e->getMessage());
            // Fallback to simple sequential ID
            return 'EMP' . $year . '-001';
        }
    }

    /**
     * Create user with automatic teacher/student profile
     * @param array $data User data (email, password, first_name, last_name, phone, status)
     * @param string $role Role (admin, teacher, student)
     * @return int|false User ID on success, false on failure
     */
    public function create_with_profile($data, $role = 'student')
    {
        try {
            // Validate email uniqueness
            $existing = $this->db->table($this->table)
                                 ->where('email', $data['email'])
                                 ->get();
            
            if (!empty($existing)) {
                return false;
            }

            // Hash password
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            $data['role'] = $role;
            $data['status'] = $data['status'] ?? 'active';

            // Insert user
            $result = $this->db->table($this->table)->insert($data);
            
            if (!$result) {
                error_log("Failed to insert user: " . json_encode($data));
                return false;
            }

            $userId = $this->db->last_id();
            error_log("User created with ID: $userId, Role: $role");

            // Create profile based on role
            if ($role === 'teacher') {
                $profileResult = $this->create_teacher_profile($userId);
                error_log("Teacher profile creation result: " . ($profileResult ? "Success" : "Failed"));
            } elseif ($role === 'student') {
                $profileResult = $this->create_student_profile($userId);
                error_log("Student profile creation result: " . ($profileResult ? "Success" : "Failed"));
            }

            return $userId;
        } catch (Exception $e) {
            error_log("Exception in create_with_profile: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Create teacher profile linked to user
     * Auto-generates employee_id with format: EMP{year}-{000}
     */
    private function create_teacher_profile($userId)
    {
        try {
            error_log("=== Starting teacher profile creation for user_id: $userId ===");
            
            $employeeId = $this->generate_employee_id();
            error_log("Generated employee_id: $employeeId");
            
            $teacherData = [
                'user_id' => $userId,
                'employee_id' => $employeeId
            ];

            error_log("About to insert teacher data: " . json_encode($teacherData));
            
            // Use query builder to insert
            $result = $this->db->table('teachers')->insert($teacherData);
            
            error_log("Insert result type: " . gettype($result) . ", value: " . var_export($result, true));
            
            if ($result === false || $result === 0) {
                error_log("WARNING: Teacher insert may have failed. Result: " . var_export($result, true));
                // Try alternative approach - use raw insert
                error_log("Trying alternative insert method");
                $query = "INSERT INTO teachers (user_id, employee_id) VALUES (?, ?)";
                $stmt = $this->db->raw($query, [$userId, $employeeId]);
                error_log("Alternative insert completed");
                return true; // Assume success
            }
            
            error_log("=== Teacher profile creation completed successfully ===");
            return true;
        } catch (Exception $e) {
            error_log("EXCEPTION in create_teacher_profile: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

    /**
     * Create student profile linked to user
     * Auto-generates student_id with format: MCC{year}-{00000}
     */
    private function create_student_profile($userId)
    {
        try {
            error_log("=== Starting student profile creation for user_id: $userId ===");
            
            $studentId = $this->generate_student_id();
            error_log("Generated student_id: $studentId");
            
            $studentData = [
                'user_id' => $userId,
                'student_id' => $studentId,
                'year_level' => '1st Year',
                'status' => 'active'
            ];

            error_log("About to insert student data: " . json_encode($studentData));
            
            // Use query builder to insert
            $result = $this->db->table('students')->insert($studentData);
            
            error_log("Insert result type: " . gettype($result) . ", value: " . var_export($result, true));
            
            if ($result === false || $result === 0) {
                error_log("WARNING: Student insert may have failed. Result: " . var_export($result, true));
                // Try alternative approach - use raw insert
                error_log("Trying alternative insert method");
                $query = "INSERT INTO students (user_id, student_id, year_level, status) VALUES (?, ?, ?, ?)";
                $stmt = $this->db->raw($query, [$userId, $studentId, '1st Year', 'active']);
                error_log("Alternative insert completed");
                return true; // Assume success
            }
            
            error_log("=== Student profile creation completed successfully ===");
            return true;
        } catch (Exception $e) {
            error_log("EXCEPTION in create_student_profile: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }


    
    /**
     * Get user count by role
     * @return array
     */
    public function get_user_counts()
    {
        $counts = [
            'total' => 0,
            'admin' => 0,
            'teacher' => 0,
            'student' => 0,
            'active' => 0,
            'inactive' => 0
        ];
        
        // Get all users
        $result = $this->db->table($this->table)
                           ->select('role, status, COUNT(*) as count')
                           ->group_by('role, status')
                           ->get_all();
        
        foreach ($result as $row) {
            $counts['total'] += $row['count'];
            $counts[$row['role']] += $row['count'];
            $counts[$row['status']] += $row['count'];
        }
        
        return $counts;
    }
}