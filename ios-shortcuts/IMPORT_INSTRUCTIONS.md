# How to Import the iOS Shortcut

## Method 1: Direct File Import (Recommended)

### Step 1: Get the File to Your iPhone

**Option A: Using AirDrop (Mac to iPhone)**
1. Locate `RecordToNote.shortcut` on your Mac
2. Right-click → Share → AirDrop
3. Select your iPhone
4. Accept on iPhone

**Option B: Using iCloud Drive**
1. Upload `RecordToNote.shortcut` to iCloud Drive from your computer
2. On iPhone, open Files app
3. Navigate to iCloud Drive
4. Tap the `RecordToNote.shortcut` file

**Option C: Using Email**
1. Email `RecordToNote.shortcut` to yourself as an attachment
2. Open email on iPhone
3. Tap the attachment

**Option D: Using GitHub**
1. The file is in this repository at `ios-shortcuts/RecordToNote.shortcut`
2. On iPhone, navigate to the raw file on GitHub
3. Tap to download
4. Open in Shortcuts app

### Step 2: Import to Shortcuts App

1. Tap the `.shortcut` file on your iPhone
2. iOS will automatically open the Shortcuts app
3. You'll see a preview of the shortcut with all its actions
4. Scroll through and review what it does
5. Tap **"Add Shortcut"** at the bottom
6. The shortcut will appear in your Shortcuts library

### Step 3: Grant Permissions

When you first run the shortcut, iOS will ask for permissions:

1. **Microphone Access**
   - Tap "OK" when prompted
   - Or go to: Settings → Privacy & Security → Microphone → Shortcuts → Enable

2. **Notes Access**
   - Tap "OK" when prompted
   - Or go to: Settings → Shortcuts → Notes → Enable

### Step 4: Customize (Optional)

**Rename the Shortcut:**
1. Long-press on the shortcut
2. Tap "Rename"
3. Enter new name

**Change Icon:**
1. Tap the shortcut to open details
2. Tap the icon/color at the top
3. Choose color and glyph
4. Tap "Done"

**Add to Home Screen:**
1. Tap the shortcut to open details
2. Tap the (i) info button or settings
3. Scroll down and tap "Add to Home Screen"
4. Customize the name and icon
5. Tap "Add"

**Configure for Siri:**
1. Tap the shortcut to open details
2. Tap "Add to Siri"
3. Record a custom phrase (e.g., "Start recording")
4. Tap "Done"

**Set as Action Button (iPhone 15 Pro/16):**
1. Go to Settings → Action Button
2. Select "Shortcut"
3. Choose "Record to Note"
4. Now press and hold the Action Button to start recording

## Method 2: Manual Creation

If the file import doesn't work, follow the complete manual setup in `NOTE_RECORDING_SHORTCUT.md`.

## Troubleshooting

### "Unable to Import Shortcut"
- Ensure you're running iOS 18 or later
- Try downloading the file again
- Check that the file extension is `.shortcut` (not `.txt`)

### "Untrusted Shortcut"
This may appear for shortcuts from unknown sources:
1. Go to Settings → Shortcuts
2. Enable "Allow Untrusted Shortcuts"
3. Enter your passcode
4. Try importing again

### File Opens as Text
- The file might have been renamed with .txt extension
- Rename it back to `.shortcut`
- Make sure "Show file extensions" is enabled

### Shortcut Runs But Doesn't Work
1. Check microphone permission: Settings → Privacy → Microphone → Shortcuts
2. Check Notes permission: Settings → Shortcuts → Notes
3. Try running each action manually in the Shortcuts editor

## Using the Shortcut

### Quick Start
1. Tap the shortcut in the Shortcuts app
2. (Optional) Enter a name for the recording
3. Recording starts immediately
4. Tap "Finish" when done
5. Recording is saved to "Voice Recordings" note

### Access Methods
- **Shortcuts App**: Tap the shortcut
- **Home Screen**: Tap the icon (if added)
- **Siri**: Say your custom phrase
- **Widget**: Add Shortcuts widget and tap
- **Action Button**: Press and hold (iPhone 15 Pro/16)
- **Back Tap**: Settings → Accessibility → Touch → Back Tap

### Finding Your Recordings
1. Open the Notes app
2. Look for a note titled "Voice Recordings"
3. All your recordings are timestamped and organized here

## Uninstalling

To remove the shortcut:
1. Open Shortcuts app
2. Long-press on "Record to Note"
3. Tap "Delete Shortcut"
4. Confirm deletion

If you added it to your home screen, delete that icon separately:
1. Long-press the home screen icon
2. Tap "Remove App"
3. Choose "Delete Shortcut" or "Remove from Home Screen"

## Privacy & Data

- All recordings stay on your device in the Notes app
- If iCloud is enabled for Notes, recordings sync to iCloud
- No data is sent to third parties
- You can export recordings by sharing them from the Notes app

