# School Database Design

## Tables

### students
Stores one row per student: `student_id` (primary key), `name` and `email`. The email is `NOT NULL` and `UNIQUE`, so two students can't share an address.

### courses
Stores one row per course: `course_id` (primary key), `course_code` (unique, for example WEB101) and `title`.

### enrolments
Records the fact that a student is on a course. It holds `enrolment_id` (primary key), `student_id` and `course_id` (foreign keys), and the `grade`. The grade is allowed to be empty, because a new enrolment has no grade yet. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **One student to many enrolments** (one-to-many): each enrolment row belongs to exactly one student, but a student can have many rows.
- **One course to many enrolments** (one-to-many): each enrolment row belongs to exactly one course, but a course can have many rows.
- **Students to courses** (many-to-many): a student can take many courses, and a course has many students.

A join table is needed because a single foreign key can only point to one row. A column in `students` can't hold several courses, and a column in `courses` can't hold several students. The `enrolments` table solves this by storing one row per student-course pair, and it also gives a natural place to keep the grade, which belongs to the pair and not to either side alone.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

Queries such as "all students on one course" and "students per course" filter and join on `course_id`. The `UNIQUE (student_id, course_id)` rule already helps with searches by student, but not by course. An index on `course_id` lets the database find a course's enrolments without scanning the whole table as it grows.

## SQL or NoSQL?

I would choose SQL for this system. The data is highly structured, with fixed fields for students, courses and enrolments, and the relationships between them are central: students link to courses through enrolments, and most questions we ask are joins and counts across those links. SQL databases enforce those relationships with foreign keys, they prevent invalid data with rules such as `NOT NULL` and `UNIQUE`, and they are good at queries such as "number of students per course". A NoSQL document database could store each student with an embedded list of courses, but queries across students and courses would be harder, and the same course details could end up duplicated and inconsistent. For a school, accuracy matters more than the flexibility NoSQL offers.