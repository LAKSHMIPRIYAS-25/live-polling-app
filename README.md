# 🔴 Live Polling App

> ⚡ A modern real-time polling application where users can create polls, share them, vote, and view live results without refreshing the page.

---

## ✨ Features

- 📝 Create polls
- ➕ Add multiple options
- 🔗 Shareable poll links
- 🗳️ Vote on poll options
- 🔒 One vote per user per poll
- 📊 Live vote counts
- 📈 Live vote percentages
- ⚡ Real-time result updates
- 📱 Responsive and attractive UI
- 🛡️ Input validation
- ❌ Error handling

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Fetch API
- Server-Sent Events (SSE)

### Backend

- Go
- Gin Framework
- REST API

### Database

- MongoDB

### Real-Time Communication

- Redis / Memurai
- Server-Sent Events (SSE)

---

## 🏗️ Application Architecture

    ┌──────────────────────┐
    │      React + Vite    │
    │       Frontend       │
    └──────────┬───────────┘
               │
               │ REST API / SSE
               ▼
    ┌──────────────────────┐
    │       Go + Gin       │
    │        Backend       │
    └──────────┬───────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    ┌─────────┐   ┌──────────────┐
    │ MongoDB │   │ Redis/Memurai│
    │         │   │              │
    │ Polls   │   │ Real-Time    │
    │ Votes   │   │ Pub/Sub      │
    └─────────┘   └──────┬───────┘
                          │
                          ▼
                    ┌──────────┐
                    │   SSE    │
                    └────┬─────┘
                         │
                         ▼
                  Connected Users
                         │
                         ▼
                   Live Results

---

## 📁 Project Structure

    live-polling-app/
    │
    ├── backend/
    │   ├── config/
    │   │   ├── database.go
    │   │   ├── redis.go
    │   │   └── realtime.go
    │   │
    │   ├── controllers/
    │   │   ├── poll_controller.go
    │   │   └── realtime_controller.go
    │   │
    │   ├── models/
    │   │   └── poll.go
    │   │
    │   ├── routes/
    │   │   └── routes.go
    │   │
    │   ├── main.go
    │   ├── go.mod
    │   └── go.sum
    │
    ├── frontend/
    │   ├── src/
    │   │   ├── App.jsx
    │   │   ├── App.css
    │   │   ├── PollPage.jsx
    │   │   ├── index.css
    │   │   └── main.jsx
    │   │
    │   ├── package.json
    │   └── package-lock.json
    │
    ├── .gitignore
    └── README.md

---

## ⚙️ Requirements

Make sure the following are installed before running the project:

- Go
- Node.js
- npm
- MongoDB
- Redis or Memurai

For Windows development, Memurai can be used as a Redis-compatible server.

---

## 🚀 Getting Started

### 1. Clone the Repository

    git clone https://github.com/LAKSHMIPRIYAS-25/live-polling-app.git
    cd live-polling-app

### 2. Start MongoDB

Make sure MongoDB is running on your system.

### 3. Start Redis / Memurai

For Memurai:

    memurai-cli ping

Expected response:

    PONG

### 4. Start the Backend

Open a terminal:

    cd backend
    go mod tidy
    go run .

Backend runs at:

    http://localhost:8080

### 5. Start the Frontend

Open another terminal:

    cd frontend
    npm install
    npm run dev

Frontend runs at:

    http://localhost:5173

Open the application in your browser:

    http://localhost:5173

---

## 🔐 Environment Variables

Create the following file:

    frontend/.env

Add:

    VITE_API_URL=http://localhost:8080/api

Do not commit passwords, API keys, or other sensitive credentials to GitHub.

---

## 🔌 API Documentation

### 1. Create Poll

Method:

    POST

Endpoint:

    /api/polls

Description:

Creates a new poll with multiple options.

Example request:

    POST /api/polls

Example request body:

    {
      "question": "Which technology do you prefer?",
      "options": [
        {
          "text": "React"
        },
        {
          "text": "Vue"
        },
        {
          "text": "Angular"
        }
      ]
    }

---

### 2. Get All Polls

Method:

    GET

Endpoint:

    /api/polls

Description:

Returns all available polls.

---

### 3. Get Single Poll

Method:

    GET

Endpoint:

    /api/polls/:id

Description:

Returns details of a specific poll.

Example:

    GET /api/polls/6aac1580af40d571ae397c0d

