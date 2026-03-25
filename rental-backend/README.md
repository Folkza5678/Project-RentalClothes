# Rental Clothes Backend (Flask)

This is the Flask version of the Rental Clothes backend, converted from Node.js.

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up MySQL database:
   - Create a MySQL database named `rental_clothes`
   - Run the `database.sql` file to create tables and seed data
   - Set environment variables in `.env` file:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=rental_clothes
     JWT_SECRET=your_jwt_secret
     UPLOAD_PATH=uploads/
     PORT=3000
     ```

3. Uncomment the database-related code in `app.py`, `routes/auth.py`, etc.

4. Run the server:
   ```bash
   python app.py
   ```

The server will start at `http://localhost:3000` and serve `main.html` at the root path.

## API Routes

- `GET /` - Serves main.html
- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile (requires auth)
- `PUT /api/auth/me` - Update user profile (requires auth)
- `GET /api/dashboard` - Admin dashboard stats (requires admin auth)

Static files (HTML, CSS, JS) are served from the parent directory.