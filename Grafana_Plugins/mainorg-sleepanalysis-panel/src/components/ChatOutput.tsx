import React from 'react';
import { Spinner, Alert, useTheme2 } from '@grafana/ui';


interface ChatOutputProps {
    error: Error;
    loading: boolean;
    analysis: string;

}

export const ChatOutput = ({error, loading, analysis}: ChatOutputProps) => {
    const theme = useTheme2();
    return (
        <div style={{ 
            flex: '0 0 40%', 
            overflow: 'auto',
            backgroundColor: theme.colors.background.secondary,
            padding: '15px',
            borderRadius: '4px',
            border: `1px solid ${theme.colors.border.weak}`,
            minHeight: '150px'
          }}>
            {error && <Alert title="Error" severity="error">{error.message}</Alert>}
            {loading && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spinner />
                <p style={{ marginTop: '10px' }}>Analyzing your sleep patterns...</p>
              </div>
            )}
            {!loading && analysis && (
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                <h4 style={{ marginTop: 0, marginBottom: '15px' }}>💤 Sleep Analysis</h4>
                {analysis}
              </div>
            )}
            {!loading && !analysis && !error && (
              <p style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
                Click "Analyze Sleep Pattern" to get AI-powered insights
              </p>
            )}
          </div>
    )
}