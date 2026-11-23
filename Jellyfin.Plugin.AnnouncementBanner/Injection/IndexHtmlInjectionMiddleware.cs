using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace Jellyfin.Plugin.AnnouncementBanner.Injection;

/// <summary>
/// Adds the banner script tag to the web client's index.html as it is served.
/// Nothing on disk is modified, so it survives server updates and read-only web folders (Docker).
/// </summary>
public class IndexHtmlInjectionMiddleware
{
    private const string Marker = "AnnouncementBanner/banner.js";

    // Relative to /web/, so it works with or without a base URL. The version in the URL makes browsers
    // and caching proxies fetch the new script after a plugin update.
    private static readonly string ScriptTag =
        $"<script src=\"../AnnouncementBanner/banner.js?v={typeof(IndexHtmlInjectionMiddleware).Assembly.GetName().Version}\" defer></script>";

    private readonly RequestDelegate _next;

    public IndexHtmlInjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method) || !IsIndexRequest(context.Request.Path))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        // Ask the rest of the pipeline for a plain, complete response that can be edited:
        // no compression, no 304 Not Modified, no partial content.
        var requestHeaders = context.Request.Headers;
        requestHeaders.Remove(HeaderNames.AcceptEncoding);
        requestHeaders.Remove(HeaderNames.IfNoneMatch);
        requestHeaders.Remove(HeaderNames.IfModifiedSince);
        requestHeaders.Remove(HeaderNames.Range);

        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try
        {
            await _next(context).ConfigureAwait(false);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        buffer.Position = 0;
        var isHtml = context.Response.ContentType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) ?? false;
        if (context.Response.StatusCode != StatusCodes.Status200OK || !isHtml)
        {
            await buffer.CopyToAsync(originalBody, context.RequestAborted).ConfigureAwait(false);
            return;
        }

        string html;
        using (var reader = new StreamReader(buffer, Encoding.UTF8, leaveOpen: true))
        {
            html = await reader.ReadToEndAsync(context.RequestAborted).ConfigureAwait(false);
        }

        if (!html.Contains(Marker, StringComparison.Ordinal))
        {
            var bodyEnd = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            html = bodyEnd >= 0 ? html.Insert(bodyEnd, ScriptTag) : html + ScriptTag;
        }

        var bytes = Encoding.UTF8.GetBytes(html);
        context.Response.ContentLength = bytes.Length;
        context.Response.Headers.Remove(HeaderNames.ETag);
        await originalBody.WriteAsync(bytes, context.RequestAborted).ConfigureAwait(false);
    }

    private static bool IsIndexRequest(PathString path)
    {
        var value = path.Value;
        return value is not null
            && (value.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
                || value.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase));
    }
}
