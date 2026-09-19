import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

const API_URL ="https://live-polling-app-4.onrender.com/api";

function PollPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [voting, setVoting] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [selectedOption, setSelectedOption] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

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

  // ========================================
  // GET POLL
  // ========================================

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          `${API_URL}/polls/${id}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load poll"
        );
      }

      setPoll(
        data.poll
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load poll."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    if (id) {
      fetchPoll();
    }
  }, [id]);

  // ========================================
  // REAL-TIME UPDATES
  // ========================================

  useEffect(() => {
    if (!id) {
      return;
    }

    const eventSource =
      new EventSource(
        `${API_URL}/polls/${id}/stream`
      );

    eventSource.addEventListener(
      "poll-update",
      (event) => {
        try {
          const payload =
            JSON.parse(
              event.data
            );

          const data =
            payload.data ??
            payload;

          // Poll deleted
          if (
            data?.type ===
              "deleted" ||
            payload?.type ===
              "deleted"
          ) {
            setPoll(null);

            setError(
              "This poll has been deleted."
            );

            eventSource.close();

            return;
          }

          if (data) {
            setPoll(data);
          }
        } catch (err) {
          console.error(
            "Real-time update error:",
            err
          );
        }
      }
    );

    eventSource.onerror = () => {
      // Do not show an error immediately.
      // Browser EventSource automatically retries.
      console.log(
        "Real-time connection interrupted."
      );
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // ========================================
  // VOTE
  // ========================================

  const vote = async () => {
    if (!selectedOption) {
      setError(
        "Please select an option."
      );

      return;
    }

    if (!poll) {
      return;
    }

    try {
      setVoting(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `${API_URL}/polls/${id}/vote/${selectedOption}`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "X-Voter-ID":
                voterId,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to submit vote."
        );
      }

      if (data.poll) {
        setPoll(
          data.poll
        );
      }

      setSuccess(
        "✓ Your vote has been recorded!"
      );

      setSelectedOption("");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(
        "Vote error:",
        err
      );

      setError(
        err.message ||
          "Unable to submit vote."
      );
    } finally {
      setVoting(false);
    }
  };

  // ========================================
  // DELETE POLL
  // ========================================

  const deletePoll = async () => {
    if (!poll) {
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
      setDeleting(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `${API_URL}/polls/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete poll."
        );
      }

      setSuccess(
        "✓ Poll deleted successfully!"
      );

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete poll."
      );

      setDeleting(false);
    }
  };

  // ========================================
  // SHARE
  // ========================================

  const sharePoll = async () => {
    const shareUrl =
      window.location.href;

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            poll?.question ||
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

  const getTotalVotes = () => {
    if (!poll?.options) {
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
  // PERCENTAGE
  // ========================================

  const getPercentage = (
    votes
  ) => {
    const total =
      getTotalVotes();

    if (total === 0) {
      return 0;
    }

    return Math.round(
      (Number(votes || 0) /
        total) *
        100
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
              Loading poll...
            </p>

          </div>

        </main>

      </div>
    );
  }

  // ========================================
  // POLL NOT FOUND
  // ========================================

  if (!poll) {
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

          <section className="poll-page">

            <div className="error-card">

              <div className="empty-icon">
                📊
              </div>

              <h2>
                Poll not found
              </h2>

              <p>
                {error ||
                  "This poll does not exist or has been deleted."}
              </p>

              <Link
                to="/"
                className="view-button"
              >
                ← Back to Polls
              </Link>

            </div>

          </section>

        </main>

      </div>
    );
  }

  const totalVotes =
    getTotalVotes();

  // ========================================
  // MAIN UI
  // ========================================

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
      {/* CONTENT */}
      {/* ================================== */}

      <main className="container">

        <section className="poll-page">

          {/* Back */}

          <Link
            to="/"
            className="back-link"
          >
            ← Back to all polls
          </Link>

          {/* ================================= */}
          {/* POLL HEADER */}
          {/* ================================= */}

          <div className="poll-detail-header">

            <div className="poll-detail-meta">

              <span className="live-label">

                <span className="live-dot"></span>

                LIVE

              </span>

              <span>
                👥 {totalVotes}{" "}
                {totalVotes === 1
                  ? "vote"
                  : "votes"}
              </span>

            </div>

            <h1>
              {poll.question}
            </h1>

            {poll.createdAt && (
              <p className="poll-date">
                Created{" "}
                {new Date(
                  poll.createdAt
                ).toLocaleString()}
              </p>
            )}

          </div>

          {/* ================================= */}
          {/* ALERTS */}
          {/* ================================= */}

          {error && (
            <div className="alert alert-error">
              ❌ {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          {/* ================================= */}
          {/* VOTING CARD */}
          {/* ================================= */}

          <section className="vote-card">

            <div className="section-heading">

              <div>

                <span className="section-label">
                  VOTE
                </span>

                <h2>
                  Choose an option
                </h2>

                <p>
                  Select one option and
                  submit your vote.
                </p>

              </div>

            </div>

            {/* Options */}

            <div className="poll-options">

              {poll.options.map(
                (option) => {

                  const percentage =
                    getPercentage(
                      option.votes
                    );

                  const isSelected =
                    selectedOption ===
                    option.id;

                  return (

                    <button
                      type="button"
                      key={
                        option.id
                      }
                      className={`poll-option ${
                        isSelected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedOption(
                          option.id
                        );

                        setError("");
                      }}
                      disabled={
                        voting ||
                        deleting
                      }
                    >

                      <div className="option-content">

                        <span className="option-radio">

                          {isSelected && (
                            <span className="radio-dot"></span>
                          )}

                        </span>

                        <span className="option-text">
                          {
                            option.text
                          }
                        </span>

                      </div>

                      <span className="option-votes">
                        {
                          option.votes
                        }
                      </span>

                    </button>

                  );
                }
              )}

            </div>

            {/* Vote Button */}

            <button
              type="button"
              className="create-button vote-submit"
              onClick={vote}
              disabled={
                voting ||
                deleting ||
                !selectedOption
              }
            >

              {voting
                ? "Submitting Vote..."
                : "Submit Vote →"}

            </button>

          </section>

          {/* ================================= */}
          {/* LIVE RESULTS */}
          {/* ================================= */}

          <section className="results-card">

            <div className="section-heading">

              <div>

                <span className="section-label">
                  RESULTS
                </span>

                <h2>
                  Live Results
                </h2>

                <p>
                  Results update
                  automatically.
                </p>

              </div>

              <div className="poll-count">
                {totalVotes}{" "}
                {totalVotes === 1
                  ? "Vote"
                  : "Votes"}
              </div>

            </div>

            <div className="results-list">

              {poll.options.map(
                (option) => {

                  const percentage =
                    getPercentage(
                      option.votes
                    );

                  return (

                    <div
                      className="result-item"
                      key={
                        option.id
                      }
                    >

                      <div className="result-top">

                        <span className="result-name">
                          {
                            option.text
                          }
                        </span>

                        <span className="result-value">
                          {
                            option.votes
                          }{" "}
                          (
                          {
                            percentage
                          }%)
                        </span>

                      </div>

                      <div className="progress">

                        <div
                          className="progress-bar"
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

          </section>

          {/* ================================= */}
          {/* ACTIONS */}
          {/* ================================= */}

          <section className="poll-page-actions">

            <button
              type="button"
              className="share-button"
              onClick={
                sharePoll
              }
              disabled={
                deleting
              }
            >
              🔗 Share Poll
            </button>

            <button
              type="button"
              className="delete-button"
              onClick={
                deletePoll
              }
              disabled={
                deleting ||
                voting
              }
            >

              {deleting
                ? "Deleting..."
                : "🗑️ Delete Poll"}

            </button>

          </section>

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

export default PollPage;