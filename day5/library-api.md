# Library API Design

A REST API for a library's **books** resource. All paths start with `/api`, and request and response bodies use JSON.

## Endpoints

### 1. List all books
- **Method and path:** `GET /api/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** `200 OK`

### 2. Get one book
- **Method and path:** `GET /api/books/{id}`
- **Description:** Returns the book with the given id.
- **Request body:** none
- **Success status:** `200 OK`

### 3. Create a book
- **Method and path:** `POST /api/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958,
    "isbn": "9780385474542"
  }
```

- **Success status:** `201 Created`

### 4. Update a book
- **Method and path:** `PUT /api/books/{id}`
- **Description:** Replaces the details of an existing book.
- **Example request body:**

```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958,
    "isbn": "9780385474542"
  }
```

- **Success status:** `200 OK`

### 5. Delete a book
- **Method and path:** `DELETE /api/books/{id}`
- **Description:** Removes the book from the library.
- **Request body:** none
- **Success status:** `204 No Content`

### 6. List books by an author
- **Method and path:** `GET /api/books?author=Chinua%20Achebe`
- **Description:** Returns only the books written by the author given in the query parameter.
- **Request body:** none
- **Success status:** `200 OK`

### 7. Partially update a book (extra)
- **Method and path:** `PATCH /api/books/{id}`
- **Description:** Changes only the fields that are sent.
- **Example request body:**

```json
  {
    "year": 1959
  }
```

- **Success status:** `200 OK`

## Error codes

- **400 Bad Request:** the request is invalid. Example: `POST /api/books` is sent without a `title`, or with `year` set to the text "abc" instead of a number.
- **404 Not Found:** the requested resource doesn't exist. Example: `GET /api/books/9999` when no book has the id 9999.