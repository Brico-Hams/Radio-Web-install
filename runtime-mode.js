(function (root) {
  "use strict";
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  const web = () => ({ mode: "web" });
  // Any failure means "web": the static site has no runtime.json or the file is opened offline.
  async function loadRuntime(fetchImpl = root.fetch) {
    try {
      const response = await fetchImpl("runtime.json", { cache: "no-store", credentials: "omit" });
      if (response.status !== 200 || !/^application\/json\b/i.test(response.headers.get("content-type") || "")) return web();
      const data = await response.json();
      return data && data.mode === "local" ? { mode: "local" } : web();
    } catch {
      return web();
    }
  }
  Object.assign(R, { loadRuntime });
  R.runtime = loadRuntime();
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
