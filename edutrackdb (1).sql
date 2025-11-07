-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 07, 2025 at 01:09 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `edutrackdb`
--

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `name`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 'F1', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 15:09:29'),
(2, 'F2', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 11:17:38'),
(3, 'F3', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 11:14:26'),
(4, 'F4', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 15:09:29'),
(5, 'F5', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 15:09:29'),
(6, 'F6', 'Bachelor of Science in Information Technology', 'active', '2025-11-06 15:09:29', '2025-11-06 15:09:29');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED DEFAULT NULL,
  `student_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `year_level` enum('1st Year','2nd Year','3rd Year','4th Year') COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_id` int UNSIGNED DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `student_id`, `year_level`, `section_id`, `status`, `created_at`, `updated_at`) VALUES
(3, 18, 'MCC2025-00003', '1st Year', NULL, 'active', '2025-11-06 11:30:24', '2025-11-06 18:30:24'),
(4, 19, 'MCC2025-00004', '1st Year', NULL, 'active', '2025-11-06 11:30:45', '2025-11-06 18:30:45');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int UNSIGNED NOT NULL,
  `course_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique course identifier (e.g., ITP 411)',
  `course_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full name of the course',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Detailed description of the course content',
  `credits` tinyint UNSIGNED NOT NULL DEFAULT '3' COMMENT 'Number of academic credits',
  `category` enum('Major','Minor','Elective','Core') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Major' COMMENT 'Course category',
  `year_level` enum('1st Year','2nd Year','3rd Year','4th Year') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Target year level',
  `semester` enum('1st Semester','2nd Semester','Summer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Semester offered',
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Whether the subject is currently offered',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `course_code`, `course_name`, `description`, `credits`, `category`, `year_level`, `semester`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Eng 001', 'Grammar and Composition 1', NULL, 3, 'Core', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(2, 'Soc Sci 111', 'Pag-unawa sa Sarili', NULL, 3, 'Core', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(3, 'Lit 111', 'Philippine Literature', NULL, 3, 'Core', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(4, 'Fil 111', 'Kontekstwalisadong Komunikasyon sa Filipino', NULL, 3, 'Core', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(5, 'ITC 111', 'Intro to Computing', NULL, 3, 'Major', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(6, 'ITC 112', 'Computer Programming 1', NULL, 3, 'Major', '1st Year', '1st Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(7, 'Soc Sci 112', 'Gender and Society', NULL, 3, 'Core', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(8, 'Fil 112', 'Filipino sa Iba\'t Ibang Disiplina', NULL, 3, 'Core', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(9, 'Eng 111', 'Purposive Communication', NULL, 3, 'Core', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(10, 'ITC 121', 'Computer Programming 2', NULL, 3, 'Major', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(11, 'ITP 121', 'Discrete Mathematics', NULL, 3, 'Major', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(12, 'ITP 122', 'Introduction to Human Computer Interaction 1', NULL, 3, 'Major', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(13, 'ITE 121', 'Electronics with Technical Drawing', NULL, 3, 'Major', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(14, 'NSTP 2', 'National Service Training Program 2', NULL, 3, 'Core', '1st Year', '2nd Semester', 'active', '2025-11-06 15:37:00', '2025-11-06 15:37:00'),
(15, 'Eng 002', 'Business Communication', NULL, 3, 'Core', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(16, 'ITC 211', 'Data Structures with Algorithm', NULL, 3, 'Major', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(17, 'ITC 212', 'Information Management', NULL, 3, 'Major', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(18, 'ITE 211', 'Human Computer Interaction 2', NULL, 3, 'Major', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(19, 'ITE 212', 'Object Oriented Programming', NULL, 3, 'Major', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(20, 'ITE 213', 'Platform Technologies', NULL, 3, 'Major', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(21, 'P.E 221', 'Individual/Dual Sports', NULL, 2, 'Core', '2nd Year', '1st Semester', 'active', '2025-11-06 15:37:54', '2025-11-06 15:37:54'),
(22, 'ITP 221', 'Advanced Database Systems', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(23, 'ITP 222', 'Quantitative Methods', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(24, 'ITP 223', 'Networking 1', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(25, 'ITP 224', 'Integrative Programming and Technologies 1', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(26, 'ITE 221', 'Web Systems and Technologies', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(27, 'ITE 222', 'Embedded System', NULL, 3, 'Major', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07'),
(28, 'P.E 222', 'Team Games and Sports', NULL, 2, 'Core', '2nd Year', '2nd Semester', 'active', '2025-11-06 15:38:07', '2025-11-06 15:38:07');

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `employee_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `status_updated_at` timestamp NULL DEFAULT NULL COMMENT 'When status last changed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `user_id`, `employee_id`, `status`, `status_updated_at`, `created_at`, `updated_at`) VALUES
(1, 16, 'EMP2025-001', 'active', NULL, '2025-11-06 14:06:02', '2025-11-06 14:06:02');

-- --------------------------------------------------------

--
-- Table structure for table `teacher_subjects`
--

CREATE TABLE `teacher_subjects` (
  `id` int UNSIGNED NOT NULL,
  `teacher_id` int UNSIGNED NOT NULL COMMENT 'references teachers.id',
  `subject_id` int UNSIGNED NOT NULL COMMENT 'references subjects.id',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teacher_subject_sections`
--

CREATE TABLE `teacher_subject_sections` (
  `id` int UNSIGNED NOT NULL,
  `teacher_subject_id` int UNSIGNED NOT NULL COMMENT 'references teacher_subjects.id',
  `section_id` int UNSIGNED NOT NULL COMMENT 'references sections.id (e.g., F1..F6)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','teacher','student') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `role`, `first_name`, `last_name`, `phone`, `status`, `created_at`, `updated_at`) VALUES
(1, 'student@demo.com', '$2y$10$Ll4dzxFoqlaGCC1aL702BOdZ3xtLLijHcLKzW4SF1HPrlEgP9Frz6', 'student', 'Demo', 'Student', '', 'active', '2025-11-06 11:13:56', '2025-11-06 05:12:41'),
(2, 'teacher@demo.com', '$2y$10$/zuE1Q4AmA1J6MXuovoRoenUL5PoblPSzSxXA3ubUw47wpiTNfoVS', 'teacher', 'Demo', 'Teacher', '', 'active', '2025-11-06 11:14:42', '2025-11-06 04:48:41'),
(3, 'admin@demo.com', '$2y$10$zhZ636k.0buTfPYR..Q2eODPgdmjEcKklTOWC1HTR64BH13j0iNeS', 'admin', 'Demo', 'Admin', '', 'active', '2025-11-06 11:15:04', '2025-11-06 11:49:02'),
(16, 'john.doe@example.com', '$2y$10$I19hzyUWwzkG9HMk8wEutekUr7tC9GmtiRFvW4lqePlq4eKBKXQtS', 'teacher', 'John', 'Doe', '', 'active', '2025-11-06 14:05:34', '2025-11-06 18:29:13'),
(18, 'juan.delacruz@mcc.edu.ph', '$2y$10$762nxMWoGHGu7kRyvzc8K.FGrrYGGJpRdMbm5jentTkF4mfui3iBK', 'student', 'Juan', 'Dela Cruz', '', 'active', '2025-11-06 18:30:24', '2025-11-06 18:30:24'),
(19, 'maria.santos@mcc.edu.ph', '$2y$10$KGlfA0PiOWB4HR0pds9.1epVHMzpgv3hsk.qLKXZCSh9mgaD20FCW', 'student', 'Maria', 'Santos', '', 'active', '2025-11-06 18:30:45', '2025-11-06 11:48:51');

-- --------------------------------------------------------

--
-- Table structure for table `year_levels`
--

CREATE TABLE `year_levels` (
  `id` tinyint UNSIGNED NOT NULL,
  `name` enum('1st Year','2nd Year','3rd Year','4th Year') NOT NULL,
  `order` tinyint NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `year_levels`
--

INSERT INTO `year_levels` (`id`, `name`, `order`) VALUES
(1, '1st Year', 1),
(2, '2nd Year', 2),
(3, '3rd Year', 3),
(4, '4th Year', 4);

-- --------------------------------------------------------

--
-- Table structure for table `year_level_sections`
--

CREATE TABLE `year_level_sections` (
  `year_level_id` tinyint UNSIGNED NOT NULL,
  `section_id` int UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `year_level_sections`
--

INSERT INTO `year_level_sections` (`year_level_id`, `section_id`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(1, 2),
(2, 2),
(3, 2),
(4, 2),
(1, 3),
(2, 3),
(3, 3),
(1, 4),
(2, 4),
(3, 4),
(1, 5),
(2, 5),
(3, 5),
(1, 6);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sections_name_year_unique` (`name`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `students_student_id_unique` (`student_id`),
  ADD UNIQUE KEY `students_user_id_unique` (`user_id`),
  ADD KEY `students_section_id_foreign` (`section_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subjects_course_code_unique` (`course_code`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_year_level` (`year_level`),
  ADD KEY `idx_semester` (`semester`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teachers_employee_id_unique` (`employee_id`),
  ADD UNIQUE KEY `teachers_user_id_unique` (`user_id`),
  ADD KEY `idx_employee_id` (`employee_id`);

--
-- Indexes for table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_teacher_subject` (`teacher_id`,`subject_id`),
  ADD KEY `idx_teacher_id` (`teacher_id`),
  ADD KEY `idx_subject_id` (`subject_id`);

--
-- Indexes for table `teacher_subject_sections`
--
ALTER TABLE `teacher_subject_sections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_teacher_subject_section` (`teacher_subject_id`,`section_id`),
  ADD KEY `idx_teacher_subject_id` (`teacher_subject_id`),
  ADD KEY `idx_section_id` (`section_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `year_levels`
--
ALTER TABLE `year_levels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_name` (`name`);

--
-- Indexes for table `year_level_sections`
--
ALTER TABLE `year_level_sections`
  ADD PRIMARY KEY (`year_level_id`,`section_id`),
  ADD KEY `idx_section` (`section_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teacher_subject_sections`
--
ALTER TABLE `teacher_subject_sections`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `year_levels`
--
ALTER TABLE `year_levels`
  MODIFY `id` tinyint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_section_id_foreign` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `students_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teachers`
--
ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `teacher_subjects`
--
ALTER TABLE `teacher_subjects`
  ADD CONSTRAINT `fk_teacher_subjects_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_teacher_subjects_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `teacher_subject_sections`
--
ALTER TABLE `teacher_subject_sections`
  ADD CONSTRAINT `fk_tsub_sections_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tsub_sections_tsub` FOREIGN KEY (`teacher_subject_id`) REFERENCES `teacher_subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `year_level_sections`
--
ALTER TABLE `year_level_sections`
  ADD CONSTRAINT `fk_yls_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_yls_year_level` FOREIGN KEY (`year_level_id`) REFERENCES `year_levels` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
