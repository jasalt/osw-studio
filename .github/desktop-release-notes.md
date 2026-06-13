## OSW Studio Desktop v{{VERSION}}

Local desktop build of OSW Studio with full Server Mode: SQLite storage, project deployments, server functionalities.

### Downloads

{{DOWNLOADS}}

### Notes

The app is unsigned on both macOS and Windows. On macOS, right-click → Open to bypass Gatekeeper. On Windows, click "More info" → "Run anyway" on the SmartScreen prompt.

**Upgrading from v1.75 or earlier on macOS?** Those versions stored projects inside the app bundle, and replacing the app deletes them. Before installing, export your projects from the project manager (or copy `OSW Studio.app/Contents/Resources/app/data` somewhere safe). From this version on, data lives outside the app and survives updates.

Updates are user-controlled: on Windows and Linux the app notifies you when a new version is available and only downloads and installs it when you choose to. On macOS the app links you to this page for new releases.

For what's new in this version, see the [changelog](https://github.com/o-stahl/osw-studio/blob/main/CHANGELOG.md).

For browser-based use, [oswstudio.com](https://oswstudio.com) and the [HuggingFace Space](https://huggingface.co/spaces/otst/osw-studio) are the easiest way to try OSWS. For full setup, clone the repo.
