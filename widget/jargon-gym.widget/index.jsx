import { run } from "uebersicht";

// Übersicht does not run `command` from the widget directory — resolve by absolute path.
// Matches any folder under widgets/ that contains read-state.sh + config.json (symlink-safe).
const READ_STATE_CMD =
  'for d in "$HOME/Library/Application Support/Übersicht/widgets/"*/; do ' +
  '[ -f "${d}read-state.sh" ] && [ -f "${d}config.json" ] && exec "${d}read-state.sh"; ' +
  "done; " +
  'echo \'{"error":"Widget scripts not found","terms":[],"knownTermIds":[],"current":null,"appBaseUrl":"http://localhost:3000","totalCount":0,"knownCount":0}\'; exit 1';

export const command = READ_STATE_CMD;

// Poll every 5 minutes so changes in the web app (e.g. unmark known) show up.
export const refreshFrequency = 5 * 60 * 1000;

export const initialState = { output: "", error: null };

// Required for click-driven dispatch (refresh / mark known / next) to update the UI.
export const updateState = (event, previousState) => {
  if (event.error) {
    return { ...previousState, error: event.error };
  }
  if (event.output !== undefined) {
    return { output: event.output, error: null };
  }
  return previousState;
};

export const className = `
  top: 40px;
  left: 40px;
  width: 280px;
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0071e3, #0058b3);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
  user-select: none;

  .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
    font-weight: 700;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .label-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .term {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 6px;
    line-height: 1.25;
    cursor: pointer;
  }
  .def {
    font-size: 12.5px;
    line-height: 1.45;
    opacity: 0.92;
    cursor: pointer;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }
  .cat {
    display: inline-block;
    font-size: 10px;
    background: rgba(255,255,255,0.18);
    padding: 3px 9px;
    border-radius: 999px;
  }
  .know-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    font-size: 11px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 999px;
    cursor: pointer;
  }
  .know-btn:hover {
    background: rgba(255,255,255,0.32);
  }
  .hint-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
  }
  .hint {
    font-size: 10.5px;
    opacity: 0.7;
    cursor: pointer;
  }
  .rotate-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    font-size: 11px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 999px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .rotate-btn:hover {
    background: rgba(255,255,255,0.32);
  }
  .refresh-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    font-size: 11px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 999px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .refresh-btn:hover {
    background: rgba(255,255,255,0.32);
  }
  .done {
    font-size: 13px;
    line-height: 1.5;
    cursor: pointer;
  }
`;

function parseState(output) {
  try {
    const data = JSON.parse(output || "{}");
    return {
      terms: data.terms || [],
      knownTermIds: data.knownTermIds || [],
      current: data.current || null,
      widgetDir: data.widgetDir || null,
      appBaseUrl: data.appBaseUrl || "http://localhost:3000",
      totalCount: data.totalCount ?? (data.terms || []).length,
      knownCount: data.knownCount ?? (data.knownTermIds || []).length,
      error: data.error || null,
    };
  } catch {
    return {
      terms: [],
      knownTermIds: [],
      current: null,
      widgetDir: null,
      appBaseUrl: "http://localhost:3000",
      totalCount: 0,
      knownCount: 0,
      error: "Invalid widget output",
    };
  }
}

function escapeShellArg(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

const openApp = (appBaseUrl, current) => {
  const base = appBaseUrl.replace(/\/$/, "");
  const url = current
    ? `${base}/jargon/read?termId=${encodeURIComponent(current.id)}`
    : `${base}/jargon`;
  run(`open ${escapeShellArg(url)}`);
};

/** Re-fetch widget state only — never records shown / increments seen. */
const refreshState = (dispatch, widgetDir = null) => {
  const cmd = widgetDir ? escapeShellArg(widgetDir + "/read-state.sh") : READ_STATE_CMD;
  run(cmd)
    .then((output) => dispatch({ output }))
    .catch((err) => dispatch({ error: err }));
};

const markKnown = (termId, widgetDir, dispatch) => {
  if (!widgetDir || !termId) return;
  run(`${escapeShellArg(widgetDir + "/mark-known.sh")} ${escapeShellArg(termId)}`)
    .then(() => refreshState(dispatch, widgetDir))
    .catch((err) => dispatch({ error: err }));
};

const rotateTerm = (termId, widgetDir, dispatch) => {
  if (!widgetDir || !termId) return;
  run(`${escapeShellArg(widgetDir + "/rotate-term.sh")} ${escapeShellArg(termId)}`)
    .then(() => refreshState(dispatch, widgetDir))
    .catch((err) => dispatch({ error: err }));
};

const RefreshButton = ({ dispatch, widgetDir = null, title = "Refresh terms" }) => (
  <button
    className="refresh-btn"
    title={title}
    onClick={(e) => {
      e.stopPropagation();
      refreshState(dispatch, widgetDir);
    }}
  >
    ↻
  </button>
);

const LabelBar = ({ title, dispatch, widgetDir = null, trailing = null }) => (
  <div className="label">
    <span>{title}</span>
    <span className="label-right">
      {trailing}
      <RefreshButton dispatch={dispatch} widgetDir={widgetDir} />
    </span>
  </div>
);

export const render = ({ output, error }, dispatch) => {
  if (error) {
    const message = typeof error === "string" ? error : error?.message || String(error);
    return (
      <div onClick={() => openApp("http://localhost:3000", null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} />
        <div className="def">Couldn&apos;t read terms — click to open the app anyway.</div>
        <code>{message}</code>
      </div>
    );
  }

  const {
    terms,
    knownCount,
    totalCount,
    current,
    widgetDir,
    appBaseUrl,
    error: apiError,
  } = parseState(output);

  if (apiError) {
    return (
      <div onClick={() => openApp(appBaseUrl, null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} widgetDir={widgetDir} />
        <div className="def">{apiError}</div>
      </div>
    );
  }

  if (!terms.length) {
    return (
      <div onClick={() => openApp(appBaseUrl, null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} widgetDir={widgetDir} />
        <div className="def">No terms found — click to open the app.</div>
      </div>
    );
  }

  if (!current) {
    return (
      <div onClick={() => openApp(appBaseUrl, null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} widgetDir={widgetDir} />
        <div className="done">
          🎉 You&apos;ve marked all {totalCount} terms known in this widget. Click to review in the
          app.
        </div>
      </div>
    );
  }

  return (
    <div>
      <LabelBar
        title="💡 Term to review"
        dispatch={dispatch}
        widgetDir={widgetDir}
        trailing={
          <span>
            {knownCount}/{totalCount}
          </span>
        }
      />
      <div className="term" onClick={() => openApp(appBaseUrl, current)}>
        {current.term}
      </div>
      <div className="def" onClick={() => openApp(appBaseUrl, current)}>
        {current.definition}
      </div>
      <div className="actions">
        <span className="cat">{current.category}</span>
        <button className="know-btn" onClick={() => markKnown(current.id, widgetDir, dispatch)}>
          ✓ Mark known
        </button>

        <button
          className="rotate-btn"
          title="Show another term"
          onClick={(e) => {
            e.stopPropagation();
            rotateTerm(current.id, widgetDir, dispatch);
          }}
        >
          → Next
        </button>
      </div>
      <div className="hint-row">
        <span className="hint" onClick={() => openApp(appBaseUrl, current)}>
          Click term to open in the app →
        </span>
      </div>
    </div>
  );
};
