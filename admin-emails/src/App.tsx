import { useCallback, useEffect, useState } from "react";
import {
  EmailTemplateEditor,
  type SerializedTemplateSource,
  type TemplateSourceFiles,
} from "@singleton-sd/post-kit-editor";

import { clearToken, loginWithGithub, readStoredToken } from "./auth";
import {
  fetchAuthenticatedUser,
  listTemplateDirectories,
  loadTemplateFromGit,
  saveTemplatePullRequest,
  type TemplateListItem,
} from "./github";

type Phase = "boot" | "login" | "loading" | "ready";

export function App() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [token, setToken] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<TemplateListItem[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(
    null,
  );
  const [template, setTemplate] = useState<TemplateSourceFiles | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [lastPrUrl, setLastPrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const bootstrap = useCallback(async (accessToken: string) => {
    setPhase("loading");
    setError(null);
    try {
      const user = await fetchAuthenticatedUser(accessToken);
      setLogin(user.login);
      const items = await listTemplateDirectories(accessToken);
      setCatalog(items);
      setToken(accessToken);
      setSelectedDirectory((current) => {
        if (current && items.some((item) => item.directory === current)) {
          return current;
        }
        return items[0]?.directory ?? null;
      });
      setPhase("ready");
    } catch (err) {
      clearToken();
      setToken(null);
      setPhase("login");
      setError(
        err instanceof Error ? err.message : "Failed to load templates.",
      );
    }
  }, []);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      void bootstrap(stored);
    } else {
      setPhase("login");
    }
  }, [bootstrap]);

  useEffect(() => {
    if (!token || !selectedDirectory) {
      setTemplate(null);
      return;
    }
    let cancelled = false;
    setLoadingTemplate(true);
    setLoadError(null);
    void loadTemplateFromGit(token, selectedDirectory)
      .then((files) => {
        if (!cancelled) {
          setTemplate(files);
          setLoadingTemplate(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTemplate(null);
          setLoadError(
            err instanceof Error ? err.message : "Failed to load template.",
          );
          setLoadingTemplate(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedDirectory]);

  async function onLogin() {
    setError(null);
    setStatus(null);
    try {
      const accessToken = await loginWithGithub();
      await bootstrap(accessToken);
    } catch (err) {
      setPhase("login");
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  function onLogout() {
    clearToken();
    setToken(null);
    setLogin(null);
    setCatalog([]);
    setTemplate(null);
    setSelectedDirectory(null);
    setLastPrUrl(null);
    setStatus(null);
    setPhase("login");
  }

  async function onSave(
    serialized: SerializedTemplateSource,
    files: TemplateSourceFiles,
  ) {
    if (!token || !selectedDirectory) {
      return { ok: false as const, message: "Not signed in." };
    }
    setStatus(null);
    setLastPrUrl(null);
    try {
      const result = await saveTemplatePullRequest(
        token,
        selectedDirectory,
        serialized,
        files,
      );
      setLastPrUrl(result.prUrl);
      setStatus(`Opened pull request on branch ${result.branch}.`);
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : "Save failed.",
      };
    }
  }

  if (phase === "boot" || phase === "loading") {
    return (
      <div className="shell">
        <header className="top">
          <h1>InkAds email templates</h1>
        </header>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (phase === "login") {
    return (
      <div className="shell">
        <header className="top">
          <h1>InkAds email templates</h1>
          <p className="lede">
            Sign in with GitHub (same cms-oauth-kit boundary as Decap) to edit
            PostKit sources under <code>content/email-templates/</code>.
          </p>
        </header>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="primary"
          onClick={() => void onLogin()}
        >
          Sign in with GitHub
        </button>
        <p className="muted">
          Markdown / Decap admin stays at <a href="../">/admin</a>. Send-test is
          not available yet.
        </p>
      </div>
    );
  }

  const availableVariables =
    template?.metadata.variables.map((name) => ({ name, label: name })) ?? [];

  return (
    <div className="shell shell-wide">
      <header className="top top-row">
        <div>
          <h1>InkAds email templates</h1>
          <p className="muted">
            Signed in as <strong>{login}</strong> · save opens a PR to{" "}
            <code>main</code>
          </p>
        </div>
        <button type="button" className="ghost" onClick={onLogout}>
          Sign out
        </button>
      </header>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? <p className="ok">{status}</p> : null}
      {lastPrUrl ? (
        <p className="ok">
          <a href={lastPrUrl} target="_blank" rel="noreferrer">
            Open pull request
          </a>
        </p>
      ) : null}

      {catalog.length === 0 ? (
        <p className="error" role="alert">
          No template directories found under{" "}
          <code>content/email-templates/</code>.
        </p>
      ) : (
        <label className="picker">
          Template{" "}
          <select
            aria-label="Select template"
            value={selectedDirectory ?? ""}
            onChange={(event) => setSelectedDirectory(event.target.value)}
          >
            {catalog.map((item) => (
              <option key={item.directory} value={item.directory}>
                {item.name} ({item.key})
              </option>
            ))}
          </select>
        </label>
      )}

      {template ? (
        <EmailTemplateEditor
          key={selectedDirectory ?? template.metadata.key}
          template={template}
          availableVariables={availableVariables}
          onSave={onSave}
          loading={loadingTemplate}
          loadError={loadError ?? undefined}
        />
      ) : loadingTemplate ? (
        <p className="muted">Loading template…</p>
      ) : loadError ? (
        <p className="error" role="alert">
          {loadError}
        </p>
      ) : null}
    </div>
  );
}
