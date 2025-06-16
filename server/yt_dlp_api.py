import sys
import json
import yt_dlp
import os
import platform
from pathlib import Path
import tempfile
import shutil

def get_platform_temp_dir():
    """Get platform-specific temporary directory"""
    if platform.system() == 'Windows':
        return os.path.join(os.environ.get('TEMP', ''), 'video-downloader')
    return os.path.join(tempfile.gettempdir(), 'video-downloader')

def ensure_temp_dir():
    """Ensure temporary directory exists and is clean"""
    temp_dir = get_platform_temp_dir()
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    return temp_dir

def normalize_path(path):
    """Normalize path for current platform"""
    return str(Path(path).resolve())

def get_info(url, cookies_path=None):
    try:
        ydl_opts = {
            'quiet': True,
            'skip_download': True,
            'forcejson': True,
            'extract_flat': False,
            'nocheckcertificate': True,  # Handle SSL issues
            'ignoreerrors': True,  # Continue on download errors
        }
        
        if cookies_path:
            cookies_path = normalize_path(cookies_path)
            if os.path.exists(cookies_path):
                ydl_opts['cookiefile'] = cookies_path
            else:
                print(json.dumps({'error': f'Cookies file not found: {cookies_path}'}))
                return None

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                if not info:
                    print(json.dumps({'error': 'Could not extract video information'}))
                    return None
                    
                formats = []
                
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
                        print(f"Error processing format: {str(e)}", file=sys.stderr)
                        continue
                
                return {
                    'title': info.get('title'),
                    'formats': formats,
                    'thumbnail': info.get('thumbnail'),
                    'duration': info.get('duration'),
                    'webpage_url': info.get('webpage_url')
                }
            except Exception as e:
                print(json.dumps({'error': f'Error extracting info: {str(e)}'}))
                return None
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}))
        return None

def download_media(url, format_id, out_path, is_audio=False, cookies_path=None):
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
        raise Exception(f'Download error: {str(e)}')

def main():
    try:
        if len(sys.argv) < 3:
            print(json.dumps({'error': 'Not enough arguments'}))
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
            if info:
                print(json.dumps(info))
            else:
                sys.exit(1)
                
        elif command == 'download':
            if len(sys.argv) < 6:
                print(json.dumps({'error': 'Not enough arguments for download'}))
                sys.exit(1)
                
            url = sys.argv[2]
            format_id = sys.argv[3]
            out_path = sys.argv[4]
            is_audio = sys.argv[5].lower() == 'true'
            
            try:
                download_media(url, format_id, out_path, is_audio, cookies_path)
                print(json.dumps({'status': 'ok', 'path': out_path}))
            except Exception as e:
                print(json.dumps({'error': str(e)}))
                sys.exit(1)
        else:
            print(json.dumps({'error': 'Unknown command'}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main() 