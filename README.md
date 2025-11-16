# Flowfield - Awareness Puzzle

A puzzle game designed to induce and measure coherent awareness states through hypnagogic-like pattern recognition.

## The Fix

### What Was Broken

The original code had a critical bug: **pattern states were never activated**. The variables `truePatternActive` and `falsePatternActive` were declared and rendered, but never set to `true`. This made Level 1 (Glass) impossible to complete.

### What Changed

#### 1. **Pattern Activation System** (Lines 340-371)
- Added a scheduling system that activates true/false patterns based on player state
- **True pattern** appears when:
  - Player has been still for >4 seconds (hypnagogic state)
  - Coherence is >50%
  - This simulates the spontaneous imagery that emerges during relaxed, diffuse attention
- **False pattern** appears when:
  - Player is tapping frequently (<3s between taps)
  - Player has tapped >2 times
  - This represents the "trying too hard" state where focused attention blocks DMN activation

#### 2. **Coherence Building Rewired** (Lines 379-406)
Changed from rhythm-based to DMN-activation-based:
- **Deep stillness** (>6s): +0.008/tick - rewards sustained diffuse awareness
- **Medium stillness** (3-6s): +0.004/tick - intermediate state
- **Active tapping** (<2s): -0.015/tick - **penalizes** trying too hard
- Natural entropy: -0.002/tick - system decays without maintenance

This mirrors how the Default Mode Network activates during rest and is suppressed during active task focus.

#### 3. **Removed Auto-Win** (Lines 408-459)
- Glass mechanic now **requires** tapping during the true pattern window
- Player must recognize the pattern through sustained observation
- Tapping during false pattern or empty space adds noise and drops coherence
- Other levels retain auto-win for different mechanics

#### 4. **Visual Feedback** (Lines 655-669)
- Shows "True pattern emerging - tap now!" when true pattern appears
- Shows "Distraction" when false pattern appears
- Dev panel shows pattern states in real-time

## The Puzzle Mechanic

### Glass (Level 1)

This is not a rhythm game or reaction test. It's about **sustaining a receptive state**.

**The paradox:**
- Trying too hard (frequent tapping) → activates task-focused networks → prevents pattern emergence
- Letting go, sustained stillness → activates DMN → true pattern emerges

**To win:**
1. Stop tapping and wait (4-6+ seconds of stillness)
2. Watch coherence build slowly
3. A true pattern (magenta center glow) will eventually appear
4. Tap ONLY when you see it
5. Ignore false patterns (red off-center glow)

**Why this engages DMN/hypnagogic states:**
- Requires sustained defocused attention (DMN active)
- Punishes active seeking (executive control networks)
- Pattern emergence is spontaneous, not controllable
- Similar to watching for hypnagogic imagery at sleep onset

## Installation

```bash
npm install
npm run dev
```

## Technical Requirements

- Headphones (for binaural beats)
- Modern browser with Web Audio API
- Recommended: quiet environment, low lighting

## Theory

The puzzle exploits the inverse relationship between task-positive networks (active focus) and the Default Mode Network (rest/mind-wandering). True hypnagogic states occur at the boundary between waking executive control and DMN-dominant rest states. The puzzle creates this boundary through:

1. **Sustained attention without goal** → DMN activation
2. **Binaural beats** → neural entrainment to theta/alpha
3. **Visual ambiguity** → perceptual uncertainty requiring integration
4. **Unpredictable pattern timing** → prevents anticipatory control

## Not Therapy

This is a game mechanic exploration, not a therapeutic intervention. Hypnagogic state induction should not be confused with clinical interventions.
