# Announcement Banner for Jellyfin 12.2

Shows a banner at the top of the Jellyfin web client for announcements. Admins set it up under
**Dashboard → Plugins → Announcement Banner**:

- Message text, with chosen words/phrases turned into links (e.g. "Discord server" → `https://discord.gg/...`)
- Background, text and link colours
- Text size, banner height, alignment, bold
- Users can close it (optional); a closed banner comes back when the message or links change
- Live preview on the settings page; saving updates the banner right away

The banner also shows on the login page, grows if the text wraps on small screens, and hides during video playback.

## Install from repository

1. Dashboard → Plugins → Repositories (the gear/"Manage repositories"), add:
   ```
   https://github.com/SebastianHog/jellyfin-announcement-banner/releases/latest/download/manifest.json
   ```
2. Install **Announcement Banner** from the catalog.
3. Restart Jellyfin. The plugin hooks into the web server at startup, so the banner only appears after a restart.

## Install manually

Download the zip from the latest release and extract it into a folder `AnnouncementBanner_<version>` in Jellyfin's
plugins folder (`<config>/plugins/`, or `/config/data/plugins/` on the linuxserver image), then restart Jellyfin.

## Releasing

Update `changelog` in `meta.json` if you like, then either go to **Actions → Release → Run workflow** and enter a
version (e.g. `1.0.1`), or push a tag:

```sh
git tag v1.0.1 && git push origin v1.0.1
```

The workflow builds the plugin (.NET 10, against the `Jellyfin.Controller` package) and publishes a
release with the zip and an updated `manifest.json`. Jellyfin picks up the new version from the repository.

## Build locally

Requires the .NET 10 SDK.

```sh
dotnet publish Jellyfin.Plugin.AnnouncementBanner -c Release -o publish
```

## How it works

- `Injection/` registers an ASP.NET middleware (via `IStartupFilter`) that adds
  `<script src="../AnnouncementBanner/banner.js">` to `index.html` while it is served.
  Nothing on disk is changed, so it survives Jellyfin updates and read-only web folders, and works with a base URL.
- `Api/AnnouncementBannerController.cs` serves `GET /AnnouncementBanner/banner.js` and `GET /AnnouncementBanner/config`.
  Both are anonymous so the login page can show the banner, which means **the banner settings are public**.
- `Web/banner.js` renders the banner with DOM text nodes (no HTML from the settings is ever injected) and only allows
  `http(s)`, `mailto` and relative links. It pushes the page header and content down by the banner's real height.
- `Configuration/configPage.html` is the admin settings page.

## Limitations

- Only clients that run the Jellyfin web UI see the banner: browsers, Jellyfin Media Player, and the Android/iOS apps
  (which wrap the web UI). Native clients such as Android TV, Roku, Swiftfin, Findroid or Infuse don't.
- Built against Jellyfin 12.2 (`targetAbi` 12.2.0.0). It may well work on 12.3/12.4, but that hasn't been tested.
