import { run } from "uebersicht";

// Übersicht does not run `command` from the widget directory — resolve by absolute path.
// Matches any folder under widgets/ that contains read-state.sh + config.json (symlink-safe).
const READ_STATE_CMD =
  'for d in "$HOME/Library/Application Support/Übersicht/widgets/"*/; do ' +
  '[ -f "${d}read-state.sh" ] && [ -f "${d}config.json" ] && exec "${d}read-state.sh"; ' +
  "done; " +
  'echo \'{"error":"Widget scripts not found","current":null,"appBaseUrl":"http://localhost:3000","totalCount":0,"knownCount":0}\'; exit 1';

export const command = READ_STATE_CMD;

// Poll every 5 minutes so changes in the web app (e.g. unmark known) show up.
export const refreshFrequency = 5 * 60 * 1000;

export const initialState = { output: "", error: null };

// Required for click-driven dispatch (refresh / read more / next) to update the UI.
export const updateState = (event, previousState) => {
  if (event.error) {
    return { ...previousState, error: event.error };
  }
  if (event.output !== undefined) {
    return { output: event.output, error: null };
  }
  // Optimistic local swap so "Next" shows the already-cached term instantly
  // instead of waiting on advance-term.sh's round trip. The real dispatch
  // that follows (from the run() call) reconciles this with server state.
  if (event.optimisticNext) {
    try {
      const data = JSON.parse(previousState.output || "{}");
      data.current = event.optimisticNext;
      data.next = null;
      return { output: JSON.stringify(data), error: null };
    } catch {
      return previousState;
    }
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
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
    min-width: 0;
    
  }
  .read-more-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: #fff;
    font-size: 11px;
    line-height: 1;
    padding: 4px 6px;
    border-radius: 999px;
    cursor: pointer;
  }
  .read-more-btn:hover {
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
  .update-banner {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.18);
    font-size: 10px;
    opacity: 0.75;
    cursor: pointer;
  }
  .update-banner:hover {
    opacity: 1;
  }
