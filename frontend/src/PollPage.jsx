import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function PollPage() {
  const { id } = useParams();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // VOTER ID
  // --------------------------------------------------

  const [voterId] = useState(() => {
    let storedId =
      localStorage.getItem("voterId");

    if (!storedId) {
      storedId = crypto.randomUUID();

      localStorage.setItem(
        "voterId",
        storedId
      );
    }

    return storedId;
  });

  // --------------------------------------------------
  // CHECK LOCAL VOTE STATUS
  // --------------------------------------------------

  const [hasVoted, setHasVoted] =
    useState(() => {
      return (
        localStorage.getItem(
          `voted_${id}`
        ) === "true"
      );
    });

  // --------------------------------------------------
  // FETCH POLL
  // --------------------------------------------------

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/polls/${id}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Poll not found"
        );
      }

      setPoll(data.poll);
    } catch (err) {
      console.error(
        "Fetch poll error:",
        err
      );

      setError(
        err.message ||
          "Unable to load poll."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    if (id) {
      fetchPoll();
    }
  }, [id]);

  // --------------------------------------------------
  // REAL-TIME SSE
  // --------------------------------------------------

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
            JSON.parse(event.data);

          const updatedPoll =
            payload.data ?? payload;

          setPoll(updatedPoll);
        } catch (err) {
          console.error(
            "SSE parse error:",
            err
          );
        }
      }
    );

    eventSource.onerror = () => {
      console.log(
        "Live connection temporarily unavailable."
      );
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  // --------------------------------------------------
  // TOTAL VOTES
  // --------------------------------------------------

  const getTotalVotes = () => {
    if (
      !poll ||
      !Array.isArray(
        poll.options
      )
    ) {
      return 0;
    }

    return poll.options.reduce(
      (total, option) =>
        total +
        Number(option.votes || 0),
      0
    );
  };

  // --------------------------------------------------
  // VOTE
  // --------------------------------------------------

  const vote = async (optionId) => {
    if (hasVoted || voting) {
      return;
    }

    try {
      setVoting(true);

      setError("");
      setSuccess("");

      const response =
        await fetch(
          `${API_URL}/polls/${id}/vote/${optionId}`,
          {
            method: "POST",

            headers: {
              "X-Voter-ID": voterId,
            },
          }
        );

      const data =
        await response.json();

      // --------------------------------------------
      // ALREADY VOTED
      // --------------------------------------------

      if (response.status === 409) {
        setHasVoted(true);

        localStorage.setItem(
          `voted_${id}`,
          "true"
        );

        setError(
          "You have already voted in this poll."
        );

        return;
      }

      // --------------------------------------------
      // OTHER ERROR
      // --------------------------------------------

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to submit vote."
        );
      }

      // --------------------------------------------
      // SUCCESS
      // --------------------------------------------

      if (data.poll) {
        setPoll(data.poll);
      }

      setHasVoted(true);

      localStorage.setItem(
        `voted_${id}`,
        "true"
      );

      setSuccess(
        "✓ Your vote has been recorded!"
      );
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

  // --------------------------------------------------
  // SHARE POLL
  // --------------------------------------------------

  const sharePoll = async () => {
    const shareUrl =
      window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            poll?.question ||
            "Live Poll",

          text:
            "Vote in this live poll!",

          url: shareUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareUrl
      );

      setSuccess(
        "✓ Poll link copied!"
      );

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.log(
        "Share cancelled:",
        err
      );
    }
  };

  // --------------------------------------------------
  // LOADING UI
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ERROR / NOT FOUND
  // --------------------------------------------------

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

          <div className="error-card">

            <h3>
              ❌ Poll not found
            </h3>

            <p>
              {error ||
                "This poll may have been deleted or does not exist."}
            </p>

            <Link
              to="/"
              className="view-button"
            >
              ← Back to Polls
            </Link>

          </div>

        </main>

      </div>
    );
  }

  // --------------------------------------------------
  // CALCULATE VOTES
  // --------------------------------------------------

  const totalVotes =
    getTotalVotes();

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="app">

      {/* ==============================================
          NAVBAR
      ============================================== */}

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

      {/* ==============================================
          MAIN
      ============================================== */}

      <main className="container">

        <div className="poll-page">

          {/* BACK */}

          <Link
            to="/"
            className="back-link"
          >
            ← Back to Polls
          </Link>

          {/* ============================================
              POLL CARD
          ============================================ */}

          <div className="poll-detail-card">

            {/* HEADER */}

            <div className="poll-header">

              <span className="poll-label">

                <span className="live-dot"></span>

                LIVE POLL

              </span>

              <span className="vote-count">
                👥 {totalVotes}{" "}
                {totalVotes === 1
                  ? "vote"
                  : "votes"}
              </span>

            </div>

            {/* QUESTION */}

            <h1>
              {poll.question}
            </h1>

            <p className="poll-description">
              Choose one option below.
              Results update in real
              time.
            </p>

            {/* =========================================
                ERROR
            ========================================= */}

            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            {/* =========================================
                SUCCESS
            ========================================= */}

            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}

            {/* =========================================
                OPTIONS
            ========================================= */}

            <div className="options-list">

              {Array.isArray(
                poll.options
              ) &&
                poll.options.map(
                  (option) => {

                    const votes =
                      Number(
                        option.votes ||
                          0
                      );

                    const percentage =
                      totalVotes === 0
                        ? 0
                        : Math.round(
                            (votes /
                              totalVotes) *
                              100
                          );

                    return (

                      <button
                        key={
                          option.id
                        }
                        type="button"
                        className={`option ${
                          hasVoted
                            ? "option-disabled"
                            : ""
                        }`}
                        onClick={() =>
                          vote(
                            option.id
                          )
                        }
                        disabled={
                          hasVoted ||
                          voting
                        }
                      >

                        <div className="option-top">

                          <span className="option-text">
                            {
                              option.text
                            }
                          </span>

                          <span className="option-votes">
                            {votes}{" "}
                            {votes === 1
                              ? "vote"
                              : "votes"}
                          </span>

                        </div>

                        <div className="progress-container">

                          <div
                            className="progress-bar"
                            style={{
                              width: `${percentage}%`,
                            }}
                          ></div>

                        </div>

                        <span className="percentage">
                          {percentage}%
                        </span>

                      </button>

                    );
                  }
                )}

            </div>

            {/* =========================================
                VOTING STATUS
            ========================================= */}

            {voting && (
              <div className="voting-status">

                <div className="small-spinner"></div>

                Recording your vote...

              </div>
            )}

            {/* =========================================
                ALREADY VOTED
            ========================================= */}

            {hasVoted && !voting && (

              <div className="voted-message">

                ✓ You have already
                voted in this poll.

              </div>

            )}

            {/* =========================================
                SHARE
            ========================================= */}

            <div className="share-section">

              <p>
                Share this poll
              </p>

              <button
                type="button"
                className="share-button"
                onClick={
                  sharePoll
                }
              >
                🔗 Share Poll
              </button>

            </div>

          </div>

        </div>

      </main>

      {/* ==============================================
          FOOTER
      ============================================== */}

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