import React, { useState } from 'react';
import { PanelProps } from '@grafana/data';
import { useAsync } from 'react-use';
import { openai, llm } from '@grafana/llm';
import { Button, Alert } from '@grafana/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChatOutput } from './ChatOutput';

export const SleepAnalysisPanel: React.FC<PanelProps> = ({ data, width, height, timeRange }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [triggerAnalysis, setTriggerAnalysis] = useState(0);

  // Transform Grafana data into chart format
  const prepareChartData = () => {
    if (!data.series || data.series.length === 0) {
      return [];
    }

    const chartData: any[] = [];
    const timeField = data.series[0].fields.find(f => f.type === 'time');
    
    // Find each sleep stage series by alias/name
    const deepSleep = data.series.find(s => s.name?.includes('Deep') || s.refId === 'A');
    const lightSleep = data.series.find(s => s.name?.includes('Light') || s.refId === 'B');
    const remSleep = data.series.find(s => s.name?.includes('REM') || s.refId === 'C');
    const awake = data.series.find(s => s.name?.includes('Awake') || s.refId === 'D');

    if (!timeField) {
      return [];
    }

    for (let i = 0; i < timeField.values.length; i++) {
      const date = new Date(timeField.values[i]);
      chartData.push({
        date: date.toLocaleDateString(),
        'Deep Sleep': deepSleep ? Math.round(deepSleep.fields[1].values[i] / 3600) : 0,
        'Light Sleep': lightSleep ? Math.round(lightSleep.fields[1].values[i] / 3600) : 0,
        'REM Sleep': remSleep ? Math.round(remSleep.fields[1].values[i] / 3600) : 0,
        'Awake': awake ? Math.round(awake.fields[1].values[i] / 3600) : 0,
      });
    }

    return chartData;
  };

  // Generate context for LLM
  const generateSleepContext = () => {
    const chartData = prepareChartData();
    if (chartData.length === 0) {
      return 'No sleep data available';
    }

    // Calculate statistics
    const stats = {
      avgDeep: chartData.reduce((sum, d) => sum + d['Deep Sleep'], 0) / chartData.length,
      avgLight: chartData.reduce((sum, d) => sum + d['Light Sleep'], 0) / chartData.length,
      avgREM: chartData.reduce((sum, d) => sum + d['REM Sleep'], 0) / chartData.length,
      avgAwake: chartData.reduce((sum, d) => sum + d['Awake'], 0) / chartData.length,
      totalNights: chartData.length,
    };

    const avgTotal = stats.avgDeep + stats.avgLight + stats.avgREM;

    return `
Sleep Data Analysis Period: ${timeRange.from.toLocaleString()} to ${timeRange.to.toLocaleString()}
Total nights recorded: ${stats.totalNights}

Average Sleep Breakdown:
- Deep Sleep: ${stats.avgDeep.toFixed(1)} hours (${((stats.avgDeep / avgTotal) * 100).toFixed(1)}%)
- Light Sleep: ${stats.avgLight.toFixed(1)} hours (${((stats.avgLight / avgTotal) * 100).toFixed(1)}%)
- REM Sleep: ${stats.avgREM.toFixed(1)} hours (${((stats.avgREM / avgTotal) * 100).toFixed(1)}%)
- Time Awake: ${stats.avgAwake.toFixed(1)} hours
- Total Sleep Time: ${avgTotal.toFixed(1)} hours

Daily Breakdown:
${chartData.map(d => 
  `${d.date}: Deep=${d['Deep Sleep']}h, Light=${d['Light Sleep']}h, REM=${d['REM Sleep']}h, Awake=${d['Awake']}h`
).join('\n')}
    `.trim();
  };

  const { loading, error } = useAsync(async () => {
    if (triggerAnalysis === 0) {
      return;
    }

    const enabled = await llm.enabled();
    if (!enabled) {
      setAnalysis('❌ LLM is not enabled. Please check your Grafana LLM configuration.');
      return;
    }

    const sleepContext = generateSleepContext();
    
    const stream = openai
      .streamChatCompletions({
        model: openai.Model.BASE,
        messages: [
          { 
            role: 'system', 
            content: `You are a sleep health expert analyzing Garmin sleep tracking data. 
            Provide insights about sleep quality, patterns, and recommendations.
            Focus on:
            1. Overall sleep quality assessment
            2. Sleep stage distribution (is it healthy?)
            3. Trends or patterns noticed
            4. Specific recommendations for improvement
            5. Any concerns or positive observations
            
            Keep your response concise but informative (20-30 words).`
          },
          { 
            role: 'user', 
            content: `Analyze this sleep data and provide insights:\n\n${sleepContext}` 
          },
        ],
      })
      .pipe(openai.accumulateContent());

    return stream.subscribe(setAnalysis);
  }, [triggerAnalysis]);

  const handleAnalyze = () => {
    setShowAnalysis(true);
    setTriggerAnalysis(prev => prev + 1);
  };

  const chartData = prepareChartData();

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', padding: '10px' }}>
      {/* Chart Section */}
      <div style={{ flex: showAnalysis ? '0 0 45%' : '1', marginBottom: '10px', minHeight: '200px' }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Deep Sleep" stackId="a" fill="#042c68" />
              <Bar dataKey="Light Sleep" stackId="a" fill="#6e9ecf" />
              <Bar dataKey="REM Sleep" stackId="a" fill="#f9d371" />
              <Bar dataKey="Awake" stackId="a" fill="#e57373" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Alert title="No Data" severity="info">
            No sleep data available for the selected time range.
          </Alert>
        )}
      </div>

      {/* Analysis Button */}
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <Button 
          onClick={handleAnalyze} 
          disabled={loading || chartData.length === 0}
          icon={showAnalysis ? 'chart-line' : 'ai'}
          size="md"
        >
          {loading ? 'Analyzing...' : showAnalysis ? 'Refresh Analysis' : '🤖 Analyze Sleep Pattern'}
        </Button>
        {showAnalysis && (
          <Button 
            onClick={() => setShowAnalysis(false)} 
            variant="secondary"
            style={{ marginLeft: '10px' }}
            size="md"
          >
            Hide Analysis
          </Button>
        )}
      </div>

      {/* Analysis Section */}
      {showAnalysis && (

        <ChatOutput 
          error={error} 
          loading={loading} 
          analysis={analysis} 
        />
      )}
    </div>
  );
};
