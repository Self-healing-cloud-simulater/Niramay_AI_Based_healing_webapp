/**
 * usePipelineEvents — Polls /api/v1/pipeline/events every 2s.
 * Returns the last N pipeline stage transition events and the current active stage label.
 * Used by PipelineProgressBar (Feature 4).
 *
 * Also fires toast notifications on stage transitions (Feature 3).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineEvent } from '../designSystem';
import { useToast } from '../components/ToastNotification';

const STAGE_LABELS: Record<string, string> = {
  stage_1_complete: 'Ingestion',
  stage_2_complete: 'Detection',
  stage_3_causal_engine_running: 'Analysis',
  stage_3_complete: 'Analysis',
  stage_4_healing_executing: 'Healing',
  stage_4_healing_complete: 'Healing',
  stage_5_cooldown: 'Cooldown',
  stage_6_verification_running: 'Verification',
  healing_complete: 'Complete',
  healing_failed_escalated: 'Failed',
  healing_failed_email_sent: 'Failed',
};

/**
 * Human-readable label for toast notifications.
 */
const STAGE_FRIENDLY_NAMES: Record<string, string> = {
  stage_1_complete: 'Ingestion',
  stage_2_complete: 'Detection',
  stage_3_causal_engine_running: 'Causal Analysis',
  stage_3_complete: 'Analysis',
  stage_4_healing_executing: 'Healing Execution',
  stage_4_healing_complete: 'Healing',
  stage_5_cooldown: 'Cooldown',
  stage_6_verification_running: 'Verification',
  healing_complete: 'Verification',
  healing_failed_escalated: 'Escalation',
  healing_failed_email_sent: 'Escalation',
};

/**
 * Maps current stage to the NEXT stage that is starting.
 */
const NEXT_STAGE_LABEL: Record<string, string> = {
  stage_1_complete: 'Detection',
  stage_2_complete: 'Causal Analysis',
  stage_3_causal_engine_running: 'Analysis Completion',
  stage_3_complete: 'Healing Execution',
  stage_4_healing_executing: 'Healing',
  stage_4_healing_complete: 'Cooldown',
  stage_5_cooldown: 'Verification',
  stage_6_verification_running: '',   // wait — verification running
  healing_complete: '',    // terminal — pipeline complete
  healing_failed_escalated: '', // terminal — escalated
  healing_failed_email_sent: '', // terminal — escalated with email
};

export type NodeState = 'idle' | 'active' | 'completed' | 'failed';

export interface PipelineNodeStatus {
  label: string;
  state: NodeState;
  timestamp?: string;
}

/** Maps the current pipeline stage string to per-node states for the 5-node bar. */
function deriveNodeStates(currentStage: string | null, events: PipelineEvent[]): PipelineNodeStatus[] {
  const nodes: { label: string; matchStages: string[] }[] = [
    { label: 'Ingestion',    matchStages: ['stage_1_complete'] },
    { label: 'Detection',    matchStages: ['stage_2_complete'] },
    { label: 'Analysis',     matchStages: ['stage_3_causal_engine_running', 'stage_3_complete'] },
    { label: 'Healing',      matchStages: ['stage_4_healing_executing', 'stage_4_healing_complete', 'stage_5_cooldown'] },
    { label: 'Verification', matchStages: ['stage_6_verification_running', 'healing_complete', 'healing_failed_escalated', 'healing_failed_email_sent'] },
  ];

  const stageOrder = [
    'stage_1_complete',
    'stage_2_complete',
    'stage_3_causal_engine_running',
    'stage_3_complete',
    'stage_4_healing_executing',
    'stage_4_healing_complete',
    'stage_5_cooldown',
    'stage_6_verification_running',
    'healing_complete',
    'healing_failed_escalated',
    'healing_failed_email_sent',
  ];

  const currentIdx = currentStage ? stageOrder.indexOf(currentStage) : -1;
  const failed = currentStage === 'healing_failed_escalated' || currentStage === 'healing_failed_email_sent';

  return nodes.map((node) => {
    // Find the most recent event matching this node's stages
    const nodeEvent = events.find(ev => node.matchStages.includes(ev.stage ?? ''));
    const timestamp = nodeEvent?.timestamp;

    const nodeMaxIdx = Math.max(...node.matchStages.map(s => stageOrder.indexOf(s)));
    if (currentIdx < 0) return { label: node.label, state: 'idle', timestamp };
    if (failed && node.label === 'Verification') return { label: node.label, state: 'failed', timestamp };
    if (currentIdx > nodeMaxIdx) return { label: node.label, state: 'completed', timestamp };
    if (node.matchStages.includes(currentStage ?? '')) return { label: node.label, state: 'active', timestamp };
    return { label: node.label, state: 'idle', timestamp };
  });
}

