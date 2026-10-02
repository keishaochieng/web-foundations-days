-- School database (SQLite)
PRAGMA foreign_keys = ON;

-- 1. Tables
CREATE TABLE students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL
);

CREATE TABLE enrolments (
  enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  FOREIGN KEY (student_id) REFERENCES students (student_id),
  FOREIGN KEY (course_id) REFERENCES courses (course_id),
  UNIQUE (student_id, course_id)
);

-- 2. Sample data
INSERT INTO students (name, email) VALUES
  ('Amina Hassan', 'amina@example.com'),
  ('Brian Otieno', 'brian@example.com'),
  ('Grace Wanjiru', 'grace@example.com'),
  ('David Kamau', 'david@example.com');

INSERT INTO courses (course_code, title) VALUES
  ('WEB101', 'Web Foundations'),
  ('DB201', 'Databases'),
  ('JS301', 'JavaScript Basics');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'B'),
  (1, 2, 'A'),
  (2, 1, NULL),
  (2, 3, 'C'),
  (3, 1, 'A'),
  (3, 2, 'B');

-- 3. Queries

-- Query 1: all courses for one student (by name)
SELECT courses.title, enrolments.grade
FROM students
JOIN enrolments ON students.student_id = enrolments.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE students.name = 'Amina Hassan';

-- Query 2: all students on one course
SELECT students.name, students.email
FROM courses
JOIN enrolments ON courses.course_id = enrolments.course_id
JOIN students ON enrolments.student_id = students.student_id
WHERE courses.title = 'Web Foundations';

-- Query 3: number of students per course
SELECT courses.title, COUNT(enrolments.enrolment_id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.title;

-- Query 4: students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- Query 5: update one enrolment's grade (Brian's Web Foundations grade)
UPDATE enrolments
SET grade = 'B'
WHERE student_id = 2 AND course_id = 1;