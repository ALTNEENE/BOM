#BOM Engineers Backend API

A robust, scalable Node.js backend for theBOM Engineers project management application. Built with Express.js and MongoDB, featuring JWT authentication, role-based access control, and comprehensive API endpoints.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with access & refresh tokens
  - Role-based access control (Admin, Manager, User)
  - Password reset via email
  - Email verification
  - Multi-device session management

- **Project Management**
  - Create, update, delete projects
  - Project members with role-based permissions
  - Project archiving
  - Activity timeline
  - Progress tracking

- **Task Management**
  - Full CRUD operations
  - Status workflow (Todo → In Progress → Review → Completed)
  - Priority levels
  - Assignee management
  - Subtasks support
  - Checklist items
  - Task watchers
  - Drag & drop reordering

- **Team Collaboration**
  - Team creation and management
  - Invite codes for easy joining
  - Member roles (Admin, Moderator, Member)

- **Communication**
  - Task comments with threading
  - @mentions support
  - Emoji reactions
  - Real-time notifications

- **Security**
  - Helmet.js security headers
  - Rate limiting
  - Input validation
  - XSS protection
  - CORS configuration

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6+ (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd team-sync-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## ⚙️ Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/team-sync

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRE=30d

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@BOM Engineers.com
FROM_NAME=Team Sync

# Frontend
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Project Structure

```
team-sync-backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── projectController.js # Project operations
│   ├── taskController.js    # Task operations
│   ├── commentController.js # Comments & reactions
│   ├── teamController.js    # Team management
│   └── notificationController.js
├── middleware/
│   ├── auth.js              # JWT verification
│   └── errorHandler.js      # Global error handling
├── models/
│   ├── User.js
│   ├── Project.js
│   ├── Task.js
│   ├── Comment.js
│   ├── Team.js
│   ├── Activity.js
│   └── Notification.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── projectRoutes.js
│   ├── taskRoutes.js
│   ├── commentRoutes.js
│   ├── teamRoutes.js
│   └── notificationRoutes.js
├── utils/
│   ├── errors.js            # Custom error classes
│   ├── helpers.js           # Utility functions
│   ├── email.js             # Email service
│   └── seeder.js            # Database seeder
├── validators/
│   └── index.js             # Request validation
├── server.js                # App entry point
├── package.json
└── .env.example
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| PUT | `/api/v1/auth/reset-password/:token` | Reset password |
| GET | `/api/v1/auth/verify-email/:token` | Verify email |
| PUT | `/api/v1/auth/change-password` | Change password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List users (admin) |
| GET | `/api/v1/users/search` | Search users |
| GET | `/api/v1/users/:id` | Get user by ID |
| PUT | `/api/v1/users/profile` | Update profile |
| PUT | `/api/v1/users/preferences` | Update preferences |
| PUT | `/api/v1/users/:id` | Update user (admin) |
| DELETE | `/api/v1/users/:id` | Delete user (admin) |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List user's projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/:id` | Get project |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |
| PUT | `/api/v1/projects/:id/archive` | Archive/unarchive |
| GET | `/api/v1/projects/:id/activity` | Get activity timeline |
| GET | `/api/v1/projects/:id/stats` | Get statistics |
| POST | `/api/v1/projects/:id/members` | Add member |
| DELETE | `/api/v1/projects/:id/members/:userId` | Remove member |
| PUT | `/api/v1/projects/:id/members/:userId` | Update member role |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tasks` | List tasks |
| GET | `/api/v1/tasks/my-tasks` | Get assigned tasks |
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks/:id` | Get task |
| PUT | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Delete task |
| PUT | `/api/v1/tasks/:id/status` | Update status |
| POST | `/api/v1/tasks/:id/watch` | Toggle watcher |
| PUT | `/api/v1/tasks/reorder` | Reorder tasks |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/comments/task/:taskId` | Get task comments |
| POST | `/api/v1/comments` | Create comment |
| PUT | `/api/v1/comments/:id` | Update comment |
| DELETE | `/api/v1/comments/:id` | Delete comment |
| POST | `/api/v1/comments/:id/reactions` | Add reaction |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/teams` | List teams |
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/teams/:id` | Get team |
| PUT | `/api/v1/teams/:id` | Update team |
| DELETE | `/api/v1/teams/:id` | Delete team |
| POST | `/api/v1/teams/:id/members` | Add member |
| DELETE | `/api/v1/teams/:id/members/:userId` | Remove member |
| POST | `/api/v1/teams/:id/invite-code` | Generate invite code |
| POST | `/api/v1/teams/join/:code` | Join with code |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | Get notifications |
| GET | `/api/v1/notifications/unread-count` | Get unread count |
| PUT | `/api/v1/notifications/:id/read` | Mark as read |
| PUT | `/api/v1/notifications/read-all` | Mark all as read |
| DELETE | `/api/v1/notifications/:id` | Delete notification |

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Access Token**: Short-lived token (7 days default) for API requests
2. **Refresh Token**: Long-lived token (30 days default) for getting new access tokens

### Request Headers
```
Authorization: Bearer <access_token>
```

### Cookie-based Auth
Tokens are also set as HTTP-only cookies for added security.

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "status": "fail",
  "message": "Error description",
  "errors": [...]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## 🧪 Testing

### Test Accounts (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@BOM Engineers.com | Admin@123 |
| Manager | john@BOM Engineers.com | John@123 |
| User | jane@BOM Engineers.com | Jane@123 |

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For support, email support@BOM Engineers.com or open an issue on GitHub.
