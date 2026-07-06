import json
from mcp.server.fastmcp import FastMCP
from app.agents.youtube_metadata_agent import YouTubeMetadataAgent
from app.agents.youtube_uploader_agent import YouTubeUploaderAgent

# Create the FastMCP server
mcp = FastMCP("YouTube Upload Agent")

metadata_agent = YouTubeMetadataAgent()
uploader_agent = YouTubeUploaderAgent()

@mcp.tool()
def generate_youtube_metadata(
    ticker: str,
    report_date: str,
    rating: str,
    summary: str,
    bias: str,
    rsi: str = "",
    sector: str = ""
) -> str:
    """
    Generate SEO-optimized YouTube Title, Description, and Tags for a stock analysis video.
    Returns a JSON object with title, description, and tags.
    """
    res = metadata_agent.generate(ticker, report_date, rating, summary, bias, rsi, sector)
    return json.dumps(res, indent=2)

@mcp.tool()
def upload_video_to_youtube(
    video_path: str,
    title: str,
    description: str,
    tags: list,
    refresh_token: str = None,
    visibility: str = "private"
) -> str:
    """
    Uploads a local MP4 video file to YouTube with metadata and privacy settings.
    Returns a JSON object with video ID and watch URL.
    """
    try:
        video_id = uploader_agent.upload(
            file_path=video_path,
            title=title,
            description=description,
            tags=tags,
            refresh_token=refresh_token,
            visibility=visibility
        )
        return json.dumps({
            "success": True,
            "videoId": video_id,
            "videoUrl": f"https://www.youtube.com/watch?v={video_id}"
        }, indent=2)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)
