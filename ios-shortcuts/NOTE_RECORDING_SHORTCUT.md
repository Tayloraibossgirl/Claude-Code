# iOS 18 Note Recording Shortcut

This guide explains how to create an iOS 18 shortcut that starts a voice recording directly in a note.

## Overview

This shortcut allows you to:
- Quickly start a voice recording with one tap
- Automatically save the recording to a new or existing note
- Organize recordings with timestamps and titles

## Prerequisites

- iPhone running iOS 18 or later
- Notes app installed (built-in)
- Shortcuts app (built-in)

## Setup Instructions

### Method 1: Create the Shortcut Manually

1. **Open the Shortcuts app** on your iPhone

2. **Create a New Shortcut**
   - Tap the "+" button in the top right
   - Tap "Add Action"

3. **Add the Actions** (in this order):

   **Step 1: Get Note Name**
   - Search for "Ask for Input"
   - Configure:
     - Question: "Recording name (optional)"
     - Input Type: Text
     - Default Answer: Leave blank

   **Step 2: Create Timestamp**
   - Search for "Current Date"
   - Add action "Current Date"
   - Tap on the action to format
   - Set format to "Custom"
   - Use format: "yyyy-MM-dd HH:mm:ss"

   **Step 3: Create Note Title**
   - Search for "Text"
   - Add a Text action
   - Type: "Voice Recording - "
   - Tap after the dash and select "Provided Input" (from Step 1)
   - Add a new line (press return)
   - Type: "Date: "
   - Select "Current Date" (from Step 2)

   **Step 4: Find or Create Note**
   - Search for "Find Notes"
   - Configure:
     - Filter: "Title is"
     - Value: "Voice Recordings" (or your preferred note name)
   - Enable "If There's No Result" at the bottom
   - Set to: "Show in Shortcuts"

   **Alternative Step 4 (simpler):**
   - Search for "Create Note"
   - Leave the note field empty for now

   **Step 5: Start Recording**
   - Search for "Record Audio"
   - Configure:
     - Start Recording: Immediately
     - Finish Recording: On Tap
     - Audio Quality: High (or Normal for smaller files)

   **Step 6: Save to Note**
   - Search for "Append to Note"
   - Configure:
     - Text: Select "Recorded Audio" from Step 5
     - Note: Select "Notes" from Step 4 (or create new note)
     - Add a separator: Add the text from Step 3 before the recording

4. **Name Your Shortcut**
   - Tap the shortcut name at the top
   - Rename to "Record to Note" or similar

5. **Customize Icon (Optional)**
   - Tap the icon next to the name
   - Choose a color and symbol (🎤 microphone recommended)

6. **Add to Home Screen (Optional)**
   - Tap the settings icon (three dots)
   - Scroll down and tap "Add to Home Screen"
   - Customize name and icon
   - Tap "Add"

### Method 2: Simplified Quick Recording

For a simpler version that just records and creates a new note each time:

1. **Create New Shortcut**

2. **Add Actions**:
   - **Record Audio**: Start immediately, finish on tap
   - **Create Note**:
     - Content: Select "Recorded Audio"
     - Enable "Show When Run" to choose location

3. **Done!**

## Usage

### Running the Shortcut

**From Shortcuts App:**
- Open Shortcuts
- Tap your "Record to Note" shortcut

**From Home Screen:**
- Tap the shortcut icon (if added to home screen)

**From Widget:**
- Add a Shortcuts widget to your home screen
- Configure it to show this shortcut

**Using Siri:**
- Say "Hey Siri, Record to Note" (or whatever you named it)

**From Action Button (iPhone 15 Pro/16):**
- Go to Settings > Action Button
- Select "Shortcut"
- Choose your recording shortcut
- Press and hold the Action Button to start recording

### Recording Process

1. Tap/activate the shortcut
2. (Optional) Enter a name for the recording
3. Recording starts immediately
4. Tap "Finish" when done
5. Recording is automatically appended to your note

## Advanced Customization

### Add Voice Memo Style
```
Add these actions before "Append to Note":
1. Rename: Recorded Audio to "Recording [Current Date]"
2. Save File: To iCloud Drive/Recordings
3. Get Link to File
4. Append link to note instead of full audio
```

### Add Transcription (iOS 18+)
```
After "Record Audio":
1. Get Text from: Recorded Audio (uses built-in transcription)
2. Create Text:
   "Transcription:
   [Text from Audio]

   ---
   "
3. Append transcription + audio to note
```

### Auto-organize by Date
```
Before "Append to Note":
1. Format Date: Current Date as "MMMM yyyy" (e.g., "December 2024")
2. Find Notes where Title is [Formatted Date]
3. If not found, Create Note with that title
4. Append to that note
```

## Troubleshooting

**Recording doesn't start:**
- Check microphone permissions: Settings > Privacy > Microphone > Shortcuts

**Can't save to Notes:**
- Check Notes permissions: Settings > Shortcuts > Notes (enable)

**Shortcut runs but nothing happens:**
- Tap the shortcut in edit mode
- Run it step by step to see where it fails
- Check that all permissions are granted

**Audio quality is poor:**
- Change "Record Audio" quality setting to "High"
- Ensure you're in a quiet environment

## Tips

- Use descriptive names for easy searching later
- Consider creating separate notes for different recording types (meetings, ideas, reminders)
- Enable iCloud sync for Notes to access recordings on all devices
- Combine with automation triggers (time-based, location-based)

## Privacy & Storage

- Recordings are stored in your Notes app (local or iCloud)
- Audio files can be large - monitor your storage
- To export: Open note, tap recording, tap share icon
- To delete: Swipe left on recording in note

## Integration Ideas

- **Morning Journal**: Auto-run at specific time to record daily thoughts
- **Meeting Notes**: Trigger when arriving at work location
- **Voice Memos**: Quick capture with automatic organization
- **Bedtime Reflections**: Record thoughts before sleep

