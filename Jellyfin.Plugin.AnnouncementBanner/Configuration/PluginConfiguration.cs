using System;
using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.AnnouncementBanner.Configuration;

/// <summary>
/// Banner settings. Everything here is public: it is served to every client, logged in or not.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets words/phrases in the message that should become links.
    /// </summary>
    public BannerLink[] Links { get; set; } = Array.Empty<BannerLink>();

    public string BackgroundColor { get; set; } = "#00a4dc";

    public string TextColor { get; set; } = "#ffffff";

    public string LinkColor { get; set; } = "#ffffff";

    /// <summary>
    /// Gets or sets the font size in pixels.
    /// </summary>
    public int FontSize { get; set; } = 15;

    /// <summary>
    /// Gets or sets the minimum banner height in pixels. The banner grows if the text wraps.
    /// </summary>
    public int Height { get; set; } = 40;

    /// <summary>
    /// Gets or sets the text alignment: left, center or right.
    /// </summary>
    public string TextAlign { get; set; } = "center";

    public bool Bold { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether users can close the banner.
    /// It comes back when the message or links change.
    /// </summary>
    public bool Dismissible { get; set; } = true;
}

/// <summary>
/// A word or phrase in the message that links somewhere.
/// </summary>
public class BannerLink
{
    public string Word { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;
}
