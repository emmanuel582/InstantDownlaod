import sys
import json
import yt_dlp
import os
import platform
from pathlib import Path
import tempfile
import shutil
import logging
from typing import Optional, Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YTDLLogger:
    def debug(self, msg: str) -> None:
        pass

    def warning(self, msg: str) -> None:
        print(json.dumps({'warning': msg}), flush=True)

    def error(self, msg: str) -> None:
        print(json.dumps({'error': msg}), flush=True)

def get_platform_temp_dir() -> str:
    """Get platform-specific temporary directory"""
    if platform.system() == 'Windows':
        return os.path.join(os.environ.get('TEMP', ''), 'video-downloader')
    return os.path.join(tempfile.gettempdir(), 'video-downloader')

def ensure_temp_dir() -> str:
    """Ensure temporary directory exists and is clean"""
    temp_dir = get_platform_temp_dir()
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    return temp_dir

def normalize_path(path: str) -> str:
    """Normalize path for current platform"""
    return str(Path(path).resolve())

def get_info(url: str, cookies_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    try:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'forcejson': True,
            'extract_flat': False,
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'logger': YTDLLogger(),
            'socket_timeout': 30,
            'retries': 3,
        }
        
        if cookies_path:
            cookies_path = normalize_path(cookies_path)
            if os.path.exists(cookies_path):
                ydl_opts['cookiefile'] = cookies_path
            else:
                print(json.dumps({'error': f'Cookies file not found: {cookies_path}'}), flush=True)
                return None

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                if not info:
                    print(json.dumps({'error': 'Could not extract video information'}), flush=True)
                    return None
                    
                formats: List[Dict[str, Any]] = []
                
                # Process all formats
                for f in info.get('formats', []):
                    try:
                        format_info = {
                            'format_id': f['format_id'],
                            'ext': f['ext'],
                            'filesize': f.get('filesize'),
                        }
                        
                        # Handle video formats
                        if f.get('vcodec') != 'none':
                            height = f.get('height')
                            fps = f.get('fps')
                            format_info.update({
                                'type': 'video',
                                'height': height,
                                'fps': fps,
                                'vcodec': f.get('vcodec'),
                                'acodec': f.get('acodec'),
                                'label': f"{height}p{f'@{fps}fps' if fps else ''} ({f.get('format_note', '')})"
                            })
                            formats.append(format_info)
                        
                        # Handle audio formats
                        elif f.get('acodec') != 'none':
                            abr = f.get('abr')
                            if abr:
                                format_info.update({
                                    'type': 'audio',
                                    'abr': abr,
                                    'acodec': f.get('acodec'),
                                    'label': f"{int(round(abr))}kbps"
                                })
                                formats.append(format_info)
                    except Exception as e:
                        logger.error(f"Error processing format: {str(e)}")
                        continue
                
                result = {
                    'title': info.get('title'),
                    'formats': formats,
                    'thumbnail': info.get('thumbnail'),
                    'duration': info.get('duration'),
                    'webpage_url': info.get('webpage_url'),
                    'platform': info.get('extractor', 'unknown')
                }
                print(json.dumps(result), flush=True)
                return result
            except Exception as e:
                error_msg = f'Error extracting info: {str(e)}'
                logger.error(error_msg)
                print(json.dumps({'error': error_msg}), flush=True)
                return None
    except Exception as e:
        error_msg = f'Unexpected error: {str(e)}'
        logger.error(error_msg)
        print(json.dumps({'error': error_msg}), flush=True)
        return None

def download_media(url: str, format_id: str, out_path: str, is_audio: bool = False, cookies_path: Optional[str] = None) -> None:
    try:
        out_path = normalize_path(out_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': out_path,
            'quiet': True,
            'noplaylist': True,
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'logger': YTDLLogger(),
            'socket_timeout': 30,
            'retries': 3,
        }
        
        if cookies_path:
            cookies_path = normalize_path(cookies_path)
            if os.path.exists(cookies_path):
                ydl_opts['cookiefile'] = cookies_path
            else:
                raise Exception(f'Cookies file not found: {cookies_path}')
        
        if is_audio:
            ydl_opts.update({
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'merge_output_format': 'mp3',
            })
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                ydl.download([url])
                if not os.path.exists(out_path):
                    raise Exception('Download completed but file not found')
            except Exception as e:
                raise Exception(f'Download failed: {str(e)}')
                
    except Exception as e:
        error_msg = f'Download error: {str(e)}'
        logger.error(error_msg)
        raise Exception(error_msg)

def main() -> None:
    try:
        if len(sys.argv) < 3:
            print(json.dumps({'error': 'Not enough arguments'}), flush=True)
            sys.exit(1)
            
        command = sys.argv[1]
        cookies_path = None
        
        # Parse for --cookies argument
        if '--cookies' in sys.argv:
            idx = sys.argv.index('--cookies')
            if idx + 1 < len(sys.argv):
                cookies_path = normalize_path(sys.argv[idx + 1])
                
        if command == 'info':
            url = sys.argv[2]
            info = get_info(url, cookies_path)
            if not info:
                sys.exit(1)
                
        elif command == 'download':
            if len(sys.argv) < 6:
                print(json.dumps({'error': 'Not enough arguments for download'}), flush=True)
                sys.exit(1)
                
            url = sys.argv[2]
            format_id = sys.argv[3]
            out_path = sys.argv[4]
            is_audio = sys.argv[5].lower() == 'true'
            
            try:
                download_media(url, format_id, out_path, is_audio, cookies_path)
                print(json.dumps({'status': 'ok', 'path': out_path}), flush=True)
            except Exception as e:
                print(json.dumps({'error': str(e)}), flush=True)
                sys.exit(1)
        else:
            print(json.dumps({'error': 'Unknown command'}), flush=True)
            sys.exit(1)
            
    except Exception as e:
        error_msg = f'Unexpected error: {str(e)}'
        logger.error(error_msg)
        print(json.dumps({'error': error_msg}), flush=True)
        sys.exit(1)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()

if __name__ == '__main__':
    main() 