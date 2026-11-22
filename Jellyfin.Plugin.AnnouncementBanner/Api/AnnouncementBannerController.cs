using System.Net.Mime;
using Jellyfin.Plugin.AnnouncementBanner.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.AnnouncementBanner.Api;

/// <summary>
/// Serves the banner script and its settings. Both are anonymous so the banner also shows on the login page.
/// </summary>
[ApiController]
[Route("AnnouncementBanner")]
public class AnnouncementBannerController : ControllerBase
{
    private const string ScriptResource = "Jellyfin.Plugin.AnnouncementBanner.Web.banner.js";

    [HttpGet("banner.js")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetScript()
    {
        var stream = typeof(Plugin).Assembly.GetManifestResourceStream(ScriptResource);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "no-cache";
        return File(stream, "application/javascript; charset=utf-8");
    }

    [HttpGet("config")]
    [AllowAnonymous]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<PluginConfiguration> GetConfig()
    {
        Response.Headers.CacheControl = "no-store";
        return Plugin.Instance?.Configuration ?? new PluginConfiguration();
    }
}
