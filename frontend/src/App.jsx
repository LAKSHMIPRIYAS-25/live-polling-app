import { useEffect, useState } from "react";
import {
  Link,
  Route,
  Routes,
} from "react-router-dom";

import PollPage from "./PollPage";

const API_URL =
  "https://live-polling-app-4.onrender.com/api";

// ========================================
// SAFE RESPONSE READER
// ========================================

async function readResponse(response) {
  const text = await response.text();

  if (!text || !text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(
      "Invalid JSON response:",
      text
    );

    return {
      error: text,
    };
  }
}

// ========================================
// GET POLL ID
// ========================================

function getPollId(poll) {
  if (!poll) {
    return null;
  }

  if (poll.id) {
    return String(poll.id);
  }

  if (poll._id) {
    if (typeof poll._id === "string") {
      return poll._id;
    }

    if (poll._id.$oid) {
      return String(poll._id.$oid);
    }
  }

  return null;
}

// ========================================
// HOME PAGE
// ========================================

function HomePage() {
  const [polls, setPolls] = useState([]);

  const [question, setQuestion] =
    useState("");

  const [options, setOptions] = useState([
    "",
    "",
  ]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [deleting, setDeleting] =
    useState({});

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ========================================
  // VOTER ID
  // ========================================

  const [voterId] = useState(() => {
    let id =
      localStorage.getItem("voterId");

    if (!id) {
      id = crypto.randomUUID();

      localStorage.setItem(
        "voterId",
        id
      );
    }

    return id;
  });

  // ========================================
  // FETCH POLLS
  // ========================================

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/polls`
      );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to load polls (${response.status})`
        );
      }

      setPolls(
        Array.isArray(data.polls)
          ? data.polls
          : []
      );
    } catch (err) {
      console.error(
        "Fetch polls error:",
        err
      );

      setError(
        err.message ||
          "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    fetchPolls();
  }, []);

  // ========================================
  // REAL-TIME UPDATES
  // ========================================

  useEffect(() => {
    if (polls.length === 0) {
      return;
    }

    const connections = [];

    polls.forEach((poll) => {
      const pollId =
        getPollId(poll);

      if (!pollId) {
        return;
      }

      const eventSource =
        new EventSource(
          `${API_URL}/polls/${pollId}/stream`
        );

      eventSource.addEventListener(
        "poll-update",
        (event) => {
          try {
            const payload =
              JSON.parse(event.data);

            const updatedPoll =
              payload.data ?? payload;

            // ------------------------------
            // DELETED POLL
            // ------------------------------

            if (
              updatedPoll?.type ===
                "deleted" ||
              payload?.type ===
                "deleted"
            ) {
              const deletedId =
                String(
                  updatedPoll?.pollId ||
                    payload?.pollId ||
                    pollId
                );

              setPolls(
                (currentPolls) =>
                  currentPolls.filter(
                    (existingPoll) => {
                      const existingId =
                        getPollId(
                          existingPoll
                        );

                      return (
                        existingId !==
                        deletedId
                      );
                    }
                  )
              );

              return;
            }

            // ------------------------------
            // UPDATED POLL
            // ------------------------------

            if (updatedPoll) {
              setPolls(
                (currentPolls) =>
                  currentPolls.map(
                    (existingPoll) => {
                      const existingId =
                        getPollId(
                          existingPoll
                        );

                      if (
                        existingId ===
                        pollId
                      ) {
                        return updatedPoll;
                      }

                      return existingPoll;
                    }
                  )
              );
            }
          } catch (err) {
            console.error(
              "Live update error:",
              err
            );
          }
        }
      );

      eventSource.onerror = () => {
        console.log(
          "Real-time connection interrupted."
        );
      };

      connections.push(
        eventSource
      );
    });

    return () => {
      connections.forEach(
        (connection) => {
          connection.close();
        }
      );
    };
  }, [polls.length]);

  // ========================================
  // ADD OPTION
  // ========================================

  const addOption = () => {
    if (options.length >= 10) {
      setError(
        "Maximum 10 options are allowed."
      );

      return;
    }

    setOptions([
      ...options,
      "",
    ]);

    setError("");
  };

  // ========================================
  // REMOVE OPTION
  // ========================================

  const removeOption = (index) => {
    if (options.length <= 2) {
      setError(
        "At least 2 options are required."
      );

      return;
    }

    setOptions(
      options.filter(
        (_, i) => i !== index
      )
    );

    setError("");
  };

  // ========================================
  // UPDATE OPTION
  // ========================================

  const updateOption = (
    index,
    value
  ) => {
    setOptions(
      options.map(
        (option, i) =>
          i === index
            ? value
            : option
      )
    );

    setError("");
  };

  // ========================================
  // CREATE POLL
  // ========================================

  const createPoll = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanQuestion =
      question.trim();

    if (!cleanQuestion) {
      setError(
        "Question is required."
      );

      return;
    }

    if (cleanQuestion.length < 3) {
      setError(
        "Question must be at least 3 characters."
      );

      return;
    }

    if (cleanQuestion.length > 200) {
      setError(
        "Question must not exceed 200 characters."
      );

      return;
    }

    const cleanOptions =
      options.map((option) =>
        option.trim()
      );

    if (cleanOptions.length < 2) {
      setError(
        "At least 2 options are required."
      );

      return;
    }

    if (
      cleanOptions.some(
        (option) => option === ""
      )
    ) {
      setError(
        "All options are required."
      );

      return;
    }

    const normalizedOptions =
      cleanOptions.map(
        (option) =>
          option.toLowerCase()
      );

    const hasDuplicates =
      new Set(
        normalizedOptions
      ).size !==
      normalizedOptions.length;

    if (hasDuplicates) {
      setError(
        "Duplicate options are not allowed."
      );

      return;
    }

    try {
      setCreating(true);

      const response =
        await fetch(
          `${API_URL}/polls`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              question:
                cleanQuestion,

              options:
                cleanOptions.map(
                  (text) => ({
                    text,
                  })
                ),
            }),
          }
        );

      const data =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to create poll (${response.status})`
        );
      }

      if (!data.poll) {
        throw new Error(
          "Server did not return poll data."
        );
      }

      setPolls(
        (currentPolls) => [
          data.poll,
          ...currentPolls,
        ]
      );

      setQuestion("");

      setOptions([
        "",
        "",
      ]);

      setSuccess(
        "✓ Poll created successfully!"
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);

    } catch (err) {
      console.error(
        "Create poll error:",
        err
      );

      setError(
        err.message ||
          "Unable to create poll."
      );

    } finally {
      setCreating(false);
    }
  };

  // ========================================
  // DELETE POLL
  // ========================================

  const deletePoll = async (pollId) => {
    if (!pollId) {
      setError(
        "Invalid poll ID."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this poll?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(
        (current) => ({
          ...current,
          [pollId]: true,
        })
      );

      setError("");
      setSuccess("");

      console.log(
        "Deleting poll:",
        pollId
      );

      const response =
        await fetch(
          `${API_URL}/polls/${encodeURIComponent(
            pollId
          )}`,
          {
            method: "DELETE",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      /*
       * IMPORTANT:
       * Do NOT use response.json()
       * here.
       *
       * Render may sometimes return
       * an empty response.
       */

      const data =
        await readResponse(
          response
        );

      console.log(
        "Delete response:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to delete poll (${response.status})`
        );
      }

      // ------------------------------
      // REMOVE FROM UI
      // ------------------------------

      setPolls(
        (currentPolls) =>
          currentPolls.filter(
            (poll) => {
              const id =
                getPollId(poll);

              return (
                id !==
                String(pollId)
              );
            }
          )
      );

      setSuccess(
        "✓ Poll deleted successfully!"
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);

    } catch (err) {
      console.error(
        "Delete poll error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete poll."
      );

    } finally {
      setDeleting(
        (current) => ({
          ...current,
          [pollId]: false,
        })
      );
    }
  };

  // ========================================
  // SHARE POLL
  // ========================================

  const sharePoll = async (pollId) => {
    if (!pollId) {
      return;
    }

    const shareUrl =
      `${window.location.origin}/live-polling-app/poll/${pollId}`;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            "Live Poll",

          text:
            "Vote in this live poll!",

          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(
          shareUrl
        );

        setSuccess(
          "✓ Poll link copied!"
        );

        setTimeout(() => {
          setSuccess("");
        }, 2500);
      }
    } catch (err) {
      console.log(
        "Share cancelled:",
        err
      );
    }
  };

  // ========================================
  // TOTAL VOTES
  // ========================================

  const getTotalVotes = (poll) => {
    if (
      !poll ||
      !Array.isArray(
        poll.options
      )
    ) {
      return 0;
    }

    return poll.options.reduce(
      (
        total,
        option
      ) =>
        total +
        Number(
          option.votes || 0
        ),
      0
    );
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <div className="app">

        <header className="navbar">

          <div className="nav-container">

            <Link
              to="/"
              className="logo"
            >
              Live Polling
            </Link>

            <div className="live-badge">

              <span className="live-dot"></span>

              LIVE

            </div>

          </div>

        </header>

        <main className="container">

          <div className="loading-state">

            <div className="spinner"></div>

            <p>
              Loading polls...
            </p>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // MAIN UI
  // ========================================

  return (
    <div className="app">

      {/* NAVBAR */}

      <header className="navbar">

        <div className="nav-container">

          <Link
            to="/"
            className="logo"
          >
            Live Polling
          </Link>

          <div className="live-badge">

            <span className="live-dot"></span>

            LIVE

          </div>

        </div>

      </header>

      {/* MAIN */}

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <span className="hero-badge">
            ⚡ Real-Time Voting
          </span>

          <h1>
            Create.
            <br />
            Share.
            <br />

            <span>
              Vote Live.
            </span>
          </h1>

          <p>
            Create interactive polls
            and watch results update
            instantly in real time.
          </p>

        </section>

        {/* CREATE POLL */}

        <section className="create-section">

          <div className="section-heading">

            <div>

              <span className="section-label">
                CREATE
              </span>

              <h2>
                Create a New Poll
              </h2>

              <p>
                Ask a question and
                let people vote.
              </p>

            </div>

          </div>

          <form
            className="poll-form"
            onSubmit={createPoll}
          >

            {/* QUESTION */}

            <div className="form-group">

              <label>
                Question
              </label>

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target.value
                  )
                }
                placeholder="What should we build next?"
                maxLength={200}
              />

              <div className="character-count">
                {question.length}/200
              </div>

            </div>

            {/* OPTIONS */}

            <div className="form-group">

              <div className="options-heading">

                <label>
                  Options
                </label>

                <span>
                  {options.length}/10
                </span>

              </div>

              <div className="create-options">

                {options.map(
                  (
                    option,
                    index
                  ) => (

                    <div
                      className="create-option-row"
                      key={index}
                    >

                      <input
                        type="text"
                        value={option}
                        onChange={(event) =>
                          updateOption(
                            index,
                            event.target.value
                          )
                        }
                        placeholder={`Option ${
                          index + 1
                        }`}
                        maxLength={100}
                      />

                      {options.length >
                        2 && (

                        <button
                          type="button"
                          className="remove-option"
                          onClick={() =>
                            removeOption(
                              index
                            )
                          }
                        >
                          ×
                        </button>

                      )}

                    </div>

                  )
                )}

              </div>

              <button
                type="button"
                className="add-option-button"
                onClick={addOption}
                disabled={
                  options.length >=
                  10
                }
              >
                + Add Option
              </button>

            </div>

            {/* ERROR */}

            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="create-button"
              disabled={creating}
            >
              {creating
                ? "Creating Poll..."
                : "Create Poll →"}
            </button>

          </form>

        </section>

        {/* POLLS */}

        <section className="polls-section">

          <div className="section-heading">

            <div>

              <span className="section-label">
                EXPLORE
              </span>

              <h2>
                Live Polls
              </h2>

              <p>
                Vote and watch the
                results update instantly.
              </p>

            </div>

            <div className="poll-count">

              {polls.length}{" "}

              {polls.length === 1
                ? "Poll"
                : "Polls"}

            </div>

          </div>

          {/* ERROR */}

          {error &&
            polls.length === 0 && (

            <div className="error-card">

              <h3>
                ❌ Unable to load polls
              </h3>

              <p>
                {error}
              </p>

              <button
                className="retry-button"
                onClick={fetchPolls}
              >
                Try Again
              </button>

            </div>

          )}

          {/* EMPTY */}

          {!error &&
            polls.length === 0 && (

            <div className="empty-state">

              <div className="empty-icon">
                📊
              </div>

              <h3>
                No polls yet
              </h3>

              <p>
                Create the first poll
                and start collecting
                votes.
              </p>

            </div>

          )}

          {/* POLL GRID */}

          {polls.length > 0 && (

            <div className="poll-grid">

              {polls.map(
                (poll) => {

                  const pollId =
                    getPollId(poll);

                  const totalVotes =
                    getTotalVotes(
                      poll
                    );

                  const isDeleting =
                    pollId
                      ? deleting[
                          pollId
                        ]
                      : false;

                  return (

                    <article
                      className="poll-card"
                      key={
                        pollId ||
                        Math.random()
                      }
                    >

                      {/* HEADER */}

                      <div className="poll-card-header">

                        <span className="live-label">

                          <span className="live-dot"></span>

                          LIVE

                        </span>

                        <span className="card-votes">

                          👥{" "}
                          {totalVotes}

                        </span>

                      </div>

                      {/* QUESTION */}

                      <h3>
                        {
                          poll.question
                        }
                      </h3>

                      {/* OPTIONS */}

                      <div className="card-options">

                        {Array.isArray(
                          poll.options
                        ) &&
                          poll.options.map(
                            (
                              option
                            ) => {

                              const percentage =
                                totalVotes ===
                                0
                                  ? 0
                                  : Math.round(
                                      (
                                        Number(
                                          option.votes ||
                                            0
                                        ) /
                                        totalVotes
                                      ) *
                                        100
                                    );

                              return (

                                <div
                                  className="card-option"
                                  key={
                                    option.id
                                  }
                                >

                                  <div className="card-option-top">

                                    <span>
                                      {
                                        option.text
                                      }
                                    </span>

                                    <span>
                                      {
                                        option.votes
                                      }
                                    </span>

                                  </div>

                                  <div className="mini-progress">

                                    <div
                                      className="mini-progress-bar"
                                      style={{
                                        width: `${percentage}%`,
                                      }}
                                    />

                                  </div>

                                </div>

                              );
                            }
                          )}

                      </div>

                      {/* ACTIONS */}

                      <div className="poll-actions">

                        <Link
                          to={`/poll/${pollId}`}
                          className="view-button"
                        >
                          View Poll →
                        </Link>

                        <button
                          type="button"
                          className="share-button"
                          onClick={() =>
                            sharePoll(
                              pollId
                            )
                          }
                          disabled={
                            isDeleting
                          }
                        >
                          🔗 Share
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            deletePoll(
                              pollId
                            )
                          }
                          disabled={
                            isDeleting ||
                            !pollId
                          }
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "🗑️ Delete"}
                        </button>

                      </div>

                    </article>

                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <p>
          Live Polling App ·
          Real-time voting powered by
          Go, MongoDB & Redis
        </p>

      </footer>

    </div>
  );
}

// ========================================
// APP ROUTES
// ========================================

function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <HomePage />
        }
      />

      <Route
        path="/poll/:id"
        element={
          <PollPage />
        }
      />

    </Routes>
  );
}

export default App;