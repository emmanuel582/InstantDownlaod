import sys
import json
import yt_dlp
import os


def get_info(url):
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'forcejson': True,
        'extract_flat': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        formats = []
        
        # Process all formats
        for f in info.get('formats', []):
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
        
        return {
            'title': info.get('title'),
            'formats': formats
        }


def download_media(url, format_id, out_path, is_audio=False):
    ydl_opts = {
        'format': format_id,
        'outtmpl': out_path,
        'quiet': True,
        'noplaylist': True,
    }
    
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
        ydl.download([url])


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Not enough arguments'}))
        sys.exit(1)
    command = sys.argv[1]
    if command == 'info':
        url = sys.argv[2]
        try:
            info = get_info(url)
            print(json.dumps(info))
        except Exception as e:
            print(json.dumps({'error': str(e)}))
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
            download_media(url, format_id, out_path, is_audio)
            print(json.dumps({'status': 'ok'}))
        except Exception as e:
            print(json.dumps({'error': str(e)}))
            sys.exit(1)
    else:
        print(json.dumps({'error': 'Unknown command'}))
        sys.exit(1)

if __name__ == '__main__':
    main() 