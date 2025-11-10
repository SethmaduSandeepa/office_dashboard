# Company Ratings System

A professional company ratings management system with authentication, CRUD operations, and video support.

## Features

- 📊 Company and subcompany rating management (0-100 scale)
- 🔐 Session-based authentication
- 📹 Video support (YouTube URLs and file uploads)
- 💼 Professional admin interface
- 📱 Responsive design optimized for 55" TV displays
- 🎨 Dark theme UI

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ODM)
- **File Upload**: Multer
- **Session Management**: express-session
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd company-ratings
```

2. Install dependencies:
```bash
npm install
```

3. Configure MongoDB:
   - Update the MongoDB URI in `server.js` with your connection string
   - Or set it as an environment variable

4. Start the server:
```bash
npm start
```

5. Access the application:
   - Dashboard: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin.html
   - Login: http://localhost:3000/login.html

## Environment Variables (Optional)

Create a `.env` file:
```
PORT=3000
SESSION_SECRET=your-secret-key
ADMIN_USER=admin
ADMIN_PASSWORD=your-password
MONGODB_URI=your-mongodb-connection-string
```

## Default Credentials

- Username: `admin`
- Password: `admin123`

**⚠️ Change these in production!**

## Project Structure

```
company-ratings/
├── server.js           # Express server & API endpoints
├── app.js              # Entry point
├── package.json        # Dependencies
├── public/             # Static files
│   ├── index.html      # Dashboard
│   ├── admin.html      # Admin interface
│   ├── login.html      # Login page
│   ├── add.html        # Add/Update form
│   ├── company.html    # Detail view
│   ├── style.css       # Styles
│   └── uploads/        # Uploaded videos
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Check auth status

### Companies
- `GET /api/companies` - Get all companies (with query params)
- `GET /api/company` - Get single company
- `POST /api/update` - Create/update company
- `POST /api/delete` - Delete company

### Video
- `POST /api/upload-video` - Upload video file

## Usage

### Adding a Company Rating
1. Log in with admin credentials
2. Navigate to Admin page
3. Fill in company name, subcompany, and rating (0-100)
4. Optionally add YouTube URL or upload video
5. Click "Save / Update"

### Managing Videos
- **Option 1**: Paste YouTube URL and click Preview
- **Option 2**: Upload video file from computer, preview it, then upload to server

### Viewing Dashboard
- Public-facing dashboard shows up to 50 companies
- Optimized for 55" TV display
- Click any card for detailed view

## Security Notes

- Change default admin credentials
- Use environment variables for sensitive data
- Set strong SESSION_SECRET in production
- Enable HTTPS in production
- Consider rate limiting for API endpoints

## License

MIT

## Author

Your Name
