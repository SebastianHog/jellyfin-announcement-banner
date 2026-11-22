using System;
using System.Collections.Generic;
using Jellyfin.Plugin.AnnouncementBanner.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.AnnouncementBanner;

/// <summary>
/// Shows an admin-configurable announcement banner at the top of the web client.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Announcement Banner";

    public override Guid Id => Guid.Parse("b4a53c50-2f7e-42fc-a21b-b1ad0fdab9f3");

    public override string Description => "Shows an announcement banner at the top of the web client.";

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html"
        };
    }
}
