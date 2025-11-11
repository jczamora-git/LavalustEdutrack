<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Tools extends Controller
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Generate 300 fake students and stream an XLSX download
     * GET /tools/generate-students
     */
    public function generate_students()
    {
        // Allow only admin users to run this
        if (!$this->session->userdata('logged_in') || $this->session->userdata('role') !== 'admin') {
            http_response_code(403);
            echo "Access denied. Admin only.";
            return;
        }

        try {
            // Load spreadsheet helper
            $this->call->helper('spreadsheet');

            $firstNames = [
                "Juan", "Maria", "Luis", "Ana", "Carlos", "Sofia", "Miguel", "Isabella", "Elena", "Jorge",
                "Cristina", "Ricardo", "Gabriela", "Andres", "Valentina", "Diego", "Camila", "Felipe", "Lucia", "Sebastian",
                "Ava", "Nathan", "Chloe", "Marcus", "Zoe", "Leo", "Stella", "Oscar", "Nina", "Axel",
                "Ellie", "Dylan", "Lily", "Ian", "Sophia", "Julian", "Emma", "Brian", "Mia", "Victor"
            ];

            $lastNames = [
                "Garcia", "Reyes", "Cruz", "Torres", "Lim", "Tan", "Diaz", "Sy", "Castro", "Navarro",
                "Perez", "Santos", "Delgado", "Fernandez", "Mendoza", "Go", "Aquino", "Bautista", "Villanueva", "Uy",
                "Ramos", "Alvarez", "Huang", "Ocampo", "Salazar", "Gomez", "Dela Cruz", "Delos Santos", "Medina", "Pineda",
                "Lozano", "Bravo", "Quinto", "Rivera", "Santiago", "Ignacio", "Katindig", "Manalo", "Beltran", "Ortega"
            ];

            $yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

            $rows = [];
            for ($i = 0; $i < 300; $i++) {
                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                $yearLevel = $yearLevels[array_rand($yearLevels)];
                $email = strtolower(str_replace(' ', '.', $firstName . '.' . $lastName)) . '@mcc.edu.ph';

                $rows[] = [
                    'Student ID' => '',
                    'First Name' => $firstName,
                    'Last Name' => $lastName,
                    'Email' => $email,
                    'Year Level' => $yearLevel
                ];
            }

            $filePath = dirname(__DIR__) . '/views/students_export_extended.xlsx';
            write_spreadsheet($rows, $filePath, 'Xlsx');

            // Stream the generated file for download
            if (file_exists($filePath)) {
                header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                header('Content-Disposition: attachment; filename="students_export_extended.xlsx"');
                header('Content-Length: ' . filesize($filePath));
                readfile($filePath);
                exit;
            } else {
                http_response_code(500);
                echo "Failed to generate file";
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo "Error: " . $e->getMessage();
        }
    }
}

?>