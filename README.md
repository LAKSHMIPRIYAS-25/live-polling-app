# 🔴 Live Polling App

> ⚡ A real-time polling platform where users can create polls, share them, vote, and watch results update live.

---

## ✨ Features

- 📝 Create polls
- ➕ Add multiple poll options
- 🗳️ Vote on poll options
- 🔒 One vote per user per poll
- 📊 Live vote counts
- 📈 Live vote percentages
- ⚡ Real-time result updates
- 🔗 Shareable poll links
- 📱 Responsive user interface
- 🎨 Modern and attractive UI
- 🛡️ Input validation
- ❌ Error handling
- 🍃 MongoDB data storage
- ⚡ Redis/Memurai real-time messaging
- 🚀 REST API using Go and Gin
- 🔄 Server-Sent Events (SSE)
- 🌐 CORS support

---

## 🛠️ Tech Stack

**Frontend**

`React` · `Vite` · `JavaScript` · `CSS`

**Backend**

`Go` · `Gin`

**Database**

`MongoDB`

**Real-Time**

`Redis / Memurai` · `Server-Sent Events (SSE)`

---

## 🏗️ Architecture

```text
                 ┌──────────────────┐
                 │   React + Vite   │
                 │    Frontend      │
                 └────────┬─────────┘
                          │
                     REST API / SSE
                          │
                          ▼
                 ┌──────────────────┐
                 │    Go + Gin      │
                 │     Backend      │
                 └───────┬──────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
        ┌──────────────┐   ┌──────────────┐
        │   MongoDB    │   │ Redis/Memurai│
        │ Poll & Votes │   │ Real-Time    │
        └──────────────┘   └──────┬───────┘
                                  │
                                  ▼
                         ┌────────────────┐
                         │      SSE       │
                         │ Live Updates   │
                         └────────────────┘

---

## 📁 Project Structure

```text
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

Make sure the following are installed:

Go
Node.js
npm
MongoDB
Redis or Memurai

For Windows development, Memurai can be used as the Redis-compatible server.

---

## 🚀 Getting Started

1. **Clone the Repository**
git clone https://github.com/LAKSHMIPRIYAS-25/live-polling-app.git
cd live-polling-app

2. **Start MongoDB**

Make sure MongoDB is running on your system.

3. **Start Redis / Memurai**

For Memurai:

memurai-cli ping

Expected response:

PONG
4. **Start Backend**

Open Terminal 1:

cd backend
go mod tidy
go run .

Backend runs at:

http://localhost:8080

5. **Start Frontend**

Open Terminal 2:

cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:5173

Open the application in your browser:

http://localhost:5173

---

## 🔐 Environment Variables

Create:

frontend/.env

Add:

VITE_API_URL=http://localhost:8080/api

⚠️ Never commit passwords, API keys, or sensitive credentials to GitHub.

---

## 🔌 API Endpoints

| Method | Endpoint                        | Purpose                   |
| :----: | ------------------------------- | ------------------------- |
| `POST` | `/api/polls`                    | Create a poll             |
|  `GET` | `/api/polls`                    | Get all polls             |
|  `GET` | `/api/polls/:id`                | Get a specific poll       |
| `POST` | `/api/polls/:id/vote/:optionId` | Submit a vote             |
|  `GET` | `/api/polls/:id/stream`         | Receive real-time updates |

---

⚡ Real-Time Voting

The application uses Redis/Memurai + Server-Sent Events (SSE) for live updates.

User votes
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

No manual page refresh is required

---

## 🔒 Vote Protection

A unique voter ID is stored in the browser's localStorage.

The frontend sends:

X-Voter-ID

with the vote request.

The backend validates the voter before recording the vote to prevent duplicate voting for the same poll.

---

## 🧪 Testing

**Poll Creation**

 Create a poll
 Add multiple options
 View created poll
 Share poll link

**Voting**

 Select an option
 Submit vote
 Verify vote count
 Verify percentage
 Try duplicate voting

**Real-Time**

 Open the same poll in two browser tabs
 Vote from one tab
 Verify the other tab updates automatically
 Confirm no page refresh is required

## 📱 Responsive Design

The application is designed for:

💻 Desktop
💻 Laptop
📱 Tablet
📱 Mobile

##🔮 Future Improvements

User authentication
User profiles
Admin dashboard
Poll expiration
Advanced analytics
Vote history
Production deployment
Automated testing

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

## 📄 License

This project is created for learning and demonstration purposes.

##👩‍💻 Author

**LakshmiPriya S**

**Live Polling App**

Built with:

React · Go · Gin · MongoDB · Redis/Memurai · SSE

⭐ If you find this project useful, consider giving it a star!