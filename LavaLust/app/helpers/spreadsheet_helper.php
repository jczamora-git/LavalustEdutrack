<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Helper: spreadsheet_helper.php
 * 
 * Provides reusable functions for reading and processing Excel/CSV files
 * using PhpSpreadsheet library.
 */

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;

/**
 * Read spreadsheet file and return rows as associative arrays
 * 
 * @param string $filePath Full path to the Excel/CSV file
 * @param int $headerRow Row number containing column headers (1-based, default: 1)
 * @param string|null $sheetName Optional sheet name (default: first sheet)
 * @return array Array of rows, each row is an associative array with column names as keys
 * @throws Exception if file cannot be read
 */
function read_spreadsheet($filePath, $headerRow = 1, $sheetName = null)
{
    try {
        // Load the spreadsheet
        $spreadsheet = IOFactory::load($filePath);
        
        // Get the specified sheet or the first sheet
        if ($sheetName !== null) {
            $sheet = $spreadsheet->getSheetByName($sheetName);
            if ($sheet === null) {
                throw new Exception("Sheet '{$sheetName}' not found in file");
            }
        } else {
            $sheet = $spreadsheet->getActiveSheet();
        }

        /** @var Worksheet $sheet */
        
        // Get the highest row and column
        $highestRow = $sheet->getHighestRow();
        $highestColumn = $sheet->getHighestColumn();
        $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);
        
        // Read header row
        $headers = [];
        for ($col = 1; $col <= $highestColumnIndex; $col++) {
            $cellAddress = Coordinate::stringFromColumnIndex($col) . $headerRow;
            $cellValue = get_cell_value($sheet->getCell($cellAddress));
            // Trim and normalize header names
            $headers[$col] = trim($cellValue);
        }
        
        // Read data rows
        $rows = [];
        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $rowData = [];
            $hasData = false;
            
            for ($col = 1; $col <= $highestColumnIndex; $col++) {
                $cellAddress = Coordinate::stringFromColumnIndex($col) . $row;
                $cell = $sheet->getCell($cellAddress);
                $value = get_cell_value($cell);
                
                // Use header name as key
                $headerName = $headers[$col];
                if (!empty($headerName)) {
                    $rowData[$headerName] = $value;
                    if (!empty($value)) {
                        $hasData = true;
                    }
                }
            }
            
            // Only add rows that have at least one non-empty cell
            if ($hasData) {
                $rows[] = $rowData;
            }
        }
        
        return $rows;
        
    } catch (Exception $e) {
        throw new Exception("Error reading spreadsheet: " . $e->getMessage());
    }
}

/**
 * Validate that required columns exist in the spreadsheet data
 * 
 * @param array $rows Array of rows from read_spreadsheet()
 * @param array $requiredColumns Array of required column names
 * @return array ['valid' => bool, 'missing' => array of missing column names]
 */
function validate_required_columns($rows, $requiredColumns)
{
    if (empty($rows)) {
        return [
            'valid' => false,
            'missing' => $requiredColumns,
            'message' => 'No data rows found in spreadsheet'
        ];
    }
    
    // Get column names from first row
    $availableColumns = array_keys($rows[0]);
    
    // Normalize column names for comparison (case-insensitive, trim spaces)
    $normalizedAvailable = array_map(function($col) {
        return strtolower(trim($col));
    }, $availableColumns);
    
    $normalizedRequired = array_map(function($col) {
        return strtolower(trim($col));
    }, $requiredColumns);
    
    // Find missing columns
    $missing = [];
    foreach ($requiredColumns as $required) {
        $normalizedReq = strtolower(trim($required));
        if (!in_array($normalizedReq, $normalizedAvailable)) {
            $missing[] = $required;
        }
    }
    
    return [
        'valid' => empty($missing),
        'missing' => $missing,
        'message' => empty($missing) ? 'All required columns found' : 'Missing columns: ' . implode(', ', $missing)
    ];
}

/**
 * Safely extract cell value, handling different data types
 * 
 * @param \PhpOffice\PhpSpreadsheet\Cell\Cell $cell
 * @return mixed Cell value as string, number, or null
 */