---

### 4. Vote on Poll

Method:

    POST

Endpoint:

    /api/polls/:id/vote/:optionId

Description:

Records a vote for the selected option.

Required header:

    X-Voter-ID: unique-voter-id

Example:

    POST /api/polls/poll-id/vote/option-id

---

### 5. Real-Time Poll Stream

Method:

    GET

Endpoint:

    /api/polls/:id/stream

Description:

Provides real-time poll updates using Server-Sent Events.

---

## 📌 API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/polls | Create a poll |
| GET | /api/polls | Get all polls |
| GET | /api/polls/:id | Get a specific poll |
| POST | /api/polls/:id/vote/:optionId | Vote on an option |
| GET | /api/polls/:id/stream | Real-time poll updates |

---

## ⚡ Real-Time Voting Flow

    User
      ↓
    React Frontend
      ↓
    Go + Gin API
      ↓
    MongoDB
      ↓
    Redis / Memurai
      ↓
    Server-Sent Events
      ↓
    Connected Users
      ↓
    Live Results Update

The voting results are updated automatically without manually refreshing the page.

---

## 🔒 Vote Protection

The application uses a unique voter ID to prevent duplicate voting.

The voter ID is stored in the browser's localStorage.

The frontend sends the voter ID using:

    X-Voter-ID

The backend validates the voter before recording the vote.

If the same voter tries to vote again in the same poll, the vote is rejected.

---

## 🛡️ Input Validation

The backend validates poll creation requests.

Validation includes:

- Question is required
- At least 2 options are required
- Empty options are rejected
- Invalid poll IDs are rejected
- Invalid option IDs are rejected
- Invalid voting requests are handled

---

## 🧪 Testing Checklist

### Poll Creation

- [ ] Create a valid poll
- [ ] Add multiple options
- [ ] Verify poll is created
- [ ] Verify poll appears in the poll list
- [ ] Verify share link

### Voting

- [ ] Select an option
- [ ] Submit a vote
- [ ] Verify vote count
- [ ] Verify percentage
- [ ] Try voting again
- [ ] Verify duplicate vote is rejected

### Real-Time

- [ ] Open the same poll in two browser tabs
- [ ] Vote from the first tab
- [ ] Verify the second tab updates automatically
- [ ] Confirm no refresh is required

### Error Handling

- [ ] Test invalid poll ID
- [ ] Test invalid option ID
- [ ] Test invalid poll data
- [ ] Check browser console
- [ ] Check backend terminal

---

## 📱 Responsive Design

The application is designed to work across:

- 💻 Desktop
- 💻 Laptop
- 📱 Tablet
- 📱 Mobile

The UI adapts to different screen sizes for a better user experience.

---

## 🎨 User Interface

The application provides:

- Modern landing page
- Attractive poll creation interface
- Interactive poll cards
- Selectable voting options
- Live result progress bars
- Vote counts
- Vote percentages
- Loading states
- Error messages
- Success messages
- Share functionality
- Responsive layout

---

## 🔮 Future Improvements

- User authentication
- User registration and login
- User profiles
- Admin dashboard
- Poll expiration
- Advanced poll analytics
- Vote history
- Poll categories
- Production deployment
- Automated testing
- API rate limiting

---

## 📊 Project Highlights

    React + Vite
          │
          ├── Modern UI
          ├── Responsive Design
          └── Live Results
                  │
                  ▼
              Go + Gin
                  │
                  ├── REST API
                  ├── Validation
                  └── Vote Protection
                  │
             ┌────┴────┐
             ▼         ▼
         MongoDB   Redis/Memurai
                       │
                       ▼
                      SSE
                       │
                       ▼
                Real-Time Updates

---

## ▶️ Running the Complete Application

### Terminal 1 — Backend

    cd backend
    go run .

### Terminal 2 — Frontend

    cd frontend
    npm run dev

### Required Services

    MongoDB
    Redis / Memurai
    Go Backend
    React Frontend

### Application

    http://localhost:5173

### Backend API

    http://localhost:8080

---

## 📄 License

This project is created for learning and demonstration purposes.

---

## 👩‍💻 Author

### Lakshmipriya S

**Live Polling App**

Built with:

    React
    Go
    Gin
    MongoDB
    Redis / Memurai
    Server-Sent Events

---

⭐ If you find this project useful, consider giving it a star!