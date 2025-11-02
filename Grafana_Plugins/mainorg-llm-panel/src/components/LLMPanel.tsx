import React, { useState } from 'react';
import { useAsync } from 'react-use';
import { Spinner, useTheme2, Button, Alert  } from '@grafana/ui';
import { LoadingState, PanelProps } from '@grafana/data';
import { openai, llm } from '@grafana/llm';
import { LLMPromptOptions } from 'types';



export const LLMPanel: React.FC<PanelProps<LLMPromptOptions>> = ({ data, width, height, timeRange, options }: PanelProps<LLMPromptOptions>) => {
    const theme = useTheme2();
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [trigger, setTrigger] = useState(0);
    const [analysis, setAnalysis] = useState('');

    let prompt: string = options.prompt;

    const isDataLoaded = () => { return data.state === LoadingState.Done; };

    const extractDataAlias = () => {
        if (!isDataLoaded()) {
            return [];
        }
        const pattern = /\{\{(.*?)\}\}/g;
        const matches = Array.from(prompt.matchAll(pattern));
        return matches.map(match => match[1].trim());
    }

    const replaceDataAliasWithData = (alias: string) => {
        if (!isDataLoaded()) {
            return;
        }

        let extractedData = data.series.find(s => s.refId === alias);
        if (extractedData === undefined) {
            return;
        }
        
        let length = extractedData.length;
        let chartData: any[] = [];
        
        for (let i = 0; i < length; i++) {
            // Join the different fields in each row by ','
            // Field 1: XXX, Field 2: XXX, Field 3: XXX
            // Data must be rounded and process in the grafana query. No processing will be done here
            let currData: string[] = [];
            extractedData.fields.forEach(field => {
                currData.push(`${field.name}: ${field.values[i]}`)
            });
            chartData.push(currData.join(', '));
        }
        
        // Join the different rows by '\n'
        let extractedDataString = chartData.join('\n')
        let toReplace: string = '{{' + alias + '}}';
        prompt = prompt.replace(toReplace, extractedDataString);
    }

    
    const { loading, error } = useAsync(async () => {
        if (trigger === 0 || !isDataLoaded()) {
            return;
        }
        let aliases = extractDataAlias();
        aliases.forEach(a => replaceDataAliasWithData(a));


        const enabled = await llm.enabled();
        if (!enabled) {
            setAnalysis('❌ LLM is not enabled. Please check your Grafana LLM configuration.');
            return;
        }

        const stream = openai
            .streamChatCompletions({
                model: openai.Model.BASE,
                messages: [
                    {
                        role: 'system',
                        content: prompt
                    },
                    {
                        role: 'user',
                        content: `Analyse this`
                    },
                ],
            })
            .pipe(openai.accumulateContent());

        return stream.subscribe(setAnalysis);
    }, [trigger]);

    const onClickAnalysis = () => {
        setShowAnalysis(true)
        setTrigger(x => x + 1)
    }

    return (
        <div>
            {/* Analysis Button */}
            <div style={{ textAlign: 'center', margin: '10px 0' }}>
                <Button
                    onClick={onClickAnalysis}
                    disabled={loading || data.state !== LoadingState.Done}
                    icon={showAnalysis ? 'chart-line' : 'ai'}
                    size="md"
                >
                    {loading ? 'Analyzing...' : showAnalysis ? 'Refresh Analysis' : '🤖 Analyze'}
                </Button>
                {showAnalysis && (
                    <Button
                        onClick={() => setShowAnalysis(false)}
                        variant="secondary"
                        style={{ marginLeft: '10px' }}
                        size="md"
                    >
                        Clear Analysis
                    </Button>
                )}
            </div>
            {/* Prompt Text */}
            {options.showPrompt &&
                (
                    <div style={{
                        flex: '1 0 10%',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        backgroundColor: theme.colors.background.secondary,
                        padding: '15px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.colors.border.weak}`
                    }}>
                        {prompt}
                    </div>
                )
            }
            {/* Prompt Output */}
            {(trigger > 0 && showAnalysis) &&
                <div style={{
                    flex: '1 0 10%',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    backgroundColor: theme.colors.background.secondary,
                    padding: '15px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.colors.border.weak}`
                }}>
                    {error && <Alert title="Error" severity="error">{error.message}</Alert>}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Spinner />
                            <p style={{ marginTop: '10px' }}>Analyzing your sleep patterns...</p>
                        </div>
                    )}
                    {!loading && analysis && (
                        <div>
                            <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Analysis</h4>
                            {analysis}
                        </div>
                    )}
                </div>}
        </div>
    )
}