`;

function parseState(output) {
  try {
    const data = JSON.parse(output || "{}");
    return {
      current: data.current || null,
      next: data.next || null,
      widgetDir: data.widgetDir || null,
      appBaseUrl: data.appBaseUrl || "http://localhost:3000",
      totalCount: data.totalCount ?? 0,
      knownCount: data.knownCount ?? 0,
      widgetVersion: data.widgetVersion || null,
      latestWidgetVersion: data.latestWidgetVersion || null,
      error: data.error || null,
    };
  } catch {
    return {
      current: null,
      widgetDir: null,
      appBaseUrl: "http://localhost:3000",
      totalCount: 0,
      knownCount: 0,
      widgetVersion: null,
      latestWidgetVersion: null,
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

const openWidgetSettings = (appBaseUrl) => {
  const base = appBaseUrl.replace(/\/$/, "");
  run(`open ${escapeShellArg(`${base}/jargon/settings?tab=widget`)}`);
};

/** Re-fetch widget state only — never records anything. `reset` clears the
 *  local pool and peeks a fresh top 10 (wired to the ↻ button). */
const refreshState = (dispatch, widgetDir = null, reset = false) => {
  const cmd = widgetDir
    ? `${escapeShellArg(widgetDir + "/read-state.sh")}${reset ? " --reset" : ""}`
    : READ_STATE_CMD;
  run(cmd)
    .then((output) => dispatch({ output }))
    .catch((err) => dispatch({ error: err }));
};

/** Drops the current term and pulls in a replacement against the live
 *  queue in one round trip. `record` should be true only when nothing else
 *  will record this term's read server-side — i.e. the "Next" button,
 *  where showing the term was a passive read the user just confirmed by
 *  moving on. The script's own output is a ready-to-render state, same
 *  shape as READ_STATE_CMD, so it's dispatched directly.
 *
 *  If `next` is already cached from the last read, dispatch it immediately
 *  so the UI advances without waiting on this round trip; the eventual
 *  dispatch below reconciles with the authoritative server state. */
const advanceTerm = (termId, widgetDir, dispatch, record = false, next = null) => {
  if (!widgetDir || !termId) return;
  if (next) {
    dispatch({ optimisticNext: next });
  }
  const args = record ? ` --record` : "";
  run(`${escapeShellArg(widgetDir + "/advance-term.sh")} ${escapeShellArg(termId)}${args}`)
    .then((output) => dispatch({ output }))
    .catch((err) => dispatch({ error: err }));
};

/** Open the current term on the Read page, then advance the widget locally.
 *  The Read page itself records the read, so this must not record again. */
const openAppAndRotate = (appBaseUrl, current, next, widgetDir, dispatch) => {
  openApp(appBaseUrl, current);
  if (current?.id) {
    advanceTerm(current.id, widgetDir, dispatch, false, next);
  }
};

const RefreshButton = ({ dispatch, widgetDir = null, title = "Refresh terms" }) => (
  <button
    className="refresh-btn"
    title={title}
    onClick={(e) => {
      e.stopPropagation();
      refreshState(dispatch, widgetDir, true);
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

/** No widgetVersion means a dev symlink install (widget:link) — always
 *  current by definition, so it never sees the nag. */
function isWidgetOutdated(widgetVersion, latestWidgetVersion) {
  return (
    Boolean(widgetVersion) && Boolean(latestWidgetVersion) && widgetVersion !== latestWidgetVersion
  );
}

const UpdateBanner = ({ widgetVersion, latestWidgetVersion, appBaseUrl }) => {
  if (!isWidgetOutdated(widgetVersion, latestWidgetVersion)) return null;
  return (
    <div
      className="update-banner"
      onClick={(e) => {
        e.stopPropagation();
        openWidgetSettings(appBaseUrl);
      }}
    >
      ⬆️ Widget update available — click to update
    </div>
  );
};

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
    knownCount,
    totalCount,
    current,
    next,
    widgetDir,
    appBaseUrl,
    widgetVersion,
    latestWidgetVersion,
    error: apiError,
  } = parseState(output);

  if (apiError) {
    return (
      <div onClick={() => openApp(appBaseUrl, null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} widgetDir={widgetDir} />
        <div className="def">{apiError}</div>
        <UpdateBanner
          widgetVersion={widgetVersion}
          latestWidgetVersion={latestWidgetVersion}
          appBaseUrl={appBaseUrl}
        />
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div onClick={() => openApp(appBaseUrl, null)}>
        <LabelBar title="💡 Jargon" dispatch={dispatch} widgetDir={widgetDir} />
        <div className="def">No terms found — click to open the app.</div>
        <UpdateBanner
          widgetVersion={widgetVersion}
          latestWidgetVersion={latestWidgetVersion}
          appBaseUrl={appBaseUrl}
        />
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
        <UpdateBanner
          widgetVersion={widgetVersion}
          latestWidgetVersion={latestWidgetVersion}
          appBaseUrl={appBaseUrl}
        />
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
      <div
        className="term"
        onClick={() => openAppAndRotate(appBaseUrl, current, next, widgetDir, dispatch)}
      >
        {current.term}
      </div>
      <div
        className="def"
        onClick={() => openAppAndRotate(appBaseUrl, current, next, widgetDir, dispatch)}
      >
        {current.definition}
      </div>
      <div className="actions">
        <span className="cat" title={current.domainName}>{current.domainName}</span>
        <button
          className="read-more-btn"
          title="Open this term on the Read page"
          onClick={(e) => {
            e.stopPropagation();
            openAppAndRotate(appBaseUrl, current, next, widgetDir, dispatch);
          }}
        >
          Read more
        </button>

        <button
          className="rotate-btn"
          title="Show another term"
          onClick={(e) => {
            e.stopPropagation();
            advanceTerm(current.id, widgetDir, dispatch, true, next);
          }}
        >
          → Next
        </button>
      </div>
      <div className="hint-row">
        <span
          className="hint"
          onClick={() => openAppAndRotate(appBaseUrl, current, next, widgetDir, dispatch)}
        >
          Click term to read more →
        </span>
      </div>
      <UpdateBanner
        widgetVersion={widgetVersion}
        latestWidgetVersion={latestWidgetVersion}
        appBaseUrl={appBaseUrl}
      />
    </div>
  );
};
