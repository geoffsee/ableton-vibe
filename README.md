# ableton-vibe

1. Setup [Ableton.js](https://github.com/leolabs/ableton-js?tab=readme-ov-file#prerequisites)

2. Start the assistant
```shell
git clone https://github.com/geoffsee/ableton-vibe.git
bun i && OPENAI_API_KEY=$YOUR_API_KEY bun dev
open http://localhost:3000
echo "???"
echo "profit"
```

Optional: configure sample search directories
```shell
# Comma- or semicolon-separated directories to search for audio samples
export SAMPLE_DIRS="/Volumes/Samples;~/Music/Samples"
```
