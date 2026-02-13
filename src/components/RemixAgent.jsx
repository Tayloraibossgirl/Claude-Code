import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgentOrchestrator } from '../agents/AgentOrchestrator.js';

/**
 * RemixAgent — Main UI Component
 *
 * Drop a song title → Agent team analyzes it → Generates a full
 * remix blueprint → Exports djay Pro-ready performance guide.
 */

// Phase display config
const PHASE_INFO = {
  analyze:    { label: 'Analyzing Song',       icon: '1', color: '#00BFFF' },
  style:      { label: 'Selecting Style',      icon: '2', color: '#FFD700' },
  remix:      { label: 'Building Remix',       icon: '3', color: '#FF6B35' },
  'djay-pro': { label: 'djay Pro Export',      icon: '4', color: '#FF0000' },
  complete:   { label: 'Complete',             icon: '5', color: '#00FF88' },
  error:      { label: 'Error',               icon: '!', color: '#FF4444' },
};

export default function RemixAgent() {
  // State
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('auto');
  const [customBpm, setCustomBpm] = useState('');
  const [blendRatio, setBlendRatio] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [completedPhases, setCompletedPhases] = useState([]);

  // Results
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // View state for results
  const [activeTab, setActiveTab] = useState('timeline');

  const orchestratorRef = useRef(null);

  // Initialize orchestrator
  useEffect(() => {
    orchestratorRef.current = new AgentOrchestrator();
  }, []);

  // Generate remix
  const handleGenerate = useCallback(async () => {
    if (!songTitle.trim()) return;

    setIsGenerating(true);
    setProgress(0);
    setCurrentPhase(null);
    setPhaseMessage('');
    setCompletedPhases([]);
    setResult(null);
    setError(null);

    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    // Listen for updates
    const unsub = orchestrator.onUpdate(({ phase, progress: p, message }) => {
      setProgress(p);
      setCurrentPhase(phase);
      setPhaseMessage(message);
      if (p > 0) {
        setCompletedPhases(prev => {
          if (!prev.includes(phase)) return [...prev, phase];
          return prev;
        });
      }
    });

    try {
      const options = {
        artist: artistName || undefined,
        style: selectedStyle === 'blend' ? 'auto' : selectedStyle,
        bpm: customBpm ? parseInt(customBpm) : undefined,
        blend: selectedStyle === 'blend' ? blendRatio / 100 : undefined,
      };

      const res = await orchestrator.generateRemix(songTitle, options);
      setResult(res);
      setActiveTab('timeline');
    } catch (err) {
      setError(err.message);
    } finally {
      unsub();
      setIsGenerating(false);
    }
  }, [songTitle, artistName, selectedStyle, customBpm, blendRatio]);

  // Export session JSON
  const handleExport = useCallback(() => {
    if (!result) return;
    const data = JSON.stringify(result.djayPro.sessionExport, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.analysis.original.title}-remix-session.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>REMIX AGENT</h1>
        <p style={styles.subtitle}>
          Drop a song title. Get a full remix blueprint for djay Pro.
        </p>
      </header>

      {/* Input Section */}
      <div style={styles.inputSection}>
        <div style={styles.inputRow}>
          <input
            style={styles.songInput}
            type="text"
            placeholder="Song title (e.g. Blinding Lights)"
            value={songTitle}
            onChange={e => setSongTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            disabled={isGenerating}
          />
          <input
            style={styles.artistInput}
            type="text"
            placeholder="Artist (optional)"
            value={artistName}
            onChange={e => setArtistName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            disabled={isGenerating}
          />
        </div>

        {/* Style Selection */}
        <div style={styles.styleRow}>
          {['auto', 'hyper-techno', 'fast-basston', 'blend'].map(s => (
            <button
              key={s}
              style={{
                ...styles.styleBtn,
                ...(selectedStyle === s ? styles.styleBtnActive : {}),
              }}
              onClick={() => setSelectedStyle(s)}
              disabled={isGenerating}
            >
              {s === 'auto' ? 'Auto-Select' :
               s === 'hyper-techno' ? 'Hyper Techno' :
               s === 'fast-basston' ? 'Fast Basston' : 'Blend Both'}
            </button>
          ))}
        </div>

        {/* Blend slider */}
        {selectedStyle === 'blend' && (
          <div style={styles.blendRow}>
            <span style={styles.blendLabel}>Hyper Techno</span>
            <input
              type="range" min="0" max="100" value={blendRatio}
              onChange={e => setBlendRatio(parseInt(e.target.value))}
              style={styles.blendSlider}
            />
            <span style={styles.blendLabel}>Fast Basston</span>
            <span style={styles.blendValue}>{blendRatio}%</span>
          </div>
        )}

        {/* Advanced Options */}
        <button
          style={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div style={styles.advancedRow}>
            <label style={styles.advLabel}>
              Override BPM:
              <input
                style={styles.bpmInput}
                type="number" min="80" max="200"
                placeholder="auto"
                value={customBpm}
                onChange={e => setCustomBpm(e.target.value)}
              />
            </label>
          </div>
        )}

        {/* Generate Button */}
        <button
          style={{
            ...styles.generateBtn,
            ...(isGenerating ? styles.generateBtnDisabled : {}),
          }}
          onClick={handleGenerate}
          disabled={isGenerating || !songTitle.trim()}
        >
          {isGenerating ? 'GENERATING...' : 'DROP THE REMIX'}
        </button>
      </div>

      {/* Progress Section */}
      {isGenerating && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{ ...styles.progressFill, width: `${progress}%` }}
            />
          </div>
          <div style={styles.phaseTracker}>
            {Object.entries(PHASE_INFO).filter(([k]) => k !== 'error').map(([key, info]) => {
              const isActive = currentPhase === key;
              const isDone = completedPhases.includes(key) && !isActive;
              return (
                <div
                  key={key}
                  style={{
                    ...styles.phaseItem,
                    opacity: isActive ? 1 : isDone ? 0.6 : 0.25,
                    borderColor: isActive ? info.color : 'transparent',
                  }}
                >
                  <span style={{
                    ...styles.phaseIcon,
                    backgroundColor: isActive ? info.color : isDone ? '#333' : '#1a1a1a',
                    color: isDone ? '#888' : '#fff',
                  }}>
                    {isDone ? '\u2713' : info.icon}
                  </span>
                  <span style={styles.phaseLabel}>{info.label}</span>
                </div>
              );
            })}
          </div>
          {phaseMessage && (
            <p style={styles.phaseMessage}>{phaseMessage}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={styles.resultsSection}>
          {/* Results Header */}
          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>
              {result.analysis.original.title}
              <span style={styles.resultsMeta}>
                {' '}&rarr; {result.blueprint.meta.remixStyle} Remix
              </span>
            </h2>
            <div style={styles.resultsBadges}>
              <span style={styles.badge}>{result.blueprint.meta.targetBpm} BPM</span>
              <span style={styles.badge}>{result.blueprint.meta.targetKey}</span>
              <span style={styles.badge}>
                {Math.floor(result.blueprint.meta.estimatedDurationSec / 60)}:
                {String(Math.round(result.blueprint.meta.estimatedDurationSec % 60)).padStart(2, '0')}
              </span>
              <span style={styles.badge}>
                {result.blueprint.arrangement.filter(s => s.id.startsWith('drop-')).length} Drops
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={styles.tabBar}>
            {[
              { id: 'timeline', label: 'Timeline' },
              { id: 'guide', label: 'Live Guide' },
              { id: 'effects', label: 'Effects' },
              { id: 'midi', label: 'MIDI Map' },
              { id: 'vocals', label: 'Vocals' },
              { id: 'export', label: 'Export' },
            ].map(tab => (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab.id ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={styles.tabContent}>
            {activeTab === 'timeline' && <TimelineView result={result} />}
            {activeTab === 'guide' && <LiveGuideView result={result} />}
            {activeTab === 'effects' && <EffectsView result={result} />}
            {activeTab === 'midi' && <MidiView result={result} />}
            {activeTab === 'vocals' && <VocalsView result={result} />}
            {activeTab === 'export' && <ExportView result={result} onExport={handleExport} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// SUB-VIEWS
// ═══════════════════════════════════════════════

function TimelineView({ result }) {
  const { arrangement } = result.blueprint;
  const totalBars = result.blueprint.meta.totalBars;

  return (
    <div>
      <pre style={styles.asciiTimeline}>
        {result.djayPro.performanceGuide}
      </pre>

      <div style={styles.sectionList}>
        {arrangement.map(section => {
          const widthPct = (section.bars / totalBars) * 100;
          const color = getSectionColor(section.id);

          return (
            <div key={section.id} style={styles.sectionItem}>
              <div style={styles.sectionBar}>
                <div style={{
                  ...styles.sectionFill,
                  width: `${widthPct}%`,
                  backgroundColor: color,
                  opacity: 0.3 + section.energy * 0.7,
                }} />
              </div>
              <div style={styles.sectionInfo}>
                <span style={{ ...styles.sectionName, color }}>{section.name}</span>
                <span style={styles.sectionDetail}>
                  Bars {section.startBar + 1}-{section.startBar + section.bars}
                  {' | '}{Math.round(section.energy * 100)}% energy
                  {' | '}{section.bpm} BPM
                </span>
              </div>
              <p style={styles.sectionDesc}>{section.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveGuideView({ result }) {
  const { liveGuide } = result.djayPro;

  return (
    <div style={styles.guideList}>
      {liveGuide.map(step => (
        <div key={step.step} style={styles.guideStep}>
          <div style={styles.guideHeader}>
            <span style={styles.guideStepNum}>
              {step.step === 0 ? 'SETUP' : `Step ${step.step}`}
            </span>
            <span style={styles.guideTitle}>{step.title}</span>
            {step.time && <span style={styles.guideTime}>{step.time}</span>}
            {step.energy && <span style={styles.guideEnergy}>{step.energy}</span>}
          </div>
          <ul style={styles.guideInstructions}>
            {step.instructions.map((inst, i) => (
              <li key={i} style={styles.guideInstruction}>{inst}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EffectsView({ result }) {
  const { effectsPreset } = result.djayPro;

  return (
    <div>
      <h3 style={styles.viewTitle}>Effect Rack: {effectsPreset.name}</h3>

      <div style={styles.effectSlots}>
        {effectsPreset.slots.map(slot => (
          <div key={slot.slot} style={styles.effectSlot}>
            <div style={styles.effectSlotHeader}>
              <span style={styles.effectSlotNum}>Slot {slot.slot}</span>
              <span style={styles.effectName}>{slot.effect}</span>
            </div>
            <div style={styles.effectConfig}>
              {Object.entries(slot.config).filter(([k]) => k !== 'tip').map(([key, val]) => (
                <div key={key} style={styles.effectParam}>
                  <span style={styles.paramName}>{key}</span>
                  <span style={styles.paramValue}>{String(val)}</span>
                </div>
              ))}
            </div>
            {slot.config.tip && (
              <p style={styles.effectTip}>{slot.config.tip}</p>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ ...styles.viewTitle, marginTop: 24 }}>Per-Section Activation</h3>
      <div style={styles.sectionPresets}>
        {Object.entries(effectsPreset.sectionPresets).map(([section, preset]) => (
          <div key={section} style={styles.sectionPreset}>
            <span style={styles.presetSection}>{section}</span>
            <span style={styles.presetEffects}>{preset.active.join(' + ')}</span>
            <span style={styles.presetIntensity}>
              {Math.round(preset.intensity * 100)}%
            </span>
            <span style={styles.presetNote}>{preset.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MidiView({ result }) {
  const { midiMapping } = result.djayPro;

  return (
    <div>
      <h3 style={styles.viewTitle}>MIDI Controller Mapping</h3>
      <p style={styles.viewSubtitle}>{midiMapping.description}</p>

      <h4 style={styles.mappingCategory}>Knobs</h4>
      <div style={styles.mappingGrid}>
        {midiMapping.knobs.map(k => (
          <div key={k.knob} style={styles.mappingItem}>
            <span style={styles.mappingId}>Knob {k.knob}</span>
            <span style={styles.mappingFunc}>{k.function}</span>
            <span style={styles.mappingNote}>{k.note}</span>
          </div>
        ))}
      </div>

      <h4 style={styles.mappingCategory}>Pads</h4>
      <div style={styles.padGrid}>
        {midiMapping.pads.map(p => (
          <div key={p.pad} style={{
            ...styles.padItem,
            borderColor: p.color,
          }}>
            <span style={styles.padNum}>{p.pad}</span>
            <span style={styles.padFunc}>{p.function}</span>
          </div>
        ))}
      </div>

      <h4 style={styles.mappingCategory}>Shift Functions</h4>
      <div style={styles.mappingGrid}>
        {midiMapping.buttons.map(b => (
          <div key={b.button} style={styles.mappingItem}>
            <span style={styles.mappingId}>{b.button}</span>
            <span style={styles.mappingFunc}>{b.function}</span>
            <span style={styles.mappingNote}>{b.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VocalsView({ result }) {
  const { vocalPlan } = result.blueprint;

  if (!vocalPlan.hasVocals) {
    return (
      <div style={styles.noVocals}>
        <p>No vocals detected in this genre.</p>
        <p>Pure instrumental remix — bass and beats only.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={styles.viewTitle}>Vocal Treatment Plan</h3>
      <p style={styles.viewSubtitle}>{vocalPlan.isolation}</p>

      {Object.entries(vocalPlan.treatment).map(([section, plan]) => (
        <div key={section} style={styles.vocalSection}>
          <h4 style={styles.vocalSectionName}>{section.toUpperCase()}</h4>
          <p style={styles.vocalAction}>{plan.action}</p>
          <div style={styles.vocalDetails}>
            {plan.chop !== undefined && (
              <span style={styles.vocalTag}>
                {plan.chop ? `Chop: ${plan.chopResolution}` : 'No chop'}
              </span>
            )}
            {plan.effects && plan.effects.map(fx => (
              <span key={fx} style={styles.vocalTag}>{fx}</span>
            ))}
            {plan.filter && (
              <span style={styles.vocalTag}>{plan.filter}</span>
            )}
            {plan.vocoder && (
              <span style={{ ...styles.vocalTag, backgroundColor: '#6b21a8' }}>VOCODER</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExportView({ result, onExport }) {
  const cheatSheet = result.djayPro.cheatSheet;

  return (
    <div>
      <h3 style={styles.viewTitle}>Quick Reference</h3>

      <div style={styles.cheatGrid}>
        {Object.entries(cheatSheet.quickRef).map(([key, val]) => (
          <div key={key} style={styles.cheatItem}>
            <span style={styles.cheatKey}>{key}</span>
            <span style={styles.cheatVal}>{String(val)}</span>
          </div>
        ))}
      </div>

      <h3 style={{ ...styles.viewTitle, marginTop: 24 }}>Transition Timeline</h3>
      <div style={styles.transitionList}>
        {cheatSheet.transitions.map((t, i) => (
          <div key={i} style={styles.transitionItem}>{t}</div>
        ))}
      </div>

      <div style={styles.exportActions}>
        <button style={styles.exportBtn} onClick={onExport}>
          Export Session JSON
        </button>
        <p style={styles.exportNote}>
          Export the remix session data as JSON. Can be used as a reference
          or imported into custom djay Pro automation tools.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getSectionColor(id) {
  if (id === 'intro') return '#00BFFF';
  if (id.startsWith('buildup')) return '#FFD700';
  if (id.startsWith('fake-drop')) return '#FF4500';
  if (id.startsWith('drop')) return '#FF0000';
  if (id.startsWith('breakdown')) return '#9370DB';
  if (id === 'outro') return '#00BFFF';
  return '#666';
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#e0e0e0',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    padding: '24px',
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
    borderBottom: '1px solid #222',
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 900,
    letterSpacing: 8,
    background: 'linear-gradient(135deg, #FF0000, #FF6B35, #FFD700)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },

  // Input
  inputSection: {
    marginBottom: 32,
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
  },
  songInput: {
    flex: 2,
    padding: '14px 18px',
    fontSize: 16,
    backgroundColor: '#111',
    border: '2px solid #333',
    borderRadius: 8,
    color: '#fff',
    outline: 'none',
  },
  artistInput: {
    flex: 1,
    padding: '14px 18px',
    fontSize: 16,
    backgroundColor: '#111',
    border: '2px solid #333',
    borderRadius: 8,
    color: '#fff',
    outline: 'none',
  },
  styleRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  styleBtn: {
    flex: 1,
    padding: '10px 16px',
    fontSize: 13,
    backgroundColor: '#151515',
    border: '1px solid #333',
    borderRadius: 6,
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  styleBtnActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#FF6B35',
    color: '#FF6B35',
  },
  blendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: '8px 12px',
    backgroundColor: '#111',
    borderRadius: 6,
  },
  blendLabel: { fontSize: 12, color: '#888' },
  blendSlider: { flex: 1 },
  blendValue: { fontSize: 12, color: '#FFD700', minWidth: 36 },
  advancedToggle: {
    background: 'none',
    border: 'none',
    color: '#555',
    fontSize: 12,
    cursor: 'pointer',
    marginBottom: 12,
    padding: 0,
  },
  advancedRow: {
    padding: '12px',
    backgroundColor: '#111',
    borderRadius: 6,
    marginBottom: 12,
  },
  advLabel: { fontSize: 13, color: '#888' },
  bpmInput: {
    marginLeft: 8,
    padding: '6px 10px',
    width: 80,
    backgroundColor: '#0a0a0a',
    border: '1px solid #333',
    borderRadius: 4,
    color: '#fff',
    fontSize: 13,
  },
  generateBtn: {
    width: '100%',
    padding: '16px',
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 4,
    backgroundColor: '#FF0000',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  generateBtnDisabled: {
    backgroundColor: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },

  // Progress
  progressSection: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 8,
    border: '1px solid #222',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#222',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #FF0000, #FF6B35, #FFD700)',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  phaseTracker: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s',
  },
  phaseIcon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  phaseLabel: { fontSize: 10, color: '#888' },
  phaseMessage: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    margin: 0,
  },

  // Error
  errorBox: {
    padding: 16,
    backgroundColor: '#1a0000',
    border: '1px solid #FF4444',
    borderRadius: 8,
    color: '#FF4444',
    marginBottom: 24,
    fontSize: 13,
  },

  // Results
  resultsSection: {
    borderTop: '1px solid #222',
    paddingTop: 24,
  },
  resultsHeader: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  resultsMeta: {
    color: '#FF6B35',
    fontWeight: 400,
  },
  resultsBadges: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    padding: '4px 10px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: 4,
    fontSize: 12,
    color: '#aaa',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    borderBottom: '1px solid #222',
    paddingBottom: 0,
  },
  tab: {
    padding: '8px 16px',
    fontSize: 13,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#FF6B35',
    borderBottomColor: '#FF6B35',
  },
  tabContent: {
    minHeight: 300,
  },

  // Timeline
  asciiTimeline: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    lineHeight: 1.6,
    color: '#888',
    backgroundColor: '#0a0a0a',
    padding: 16,
    borderRadius: 8,
    overflowX: 'auto',
    border: '1px solid #1a1a1a',
    whiteSpace: 'pre',
  },
  sectionList: {
    marginTop: 16,
  },
  sectionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 6,
  },
  sectionBar: {
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sectionFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionName: {
    fontWeight: 700,
    fontSize: 14,
  },
  sectionDetail: {
    fontSize: 11,
    color: '#666',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#888',
    margin: 0,
  },

  // Live Guide
  guideList: {},
  guideStep: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    borderLeft: '3px solid #333',
  },
  guideHeader: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  guideStepNum: {
    fontSize: 11,
    fontWeight: 700,
    color: '#FF6B35',
    backgroundColor: '#1a1008',
    padding: '2px 8px',
    borderRadius: 4,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
  },
  guideTime: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 'auto',
  },
  guideEnergy: {
    fontSize: 11,
    color: '#888',
  },
  guideInstructions: {
    margin: 0,
    paddingLeft: 20,
  },
  guideInstruction: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 1.8,
  },

  // Effects
  viewTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 12,
    marginTop: 0,
  },
  viewSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  effectSlots: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  effectSlot: {
    flex: '1 1 250px',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    border: '1px solid #222',
  },
  effectSlotHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  effectSlotNum: {
    fontSize: 11,
    color: '#666',
  },
  effectName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FFD700',
  },
  effectConfig: {},
  effectParam: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '2px 0',
    fontSize: 12,
  },
  paramName: { color: '#888' },
  paramValue: { color: '#aaa' },
  effectTip: {
    fontSize: 11,
    color: '#FF6B35',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sectionPresets: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sectionPreset: {
    display: 'flex',
    gap: 12,
    padding: '8px 12px',
    backgroundColor: '#111',
    borderRadius: 4,
    fontSize: 12,
    alignItems: 'center',
  },
  presetSection: { color: '#888', minWidth: 80, fontWeight: 700, textTransform: 'uppercase' },
  presetEffects: { color: '#FFD700', minWidth: 120 },
  presetIntensity: { color: '#FF6B35', minWidth: 40 },
  presetNote: { color: '#666', flex: 1 },

  // MIDI
  mappingCategory: {
    fontSize: 14,
    fontWeight: 700,
    color: '#888',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  mappingGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  mappingItem: {
    display: 'flex',
    gap: 12,
    padding: '8px 12px',
    backgroundColor: '#111',
    borderRadius: 4,
    fontSize: 12,
    alignItems: 'center',
  },
  mappingId: { color: '#FF6B35', minWidth: 80, fontWeight: 700 },
  mappingFunc: { color: '#fff', flex: 1 },
  mappingNote: { color: '#666', fontStyle: 'italic' },
  padGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  },
  padItem: {
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 8,
    border: '2px solid #333',
    textAlign: 'center',
  },
  padNum: {
    display: 'block',
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    marginBottom: 4,
  },
  padFunc: {
    display: 'block',
    fontSize: 10,
    color: '#aaa',
  },

  // Vocals
  noVocals: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  vocalSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 8,
  },
  vocalSectionName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#9370DB',
    marginTop: 0,
    marginBottom: 8,
    letterSpacing: 2,
  },
  vocalAction: {
    fontSize: 13,
    color: '#fff',
    margin: '0 0 8px 0',
  },
  vocalDetails: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  vocalTag: {
    padding: '2px 8px',
    backgroundColor: '#1a1a2e',
    borderRadius: 4,
    fontSize: 11,
    color: '#aaa',
  },

  // Export
  cheatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  cheatItem: {
    padding: 12,
    backgroundColor: '#111',
    borderRadius: 6,
    textAlign: 'center',
  },
  cheatKey: {
    display: 'block',
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  cheatVal: {
    display: 'block',
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  transitionList: {
    marginBottom: 24,
  },
  transitionItem: {
    padding: '6px 12px',
    fontSize: 12,
    color: '#888',
    borderLeft: '2px solid #333',
    marginBottom: 2,
  },
  exportActions: {
    textAlign: 'center',
    paddingTop: 24,
    borderTop: '1px solid #222',
  },
  exportBtn: {
    padding: '14px 32px',
    fontSize: 14,
    fontWeight: 700,
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    letterSpacing: 2,
  },
  exportNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
};