export function usePipelineEvents(enabled = true) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [nodeStates, setNodeStates] = useState<PipelineNodeStatus[]>(
    ['Ingestion', 'Detection', 'Analysis', 'Healing', 'Verification'].map(label => ({ label, state: 'idle' as NodeState }))
  );

  // Stage transition tracking for toast notifications
  const prevStageRef = useRef<string | null>(null);
  const { addToast } = useToast();

  const fetchEvents = useCallback(async () => {
    try {
      const [eventsRes, stageRes] = await Promise.allSettled([
        fetch('/api/v1/pipeline/events?limit=20'),
        fetch('/api/v1/pipeline/stage'),
      ]);

      let fetchedEvents: PipelineEvent[] = [];
      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        fetchedEvents = await eventsRes.value.json();
        setEvents(fetchedEvents);
      }

      if (stageRes.status === 'fulfilled' && stageRes.value.ok) {
        const stageData = await stageRes.value.json();
        const s: string | null = stageData?.stage ?? null;
        setCurrentStage(s);
        setNodeStates(deriveNodeStates(s, fetchedEvents));

        // ── Stage Transition Toast Notifications ──
        if (s && s !== prevStageRef.current && s !== 'idle' && s !== 'unknown') {
          const prevStage = prevStageRef.current;
          prevStageRef.current = s;

          // Only fire toasts after we have a previous stage (not on initial load)
          if (prevStage && prevStage !== 'idle' && prevStage !== 'unknown') {
            const completedName = STAGE_FRIENDLY_NAMES[prevStage] || prevStage;
            const nextName = NEXT_STAGE_LABEL[prevStage];

            if (s === 'healing_complete') {
              addToast('✅ Verification Complete — System is healthy and operational', 'success');
            } else if (s === 'healing_failed_escalated' || s === 'healing_failed_email_sent') {
              addToast('⚠️ Healing Failed — Escalated for manual review', 'error');
            } else if (nextName) {
              addToast(`${completedName} Complete — ${nextName} has started`, 'info');
            } else if (s === 'stage_6_verification_running') {
              addToast('Verification in progress — checking if anomaly is resolved', 'info');
            } else {
              const stageName = STAGE_FRIENDLY_NAMES[s] || s;
              addToast(`Stage transition: ${stageName} is now active`, 'info');
            }
          } else if (!prevStage) {
            // First stage detected — pipeline just started
            const stageName = STAGE_FRIENDLY_NAMES[s] || s;
            addToast(`Pipeline active — ${stageName} in progress`, 'info');
          }
        }
        // Also track when stage goes to idle/null from an active stage
        if ((!s || s === 'idle') && prevStageRef.current && prevStageRef.current !== 'idle' && prevStageRef.current !== 'unknown') {
          prevStageRef.current = s;
        }
      }
    } catch {
      // Non-fatal — silently ignore
    }
  }, [addToast]);

  useEffect(() => {
    if (!enabled) return;
    fetchEvents();
    const id = setInterval(fetchEvents, 2000);
    return () => clearInterval(id);
  }, [enabled, fetchEvents]);

  const currentStageLabel = currentStage ? (STAGE_LABELS[currentStage] ?? 'Unknown') : 'Idle';

  return { events, currentStage, currentStageLabel, nodeStates };
}
