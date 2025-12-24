# Prompt for Claude Browser to Create iOS Note Recording Shortcut

Copy and paste this entire prompt into Claude (claude.ai) in your browser:

---

## PROMPT START

Please create an iOS 18 Shortcut file for me that records voice notes and saves them to the Notes app.

Here are the exact specifications:

### Shortcut Requirements:

**Name**: "Record to Note"

**Actions** (in order):

1. **Ask for Input**
   - Question: "Recording name (optional)"
   - Input Type: Text
   - Allow Multiple Lines: No

2. **Get Current Date**
   - Format: Custom
   - Custom Format: "yyyy-MM-dd HH:mm:ss"

3. **Create Text Block**
   - Content:
     ```
     Voice Recording - [Provided Input from step 1]
     Date: [Current Date from step 2]

     ```

4. **Record Audio**
   - Start Recording: Immediately
   - Finish Recording: On Tap
   - Audio Quality: High

5. **Find Notes**
   - Filter: Title is "Voice Recordings"
   - Sort By: Date Modified
   - Order: Latest First
   - Limit: 1
   - If No Result: Create a new note with title "Voice Recordings"

6. **Append to Note**
   - Note: [Notes from step 5]
   - Text: [Text from step 3] followed by [Recorded Audio from step 4]
   - Add separator: "---" with blank lines

### Create THREE files for me:

1. **RecordToNote.shortcut** - The actual iOS shortcut file in proper plist/XML format that can be imported into iOS
2. **setup-instructions.md** - Step-by-step guide for importing and using the shortcut
3. **variations.md** - Document with 3 additional variations:
   - Simple version (just record and create new note)
   - With transcription (iOS 18+ speech-to-text)
   - Monthly organization (auto-organize by month)

### Important Technical Details:

- The .shortcut file should be valid plist XML format
- Use proper Apple Shortcuts action identifiers
- Include WFWorkflowActions array with all actions
- Each action should have WFWorkflowActionIdentifier and WFWorkflowActionParameters
- The file should be importable directly to iOS via AirDrop or iCloud

Please generate all three files with complete, working code.

## PROMPT END

---

## What to Do with Claude's Response

1. **Copy the .shortcut file** content that Claude generates
2. **Save it** with a .shortcut extension on your Mac or PC
3. **Transfer to iPhone** using one of these methods:
   - AirDrop from Mac
   - Upload to iCloud Drive and download on iPhone
   - Email to yourself and open on iPhone
   - Use the Files app to sync

4. **Import on iPhone**:
   - Tap the .shortcut file
   - iOS will open the Shortcuts app
   - Review the actions
   - Tap "Add Shortcut"
   - Grant permissions (Microphone, Notes)

5. **Use the shortcut**:
   - Tap it in Shortcuts app
   - Or say "Hey Siri, Record to Note"
   - Or add to Home Screen

## Alternative: If Claude Can't Generate Binary Format

If Claude mentions it can't create the binary .shortcut format, ask it to:

1. Create the complete plist XML that you can manually convert
2. Provide step-by-step manual creation instructions
3. Generate a configuration JSON that describes each action in detail

Then use the manual setup instructions in NOTE_RECORDING_SHORTCUT.md
