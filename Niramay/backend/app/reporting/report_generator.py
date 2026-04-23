import os
import uuid
import structlog
from datetime import datetime, timezone
from typing import Dict, Any
import jinja2

logger = structlog.get_logger(__name__)

# Set up Jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

def generate_human_report(detection_result: Dict[str, Any], ai_analysis: Dict[str, Any], healing_result: Dict[str, Any]) -> str:
    """Generates a Markdown incident report using a Jinja2 template."""
    try:
        template = jinja_env.get_template('incident_report.md.j2')
        
        # Prepare data for template
        timestamp = detection_result.get("timestamp", datetime.now(timezone.utc).isoformat())
        
        # Format timestamp nicely for the timeline
        try:
            ts_obj = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            nice_time = ts_obj.strftime("%H:%M:%S")
        except:
            nice_time = timestamp

        confidence = ai_analysis.get("confidence")
        confidence_pct = int(confidence * 100) if confidence is not None else None
        
        analysis_type = ai_analysis.get("analysis_type", "rule_fallback")
        analysis_type_label = "AI (LLaMA 3)" if analysis_type == "ai_llm" else "Rule-based Fallback"
        if ai_analysis.get("skipped"):
            analysis_type_label = "Skipped"

        # Build timeline
        timeline = []
        timeline.append({
            "time": nice_time, 
            "description": f"Anomaly detected (score: {detection_result.get('anomaly_score', 0):.2f}, severity: {detection_result.get('severity', 'unknown')})"
        })
        if ai_analysis.get("analysis_type") == "ai_llm":
            timeline.append({
                "time": "...", 
                "description": f"AI causal analysis completed (confidence: {confidence_pct}%)"
            })
        timeline.append({
            "time": "...", 
            "description": f"Healing action: {healing_result.get('healing_action', 'none')} → {healing_result.get('status', 'unknown').upper()}"
        })
        timeline.append({
            "time": "...", 
            "description": f"Verification: {healing_result.get('verification_status', 'PENDING').upper()}"
        })

        data = {
            "detection_id_short": detection_result.get("detection_id", "unknown")[:8],
            "severity": detection_result.get("severity", "unknown"),
            "anomaly_score": round(detection_result.get("anomaly_score", 0.0), 2),
            "service": detection_result.get("service", "unknown"),
            "endpoint": detection_result.get("endpoint", "unknown"),
            "method": detection_result.get("method", "UNKNOWN"),
            "status_code": detection_result.get("status_code", 0),
            "response_time_ms": detection_result.get("response_time_ms", 0.0),
            "timestamp": timestamp,
            "analysis_type_label": analysis_type_label,
            "confidence": confidence,
            "confidence_pct": confidence_pct,
            "root_cause": ai_analysis.get("root_cause", "Unknown"),
            "healing_action": healing_result.get("healing_action", "none"),
            "healing_status": healing_result.get("status", "unknown").upper(),
            "verification_status": healing_result.get("verification_status", "PENDING").upper(),
            "healing_message": healing_result.get("message", ""),
            "engines_triggered": detection_result.get("engines_triggered", []),
            "anomaly_reasons": detection_result.get("anomaly_reasons", []),
            "requires_llm": detection_result.get("requires_llm", False),
            "timeline": timeline
        }
        
        return template.render(**data)
    except Exception as e:
        logger.error("Failed to generate human report", error=str(e))
        return f"# 🚨 Incident Report\nGeneration failed: {str(e)}"

def generate_machine_alert(detection_result: Dict[str, Any], ai_analysis: Dict[str, Any], healing_result: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a structured JSON alert object."""
    return {
        "alert_id": str(uuid.uuid4()),
        "detection_id": detection_result.get("detection_id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": detection_result.get("severity"),
        "anomaly_score": detection_result.get("anomaly_score"),
        "service": detection_result.get("service"),
        "endpoint": detection_result.get("endpoint"),
        "root_cause": ai_analysis.get("root_cause"),
        "confidence": ai_analysis.get("confidence"),
        "healing_action": healing_result.get("healing_action"),
        "healing_status": healing_result.get("status"),
        "verification_status": healing_result.get("verification_status", "PENDING"),
        "anomaly_reasons": detection_result.get("anomaly_reasons", []),
        "engines_triggered": detection_result.get("engines_triggered", []),
        "requires_escalation": False,
        "analysis_type": ai_analysis.get("analysis_type", "unknown")
    }

def generate_incident_report(detection_result: Dict[str, Any], ai_analysis: Dict[str, Any], healing_result: Dict[str, Any]) -> Dict[str, Any]:
    """Generates both human and machine reports and bundles them."""
    human_report = generate_human_report(detection_result, ai_analysis, healing_result)
    machine_alert = generate_machine_alert(detection_result, ai_analysis, healing_result)
    
    return {
        "human_report": human_report,
        "machine_alert": machine_alert,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "detection_id": detection_result.get("detection_id"),
        "service": detection_result.get("service"),
        "severity": detection_result.get("severity"),
        "verification_status": machine_alert.get("verification_status")
    }
