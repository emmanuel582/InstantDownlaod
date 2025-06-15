# InstantDownload

A powerful Chrome extension for downloading videos and audio from various platforms including YouTube, TikTok, Instagram, and more.

## Features

- Download videos and audio from multiple platforms
- Support for various video qualities and formats
- Clean and intuitive user interface
- Automatic format detection
- Server-side processing for reliable downloads
- Cross-platform compatibility

## Supported Platforms

- YouTube
- TikTok
- Instagram
- Facebook
- Twitter
- And many more!

## Installation

### For Users

1. Download the extension from the Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Start downloading videos!

### For Developers

1. Clone the repository:
   ```bash
   git clone https://github.com/emmanuel582/InstantDownload.git
   cd InstantDownload
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   pip install -r requirements.txt
   ```

3. Install extension dependencies:
   ```bash
   cd ../extension
   npm install
   ```

4. Start the development server:
   ```bash
   cd ../server
   npm run dev
   ```

5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` directory

## Development

### Server Setup

The server requires:
- Node.js >= 16.0.0
- Python >= 3.8.0
- FFmpeg

### Extension Development

The extension is built with:
- HTML/CSS/JavaScript
- Chrome Extension APIs
- Modern UI/UX practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please:
1. Check the [Issues](https://github.com/emmanuel582/InstantDownload/issues) page
2. Create a new issue if your problem isn't already listed

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video downloading capabilities
- [FFmpeg](https://ffmpeg.org/) for media processing
- All contributors and users of this project
