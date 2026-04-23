import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { IncidentReport, timeAgo } from '../designSystem';

interface IncidentReportsPanelProps {
  reports: IncidentReport[];
}

export const IncidentReportsPanel: React.FC<IncidentReportsPanelProps> = ({ reports }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!reports || reports.length === 0) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>No incident reports available</p>
      </div>
    );
  }

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'critical': return 'var(--error)';
      case 'high': return 'var(--error)';
      case 'medium': return 'var(--warning)';
      default: return 'var(--primary)';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'SUCCESS': return 'var(--success)';
      case 'PENDING': return 'var(--warning)';
      case 'ESCALATED': return 'var(--error)';
      case 'FAILURE': return 'var(--error)';
      case 'FAILED_RETRYING': return 'var(--warning)';
      default: return 'var(--text-dim)';
    }
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h2 className="card-title">Incident Reports</h2>
        <span className="badge badge-error">{reports.length} Reports</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reports.map((report) => (
          <div key={report.detection_id} className="log-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedId(expandedId === report.detection_id ? null : report.detection_id)}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className={`badge badge-${report.severity === 'critical' || report.severity === 'high' ? 'error' : 'warning'}`}>
                  {report.severity.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{report.service}</span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{timeAgo(report.timestamp)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: 11, 
                  padding: '2px 6px', 
                  borderRadius: 4, 
                  backgroundColor: `${getStatusColor(report.verification_status)}22`,
                  color: getStatusColor(report.verification_status),
                  border: `1px solid ${getStatusColor(report.verification_status)}55`
                }}>
                  {report.verification_status}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: 18 }}>
                  {expandedId === report.detection_id ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {expandedId === report.detection_id && (
              <div style={{ 
                marginTop: '12px', 
                paddingTop: '12px', 
                borderTop: '1px solid var(--border)',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: '1.5'
              }}>
                <ReactMarkdown
                  components={{
                    h2: ({node, ...props}) => <h3 style={{ marginTop: '16px', marginBottom: '8px', color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }} {...props} />,
                    table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }} {...props} />,
                    th: ({node, ...props}) => <th style={{ textAlign: 'left', padding: '6px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }} {...props} />,
                    td: ({node, ...props}) => <td style={{ padding: '6px', borderBottom: '1px solid var(--border)' }} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '3px solid var(--warning)', margin: '16px 0', paddingLeft: '12px', color: 'var(--text-dim)' }} {...props} />
                  }}
                >
                  {report.human_report}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