function get_cell_value($cell)
{
    try {
        $value = $cell->getValue();
        
        // Handle null/empty
        if ($value === null || $value === '') {
            return null;
        }
        
        // Handle formulas - get calculated value
        if ($cell->isFormula()) {
            try {
                $value = $cell->getCalculatedValue();
            } catch (Exception $e) {
                // If calculation fails, return the formula as string
                $value = $cell->getValue();
            }
        }
        
        // Handle dates
        if (Date::isDateTime($cell)) {
            try {
                $dateValue = Date::excelToDateTimeObject($value);
                return $dateValue->format('Y-m-d H:i:s');
            } catch (Exception $e) {
                // Return as-is if date conversion fails
                return $value;
            }
        }
        
        // Trim strings
        if (is_string($value)) {
            return trim($value);
        }
        
        return $value;
        
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Normalize column name for case-insensitive matching
 * 
 * @param string $columnName
 * @return string Lowercase, trimmed column name
 */
function normalize_column_name($columnName)
{
    return strtolower(trim($columnName));
}

/**
 * Get value from row by column name (case-insensitive)
 * 
 * @param array $row Associative array from spreadsheet
 * @param string $columnName Column name to search for
 * @return mixed|null Value if found, null otherwise
 */
function get_row_value($row, $columnName)
{
    $normalized = normalize_column_name($columnName);
    
    foreach ($row as $key => $value) {
        if (normalize_column_name($key) === $normalized) {
            return $value;
        }
    }
    
    return null;
}

/**
 * Write rows (associative arrays) to a spreadsheet file (XLSX, XLS, CSV)
 *
 * @param array $rows Array of associative arrays (each row => [colName => value])
 * @param string $filePath Full path where file will be written
 * @param string $format Writer format: 'Xlsx' (default), 'Xls', or 'Csv'
 * @param array|null $columns Optional ordered list of column headers to use; if null, keys from first row are used
 * @return bool True on success
 * @throws Exception on failure
 */
function write_spreadsheet(array $rows, $filePath, $format = 'Xlsx', $columns = null)
{
    try {
        if (empty($rows) && empty($columns)) {
            throw new Exception('No rows provided to write');
        }

        // Determine headers
        if ($columns === null) {
            // Use keys from first row as headers (preserve order)
            $firstRow = reset($rows);
            if (!is_array($firstRow)) {
                throw new Exception('Rows must be arrays of associative arrays');
            }
            $columns = array_keys($firstRow);
        }

        // Create spreadsheet and populate
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Write header row
        $colIndex = 1;
        foreach ($columns as $colName) {
            $cell = Coordinate::stringFromColumnIndex($colIndex) . '1';
            $sheet->setCellValue($cell, $colName);
            $colIndex++;
        }

        // Write data rows
        $rowIndex = 2;
        foreach ($rows as $row) {
            $colIndex = 1;
            foreach ($columns as $colName) {
                $cell = Coordinate::stringFromColumnIndex($colIndex) . $rowIndex;
                $value = null;
                if (is_array($row) && array_key_exists($colName, $row)) {
                    $value = $row[$colName];
                } else {
                    // Case-insensitive search for header key
                    foreach ($row as $k => $v) {
                        if (normalize_column_name($k) === normalize_column_name($colName)) {
                            $value = $v;
                            break;
                        }
                    }
                }

                $sheet->setCellValue($cell, $value);
                $colIndex++;
            }
            $rowIndex++;
        }

        // Create writer - prefer concrete Csv writer when format is Csv to allow Csv-specific setters
        if (strtolower($format) === 'csv') {
            $writer = new Csv($spreadsheet);
            $writer->setDelimiter(',');
            $writer->setEnclosure('"');
            $writer->setSheetIndex(0);
            // Add UTF-8 BOM for Excel compatibility if supported
            if (method_exists($writer, 'setUseBOM')) {
                $writer->setUseBOM(true);
            }
        } else {
            $writer = IOFactory::createWriter($spreadsheet, $format);
        }

        // Ensure directory exists
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            if (!mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new Exception('Failed to create directory: ' . $dir);
            }
        }

        // Save file
        $writer->save($filePath);

        return true;

    } catch (Exception $e) {
        throw new Exception('Error writing spreadsheet: ' . $e->getMessage());
    }
}
