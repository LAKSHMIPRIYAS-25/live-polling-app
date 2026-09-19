import { useEffect, useState } from "react";
import {
  Link,
  Route,
  Routes,
} from "react-router-dom";

import PollPage from "./PollPage";

const API_URL ="https://live-polling-app-4.onrender.com/api";

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

  // ----------------------------------------
  // Voter ID
  // ----------------------------------------

  const [voterId] = useState(() => {
    let id =
      localStorage.getItem(
        "voterId"
      );

    if (!id) {
      id = crypto.randomUUID();

      localStorage.setItem(
        "voterId",
        id
      );
    }

    return id;
  });

  // ----------------------------------------
  // Fetch polls
  // ----------------------------------------

  const fetchPolls = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/polls`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load polls"
        );
      }

      setPolls(data.polls || []);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // ----------------------------------------
  // Real-time updates
  // ----------------------------------------

  useEffect(() => {
    if (polls.length === 0) {
      return;
    }

    const connections = [];

    polls.forEach((poll) => {
      const pollId =
        poll.id || poll._id;

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

            // Deleted poll event
            if (
              updatedPoll?.type ===
                "deleted" ||
              payload?.type ===
                "deleted"
            ) {
              const deletedId =
                updatedPoll?.pollId ||
                payload?.pollId ||
                pollId;

              setPolls(
                (currentPolls) =>
                  currentPolls.filter(
                    (existingPoll) => {
                      const existingId =
                        existingPoll.id ||
                        existingPoll._id;

                      return (
                        existingId !==
                        deletedId
                      );
                    }
                  )
              );

              return;
            }

            setPolls(
              (currentPolls) =>
                currentPolls.map(
                  (existingPoll) => {
                    const existingId =
                      existingPoll.id ||
                      existingPoll._id;

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
          } catch (err) {
            console.error(
              "Live update error:",
              err
            );
          }
        }
      );

      connections.push(
        eventSource
      );
    });

    return () => {
      connections.forEach(
        (connection) =>
          connection.close()
      );
    };
  }, [polls.length]);

  // ----------------------------------------
  // Add option
  // ----------------------------------------

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

  // ----------------------------------------
  // Remove option
  // ----------------------------------------

  const removeOption = (
    index
  ) => {
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

  // ----------------------------------------
  // Update option
  // ----------------------------------------

  const updateOption = (
    index,
    value
  ) => {
    const updatedOptions = [
      ...options,
    ];

    updatedOptions[index] =
      value;

    setOptions(
      updatedOptions
    );

    setError("");
  };

  // ----------------------------------------
  // Create poll
  // ----------------------------------------

  const createPoll = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Question validation

    const cleanQuestion =
      question.trim();

    if (!cleanQuestion) {
      setError(
        "Question is required."
      );

      return;
    }

    if (
      cleanQuestion.length < 3
    ) {
      setError(
        "Question must be at least 3 characters."
      );

      return;
    }

    if (
      cleanQuestion.length > 200
    ) {
      setError(
        "Question must not exceed 200 characters."
      );

      return;
    }

    // Option validation

    const cleanOptions =
      options.map((option) =>
        option.trim()
      );

    if (
      cleanOptions.length < 2
    ) {
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

    // Duplicate validation

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
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create poll"
        );
      }

      // Add new poll to top

      setPolls(
        (currentPolls) => [
          data.poll,
          ...currentPolls,
        ]
      );

      // Reset form

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
      console.error(err);

      setError(
        err.message ||
          "Unable to create poll."
      );
    } finally {
      setCreating(false);
    }
  };

  // ----------------------------------------
  // Delete poll
  // ----------------------------------------

  const deletePoll = async (
    pollId
  ) => {
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

      const response =
        await fetch(
          `${API_URL}/polls/${pollId}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete poll"
        );
      }

      // Remove immediately from UI

      setPolls(
        (currentPolls) =>
          currentPolls.filter(
            (poll) => {
              const id =
                poll.id ||
                poll._id;

              return id !==
                pollId;
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

  // ----------------------------------------
  // Share poll
  // ----------------------------------------

  const sharePoll = async (
    pollId
  ) => {
    const shareUrl =
      `${window.location.origin}/poll/${pollId}`;

    try {
      if (navigator.share) {
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

  // ----------------------------------------
  // Calculate total votes
  // ----------------------------------------

  const getTotalVotes = (
    poll
  ) => {
    return poll.options.reduce(
      (total, option) =>
        total +
        Number(
          option.votes || 0
        ),
      0
    );
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <div className="app">

      {/* ================================== */}
      {/* NAVBAR */}
      {/* ================================== */}

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

      {/* ================================== */}
      {/* MAIN */}
      {/* ================================== */}

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

        {/* ================================= */}
        {/* CREATE POLL */}
        {/* ================================= */}

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

            {/* Question */}

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

            {/* Options */}

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
                        onChange={(
                          event
                        ) =>
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

            {/* Error */}

            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            {/* Success */}

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {/* Submit */}

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

        {/* ================================= */}
        {/* POLLS */}
        {/* ================================= */}

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

          {/* Loading */}

          {loading && (
            <div className="loading-state">

              <div className="spinner"></div>

              <p>
                Loading polls...
              </p>

            </div>
          )}

          {/* Error */}

          {!loading &&
            error &&
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

          {/* Empty */}

          {!loading &&
            !error &&
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

          {/* Poll Cards */}

          {!loading &&
            polls.length > 0 && (

              <div className="poll-grid">

                {polls.map(
                  (poll) => {

                    const pollId =
                      poll.id ||
                      poll._id;

                    const totalVotes =
                      getTotalVotes(
                        poll
                      );

                    const isDeleting =
                      deleting[
                        pollId
                      ];

                    return (

                      <article
                        className="poll-card"
                        key={pollId}
                      >

                        {/* Card Header */}

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

                        {/* Question */}

                        <h3>
                          {poll.question}
                        </h3>

                        {/* Results Preview */}

                        <div className="card-options">

                          {poll.options.map(
                            (option) => {

                              const percentage =
                                totalVotes ===
                                0
                                  ? 0
                                  : Math.round(
                                      (Number(
                                        option.votes ||
                                          0
                                      ) /
                                        totalVotes) *
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
                                    ></div>

                                  </div>

                                </div>

                              );
                            }
                          )}

                        </div>

                        {/* Actions */}

                        <div className="poll-actions">

                          <Link
                            to={`/poll/${pollId}`}
                            className="view-button"
                          >
                            View Poll →
                          </Link>

                          <button
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
                              isDeleting
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

      {/* ================================== */}
      {/* FOOTER */}
      {/* ================================== */}

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
        element={<HomePage />}
      />

      <Route
        path="/poll/:id"
        element={<PollPage />}
      />

    </Routes>
  );
}

export default App;