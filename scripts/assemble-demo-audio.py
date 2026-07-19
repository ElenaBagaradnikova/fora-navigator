import json
import sys
import wave
from pathlib import Path


workspace = Path.cwd()
timeline_path = workspace / "scripts" / "video-timeline.json"
cues_dir = workspace / "test-results" / "video" / "audio-cues"
output_path = workspace / "test-results" / "video" / "fora-navigator-voiceover.wav"

timeline = json.loads(timeline_path.read_text(encoding="utf-8"))
cue_paths = [cues_dir / f"cue-{index:02d}.wav" for index in range(1, len(timeline) + 1)]

if not all(path.exists() for path in cue_paths):
    missing = [str(path) for path in cue_paths if not path.exists()]
    raise SystemExit(f"Missing generated cues: {missing}")

with wave.open(str(cue_paths[0]), "rb") as first:
    params = first.getparams()

if params.comptype != "NONE":
    raise SystemExit("Expected uncompressed PCM narration WAV files.")

output_path.parent.mkdir(parents=True, exist_ok=True)
report = []

with wave.open(str(output_path), "wb") as output:
    output.setnchannels(params.nchannels)
    output.setsampwidth(params.sampwidth)
    output.setframerate(params.framerate)

    for index, (cue, cue_path) in enumerate(zip(timeline, cue_paths), start=1):
        slot_seconds = float(cue["end"] - cue["start"])
        slot_frames = round(slot_seconds * params.framerate)
        with wave.open(str(cue_path), "rb") as source:
            if (
                source.getnchannels() != params.nchannels
                or source.getsampwidth() != params.sampwidth
                or source.getframerate() != params.framerate
                or source.getcomptype() != params.comptype
            ):
                raise SystemExit(f"Cue format mismatch: {cue_path}")
            frames = source.readframes(source.getnframes())
            cue_frames = source.getnframes()

        cue_seconds = cue_frames / params.framerate
        if cue_frames > slot_frames:
            raise SystemExit(
                f"Cue {index} is {cue_seconds:.2f}s but its slot is {slot_seconds:.2f}s. "
                "Increase that cue's speech rate and regenerate."
            )

        output.writeframes(frames)
        silence_frames = slot_frames - cue_frames
        output.writeframes(b"\x00" * silence_frames * params.sampwidth * params.nchannels)
        report.append(
            {
                "cue": index,
                "spokenSeconds": round(cue_seconds, 2),
                "slotSeconds": slot_seconds,
                "silenceSeconds": round(silence_frames / params.framerate, 2),
            }
        )

print(json.dumps({"output": str(output_path), "duration": timeline[-1]["end"], "cues": report}, indent=2))
